'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Badge counts returned by GET /api/host/sidebar-badges.
 * Keys match the API response shape.
 */
export interface BadgeCounts {
  prenotazioniNuove: number
  arriviOggi: number
  partenzeOggi: number
  taskHKAperti: number
  manutenzioneAperta: number
  messaggiNonLetti: number
  notificheNonLette: number
  spaAppuntamentiOggi: number
  ticketAperti: number
}

const EMPTY: BadgeCounts = {
  prenotazioniNuove: 0,
  arriviOggi: 0,
  partenzeOggi: 0,
  taskHKAperti: 0,
  manutenzioneAperta: 0,
  messaggiNonLetti: 0,
  notificheNonLette: 0,
  spaAppuntamentiOggi: 0,
  ticketAperti: 0,
}

const POLL_INTERVAL = 60_000 // 60 seconds

/**
 * Polls GET /api/host/sidebar-badges every 60 seconds.
 *
 * - Immediate fetch on mount
 * - Pauses polling when the browser tab is hidden (Page Visibility API)
 * - Resumes + immediate fetch when the tab becomes visible again
 * - Returns { data, isLoading }
 */
export function useSidebarBadges(): { data: BadgeCounts; isLoading: boolean } {
  const [data, setData] = useState<BadgeCounts>(EMPTY)
  const [isLoading, setIsLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const mountedRef = useRef(true)

  const fetchBadges = useCallback(async () => {
    try {
      const res = await fetch('/api/host/sidebar-badges')
      if (!res.ok) return
      const json = await res.json()
      if (mountedRef.current) {
        setData(json)
        setIsLoading(false)
      }
    } catch {
      // Silently ignore — badges are informational, not critical
    }
  }, [])

  const startPolling = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(fetchBadges, POLL_INTERVAL)
  }, [fetchBadges])

  const stopPolling = useCallback(() => {
    clearInterval(intervalRef.current)
  }, [])

  // Initial fetch + start polling
  useEffect(() => {
    mountedRef.current = true
    fetchBadges()
    startPolling()

    return () => {
      mountedRef.current = false
      stopPolling()
    }
  }, [fetchBadges, startPolling, stopPolling])

  // Pause/resume on tab visibility change
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        stopPolling()
      } else {
        // Tab became visible — fetch immediately and restart polling
        fetchBadges()
        startPolling()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [fetchBadges, startPolling, stopPolling])

  return { data, isLoading }
}
