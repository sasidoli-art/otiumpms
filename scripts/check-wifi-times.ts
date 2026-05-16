import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const r: { column_name: string; data_type: string }[] = await p.$queryRawUnsafe(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='hosts' AND column_name IN ('wifiCheckInTime','wifiCheckOutTime')`
  )
  console.log('columns:', r)
}
main().catch(console.error).finally(() => p.$disconnect())
