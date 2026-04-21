import { z } from 'zod'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireHostOrAdmin, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'
import { createRtProvider, type MetodoPagamentoRT } from '@/lib/registratore-rt'

const schema = z.object({
  transazioneId: z.string().optional(),
  righe: z.array(z.object({
    descrizione: z.string().min(1),
    quantita: z.number().positive(),
    prezzoUnitario: z.number().min(0),
    aliquotaIva: z.number().min(0),
  })).min(1),
  metodoPagamento: z.enum(['CARTA', 'CONTANTI', 'ELETTRONICO', 'MISTO']).default('CARTA'),
  clienteFiscale: z.string().nullable().optional(),
})

// POST /api/host/cassa/scontrino-rt
// Emette scontrino fiscale tramite Registratore Telematico configurato.
// Crea record ScontrinoRT indipendentemente dal successo hardware (audit).
export async function POST(req: Request) {
  const auth = await requireHostOrAdmin()
  if (isUnauthorized(auth)) return auth

  const raw = await req.json()
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const data = parsed.data

  const config = await prisma.registratoreRtConfig.findUnique({
    where: { hostId: auth.user.hostId },
  })
  if (!config) {
    return NextResponse.json({ error: 'Registratore RT non configurato. Vai in impostazioni.' }, { status: 400 })
  }

  const provider = createRtProvider({
    provider: config.provider,
    matricola: config.matricola,
    endpointUrl: config.endpointUrl,
    timeout: config.timeout,
    esercizioNumero: config.esercizioNumero,
  })

  const result = await provider.emettiScontrino({
    righe: data.righe,
    metodoPagamento: data.metodoPagamento as MetodoPagamentoRT,
    clienteFiscale: data.clienteFiscale ?? undefined,
  })

  const scontrino = await prisma.scontrinoRT.create({
    data: {
      hostId: auth.user.hostId,
      transazioneId: data.transazioneId ?? null,
      numeroScontrino: result.numeroScontrino ?? `FAIL-${Date.now()}`,
      matricolaRt: result.matricolaRt ?? config.matricola ?? null,
      imponibile: result.imponibile,
      imposta: result.imposta,
      totale: result.totale,
      metodoPagamento: data.metodoPagamento,
      righe: data.righe as unknown as object,
      statoTrasmissione: result.success ? 'LOCAL' : 'ERRORE',
      erroreMessaggio: result.errore ?? null,
      xmlOriginale: result.xml ?? null,
    },
  })

  await auditFromAuth(auth, {
    azione: result.success ? 'scontrino_rt.emesso' : 'scontrino_rt.errore',
    entita: 'scontrinoRT',
    entitaId: scontrino.id,
    dettagli: result.success
      ? `Scontrino ${result.numeroScontrino} emesso (€${result.totale})`
      : `Errore emissione scontrino: ${result.errore}`,
  })

  return NextResponse.json({
    ok: result.success,
    scontrinoId: scontrino.id,
    numeroScontrino: result.numeroScontrino,
    matricolaRt: result.matricolaRt,
    totale: result.totale,
    errore: result.errore,
  }, { status: result.success ? 201 : 502 })
}
