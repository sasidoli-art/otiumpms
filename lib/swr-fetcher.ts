/**
 * Default SWR fetcher per chiamate JSON interne.
 *
 * Usage:
 *   const { data, error, isLoading } = useSWR('/api/host/dashboard', fetcher)
 *
 * Throw su HTTP non-ok per attivare l'`error` di SWR (con `info` + `status`
 * disponibili per UI di error reporting).
 */
export class FetchError extends Error {
  info: unknown
  status: number
  constructor(message: string, status: number, info: unknown) {
    super(message)
    this.status = status
    this.info = info
  }
}

export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) {
    let info: unknown = null
    try {
      info = await res.json()
    } catch {
      info = await res.text().catch(() => null)
    }
    throw new FetchError(`HTTP ${res.status} on ${url}`, res.status, info)
  }
  return res.json() as Promise<T>
}
