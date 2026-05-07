'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search, Plus, Minus, X, Trash2, ShoppingCart,
  Banknote, CreditCard, BedDouble, MoreHorizontal,
  Check, Loader2, Receipt, Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Prodotto {
  id: string
  nome: string
  categoria: string
  prezzo: number
  aliquotaIva: number
  immagine: string | null
  descrizione: string | null
}

interface VoceConto {
  key: string
  prodottoId: string | null
  nome: string
  prezzo: number
  aliquotaIva: number
  quantita: number
}

interface PrenotazioneInHouse {
  id: string
  guestNome: string
  guestCognome: string
  unitaNome: string | null
}

type MetodoPagamento = 'CONTANTI' | 'CARTA' | 'CAMERA_CREDIT' | 'GIFT_CARD' | 'BONIFICO' | 'MISTO'

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORIE_LABEL: Record<string, string> = {
  RISTORAZIONE: 'Ristorazione', BEVANDE: 'Bevande', SPA: 'SPA',
  SERVIZI: 'Servizi', PRODOTTI: 'Prodotti', ALLOGGIO: 'Alloggio', ALTRO: 'Altro',
}

const METODI = [
  { id: 'CONTANTI' as const, label: 'Contanti', icon: Banknote },
  { id: 'CARTA' as const, label: 'Carta', icon: CreditCard },
  { id: 'CAMERA_CREDIT' as const, label: 'Camera', icon: BedDouble, requireCamera: true },
  { id: 'MISTO' as const, label: 'Altro', icon: MoreHorizontal },
]

const TAGLI = [50, 20, 10, 5]

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  operatoreNome: string
}

// ─── Component ──────────────────────────────────────────────────────────────

let keyCounter = 0

