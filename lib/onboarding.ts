/**
 * Onboarding system — 3 fasi progressive.
 *
 * Fase 1 (obbligatoria, wizard 4 step, ~5 min):
 *   Step 1: Profilo azienda (nome, città, P.IVA)
 *   Step 2: Prima struttura (nome, tipo, capacità)
 *   Step 3: Moduli attivi (selezione iniziale)
 *   Step 4: Riepilogo + conferma
 *   → onboardingStep = 5, onboardingCompletato = true
 *
 * Fase 2 (suggerimenti contestuali post-completamento):
 *   Checklist di configurazioni prioritarie che appaiono nella dashboard
 *   e si completano man mano che l'host usa la piattaforma.
 *
 * Fase 3 (suggerimenti avanzati):
 *   Moduli opzionali suggeriti quando l'host è rodato.
 */

import { parseModuli } from '@/lib/moduli'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OnboardingPhase1Step {
  id: number
  titolo: string
  descrizione: string
  completato: boolean
}

export interface OnboardingTask {
  id: string
  titolo: string
  descrizione: string
  completato: boolean
  href: string
  priorita: 'alta' | 'media' | 'bassa'
  modulo?: string
}

export interface OnboardingChecklist {
  fase1Completata: boolean
  tasks: OnboardingTask[]
  percentualeCompletamento: number
}

// ─── Host shape (minimal select for checklist calculation) ──────────────────

export interface OnboardingHostData {
  onboardingCompletato: boolean
  onboardingStep: number
  // Config flags
  configSmtp: boolean
  configBranding: boolean
  configTariffe: boolean
  configPasti: boolean
  configCheckin: boolean
  primaPrenotazione: boolean
  // Derived data (caller fetches these)
  smtpHost: string | null
  logo: string | null
  regCardTerminiHtml: string | null
  moduliAttivi: unknown
  // Counts (caller provides these to avoid N+1)
  _counts: {
    strutture: number
    tariffe: number
    configPasto: number
    staff: number
    canali: number
  }
  // First struttura ID for links
  primaStrutturaId: string | null
}

// ─── Phase 1 steps ──────────────────────────────────────────────────────────

export function getPhase1Steps(step: number): OnboardingPhase1Step[] {
  return [
    {
      id: 1,
      titolo: 'Profilo azienda',
      descrizione: 'Nome, sede, P.IVA',
      completato: step > 1,
    },
    {
      id: 2,
      titolo: 'Prima struttura',
      descrizione: 'Nome, tipo, capacità',
      completato: step > 2,
    },
    {
      id: 3,
      titolo: 'Moduli attivi',
      descrizione: 'Scegli le funzionalità',
      completato: step > 3,
    },
    {
      id: 4,
      titolo: 'Conferma',
      descrizione: 'Riepilogo e avvio',
      completato: step >= 5,
    },
  ]
}

// ─── Checklist (fase 2 + 3) ─────────────────────────────────────────────────

export function getOnboardingChecklist(host: OnboardingHostData): OnboardingChecklist {
  const fase1Completata = host.onboardingCompletato || host.onboardingStep >= 5
  const moduli = parseModuli(host.moduliAttivi)
  const sid = host.primaStrutturaId

  const tasks: OnboardingTask[] = []

  // ── PRIORITÀ ALTA ─────────────────────────────────────────────────────

  tasks.push({
    id: 'config-smtp',
    titolo: 'Configura le email',
    descrizione: 'Imposta il server SMTP per inviare conferme e reminder agli ospiti.',
    completato: host.configSmtp || host.smtpHost != null,
    href: '/host/profilo#email',
    priorita: 'alta',
  })

  tasks.push({
    id: 'config-branding',
    titolo: 'Personalizza il branding',
    descrizione: 'Carica il logo e scegli i colori della tua struttura.',
    completato: host.configBranding || host.logo != null,
    href: sid ? `/host/strutture/${sid}#branding` : '/host/strutture',
    priorita: 'alta',
  })

  tasks.push({
    id: 'config-tariffe',
    titolo: 'Imposta le tariffe',
    descrizione: 'Definisci i prezzi per periodo e tipo di camera.',
    completato: host.configTariffe || host._counts.tariffe > 0,
    href: sid ? `/host/strutture/${sid}/tariffe` : '/host/strutture',
    priorita: 'alta',
  })

  tasks.push({
    id: 'config-checkin',
    titolo: 'Configura il check-in online',
    descrizione: 'Personalizza i termini e le condizioni della registration card.',
    completato: host.configCheckin || host.regCardTerminiHtml != null,
    href: '/host/impostazioni-regcard',
    priorita: 'alta',
  })

  // ── PRIORITÀ MEDIA ────────────────────────────────────────────────────

  if (moduli.ristorazione) {
    tasks.push({
      id: 'config-pasti',
      titolo: 'Configura i piani pasto',
      descrizione: 'Imposta B&B, mezza pensione o pensione completa.',
      completato: host.configPasti || host._counts.configPasto > 0,
      href: '/host/ristorazione',
      priorita: 'media',
      modulo: 'ristorazione',
    })
  }

  tasks.push({
    id: 'invita-staff',
    titolo: 'Invita il tuo staff',
    descrizione: 'Aggiungi receptionist, housekeeper e altri ruoli.',
    completato: host._counts.staff > 0,
    href: '/host/utenti',
    priorita: 'media',
  })

  if (moduli.channelMgr) {
    tasks.push({
      id: 'collega-canali',
      titolo: 'Collega Booking.com / Airbnb',
      descrizione: 'Importa prenotazioni esterne via iCal.',
      completato: host._counts.canali > 0,
      href: '/host/canali',
      priorita: 'media',
      modulo: 'channelMgr',
    })
  }

  // ── PRIORITÀ BASSA ────────────────────────────────────────────────────

  if (!moduli.spa) {
    tasks.push({
      id: 'attiva-spa',
      titolo: 'Attiva la SPA',
      descrizione: 'Gestisci trattamenti, terapisti e appuntamenti.',
      completato: false,
      href: '/host/moduli',
      priorita: 'bassa',
      modulo: 'spa',
    })
  }

  if (!moduli.concierge) {
    tasks.push({
      id: 'attiva-concierge',
      titolo: 'Configura il Concierge AI',
      descrizione: 'Assistente WhatsApp 24/7 per i tuoi ospiti.',
      completato: false,
      href: '/host/concierge/impostazioni',
      priorita: 'bassa',
      modulo: 'concierge',
    })
  }

  if (!moduli.upselling) {
    tasks.push({
      id: 'attiva-upselling',
      titolo: 'Imposta le regole di upselling',
      descrizione: 'Proponi upgrade camera automatici al check-in.',
      completato: false,
      href: '/host/upselling',
      priorita: 'bassa',
      modulo: 'upselling',
    })
  }

  // ── Calcola percentuale ───────────────────────────────────────────────

  const total = tasks.length
  const done = tasks.filter(t => t.completato).length
  const percentualeCompletamento = total > 0 ? Math.round((done / total) * 100) : 100

  return {
    fase1Completata,
    tasks,
    percentualeCompletamento,
  }
}

/**
 * Prisma select fragment for fetching host data needed by getOnboardingChecklist.
 * Use this in your query to avoid fetching unnecessary fields.
 */
export const ONBOARDING_HOST_SELECT = {
  onboardingCompletato: true,
  onboardingStep: true,
  configSmtp: true,
  configBranding: true,
  configTariffe: true,
  configPasti: true,
  configCheckin: true,
  primaPrenotazione: true,
  smtpHost: true,
  logo: true,
  regCardTerminiHtml: true,
  moduliAttivi: true,
} as const
