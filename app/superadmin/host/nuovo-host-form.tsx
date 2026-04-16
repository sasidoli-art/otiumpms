'use client'

import { useState } from 'react'
import { Plus, X, Loader2, Check, Building2, Bot, Trash2 } from 'lucide-react'

const PIANI = [
  { id: 'LIGHT', label: 'LIGHT', desc: '€29/mese · 1 struttura · 10 unità' },
  { id: 'EVENTO_SINGOLO', label: 'EVENTO SINGOLO', desc: '€49/mese · 1 struttura · 3 eventi' },
  { id: 'VISIBILITA_MENSILE', label: 'VISIBILITÀ MENSILE', desc: '€149/mese · 3 strutture · CRM+Staff+Channel' },
  { id: 'PARTNER_PREMIUM', label: 'PARTNER PREMIUM', desc: '€299/mese · 10 strutture · tutti i moduli' },
]

type TipoStruttura = 'ALLOGGIO' | 'EVENTO' | 'VENUE' | 'ESPERIENZA' | 'SERVIZIO'

type StrutturaForm = {
  nome: string
  tipo: TipoStruttura
  citta: string
  numeroUnita: string
  prefissoUnita: string
}

const emptyStruttura = (): StrutturaForm => ({
  nome: '',
  tipo: 'ALLOGGIO',
  citta: '',
  numeroUnita: '5',
  prefissoUnita: 'Camera',
})

const inp =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

