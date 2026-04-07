import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LandingPage } from '@/components/landing/landing-page'
import { getHostId } from '@/lib/auth-middleware'
import { getStruttureHost } from '@/lib/struttura-attiva'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (session) {
    if (session.user.role === 'SUPERADMIN') {
      redirect('/superadmin')
    } else if (session.user.role === 'ADMIN') {
      redirect('/admin/dashboard')
    } else {
      // HOST / DIREZIONE / STAFF: se gestisce 2+ strutture e nessuna è selezionata,
      // manda alla pagina di selezione. Altrimenti dashboard.
      const hostId = await getHostId()
      if (hostId) {
        const { strutture, attiva } = await getStruttureHost(hostId)
        if (strutture.length >= 2 && !attiva) {
          redirect('/host/seleziona-struttura')
        }
      }
      redirect('/host/dashboard')
    }
  }

  return <LandingPage />
}
