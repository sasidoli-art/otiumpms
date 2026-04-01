'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addDays, differenceInCalendarDays } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Coffee, Sun, Moon, Loader2, Check, ChevronDown, ChevronUp,
  UtensilsCrossed, AlertCircle,
} from 'lucide-react'

// TODO: i18n

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type TipoPasto = 'COLAZIONE' | 'PRANZO' | 'CENA'

type Piatto = {
  id: string
  categoria: string
  nome: string
  descrizione: string | null
  allergeni: string[]
  prezzo: number | null
  ordine: number
}

type MenuGiorno = {
  id: string
  tipoPasto: TipoPasto
  nome: string | null
  piatti: Piatto[]
}

type GiornoData = {
  data: string
  label: string
  menus: MenuGiorno[]
  pastiInclusi: TipoPasto[]
}

type SceltaGiorno = {
  data: string
  tipoPasto: TipoPasto
  scelte: Record<string, string> // categoria → piattoId
  note: string
}

// ─── Costanti ─────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<TipoPasto, string> = {
  COLAZIONE: 'Colazione',
  PRANZO: 'Pranzo',
  CENA: 'Cena',
}

const TIPO_EMOJI: Record<TipoPasto, string> = {
  COLAZIONE: '☀️',
  PRANZO: '🍝',
  CENA: '🍷',
}

const TIPO_ICON: Record<TipoPasto, typeof Coffee> = {
  COLAZIONE: Coffee,
  PRANZO: Sun,
  CENA: Moon,
}

const TIPO_COLOR: Record<TipoPasto, string> = {
  COLAZIONE: 'bg-amber-50 text-amber-700 border-amber-200',
  PRANZO: 'bg-orange-50 text-orange-700 border-orange-200',
  CENA: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

const CATEGORIA_LABEL: Record<string, string> = {
  ANTIPASTO: 'Antipasto',
  PRIMO: 'Primo piatto',
  SECONDO: 'Secondo piatto',
  CONTORNO: 'Contorno',
  DOLCE: 'Dolce',
  BEVANDA: 'Bevanda',
  FRUTTA: 'Frutta',
  COLAZIONE_DOLCE: 'Dolce',
  COLAZIONE_SALATA: 'Salato',
  COLAZIONE_BEVANDA: 'Bevanda',
}

const ALLERGENI_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  glutine: { label: 'Glutine', emoji: '🌾', color: 'bg-yellow-100 text-yellow-800' },
  lattosio: { label: 'Lattosio', emoji: '🥛', color: 'bg-blue-100 text-blue-800' },
  uova: { label: 'Uova', emoji: '🥚', color: 'bg-orange-100 text-orange-800' },
  arachidi: { label: 'Arachidi', emoji: '🥜', color: 'bg-amber-100 text-amber-800' },
  frutta_a_guscio: { label: 'Frutta a guscio', emoji: '🌰', color: 'bg-yellow-100 text-yellow-800' },
  pesce: { label: 'Pesce', emoji: '🐟', color: 'bg-cyan-100 text-cyan-800' },
  crostacei: { label: 'Crostacei', emoji: '🦐', color: 'bg-red-100 text-red-800' },
  soia: { label: 'Soia', emoji: '🫘', color: 'bg-green-100 text-green-800' },
  sedano: { label: 'Sedano', emoji: '🥬', color: 'bg-emerald-100 text-emerald-800' },
  senape: { label: 'Senape', emoji: '🟡', color: 'bg-yellow-100 text-yellow-800' },
  sesamo: { label: 'Sesamo', emoji: '⚪', color: 'bg-gray-100 text-gray-800' },
  lupini: { label: 'Lupini', emoji: '🟤', color: 'bg-amber-100 text-amber-800' },
  molluschi: { label: 'Molluschi', emoji: '🐚', color: 'bg-slate-100 text-slate-800' },
  solfiti: { label: 'Solfiti', emoji: '🍷', color: 'bg-purple-100 text-purple-800' },
}

