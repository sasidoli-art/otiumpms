/**
 * EmptyState — primo contatto dell'host con una sezione vuota.
 *
 * Due API:
 *   1. PRESET (raccomandato): `<EmptyState kind="prenotazioni" />`
 *      → 8 preset con illustrazione SVG line-art + label/descrizione/CTA
 *      di default. Override possibile su titolo/descrizione/azione.
 *
 *   2. CUSTOM (legacy/back-compat): `<EmptyState icon="BookOpen" titolo="…" />`
 *      → icona Lucide + testo libero, niente illustrazione.
 *
 * Animazione: scale 0.9→1 + fade in al mount (200ms, ease-out, una tantum).
 */
import Link from 'next/link'
import {
  BookOpen, Sparkles, Calendar, FileText, MessageSquare,
  Package, Wrench, Clock, Search, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ────────────────────────────────────────────────────────────────────────────
// Preset definitions
// ────────────────────────────────────────────────────────────────────────────

export type EmptyStateKind =
  | 'prenotazioni'
  | 'crm'
  | 'housekeeping-clean'
  | 'messaggi'
  | 'fatture'
  | 'ricerca'
  | 'errore'
  | 'manutenzione-clean'

type Azione = { label: string; href?: string; onClick?: () => void }

type Preset = {
  illustration: () => JSX.Element
  titolo: string
  descrizione: string
  azione?: Azione
}

const PRESETS: Record<EmptyStateKind, Preset> = {
  prenotazioni: {
    illustration: IllPrenotazioni,
    titolo: 'Nessuna prenotazione',
    descrizione: 'Le prenotazioni appariranno qui quando i tuoi ospiti prenoteranno.',
    azione: { label: 'Crea la prima prenotazione', href: '/host/prenotazioni/nuova' },
  },
  crm: {
    illustration: IllCrm,
    titolo: 'Nessun ospite nel CRM',
    descrizione: 'Gli ospiti vengono aggiunti automaticamente quando prenotano.',
  },
  'housekeeping-clean': {
    illustration: IllSparkles,
    titolo: 'Tutte le camere sono pulite!',
    descrizione: 'Nessun task aperto. Buon lavoro al team.',
  },
  messaggi: {
    illustration: IllMessaggi,
    titolo: 'Nessun messaggio',
    descrizione: 'Le conversazioni appariranno quando gli ospiti ti scriveranno.',
  },
  fatture: {
    illustration: IllFatture,
    titolo: 'Nessuna fattura',
    descrizione: 'Crea la tua prima fattura manualmente o a partire da una prenotazione.',
    azione: { label: 'Nuova fattura', href: '/host/fatture/nuova' },
  },
  ricerca: {
    illustration: IllRicerca,
    titolo: 'Nessun risultato',
    descrizione: 'Prova a cercare con parole diverse.',
  },
  errore: {
    illustration: IllErrore,
    titolo: 'Impossibile caricare i dati',
    descrizione: 'Verifica la connessione e riprova.',
  },
  'manutenzione-clean': {
    illustration: IllManutenzioneClean,
    titolo: 'Nessuna segnalazione aperta',
    descrizione: 'Tutto funziona alla perfezione!',
  },
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

const ICON_REGISTRY: Record<string, LucideIcon> = {
  BookOpen, Sparkles, Calendar, FileText, MessageSquare,
  Package, Wrench, Clock, Search,
}

export interface EmptyStateProps {
  /** Preset con illustrazione SVG + testi/CTA di default. */
  kind?: EmptyStateKind
  /** Override: icona Lucide se non si usa `kind`. */
  icon?: string | LucideIcon
  /** Override del titolo del preset (o titolo standalone). */
  titolo?: string
  /** Override della descrizione del preset. */
  descrizione?: string
  /** Override del CTA (passa null per nascondere quello del preset). */
  azione?: { label: string; href?: string; onClick?: () => void } | null
  /** Layout compatto (height ridotta, illustration più piccola). */
  compact?: boolean
  className?: string
}

export function EmptyState({
  kind, icon, titolo, descrizione, azione, compact, className,
}: EmptyStateProps) {
  const preset = kind ? PRESETS[kind] : null

  // Valori finali (preset + override)
  const finalTitolo = titolo ?? preset?.titolo ?? 'Nessun dato'
  const finalDescr = descrizione ?? preset?.descrizione
  const finalAzione = azione === null
    ? null
    : (azione ?? preset?.azione ?? null)

  const Illustration = preset?.illustration

  // Custom-icon mode (no preset): rende un cerchio neutro con icona Lucide
  const Icon = !preset && icon
    ? (typeof icon === 'string' ? (ICON_REGISTRY[icon] || Package) : icon)
    : null

  return (
    <div
      className={cn(
        'flex flex-col items-center text-center',
        compact ? 'min-h-[160px] py-6 gap-3' : 'min-h-[240px] py-12 gap-4',
        'animate-[emptyStateIn_200ms_var(--ease-out)_both]',
        className,
      )}
    >
      {/* Illustration o icon-circle */}
      {Illustration ? (
        <Illustration />
      ) : Icon ? (
        <div className={cn(
          'rounded-2xl flex items-center justify-center',
          compact ? 'w-12 h-12' : 'w-16 h-16',
          'bg-neutral-100 dark:bg-neutral-800',
        )}>
          <Icon size={compact ? 22 : 28} className="text-neutral-400" />
        </div>
      ) : null}

      {/* Testo */}
      <div className="max-w-[360px]">
        <p className={cn(
          'font-semibold text-neutral-900 dark:text-neutral-100',
          compact ? 'text-[14px]' : 'text-[16px]',
        )}>
          {finalTitolo}
        </p>
        {finalDescr && (
          <p className={cn(
            'mt-1 text-neutral-500 leading-relaxed',
            compact ? 'text-[12px]' : 'text-[13px]',
          )}>
            {finalDescr}
          </p>
        )}
      </div>

      {/* CTA */}
      {finalAzione && (
        finalAzione.href ? (
          <Link
            href={finalAzione.href}
            className={cn(
              'inline-flex items-center justify-center mt-1 px-4 h-9 rounded-md',
              'bg-primary-600 text-white text-[13px] font-semibold',
              'hover:bg-primary-700 transition-colors',
            )}
          >
            {finalAzione.label}
          </Link>
        ) : (
          <button
            onClick={finalAzione.onClick}
            className={cn(
              'inline-flex items-center justify-center mt-1 px-4 h-9 rounded-md',
              'bg-primary-600 text-white text-[13px] font-semibold',
              'hover:bg-primary-700 transition-colors',
            )}
          >
            {finalAzione.label}
          </button>
        )
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// SVG illustrations — line art 80×80, stroke 1.5, primary-200/100
// ────────────────────────────────────────────────────────────────────────────

const SVG_PROPS = {
  width: 80,
  height: 80,
  viewBox: '0 0 80 80',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
} as const

// Stroke + fill via CSS vars — auto-adattano a light/dark
const STROKE = 'var(--color-primary-400)'
const FILL = 'var(--color-primary-100)'
const FILL_DEEP = 'var(--color-primary-200)'

function IllPrenotazioni() {
  // Calendario con stellina in alto a destra
  return (
    <svg {...SVG_PROPS} aria-hidden="true">
      {/* Calendar body */}
      <rect x="14" y="20" width="44" height="40" rx="4" fill={FILL} />
      <rect x="14" y="20" width="44" height="40" rx="4" stroke={STROKE} strokeWidth="1.5" />
      {/* Header strip */}
      <path d="M14 30h44" stroke={STROKE} strokeWidth="1.5" />
      {/* Hangers */}
      <path d="M24 14v10M48 14v10" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
      {/* Date dots */}
      <circle cx="24" cy="40" r="1.5" fill={STROKE} />
      <circle cx="32" cy="40" r="1.5" fill={STROKE} />
      <circle cx="40" cy="40" r="1.5" fill={STROKE} />
      <circle cx="24" cy="48" r="1.5" fill={STROKE} />
      <circle cx="32" cy="48" r="1.5" fill={STROKE} />
      {/* Star top-right */}
      <path
        d="M58 8l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6L58 8z"
        fill={FILL_DEEP}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IllCrm() {
  // Due sagome di persone (front) sovrapposte
  return (
    <svg {...SVG_PROPS} aria-hidden="true">
      {/* Persona dietro (più piccola, più chiara) */}
      <circle cx="52" cy="28" r="7" fill={FILL} stroke={STROKE} strokeWidth="1.5" />
      <path
        d="M40 56c0-7 5.5-12 12-12s12 5 12 12v4H40v-4z"
        fill={FILL}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Persona davanti */}
      <circle cx="30" cy="32" r="9" fill={FILL_DEEP} stroke={STROKE} strokeWidth="1.5" />
      <path
        d="M14 64c0-9 7-16 16-16s16 7 16 16v2H14v-2z"
        fill={FILL_DEEP}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IllSparkles() {
  // Costellazione di scintille
  return (
    <svg {...SVG_PROPS} aria-hidden="true">
      {/* Scintilla grande centro */}
      <path
        d="M40 16c0 8 4 12 12 12-8 0-12 4-12 12 0-8-4-12-12-12 8 0 12-4 12-12z"
        fill={FILL_DEEP}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Scintilla piccola top-right */}
      <path
        d="M62 14c0 3 1.5 4.5 4.5 4.5-3 0-4.5 1.5-4.5 4.5 0-3-1.5-4.5-4.5-4.5 3 0 4.5-1.5 4.5-4.5z"
        fill={FILL}
        stroke={STROKE}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Scintilla piccola bottom-left */}
      <path
        d="M18 56c0 3 1.5 4.5 4.5 4.5-3 0-4.5 1.5-4.5 4.5 0-3-1.5-4.5-4.5-4.5 3 0 4.5-1.5 4.5-4.5z"
        fill={FILL}
        stroke={STROKE}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Punti */}
      <circle cx="14" cy="22" r="1.5" fill={STROKE} />
      <circle cx="68" cy="62" r="1.5" fill={STROKE} />
    </svg>
  )
}

function IllMessaggi() {
  // Fumetto chat principale + uno secondario dietro
  return (
    <svg {...SVG_PROPS} aria-hidden="true">
      {/* Fumetto dietro */}
      <path
        d="M30 14h32a4 4 0 014 4v18a4 4 0 01-4 4H50l-6 6v-6h-14a4 4 0 01-4-4V18a4 4 0 014-4z"
        fill={FILL}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Fumetto davanti */}
      <path
        d="M14 32h32a4 4 0 014 4v16a4 4 0 01-4 4H32l-7 7v-7h-11a4 4 0 01-4-4V36a4 4 0 014-4z"
        fill={FILL_DEEP}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* 3 dot dentro */}
      <circle cx="22" cy="44" r="1.5" fill={STROKE} />
      <circle cx="30" cy="44" r="1.5" fill={STROKE} />
      <circle cx="38" cy="44" r="1.5" fill={STROKE} />
    </svg>
  )
}

function IllFatture() {
  // Foglio con angolo piegato + check verde sopra
  return (
    <svg {...SVG_PROPS} aria-hidden="true">
      {/* Document body */}
      <path
        d="M22 12h26l12 12v40a4 4 0 01-4 4H22a4 4 0 01-4-4V16a4 4 0 014-4z"
        fill={FILL}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Folded corner */}
      <path d="M48 12v12h12" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Lines */}
      <path d="M26 36h20M26 44h20M26 52h12" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
      {/* Check circle bottom-right */}
      <circle cx="58" cy="58" r="10" fill={FILL_DEEP} stroke={STROKE} strokeWidth="1.5" />
      <path d="M53 58l3.5 3.5L63 55" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IllRicerca() {
  // Lente d'ingrandimento con X dentro
  return (
    <svg {...SVG_PROPS} aria-hidden="true">
      {/* Lens */}
      <circle cx="34" cy="34" r="18" fill={FILL} stroke={STROKE} strokeWidth="1.5" />
      {/* Inner X */}
      <path d="M28 28l12 12M40 28L28 40" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" />
      {/* Handle */}
      <path d="M48 48l16 16" stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function IllErrore() {
  // Nuvoletta con fulmine giallo dentro
  return (
    <svg {...SVG_PROPS} aria-hidden="true">
      {/* Cloud */}
      <path
        d="M22 50a10 10 0 010-20 14 14 0 0127-3 10 10 0 011 19h-28z"
        fill={FILL}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Bolt */}
      <path
        d="M40 38l-6 12h6l-2 12 10-14h-6l4-10h-6z"
        fill="var(--color-warning-200)"
        stroke="var(--color-warning-500)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IllManutenzioneClean() {
  // Chiave inglese + spunta
  return (
    <svg {...SVG_PROPS} aria-hidden="true">
      {/* Wrench (rotated) */}
      <path
        d="M22 22a8 8 0 0110-10l-4 4 4 4 4-4 4 4 24 24a4 4 0 01-6 6L30 26l-4 4-4-4 4-4-4-4-4 4z"
        fill={FILL}
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Check circle */}
      <circle cx="58" cy="22" r="10" fill={FILL_DEEP} stroke={STROKE} strokeWidth="1.5" />
      <path d="M53 22l3.5 3.5L63 19" stroke={STROKE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
