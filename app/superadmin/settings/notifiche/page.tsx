import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import NotificheSettings from './notifiche-settings'

export default async function NotificheSettingsPage() {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Configurazione Notifiche</h1>
        <p className="text-sm text-gray-500">
          Destinatari personalizzati per notifiche ticket, segnalazioni ed eventi platform.
          Se la lista è vuota, vengono notificati automaticamente tutti gli utenti SUPERADMIN.
        </p>
      </div>
      <NotificheSettings />
    </div>
  )
}
