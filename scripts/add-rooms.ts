import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Aggiunge N camere a una struttura esistente.
 *
 * Usage:
 *   npx tsx scripts/add-rooms.ts <strutturaId> <count> [prefix]
 *
 * Example:
 *   npx tsx scripts/add-rooms.ts abc123 5 "Camera"
 *   npx tsx scripts/add-rooms.ts abc123 3 "Suite"
 */
async function main() {
  const [, , strutturaId, countArg, prefix] = process.argv

  if (!strutturaId || !countArg) {
    console.error('Usage: npx tsx scripts/add-rooms.ts <strutturaId> <count> [prefix]')
    process.exit(1)
  }

  const count = parseInt(countArg, 10)
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    console.error(`Invalid count: ${countArg} (must be 1-200)`)
    process.exit(1)
  }

  const pfx = prefix?.trim() || 'Camera'

  const struttura = await prisma.struttura.findUnique({
    where: { id: strutturaId },
    include: { host: { select: { nomeAzienda: true } }, unita: { select: { id: true } } },
  })

  if (!struttura) {
    console.error(`Struttura "${strutturaId}" non trovata`)
    process.exit(1)
  }

  console.log(`Struttura: ${struttura.nome} (host: ${struttura.host.nomeAzienda})`)
  console.log(`Unità esistenti: ${struttura.unita.length}`)

  const startIndex = struttura.unita.length
  const nuoveCamere = Array.from({ length: count }, (_, i) => ({
    strutturaId,
    nome: `${pfx} ${startIndex + i + 1}`,
    capacita: 2,
    lettiExtra: 0,
    prezzoBase: 80,
    attiva: true,
  }))

  const result = await prisma.unitaPrenotabile.createMany({ data: nuoveCamere })

  console.log(`✓ Create ${result.count} unità:`)
  nuoveCamere.forEach(u => console.log(`  - ${u.nome}`))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
