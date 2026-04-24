/**
 * In-memory TTL cache — usa `Map` (no Redis).
 *
 * **Context Vercel serverless**: ogni function instance ha la propria Map.
 * Cache hit solo tra request ravvicinate sulla stessa instance. Istanze tipiche
 * vivono ~5-15 min inattive prima di essere killate.
 *
 * **Perché è OK comunque**:
 *  - Riduce query ripetute nella stessa invocazione (es. helper chiamati da più
 *    componenti server nella stessa render)
 *  - Riduce carico DB durante burst di polling (badge sidebar, disponibilità)
 *  - Nessun overhead di rete vs Redis
 *
 * **Quando serve Redis/Vercel KV**:
 *  - Cache di dati costosi da calcolare (minuti) + letti da istanze diverse
 *  - Lock distribuiti, rate limit distribuito
 *  - Persistenza cross-deploy
 *
 * **Invalidation**: tiene semplice. Preferire TTL corti (<60s) che non
 * richiedono invalidation esplicita. Per invalidation mirata, usa
 * `invalidateCache(prefix)` al punto di mutation.
 */

type CacheEntry<T = unknown> = {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry>()

// Auto-cleanup: rimuovi entries scadute ogni 5 minuti (solo all'access, lazy).
let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

function maybeCleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt < now) store.delete(key)
  }
}

/**
 * Ritorna il valore cachato o null se mancante/scaduto.
 * Cancella automaticamente entry scadute.
 */
export function getCached<T>(key: string): T | null {
  maybeCleanup()
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.data as T
}

/**
 * Salva in cache con TTL (secondi).
 * TTL <= 0 → entry non viene salvata (no-op utile per cache disabilitata condizionalmente).
 */
export function setCache<T>(key: string, data: T, ttlSeconds: number): void {
  if (ttlSeconds <= 0) return
  store.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 })
}

/** Rimuove tutte le entries con chiave che inizia con `prefix`. */
export function invalidateCache(prefix: string): number {
  let count = 0
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) {
      store.delete(key)
      count++
    }
  }
  return count
}

/** Rimuove una singola entry. */
export function deleteCache(key: string): boolean {
  return store.delete(key)
}

/**
 * Helper "read-through": se cachato ritorna, altrimenti chiama `fn` e cacha.
 * Pattern comune per wrappare query lente:
 *
 *   const data = await cached(`badges:${hostId}`, 15, () =>
 *     prisma.... fetch badges
 *   )
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = getCached<T>(key)
  if (hit !== null) return hit
  const fresh = await fn()
  setCache(key, fresh, ttlSeconds)
  return fresh
}

/** Stats della cache — utile per debug / dashboard. */
export function getCacheStats(): { size: number; keys: string[] } {
  maybeCleanup()
  return {
    size: store.size,
    keys: Array.from(store.keys()),
  }
}

/** Cancella tutta la cache. Usare in test / dopo mutation di massa. */
export function clearCache(): void {
  store.clear()
}
