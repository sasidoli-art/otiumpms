import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { PianoTipo, StatoAbbonamento, StatoEvento, StatoPagamento, StatoFattura } from '@prisma/client'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatData(date: Date | string | null | undefined, pattern = 'dd/MM/yyyy') {
  if (!date) return '—'
  return format(new Date(date), pattern, { locale: it })
}

export function formatDataOra(date: Date | string | null | undefined) {
  return formatData(date, 'dd/MM/yyyy HH:mm')
}

export function formatDataRelativa(date: Date | string | null | undefined) {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: it })
}

export function formatValuta(importo: number) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(importo)
}

export function pianoLabel(piano: PianoTipo): string {
  const labels: Record<PianoTipo, string> = {
    LIGHT: 'Light',
    EVENTO_SINGOLO: 'Evento Singolo',
    VISIBILITA_MENSILE: 'Visibilità Mensile',
    PARTNER_PREMIUM: 'Partner Premium',
  }
  return labels[piano]
}

export function pianoPrezzo(piano: PianoTipo): number {
  const prezzi: Record<PianoTipo, number> = {
    LIGHT: 29,
    EVENTO_SINGOLO: 49,
    VISIBILITA_MENSILE: 149,
    PARTNER_PREMIUM: 349,
  }
  return prezzi[piano]
}

export function statoAbbonamentoLabel(stato: StatoAbbonamento): string {
  const labels: Record<StatoAbbonamento, string> = {
    ATTIVO: 'Attivo',
    SOSPESO: 'Sospeso',
    SCADUTO: 'Scaduto',
    IN_PROVA: 'In prova',
  }
  return labels[stato]
}

export function statoAbbonamentoColor(stato: StatoAbbonamento): string {
  const colors: Record<StatoAbbonamento, string> = {
    ATTIVO: 'bg-green-100 text-green-800',
    SOSPESO: 'bg-yellow-100 text-yellow-800',
    SCADUTO: 'bg-red-100 text-red-800',
    IN_PROVA: 'bg-blue-100 text-blue-800',
  }
  return colors[stato]
}

export function statoEventoLabel(stato: StatoEvento): string {
  const labels: Record<StatoEvento, string> = {
    BOZZA: 'Bozza',
    IN_ATTESA: 'In attesa',
    APPROVATO: 'Approvato',
    RIFIUTATO: 'Rifiutato',
    SCADUTO: 'Scaduto',
  }
  return labels[stato]
}

export function statoEventoColor(stato: StatoEvento): string {
  const colors: Record<StatoEvento, string> = {
    BOZZA: 'bg-gray-100 text-gray-700',
    IN_ATTESA: 'bg-yellow-100 text-yellow-800',
    APPROVATO: 'bg-green-100 text-green-800',
    RIFIUTATO: 'bg-red-100 text-red-800',
    SCADUTO: 'bg-gray-100 text-gray-500',
  }
  return colors[stato]
}

export function statoPagamentoLabel(stato: StatoPagamento): string {
  const labels: Record<StatoPagamento, string> = {
    IN_ATTESA: 'In attesa',
    PAGATO: 'Pagato',
    IN_RITARDO: 'In ritardo',
    ANNULLATO: 'Annullato',
  }
  return labels[stato]
}

export function statoPagamentoColor(stato: StatoPagamento): string {
  const colors: Record<StatoPagamento, string> = {
    IN_ATTESA: 'bg-yellow-100 text-yellow-800',
    PAGATO: 'bg-green-100 text-green-800',
    IN_RITARDO: 'bg-red-100 text-red-800',
    ANNULLATO: 'bg-gray-100 text-gray-500',
  }
  return colors[stato]
}

export function statoFatturaLabel(stato: StatoFattura): string {
  const labels: Record<StatoFattura, string> = {
    BOZZA: 'Bozza',
    INVIATA: 'Inviata',
    PAGATA: 'Pagata',
    SCADUTA: 'Scaduta',
    ANNULLATA: 'Annullata',
    STORNATA: 'Stornata',
  }
  return labels[stato]
}

export function statoFatturaColor(stato: StatoFattura): string {
  const colors: Record<StatoFattura, string> = {
    BOZZA: 'bg-gray-100 text-gray-700',
    INVIATA: 'bg-blue-100 text-blue-800',
    PAGATA: 'bg-green-100 text-green-800',
    SCADUTA: 'bg-red-100 text-red-800',
    ANNULLATA: 'bg-gray-100 text-gray-500',
    STORNATA: 'bg-orange-100 text-orange-800',
  }
  return colors[stato]
}

export function categoriaEventoLabel(categoria: string): string {
  const labels: Record<string, string> = {
    MUSICA: '🎵 Musica',
    ARTE: '🎨 Arte & Mostre',
    TEATRO: '🎭 Teatro & Spettacolo',
    FOOD: '🍷 Food & Enogastronomia',
    SPORT: '⚽ Sport & Benessere',
    FESTIVAL: '🎪 Festival',
    FIERA: '🏪 Fiere & Mercati',
    CONFERENZA: '🎤 Conferenze & Workshop',
    CINEMA: '🎬 Cinema',
    NATURA: '🌿 Natura & Outdoor',
    FAMIGLIA: '👨‍👩‍👧 Famiglia',
    ALTRO: '📌 Altro',
  }
  return labels[categoria] || categoria
}

export function generaNumeroFattura(anno: number, progressivo: number): string {
  return `${anno}/${String(progressivo).padStart(3, '0')}`
}
