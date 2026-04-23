import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import {
  inviaMessaggioWhatsApp,
  WhatsAppNotConfiguredError,
  WhatsAppSendError,
} from '@/lib/whatsapp-send'

/**
 * POST /api/host/concierge/test-whatsapp
 *
 * Invia un messaggio di test al numero specificato usando le credenziali
 * WhatsApp dell'host già salvate. Se l'host non ha ancora configurato
 * `whatsappNumeroId` + `whatsappAccessToken`, ritorna 400 con l'elenco dei
 * campi mancanti.
 *
 * Body: { destinatario: string }  // E.164 es. "+393331234567"
 */
const schema = z.object({
  destinatario: z.string().regex(/^\+\d{8,15}$/, 'Formato richiesto: +393331234567'),
})

export async function POST(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Destinatario non valido', details: parsed.error.flatten(),
    }, { status: 422 })
  }

  const { destinatario } = parsed.data
  const testo = `[TEST] Otium — la configurazione WhatsApp del tuo concierge funziona. ${new Date().toLocaleString('it-IT')}`

  try {
    const res = await inviaMessaggioWhatsApp(auth.user.hostId, destinatario, testo)
    await auditFromAuth(auth, {
      azione: 'concierge.test_whatsapp.ok',
      entita: 'HostConciergeConfig',
      dettagli: `Test WA inviato a ${destinatario}`,
    })
    return NextResponse.json({ ok: true, messageId: res.messageId })
  } catch (err) {
    if (err instanceof WhatsAppNotConfiguredError) {
      return NextResponse.json({
        ok: false,
        error: 'WhatsApp non configurato',
        dettagli: err.message,
      }, { status: 400 })
    }
    if (err instanceof WhatsAppSendError) {
      await auditFromAuth(auth, {
        azione: 'concierge.test_whatsapp.fallito',
        entita: 'HostConciergeConfig',
        dettagli: `Test WA fallito a ${destinatario}: ${err.message}`,
      })
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 })
    }
    const errMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 })
  }
}
