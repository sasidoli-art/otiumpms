import { NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { prisma } from '@/lib/db'
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

  await prisma.host.update({
    where: { id: auth.user.hostId },
    data: {
      regCardTerminiHtml: d.regCardTerminiHtml,
      regCardPrivacyHtml: d.regCardPrivacyHtml,
      regCardSpaTerminiHtml: d.regCardSpaTerminiHtml,
      regCardCampiExtra: d.regCardCampiExtra,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const host = await prisma.host.findUnique({
    where: { id: auth.user.hostId },
    select: {
      regCardTerminiHtml: true,
      regCardPrivacyHtml: true,
      regCardSpaTerminiHtml: true,
      regCardCampiExtra: true,
    },
  })

  return NextResponse.json(host)
}
