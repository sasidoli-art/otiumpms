import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { parseBody } from '@/lib/validations'

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const piattoUpsertSchema = z.object({
  id: z.string().optional(), // existing piatto id (omit for new)
  categoria: z.enum([
    'PRIMO', 'SECONDO', 'CONTORNO', 'DOLCE', 'BEVANDA',
    'ANTIPASTO', 'FRUTTA', 'COLAZIONE_DOLCE', 'COLAZIONE_SALATA', 'COLAZIONE_BEVANDA',
  ]),
  nome: z.string().min(1).max(200).trim(),
  descrizione: z.string().max(500).trim().optional().nullable(),
  allergeni: z.array(z.string().max(50)).optional().default([]),
  prezzo: z.number().min(0).optional().nullable(),
  ordine: z.number().int().min(0).default(0),
  disponibile: z.boolean().optional().default(true),
})

const patchMenuSchema = z.object({
  nome: z.string().max(200).trim().optional().nullable(),
  note: z.string().max(1000).trim().optional().nullable(),
  attivo: z.boolean().optional(),
  piatti: z.array(piattoUpsertSchema).optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

/** Verify menu exists and belongs to host */
async function findMenuForHost(menuId: string, hostId: string) {
  return prisma.menuGiornaliero.findFirst({
    where: {
      id: menuId,
      struttura: { hostId },
    },
    include: { piatti: { orderBy: { ordine: 'asc' } } },
  })
}

// ─── GET /api/host/ristorazione/menu/[id] ────────────────────────────────────

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { id } = await ctx.params
  const menu = await findMenuForHost(id, auth.user.hostId)
  if (!menu) {
    return NextResponse.json({ error: 'Menu non trovato' }, { status: 404 })
  }

  return NextResponse.json(menu)
}

// ─── PATCH /api/host/ristorazione/menu/[id] ──────────────────────────────────

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { id } = await ctx.params
  const existing = await findMenuForHost(id, auth.user.hostId)
  if (!existing) {
    return NextResponse.json({ error: 'Menu non trovato' }, { status: 404 })
  }

  const parsed = parseBody(patchMenuSchema, await req.json())
  if (parsed.error) return parsed.error
  const { nome, note, attivo, piatti } = parsed.data

  const updated = await prisma.$transaction(async (tx) => {
    // Update menu fields
    await tx.menuGiornaliero.update({
      where: { id },
      data: {
        ...(nome !== undefined && { nome }),
        ...(note !== undefined && { note }),
        ...(attivo !== undefined && { attivo }),
      },
    })

    // Upsert piatti if provided
    if (piatti) {
      const incomingIds = piatti.filter((p) => p.id).map((p) => p.id!)
      const existingIds = existing.piatti.map((p) => p.id)

      // Delete piatti that are no longer in the list
      const toDelete = existingIds.filter((eid) => !incomingIds.includes(eid))
      if (toDelete.length > 0) {
        await tx.piattoMenu.deleteMany({ where: { id: { in: toDelete }, menuId: id } })
      }

      // Update existing + create new
      for (const p of piatti) {
        if (p.id && existingIds.includes(p.id)) {
          await tx.piattoMenu.update({
            where: { id: p.id },
            data: {
              categoria: p.categoria,
              nome: p.nome,
              descrizione: p.descrizione ?? null,
              allergeni: p.allergeni ?? [],
              prezzo: p.prezzo ?? null,
              ordine: p.ordine,
              disponibile: p.disponibile ?? true,
            },
          })
        } else {
          await tx.piattoMenu.create({
            data: {
              menuId: id,
              categoria: p.categoria,
              nome: p.nome,
              descrizione: p.descrizione ?? null,
              allergeni: p.allergeni ?? [],
              prezzo: p.prezzo ?? null,
              ordine: p.ordine,
              disponibile: p.disponibile ?? true,
            },
          })
        }
      }
    }

    return tx.menuGiornaliero.findUnique({
      where: { id },
      include: { piatti: { orderBy: { ordine: 'asc' } } },
    })
  })

  return NextResponse.json(updated)
}

// ─── DELETE /api/host/ristorazione/menu/[id] ─────────────────────────────────

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const { id } = await ctx.params
  const existing = await findMenuForHost(id, auth.user.hostId)
  if (!existing) {
    return NextResponse.json({ error: 'Menu non trovato' }, { status: 404 })
  }

  // Cascade deletes piatti automatically (onDelete: Cascade in schema)
  await prisma.menuGiornaliero.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