export default function NuovoHostForm({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ email: string; password: string } | null>(null)

  const [form, setForm] = useState({
    // Account
    email: '',
    password: '',
    nome: '',
    cognome: '',
    // Azienda (minimal)
    nomeAzienda: '',
    citta: '',
    // Piano
    piano: 'VISIBILITA_MENSILE',
    // Concierge
    conciergeAttivo: true,
  })

  const [strutture, setStrutture] = useState<StrutturaForm[]>([emptyStruttura()])

  function generaPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const bytes = new Uint8Array(10)
    crypto.getRandomValues(bytes)
    const pwd = Array.from(bytes, b => chars[b % chars.length]).join('')
    setForm(f => ({ ...f, password: pwd }))
  }

  function aggiungiStruttura() {
    setStrutture(s => [...s, emptyStruttura()])
  }

  function rimuoviStruttura(idx: number) {
    setStrutture(s => s.filter((_, i) => i !== idx))
  }

  function aggiornaStruttura(idx: number, patch: Partial<StrutturaForm>) {
    setStrutture(s => s.map((st, i) => (i === idx ? { ...st, ...patch } : st)))
  }

  async function salva(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Filtra strutture vuote (senza nome)
      const struttureValide = strutture.filter(s => s.nome.trim().length > 0)

      const res = await fetch('/api/superadmin/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          nome: form.nome,
          cognome: form.cognome,
          nomeAzienda: form.nomeAzienda,
          citta: form.citta || null,
          piano: form.piano,
          conciergeAttivo: form.conciergeAttivo,
          strutture: struttureValide.map(s => ({
            nome: s.nome.trim(),
            tipo: s.tipo,
            citta: s.citta.trim() || form.citta || null,
            numeroUnita: Number(s.numeroUnita) || 0,
            prefissoUnita: s.prefissoUnita.trim() || 'Camera',
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Errore creazione')
        setLoading(false)
        return
      }
      setSuccess({ email: form.email, password: form.password })
      setLoading(false)
    } catch {
      setError('Errore di rete')
      setLoading(false)
    }
  }

  // Schermata success
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-bold mb-1">Host attivato</h2>
          <p className="text-xs text-gray-500 mb-4">
            Consegna queste credenziali all&apos;host. La password non verrà più mostrata.
          </p>

          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 mb-4 space-y-2">
            <div>
              <p className="text-[10px] uppercase text-gray-400 font-semibold">Email</p>
              <p className="font-mono text-sm">{success.email}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-400 font-semibold">Password</p>
              <p className="font-mono text-sm">{success.password}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-400 font-semibold">Login</p>
              <p className="font-mono text-xs break-all">{typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'}</p>
            </div>
          </div>

          <button
            onClick={() =>
              navigator.clipboard.writeText(
                `Email: ${success.email}\nPassword: ${success.password}\nLogin: ${typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login'}`
              )
            }
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-semibold mb-2 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            📋 Copia credenziali
          </button>

          <button
            onClick={() => {
              setSuccess(null)
              onClose()
              window.location.reload()
            }}
            className="w-full px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold"
          >
            Chiudi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Nuovo Host</h2>
            <p className="text-xs text-gray-500">
              Attiva host + crea strutture iniziali. I dettagli (fatturazione, foto, tariffe
              avanzate) si configurano dopo.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Chiudi">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={salva} className="p-6 space-y-6">
          {/* Referente */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Referente</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Nome *
                </label>
                <input
                  required
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Cognome *
                </label>
                <input
                  required
                  value={form.cognome}
                  onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))}
                  className={inp}
                />
              </div>
            </div>
          </section>

          {/* Account login */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Credenziali login
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Email *
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="mario@hotel.it"
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Password *
                </label>
                <div className="flex gap-2">
                  <input
                    required
                    type="text"
                    minLength={6}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className={inp}
                  />
                  <button
                    type="button"
                    onClick={generaPassword}
                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold whitespace-nowrap"
                    title="Genera password casuale"
                  >
                    🎲
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Azienda */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Azienda
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Nome azienda *
                </label>
                <input
                  required
                  value={form.nomeAzienda}
                  onChange={e => setForm(f => ({ ...f, nomeAzienda: e.target.value }))}
                  placeholder="Agriturismo Il Poggio"
                  className={inp}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Città
                </label>
                <input
                  value={form.citta}
                  onChange={e => setForm(f => ({ ...f, citta: e.target.value }))}
                  placeholder="Siena"
                  className={inp}
                />
              </div>
            </div>
          </section>

          {/* Piano */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Piano</h3>
            <div className="grid gap-2">
              {PIANI.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, piano: p.id }))}
                  className={`p-3 rounded-lg border-2 text-left text-xs transition-all ${
                    form.piano === p.id
                      ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-brand-300'
                  }`}
                >
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-gray-400 mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Strutture (repeatable) */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Building2 className="w-3 h-3" /> Strutture ({strutture.length})
              </h3>
              <button
                type="button"
                onClick={aggiungiStruttura}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                <Plus className="w-3 h-3" /> Aggiungi struttura
              </button>
            </div>

            <p className="text-[11px] text-gray-500 mb-3">
              Crea una o più strutture. Per ogni struttura specifichi solo il numero di camere — i
              nomi specifici e i posti letto li configurerà l&apos;host (o tu stesso) dopo il login.
            </p>

            <div className="space-y-3">
              {strutture.map((st, idx) => (
                <div
                  key={idx}
                  className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500">Struttura #{idx + 1}</span>
                    {strutture.length > 1 && (
                      <button
                        type="button"
                        onClick={() => rimuoviStruttura(idx)}
                        className="text-red-500 hover:text-red-600"
                        aria-label="Rimuovi"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-slate-400 mb-1">
                          Nome struttura
                        </label>
                        <input
                          value={st.nome}
                          onChange={e => aggiornaStruttura(idx, { nome: e.target.value })}
                          placeholder="Agriturismo Il Poggio"
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-slate-400 mb-1">
                          Tipo
                        </label>
                        <select
                          value={st.tipo}
                          onChange={e => aggiornaStruttura(idx, { tipo: e.target.value as TipoStruttura })}
                          className={inp}
                        >
                          <option value="ALLOGGIO">Alloggio</option>
                          <option value="EVENTO">Evento</option>
                          <option value="VENUE">Venue</option>
                          <option value="ESPERIENZA">Esperienza</option>
                          <option value="SERVIZIO">Servizio</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-slate-400 mb-1">
                          Città
                        </label>
                        <input
                          value={st.citta}
                          onChange={e => aggiornaStruttura(idx, { citta: e.target.value })}
                          placeholder="(opzionale)"
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-slate-400 mb-1">
                          N° camere
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="200"
                          value={st.numeroUnita}
                          onChange={e => aggiornaStruttura(idx, { numeroUnita: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 dark:text-slate-400 mb-1">
                          Prefisso
                        </label>
                        <input
                          value={st.prefissoUnita}
                          onChange={e => aggiornaStruttura(idx, { prefissoUnita: e.target.value })}
                          placeholder="Camera"
                          className={inp}
                        />
                      </div>
                    </div>

                    {Number(st.numeroUnita) > 0 && (
                      <p className="text-[10px] text-gray-500">
                        Create: <strong>{st.prefissoUnita} 1</strong> ...{' '}
                        <strong>
                          {st.prefissoUnita} {st.numeroUnita}
                        </strong>{' '}
                        — l&apos;host rinomina e imposta i posti letto dopo.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Concierge */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
              <Bot className="w-3 h-3" /> AI Concierge
            </h3>
            <label className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 cursor-pointer">
              <input
                type="checkbox"
                checked={form.conciergeAttivo}
                onChange={e => setForm(f => ({ ...f, conciergeAttivo: e.target.checked }))}
              />
              <div className="text-xs">
                <p className="font-semibold">Attiva AI Concierge al primo login</p>
                <p className="text-gray-500">
                  L&apos;host può poi ON/OFF dal toggle in topbar. Provider + chiave sono
                  centralizzati in <code>/superadmin/impostazioni/ai</code>.
                </p>
              </div>
            </label>
          </section>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-2 sticky bottom-0 bg-white dark:bg-slate-900 pt-4 border-t border-gray-100 dark:border-slate-700 -mx-6 px-6 pb-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Attivazione...' : 'Attiva host'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
