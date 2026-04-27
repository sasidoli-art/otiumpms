'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Triggera router.refresh() ogni 30s per ricaricare la /status (server
 * component) senza full reload. Niente UI propria — solo side-effect.
 */
export default function StatusRefresh() {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(id)
  }, [router])

  return null
}
