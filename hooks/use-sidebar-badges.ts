'use client'

import useSWR from 'swr'
import { fetcher } from '@/lib/swr-fetcher'

/**
 * Badge counts returned by GET /api/host/sidebar-badges.
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

const POLL_INTERVAL = 60_000

/**
 * SWR-based: polling 60s, revalida su focus, dedup tra componenti che usano
 * questo hook (la sidebar viene montata una sola volta, ma se badge servisse
 * altrove la cache viene condivisa).
 */
export function useSidebarBadges(): { data: BadgeCounts; isLoading: boolean } {
  const { data, isLoading } = useSWR<BadgeCounts>('/api/host/sidebar-badges', fetcher, {
    refreshInterval: POLL_INTERVAL,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: true,
    onError: () => {
      // Silently ignore — badges are informational, not critical
    },
  })

  return {
    data: data ?? EMPTY,
    isLoading,
  }
}
