'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { User, Mail, Phone, MessageSquare, ArrowRight, X } from 'lucide-react'

// ─── Schema Zod ─────────────────────────────────────────────────────────────

const guestSchema = z.object({
  nome: z.string().trim().min(2, 'Nome troppo corto').max(80),
  cognome: z.string().trim().min(2, 'Cognome troppo corto').max(80),
  email: z.string().trim().toLowerCase().email('Email non valida'),
  telefono: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\+?[\d\s]{6,20}$/.test(v), 'Telefono non valido'),
  note: z.string().max(500).optional(),
  lingua: z.enum(['it', 'en', 'de', 'fr', 'es']).default('it'),
})

export type GuestData = z.infer<typeof guestSchema>

export type ConsensiData = {
  tos: boolean // obbligatorio
  privacy: boolean // obbligatorio
  marketing: boolean // opzionale
}

type Props = {
  onAvanti: (data: { guestData: GuestData; consensi: ConsensiData }) => void
}

const PREFILL_KEY = 'otium_guest_prefill'

function loadPrefill(): Partial<GuestData> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PREFILL_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<GuestData>
  } catch {
    return {}
  }
}

function savePrefill(data: GuestData) {
  try {
    localStorage.setItem(
      PREFILL_KEY,
      JSON.stringify({ nome: data.nome, cognome: data.cognome, email: data.email }),
    )
  } catch { /* noop */ }
}

