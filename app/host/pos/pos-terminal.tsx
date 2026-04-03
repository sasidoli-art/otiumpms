'use client'

// TODO: i18n

import { useEffect, useState, useMemo } from 'react'
import {
  ShoppingCart, Plus, Minus, Trash2, Search, CreditCard,
  Banknote, Building, Gift, Check, X, Receipt, Printer,
  Package, Sparkles, ChevronDown, RotateCcw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, formatValuta } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Trattamento {
  id: string
  nome: string
  categoria: string
  prezzo: number
  durata: number
}

interface CartItem {
  key: string
  tipo: 'TRATTAMENTO' | 'PRODOTTO' | 'EXTRA'
  nome: string
  prezzoUnitario: number
  quantita: number
  sconto: number
  trattamentoId: string | null
}

interface TransazioneResult {
  id: string
  numero: string
  totale: number
  subtotale: number
  sconto: number
  metodoPagamento: string
  clienteNome: string | null
  createdAt: string
  voci: { nome: string; quantita: number; prezzoUnitario: number; totale: number }[]
}

type MetodoPagamento = 'CONTANTI' | 'CARTA' | 'CAMERA_CREDIT' | 'GIFT_CARD'

const METODO_LABEL: Record<MetodoPagamento, string> = {
  CONTANTI: 'Contanti',
  CARTA: 'Carta',
  CAMERA_CREDIT: 'Addebito camera',
  GIFT_CARD: 'Gift Card',
}
const METODO_ICON: Record<MetodoPagamento, typeof Banknote> = {
  CONTANTI: Banknote,
  CARTA: CreditCard,
  CAMERA_CREDIT: Building,
  GIFT_CARD: Gift,
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function POSTerminal() {
  const [trattamenti, setTrattamenti] = useState<Trattamento[]>([])
  const [searchItems, setSearchItems] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [scontoGlobale, setScontoGlobale] = useState(0)
  const [metodo, setMetodo] = useState<MetodoPagamento>('CONTANTI')
  const [giftCardCodice, setGiftCardCodice] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [note, setNote] = useState('')
  const [processing, setProcessing] = useState(false)
  const [receipt, setReceipt] = useState<TransazioneResult | null>(null)
  const [showExtraModal, setShowExtraModal] = useState(false)
  const [extraForm, setExtraForm] = useState({ nome: '', prezzo: '' })

  // Load trattamenti
  useEffect(() => {
    fetch('/api/host/spa/trattamenti')
      .then(r => r.json())
      .then(d => setTrattamenti(Array.isArray(d) ? d : []))
  }, [])

  // Filter trattamenti
  const filteredItems = useMemo(() => {
    if (!searchItems) return trattamenti
    const q = searchItems.toLowerCase()
    return trattamenti.filter(t =>
      t.nome.toLowerCase().includes(q) || t.categoria.toLowerCase().includes(q)
    )
  }, [trattamenti, searchItems])

  // Cart operations
  const addToCart = (item: Trattamento) => {
    setCart(prev => {
      const existing = prev.find(c => c.trattamentoId === item.id)
      if (existing) {
        return prev.map(c => c.trattamentoId === item.id ? { ...c, quantita: c.quantita + 1 } : c)
      }
      return [...prev, {
        key: `t-${item.id}`,
        tipo: 'TRATTAMENTO' as const,
        nome: item.nome,
        prezzoUnitario: item.prezzo,
        quantita: 1,
        sconto: 0,
        trattamentoId: item.id,
      }]
    })
  }

  const addExtraToCart = () => {
    if (!extraForm.nome || !extraForm.prezzo) return
    const key = `e-${Date.now()}`
    setCart(prev => [...prev, {
      key,
      tipo: 'EXTRA' as const,
      nome: extraForm.nome,
      prezzoUnitario: Number(extraForm.prezzo),
      quantita: 1,
      sconto: 0,
      trattamentoId: null,
    }])
    setExtraForm({ nome: '', prezzo: '' })
    setShowExtraModal(false)
  }

  const updateQuantity = (key: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.key !== key) return c
      const newQ = Math.max(1, c.quantita + delta)
      return { ...c, quantita: newQ }
    }))
  }

  const updateItemSconto = (key: string, sconto: number) => {
    setCart(prev => prev.map(c => c.key === key ? { ...c, sconto: Math.max(0, sconto) } : c))
  }

  const removeFromCart = (key: string) => {
    setCart(prev => prev.filter(c => c.key !== key))
  }

  // Totals
  const subtotale = cart.reduce((s, c) => s + (c.prezzoUnitario * c.quantita) - c.sconto, 0)
  const totale = Math.max(0, subtotale - scontoGlobale)

  // Complete transaction
  const completePurchase = async () => {
    if (cart.length === 0) return
    setProcessing(true)

    const payload = {
      voci: cart.map(c => ({
        tipo: c.tipo,
        nome: c.nome,
        quantita: c.quantita,
        prezzoUnitario: c.prezzoUnitario,
        sconto: c.sconto,
        trattamentoId: c.trattamentoId,
      })),
      metodoPagamento: metodo,
      giftCardCodice: metodo === 'GIFT_CARD' ? giftCardCodice : null,
      clienteNome: clienteNome || null,
      sconto: scontoGlobale,
      note: note || null,
    }

    try {
      const res = await fetch('/api/host/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        setReceipt(data)
      } else {
        const err = await res.json()
        alert(err.error || 'Errore nel completare la transazione')
      }
    } catch (err) { console.error(err) 
      alert('Errore di rete')
    }
    setProcessing(false)
  }

  // Reset for new transaction
  const resetTerminal = () => {
    setCart([])
    setScontoGlobale(0)
    setMetodo('CONTANTI')
    setGiftCardCodice('')
    setClienteNome('')
    setNote('')
    setReceipt(null)
  }

  // ─── Receipt view ────────────────────────────────────────────────────────────

  if (receipt) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="card p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Transazione completata</h2>
          <p className="text-sm text-gray-500 mb-6">#{receipt.numero}</p>

          <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
            <div className="space-y-2">
              {receipt.voci.map((v, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{v.quantita}x {v.nome}</span>
                  <span className="font-medium">{formatValuta(v.totale)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-3 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotale</span>
                <span>{formatValuta(receipt.subtotale)}</span>
              </div>
              {receipt.sconto > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Sconto</span>
                  <span>-{formatValuta(receipt.sconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Totale</span>
                <span>{formatValuta(receipt.totale)}</span>
              </div>
            </div>
            <div className="border-t mt-3 pt-3 text-xs text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Metodo</span>
                <span>{METODO_LABEL[receipt.metodoPagamento as MetodoPagamento] || receipt.metodoPagamento}</span>
              </div>
              {receipt.clienteNome && (
                <div className="flex justify-between">
                  <span>Cliente</span>
                  <span>{receipt.clienteNome}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={resetTerminal} className="btn btn-primary flex-1 flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Nuova vendita
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── POS Layout ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-brand-500" />
            POS — Punto Vendita
          </h1>
          <p className="text-sm text-gray-500 mt-1">Registra vendite e incassi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ─── Left Panel: Items ───────────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search */}
          <div className="card p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca trattamenti, prodotti..."
                  value={searchItems}
                  onChange={e => setSearchItems(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
              <button
                onClick={() => setShowExtraModal(true)}
                className="btn btn-ghost flex items-center gap-1 text-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Voce libera
              </button>
            </div>
          </div>

          {/* Items grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="card p-4 text-left hover:border-brand-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <Sparkles className="w-4 h-4 text-brand-400 group-hover:text-brand-600 transition-colors" />
                  <Badge variant="gray">{item.durata} min</Badge>
                </div>
                <p className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2">{item.nome}</p>
                <p className="text-xs text-gray-400 mb-2">{item.categoria}</p>
                <p className="text-lg font-bold text-brand-600">{formatValuta(item.prezzo)}</p>
              </button>
            ))}
            {filteredItems.length === 0 && (
              <div className="col-span-full p-8 text-center text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nessun articolo trovato</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Panel: Cart ───────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="card sticky top-4">
            {/* Cart header */}
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Carrello
                {cart.length > 0 && (
                  <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                    {cart.reduce((s, c) => s + c.quantita, 0)}
                  </span>
                )}
              </h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-700">
                  Svuota
                </button>
              )}
            </div>

            {/* Cart items */}
            <div className="p-4 max-h-[40vh] overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  Aggiungi articoli dal catalogo
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.key} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.nome}</p>
                        <p className="text-xs text-gray-400">{formatValuta(item.prezzoUnitario)} cad.</p>
                        {item.sconto > 0 && (
                          <p className="text-xs text-red-500">-{formatValuta(item.sconto)} sconto</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQuantity(item.key, -1)} className="w-7 h-7 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantita}</span>
                        <button onClick={() => updateQuantity(item.key, 1)} className="w-7 h-7 rounded bg-gray-200 flex items-center justify-center hover:bg-gray-300">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">{formatValuta((item.prezzoUnitario * item.quantita) - item.sconto)}</p>
                        <button onClick={() => removeFromCart(item.key)} className="text-red-400 hover:text-red-600 mt-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals */}
            {cart.length > 0 && (
              <div className="px-4 pb-4 space-y-2">
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotale</span>
                    <span>{formatValuta(subtotale)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-gray-500">Sconto</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={scontoGlobale || ''}
                      onChange={e => setScontoGlobale(Number(e.target.value) || 0)}
                      className="input text-sm w-24 ml-auto text-right"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex justify-between text-xl font-bold mt-3 pt-3 border-t">
                    <span>Totale</span>
                    <span className="text-brand-600">{formatValuta(totale)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment section */}
            {cart.length > 0 && (
              <div className="px-4 pb-4 space-y-3">
                {/* Cliente */}
                <div>
                  <label className="label text-xs">Cliente (opzionale)</label>
                  <input
                    type="text"
                    placeholder="Nome ospite / walk-in"
                    value={clienteNome}
                    onChange={e => setClienteNome(e.target.value)}
                    className="input w-full text-sm"
                  />
                </div>

                {/* Metodo pagamento */}
                <div>
                  <label className="label text-xs">Metodo di pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(METODO_LABEL) as MetodoPagamento[]).map(m => {
                      const Icon = METODO_ICON[m]
                      return (
                        <button
                          key={m}
                          onClick={() => setMetodo(m)}
                          className={cn(
                            'flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all',
                            metodo === m
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {METODO_LABEL[m]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Gift card code input */}
                {metodo === 'GIFT_CARD' && (
                  <div>
                    <label className="label text-xs">Codice Gift Card</label>
                    <input
                      type="text"
                      placeholder="OW-XXXX-XXXX"
                      value={giftCardCodice}
                      onChange={e => setGiftCardCodice(e.target.value.toUpperCase())}
                      className="input w-full font-mono text-sm tracking-wider"
                    />
                  </div>
                )}

                {/* Note */}
                <div>
                  <label className="label text-xs">Note (opzionale)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="input w-full text-sm"
                    placeholder="Note sulla vendita..."
                  />
                </div>

                {/* Complete button */}
                <button
                  onClick={completePurchase}
                  disabled={processing || cart.length === 0 || (metodo === 'GIFT_CARD' && !giftCardCodice)}
                  className={cn(
                    'w-full py-3.5 rounded-xl font-bold text-white text-lg transition-all flex items-center justify-center gap-2',
                    processing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl'
                  )}
                >
                  {processing ? (
                    'Elaborazione...'
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Completa — {formatValuta(totale)}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Extra Item Modal ─────────────────────────────────────────────────── */}
      {showExtraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowExtraModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Voce libera</h2>
              <button onClick={() => setShowExtraModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nome</label>
                <input
                  type="text"
                  value={extraForm.nome}
                  onChange={e => setExtraForm({ ...extraForm, nome: e.target.value })}
                  className="input w-full"
                  placeholder="Es: Prodotto cosmetico, Mancia..."
                />
              </div>
              <div>
                <label className="label">Prezzo (EUR)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={extraForm.prezzo}
                  onChange={e => setExtraForm({ ...extraForm, prezzo: e.target.value })}
                  className="input w-full"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowExtraModal(false)} className="btn btn-ghost">Annulla</button>
              <button
                onClick={addExtraToCart}
                disabled={!extraForm.nome || !extraForm.prezzo}
                className="btn btn-primary"
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
