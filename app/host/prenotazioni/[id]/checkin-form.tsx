'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, LogIn, LogOut, Loader2, AlertTriangle } from 'lucide-react'
import { DocumentScanner } from './document-scanner'
import { STATI, PROVINCE_ITALIANE, isItaliano } from '@/lib/nazionalita'

type Props = {
  prenotazioneId: string
  stato: string
  datiEsistenti?: {
    guestSesso: string | null
    guestDataNascita: Date | null
    guestLuogoNascita: string | null
    guestComuneNascitaIstat: string | null
    guestProvinciaNascita: string | null
    guestStatoNascitaIstat: string | null
    guestCittadinanzaIstat: string | null
    guestTipoDocumento: string | null
    guestNumeroDocumento: string | null
    guestLuogoRilascio: string | null
    guestComuneRilascioIstat: string | null
    guestProvinciaRilascio: string | null
    guestStatoRilascioIstat: string | null
    guestCodiceFiscale?: string | null
  } | null
}

const TIPI_DOCUMENTO = [
  { value: 'IDENTE', label: "Carta d'identità" },
  { value: 'PPORT', label: 'Passaporto' },
  { value: 'PATEN', label: 'Patente di guida' },
  { value: 'PERMSOS', label: 'Permesso di soggiorno' },
]

