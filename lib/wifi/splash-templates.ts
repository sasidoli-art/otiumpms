/**
 * Templates pre-built per la welcome page captive.
 * Ogni template è un set di SplashConfig defaults che l'utente può applicare
 * con 1 click. Dopo l'apply, può continuare a personalizzare.
 */

import type { SplashConfig } from './splash-config'

export interface SplashTemplate {
  id: NonNullable<SplashConfig['template']>
  nome: string
  descrizione: string
  emoji: string
  /** Colori principali per anteprima */
  swatches: [string, string, string]
  /** Config da applicare (merge con i campi non vuoti del config corrente) */
  config: Partial<SplashConfig>
}

export const SPLASH_TEMPLATES: SplashTemplate[] = [
  {
    id: 'minimalist',
    nome: 'Minimalist',
    descrizione: 'Pulito, essenziale, bianco e nero. Adatto a boutique hotel e design B&B.',
    emoji: '⚪',
    swatches: ['#111827', '#ffffff', '#6b7280'],
    config: {
      template: 'minimalist',
      colorePrimario: '#111827',
      coloreSfondo: '#ffffff',
      coloreTesto: '#111827',
      sottotitolo: 'Connessione gratuita',
      testoBottone: 'Accedi',
      labelTabCodice: 'Codice',
      labelTabPrenotazione: 'Ospite',
    },
  },
  {
    id: 'hotel-chic',
    nome: 'Hotel Chic',
    descrizione: 'Elegante con tonalità calde dorate. Per hotel 4-5 stelle e luxury resort.',
    emoji: '✨',
    swatches: ['#92400e', '#fef3c7', '#451a03'],
    config: {
      template: 'hotel-chic',
      colorePrimario: '#92400e',
      coloreSfondo: '#fef3c7',
      coloreTesto: '#451a03',
      sottotitolo: 'Wi-Fi gratuito per i nostri ospiti',
      testoBottone: 'Connetti al Wi-Fi',
      labelTabCodice: 'Codice di accesso',
      labelTabPrenotazione: 'I miei dati',
    },
  },
  {
    id: 'agriturismo',
    nome: 'Agriturismo',
    descrizione: 'Tonalità terra e verde, atmosfera rurale autentica. Per agriturismi e country house.',
    emoji: '🌿',
    swatches: ['#365314', '#fef9c3', '#1c1917'],
    config: {
      template: 'agriturismo',
      colorePrimario: '#365314',
      coloreSfondo: '#fef9c3',
      coloreTesto: '#1c1917',
      sottotitolo: 'Benvenuto, connettiti gratis',
      testoBottone: 'Inizia',
      labelTabCodice: 'Ho il codice',
      labelTabPrenotazione: 'Sono un ospite',
    },
  },
  {
    id: 'beach-resort',
    nome: 'Beach Resort',
    descrizione: 'Azzurri e turchese, vibe mare. Per resort balneari e villaggi turistici.',
    emoji: '🌊',
    swatches: ['#0891b2', '#ecfeff', '#155e75'],
    config: {
      template: 'beach-resort',
      colorePrimario: '#0891b2',
      coloreSfondo: '#ecfeff',
      coloreTesto: '#155e75',
      sottotitolo: 'Wi-Fi sulla spiaggia, ovunque',
      testoBottone: 'Connetti',
      labelTabCodice: 'Codice braccialetto',
      labelTabPrenotazione: 'Ospite del resort',
    },
  },
  {
    id: 'business',
    nome: 'Business',
    descrizione: 'Blu corporate professionale. Per business hotel e coworking.',
    emoji: '💼',
    swatches: ['#1e40af', '#f8fafc', '#0f172a'],
    config: {
      template: 'business',
      colorePrimario: '#1e40af',
      coloreSfondo: '#f8fafc',
      coloreTesto: '#0f172a',
      sottotitolo: 'Connessione Wi-Fi ad alta velocità',
      testoBottone: 'Connetti',
      labelTabCodice: 'Codice accesso',
      labelTabPrenotazione: 'Account ospite',
    },
  },
]

/** Applica template al config esistente preservando i campi custom dell'utente */
export function applyTemplate(
  current: SplashConfig,
  templateId: SplashTemplate['id'],
  preserveCustom: boolean = true,
): SplashConfig {
  const tpl = SPLASH_TEMPLATES.find(t => t.id === templateId)
  if (!tpl) return current

  if (!preserveCustom) {
    // Replace completo: solo i campi del template
    return { v: 1, ...tpl.config }
  }

  // Merge: i campi del template hanno priorità, ma rispetta campi non-template (logo, redirect, ecc.)
  const customFields: (keyof SplashConfig)[] = [
    'logoUrl', 'logoHeight', 'sfondoImmagineUrl', 'messaggioWelcome',
    'urlRedirectPostLogin', 'urlTermsConditions', 'urlPrivacyPolicy',
    'titolo', 'successTitolo', 'successMessaggio', 'mostraTabCodice',
    'mostraTabPrenotazione', 'testoFooter',
  ]
  const preserved: Partial<SplashConfig> = {}
  for (const k of customFields) {
    if (current[k] !== undefined && current[k] !== '') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(preserved as any)[k] = current[k]
    }
  }
  return { v: 1, ...tpl.config, ...preserved }
}
