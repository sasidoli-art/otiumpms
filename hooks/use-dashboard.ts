'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

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
}

// ─── Hook ───────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 30_000 // 30 seconds

/**
 * Fetches GET /api/host/dashboard?strutturaId=xxx every 30 seconds.
 *
 * - Immediate fetch on mount and when strutturaId changes
 * - Pauses when tab is hidden, resumes + immediate fetch when visible
 * - refresh() forces an immediate re-fetch (e.g. after confirming a booking)
 */
export function useDashboard(strutturaId?: string | null): {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  refresh: () => void
} {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const mountedRef = useRef(true)

  const fetchDashboard = useCallback(async () => {
    try {
      const params = strutturaId ? `?strutturaId=${strutturaId}` : ''
      const res = await fetch(`/api/host/dashboard${params}`)
      if (!res.ok) {
        if (mountedRef.current) setError(`Errore ${res.status}`)
        return
      }
      const json = await res.json()
      if (mountedRef.current) {
        setData(json)
        setError(null)
        setIsLoading(false)
      }
    } catch {
      if (mountedRef.current) setError('Errore di connessione')
    }
  }, [strutturaId])

  const startPolling = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(fetchDashboard, POLL_INTERVAL)
  }, [fetchDashboard])

  const stopPolling = useCallback(() => {
    clearInterval(intervalRef.current)
  }, [])

  // Fetch on mount + when strutturaId changes
  useEffect(() => {
    mountedRef.current = true
    setIsLoading(true)
    fetchDashboard()
    startPolling()

    return () => {
      mountedRef.current = false
      stopPolling()
    }
  }, [fetchDashboard, startPolling, stopPolling])

  // Pause/resume on visibility change
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        stopPolling()
      } else {
        fetchDashboard()
        startPolling()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [fetchDashboard, startPolling, stopPolling])

  // Manual refresh
  const refresh = useCallback(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return { data, isLoading, error, refresh }
}