// Piano pasto → pasti inclusi
function pastiInclusilPerPiano(
  piano: string,
  extra: string[],
  esclusi: string[],
): TipoPasto[] {
  let pasti: TipoPasto[] = []
  switch (piano) {
    case 'PERNOTTAMENTO_COLAZIONE':
      pasti = ['COLAZIONE']
      break
    case 'MEZZA_PENSIONE':
      pasti = ['COLAZIONE', 'CENA']
      break
    case 'PENSIONE_COMPLETA':
    case 'ALL_INCLUSIVE':
      pasti = ['COLAZIONE', 'PRANZO', 'CENA']
      break
    default:
      pasti = []
  }
  // Aggiungi extra
  for (const e of extra) {
    if (!pasti.includes(e as TipoPasto)) pasti.push(e as TipoPasto)
  }
  // Rimuovi esclusi
  pasti = pasti.filter(p => !esclusi.includes(p))
  return pasti
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  strutturaId: string
  prenotazioneId: string
  guestNome: string
  dataArrivo: string
  dataPartenza: string
  numOspiti: number
  pianoPasto: string
  pastiExtra: string[]
  pastiEsclusi: string[]
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function SceltaPastiForm({
  strutturaId,
  prenotazioneId,
  guestNome,
  dataArrivo,
  dataPartenza,
  numOspiti,
  pianoPasto,
  pastiExtra,
  pastiEsclusi,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [giorni, setGiorni] = useState<GiornoData[]>([])
  const [scelte, setScelte] = useState<SceltaGiorno[]>([])
  const [nomeOspite, setNomeOspite] = useState(guestNome)
  const [expandedDay, setExpandedDay] = useState<number>(0)

  const pastiInclusi = pastiInclusilPerPiano(pianoPasto, pastiExtra, pastiEsclusi)

  // ─── Carica menu per le date del soggiorno ────────────────────────────────

  const caricaMenu = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/book/pasto/${prenotazioneId}`)
      if (!res.ok) throw new Error('Errore caricamento menu')
      const data = await res.json()

      const arrivo = new Date(dataArrivo)
      const partenza = new Date(dataPartenza)
      const numGiorni = Math.max(1, differenceInCalendarDays(partenza, arrivo))

      const giorniList: GiornoData[] = []
      const scelteInit: SceltaGiorno[] = []

      for (let i = 0; i < numGiorni; i++) {
        const giorno = addDays(arrivo, i)
        const dataStr = format(giorno, 'yyyy-MM-dd')
        const label = format(giorno, 'EEEE d MMMM', { locale: it })

        // Filtra menu per questo giorno
        const menusGiorno: MenuGiorno[] = (data.menus || []).filter(
          (m: MenuGiorno & { data: string }) => m.data.slice(0, 10) === dataStr
        )

        giorniList.push({
          data: dataStr,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          menus: menusGiorno,
          pastiInclusi,
        })

        // Inizializza scelte vuote per ogni pasto incluso
        for (const tipo of pastiInclusi) {
          scelteInit.push({
            data: dataStr,
            tipoPasto: tipo,
            scelte: {},
            note: '',
          })
        }
      }

      // Se ci sono scelte gia salvate, pre-popola
      if (data.scelteSalvate && data.scelteSalvate.length > 0) {
        for (const saved of data.scelteSalvate) {
          const idx = scelteInit.findIndex(
            s => s.data === saved.data.slice(0, 10) && s.tipoPasto === saved.tipoPasto
          )
          if (idx >= 0 && saved.piattoId) {
            const piatto = menusGiorno_findPiatto(giorniList, saved.data.slice(0, 10), saved.tipoPasto, saved.piattoId)
            if (piatto) {
              scelteInit[idx].scelte[piatto.categoria] = saved.piattoId
            }
          }
        }
      }

      setGiorni(giorniList)
      setScelte(scelteInit)
    } catch {
      setError('Impossibile caricare i menu. Riprova.')
    }
    setLoading(false)
  }, [prenotazioneId, dataArrivo, dataPartenza, pastiInclusi]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { caricaMenu() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function menusGiorno_findPiatto(
    giorniList: GiornoData[],
    data: string,
    tipoPasto: TipoPasto,
    piattoId: string,
  ): Piatto | undefined {
    const giorno = giorniList.find(g => g.data === data)
    if (!giorno) return undefined
    const menu = giorno.menus.find(m => m.tipoPasto === tipoPasto)
    if (!menu) return undefined
    return menu.piatti.find(p => p.id === piattoId)
  }

  const updateScelta = (data: string, tipoPasto: TipoPasto, categoria: string, piattoId: string) => {
    setScelte(prev =>
      prev.map(s => {
        if (s.data !== data || s.tipoPasto !== tipoPasto) return s
        return { ...s, scelte: { ...s.scelte, [categoria]: piattoId } }
      })
    )
  }

  const updateNote = (data: string, tipoPasto: TipoPasto, note: string) => {
    setScelte(prev =>
      prev.map(s => {
        if (s.data !== data || s.tipoPasto !== tipoPasto) return s
        return { ...s, note }
      })
    )
  }

  // ─── Invio ──────────────────────────────────────────────────────────────────

  const invia = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/book/pasto/${prenotazioneId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestNome: nomeOspite,
          scelte: scelte.flatMap(s =>
            Object.entries(s.scelte).map(([, piattoId]) => ({
              data: s.data,
              tipoPasto: s.tipoPasto,
              piattoId,
              note: s.note || null,
            }))
          ),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Errore invio scelte')
      }
      setSuccess(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore invio scelte')
    }
    setSubmitting(false)
  }

  // ─── Render: stato di successo ──────────────────────────────────────────────

  if (success) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Scelte confermate! {/* TODO: i18n */}
        </h2>
        <p className="text-gray-500">
          Riceverai un&apos;email di riepilogo. {/* TODO: i18n */}
        </p>
      </div>
    )
  }

  // ─── Render: caricamento ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    )
  }

  // ─── Render: nessun pasto incluso ───────────────────────────────────────────

  if (pastiInclusi.length === 0) {
    return (
      <div className="text-center py-16">
        <UtensilsCrossed className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">
          Il tuo piano non include pasti. {/* TODO: i18n */}
        </p>
      </div>
    )
  }

  // ─── Render: form scelte ────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Giorni */}
      {giorni.map((giorno, idx) => (
        <div key={giorno.data} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header giorno */}
          <button
            onClick={() => setExpandedDay(expandedDay === idx ? -1 : idx)}
            className="w-full flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="text-left">
              <p className="font-semibold text-gray-900 text-sm sm:text-base">
                {giorno.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {giorno.pastiInclusi.map(t => `${TIPO_EMOJI[t]} ${TIPO_LABEL[t]}`).join(' · ')}
              </p>
            </div>
            {expandedDay === idx
              ? <ChevronUp className="w-5 h-5 text-gray-400" />
              : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {/* Contenuto giorno */}
          {expandedDay === idx && (
            <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-5">
              {giorno.pastiInclusi.map(tipoPasto => {
                const menu = giorno.menus.find(m => m.tipoPasto === tipoPasto)
                const Icon = TIPO_ICON[tipoPasto]
                const sceltaGiorno = scelte.find(
                  s => s.data === giorno.data && s.tipoPasto === tipoPasto
                )

                return (
                  <div key={tipoPasto}>
                    {/* Tipo pasto badge */}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border mb-3 ${TIPO_COLOR[tipoPasto]}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {TIPO_LABEL[tipoPasto]}
                    </div>

                    {!menu || menu.piatti.length === 0 ? (
                      <p className="text-xs text-gray-400 italic ml-1">
                        Menu non ancora disponibile per questo giorno. {/* TODO: i18n */}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {/* Raggruppa piatti per categoria */}
                        {raggruppaPerCategoria(menu.piatti).map(({ categoria, piatti }) => (
                          <div key={categoria}>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 ml-1">
                              {CATEGORIA_LABEL[categoria] || categoria}
                            </p>
                            <div className="space-y-1.5">
                              {piatti.map(piatto => {
                                const selected = sceltaGiorno?.scelte[categoria] === piatto.id
                                return (
                                  <label
                                    key={piatto.id}
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                      selected
                                        ? 'border-brand-300 bg-brand-50 ring-1 ring-brand-200'
                                        : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`${giorno.data}-${tipoPasto}-${categoria}`}
                                      checked={selected}
                                      onChange={() => updateScelta(giorno.data, tipoPasto, categoria, piatto.id)}
                                      className="mt-0.5 text-brand-600 focus:ring-brand-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-sm font-medium ${selected ? 'text-brand-800' : 'text-gray-900'}`}>
                                          {piatto.nome}
                                        </span>
                                        {piatto.prezzo != null && piatto.prezzo > 0 && (
                                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                                            +{piatto.prezzo.toFixed(2)} &euro;
                                          </span>
                                        )}
                                      </div>
                                      {piatto.descrizione && (
                                        <p className="text-xs text-gray-400 mt-0.5">{piatto.descrizione}</p>
                                      )}
                                      {piatto.allergeni.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                          {piatto.allergeni.map(aId => {
                                            const info = ALLERGENI_INFO[aId]
                                            return info ? (
                                              <span
                                                key={aId}
                                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${info.color}`}
                                              >
                                                {info.emoji} {info.label}
                                              </span>
                                            ) : null
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        ))}

                        {/* Note per pasto */}
                        <div className="mt-2">
                          <input
                            type="text"
                            value={sceltaGiorno?.note || ''}
                            onChange={e => updateNote(giorno.data, tipoPasto, e.target.value)}
                            placeholder="Note (es. senza glutine, poco cotto...)"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {/* Footer: nome ospite + submit */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">
            Nome ospite {/* TODO: i18n */}
          </label>
          <input
            type="text"
            value={nomeOspite}
            onChange={e => setNomeOspite(e.target.value)}
            placeholder="Il tuo nome"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-brand-300 focus:ring-1 focus:ring-brand-200"
          />
          {numOspiti > 1 && (
            <p className="text-xs text-gray-400 mt-1">
              Se sei un accompagnatore, inserisci il tuo nome per distinguere le scelte. {/* TODO: i18n */}
            </p>
          )}
        </div>

        <button
          onClick={invia}
          disabled={submitting || !nomeOspite.trim()}
          className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Invio in corso...
            </>
          ) : (
            'Conferma scelte' /* TODO: i18n */
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function raggruppaPerCategoria(piatti: Piatto[]): { categoria: string; piatti: Piatto[] }[] {
  const map = new Map<string, Piatto[]>()
  const ordineCategorie = [
    'COLAZIONE_DOLCE', 'COLAZIONE_SALATA', 'COLAZIONE_BEVANDA',
    'ANTIPASTO', 'PRIMO', 'SECONDO', 'CONTORNO', 'DOLCE', 'FRUTTA', 'BEVANDA',
  ]
  for (const p of piatti) {
    if (!map.has(p.categoria)) map.set(p.categoria, [])
    map.get(p.categoria)!.push(p)
  }
  const result: { categoria: string; piatti: Piatto[] }[] = []
  for (const cat of ordineCategorie) {
    const pp = map.get(cat)
    if (pp && pp.length > 0) {
      result.push({ categoria: cat, piatti: pp.sort((a, b) => a.ordine - b.ordine) })
    }
  }
  // Eventuali categorie non nell'ordine standard
  for (const [cat, pp] of map) {
    if (!result.find(r => r.categoria === cat)) {
      result.push({ categoria: cat, piatti: pp.sort((a, b) => a.ordine - b.ordine) })
    }
  }
  return result
}
