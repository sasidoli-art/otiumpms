import { NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

/**
 * PATCH /api/host/onboarding/save
 *
 * Saves intermediate onboarding progress (step + partial data).
 * Called on every step change so the host can resume later.
 */
export async function PATCH(req: Request) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const body = await req.json()
  const { step, data } = body as { step?: number; data?: unknown }

  const updateData: Prisma.HostUpdateInput = {}
  if (typeof step === 'number') updateData.onboardingStep = step
  if (data) updateData.onboardingData = data as Prisma.InputJsonValue

  await prisma.host.update({
    where: { id: auth.user.hostId },
    data: updateData,
  })

  return NextResponse.json({ ok: true })
}
