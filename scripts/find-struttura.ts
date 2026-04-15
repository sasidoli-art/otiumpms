import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const query = process.argv[2]
  if (!query) {
    console.error('Usage: npx tsx scripts/find-struttura.ts <search>')
    process.exit(1)
  }

  const strutture = await prisma.struttura.findMany({
    where: {
      OR: [
        { nome: { contains: query, mode: 'insensitive' } },
        { host: { nomeAzienda: { contains: query, mode: 'insensitive' } } },
      ],
    },
    include: {
      host: { select: { nomeAzienda: true } },
      _count: { select: { unita: true } },
    },
  })

  for (const s of strutture) {
    console.log(`${s.id}  ·  ${s.nome}  ·  ${s.host.nomeAzienda}  ·  ${s._count.unita} unità`)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