function detectLingua(): GuestData['lingua'] {
  if (typeof navigator === 'undefined') return 'it'
  const lang = navigator.language.split('-')[0]
  if (['en', 'de', 'fr', 'es'].includes(lang)) return lang as GuestData['lingua']
  return 'it'
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function StepDatiOspite({ onAvanti }: Props) {
  const searchParams = useSearchParams()
  const emailFromQuery = searchParams?.get('email') ?? null

  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('+39 ')
  const [note, setNote] = useState('')
  const [lingua, setLingua] = useState<GuestData['lingua']>('it')

  const [tos, setTos] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [marketing, setMarketing] = useState(false)

  const [errors, setErrors] = useState<Partial<Record<keyof GuestData | 'tos' | 'privacy', string>>>({})
  const [tosModalOpen, setTosModalOpen] = useState(false)

  // Precompila da localStorage + query param
  useEffect(() => {
    const prefill = loadPrefill()
    setNome(prefill.nome ?? '')
    setCognome(prefill.cognome ?? '')
    setEmail(emailFromQuery ?? prefill.email ?? '')
    setLingua(detectLingua())
  }, [emailFromQuery])

  function submit() {
    const raw = {
      nome: nome.trim(),
      cognome: cognome.trim(),
      email: email.trim().toLowerCase(),
      telefono: telefono.trim() === '+39' || telefono.trim() === '' ? undefined : telefono.trim(),
      note: note.trim() || undefined,
      lingua,
    }
    const parsed = guestSchema.safeParse(raw)
    const fieldErrors: typeof errors = {}

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof GuestData
        fieldErrors[key] = issue.message
      }
    }
    if (!tos) fieldErrors.tos = 'Devi accettare i termini e condizioni'
    if (!privacy) fieldErrors.privacy = 'Devi accettare l\'informativa privacy'

    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0 || !parsed.success) return

    savePrefill(parsed.data)
    onAvanti({
      guestData: parsed.data,
      consensi: { tos, privacy, marketing },
    })
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <User className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
          I tuoi dati
        </h2>
        <p className="text-xs text-gray-500 mb-5">
          Bastano pochi dati per riservare la camera. Niente pagamento ora.
        </p>

        {/* Nome + Cognome */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              autoComplete="given-name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm ${
                errors.nome ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="Mario"
            />
            {errors.nome && <p className="text-[11px] text-red-600 mt-1">{errors.nome}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Cognome *</label>
            <input
              type="text"
              autoComplete="family-name"
              value={cognome}
              onChange={(e) => setCognome(e.target.value)}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm ${
                errors.cognome ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="Rossi"
            />
            {errors.cognome && <p className="text-[11px] text-red-600 mt-1">{errors.cognome}</p>}
          </div>
        </div>

        {/* Email */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm ${
                errors.email ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="mario.rossi@email.com"
            />
          </div>
          {errors.email && <p className="text-[11px] text-red-600 mt-1">{errors.email}</p>}
        </div>

        {/* Telefono */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Telefono <span className="text-gray-400 font-normal">(opzionale)</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              autoComplete="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={`w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm ${
                errors.telefono ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="+39 333 1234567"
            />
          </div>
          {errors.telefono && <p className="text-[11px] text-red-600 mt-1">{errors.telefono}</p>}
        </div>

        {/* Note */}
        <div className="mb-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Richieste speciali <span className="text-gray-400 font-normal">(opzionale)</span>
          </label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm resize-none"
              placeholder="Piano alto, culla, allergie…"
              maxLength={500}
            />
          </div>
        </div>

        <p className="text-[11px] text-gray-400 italic mt-2">
          Non ti chiederemo il documento adesso — lo farai comodamente al check-in online prima
          dell&apos;arrivo.
        </p>
      </div>

      {/* Consensi */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Consensi</h3>
        <div className="space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={tos}
              onChange={(e) => setTos(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs text-gray-700 leading-relaxed">
              Accetto i{' '}
              <button
                type="button"
                onClick={() => setTosModalOpen(true)}
                className="underline font-semibold"
                style={{ color: 'var(--brand-primary)' }}
              >
                termini e condizioni
              </button>
              {' *'}
            </span>
          </label>
          {errors.tos && <p className="text-[11px] text-red-600 ml-6">{errors.tos}</p>}

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={privacy}
              onChange={(e) => setPrivacy(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs text-gray-700 leading-relaxed">
              Ho letto l&apos;
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
                style={{ color: 'var(--brand-primary)' }}
              >
                informativa privacy
              </a>
              {' *'}
            </span>
          </label>
          {errors.privacy && <p className="text-[11px] text-red-600 ml-6">{errors.privacy}</p>}

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs text-gray-700 leading-relaxed">
              Acconsento a ricevere comunicazioni dalla struttura (promozioni, newsletter).
              Puoi revocare il consenso in qualsiasi momento.
            </span>
          </label>
        </div>
      </div>

      <button
        onClick={submit}
        className="w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all"
        style={{
          backgroundColor: 'var(--brand-primary)',
          color: 'var(--brand-on-primary)',
          borderRadius: 'var(--brand-radius)',
        }}
      >
        Continua <ArrowRight className="w-4 h-4" />
      </button>

      {/* Modal TOS */}
      {tosModalOpen && (
        <div
          role="dialog"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setTosModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Termini e condizioni di prenotazione</h3>
              <button
                onClick={() => setTosModalOpen(false)}
                aria-label="Chiudi"
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 text-sm text-gray-700 space-y-4 leading-relaxed">
              <section>
                <h4 className="font-semibold text-gray-900 mb-1">1. Oggetto</h4>
                <p>
                  La prenotazione dà diritto al soggiorno presso la struttura nelle date selezionate,
                  con le condizioni indicate nel riepilogo (numero ospiti, tariffa, eventuale letto
                  extra). La conferma è subordinata alla validazione da parte della struttura.
                </p>
              </section>
              <section>
                <h4 className="font-semibold text-gray-900 mb-1">2. Pagamento</h4>
                <p>
                  Il pagamento avviene secondo le modalità indicate dalla struttura (alla conferma
                  via bonifico / carta di credito, o all&apos;arrivo). Eventuali acconti o caparre
                  sono comunicati via email dopo la richiesta.
                </p>
              </section>
              <section>
                <h4 className="font-semibold text-gray-900 mb-1">3. Cancellazione</h4>
                <p>
                  Le condizioni di cancellazione sono comunicate dalla struttura via email dopo la
                  conferma. In caso di cancellazione dopo eventuale acconto, la struttura applica
                  la propria policy (flessibile / rigida / non rimborsabile).
                </p>
              </section>
              <section>
                <h4 className="font-semibold text-gray-900 mb-1">4. Check-in e documento</h4>
                <p>
                  Al check-in, per obbligo di legge (Art. 109 TULPS — Alloggiati Web), sarà
                  richiesto un documento d&apos;identità in corso di validità per ogni ospite
                  maggiorenne. Puoi anticipare il check-in online comodamente da casa tramite il
                  link che riceverai prima dell&apos;arrivo.
                </p>
              </section>
              <section>
                <h4 className="font-semibold text-gray-900 mb-1">5. Tassa di soggiorno</h4>
                <p>
                  Dove applicata dal comune, la tassa di soggiorno è calcolata in base alle
                  notti e al numero di ospiti tassabili ed è esposta separatamente nel riepilogo.
                  Viene incassata dalla struttura all&apos;arrivo.
                </p>
              </section>
              <section>
                <h4 className="font-semibold text-gray-900 mb-1">6. Privacy</h4>
                <p>
                  I dati forniti saranno trattati secondo l&apos;informativa privacy pubblicata. Il
                  trattamento è necessario per l&apos;esecuzione del contratto (Art. 6.1.b GDPR) e,
                  per gli adempimenti Alloggiati Web, per obbligo di legge (Art. 6.1.c GDPR).
                </p>
              </section>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setTosModalOpen(false)}
                className="w-full py-2.5 text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--brand-primary)',
                  color: 'var(--brand-on-primary)',
                  borderRadius: 'var(--brand-radius)',
                }}
              >
                Ho capito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
