'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, ChevronDown, Link2, Copy, CheckCircle2, Mail, Printer, Loader2, HelpCircle, Send } from 'lucide-react'
import {
  getEmailTemplate, LINGUE_DISPONIBILI, TIPI_TEMPLATE,
  type LinguaTemplate, type TipoTemplate, type TemplateData,
} from '@/lib/email-templates'
import { getTassaSoggiornoBase, getTassaSoggiornoAlta, calcolaTassaSuggerita } from '@/lib/comuni-tassa-soggiorno'
import { format } from 'date-fns'
import { it as itLocale } from 'date-fns/locale'

type Prenotazione = {
  id: string
  stato: string
  prezzoTotale: number | null
  acconto: number | null
  tassaSoggiorno: number | null
  noteInterne: string | null
  // extra dati per email template
  guestNome?: string
  guestCognome?: string
  guestEmail?: string
  dataArrivo?: string
  dataPartenza?: string | null
  numOspiti?: number
  strutturaNome?: string
  strutturaCitta?: string
  unitaNome?: string | null
  guestLingua?: string | null
  checkInCompletato?: boolean
}

const STATI = [
  { value: 'CONFERMATA', label: 'Conferma', color: 'bg-green-600 hover:bg-green-700 text-white' },
  { value: 'ANNULLATA', label: 'Annulla', color: 'bg-red-600 hover:bg-red-700 text-white' },
  { value: 'COMPLETATA', label: 'Segna completata', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { value: 'NO_SHOW', label: 'No show', color: 'bg-gray-500 hover:bg-gray-600 text-white' },
]

export default function PrenotazioneActions({ prenotazione }: { prenotazione: Prenotazione }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  // Check-in link
  const [checkInUrl, setCheckInUrl] = useState<string | null>(null)
  const [copiato, setCopiato] = useState(false)
  // Email modal
  const [emailModal, setEmailModal] = useState(false)
  const [lingua, setLingua] = useState<LinguaTemplate>('it')
  const [tipoEmail, setTipoEmail] = useState<TipoTemplate>('conferma_prenotazione')
  const [emailPreview, setEmailPreview] = useState({ oggetto: '', corpo: '' })
  const [prezzo, setPrezzo] = useState(prenotazione.prezzoTotale?.toString() ?? '')
  const [acconto, setAcconto] = useState(prenotazione.acconto?.toString() ?? '')
  const [tassaSoggiorno, setTassaSoggiorno] = useState(prenotazione.tassaSoggiorno?.toString() ?? '')
  const [note, setNote] = useState(prenotazione.noteInterne ?? '')
  // Checkout modal
  const [checkoutModal, setCheckoutModal] = useState(false)
  const [checkoutTassa, setCheckoutTassa] = useState(prenotazione.tassaSoggiorno?.toString() ?? '')
  const [inviaContoEmail, setInviaContoEmail] = useState(true)
  const [liberaCamera, setLiberaCamera] = useState(true)
  const [totaleExtra, setTotaleExtra] = useState(0)
  const router = useRouter()

  const tassaSuggerita = prenotazione.strutturaCitta
    ? calcolaTassaSuggerita(prenotazione.strutturaCitta, prenotazione.dataArrivo ? new Date(prenotazione.dataArrivo) : undefined, prenotazione.dataPartenza ? new Date(prenotazione.dataPartenza) : undefined)
    : null

  async function cambiaStato(stato: string) {
    if (stato === 'COMPLETATA') {
      setCheckoutTassa(tassaSoggiorno || (prenotazione.tassaSoggiorno?.toString() ?? ''))
      // Carica addebiti extra
      fetch(`/api/host/prenotazioni/${prenotazione.id}/addebiti`)
        .then(r => r.ok ? r.json() : { totale: 0 })
        .then(d => setTotaleExtra(d.totale ?? 0))
      setCheckoutModal(true)
      return
    }
    setLoading(stato)
    const res = await fetch(`/api/host/prenotazioni/${prenotazione.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato }),
    })
    if (res.ok) router.refresh()
    setLoading(null)
  }

  async function confermaCheckout() {
    setLoading('COMPLETATA')
    const body: Record<string, unknown> = {
      stato: 'COMPLETATA',
      liberaCamera,
    }
    if (checkoutTassa) body.tassaSoggiorno = Number(checkoutTassa)

    const res = await fetch(`/api/host/prenotazioni/${prenotazione.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      // Invio conto via email se toggle attivo
      if (inviaContoEmail && prenotazione.guestEmail) {
        try {
          await fetch(`/api/host/prenotazioni/${prenotazione.id}/conto-email`, { method: 'POST' })
        } catch { /* silenzioso */ }
      }
      setCheckoutModal(false)
      setTassaSoggiorno(checkoutTassa)
      router.refresh()
    }
    setLoading(null)
  }

  async function salvaDettagli() {
    setLoading('save')
    const res = await fetch(`/api/host/prenotazioni/${prenotazione.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prezzoTotale: prezzo ? Number(prezzo) : null,
        acconto: acconto ? Number(acconto) : null,
        tassaSoggiorno: tassaSoggiorno ? Number(tassaSoggiorno) : null,
        noteInterne: note || null,
      }),
    })
    if (res.ok) { setEditMode(false); router.refresh() }
    setLoading(null)
  }

  async function generaCheckInLink() {
    setLoading('checkin')
    const res = await fetch(`/api/host/prenotazioni/${prenotazione.id}/checkin-token`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setCheckInUrl(data.url)
    }
    setLoading(null)
  }

  async function copiaLink() {
    if (!checkInUrl) return
    await navigator.clipboard.writeText(checkInUrl)
    setCopiato(true)
    setTimeout(() => setCopiato(false), 2000)
  }

  function aggiornaPreview(t: TipoTemplate, l: LinguaTemplate) {
    const notti = prenotazione.dataArrivo && prenotazione.dataPartenza
      ? Math.round((new Date(prenotazione.dataPartenza).getTime() - new Date(prenotazione.dataArrivo).getTime()) / 86400000)
      : undefined
    const datiTemplate: TemplateData = {
      guestNome: prenotazione.guestNome ?? 'Ospite',
      guestCognome: prenotazione.guestCognome,
      strutturaNome: prenotazione.strutturaNome ?? 'La struttura',
      unitaNome: prenotazione.unitaNome ?? undefined,
      dataArrivo: prenotazione.dataArrivo
        ? format(new Date(prenotazione.dataArrivo), 'd MMMM yyyy', { locale: itLocale })
        : '',
      dataPartenza: prenotazione.dataPartenza
        ? format(new Date(prenotazione.dataPartenza), 'd MMMM yyyy', { locale: itLocale })
        : undefined,
      numNotti: notti,
      numOspiti: prenotazione.numOspiti,
      prezzoTotale: prenotazione.prezzoTotale != null
        ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(prenotazione.prezzoTotale)
        : undefined,
      acconto: prenotazione.acconto != null
        ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(prenotazione.acconto)
        : undefined,
      checkInUrl: checkInUrl ?? undefined,
    }
    setEmailPreview(getEmailTemplate(t, l, datiTemplate))
  }

  function apriEmailModal() {
    const defaultLingua = (prenotazione.guestLingua as LinguaTemplate) ?? 'it'
    setLingua(defaultLingua)
    setTipoEmail('conferma_prenotazione')
    aggiornaPreview('conferma_prenotazione', defaultLingua)
    setEmailModal(true)
  }

  const statoAttuale = prenotazione.stato

  return (
    <div className="card space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Azioni</h2>

      {/* Cambio stato */}
      <div className="space-y-2">
        {STATI.filter((s) => s.value !== statoAttuale).map((s) => (
          <button
            key={s.value}
            onClick={() => cambiaStato(s.value)}
            disabled={!!loading}
            className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${s.color} disabled:opacity-60`}
          >
            {loading === s.value ? 'Aggiornamento...' : s.label}
          </button>
        ))}
      </div>

      {/* Aggiorna prezzi/note */}
      <button
        onClick={() => setEditMode(!editMode)}
        className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200"
      >
        Modifica dettagli
        <ChevronDown className={`w-4 h-4 transition-transform ${editMode ? 'rotate-180' : ''}`} />
      </button>

      {editMode && (
        <div className="space-y-3 pt-1">
          <div>
            <label className="label">Prezzo totale (€)</label>
            <input
              type="number" step="0.01" min={0}
              value={prezzo}
              onChange={(e) => setPrezzo(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Acconto (€)</label>
            <input
              type="number" step="0.01" min={0}
              value={acconto}
              onChange={(e) => setAcconto(e.target.value)}
              className="input"
            />
          </div>

          {/* Tassa di soggiorno */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <label className="label">Tassa di soggiorno (€/notte)</label>
              {tassaSuggerita !== null && (
                <div className="flex items-center gap-1 text-xs text-gray-500 cursor-help" title="Suggerita dal comune">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span className="text-brand-600 font-medium">Sugg. €{tassaSuggerita.toFixed(2)}</span>
                </div>
              )}
            </div>
            <input
              type="number" step="0.01" min={0}
              value={tassaSoggiorno}
              onChange={(e) => setTassaSoggiorno(e.target.value)}
              placeholder={tassaSuggerita ? `€${tassaSuggerita.toFixed(2)}` : 'Inserisci importo'}
              className="input"
            />
            {prenotazione.strutturaCitta && (
              <p className="text-xs text-gray-400 mt-1">Comune: {prenotazione.strutturaCitta}</p>
            )}
          </div>

          <div>
            <label className="label">Note interne</label>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="input" />
          </div>
          <div className="flex gap-2">
            <button onClick={salvaDettagli} disabled={loading === 'save'} className="btn-primary flex-1 text-sm">
              {loading === 'save' ? 'Salvo...' : 'Salva'}
            </button>
            <button onClick={() => setEditMode(false)} className="btn-secondary text-sm">
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Strumenti */}
      <div className="border-t pt-3 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Strumenti</p>

        {/* Link check-in online */}
        <button
          onClick={generaCheckInLink}
          disabled={loading === 'checkin' || prenotazione.checkInCompletato}
          className="w-full flex items-center gap-2 py-2 px-3 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 disabled:opacity-50 transition-colors"
        >
          {loading === 'checkin' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          {prenotazione.checkInCompletato ? '✓ Check-in completato' : 'Genera link check-in'}
        </button>

        {checkInUrl && (
          <div className="bg-indigo-50 rounded-lg p-2.5 space-y-1.5">
            <p className="text-xs text-indigo-800 font-medium">Link check-in ospite:</p>
            <p className="text-xs text-indigo-600 break-all font-mono">{checkInUrl}</p>
            <button
              onClick={copiaLink}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-900"
            >
              {copiato ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiato ? 'Copiato!' : 'Copia link'}
            </button>
          </div>
        )}

        {/* Email template */}
        <button
          onClick={apriEmailModal}
          className="w-full flex items-center gap-2 py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
        >
          <Mail className="w-4 h-4" /> Prepara email ospite
        </button>

        {/* Ricevuta */}
        <a
          href={`/host/prenotazioni/${prenotazione.id}/ricevuta`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
        >
          <Printer className="w-4 h-4" /> Stampa ricevuta
        </a>

        {/* Scheda Ospite PDF */}
        <a
          href={`/api/host/prenotazioni/${prenotazione.id}/scheda-ospite`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2 py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
        >
          <Printer className="w-4 h-4" /> Scheda ospite PDF
        </a>

        {/* Conto Ospite — PDF stampa o invio email */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 pl-1">Conto ospite</p>
          <a
            href={`/api/host/prenotazioni/${prenotazione.id}/conto`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2 py-2 px-3 text-sm text-brand-600 hover:bg-brand-50 rounded-lg border border-brand-200 transition-colors"
          >
            <Printer className="w-4 h-4" /> Stampa conto (PDF)
          </a>
          {prenotazione.guestEmail && (
            <button
              onClick={async () => {
                setLoading('conto-email')
                try {
                  const res = await fetch(`/api/host/prenotazioni/${prenotazione.id}/conto-email`, { method: 'POST' })
                  if (res.ok) {
                    setLoading(null)
                    alert('Conto inviato via email a ' + prenotazione.guestEmail)
                  } else {
                    setLoading(null)
                    alert('Errore nell\'invio')
                  }
                } catch {
                  setLoading(null)
                  alert('Errore di connessione')
                }
              }}
              disabled={loading === 'conto-email'}
              className="w-full flex items-center gap-2 py-2 px-3 text-sm text-purple-600 hover:bg-purple-50 rounded-lg border border-purple-200 transition-colors disabled:opacity-50"
            >
              {loading === 'conto-email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Invia conto via email
            </button>
          )}
        </div>
      </div>

      {/* Modal checkout completo */}
      {checkoutModal && (() => {
        const notti = prenotazione.dataArrivo && prenotazione.dataPartenza
          ? Math.round((new Date(prenotazione.dataPartenza).getTime() - new Date(prenotazione.dataArrivo).getTime()) / 86400000)
          : 0
        const tassaTotale = checkoutTassa ? Number(checkoutTassa) * notti : 0
        const totale = (prenotazione.prezzoTotale ?? 0) + totaleExtra + tassaTotale
        const saldo = totale - (prenotazione.acconto ?? 0)

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900 text-lg">Check-out</h3>
              <button onClick={() => setCheckoutModal(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Riepilogo conto */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Riepilogo conto</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Soggiorno ({notti} notti × {prenotazione.numOspiti} ospiti)</span>
                    <span className="font-semibold">€{(prenotazione.prezzoTotale ?? 0).toFixed(2)}</span>
                  </div>
                  {totaleExtra > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Addebiti extra</span>
                      <span className="font-semibold text-blue-600">€{totaleExtra.toFixed(2)}</span>
                    </div>
                  )}
                  {prenotazione.acconto != null && prenotazione.acconto > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Acconto versato</span>
                      <span>−€{prenotazione.acconto.toFixed(2)}</span>
                    </div>
                  )}
                  {tassaTotale > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Tassa soggiorno ({notti}n × €{Number(checkoutTassa).toFixed(2)})</span>
                      <span>€{tassaTotale.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-base">
                    <span>Saldo da pagare</span>
                    <span className={saldo > 0 ? 'text-red-600' : 'text-green-600'}>
                      {saldo > 0 ? `€${saldo.toFixed(2)}` : 'SALDATO'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tassa di soggiorno */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="label">Tassa di soggiorno (€/notte)</label>
                  {tassaSuggerita !== null && (
                    <button
                      type="button"
                      onClick={() => setCheckoutTassa(tassaSuggerita.toFixed(2))}
                      className="text-xs text-brand-600 font-medium hover:underline"
                    >
                      Sugg. €{tassaSuggerita.toFixed(2)}
                    </button>
                  )}
                </div>
                <input
                  type="number" step="0.01" min={0}
                  value={checkoutTassa}
                  onChange={(e) => setCheckoutTassa(e.target.value)}
                  placeholder={tassaSuggerita ? `€${tassaSuggerita.toFixed(2)}` : '0.00'}
                  className="input"
                />
              </div>

              {/* Toggle opzioni */}
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Invia conto via email</p>
                    <p className="text-xs text-gray-400">{prenotazione.guestEmail || 'Nessuna email ospite'}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={inviaContoEmail && !!prenotazione.guestEmail}
                    disabled={!prenotazione.guestEmail}
                    onChange={e => setInviaContoEmail(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Libera camera</p>
                    <p className="text-xs text-gray-400">{prenotazione.unitaNome || 'Nessuna camera assegnata'}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={liberaCamera && !!prenotazione.unitaNome}
                    disabled={!prenotazione.unitaNome}
                    onChange={e => setLiberaCamera(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                </label>
              </div>
            </div>

            <div className="p-5 border-t flex gap-3">
              <button
                onClick={confermaCheckout}
                disabled={loading === 'COMPLETATA'}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading === 'COMPLETATA' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {loading === 'COMPLETATA' ? 'Completamento...' : 'Conferma check-out'}
              </button>
              <button onClick={() => setCheckoutModal(false)} className="px-4 py-3 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                Annulla
              </button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* Modal email template */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">Email per l&apos;ospite</h3>
              <button onClick={() => setEmailModal(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tipo email</label>
                  <select
                    className="input"
                    value={tipoEmail}
                    onChange={e => {
                      const t = e.target.value as TipoTemplate
                      setTipoEmail(t)
                      aggiornaPreview(t, lingua)
                    }}
                  >
                    {TIPI_TEMPLATE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Lingua</label>
                  <select
                    className="input"
                    value={lingua}
                    onChange={e => {
                      const l = e.target.value as LinguaTemplate
                      setLingua(l)
                      aggiornaPreview(tipoEmail, l)
                    }}
                  >
                    {LINGUE_DISPONIBILI.map(l => (
                      <option key={l.value} value={l.value}>{l.flag} {l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {emailPreview.oggetto && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">OGGETTO</p>
                    <p className="text-sm font-medium text-gray-900">{emailPreview.oggetto}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">CORPO</p>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{emailPreview.corpo}</pre>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700">
                  <strong>Copia il testo</strong> e incollalo nel tuo client email (Gmail, Outlook…) per inviarlo all&apos;ospite: <span className="font-mono">{prenotazione.guestEmail}</span>
                </p>
              </div>
            </div>
            <div className="p-4 border-t space-y-2">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const testo = `Oggetto: ${emailPreview.oggetto}\n\n${emailPreview.corpo}`
                    navigator.clipboard.writeText(testo)
                  }}
                  className="btn-secondary flex items-center gap-2 flex-1"
                >
                  <Copy className="w-4 h-4" /> Copia tutto
                </button>
                {prenotazione.guestEmail && (
                  <a
                    href={`mailto:${prenotazione.guestEmail}?subject=${encodeURIComponent(emailPreview.oggetto)}&body=${encodeURIComponent(emailPreview.corpo)}`}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" /> Apri in email
                  </a>
                )}
              </div>
              {prenotazione.guestEmail && (
                <button
                  onClick={async () => {
                    setLoading('send-email')
                    try {
                      const res = await fetch(`/api/host/prenotazioni/${prenotazione.id}/send-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          to: prenotazione.guestEmail,
                          subject: emailPreview.oggetto,
                          body: emailPreview.corpo,
                        }),
                      })
                      if (res.ok) {
                        setEmailModal(false)
                        alert('Email inviata e registrata nella chat!')
                      } else {
                        const data = await res.json().catch(() => ({}))
                        alert(data.error || 'Errore nell\'invio')
                      }
                    } catch {
                      alert('Errore di connessione')
                    }
                    setLoading(null)
                  }}
                  disabled={loading === 'send-email'}
                  className="w-full btn-primary flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {loading === 'send-email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
                  Invia direttamente
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
