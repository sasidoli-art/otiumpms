'use client'

import { useState } from 'react'
import { Plus, X, Loader2, Check, Building2, Bot, FileText, Package } from 'lucide-react'
import { CATALOGO_MODULI } from '@/lib/moduli'

const PIANI = [
  { id: 'LIGHT', label: 'LIGHT', desc: '€29/mese · 1 struttura · 10 unità' },
  { id: 'EVENTO_SINGOLO', label: 'EVENTO SINGOLO', desc: '€49/mese · 1 struttura · 3 eventi' },
  { id: 'VISIBILITA_MENSILE', label: 'VISIBILITÀ MENSILE', desc: '€149/mese · 3 strutture · 20 unità · CRM+Staff+Channel' },
  { id: 'PARTNER_PREMIUM', label: 'PARTNER PREMIUM', desc: '€299/mese · 10 strutture · tutti i moduli' },
]

const REGIMI_FISCALI = [
  { value: 'RF01', label: 'RF01 — Ordinario' },
  { value: 'RF19', label: 'RF19 — Forfettario' },
  { value: 'RF02', label: 'RF02 — Contribuenti minimi' },
  { value: 'RF04', label: 'RF04 — Agricoltura e attività connesse' },
  { value: 'RF05', label: 'RF05 — Vendita sali e tabacchi' },
]

const TEMPLATE_PROMPT = `Sei il concierge AI di [NOME STRUTTURA].

INFORMAZIONI STRUTTURA:
- Orario colazione: 07:30 - 10:00 al ristorante / in terrazza
- Check-in: dalle 15:00
- Check-out: entro le 11:00 (late check-out su richiesta fino alle 14:00)
- Wi-Fi: [NOME_RETE] / password: [PASSWORD]
- Parcheggio: gratuito nel cortile interno
- Animali: ammessi su richiesta

SERVIZI:
- SPA aperta 09:00-20:00, prenotazione obbligatoria
- Colazione inclusa nella tariffa
- Servizio in camera su richiesta dalle 08:00 alle 22:00

TONO:
- Caldo, cortese, professionale da concierge di hotel
- Risposte brevi (max 3 frasi)
- Se non sai qualcosa, dillo onestamente e proponi di contattare la reception`

