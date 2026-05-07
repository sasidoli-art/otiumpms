/**
 * lib/api-handler.ts — Wrapper per API routes.
 * Cattura ApiError e ZodError, logga in Sentry (prod), ritorna JSON strutturato.
 */
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ApiError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

type RouteHandler = (req: NextRequest, ctx: unknown) => Promise<NextResponse>

/**
 * Wrappa un handler API con gestione errori centralizzata.
 *
 * @example
 * export const GET = apiHandler(async (req) => {
 *   // ...
 *   return NextResponse.json({ data })
 * })
 */
export function apiHandler(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx: unknown) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      // Zod validation errors
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: 'Dati non validi', code: 'VALIDATION_ERROR', details: err.issues },
          { status: 422 },
        )
      }

      // Custom API errors
      if (err instanceof ApiError) {
        if (err.statusCode >= 500) {
          logger.error(err.message, 'api-handler', { error: err.stack })
          captureToSentry(err)
        }
        const body: Record<string, unknown> = { error: err.message }
        if (err.code) body.code = err.code
        if (err instanceof ValidationError && err.details) body.details = err.details
        return NextResponse.json(body, { status: err.statusCode })
      }

      // Unexpected errors
      logger.error('Unhandled API error', 'api-handler', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        url: req.url,
        method: req.method,
      })
      captureToSentry(err)

      return NextResponse.json(
        { error: 'Errore interno del server' },
        { status: 500 },
      )
    }
  }
}

function captureToSentry(err: unknown) {
  if (process.env.NODE_ENV !== 'production') return
  try {
    // Dynamic import to avoid bundling Sentry in dev
    import('@sentry/nextjs').then(({ captureException }) => {
      captureException(err)
    }).catch(() => { /* Sentry not configured */ })
  } catch { /* ignore */ }
}
