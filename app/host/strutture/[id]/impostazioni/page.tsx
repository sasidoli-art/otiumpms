import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ImpostazioniForm from './impostazioni-form'
import { isHostAuthorized } from '@/lib/permissions'

export default async function ImpostazioniPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  if (!session || !isHostAuthorized(session.user.role)) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.id, hostId: hostId },
    select: {
      id: true,
      nome: true,
      alloggiatiAbilitato: true,
      alloggiatiCodiceStruttura: true,
      alloggiatiComuneIstat: true,
      alloggiatiDenominazioneComune: true,
    },
  })

  if (!struttura) notFound()

  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: {
      regimeFiscale: true,
      nomeAzienda: true,
      partitaIva: true,
      codiceFiscale: true,
      fattNomeAzienda: true,
      fattPartitaIva: true,
      fattIndirizzo: true,
      fattCitta: true,
      fattCap: true,
      fattProvincia: true,
      fattPec: true,
      fattCodiceSDI: true,
    },
  })

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/host/strutture/${params.id}`} className="p-2 rounded hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Impostazioni struttura</h1>
          <p className="text-sm text-gray-500">{struttura.nome}</p>
        </div>
      </div>

      <ImpostazioniForm struttura={struttura} host={host!} strutturaId={params.id} />
    </div>
  )
}
