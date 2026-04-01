'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { useTranslations } from 'next-intl'
import { it } from 'date-fns/locale'
import Link from 'next/link'
import {
  Shirt, ChevronLeft, ChevronRight, Loader2, Plus, Send,
  Mail, MessageSquare, Phone, Smartphone, AlertTriangle, X,
  CheckCircle2, Package, Users,
} from 'lucide-react'

type ArticoloRiga = { nome: string; quantita: number; categoria: string }
type Riga = { camera: string; unitaId: string; ospite: string; numOspiti: number; prenotazioneId: string; articoli: ArticoloRiga[] }
type RichiestaEsistente = { id: string; stato: string; canaleInvio: string | null; inviatoA: string | null; inviatoIl: string | null; createdAt: string }

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

const CANALI = [
  { id: 'EMAIL', label: 'Email', icon: Mail, placeholder: 'lavanderia@fornitore.it' },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: Smartphone, placeholder: '+39 333 1234567' },
  { id: 'SMS', label: 'SMS', icon: Phone, placeholder: '+39 333 1234567' },
  { id: 'CHAT', label: 'Chat Staff', icon: MessageSquare, placeholder: 'Nome destinatario' },
]

export default function BiancheriaBoard() {
  const [data, setData] = useState(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [righe, setRighe] = useState<Riga[]>([])
  const [riepilogoArticoli, setRiepilogoArticoli] = useState<ArticoloRiga[]>([])
  const [totaleCamere, setTotaleCamere] = useState(0)
  const [totaleArticoli, setTotaleArticoli] = useState(0)
  const [richiesteEsistenti, setRichiesteEsistenti] = useState<RichiestaEsistente[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showInvio, setShowInvio] = useState(false)
  const [richiestaId, setRichiestaId] = useState<string | null>(null)
  const [canale, setCanale] = useState('EMAIL')
  const [destinatario, setDestinatario] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [successo, setSuccesso] = useState<string | null>(null)

  const carica = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/host/biancheria?data=${data}`)
    if (res.ok) {
      const d = await res.json()
      setRighe(d.righe)
      setRiepilogoArticoli(d.riepilogoArticoli)
      setTotaleCamere(d.totaleCamere)
      setTotaleArticoli(d.totaleArticoli)
      setRichiesteEsistenti(d.richiesteEsistenti || [])
    }
    setLoading(false)
  }, [data])

  useEffect(() => { carica() }, [carica])

  async function generaRichiesta() {
    setSaving(true); setErrore(null)
    const res = await fetch('/api/host/biancheria', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
    if (res.ok) {
      const r = await res.json()
      setRichiestaId(r.id)
      setShowInvio(true)
      carica()
    } else { const j = await res.json().catch(() => ({})); setErrore(j.error || 'Errore') }
    setSaving(false)
  }

  async function inviaRichiesta() {
    if (!richiestaId || !destinatario.trim()) return
    setSaving(true); setErrore(null); setSuccesso(null)
    const res = await fetch(`/api/host/biancheria/${richiestaId}/invia`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canale, destinatario }),
    })
    if (res.ok) {
      setSuccesso(`Richiesta inviata via ${canale} a ${destinatario}`)
      setShowInvio(false)
      carica()
    } else { const j = await res.json().catch(() => ({})); setErrore(j.error || j.nota || 'Errore invio') }
    setSaving(false)
  }

  const giornoPrecedente = () => setData(format(subDays(new Date(data + 'T12:00'), 1), 'yyyy-MM-dd'))
  const giornoSuccessivo = () => setData(format(addDays(new Date(data + 'T12:00'), 1), 'yyyy-MM-dd'))

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <div>
          <h1 className="page-title flex items-center gap-2"><Shirt className="w-6 h-6 text-brand-500" /> Biancheria</h1>
          <p className="text-sm text-gray-500">Richieste biancheria per arrivi — calcolo automatico per camera</p>
        </div>
        {righe.length > 0 && (
          <button onClick={generaRichiesta} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Genera richiesta
          </button>
        )}
      </div>

      {/* Selettore data */}
      <div className="card flex items-center justify-between">
        <button onClick={giornoPrecedente} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
            Arrivi del {format(new Date(data + 'T12:00'), 'EEEE d MMMM', { locale: it })}
          </p>
          <p className="text-xs text-gray-400">{totaleCamere} camere · {totaleArticoli} articoli necessari</p>
        </div>
        <button onClick={giornoSuccessivo} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {errore && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" /> {errore}
          <button onClick={() => setErrore(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {successo && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4" /> {successo}
        </div>
      )}

      {/* Richieste già inviate */}
      {richiesteEsistenti.filter(r => r.stato !== 'BOZZA').length > 0 && (
        <div className="flex flex-wrap gap-2">
          {richiesteEsistenti.filter(r => r.stato !== 'BOZZA').map(r => (
            <span key={r.id} className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {r.stato} via {r.canaleInvio} → {r.inviatoA}
              {r.inviatoIl && ` (${format(new Date(r.inviatoIl), 'd/MM HH:mm')})`}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card py-12 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : righe.length === 0 ? (
        <div className="card py-12 flex flex-col items-center gap-2 text-gray-300">
          <Package className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nessun arrivo per questa data</p>
        </div>
      ) : (
        <>
          {/* Riepilogo totali */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-3">Riepilogo totale</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {riepilogoArticoli.map(a => (
                <div key={a.nome} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-xs text-gray-700 dark:text-slate-300">{a.nome}</span>
                  <span className="text-sm font-bold text-brand-600">{a.quantita}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dettaglio per camera */}
          <div className="space-y-2">
            {righe.map(r => (
              <div key={r.unitaId} className="card flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
                  <Shirt className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{r.camera}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1"><Users className="w-3 h-3" /> {r.numOspiti}</span>
                  </div>
                  <Link href={`/host/prenotazioni/${r.prenotazioneId}`} className="text-xs text-brand-600 hover:underline">{r.ospite}</Link>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {r.articoli.map(a => (
                      <span key={a.nome} className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded">
                        {a.quantita}× {a.nome}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal invio */}
      {showInvio && richiestaId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Invia richiesta biancheria</h3>
              <button onClick={() => setShowInvio(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-500">{totaleCamere} camere · {totaleArticoli} articoli</p>

            {/* Selezione canale */}
            <div className="grid grid-cols-2 gap-2">
              {CANALI.map(c => {
                const Icon = c.icon
                return (
                  <button key={c.id} onClick={() => setCanale(c.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                      canale === c.id ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300'
                    }`}>
                    <Icon className="w-4 h-4" /> {c.label}
                  </button>
                )
              })}
            </div>

            <input type="text" value={destinatario} onChange={e => setDestinatario(e.target.value)}
              placeholder={CANALI.find(c => c.id === canale)?.placeholder}
              className={inp} required />

            <div className="flex gap-2">
              <button onClick={inviaRichiesta} disabled={saving || !destinatario.trim()} className="flex-1 btn-primary flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Invia via {CANALI.find(c => c.id === canale)?.label}
              </button>
              <button onClick={() => setShowInvio(false)} className="btn-secondary">Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