const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'

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

    // Azienda
    nomeAzienda: '',
    partitaIva: '',
    codiceFiscale: '',
    telefono: '',
    sitoWeb: '',
    indirizzo: '',
    citta: '',
    provincia: '',
    cap: '',
    regione: '',

    // Fatturazione
    fattPec: '',
    fattCodiceSDI: '',
    regimeFiscale: 'RF01',

    // Piano + Moduli
    piano: 'VISIBILITA_MENSILE',
    moduliAttivi: {} as Record<string, boolean>,

    // Prima struttura
    strutturaNome: '',
    strutturaTipo: 'ALLOGGIO' as 'EVENTO' | 'VENUE' | 'ESPERIENZA' | 'ALLOGGIO' | 'SERVIZIO',
    strutturaCitta: '',
    strutturaPrezzoBase: '80',
    numeroUnita: '5',
    prefissoUnita: 'Camera',

    // Concierge
    conciergeAttivo: false,
    conciergeSystemPrompt: TEMPLATE_PROMPT,
  })

  function generaPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const bytes = new Uint8Array(10)
    crypto.getRandomValues(bytes)
    const pwd = Array.from(bytes, b => chars[b % chars.length]).join('')
    setForm(f => ({ ...f, password: pwd }))
  }

  function toggleModulo(id: string) {
    setForm(f => ({
      ...f,
      moduliAttivi: { ...f.moduliAttivi, [id]: !f.moduliAttivi[id] },
    }))
  }

  async function salva(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/superadmin/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          strutturaPrezzoBase: Number(form.strutturaPrezzoBase) || 0,
          numeroUnita: Number(form.numeroUnita) || 0,
          conciergeSystemPrompt: form.conciergeAttivo ? form.conciergeSystemPrompt : null,
          fattPec: form.fattPec || null,
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

  // Schermata success con credenziali
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-bold mb-1">Host creato con successo</h2>
          <p className="text-xs text-gray-500 mb-4">
            Salva queste credenziali e consegnale all&apos;host. La password non verrà mostrata di
            nuovo.
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
              <p className="text-[10px] uppercase text-gray-400 font-semibold">URL login</p>
              <p className="font-mono text-xs break-all">https://otium-pms.vercel.app/login</p>
            </div>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `Email: ${success.email}\nPassword: ${success.password}\nLogin: https://otium-pms.vercel.app/login`
              )
            }}
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

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl my-8">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Nuovo Host</h2>
            <p className="text-xs text-gray-500">White-glove onboarding completo</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Chiudi"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={salva} className="p-6 space-y-6">
          {/* Sezione 1: Account utente */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
              <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                1
              </span>
              Account utente
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Nome referente *
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Email (login) *
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
                    >
                      🎲 Genera
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sezione 2: Dati azienda */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
              <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                2
              </span>
              Dati azienda
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
                  placeholder="Agriturismo Il Poggio srl"
                  className={inp}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Partita IVA
                  </label>
                  <input
                    value={form.partitaIva}
                    onChange={e => setForm(f => ({ ...f, partitaIva: e.target.value }))}
                    placeholder="IT01234567890"
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Codice Fiscale
                  </label>
                  <input
                    value={form.codiceFiscale}
                    onChange={e => setForm(f => ({ ...f, codiceFiscale: e.target.value }))}
                    className={inp}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Telefono
                  </label>
                  <input
                    value={form.telefono}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                    placeholder="+39 055 123456"
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Sito web
                  </label>
                  <input
                    value={form.sitoWeb}
                    onChange={e => setForm(f => ({ ...f, sitoWeb: e.target.value }))}
                    placeholder="https://ilpoggio.it"
                    className={inp}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Indirizzo
                </label>
                <input
                  value={form.indirizzo}
                  onChange={e => setForm(f => ({ ...f, indirizzo: e.target.value }))}
                  placeholder="Via del Poggio 12"
                  className={inp}
                />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Città
                  </label>
                  <input
                    value={form.citta}
                    onChange={e => setForm(f => ({ ...f, citta: e.target.value }))}
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Provincia
                  </label>
                  <input
                    maxLength={2}
                    value={form.provincia}
                    onChange={e => setForm(f => ({ ...f, provincia: e.target.value.toUpperCase() }))}
                    placeholder="SI"
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    CAP
                  </label>
                  <input
                    maxLength={5}
                    value={form.cap}
                    onChange={e => setForm(f => ({ ...f, cap: e.target.value }))}
                    placeholder="53100"
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Regione
                  </label>
                  <input
                    value={form.regione}
                    onChange={e => setForm(f => ({ ...f, regione: e.target.value }))}
                    placeholder="Toscana"
                    className={inp}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Sezione 3: Fatturazione elettronica */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
              <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                3
              </span>
              <FileText className="w-3 h-3" /> Fatturazione elettronica
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    PEC
                  </label>
                  <input
                    type="email"
                    value={form.fattPec}
                    onChange={e => setForm(f => ({ ...f, fattPec: e.target.value }))}
                    placeholder="pec@ilpoggio.pec.it"
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Codice SDI
                  </label>
                  <input
                    maxLength={7}
                    value={form.fattCodiceSDI}
                    onChange={e => setForm(f => ({ ...f, fattCodiceSDI: e.target.value.toUpperCase() }))}
                    placeholder="0000000"
                    className={inp}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Regime fiscale
                </label>
                <select
                  value={form.regimeFiscale}
                  onChange={e => setForm(f => ({ ...f, regimeFiscale: e.target.value }))}
                  className={inp}
                >
                  {REGIMI_FISCALI.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Sezione 4: Piano + Moduli */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
              <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                4
              </span>
              <Package className="w-3 h-3" /> Piano + Moduli
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Piano
                </label>
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
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">
                  Moduli attivi extra (oltre quelli inclusi nel piano)
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 dark:border-slate-600 rounded-lg">
                  {CATALOGO_MODULI.map(m => (
                    <label
                      key={m.id}
                      className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!!form.moduliAttivi[m.id]}
                        onChange={() => toggleModulo(m.id)}
                        className="mt-0.5"
                      />
                      <div className="text-xs">
                        <p className="font-semibold">{m.nome}</p>
                        <p className="text-gray-400">{m.descrizione}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Sezione 5: Prima struttura */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
              <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                5
              </span>
              <Building2 className="w-3 h-3" /> Prima struttura (opzionale)
            </h3>
            <p className="text-[11px] text-gray-500 mb-3">
              Lascia vuoto il nome struttura per saltare — potrai crearla dopo da{' '}
              <code>/superadmin/strutture</code>.
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Nome struttura
                  </label>
                  <input
                    value={form.strutturaNome}
                    onChange={e => setForm(f => ({ ...f, strutturaNome: e.target.value }))}
                    placeholder="Agriturismo Il Poggio"
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Tipo
                  </label>
                  <select
                    value={form.strutturaTipo}
                    onChange={e => setForm(f => ({ ...f, strutturaTipo: e.target.value as typeof form.strutturaTipo }))}
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Città struttura
                  </label>
                  <input
                    value={form.strutturaCitta}
                    onChange={e => setForm(f => ({ ...f, strutturaCitta: e.target.value }))}
                    placeholder="(usa quella azienda se vuoto)"
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Prezzo base (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.strutturaPrezzoBase}
                    onChange={e => setForm(f => ({ ...f, strutturaPrezzoBase: e.target.value }))}
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Num. unità
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    value={form.numeroUnita}
                    onChange={e => setForm(f => ({ ...f, numeroUnita: e.target.value }))}
                    className={inp}
                  />
                </div>
              </div>
              {Number(form.numeroUnita) > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    Prefisso unità
                  </label>
                  <input
                    value={form.prefissoUnita}
                    onChange={e => setForm(f => ({ ...f, prefissoUnita: e.target.value }))}
                    placeholder="Camera"
                    className={inp}
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Verranno create: <strong>{form.prefissoUnita} 1</strong>, ...{' '}
                    <strong>
                      {form.prefissoUnita} {form.numeroUnita}
                    </strong>
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Sezione 6: Concierge AI */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
              <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                6
              </span>
              <Bot className="w-3 h-3" /> AI Concierge
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.conciergeAttivo}
                  onChange={e => setForm(f => ({ ...f, conciergeAttivo: e.target.checked }))}
                />
                <div className="text-xs">
                  <p className="font-semibold">Attiva Concierge AI al primo login</p>
                  <p className="text-gray-500">
                    L&apos;host potrà comunque attivarlo/disattivarlo dal toggle in topbar. Config
                    AI (provider, chiave) è centralizzata in{' '}
                    <code>/superadmin/impostazioni/ai</code>.
                  </p>
                </div>
              </label>

              {form.conciergeAttivo && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                    System prompt (personalità + info struttura)
                  </label>
                  <textarea
                    value={form.conciergeSystemPrompt}
                    onChange={e => setForm(f => ({ ...f, conciergeSystemPrompt: e.target.value }))}
                    rows={12}
                    className={inp + ' font-mono text-[11px]'}
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Personalizza col nome reale della struttura, password Wi-Fi reale, orari
                    corretti. Puoi anche lasciare il template e modificarlo dopo.
                  </p>
                </div>
              )}
            </div>
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
              {loading ? 'Creazione...' : 'Crea host white-glove'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
