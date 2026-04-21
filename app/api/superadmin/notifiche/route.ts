import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

// GET /api/superadmin/notifiche?onlyUnread=true&limit=50
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const { searchParams } = new URL(req.url)
  const onlyUnread = searchParams.get('onlyUnread') === 'true'
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))

  const where = {
    OR: [
      { userId: auth.user.id },
      { userId: null }, // broadcast
    ],
    ...(onlyUnread ? { letta: false } : {}),
  }

  const [notifiche, nonLette] = await Promise.all([
    prisma.notificaSuperadmin.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notificaSuperadmin.count({
      where: {
        OR: [{ userId: auth.user.id }, { userId: null }],
        letta: false,
      },
    }),
  ])

  return NextResponse.json({
    notifiche,
    nonLette,
    totale: notifiche.length,
  })
}

// PATCH /api/superadmin/notifiche — mark as read
const patchSchema = z.object({
  ids: z.array(z.string()).optional(),
  markAllRead: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin()
  if (isUnauthorized(auth)) return auth

  const body = await req.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  }
  const { ids, markAllRead } = parsed.data

  const where = markAllRead
    ? {
        OR: [{ userId: auth.user.id }, { userId: null }],
        letta: false,
      }
    : {
        id: { in: ids ?? [] },
        OR: [{ userId: auth.user.id }, { userId: null }],
      }

  const res = await prisma.notificaSuperadmin.updateMany({
    where,
    data: { letta: true, lettaAt: new Date() },
  })

  return NextResponse.json({ ok: true, aggiornate: res.count })
}
