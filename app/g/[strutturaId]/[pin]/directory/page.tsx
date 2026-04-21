import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Globe, Phone } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Directory struttura: orari, servizi, contatti
export default async function DirectoryPage({
  params: paramsPromise,
}: {
  params: Promise<{ strutturaId: string; pin: string }>
}) {
  const { strutturaId, pin } = await paramsPromise

  const struttura = await prisma.struttura.findUnique({
    where: { id: strutturaId },
    select: {
      id: true, nome: true, descrizione: true, indirizzo: true, citta: true,
      colorePrimario: true,
      host: { select: { nomeAzienda: true, telefono: true, sitoWeb: true } },
      serviziStruttura: {
        where: { attivo: true },
        select: {
          nome: true, descrizione: true, prezzo: true,
          orarioInizio: true, orarioFine: true, luogo: true,
        },
        orderBy: { nome: 'asc' },
      },
    },
  })
  if (!struttura) notFound()

  const colore = struttura.colorePrimario ?? '#4f46e5'

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        <Link
          href={`/g/${strutturaId}/${pin}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={14} /> Indietro
        </Link>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{struttura.nome}</h1>
          {struttura.descrizione && (
            <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">
              {struttura.descrizione}
            </p>
          )}
        </div>

        {/* Contatti */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          {(struttura.indirizzo || struttura.citta) && (
            <div className="p-4 flex items-start gap-3">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div className="text-sm text-slate-800">
                {[struttura.indirizzo, struttura.citta].filter(Boolean).join(', ')}
              </div>
            </div>
          )}
          {struttura.host.telefono && (
            <a href={`tel:${struttura.host.telefono}`} className="p-4 flex items-center gap-3 hover:bg-slate-50">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="text-sm text-slate-800">{struttura.host.telefono}</div>
            </a>
          )}
          {struttura.host.sitoWeb && (
            <a
              href={struttura.host.sitoWeb} target="_blank" rel="noopener noreferrer"
              className="p-4 flex items-center gap-3 hover:bg-slate-50"
            >
              <Globe className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="text-sm text-slate-800 truncate">{struttura.host.sitoWeb.replace(/^https?:\/\//, '')}</div>
            </a>
          )}
        </div>

        {/* Servizi */}
        {struttura.serviziStruttura.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">Servizi</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100">
              {struttura.serviziStruttura.map((s) => (
                <div key={s.nome} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{s.nome}</p>
                    {s.prezzo != null && s.prezzo > 0 && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: `${colore}15`, color: colore }}
                      >
                        €{s.prezzo.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {s.descrizione && <p className="text-xs text-slate-500 mt-1">{s.descrizione}</p>}
                  {(s.orarioInizio || s.orarioFine) && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      ⏰ {s.orarioInizio ?? ''}{s.orarioInizio && s.orarioFine ? ' - ' : ''}{s.orarioFine ?? ''}
                    </p>
                  )}
                  {s.luogo && <p className="text-[11px] text-slate-400 mt-0.5">📍 {s.luogo}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-slate-400 pt-2">
          Powered by Otium PMS
        </p>
      </div>
    </div>
  )
}
