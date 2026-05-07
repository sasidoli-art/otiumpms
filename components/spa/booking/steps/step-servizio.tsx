'use client'

import { useState, useMemo } from 'react'
import { Check, Clock, ChevronUp, Phone, ArrowRight } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Trattamento {
  id: string
  nome: string
  categoria: string
  durata: number
  prezzo: number
  descrizione: string | null
  colore: string
}

export interface Percorso {
  id: string
  nome: string
  descrizione: string | null
  prezzo: number
  durataMinuti: number
  colore: string
  passaggi: { ordine: number; durata: number; trattamentoNome: string }[]
}

interface Props {
  trattamenti: Trattamento[]
  percorsi: Percorso[]
  selectedTrattamento: { id: string } | null
  selectedPercorso: { id: string } | null
  onSelectTrattamento: (t: Trattamento) => void
  onSelectPercorso: (p: Percorso) => void
  accentColor?: string
  strutturaTelefono?: string | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CATEGORIE_LABEL: Record<string, string> = {
  MASSAGGIO: 'Massaggi',
  VISO: 'Viso',
  CORPO: 'Corpo',
  RITUALI: 'Rituali',
  BAGNI: 'Bagni',
  COPPIA: 'Coppia',
  ALTRO: 'Altro',
}

function formatDurata(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function StepServizio({
  trattamenti, percorsi,
  selectedTrattamento, selectedPercorso,
  onSelectTrattamento, onSelectPercorso,
  accentColor, strutturaTelefono,
}: Props) {
  const accent = accentColor || 'var(--brand-primary, #4f46e5)'
  const onAccent = 'var(--brand-on-primary, #ffffff)'
  const [tab, setTab] = useState<'trattamenti' | 'percorsi'>('trattamenti')
  const [filtro, setFiltro] = useState<string>('ALL')
  const [expandedDesc, setExpandedDesc] = useState<string | null>(null)

  const categorie = useMemo(() => {
    const cats = new Set(trattamenti.map(t => t.categoria))
    return ['ALL', ...Array.from(cats)]
  }, [trattamenti])

  const trattamentiFiltrati = useMemo(() => {
    const filtered = filtro === 'ALL'
      ? trattamenti
      : trattamenti.filter(t => t.categoria === filtro)
    return filtered.sort((a, b) => {
      if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria)
      return a.prezzo - b.prezzo
    })
  }, [trattamenti, filtro])

  const selectedId = selectedTrattamento?.id || selectedPercorso?.id || null

  // Nessun servizio disponibile
  if (trattamenti.length === 0 && percorsi.length === 0) {
    return (
      <div className="py-16 text-center px-4">
        <p className="text-lg font-semibold text-gray-800 mb-2">Prenotazione telefonica</p>
        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
          Per prenotare un trattamento SPA, contatta direttamente la reception.
        </p>
        {strutturaTelefono && (
          <a href={`tel:${strutturaTelefono}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold"
            style={{ backgroundColor: accent, color: onAccent }}>
            <Phone className="w-4 h-4" /> {strutturaTelefono}
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="pb-4">
      {/* ─── Tab toggle ────────────────────────────────────────── */}
      {percorsi.length > 0 && (
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mx-4 mt-4 mb-4">
          <button type="button" onClick={() => setTab('trattamenti')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              tab === 'trattamenti' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>
            Trattamenti
          </button>
          <button type="button" onClick={() => setTab('percorsi')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              tab === 'percorsi' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>
            Percorsi benessere
          </button>
        </div>
      )}

      {/* ─── TAB: Trattamenti ──────────────────────────────────── */}
      {tab === 'trattamenti' && (
        <>
          {/* Filtro categorie — pills scrollabili */}
          {categorie.length > 2 && (
            <div className="flex gap-2 px-4 mb-4 overflow-x-auto no-scrollbar">
              {categorie.map(cat => (
                <button key={cat} type="button" onClick={() => setFiltro(cat)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                    filtro === cat
                      ? 'shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={filtro === cat ? { backgroundColor: accent, color: onAccent } : undefined}>
                  {cat === 'ALL' ? 'Tutti' : CATEGORIE_LABEL[cat] || cat}
                </button>
              ))}
            </div>
          )}

          {/* Griglia trattamenti */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4">
            {trattamentiFiltrati.map(t => {
              const isSelected = selectedId === t.id
              const isOther = selectedId && !isSelected
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTrattamento(t)}
                  className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                    isSelected
                      ? 'shadow-md scale-[1.01]'
                      : isOther
                        ? 'border-gray-100 opacity-50'
                        : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                  style={isSelected ? { borderColor: accent } : undefined}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: t.colore }}>
                        {CATEGORIE_LABEL[t.categoria] || t.categoria}
                      </p>
                      <h3 className="text-base font-bold text-gray-900 leading-snug">{t.nome}</h3>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 ml-2"
                        style={{ backgroundColor: accent, color: onAccent }}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm mb-2">
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-3.5 h-3.5" /> {formatDurata(t.durata)}
                    </span>
                    <span className="font-bold" style={{ color: accent }}>€{t.prezzo}</span>
                  </div>

                  {t.descrizione && (
                    <div>
                      <p className={`text-xs text-gray-500 leading-relaxed ${expandedDesc === t.id ? '' : 'line-clamp-2'}`}>
                        {t.descrizione}
                      </p>
                      {t.descrizione.length > 120 && (
                        <button type="button"
                          onClick={e => { e.stopPropagation(); setExpandedDesc(expandedDesc === t.id ? null : t.id) }}
                          className="text-[10px] font-semibold mt-1" style={{ color: accent }}>
                          {expandedDesc === t.id ? 'Meno' : 'Leggi tutto'}
                        </button>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* ─── TAB: Percorsi ─────────────────────────────────────── */}
      {tab === 'percorsi' && (
        <div className="space-y-3 px-4">
          {percorsi.map(p => {
            const isSelected = selectedId === p.id
            const isOther = selectedId && !isSelected
            // Calcola risparmio rispetto ai singoli trattamenti
            const sommaTrattamenti = p.passaggi.reduce((sum, pas) => {
              const trt = trattamenti.find(t => t.nome === pas.trattamentoNome)
              return sum + (trt?.prezzo ?? 0)
            }, 0)
            const risparmio = sommaTrattamenti > p.prezzo ? sommaTrattamenti - p.prezzo : 0

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPercorso(p)}
                className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-200 ${
                  isSelected
                    ? 'shadow-md scale-[1.01]'
                    : isOther
                      ? 'border-gray-100 opacity-50'
                      : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                }`}
                style={isSelected ? { borderColor: accent } : undefined}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{p.nome}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-3.5 h-3.5" /> {formatDurata(p.durataMinuti)}
                      </span>
                      <span className="text-lg font-bold" style={{ color: accent }}>€{p.prezzo}</span>
                      {risparmio > 0 && (
                        <span className="text-xs line-through text-gray-400">€{sommaTrattamenti}</span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: accent, color: onAccent }}>
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {p.descrizione && (
                  <p className="text-sm text-gray-500 mb-3 leading-relaxed">{p.descrizione}</p>
                )}

                {/* Passaggi */}
                <div className="space-y-1.5">
                  {p.passaggi.sort((a, b) => a.ordine - b.ordine).map((pas, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500 shrink-0">
                        {i + 1}
                      </span>
                      <span className="flex-1">{pas.trattamentoNome}</span>
                      <span className="text-gray-400">{formatDurata(pas.durata)}</span>
                      {i < p.passaggi.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />}
                    </div>
                  ))}
                </div>

                {risparmio > 0 && (
                  <div className="mt-3 px-3 py-1.5 rounded-lg text-[10px] font-bold inline-block"
                    style={{ backgroundColor: `${accent}15`, color: accent }}>
                    Risparmi €{risparmio.toFixed(0)} rispetto ai singoli trattamenti
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
