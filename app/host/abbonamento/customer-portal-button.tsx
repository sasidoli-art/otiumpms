'use client'

import { useState } from 'react'
import { CreditCard, Loader2, ExternalLink } from 'lucide-react'
import { toast } from '@/lib/toast'

/**
 * Bottone "Gestisci fatturazione su Stripe" — chiama POST
 * /api/host/abbonamento/portal e fa redirect alla session URL ricevuta.
 *
 * Mostra disabilitato/grigio se l'host non ha ancora uno stripeCustomerId
 * (gli si dice di contattare il supporto). Il backend ritorna 412 in quel
 * caso, e mostriamo il messaggio nel toast.
 */
export default function CustomerPortalButton({ stripeCustomerId }: { stripeCustomerId: string | null }) {
  const [loading, setLoading] = useState(false)

  async function openPortal() {
    setLoading(true)
    try {
      const res = await fetch('/api/host/abbonamento/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Impossibile aprire il portale fatturazione')
        return
      }
      window.location.href = data.url
    } catch {
      toast.error('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  if (!stripeCustomerId) {
    return (
      <button
        disabled
        title="Account Stripe non ancora collegato. Contatta il supporto."
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-400 text-sm cursor-not-allowed"
      >
        <CreditCard className="w-4 h-4" /> Gestisci fatturazione
      </button>
    )
  }

  return (
    <button
      onClick={openPortal}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700 text-sm font-medium transition-colors disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
      Gestisci fatturazione su Stripe
      <ExternalLink className="w-3.5 h-3.5 opacity-60" />
    </button>
  )
}
