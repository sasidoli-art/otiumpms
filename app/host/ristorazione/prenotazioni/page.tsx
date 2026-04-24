import { redirect } from 'next/navigation'
import { getHostId } from '@/lib/auth-middleware'
import PrenotazioniRistoranteClient from './prenotazioni-client'

export const metadata = { title: 'Prenotazioni ristorante — Host' }
export const dynamic = 'force-dynamic'

export default async function PrenotazioniRistorantePage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <PrenotazioniRistoranteClient />
}
