import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  // Assegna PIN a tutte le prenotazioni CONFERMATA/RICHIESTA senza PIN
  const prenotazioni = await p.prenotazione.findMany({
    where: { pin: null, stato: { in: ['CONFERMATA', 'RICHIESTA'] } },
    select: { id: true, hostId: true, guestNome: true, guestCognome: true },
  })

  console.log(`Trovate ${prenotazioni.length} prenotazioni senza PIN`)

  const usedPins = new Map<string, Set<string>>()

  for (const pren of prenotazioni) {
    if (!usedPins.has(pren.hostId)) usedPins.set(pren.hostId, new Set())
    const hostPins = usedPins.get(pren.hostId)!

    let pin: string
    do {
      pin = String(Math.floor(1000 + Math.random() * 9000))
    } while (hostPins.has(pin))

    hostPins.add(pin)

    await p.prenotazione.update({
      where: { id: pren.id },
      data: { pin },
    })
    console.log(`  ✅ ${pren.guestNome} ${pren.guestCognome} → PIN ${pin}`)
  }

  console.log(`\n${prenotazioni.length} PIN assegnati.`)
}

main().finally(() => p.$disconnect())
