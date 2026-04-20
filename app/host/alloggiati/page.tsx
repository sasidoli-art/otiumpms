import { redirect } from 'next/navigation'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import AlloggiatiExport from '@/components/alloggiati/alloggiati-export'

export default async function AlloggiatiPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const strutture = await prisma.struttura.findMany({
    where: { hostId, attiva: true },
    select: {
      id: true,
      nome: true,
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
        <div>
          <h1 className="page-title">Alloggiati Web</h1>
          <p className="text-sm text-gray-500">
            Comunicazione quotidiana alla Questura (art. 109 TULPS) — invio entro 24h dall&apos;arrivo.
          </p>
        </div>
      </div>

      <AlloggiatiExport strutture={strutture} />
    </div>
  )
}
