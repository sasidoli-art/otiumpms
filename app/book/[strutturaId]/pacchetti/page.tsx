import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Users, Check, Tag, Package } from 'lucide-react'
import { formatValuta, formatData } from '@/lib/utils'

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ strutturaId: string }> }) {
  const params = await paramsPromise
  const s = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    select: { nome: true },
  })
  if (!s) return { title: 'Non trovato' }
  return { title: `Pacchetti — ${s.nome} — Otium Week` }
}

export default async function PacchettiPubbliciPage({
  params: paramsPromise,
}: {
  params: Promise<{ strutturaId: string }>
}) {
  const params = await paramsPromise

  const struttura = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    select: { id: true, nome: true, citta: true, regione: true, tipo: true },
  })
  if (!struttura) notFound()

  const pacchetti = await prisma.pacchetto.findMany({
    where: {
      strutturaId: struttura.id,
      attivo: true,
      OR: [
        { dataFine: null },
        { dataFine: { gte: new Date() } },
      ],
    },
    include: {
      evento: { select: { titolo: true, dataInizio: true, citta: true, luogo: true } },
    },
    orderBy: { prezzo: 'asc' },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href={`/book/${struttura.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Torna alla struttura
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Pacchetti — {struttura.nome}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            <MapPin className="w-3.5 h-3.5 inline mr-0.5" />
            {struttura.citta}{struttura.regione ? `, ${struttura.regione}` : ''}
          </p>
        </div>
      </div>

      {/* Packages */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {pacchetti.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nessun pacchetto disponibile al momento</p>
            <Link
              href={`/book/${struttura.id}`}
              className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              Prenota direttamente
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {pacchetti.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Card header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <h2 className="text-lg font-bold text-white">{p.nome}</h2>
                  {(p.evento || p.eventoEsterno) && (
                    <p className="text-indigo-200 text-sm mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {p.evento
                        ? `${p.evento.titolo}${p.evento.dataInizio ? ` · ${formatData(p.evento.dataInizio)}` : ''}`
                        : p.eventoEsterno
                      }
                    </p>
                  )}
                </div>

                {/* Card body */}
                <div className="px-6 py-5 space-y-4">
                  {p.descrizione && (
                    <p className="text-sm text-gray-600">{p.descrizione}</p>
                  )}

                  {/* Details */}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      {p.notti} {p.notti === 1 ? 'notte' : 'notti'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-indigo-500" />
                      {p.numOspiti} ospiti
                    </span>
                  </div>

                  {/* Incluso */}
                  {p.incluso.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Include</p>
                      <ul className="space-y-1.5">
                        {p.incluso.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Validity */}
                  {(p.dataInizio || p.dataFine) && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Valido {p.dataInizio ? `dal ${formatData(p.dataInizio)}` : ''}
                      {p.dataFine ? ` al ${formatData(p.dataFine)}` : ''}
                    </p>
                  )}

                  {/* Price + CTA */}
                  <div className="flex items-end justify-between pt-3 border-t border-gray-100">
                    <div>
                      {p.prezzoOriginale && p.prezzoOriginale > p.prezzo && (
                        <span className="text-sm text-gray-400 line-through mr-2">
                          {formatValuta(p.prezzoOriginale)}
                        </span>
                      )}
                      <span className="text-2xl font-bold text-indigo-600">{formatValuta(p.prezzo)}</span>
                      <span className="text-xs text-gray-400 ml-1">/ pacchetto</span>
                    </div>
                    <Link
                      href={`/book/${struttura.id}?pacchettoId=${p.id}&pacchettoNome=${encodeURIComponent(p.nome)}&pacchettoPrezzo=${p.prezzo}&numOspiti=${p.numOspiti}`}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                    >
                      Prenota ora
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