export default function CheckInForm({ prenotazioneId, stato, datiEsistenti }: Props) {
  const [aperto, setAperto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const router = useRouter()

  const d = datiEsistenti
  const [form, setForm] = useState({
    guestSesso: d?.guestSesso ?? 'M',
    guestDataNascita: d?.guestDataNascita
      ? new Date(d.guestDataNascita).toISOString().split('T')[0]
      : '',
    guestLuogoNascita: d?.guestLuogoNascita ?? '',
    guestComuneNascitaIstat: d?.guestComuneNascitaIstat ?? '',
    guestProvinciaNascita: d?.guestProvinciaNascita ?? '',
    guestStatoNascitaIstat: d?.guestStatoNascitaIstat ?? '100000100',
    guestCittadinanzaIstat: d?.guestCittadinanzaIstat ?? '100000100',
    guestTipoDocumento: d?.guestTipoDocumento ?? 'IDENTE',
    guestNumeroDocumento: d?.guestNumeroDocumento ?? '',
    guestLuogoRilascio: d?.guestLuogoRilascio ?? '',
    guestComuneRilascioIstat: d?.guestComuneRilascioIstat ?? '',
    guestProvinciaRilascio: d?.guestProvinciaRilascio ?? '',
    guestStatoRilascioIstat: d?.guestStatoRilascioIstat ?? '100000100',
    guestCodiceFiscale: d?.guestCodiceFiscale ?? '',
  })

  const italiano = isItaliano(form.guestCittadinanzaIstat)

  function set(campo: string, valore: string) {
    setForm(f => ({ ...f, [campo]: valore }))
  }

  // Quando cambia cittadinanza, aggiorna stato nascita se vuoto
  function setCittadinanza(codice: string) {
    set('guestCittadinanzaIstat', codice)
    if (!form.guestStatoNascitaIstat || form.guestStatoNascitaIstat === '100000100') {
      set('guestStatoNascitaIstat', codice)
    }
    if (!form.guestStatoRilascioIstat || form.guestStatoRilascioIstat === '100000100') {
      set('guestStatoRilascioIstat', codice)
    }
  }

  async function eseguiCheckIn() {
    setLoading(true); setErrore(null)
    try {
      const res = await fetch(`/api/host/prenotazioni/${prenotazioneId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Errore durante il check-in')
      }
      setAperto(false)
      router.refresh()
    } catch (e: unknown) {
      setErrore(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  async function eseguiCheckOut() {
    if (!confirm('Confermi il check-out? Lo stato della prenotazione diventerà "Completata".')) return
    setLoading(true); setErrore(null)
    try {
      const res = await fetch(`/api/host/prenotazioni/${prenotazioneId}/checkout`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Errore durante il check-out')
      }
      router.refresh()
    } catch (e: unknown) {
      setErrore(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  const puoCheckIn = ['RICHIESTA', 'CONFERMATA'].includes(stato)
  const puoCheckOut = stato === 'CONFERMATA'

  if (!puoCheckIn && !puoCheckOut) return null

  return (
    <>
      {/* Pulsanti principali */}
      <div className="space-y-2">
        {puoCheckIn && (
          <button
            onClick={() => setAperto(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-60"
          >
            <LogIn className="w-4 h-4" /> Check-in
          </button>
        )}
        {puoCheckOut && (
          <button
            onClick={eseguiCheckOut}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {loading ? 'Aggiornamento...' : 'Check-out'}
          </button>
        )}
        {errore && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {errore}
          </p>
        )}
      </div>

      {/* Modal check-in */}
      {aperto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-green-600" /> Check-in ospite
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Dati per Alloggiati Web (Questura)
                </p>
              </div>
              <button onClick={() => setAperto(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">

              {/* Nazionalità — primo campo, determina cosa mostrare */}
              <div>
                <label className="label">Nazionalità / Cittadinanza <span className="text-red-500">*</span></label>
                <select
                  value={form.guestCittadinanzaIstat}
                  onChange={e => setCittadinanza(e.target.value)}
                  className="input"
                >
                  {STATI.map(s => (
                    <option key={s.codice} value={s.codice}>{s.nome}</option>
                  ))}
                </select>
              </div>

              {/* Codice Fiscale — solo per italiani */}
              {italiano && (
                <div>
                  <label className="label">Codice Fiscale</label>
                  <input
                    type="text"
                    value={form.guestCodiceFiscale}
                    onChange={e => set('guestCodiceFiscale', e.target.value.toUpperCase())}
                    placeholder="RSSMRA85M01H501Z"
                    maxLength={16}
                    className="input font-mono tracking-wide"
                  />
                </div>
              )}

              {/* Sesso + Data nascita */}
              <div className="flex gap-3">
                <div className="w-28">
                  <label className="label">Sesso <span className="text-red-500">*</span></label>
                  <select value={form.guestSesso} onChange={e => set('guestSesso', e.target.value)} className="input">
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="label">Data di nascita <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={form.guestDataNascita}
                    onChange={e => set('guestDataNascita', e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>

              {/* Luogo nascita */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="label">Luogo di nascita <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.guestLuogoNascita}
                    onChange={e => set('guestLuogoNascita', e.target.value)}
                    placeholder={italiano ? 'es. Roma' : 'es. London'}
                    className="input"
                    required
                  />
                </div>
                {italiano && (
                  <div className="w-20">
                    <label className="label">Prov.</label>
                    <select value={form.guestProvinciaNascita} onChange={e => set('guestProvinciaNascita', e.target.value)} className="input text-xs">
                      <option value="">—</option>
                      {PROVINCE_ITALIANE.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Stato nascita (solo se straniero) */}
              {!italiano && (
                <div>
                  <label className="label">Stato di nascita</label>
                  <select
                    value={form.guestStatoNascitaIstat}
                    onChange={e => set('guestStatoNascitaIstat', e.target.value)}
                    className="input"
                  >
                    {STATI.map(s => <option key={s.codice} value={s.codice}>{s.nome}</option>)}
                  </select>
                </div>
              )}

              <hr className="border-gray-100" />

              {/* Scanner documento con OCR */}
              <DocumentScanner
                prenotazioneId={prenotazioneId}
                onOCRExtract={(data) => {
                  if (data.guestTipoDocumento) set('guestTipoDocumento', data.guestTipoDocumento)
                  if (data.guestNumeroDocumento) set('guestNumeroDocumento', data.guestNumeroDocumento)
                  if (data.guestDataNascita) set('guestDataNascita', data.guestDataNascita)
                  if (data.guestLuogoNascita) set('guestLuogoNascita', data.guestLuogoNascita)
                }}
              />

              {/* Documento */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="label">Tipo documento <span className="text-red-500">*</span></label>
                  <select
                    value={form.guestTipoDocumento}
                    onChange={e => set('guestTipoDocumento', e.target.value)}
                    className="input"
                  >
                    {TIPI_DOCUMENTO.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="label">Numero <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.guestNumeroDocumento}
                    onChange={e => set('guestNumeroDocumento', e.target.value.toUpperCase())}
                    placeholder="AX1234567"
                    className="input font-mono"
                    required
                  />
                </div>
              </div>

              {/* Luogo rilascio */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="label">Luogo di rilascio</label>
                  <input
                    type="text"
                    value={form.guestLuogoRilascio}
                    onChange={e => set('guestLuogoRilascio', e.target.value)}
                    placeholder={italiano ? 'es. Roma' : 'es. Embassy'}
                    className="input"
                  />
                </div>
                {italiano && (
                  <div className="w-20">
                    <label className="label">Prov.</label>
                    <select value={form.guestProvinciaRilascio} onChange={e => set('guestProvinciaRilascio', e.target.value)} className="input text-xs">
                      <option value="">—</option>
                      {PROVINCE_ITALIANE.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {errore && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {errore}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={eseguiCheckIn}
                disabled={loading || !form.guestNumeroDocumento || !form.guestDataNascita}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {loading ? 'Salvo...' : 'Conferma check-in'}
              </button>
              <button
                onClick={() => setAperto(false)}
                className="px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
