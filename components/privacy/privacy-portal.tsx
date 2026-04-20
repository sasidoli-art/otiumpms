'use client'

import { useState } from 'react'
import { Download, Info, AlertTriangle, Check, Loader2, User as UserIcon, Shield, Trash2, Edit3 } from 'lucide-react'

type ConsensoStato = {
  tipo: string
  label: string
  obbligatorio: boolean
  revocabile: boolean
  baseGiuridica: string
  attivo: boolean
  versione: string | null
  dataUltimoCambio: string | null
}

type Props = {
  token: string
  host: { nomeAzienda: string; logo: string | null; regione: string | null }
  ospite: {
    email: string
    nome: string | null
    cognome: string | null
    telefono: string | null
    nazionalita: string | null
  }
  prenotazioni: Array<{
    id: string
    struttura: string | null
    dataArrivo: string
    dataPartenza: string | null
    numOspiti: number
    stato: string
  }>
  crm: {
    preferenze: string | null
    tags: string[]
    vip: boolean
    numSoggiorni: number
    totaleSpeso: number
    dataUltimoSoggiorno: string | null
  } | null
  spa: { appuntamenti: number; waiverAttivi: number }
  consensi: ConsensoStato[]
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PrivacyPortal(props: Props) {
  const { token, host, ospite, prenotazioni, crm, spa, consensi } = props
  const [consensiState, setConsensiState] = useState(consensi)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteMotivo, setDeleteMotivo] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteDone, setDeleteDone] = useState<{ scadenza: string } | null>(null)

  const [revokeSpaOpen, setRevokeSpaOpen] = useState(false)
  const [revokeSpaLoading, setRevokeSpaLoading] = useState(false)

  const [rettificaOpen, setRettificaOpen] = useState<string | null>(null)
  const [rettificaValue, setRettificaValue] = useState('')
  const [rettificaLoading, setRettificaLoading] = useState(false)

  async function toggleConsenso(tipo: string, nuovo: boolean) {
    setSaving((s) => ({ ...s, [tipo]: true }))
    try {
      const res = await fetch(`/api/privacy/${token}/consenso`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, accettato: nuovo, versione: '2026-04-01' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Errore')
      }
      setConsensiState((cs) =>
        cs.map((c) =>
          c.tipo === tipo ? { ...c, attivo: nuovo, dataUltimoCambio: new Date().toISOString() } : c,
        ),
      )
      setMsg({ type: 'success', text: 'Preferenze aggiornate' })
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Errore' })
    } finally {
      setSaving((s) => ({ ...s, [tipo]: false }))
      setTimeout(() => setMsg(null), 3000)
    }
  }

  async function handleExport() {
    window.open(`/api/privacy/${token}/export`, '_blank')
  }

  async function handleRevokeSpa() {
    setRevokeSpaLoading(true)
    try {
      await fetch(`/api/privacy/${token}/consenso`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'spa_art9', accettato: false, versione: '2026-04-01', revocaMotivo: 'richiesta_ospite' }),
      })
      setConsensiState((cs) =>
        cs.map((c) =>
          c.tipo === 'spa_art9'
            ? { ...c, attivo: false, dataUltimoCambio: new Date().toISOString() }
            : c,
        ),
      )
      setRevokeSpaOpen(false)
      setMsg({
        type: 'success',
        text: 'Consenso Art. 9 revocato. I dati sanitari verranno cancellati ora.',
      })
    } catch {
      setMsg({ type: 'error', text: 'Errore' })
    } finally {
      setRevokeSpaLoading(false)
    }
  }

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/privacy/${token}/cancellazione`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: deleteMotivo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Errore')
      setDeleteDone({ scadenza: data.scadenzaAt })
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Errore' })
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleRettifica(campo: string) {
    setRettificaLoading(true)
    try {
      const res = await fetch(`/api/privacy/${token}/rettifica`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campo, valoreCorretto: rettificaValue }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Errore')
      }
      setRettificaOpen(null)
      setRettificaValue('')
      setMsg({ type: 'success', text: 'Richiesta inviata alla struttura' })
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Errore' })
    } finally {
      setRettificaLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast messaggio */}
      {msg && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            msg.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-4">
          {host.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={host.logo} alt={host.nomeAzienda} className="w-14 h-14 rounded-lg object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Shield className="w-7 h-7 text-indigo-600" />
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">I tuoi dati presso</p>
            <h1 className="text-xl font-bold text-gray-900">{host.nomeAzienda}</h1>
            {ospite.nome && (
              <p className="text-sm text-gray-500 mt-0.5">
                Ciao {ospite.nome} {ospite.cognome ?? ''} · {ospite.email}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* SEZIONE 1: I TUOI DATI */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">I tuoi dati</h2>
            </div>
            <button
              onClick={handleExport}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Scarica tutto
            </button>
          </div>
          <div className="p-5 space-y-3">
            <DataField
              label="Nome"
              value={`${ospite.nome ?? '—'} ${ospite.cognome ?? ''}`.trim()}
              info="Richiesto per l'erogazione del servizio"
              onRettifica={() => { setRettificaOpen('nome'); setRettificaValue(ospite.nome ?? '') }}
            />
            <DataField label="Email" value={ospite.email} info="Chiave di identificazione" />
            <DataField
              label="Telefono"
              value={ospite.telefono ?? '—'}
              info="Per comunicazioni urgenti (check-in, variazioni)"
              onRettifica={() => { setRettificaOpen('telefono'); setRettificaValue(ospite.telefono ?? '') }}
            />
            {ospite.nazionalita && (
              <DataField
                label="Nazionalità"
                value={ospite.nazionalita}
                info="Richiesto per Alloggiati Web (Questura — Art. 109 TULPS)"
              />
            )}
            <div className="border-t border-gray-100 pt-3 grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-gray-400">Soggiorni</p>
                <p className="font-semibold text-gray-900">{crm?.numSoggiorni ?? prenotazioni.length}</p>
              </div>
              <div>
                <p className="text-gray-400">Ultimo</p>
                <p className="font-semibold text-gray-900">
                  {formatDate(crm?.dataUltimoSoggiorno ?? prenotazioni[0]?.dataArrivo ?? null)}
                </p>
              </div>
              {crm?.vip && (
                <div>
                  <p className="text-gray-400">Status</p>
                  <p className="font-semibold text-amber-600">VIP</p>
                </div>
              )}
            </div>
            {crm?.preferenze && (
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">Preferenze note</p>
                    <p className="text-sm text-gray-700">{crm.preferenze}</p>
                  </div>
                  <button
                    onClick={() => { setRettificaOpen('preferenze'); setRettificaValue(crm.preferenze ?? '') }}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> modifica
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SEZIONE 2: CONSENSI */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">I tuoi consensi</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {consensiState.map((c) => (
              <div key={c.tipo} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{c.label}</p>
                    {c.obbligatorio && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                        Necessario
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.baseGiuridica.replace('_', ' ')}
                    {c.versione && ` · v${c.versione}`}
                    {c.dataUltimoCambio && ` · ${formatDate(c.dataUltimoCambio)}`}
                  </p>
                </div>
                <ToggleSwitch
                  checked={c.attivo}
                  disabled={!c.revocabile || saving[c.tipo]}
                  onChange={(v) => toggleConsenso(c.tipo, v)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* SEZIONE 3: DATI SANITARI SPA */}
        {spa.waiverAttivi > 0 && (
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold text-amber-900">Dati sanitari SPA (Art. 9 GDPR)</h2>
                <p className="text-sm text-amber-800 mt-1">
                  Hai {spa.waiverAttivi} dichiarazione{spa.waiverAttivi > 1 ? 'i' : ''} sanitari{spa.waiverAttivi > 1 ? 'e' : 'a'} presso questa struttura.
                  I dati vengono cancellati automaticamente dopo 90 giorni. Puoi revocare il consenso
                  ora — i dati saranno cancellati immediatamente.
                </p>
                <button
                  onClick={() => setRevokeSpaOpen(true)}
                  className="mt-3 text-xs font-semibold text-amber-900 hover:text-amber-950 underline"
                >
                  Revoca consenso Art. 9 →
                </button>
              </div>
            </div>
          </section>
        )}

        {/* SEZIONE 4: CANCELLAZIONE */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-3">
            <Trash2 className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">Richiedi la cancellazione</h2>
              <p className="text-sm text-gray-500 mt-1">
                Puoi chiedere la cancellazione di tutti i tuoi dati personali.
                Alcuni dati potrebbero essere conservati per obblighi di legge: documentazione
                fiscale (10 anni, Art. 2220 CC) e dati Alloggiati (5 anni, Art. 109 TULPS).
                La struttura ha 30 giorni per processare la richiesta (Art. 17 GDPR).
              </p>
              <button
                onClick={() => setDeleteDialogOpen(true)}
                className="mt-3 text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Richiedi cancellazione →
              </button>
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-gray-400 pt-4">
          Titolare del trattamento: {host.nomeAzienda}
          {host.regione && ` · ${host.regione}`}
        </p>
      </main>

      {/* DIALOG cancellazione */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            {deleteDone ? (
              <>
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center">Richiesta inviata</h3>
                <p className="text-sm text-gray-500 text-center mt-2">
                  La struttura processerà la richiesta entro il{' '}
                  <strong>{formatDate(deleteDone.scadenza)}</strong> (30 giorni, Art. 17 GDPR).
                </p>
                <button
                  onClick={() => { setDeleteDialogOpen(false); setDeleteDone(null); setDeleteMotivo('') }}
                  className="mt-6 w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
                >
                  Chiudi
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900">Conferma cancellazione</h3>
                <p className="text-sm text-gray-500 mt-2">
                  I tuoi dati saranno cancellati o anonimizzati entro 30 giorni.
                  Dati fiscali e Alloggiati restano per obbligo di legge.
                </p>
                <label className="block text-xs font-medium text-gray-700 mt-4 mb-1">
                  Motivo (opzionale)
                </label>
                <textarea
                  value={deleteMotivo}
                  onChange={(e) => setDeleteMotivo(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="Es. non userò più il servizio"
                />
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => setDeleteDialogOpen(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Invia richiesta
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* DIALOG revoca SPA */}
      {revokeSpaOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900">Revoca consenso Art. 9 GDPR</h3>
            <p className="text-sm text-gray-500 mt-2">
              Se revochi il consenso, i tuoi dati sanitari verranno cancellati immediatamente.
              Non potrai prenotare trattamenti SPA senza compilare un nuovo waiver.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setRevokeSpaOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleRevokeSpa}
                disabled={revokeSpaLoading}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {revokeSpaLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Conferma revoca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG rettifica */}
      {rettificaOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900">Richiedi rettifica</h3>
            <p className="text-sm text-gray-500 mt-2">
              Inserisci il valore corretto per <strong>{rettificaOpen}</strong>.
              La struttura riceverà la richiesta e deciderà se accettarla.
            </p>
            <input
              value={rettificaValue}
              onChange={(e) => setRettificaValue(e.target.value)}
              className="mt-4 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder={`Nuovo valore per ${rettificaOpen}`}
            />
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setRettificaOpen(null); setRettificaValue('') }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={() => handleRettifica(rettificaOpen)}
                disabled={rettificaLoading || !rettificaValue.trim()}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {rettificaLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Invia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DataField({
  label,
  value,
  info,
  onRettifica,
}: {
  label: string
  value: string
  info: string
  onRettifica?: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
          <span title={info} className="cursor-help">
            <Info className="w-3 h-3 text-gray-300" />
          </span>
        </div>
        <p className="text-sm text-gray-900 font-medium">{value}</p>
      </div>
      {onRettifica && (
        <button
          onClick={onRettifica}
          className="text-xs text-indigo-600 hover:underline flex items-center gap-1 shrink-0"
        >
          <Edit3 className="w-3 h-3" /> modifica
        </button>
      )}
    </div>
  )
}

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-indigo-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