export function POSTerminalNew({ operatoreNome }: Props) {
  // ── Catalog ──
  const [prodotti, setProdotti] = useState<Prodotto[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [categoriaAttiva, setCategoriaAttiva] = useState('TUTTI')
  const [searchQ, setSearchQ] = useState('')

  // ── Cart ──
  const [voci, setVoci] = useState<VoceConto[]>([])
  const [prenotazione, setPrenotazione] = useState<PrenotazioneInHouse | null>(null)
  const [searchCamera, setSearchCamera] = useState('')
  const [cameraResults, setCameraResults] = useState<PrenotazioneInHouse[]>([])
  const [showCameraSearch, setShowCameraSearch] = useState(false)

  // ── Payment modal ──
  const [showPayment, setShowPayment] = useState(false)
  const [metodo, setMetodo] = useState<MetodoPagamento>('CONTANTI')
  const [ricevuto, setRicevuto] = useState('')
  const [ultime4, setUltime4] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // ── Mobile tab ──
  const [mobileTab, setMobileTab] = useState<'catalogo' | 'conto'>('catalogo')

  // ── Load catalog ──
  useEffect(() => {
    fetch('/api/host/servizi')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = (Array.isArray(data) ? data : data.servizi || []) as Prodotto[]
        setProdotti(list.filter(p => p.prezzo > 0))
      })
      .finally(() => setLoadingCatalog(false))
  }, [])

  // ── Search camera ──
  useEffect(() => {
    if (!searchCamera.trim() || searchCamera.length < 2) { setCameraResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/host/search?q=${encodeURIComponent(searchCamera)}&tipo=prenotazione`)
        if (res.ok) {
          const data = await res.json()
          setCameraResults((data.results || []).map((r: { id: string; label: string; sub: string }) => ({
            id: r.id, guestNome: r.label.split(' ')[0] || '', guestCognome: r.label.split(' ').slice(1).join(' ') || '', unitaNome: r.sub,
          })))
        }
      } catch {}
    }, 300)
    return () => clearTimeout(timer)
  }, [searchCamera])

  // ── Derived ──
  const categorie = useMemo(() => {
    const cats = new Set(prodotti.map(p => p.categoria))
    return ['TUTTI', ...Array.from(cats)]
  }, [prodotti])

  const prodottiFiltrati = useMemo(() => {
    let list = prodotti
    if (categoriaAttiva !== 'TUTTI') list = list.filter(p => p.categoria === categoriaAttiva)
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase()
      list = list.filter(p => p.nome.toLowerCase().includes(q))
    }
    return list
  }, [prodotti, categoriaAttiva, searchQ])

  const subtotale = voci.reduce((s, v) => s + v.prezzo * v.quantita, 0)
  const totale = subtotale // No discount for now

  const ivaBreakdown = useMemo(() => {
    const map = new Map<number, number>()
    for (const v of voci) {
      const ivaImporto = (v.prezzo * v.quantita * v.aliquotaIva) / (100 + v.aliquotaIva)
      map.set(v.aliquotaIva, (map.get(v.aliquotaIva) || 0) + ivaImporto)
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [voci])

  const resto = useMemo(() => {
    const r = parseFloat(ricevuto.replace(',', '.')) || 0
    return r - totale
  }, [ricevuto, totale])

  // ── Cart actions ──
  function addProdotto(p: Prodotto) {
    setVoci(prev => {
      const existing = prev.find(v => v.prodottoId === p.id)
      if (existing) {
        return prev.map(v => v.prodottoId === p.id ? { ...v, quantita: v.quantita + 1 } : v)
      }
      return [...prev, {
        key: `v-${++keyCounter}`,
        prodottoId: p.id,
        nome: p.nome,
        prezzo: p.prezzo,
        aliquotaIva: p.aliquotaIva,
        quantita: 1,
      }]
    })
    if (window.innerWidth < 768) setMobileTab('conto')
  }

  function updateQta(key: string, delta: number) {
    setVoci(prev => prev.map(v => {
      if (v.key !== key) return v
      const newQ = v.quantita + delta
      return newQ <= 0 ? v : { ...v, quantita: newQ }
    }))
  }

  function removeVoce(key: string) {
    setVoci(prev => prev.filter(v => v.key !== key))
  }

  function nuovoConto() {
    setVoci([])
    setPrenotazione(null)
    setSearchCamera('')
    setSuccess(false)
  }

  // ── Payment ──
  async function conferma() {
    if (voci.length === 0) return
    setSaving(true)

    try {
      const res = await fetch('/api/host/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voci: voci.map(v => ({
            servizioId: v.prodottoId,
            descrizione: v.nome,
            quantita: v.quantita,
            prezzoUnitario: v.prezzo,
            totale: v.prezzo * v.quantita,
          })),
          metodoPagamento: metodo,
          prenotazioneId: prenotazione?.id || undefined,
          clienteNome: prenotazione ? `${prenotazione.guestNome} ${prenotazione.guestCognome}` : undefined,
          ultime4Cifre: metodo === 'CARTA' ? ultime4 : undefined,
          operatore: operatoreNome,
          subtotale,
          totale,
          importoContanti: metodo === 'CONTANTI' ? totale : undefined,
          importoCarta: metodo === 'CARTA' ? totale : undefined,
          importoCamera: metodo === 'CAMERA_CREDIT' ? totale : undefined,
        }),
      })

      if (res.ok) {
        setSuccess(true)
        try { navigator.vibrate?.(100) } catch {}
      }
    } catch {}
    setSaving(false)
  }

  // ════════════════════════════════════════════════════════════════════════════

  // Success screen
  if (success) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Check size={36} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Pagamento registrato</h2>
          <p className="text-sm text-slate-500">€{totale.toFixed(2)} — {METODI.find(m => m.id === metodo)?.label}</p>
          <button onClick={nuovoConto}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
            Nuovo conto
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col md:flex-row overflow-hidden">
      {/* ═══ Mobile tabs ═══ */}
      <div className="md:hidden flex border-b border-slate-200 dark:border-slate-700 shrink-0">
        <button onClick={() => setMobileTab('catalogo')}
          className={cn('flex-1 py-2.5 text-sm font-semibold text-center transition-colors',
            mobileTab === 'catalogo' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500')}>
          <Package size={14} className="inline mr-1" /> Catalogo
        </button>
        <button onClick={() => setMobileTab('conto')}
          className={cn('flex-1 py-2.5 text-sm font-semibold text-center transition-colors relative',
            mobileTab === 'conto' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500')}>
          <ShoppingCart size={14} className="inline mr-1" /> Conto
          {voci.length > 0 && (
            <span className="absolute top-1.5 right-1/4 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              {voci.reduce((s, v) => s + v.quantita, 0)}
            </span>
          )}
        </button>
      </div>

      {/* ═══ LEFT: Catalogo ═══ */}
      <div className={cn(
        'flex flex-col border-r border-slate-200 dark:border-slate-700 overflow-hidden',
        'md:flex md:w-[60%]',
        mobileTab === 'catalogo' ? 'flex flex-1' : 'hidden',
      )}>
        {/* Search + categories */}
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Cerca prodotto..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-400" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {categorie.map(cat => (
              <button key={cat} onClick={() => setCategoriaAttiva(cat)}
                className={cn('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  categoriaAttiva === cat
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400')}>
                {cat === 'TUTTI' ? 'Tutti' : CATEGORIE_LABEL[cat] || cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {loadingCatalog ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : prodottiFiltrati.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">
                {prodotti.length === 0 ? 'Catalogo vuoto' : 'Nessun prodotto trovato'}
              </p>
              {prodotti.length === 0 && (
                <a href="/host/servizi" className="text-xs text-blue-600 hover:underline mt-1 block">
                  Aggiungi prodotti dal catalogo servizi
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {prodottiFiltrati.map(p => (
                <button
                  key={p.id}
                  onClick={() => addProdotto(p)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all active:scale-95 min-h-[100px]"
                >
                  {p.immagine ? (
                    <img src={p.immagine} alt="" className="w-10 h-10 rounded-lg object-cover mb-1.5" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-1.5">
                      <Package size={16} className="text-slate-400" />
                    </div>
                  )}
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 text-center line-clamp-2">{p.nome}</p>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">€{p.prezzo.toFixed(2)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ RIGHT: Conto ═══ */}
      <div className={cn(
        'flex flex-col overflow-hidden',
        'md:flex md:w-[40%]',
        mobileTab === 'conto' ? 'flex flex-1' : 'hidden',
      )}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Conto</h3>
            {voci.length > 0 && (
              <button onClick={nuovoConto} className="text-[10px] text-red-500 hover:underline">Svuota</button>
            )}
          </div>

          {/* Camera link */}
          <div className="mt-2 relative">
            {prenotazione ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <BedDouble size={14} className="text-blue-600" />
                  <span className="text-xs font-medium text-blue-800 dark:text-blue-300">
                    {prenotazione.unitaNome && `${prenotazione.unitaNome} — `}{prenotazione.guestNome} {prenotazione.guestCognome}
                  </span>
                </div>
                <button onClick={() => setPrenotazione(null)} className="text-blue-400 hover:text-blue-600">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input type="text" value={searchCamera}
                  onChange={e => { setSearchCamera(e.target.value); setShowCameraSearch(true) }}
                  onFocus={() => setShowCameraSearch(true)}
                  placeholder="Camera o nome ospite (opzionale)"
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-400" />
                {showCameraSearch && cameraResults.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 py-1 max-h-40 overflow-y-auto">
                    {cameraResults.map(r => (
                      <button key={r.id} onClick={() => { setPrenotazione(r); setSearchCamera(''); setShowCameraSearch(false) }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{r.guestNome} {r.guestCognome}</span>
                        {r.unitaNome && <span className="text-slate-400 ml-1">· {r.unitaNome}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Voci list */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {voci.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-2" />
              <p className="text-xs text-slate-400">Aggiungi prodotti dal catalogo</p>
            </div>
          ) : (
            <div className="space-y-1">
              {voci.map(v => (
                <div key={v.key} className="flex items-center gap-2 py-2 border-b border-slate-50 dark:border-slate-800">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{v.nome}</p>
                    <p className="text-[10px] text-slate-400">€{v.prezzo.toFixed(2)} × {v.quantita}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => updateQta(v.key, -1)} disabled={v.quantita <= 1}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 disabled:opacity-30">
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{v.quantita}</span>
                    <button onClick={() => updateQta(v.key, 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 w-16 text-right tabular-nums">
                    €{(v.prezzo * v.quantita).toFixed(2)}
                  </p>
                  <button onClick={() => removeVoce(v.key)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + pay button */}
        {voci.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 shrink-0 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotale</span>
              <span>€{subtotale.toFixed(2)}</span>
            </div>
            {ivaBreakdown.map(([aliquota, importo]) => (
              <div key={aliquota} className="flex justify-between text-[10px] text-slate-400">
                <span>IVA {aliquota}%</span>
                <span>€{importo.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>Totale</span>
              <span>€{totale.toFixed(2)}</span>
            </div>
            <button onClick={() => { setShowPayment(true); setMetodo('CONTANTI'); setRicevuto(''); setUltime4('') }}
              className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md">
              Incassa €{totale.toFixed(2)}
            </button>
          </div>
        )}
      </div>

      {/* ═══ Payment modal ═══ */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPayment(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Amount */}
            <div className="text-center pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">€{totale.toFixed(2)}</p>
              {prenotazione && (
                <p className="text-xs text-slate-400 mt-1">{prenotazione.guestNome} {prenotazione.guestCognome}</p>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* Method buttons */}
              <div className="grid grid-cols-2 gap-2">
                {METODI.filter(m => !m.requireCamera || prenotazione).map(m => {
                  const Icon = m.icon
                  return (
                    <button key={m.id} onClick={() => setMetodo(m.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all',
                        metodo === m.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300',
                      )}>
                      <Icon size={22} className={metodo === m.id ? 'text-blue-600' : 'text-slate-400'} />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{m.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Cash input */}
              {metodo === 'CONTANTI' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Ricevuto</label>
                    <input type="text" inputMode="decimal" value={ricevuto}
                      onChange={e => setRicevuto(e.target.value.replace(/[^0-9.,]/g, ''))}
                      placeholder={totale.toFixed(2)}
                      className="w-full px-4 py-3 text-xl font-bold text-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400" />
                  </div>
                  <div className="flex gap-2">
                    {TAGLI.map(t => (
                      <button key={t} onClick={() => setRicevuto(String(t))}
                        className="flex-1 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors">
                        €{t}
                      </button>
                    ))}
                    <button onClick={() => setRicevuto(totale.toFixed(2))}
                      className="flex-1 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 transition-colors">
                      Esatto
                    </button>
                  </div>
                  {ricevuto && resto >= 0 && (
                    <p className="text-center text-lg font-bold text-emerald-600">
                      Resto: €{resto.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Card input */}
              {metodo === 'CARTA' && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Ultime 4 cifre (opzionale)</label>
                  <input type="text" maxLength={4} value={ultime4}
                    onChange={e => setUltime4(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-24 px-3 py-2 text-sm font-mono tracking-widest border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400" />
                </div>
              )}

              {/* Camera credit info */}
              {metodo === 'CAMERA_CREDIT' && prenotazione && (
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl px-4 py-3">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    L&apos;importo di <strong>€{totale.toFixed(2)}</strong> verrà aggiunto al conto della camera
                    {prenotazione.unitaNome && <> <strong>{prenotazione.unitaNome}</strong></>}.
                  </p>
                </div>
              )}

              {/* Confirm */}
              <button onClick={conferma} disabled={saving}
                className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-semibold text-base hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Elaborazione...</>
                ) : (
                  <><Check size={16} /> Conferma pagamento</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
