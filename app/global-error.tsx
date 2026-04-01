'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
            Si è verificato un errore
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
            Qualcosa è andato storto.
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginBottom: '1.5rem' }}>
            {error?.digest ?? error?.message ?? ''}
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Riprova
          </button>
        </div>
      </body>
    </html>
  )
}
