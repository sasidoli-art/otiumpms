import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, Plus, Eye, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const tipoLabel: Record<string, string> = {
  EVENTO: 'Evento',
  VENUE: 'Venue',
  ESPERIENZA: 'Esperienza',
  ALLOGGIO: 'Alloggio',
  SERVIZIO: 'Servizio',
}

export default async function StrutturePage() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user.role !== 'HOST' && session.user.role !== 'ADMIN')) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const strutture = await prisma.struttura.findMany({
    where: { hostId: hostId },
    include: {
      unita: { where: { attiva: true }, select: { id: true } },
      _count: { select: { prenotazioni: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Le mie strutture</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestisci le strutture, le unità prenotabili, disponibilità e tariffe
          </p>
        </div>
        <Link href="/host/strutture/nuova" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuova struttura
        </Link>
      </div>

      {strutture.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">Nessuna struttura</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Crea la tua prima struttura per iniziare a ricevere prenotazioni
          </p>
          <Link href="/host/strutture/nuova" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Crea struttura
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {strutture.map((s) => (
            <Link
              key={s.id}
              href={`/host/strutture/${s.id}`}
              className="card hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                    {s.nome}
                  </h2>
                  <span className="text-xs text-gray-500">{tipoLabel[s.tipo] ?? s.tipo}</span>
                </div>
                {s.attiva ? (
                  <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    <Eye className="w-3 h-3" /> Attiva
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    <EyeOff className="w-3 h-3" /> Disattiva
                  </span>
                )}
              </div>

              {(s.citta || s.regione) && (
                <p className="text-sm text-gray-500 mb-3">
                  {[s.citta, s.regione].filter(Boolean).join(', ')}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-600 border-t border-gray-100 pt-3 mt-3">
                <span>
                  <span className="font-semibold text-gray-900">{s.unita.length}</span> unità
                </span>
                <span>
                  <span className="font-semibold text-gray-900">{s._count.prenotazioni}</span> prenotazioni
                </span>
                {s.prezzoBase > 0 && (
                  <span>
                    da <span className="font-semibold text-brand-600">€{s.prezzoBase}</span>
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
