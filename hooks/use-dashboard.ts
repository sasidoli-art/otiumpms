'use client'

import useSWR from 'swr'
import { fetcher } from '@/lib/swr-fetcher'

interface ArrivoCard {
  id: string
  guestNome: string
  guestCognome: string
  unitaNome: string | null
  numOspiti: number
  oraArrivo: string | null
  statoCheckIn: string
  pin: string | null
}

interface PartenzaCard {
  id: string
  guestNome: string
  guestCognome: string
  unitaNome: string | null
  regCardFirmata: boolean
}

interface OccupazioneGiorno {
  data: string
  giorno: string
  occupate: number
  totali: number
}

interface SpaProssimo {
  guestNome: string
  trattamentoNome: string
  oraInizio: string
  terapistaNome: string | null
}

interface AttivitaItem {
  tipo: string
  testo: string
  tempo: string
  linkUrl: string | null
}

export interface DashboardData {
  oggi: {
    data: string
    giorno: string
    arrivi: {
      totale: number
      checkinCompletati: number
      checkinOnline: number
      checkinMancanti: number
      lista: ArrivoCard[]
    }
    partenze: {
      totale: number
      lista: PartenzaCard[]
    }
    inHouse: number
  }
  azioni: {
    prenotazioniDaConfermare: number
    taskHKAperti: number
    manutenzioneUrgente: number
    messaggiNonLetti: number
    traceScadutiOggi: number
    checkinDaVerificare: number
    fattureDaEmettere: number
  }
  occupazione: {
    unitaTotali: number
    unitaOccupate: number
    unitaLibere: number
    percentuale: number
    settimana: OccupazioneGiorno[]
  }
  spaOggi: {
    appuntamenti: number
    completati: number
    prossimo: SpaProssimo | null
  } | null
  attivitaRecente: AttivitaItem[]
  kpi: {
    ricaviMese: number
    ricaviMeseScorso: number
    deltaRicaviPercent: number | null
    prenotazioniMese: number
    prenotazioniMeseScorso: number
    deltaPrenotazioniPercent: number | null
    adrMese: number
    adrMeseScorso: number
    deltaAdrPercent: number | null
  }
}

const POLL_INTERVAL = 30_000

/**
 * Dashboard host: SWR-based con polling 30s, revalidazione su focus, retry
 * automatico, cache condivisa (più componenti che leggono lo stesso URL si
 * aggiornano insieme).
 */
export function useDashboard(strutturaId?: string | null): {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  refresh: () => void
} {
  const params = strutturaId ? `?strutturaId=${strutturaId}` : ''
  const url = `/api/host/dashboard${params}`

  const { data, error, isLoading, mutate } = useSWR<DashboardData>(url, fetcher, {
    refreshInterval: POLL_INTERVAL,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: true, // evita flash di empty state quando cambia strutturaId
  })

  return {
    data: data ?? null,
    isLoading,
    error: error ? (error as Error).message ?? 'Errore di connessione' : null,
    refresh: () => { mutate() },
  }
}
