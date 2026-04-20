/**
 * Soft delete helpers per i modelli con campo `deletedAt`.
 *
 * Usage:
 *   const where = notDeleted({ hostId })
 *   → { hostId, deletedAt: null }
 *
 *   await prisma.fattura.update({ where: { id }, data: softDeletePatch() })
 *
 * IMPORTANTE: Fattura NON va mai cancellata fisicamente (vincolo fiscale
 * art. 2220 CC: conservazione 10 anni). Soft delete → stato visivo "annullato"
 * ma il record fiscale resta disponibile per audit.
 */

export function notDeleted<T extends Record<string, unknown>>(where: T = {} as T): T & { deletedAt: null } {
  return { ...where, deletedAt: null };
}

export function onlyDeleted<T extends Record<string, unknown>>(where: T = {} as T): T & { deletedAt: { not: null } } {
  return { ...where, deletedAt: { not: null } };
}

export function softDeletePatch(): { deletedAt: Date } {
  return { deletedAt: new Date() };
}

export function restorePatch(): { deletedAt: null } {
  return { deletedAt: null };
}
