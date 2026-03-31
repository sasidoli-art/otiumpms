'use client'

import { SessionProvider } from 'next-auth/react'
import { useEffect } from 'react'
import { getCsrfToken } from '@/lib/csrf'

function CsrfFetchPatcher() {
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = async (input, init) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

      // Applica solo a chiamate API interne mutanti
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
      const isApi = url.startsWith('/api/') || url.startsWith(window.location.origin + '/api/')

      if (isMutating && isApi) {
        const token = getCsrfToken()
        if (token) {
          const headers = new Headers(init?.headers)
          if (!headers.has('X-CSRF-Token')) {
            headers.set('X-CSRF-Token', token)
          }
          return originalFetch(input, { ...init, headers })
        }
      }
      return originalFetch(input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CsrfFetchPatcher />
      {children}
    </SessionProvider>
  )
}
