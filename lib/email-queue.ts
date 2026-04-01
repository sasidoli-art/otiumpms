import { logger } from '@/lib/logger'

/**
 * In-memory email queue with retry logic.
 *
 * - Retries failed emails up to MAX_RETRIES times with exponential backoff
 * - Logs all failures for debugging
 * - Dead letter queue for permanently failed emails (accessible via API)
 * - Singleton: persists across hot reloads in dev
 *
 * For production at scale, replace with Bull/BullMQ + Redis.
 */

interface EmailJob {
  id: string
  fn: () => Promise<void>
  label: string
  retries: number
  maxRetries: number
  nextRetry: number
  error?: string
  createdAt: number
}

interface DeadLetterEntry {
  id: string
  label: string
  error: string
  retries: number
  createdAt: number
  failedAt: number
}

class EmailQueue {
  private queue: EmailJob[] = []
  private deadLetter: DeadLetterEntry[] = []
  private processing = false
  private timer: ReturnType<typeof setInterval> | null = null
  private idCounter = 0

  readonly MAX_DEAD_LETTER = 100
  readonly DEFAULT_MAX_RETRIES = 3
  readonly BASE_DELAY_MS = 5000 // 5s, 10s, 20s exponential

  constructor() {
    this.startProcessing()
  }

  /** Enqueue an email job for delivery with automatic retry. */
  enqueue(label: string, fn: () => Promise<void>, maxRetries?: number) {
    const id = `email-${Date.now()}-${++this.idCounter}`
    this.queue.push({
      id,
      fn,
      label,
      retries: 0,
      maxRetries: maxRetries ?? this.DEFAULT_MAX_RETRIES,
      nextRetry: Date.now(), // immediate first attempt
      createdAt: Date.now(),
    })
    logger.info(`Email queued: ${label}`, 'email-queue', { id })
  }

  /** Get dead letter entries (for monitoring/debugging). */
  getDeadLetters(): DeadLetterEntry[] {
    return [...this.deadLetter]
  }

  /** Get queue stats. */
  getStats() {
    return {
      queued: this.queue.length,
      deadLetter: this.deadLetter.length,
      processing: this.processing,
    }
  }

  /** Retry a dead letter entry. */
  retryDeadLetter(id: string, fn: () => Promise<void>) {
    const idx = this.deadLetter.findIndex(d => d.id === id)
    if (idx >= 0) {
      this.deadLetter.splice(idx, 1)
      this.enqueue(`retry:${id}`, fn, 1)
    }
  }

  /** Clear all dead letter entries. */
  clearDeadLetters() {
    this.deadLetter = []
  }

  private startProcessing() {
    if (this.timer) return
    // Process queue every 2 seconds
    this.timer = setInterval(() => this.processNext(), 2000)
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0) return

    const now = Date.now()
    const idx = this.queue.findIndex(j => j.nextRetry <= now)
    if (idx < 0) return // all jobs waiting for retry delay

    this.processing = true
    const job = this.queue.splice(idx, 1)[0]

    try {
      await job.fn()
      logger.info(`Email sent: ${job.label}`, 'email-queue', {
        id: job.id,
        retries: job.retries,
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      job.retries++

      if (job.retries >= job.maxRetries) {
        // Move to dead letter
        this.deadLetter.push({
          id: job.id,
          label: job.label,
          error: errorMsg,
          retries: job.retries,
          createdAt: job.createdAt,
          failedAt: Date.now(),
        })

        // Trim dead letter queue
        if (this.deadLetter.length > this.MAX_DEAD_LETTER) {
          this.deadLetter = this.deadLetter.slice(-this.MAX_DEAD_LETTER)
        }

        logger.error(`Email permanently failed: ${job.label}`, 'email-queue', {
          id: job.id,
          retries: job.retries,
          error: errorMsg,
        })
      } else {
        // Schedule retry with exponential backoff
        const delay = this.BASE_DELAY_MS * Math.pow(2, job.retries - 1)
        job.nextRetry = Date.now() + delay
        job.error = errorMsg
        this.queue.push(job)

        logger.warn(`Email retry ${job.retries}/${job.maxRetries}: ${job.label}`, 'email-queue', {
          id: job.id,
          nextRetryMs: delay,
          error: errorMsg,
        })
      }
    } finally {
      this.processing = false
    }
  }
}

// Singleton
const globalForQueue = globalThis as typeof globalThis & { emailQueue?: EmailQueue }
export const emailQueue = globalForQueue.emailQueue ?? new EmailQueue()
if (process.env.NODE_ENV !== 'production') globalForQueue.emailQueue = emailQueue
