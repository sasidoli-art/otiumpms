import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  const hosts = await p.host.findMany({
    include: {
      user: { select: { email: true, nome: true, cognome: true, attivo: true } },
      strutture: {
        include: {
          unita: { select: { id: true, nome: true, capacita: true } },
        },
      },
      _count: { select: { strutture: true, prenotazioni: true, fatture: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 5,
  })

  if (hosts.length === 0) {
    console.log('⚠ Nessun host nel DB — crea il primo da /superadmin/host')
    return
  }

  console.log(`=== ${hosts.length} HOST ATTIVI ===\n`)

  for (const host of hosts) {
    console.log('─'.repeat(60))
    console.log(`📌 ${host.nomeAzienda}`)
    console.log(`   ID: ${host.id}`)
    console.log(`   Referente: ${host.user.nome} ${host.user.cognome} <${host.user.email}>`)
    console.log(`   Piano: ${host.piano} | Stato: ${host.statoAbbonamento}`)
    console.log(`   Onboarding completato: ${host.onboardingCompletato}`)
    console.log(`   Concierge: ${host.conciergeAttivo ? 'ON' : 'OFF'}`)
    const moduliAttivi = host.moduliAttivi as Record<string, unknown> | null
    const moduliKeys = moduliAttivi
      ? Object.entries(moduliAttivi)
          .filter(([, v]) => v === true || (typeof v === 'object' && v && 'attivo' in v && (v as { attivo: boolean }).attivo))
          .map(([k]) => k)
      : []
    console.log(`   Moduli attivi: ${moduliKeys.length ? moduliKeys.join(', ') : '(nessuno)'}`)
    console.log(`   Strutture: ${host._count.strutture}`)
    console.log(`   Prenotazioni: ${host._count.prenotazioni}`)
    console.log(`   Fatture: ${host._count.fatture}`)

    if (host.strutture.length > 0) {
      console.log(`   \n   Strutture dettaglio:`)
      for (const s of host.strutture) {
        console.log(`   - ${s.nome} (${s.tipo}) · ${s.unita.length} unità`)
        for (const u of s.unita.slice(0, 5)) {
          console.log(`       · ${u.nome} (${u.capacita} posti)`)
        }
        if (s.unita.length > 5) {
          console.log(`       · ... e altre ${s.unita.length - 5}`)
        }
      }
    }

    console.log(`   \n   🔗 URL di test:`)
    console.log(`      Dettaglio:    https://otium-pms.vercel.app/superadmin/host/${host.id}`)
    console.log(`      Moduli host:  https://otium-pms.vercel.app/superadmin/moduli?host=${host.id}`)
    console.log()
  }

  // Platform settings
  const settings = await p.platformSettings.findUnique({ where: { id: 'singleton' } })
  console.log('─'.repeat(60))
  console.log('⚙ PLATFORM SETTINGS (AI)')
  if (settings) {
    console.log(`   Provider: ${settings.aiProvider ?? '(non configurato)'}`)
    console.log(`   Model: ${settings.aiModel ?? '(non configurato)'}`)
    console.log(`   Base URL: ${settings.aiBaseUrl ?? '(default)'}`)
    console.log(`   API key: ${settings.aiApiKey ? '✓ configurata' : '⚠ MANCANTE'}`)
  } else {
    console.log('   ⚠ Nessuna configurazione — vai su /superadmin/impostazioni/ai')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => p.$disconnect())
