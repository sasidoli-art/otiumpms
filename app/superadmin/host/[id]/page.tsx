import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import HostDetailClient from './host-detail-client'

export const metadata = { title: 'Host Detail — SuperAdmin' }

function ErrorPanel({ stage, error, hostId }: { stage: string; error: unknown; hostId: string }) {
  const err = error instanceof Error ? error : new Error(String(error))
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-red-600 mb-4">Errore caricamento Host (server)</h2>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2 text-sm font-mono break-all">
        <p><span className="font-semibold">Stage:</span> {stage}</p>
        <p><span className="font-semibold">Host ID:</span> {hostId}</p>
        <p><span className="font-semibold">Message:</span> {err.message || '(empty)'}</p>
        <p><span className="font-semibold">Name:</span> {err.name}</p>
        {err.stack && (
          <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">{err.stack}</pre>
        )}
      </div>
    </div>
  )
}

export default async function SuperAdminHostDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') redirect('/login')

  const { id } = await paramsPromise

  let host
  try {
    host = await prisma.host.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, nome: true, cognome: true, attivo: true },
        },
        strutture: {
          orderBy: { createdAt: 'asc' },
          include: {
            unita: {
              orderBy: { nome: 'asc' },
              select: {
                id: true,
                nome: true,
                capacita: true,
                lettiExtra: true,
                prezzoBase: true,
                attiva: true,
                piano: true,
              },
            },
            _count: { select: { prenotazioni: true } },
          },
        },
        _count: { select: { strutture: true, prenotazioni: true, fatture: true } },
      },
    })
  } catch (e) {
    return <ErrorPanel stage="prisma.host.findUnique" error={e} hostId={id} />
  }

  if (!host) notFound()

  let serialized
  try {
    serialized = {
      id: host.id,
      nomeAzienda: host.nomeAzienda,
      partitaIva: host.partitaIva,
      codiceFiscale: host.codiceFiscale,
      telefono: host.telefono,
      sitoWeb: host.sitoWeb,
      indirizzo: host.indirizzo,
      citta: host.citta,
      provincia: host.provincia,
      cap: host.cap,
      regione: host.regione,
      fattNomeAzienda: host.fattNomeAzienda,
      fattPartitaIva: host.fattPartitaIva,
      fattPec: host.fattPec,
      fattCodiceSDI: host.fattCodiceSDI,
      regimeFiscale: host.regimeFiscale,
      piano: host.piano,
      statoAbbonamento: host.statoAbbonamento,
      dataFineAbb: host.dataFineAbb?.toISOString() ?? null,
      moduliAttivi: host.moduliAttivi,
      conciergeAttivo: host.conciergeAttivo,
      conciergeSystemPrompt: host.conciergeSystemPrompt,
      user: host.user ?? { id: '', email: '—', nome: '—', cognome: '', attivo: false },
      strutture: host.strutture.map(s => ({
        id: s.id,
        nome: s.nome,
        tipo: s.tipo,
        descrizione: s.descrizione,
        citta: s.citta,
        regione: s.regione,
        indirizzo: s.indirizzo,
        capacitaTotale: s.capacitaTotale,
        prezzoBase: s.prezzoBase,
        attiva: s.attiva,
        unita: s.unita.map(u => ({
          id: u.id,
          nome: u.nome,
          capacita: u.capacita,
          lettiExtra: u.lettiExtra,
          prezzoBase: u.prezzoBase,
          piano: u.piano,
          attiva: u.attiva,
        })),
        _count: s._count,
      })),
      _count: host._count,
    }
  } catch (e) {
    return <ErrorPanel stage="serialize" error={e} hostId={id} />
  }

  try {
    return <HostDetailClient initial={serialized} />
  } catch (e) {
    return <ErrorPanel stage="render-client" error={e} hostId={id} />
  }
}
