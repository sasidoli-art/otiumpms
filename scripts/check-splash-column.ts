import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const rows = await p.$queryRaw<{ column_name: string; data_type: string }[]>`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name='hosts' AND column_name ILIKE '%splash%'
  `
  console.log('Splash columns:', rows)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())
