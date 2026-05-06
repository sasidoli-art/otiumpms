import { prisma } from '@/lib/db'

/**
 * Costante filter: `{ deletedAt: null }` per query che escludono record soft-deleted.
 * Uso: `prisma.model.findMany({ where: { hostId, ...notDeleted } })`
 */
export const notDeleted = { deletedAt: null } as const

/**
 * Soft delete: marca un record come deleted senza rimuoverlo dal DB.
 * Parametri:
 *   model: il Prisma model (prisma.host, prisma.prenotazione, ecc.)
 *   id: ID del record da eliminare
 */
export async function softDelete(
  model: any,
  id: string,
): Promise<any> {
  return model.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}

/**
 * Restore: ripristina un record soft-deleted.
 * Parametri:
 *   model: il Prisma model
 *   id: ID del record da ripristinare
 */
export async function restore(model: any, id: string): Promise<any> {
  return model.update({
    where: { id },
    data: { deletedAt: null },
  })
}

/**
 * Helper: combina filtri hostId + notDeleted + custom where.
 * Uso: `prisma.prenotazione.findMany({ where: withHost(hostId, { stato: 'CONFERMATA' }) })`
 */
export function withHost(hostId: string, where?: Record<string, any>) {
  return { ...where, hostId, ...notDeleted }
}

/**
 * Helper: calcola offset per paginazione server-side.
 * Uso: `prisma.model.findMany({ ...paginate(page, pageSize), where: {...} })`
 */
export function paginate(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  }
}

/**
 * Helper: combina withHost + paginate.
 * Uso: `prisma.prenotazione.findMany({ where: withHost(...), ...paginate(...) })`
 */
export function withHostAndPaginate(
  hostId: string,
  page: number,
  pageSize: number,
  where?: Record<string, any>,
) {
  return {
    where: withHost(hostId, where),
    ...paginate(page, pageSize),
  }
}
