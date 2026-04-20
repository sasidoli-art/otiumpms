import { z } from 'zod'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import {
  renderEmail, EMAIL_TEMPLATES,
  type EmailTemplateId, type RenderContext, type TemplateOverride,
} from '@/lib/email-templates'

// POST /api/host/email-automatiche/preview
// Ritorna subject + html di un template usando dati fittizi + (opzionalmente) override live.
// Serve al modal di personalizzazione per mostrare la preview mentre si digita.
const previewSchema = z.object({
  templateId: z.string(),
  oggettoCustom: z.string().nullable().optional(),
  messaggioCustom: z.string().nullable().optional(),
  lingua: z.enum(['it', 'en', 'de', 'fr']).optional(),
})

export async function POST(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json()
  const parsed = previewSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  const { templateId, oggettoCustom, messaggioCustom, lingua } = parsed.data

  if (!EMAIL_TEMPLATES.find((t) => t.id === templateId)) {
    return NextResponse.json({ error: 'Template sconosciuto' }, { status: 404 })
  }

  // Dati reali dell'host per branding
  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: { id: true, nomeAzienda: true, telefono: true },
  })
  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })

  const struttura = await prisma.struttura.findFirst({
    where: { hostId: auth.user.hostId, attiva: true },
    select: { id: true, nome: true, indirizzo: true, citta: true },
  })

  // Dati fittizi per il render
  const ctx: RenderContext = {
    struttura,
    host,
    prenotazione: {
      id: 'preview-demo',
      guestNome: 'Mario',
      guestCognome: 'Rossi',
      guestEmail: 'mario.rossi@example.com',
      guestTelefono: '+39 333 1234567',
      guestLingua: lingua ?? 'it',
      dataArrivo: new Date(Date.now() + 7 * 86400000),
      dataPartenza: new Date(Date.now() + 10 * 86400000),
      numOspiti: 2,
      prezzoTotale: 450,
      pin: '8421',
      checkInToken: 'preview-token',
      unita: { nome: 'Suite Luna' },
    },
    appuntamentoSpa: {
      id: 'preview-spa',
      guestNome: 'Mario',
      guestCognome: 'Rossi',
      guestEmail: 'mario.rossi@example.com',
      dataOra: new Date(Date.now() + 2 * 86400000),
      durata: 60,
      prezzoTotale: 90,
      trattamento: { nome: 'Massaggio rilassante 60min' },
      percorso: null,
    },
    lingua: lingua ?? 'it',
  }

  const override: TemplateOverride = {
    oggettoCustom: oggettoCustom ?? null,
    messaggioCustom: messaggioCustom ?? null,
  }

  const { subject, html } = await renderEmail(templateId as EmailTemplateId, ctx, override)
  return NextResponse.json({ subject, html })
}
