import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const res = await p.host.updateMany({
    data: {
      conciergeAttivo: true,
      conciergeGdprAcceptedAt: new Date(),
    },
  })
  console.log(`✅ Attivato concierge su ${res.count} host`)

  const platform = await p.platformSettings.findFirst()
  if (!platform) {
    console.log('⚠ PlatformSettings VUOTO — vai su /superadmin/impostazioni/ai e configura provider+chiave')
  } else {
    console.log(`Platform AI: provider=${platform.aiProvider} model=${platform.aiModel} key=${platform.aiApiKey ? 'SET' : 'MISSING'}`)
  }
}

main().finally(() => p.$disconnect())
