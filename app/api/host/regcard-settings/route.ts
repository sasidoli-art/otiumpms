import { NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { getBrandingConfig, setBrandingConfig } from '@/lib/host-config'
import { z } from 'zod'

const campoExtraSchema = z.object({
  label: z.string().min(1).max(200),
  tipo: z.enum(['testo', 'checkbox', 'select']),
  obbligatorio: z.boolean().default(false),
  opzioni: z.string().optional(),
})

const settingsSchema = z.object({
  regCardTerminiHtml: z.string().nullable().optional(),
  regCardPrivacyHtml: z.string().nullable().optional(),
  regCardSpaTerminiHtml: z.string().nullable().optional(),
  regCardCampiExtra: z.array(campoExtraSchema).default([]),
})

export async function PUT(req: Request) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }

  const d = parsed.data

  await setBrandingConfig(auth.user.hostId, {
    regCardTerminiHtml: d.regCardTerminiHtml ?? null,
    regCardPrivacyHtml: d.regCardPrivacyHtml ?? null,
    regCardSpaTerminiHtml: d.regCardSpaTerminiHtml ?? null,
    regCardCampiExtra: d.regCardCampiExtra,
  })

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const cfg = await getBrandingConfig(auth.user.hostId)
  return NextResponse.json({
    regCardTerminiHtml: cfg?.regCardTerminiHtml ?? null,
    regCardPrivacyHtml: cfg?.regCardPrivacyHtml ?? null,
    regCardSpaTerminiHtml: cfg?.regCardSpaTerminiHtml ?? null,
    regCardCampiExtra: cfg?.regCardCampiExtra ?? null,
  })
}
