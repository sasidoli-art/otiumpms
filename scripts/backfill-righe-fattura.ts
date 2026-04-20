/**
 * Backfill RigaFattura model from legacy Fattura.righe JSON.
 *
 * Idempotent: skippa fatture che hanno già righe relazionali.
 *
 * Run: npx tsx scripts/backfill-righe-fattura.ts
 * Dry-run: npx tsx scripts/backfill-righe-fattura.ts --dry
 */

import { prisma } from '../lib/db'

type RigaJson = {
  descrizione?: string
  quantita?: number
  prezzoUnitario?: number
  iva?: number
  totale?: number
}

async function main() {
  const dryRun = process.argv.includes('--dry')
  console.log(dryRun ? '🔍 DRY RUN (nessuna scrittura)' : '⚙️  Backfill RigaFattura…')

  const fatture = await prisma.fattura.findMany({
    select: {
      id: true,
      numero: true,
      righe: true,
      aliquotaIva: true,
      _count: { select: { rigeRel: true } },
    },
  })

  let processed = 0
  let skipped = 0
  let totalRows = 0

  for (const f of fatture) {
    if (f._count.rigeRel > 0) {
      skipped++
      continue
    }

    const righeJson = f.righe as RigaJson[] | null | undefined
    if (!Array.isArray(righeJson) || righeJson.length === 0) {
      skipped++
      continue
    }

    const toCreate = righeJson.map((r, i) => {
      const quantita = Number(r.quantita ?? 1)
      const prezzoUnitario = Number(r.prezzoUnitario ?? 0)
      const totale = typeof r.totale === 'number' ? r.totale : quantita * prezzoUnitario
      return {
        fatturaId: f.id,
        ordine: i,
        descrizione: r.descrizione ?? `Riga ${i + 1}`,
        quantita,
        prezzoUnitario,
        aliquotaIva: typeof r.iva === 'number' ? r.iva : f.aliquotaIva,
        totale: Math.round(totale * 100) / 100,
        naturaEsenzione: null,
        categoria: null,
      }
    })

    if (dryRun) {
      console.log(`  ${f.numero}: would create ${toCreate.length} rows`)
    } else {
      await prisma.rigaFattura.createMany({ data: toCreate })
      console.log(`  ${f.numero}: created ${toCreate.length} rows`)
    }
    processed++
    totalRows += toCreate.length
  }

  console.log(`\nDone. Processed: ${processed} fatture. Skipped: ${skipped}. Rows created: ${totalRows}.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
