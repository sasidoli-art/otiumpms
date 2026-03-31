'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle, Loader, CreditCard, Banknote, Home } from 'lucide-react'

interface PagamentoSpaFormProps {
  appuntamentoId: string
  importo: number
  prenotazioneId?: string // se ospite della struttura
  onSuccess?: (pagamento: any) => void
  onError?: (error: string) => void
}

const METODI = [
  {
    id: 'CAMERA_CREDIT',
    label: 'Addebito su Camera',
    description: 'Addebita sulla fattura della tua camera',
    icon: Home,
    requiresUnita: true,
  },
  {
    id: 'CONTANTI',
    label: 'Contanti',
    description: 'Pagamento diretto in contanti al check-in SPA',
    icon: Banknote,
    requiresUnita: false,
  },
  {
    id: 'CARTA',
    label: 'Carta di Credito',
    description: 'Pagamento con carta al momento della prenotazione',
    icon: CreditCard,
    requiresUnita: false,
  },
  {
    id: 'TRANSFERWISE',
    label: 'Bonifico Bancario',
    description: 'Trasferimento bancario (WorldWide)',
    icon: Home, // Cambierà in futuro
    requiresUnita: false,
  },
]

/**
 * Form per selezione metodo di pagamento.
 */
export function PagamentoSpaForm({
  appuntamentoId,
  importo,
  prenotazioneId,
  onSuccess,
  onError,
}: PagamentoSpaFormProps) {
  const [metodoPagamento, setMetodoPagamento] = useState<string>('')
  const [unitaId, setUnitaId] = useState<string>('')
  const [unitaeDisponibili, setUnitaeDisponibili] = useState<any[]>([])
  const [cardData, setCardData] = useState({
    numero: '',
    scadenza: '',
    cvv: '',
  })
  const [loading, setLoading] = useState(false)
  const [savedPayment, setSavedPayment] = useState<any>(null)

  // Carica le camere per addebito su camera
  useEffect(() => {
    fetch('/api/host/strutture')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          // Raccoglie tutte le unità da tutte le strutture
          const unita: { id: string; nome: string }[] = []
          for (const s of data) {
            if (s.unita) {
              for (const u of s.unita) {
                unita.push({ id: u.id, nome: `${u.nome} (${s.nome})` })
              }
            }
          }
          setUnitaeDisponibili(unita)
        }
      })
      .catch(() => setUnitaeDisponibili([]))
  }, [])

  const handleSubmit = async () => {
    if (!metodoPagamento) {
      onError?.('Seleziona un metodo di pagamento')
      return
    }

    const payload: any = {
      appuntamentoId,
      importo,
      tipoImporto: 'TRATTAMENTO',
      metodo: metodoPagamento,
    }

    // Validazioni specifiche
    if (metodoPagamento === 'CAMERA_CREDIT') {
      if (!unitaId) {
        onError?.('Seleziona la camera')
        return
      }
      payload.unitaId = unitaId
    }

    if (metodoPagamento === 'CARTA') {
      if (cardData.numero) {
        payload.ultimeQuatroCifre = cardData.numero.slice(-4)
      }
    }

    setLoading(true)
    try {
      const response = await fetch('/api/spa/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Errore nel salvataggio')
      }

      const data = await response.json()
      setSavedPayment(data)
      onSuccess?.(data)
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  // Se pagamento già salvato
  if (savedPayment) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-md mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle size={40} className="text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-green-900 mb-2">Pagamento Registrato</h3>
          <p className="text-green-700 mb-4">€ {importo.toFixed(2)}</p>
          <p className="text-sm text-green-600">
            {METODI.find(m => m.id === savedPayment.metodo)?.label}
          </p>
          {savedPayment.metodo === 'CONTANTI' && (
            <p className="text-xs text-green-600 mt-2">
              ℹ️ Pagherai il saldo al momento del servizio SPA
            </p>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
        <h3 className="font-bold text-gray-900 mb-1">Metodo di Pagamento</h3>
        <p className="text-sm text-gray-600">Totale: <span className="font-bold text-lg">€ {importo.toFixed(2)}</span></p>
      </div>

      {/* Metodi */}
      <div className="space-y-3">
        {METODI.map(metodo => {
          const Icon = metodo.icon
          const isSelected = metodoPagamento === metodo.id
          const isDisabled =
            metodo.requiresUnita && (!prenotazioneId || unitaeDisponibili.length === 0)

          return (
            <motion.button
              key={metodo.id}
              onClick={() => !isDisabled && setMetodoPagamento(metodo.id)}
              disabled={isDisabled}
              whileHover={!isDisabled ? { scale: 1.02 } : {}}
              whileTap={!isDisabled ? { scale: 0.98 } : {}}
              className={`w-full p-4 rounded-lg border-2 transition text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : isDisabled
                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon size={20} className={isSelected ? 'text-blue-600' : 'text-gray-600'} />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{metodo.label}</h4>
                  <p className="text-sm text-gray-600">{metodo.description}</p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Opzioni specifiche metodo */}
      {metodoPagamento === 'CAMERA_CREDIT' && prenotazioneId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <label className="block text-sm font-medium text-gray-900">Seleziona Camera</label>
          {unitaeDisponibili.length === 0 ? (
            <p className="text-sm text-gray-600">ℹ️ Addebito su camera della prenotazione attuale</p>
          ) : (
            <select
              value={unitaId}
              onChange={e => setUnitaId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Seleziona...</option>
              {unitaeDisponibili.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          )}
        </motion.div>
      )}

      {metodoPagamento === 'CARTA' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <label className="block text-sm font-medium text-gray-900">Numero Carta</label>
          <input
            type="text"
            placeholder="4242 4242 4242 4242"
            maxLength={19}
            value={cardData.numero}
            onChange={e => setCardData({ ...cardData, numero: e.target.value.replace(/\s/g, '') })}
            className="w-full px-3 py-2 border rounded-lg font-mono"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Scadenza</label>
              <input
                type="text"
                placeholder="MM/YY"
                maxLength={5}
                value={cardData.scadenza}
                onChange={e => setCardData({ ...cardData, scadenza: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CVV</label>
              <input
                type="text"
                placeholder="123"
                maxLength={4}
                value={cardData.cvv}
                onChange={e => setCardData({ ...cardData, cvv: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded p-2 flex items-start gap-2 text-xs text-amber-700">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>Demo: usa 4242 4242 4242 4242 per testare</span>
          </div>
        </motion.div>
      )}

      {metodoPagamento === 'CONTANTI' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2 text-sm text-blue-700">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>Il pagamento avverrà al check-in presso la reception della SPA</span>
          </div>
        </motion.div>
      )}

      {metodoPagamento === 'TRANSFERWISE' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            Ti invieremo i dati per il bonifico via email
          </p>
        </motion.div>
      )}

      {/* Bottone submit */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSubmit}
        disabled={!metodoPagamento || loading}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
      >
        {loading && <Loader size={18} className="animate-spin" />}
        {loading ? 'Salvataggio...' : `Conferma Pagamento €${importo.toFixed(2)}`}
      </motion.button>
    </motion.div>
  )
}
