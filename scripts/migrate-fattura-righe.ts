import { prisma } from '@/lib/db'

/**
 * Migrazione: Fattura.righe (JSON) → RigaFattura (relazionale)
 *
 * Per ogni fattura con righe JSON, crea record RigaFattura.
 * Script idempotente: salta fatture con RigaFattura già create.
 */

interface RigaJson {
  descrizione: string
  quantita: number
  prezzoUnitario: number
  iva?: number
  totale: number
}

async function main() {
  console.log('🔄 Inizio migrazione Fattura.righe → RigaFattura')

  const fatture = await prisma.fattura.findMany({
    select: { id: true, numero: true, righe: true },
  })

  let totaleRighe = 0
  let fattureElaborate = 0

  for (const fattura of fatture) {
    if (!fattura.righe || Array.isArray(fattura.righe) === false) {
      continue
    }

    const righeJson = (fattura.righe as unknown as RigaJson[]) ?? []
    if (righeJson.length === 0) {
      continue
    }

    // Verifica se già migrare (conta RigaFattura esistenti per questa fattura)
    const conteggioEsistenti = await prisma.rigaFattura.count({
      where: { fatturaId: fattura.id },
    })

    if (conteggioEsistenti > 0) {
      console.log(`  ✓ ${fattura.numero}: ${conteggioEsistenti} righe già migrate`)
      totaleRighe += conteggioEsistenti
      continue
    }

    // Crea RigaFattura per ogni riga JSON
    const righeCreate = righeJson.map((r, i) => ({
      fatturaId: fattura.id,
      ordine: i,
      descrizione: r.descrizione,
      quantita: r.quantita,
      prezzoUnitario: r.prezzoUnitario,
      aliquotaIva: r.iva ?? 22,
      totale: r.totale,
      categoria: undefined, // da popolare manualmente se necessario
    }))

    try {
      const created = await prisma.rigaFattura.createMany({
        data: righeCreate,
      })
      console.log(`  ✓ ${fattura.numero}: ${created.count} righe migrate`)
      totaleRighe += created.count
      fattureElaborate++
    } catch (err) {
      console.error(`  ✗ ${fattura.numero}: errore:`, err instanceof Error ? err.message : String(err))
    }
  }

  console.log(`\n✅ Migrazione completata: ${fattureElaborate} fatture elaborate, ${totaleRighe} righe totali`)
}

main()
  .catch((err) => {
    console.error('❌ Errore migrazione:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
