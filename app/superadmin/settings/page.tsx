import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import PlatformSettings from '@/components/superadmin/platform-settings'

export const metadata = { title: 'Impostazioni piattaforma — SuperAdmin' }

export default async function SettingsPage() {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Impostazioni piattaforma</h1>
        <p className="text-sm text-gray-500">
          Configurazione globale: generale, SMTP, AI, piani, maintenance mode.
        </p>
      </div>
      <PlatformSettings />
    </div>
  )
}
