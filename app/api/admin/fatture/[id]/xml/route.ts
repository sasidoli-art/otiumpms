import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { generateFatturaPA } from '@/lib/fattura-elettronica'
import { getBillingInfo } from '@/lib/host-config'

/**
 * GET /api/admin/fatture/[id]/xml
 * Genera il file XML FatturaPA conforme al tracciato SDI v1.2.2
 * per l'invio tramite Sistema di Interscambio.
 */
export async function GET(
  _: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  const fattura = await prisma.fattura.findUnique({
    where: { id },
    include: {
      host: {
        select: {
          nomeAzienda: true, partitaIva: true, codiceFiscale: true,
          indirizzo: true, cap: true, citta: true, provincia: true,
        },
      },
    },
  })

  if (!fattura) return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })

  const billing = await getBillingInfo(fattura.hostId)

  // Dati emittente (preferisci dati fatturazione se presenti)
  const h = fattura.host
  const emittente = {
    denominazione: billing?.fattNomeAzienda || h.nomeAzienda,
    partitaIva: billing?.fattPartitaIva || h.partitaIva || '',
    codiceFiscale: h.codiceFiscale || undefined,
    regimeFiscale: billing?.regimeFiscale || 'RF01',
    indirizzo: billing?.fattIndirizzo || h.indirizzo || '',
    cap: billing?.fattCap || h.cap || '00000',
    comune: billing?.fattCitta || h.citta || '',
    provincia: billing?.fattProvincia || h.provincia || '',
  }

  // Dati cliente
  const cliente = {
    denominazione: fattura.clienteNome,
    partitaIva: fattura.clientePIva || undefined,
    codiceFiscale: fattura.clienteCF || undefined,
    indirizzo: fattura.clienteIndirizzo || undefined,
    cap: fattura.clienteCap || undefined,
    comune: fattura.clienteCitta || undefined,
    provincia: fattura.clienteProvincia || undefined,
    nazione: fattura.clientePaese === 'Italia' ? 'IT' : fattura.clientePaese || 'IT',
    pec: fattura.clientePec || undefined,
    codiceSDI: fattura.clienteSDI || '0000000',
  }

  // Righe fattura (dal campo JSON)
  const righeRaw = fattura.righe as Array<{
    descrizione: string
    quantita: number
    prezzoUnitario: number
    iva?: number
    totale: number
  }>

  const righe = righeRaw.map(r => ({
    descrizione: r.descrizione,
    quantita: r.quantita,
    prezzoUnitario: r.prezzoUnitario,
    aliquotaIva: r.iva ?? fattura.aliquotaIva,
  }))

  // Progressivo invio: anno + numero fattura (sanitizzato)
  const progressivo = fattura.numero.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)

  const xml = generateFatturaPA({
    progressivoInvio: progressivo,
    numero: fattura.numero,
    data: fattura.dataEmissione.toISOString().split('T')[0],
    emittente,
    cliente,
    righe,
    dataScadenza: fattura.dataScadenza?.toISOString().split('T')[0],
    importoPagamento: fattura.totale,
  })

  // Filename conforme: IT + P.IVA + _ + progressivo + .xml
  const piva = emittente.partitaIva.replace(/^IT/, '')
  const filename = `IT${piva}_${progressivo}.xml`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
