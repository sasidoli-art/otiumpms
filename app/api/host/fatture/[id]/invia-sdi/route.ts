import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'
import { generateFatturaPA } from '@/lib/fattura-elettronica'
import { getInvoiceProvider } from '@/lib/invoice-provider'

type RouteParams = { params: Promise<{ id: string }> }

/**
 * POST /api/host/fatture/[id]/invia-sdi
 *
 * Generates FatturaPA XML, sends it via the configured invoice provider
 * (Aruba, FattureInCloud, or manual), and updates fattura status.
 */
export async function POST(
  _: NextRequest,
  { params: paramsPromise }: RouteParams,
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { id } = await paramsPromise

  // Load fattura with host data for XML generation
  const fattura = await prisma.fattura.findFirst({
    where: { id, hostId: auth.user.hostId },
    include: {
      host: {
        select: {
          nomeAzienda: true, partitaIva: true, codiceFiscale: true,
          indirizzo: true, cap: true, citta: true, provincia: true,
          regimeFiscale: true,
          fattNomeAzienda: true, fattPartitaIva: true, fattIndirizzo: true,
          fattCitta: true, fattCap: true, fattProvincia: true,
          // SDI provider config (stored in host metadata if present)
          sdiProvider: true, sdiApiKey: true, sdiUsername: true, sdiCompanyId: true,
        },
      },
    },
  })

  if (!fattura) {
    return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  }

  if (fattura.stato !== 'BOZZA' && fattura.stato !== 'INVIATA') {
    return NextResponse.json(
      { error: `Non è possibile inviare una fattura in stato ${fattura.stato}` },
      { status: 422 },
    )
  }

  // Build FatturaPA XML
  const h = fattura.host
  const emittente = {
    denominazione: h.fattNomeAzienda || h.nomeAzienda,
    partitaIva: h.fattPartitaIva || h.partitaIva || '',
    codiceFiscale: h.codiceFiscale || undefined,
    regimeFiscale: h.regimeFiscale || 'RF01',
    indirizzo: h.fattIndirizzo || h.indirizzo || '',
    cap: h.fattCap || h.cap || '00000',
    comune: h.fattCitta || h.citta || '',
    provincia: h.fattProvincia || h.provincia || '',
  }

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
    // Tassa di soggiorno (IVA 0) needs natura N1
    ...(r.iva === 0 ? { natura: 'N1' } : {}),
  }))

  const progressivo = fattura.numero.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
  const piva = emittente.partitaIva.replace(/^IT/, '')
  const filename = `IT${piva}_${progressivo}.xml`

  const xml = generateFatturaPA({
    progressivoInvio: progressivo,
    numero: fattura.numero,
    data: fattura.dataEmissione.toISOString().split('T')[0],
    tipoDocumento: fattura.tipoDocumento || 'TD01',
    emittente,
    cliente,
    righe,
    dataScadenza: fattura.dataScadenza?.toISOString().split('T')[0],
    importoPagamento: fattura.totale,
  })

  // Get invoice provider
  const host = fattura.host as Record<string, unknown>
  const provider = getInvoiceProvider({
    provider: (host.sdiProvider as string) || 'manuale',
    apiKey: host.sdiApiKey as string | undefined,
    username: host.sdiUsername as string | undefined,
    companyId: host.sdiCompanyId as string | undefined,
  })

  try {
    const result = await provider.sendInvoice(xml, filename)

    // Update fattura with SDI tracking info
    const updated = await prisma.fattura.update({
      where: { id },
      data: {
        stato: 'INVIATA',
        sdiId: result.id,
        sdiStato: 'in_attesa',
        sdiProvider: provider.name,
        sdiInviatoAt: new Date(),
      },
    })

    return NextResponse.json({
      ok: true,
      fattura: updated,
      sdi: {
        provider: provider.name,
        id: result.id,
        status: result.status,
        filename,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore sconosciuto'

    // Store error but don't change status if it was already INVIATA
    await prisma.fattura.update({
      where: { id },
      data: {
        sdiMessaggio: `Errore invio: ${message}`,
        sdiProvider: provider.name,
      },
    })

    return NextResponse.json(
      { error: 'Errore durante l\'invio a SDI', details: message },
      { status: 502 },
    )
  }
}
