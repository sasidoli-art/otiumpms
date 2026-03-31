import { redirect } from 'next/navigation'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import AlloggiatiClient from './alloggiati-client'

export default async function AlloggiatiPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const strutture = await prisma.struttura.findMany({
    where: { hostId, attiva: true },
    select: {
      id: true,
      nome: true,
      citta: true,
      alloggiatiAbilitato: true,
      alloggiatiCodiceStruttura: true,
      alloggiatiComuneIstat: true,
      alloggiatiDenominazioneComune: true,
    },
    orderBy: { nome: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <h1 className="page-title">Alloggiati Web</h1>
        <p className="text-sm text-gray-500">
          Genera il file .txt per l&apos;invio delle schedine alla Questura (Polizia di Stato)
        </p>
      </div>

      <AlloggiatiClient strutture={JSON.parse(JSON.stringify(strutture))} />
    </div>
  )
}
