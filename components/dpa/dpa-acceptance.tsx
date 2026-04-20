'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Check, Loader2, AlertTriangle } from 'lucide-react'
import { SignaturePad } from '@/components/spa/signature-pad'
import { DPA_TEMPLATE, DPA_VERSIONE } from '@/lib/dpa-template'

type Props = {
  nomeAzienda: string
  reAccept?: boolean // true se l'host sta ri-accettando per cambio versione
  versioneVecchia?: string | null
}

export default function DpaAcceptance({ nomeAzienda, reAccept, versioneVecchia }: Props) {
  const router = useRouter()
  const [firmaBase64, setFirmaBase64] = useState<string | null>(null)
  const [firmaNome, setFirmaNome] = useState('')
  const [firmaRuolo, setFirmaRuolo] = useState('')
  const [lettoConfermato, setLettoConfermato] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = !!firmaBase64 && firmaNome.trim().length >= 2 && lettoConfermato && !saving

  async function submit() {
    if (!canSubmit) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/host/dpa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firmaBase64, firmaNome: firmaNome.trim(), firmaRuolo: firmaRuolo.trim() || null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Errore')
      }
      router.push('/host/dashboard')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore')
    } finally {
      setSaving(false)
    }
  }

  // Sostituisce {nomeAzienda} nel titolare
  const titolare = DPA_TEMPLATE.parti.titolare.replace('{nomeAzienda}', nomeAzienda)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {reAccept ? 'Nuovo DPA — accettazione richiesta' : 'Accordo per il trattamento dei dati'}
              </h1>
              <p className="text-xs text-gray-500">Versione {DPA_VERSIONE}</p>
            </div>
          </div>
          {reAccept && versioneVecchia && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 mt-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900">
                Il DPA è stato aggiornato dalla versione <strong>{versioneVecchia}</strong> alla <strong>{DPA_VERSIONE}</strong>.
                Per continuare a usare Otium è necessario accettare il nuovo accordo.
              </p>
            </div>
          )}
        </div>

        {/* Documento scrollabile */}
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="max-h-[500px] overflow-y-auto p-6 space-y-5">
            <div>
              <h2 className="font-bold text-gray-900">{DPA_TEMPLATE.titolo}</h2>
              <p className="text-xs text-gray-500 mt-1">Versione {DPA_VERSIONE}</p>
            </div>

            <div className="text-sm text-gray-700 leading-relaxed">
              {DPA_TEMPLATE.premessa}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-xs space-y-1.5">
              <p><strong className="text-gray-900">Parti:</strong></p>
              <p className="text-gray-700">• {titolare}</p>
              <p className="text-gray-700">• {DPA_TEMPLATE.parti.responsabile}</p>
            </div>

            {DPA_TEMPLATE.sezioni.map((s, i) => (
              <section key={i}>
                <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{s.titolo}</h3>
                {s.testo && (
                  <p className="text-sm text-gray-700 leading-relaxed">{s.testo}</p>
                )}
                {s.lista && (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                    {s.lista.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 italic">
              {DPA_TEMPLATE.note}
            </div>
          </div>
        </div>

        {/* Conferma lettura */}
        <label className="flex items-start gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={lettoConfermato}
            onChange={(e) => setLettoConfermato(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-sm text-gray-700">
            Dichiaro di aver letto integralmente il presente accordo e di accettarne tutte le clausole,
            anche ai sensi degli artt. 1341 e 1342 c.c.
          </span>
        </label>

        {/* Dati firmatario */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Firmatario</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nome e cognome *
              </label>
              <input
                type="text"
                value={firmaNome}
                onChange={(e) => setFirmaNome(e.target.value)}
                placeholder="Mario Rossi"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Ruolo
              </label>
              <select
                value={firmaRuolo}
                onChange={(e) => setFirmaRuolo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="">Seleziona...</option>
                <option value="Titolare">Titolare</option>
                <option value="Legale rappresentante">Legale rappresentante</option>
                <option value="Amministratore">Amministratore</option>
                <option value="Direttore">Direttore</option>
              </select>
            </div>
          </div>
        </div>

        {/* Firma digitale */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">Firma digitale *</h3>
          <p className="text-xs text-gray-500 mb-3">Firma nel riquadro sottostante con mouse o dito</p>
          <div className="border-2 border-dashed border-gray-200 rounded-lg h-48 relative">
            <SignaturePad
              onSave={(base64) => setFirmaBase64(base64)}
              onClear={() => setFirmaBase64(null)}
            />
          </div>
        </div>

        {/* Errore */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Registrazione in corso…</>
          ) : (
            <><Check className="w-4 h-4" /> Accetta e firma</>
          )}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          Firmando accetti il DPA e autorizzi la registrazione di IP e user-agent come prova legale.
        </p>
      </div>
    </div>
  )
}
