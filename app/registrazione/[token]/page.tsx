// TODO: i18n — tutte le stringhe sono hardcoded in italiano

import { RegistrationForm } from './registration-form'

// Fetch invite data server-side
async function getInviteData(token: string) {
  // Build absolute URL for internal API call during SSR
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/registrazione/${token}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default async function RegistrazionePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invite = await getInviteData(token)

  if (!invite) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #313a46 0%, #3d4754 50%, #313a46 100%)' }}
      >
        <div className="w-full max-w-sm">
          {/* Logo / Brand */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded mb-4">
              <span className="text-3xl">🎭</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white">Otium Week</h2>
          </div>

          {/* Errore */}
          <div className="bg-white rounded shadow-card p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-xl">!</span>
            </div>
            <h4 className="text-lg font-bold text-gray-800 mb-2">
              Invito non valido{/* TODO: i18n */}
            </h4>
            <p className="text-sm text-gray-500 mb-6">
              Questo link di invito non e&apos; valido o e&apos; scaduto. Contatta
              l&apos;amministratore per richiedere un nuovo invito.{/* TODO: i18n */}
            </p>
            <a
              href="/login"
              className="btn-primary inline-block px-6 py-2.5"
            >
              Vai al login{/* TODO: i18n */}
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #313a46 0%, #3d4754 50%, #313a46 100%)' }}
    >
      <RegistrationForm
        token={token}
        nome={invite.nome}
        cognome={invite.cognome}
        email={invite.email}
        ruolo={invite.ruolo}
        hostName={invite.hostName}
      />
    </div>
  )
}
