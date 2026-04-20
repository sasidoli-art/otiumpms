import { z } from 'zod'
import nodemailer from 'nodemailer'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { revealSecret } from '@/lib/secrets'
import {
  renderEmail, EMAIL_TEMPLATES,
  type EmailTemplateId, type RenderContext, type TemplateOverride,
} from '@/lib/email-templates'

// POST /api/host/email-automatiche/test
// Invia un'email di test usando dati fittizi + override live all'indirizzo dell'host.
const testSchema = z.object({
  templateId: z.string(),
  oggettoCustom: z.string().nullable().optional(),
  messaggioCustom: z.string().nullable().optional(),
  lingua: z.enum(['it', 'en', 'de', 'fr']).optional(),
  toOverride: z.string().email().optional(),
})

export async function POST(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json()
  const parsed = testSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  const { templateId, oggettoCustom, messaggioCustom, lingua, toOverride } = parsed.data

  if (!EMAIL_TEMPLATES.find((t) => t.id === templateId)) {
    return NextResponse.json({ error: 'Template sconosciuto' }, { status: 404 })
  }

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: {
      id: true, nomeAzienda: true, telefono: true,
      smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, emailMittente: true,
      user: { select: { email: true } },
    },
  })
  if (!host) return NextResponse.json({ error: 'Host non trovato' }, { status: 404 })

  const destinatario = toOverride ?? host.user.email
  if (!destinatario) return NextResponse.json({ error: 'Email destinazione mancante' }, { status: 400 })

  const struttura = await prisma.struttura.findFirst({
    where: { hostId: auth.user.hostId, attiva: true },
    select: { id: true, nome: true, indirizzo: true, citta: true },
  })

  const ctx: RenderContext = {
    struttura,
    host,
    prenotazione: {
      id: 'test-demo',
      guestNome: 'Mario',
      guestCognome: 'Rossi',
      guestEmail: destinatario,
      guestTelefono: '+39 333 1234567',
      guestLingua: lingua ?? 'it',
      dataArrivo: new Date(Date.now() + 7 * 86400000),
      dataPartenza: new Date(Date.now() + 10 * 86400000),
      numOspiti: 2,
      prezzoTotale: 450,
      pin: '8421',
      checkInToken: 'test-token',
      unita: { nome: 'Suite Luna' },
    },
    appuntamentoSpa: {
      id: 'test-spa',
      guestNome: 'Mario',
      guestCognome: 'Rossi',
      guestEmail: destinatario,
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

  // Invio diretto (non accodato) per feedback immediato
  let transporter: nodemailer.Transporter
  let from: string
  if (host.smtpUser && host.smtpPass && host.smtpHost) {
    transporter = nodemailer.createTransport({
      host: host.smtpHost,
      port: host.smtpPort ?? 587,
      secure: (host.smtpPort ?? 587) === 465,
      auth: { user: host.smtpUser, pass: revealSecret(host.smtpPass) ?? '' },
    })
    from = host.emailMittente ?? host.smtpUser
  } else {
    const port = Number(process.env.SMTP_PORT) || 587
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    from = process.env.SMTP_FROM || process.env.SMTP_USER || ''
  }

  try {
    await transporter.sendMail({
      from,
      to: destinatario,
      subject: `[TEST] ${subject}`,
      html,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Errore invio', dettagli: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }

  await auditFromAuth(auth, {
    azione: 'email.test.inviata',
    entita: 'email',
    entitaId: null,
    dettagli: `Test email template ${templateId} inviato a ${destinatario}`,
  })

  return NextResponse.json({ ok: true, to: destinatario })
}
