import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { getPlatformSettings } from '@/lib/platform-settings'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  to: z.string().email(),
})

// POST /api/superadmin/platform-settings/test-smtp
// Invia email di test usando SMTP platform configurato
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Email non valida' }, { status: 422 })
  const { to } = parsed.data

  const settings = await getPlatformSettings()
  if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
    return NextResponse.json(
      { error: 'SMTP non completamente configurato (host/user/pass obbligatori)' },
      { status: 400 },
    )
  }

  const port = settings.smtpPort ?? 587
  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port,
      secure: port === 465,
      auth: { user: settings.smtpUser, pass: settings.smtpPass },
    })

    await transporter.sendMail({
      from: settings.smtpFrom ?? settings.smtpUser,
      to,
      subject: `[TEST] Otium PMS SMTP configurato correttamente`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 40px auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
          <h2 style="color: #111827; margin: 0 0 16px;">Test SMTP riuscito</h2>
          <p style="color: #374151; line-height: 1.5;">
            La configurazione SMTP della piattaforma Otium funziona correttamente.
          </p>
          <ul style="color: #6b7280; font-size: 13px;">
            <li>Host: ${settings.smtpHost}:${port}</li>
            <li>User: ${settings.smtpUser}</li>
            <li>From: ${settings.smtpFrom ?? settings.smtpUser}</li>
            <li>Inviato: ${new Date().toLocaleString('it-IT')}</li>
          </ul>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
            Messaggio automatico Otium PMS · test configurazione piattaforma
          </p>
        </div>
      `,
    })

    await audit({
      userId: auth.user.id,
      userEmail: auth.user.email,
      azione: 'superadmin.smtp_test.ok',
      entita: 'PlatformSettings',
      entitaId: 'singleton',
      dettagli: `Test SMTP inviato a ${to}`,
    })

    return NextResponse.json({ ok: true, to, host: settings.smtpHost })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    await audit({
      userId: auth.user.id,
      userEmail: auth.user.email,
      azione: 'superadmin.smtp_test.fallito',
      entita: 'PlatformSettings',
      entitaId: 'singleton',
      dettagli: `Test SMTP fallito: ${errMsg.slice(0, 300)}`,
    })
    return NextResponse.json({ error: errMsg }, { status: 502 })
  }
}
