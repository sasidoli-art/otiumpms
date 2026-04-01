/**
 * Billing logic for Otium Week subscription management.
 *
 * Defines plan tiers, pricing, limits, and upgrade/downgrade rules.
 */

import { PianoTipo } from '@prisma/client'

// ─── Plan definitions ────────────────────────────────────────────────────────

export interface PlanDefinition {
  piano: PianoTipo
  label: string
  /** Monthly price in EUR */
  prezzoMensile: number
  /** Billing cycle in days (30 = monthly) */
  cicloDays: number
  /** Max structures the host can create */
  maxStrutture: number
  /** Max bookable units across all structures */
  maxUnita: number
  /** Max events the host can publish */
  maxEventi: number
  /** Included modules (by key) */
  moduliInclusi: string[]
  /** Tier level for upgrade/downgrade comparison (higher = better) */
  tier: number
}

export const PLAN_DEFINITIONS: Record<PianoTipo, PlanDefinition> = {
  LIGHT: {
    piano: 'LIGHT',
    label: 'Light',
    prezzoMensile: 29,
    cicloDays: 30,
    maxStrutture: 1,
    maxUnita: 10,
    maxEventi: 0,
    moduliInclusi: ['prenotazioni', 'strutture', 'housekeeping', 'crm', 'emailAuto', 'ical'],
    tier: 0,
  },
  EVENTO_SINGOLO: {
    piano: 'EVENTO_SINGOLO',
    label: 'Evento Singolo',
    prezzoMensile: 49,
    cicloDays: 30,
    maxStrutture: 1,
    maxUnita: 5,
    maxEventi: 3,
    moduliInclusi: ['prenotazioni', 'strutture', 'eventi', 'crm', 'housekeeping', 'emailAuto', 'ical'],
    tier: 1,
  },
  VISIBILITA_MENSILE: {
    piano: 'VISIBILITA_MENSILE',
    label: 'Visibilita Mensile',
    prezzoMensile: 149,
    cicloDays: 30,
    maxStrutture: 3,
    maxUnita: 20,
    maxEventi: 10,
    moduliInclusi: ['prenotazioni', 'strutture', 'eventi', 'crm', 'housekeeping', 'manutenzione', 'staff', 'alloggiati', 'promemoria', 'fatturazione', 'catalogo', 'emailAuto', 'ical', 'channelMgr', 'ristorazione'],
    tier: 2,
  },
  PARTNER_PREMIUM: {
    piano: 'PARTNER_PREMIUM',
    label: 'Partner Premium',
    prezzoMensile: 349,
    cicloDays: 30,
    maxStrutture: 10,
    maxUnita: 100,
    maxEventi: -1, // unlimited
    moduliInclusi: [
      'prenotazioni', 'strutture', 'eventi', 'crm', 'housekeeping',
      'manutenzione', 'staff', 'alloggiati', 'promemoria', 'lostFound', 'magazzino', 'alertOspite',
      'spa', 'fatturazione', 'tariffeDurata', 'ristorazione', 'catalogo', 'upselling',
      'giftCard', 'pos', 'loyalty', 'waitingList', 'cassa',
      'concierge', 'emailAuto', 'ical', 'channelMgr',
    ],
    tier: 3,
  },
}

// ─── Plan helpers ────────────────────────────────────────────────────────────

/**
 * Returns the full plan definition for a PianoTipo.
 */
export function getPlanDefinition(piano: PianoTipo): PlanDefinition {
  return PLAN_DEFINITIONS[piano]
}

/**
 * Returns the limits for a given plan (max strutture, unita, eventi).
 */
export function getPlanLimits(piano: PianoTipo) {
  const def = PLAN_DEFINITIONS[piano]
  return {
    maxStrutture: def.maxStrutture,
    maxUnita: def.maxUnita,
    maxEventi: def.maxEventi,
    moduliInclusi: def.moduliInclusi,
  }
}

/**
 * Validates whether upgrading from currentPlan to targetPlan is allowed.
 * Returns { ok: true } or { ok: false, reason: string }.
 */
export function canUpgrade(
  currentPlan: PianoTipo,
  targetPlan: PianoTipo,
): { ok: true } | { ok: false; reason: string } {
  if (currentPlan === targetPlan) {
    return { ok: false, reason: 'Il piano selezionato e uguale a quello attuale' }
  }

  const current = PLAN_DEFINITIONS[currentPlan]
  const target = PLAN_DEFINITIONS[targetPlan]

  if (!current || !target) {
    return { ok: false, reason: 'Piano non valido' }
  }

  // Allow both upgrades and downgrades
  return { ok: true }
}

/**
 * Checks if a plan change is an upgrade (higher tier) vs downgrade.
 */
export function isUpgrade(currentPlan: PianoTipo, targetPlan: PianoTipo): boolean {
  return PLAN_DEFINITIONS[targetPlan].tier > PLAN_DEFINITIONS[currentPlan].tier
}

/**
 * Calculates pro-rata credit/charge when changing plan mid-cycle.
 *
 * If upgrading: returns the extra amount to charge (positive).
 * If downgrading: returns the credit amount (negative).
 *
 * @param currentPlan - current plan enum
 * @param newPlan - target plan enum
 * @param daysRemaining - days remaining in current billing cycle
 * @returns { importo: number, isCredito: boolean, dettaglio: string }
 */
export function calculateProRata(
  currentPlan: PianoTipo,
  newPlan: PianoTipo,
  daysRemaining: number,
) {
  const current = PLAN_DEFINITIONS[currentPlan]
  const target = PLAN_DEFINITIONS[newPlan]

  const cicloDays = current.cicloDays
  const dailyCurrent = current.prezzoMensile / cicloDays
  const dailyTarget = target.prezzoMensile / cicloDays

  // Credit for remaining days on current plan
  const creditoCorrente = dailyCurrent * daysRemaining
  // Cost for remaining days on new plan
  const costoNuovo = dailyTarget * daysRemaining

  const differenza = costoNuovo - creditoCorrente
  const importo = Math.round(Math.abs(differenza) * 100) / 100

  if (differenza > 0) {
    return {
      importo,
      isCredito: false,
      dettaglio: `Supplemento pro-rata: ${daysRemaining} giorni rimanenti (${current.label} -> ${target.label})`,
    }
  } else if (differenza < 0) {
    return {
      importo,
      isCredito: true,
      dettaglio: `Credito pro-rata: ${daysRemaining} giorni rimanenti (${current.label} -> ${target.label})`,
    }
  }

  return {
    importo: 0,
    isCredito: false,
    dettaglio: 'Nessun adeguamento pro-rata necessario',
  }
}

/**
 * Calculates the number of days remaining in the current billing cycle.
 */
export function daysRemaining(dataFineAbb: Date | null): number {
  if (!dataFineAbb) return 0
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const fine = new Date(dataFineAbb)
  fine.setHours(0, 0, 0, 0)
  const diff = fine.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Returns the next billing period dates (start + end) for a plan change.
 */
export function nextBillingPeriod(piano: PianoTipo): { dataInizio: Date; dataFine: Date } {
  const def = PLAN_DEFINITIONS[piano]
  const dataInizio = new Date()
  dataInizio.setHours(0, 0, 0, 0)
  const dataFine = new Date(dataInizio)
  dataFine.setDate(dataFine.getDate() + def.cicloDays)
  return { dataInizio, dataFine }
}

/**
 * Returns all available plans as an array, sorted by tier.
 */
export function getAllPlans(): PlanDefinition[] {
  return Object.values(PLAN_DEFINITIONS).sort((a, b) => a.tier - b.tier)
}
