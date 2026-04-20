import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { auditFromAuth } from '@/lib/audit'

const completaSchema = z.object({
  // Dati ospite principale
  guestNome: z.string().optional(),
  guestCognome: z.string().optional(),
  guestSesso: z.enum(['M', 'F']).nullable().optional(),
  guestDataNascita: z.string().nullable().optional(), // ISO date
  guestLuogoNascita: z.string().nullable().optional(),
  guestComuneNascitaIstat: z.string().nullable().optional(),
  guestProvinciaNascita: z.string().nullable().optional(),
  guestStatoNascitaIstat: z.string().nullable().optional(),
  guestCittadinanzaIstat: z.string().nullable().optional(),
  guestTipoDocumento: z.string().nullable().optional(),
  guestNumeroDocumento: z.string().nullable().optional(),
  guestLuogoRilascio: z.string().nullable().optional(),
  guestComuneRilascioIstat: z.string().nullable().optional(),
  guestProvinciaRilascio: z.string().nullable().optional(),
  guestStatoRilascioIstat: z.string().nullable().optional(),
  // Accompagnatori (upsert per id)
  accompagnatori: z.array(z.object({
    id: z.string().optional(), // se presente: update; altrimenti create
    nome: z.string().min(1),
    cognome: z.string().min(1),
    sesso: z.enum(['M', 'F']).nullable().optional(),
    dataNascita: z.string().nullable().optional(),
    luogoNascita: z.string().nullable().optional(),
    provinciaNascita: z.string().nullable().optional(),
    comuneNascitaIstat: z.string().nullable().optional(),
    statoNascitaIstat: z.string().nullable().optional(),
    cittadinanzaIstat: z.string().nullable().optional(),
    tipoDocumento: z.string().nullable().optional(),
    numeroDocumento: z.string().nullable().optional(),
    luogoRilascio: z.string().nullable().optional(),
    comuneRilascioIstat: z.string().nullable().optional(),
    provinciaRilascio: z.string().nullable().optional(),
    isMinore: z.boolean().optional(),
  })).optional(),
})

// PATCH /api/host/alloggiati/completa/[prenotazioneId]
// Aggiorna i campi Alloggiati dell'ospite principale + accompagnatori.
export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ prenotazioneId: string }> },
) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth
  const { prenotazioneId } = await paramsPromise

  const raw = await req.json()
  const parsed = completaSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 422 })
  }
  const data = parsed.data

  const prenotazione = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, hostId: auth.user.hostId, deletedAt: null },
    select: { id: true, guestCognome: true, guestEmail: true },
  })
  if (!prenotazione) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  // Build update guest
  const guestUpdate: Record<string, unknown> = {}
  if (data.guestNome !== undefined) guestUpdate.guestNome = data.guestNome
  if (data.guestCognome !== undefined) guestUpdate.guestCognome = data.guestCognome
  if (data.guestSesso !== undefined) guestUpdate.guestSesso = data.guestSesso
  if (data.guestDataNascita !== undefined) {
    guestUpdate.guestDataNascita = data.guestDataNascita ? new Date(data.guestDataNascita) : null
  }
  if (data.guestLuogoNascita !== undefined) guestUpdate.guestLuogoNascita = data.guestLuogoNascita
  if (data.guestComuneNascitaIstat !== undefined) guestUpdate.guestComuneNascitaIstat = data.guestComuneNascitaIstat
  if (data.guestProvinciaNascita !== undefined) guestUpdate.guestProvinciaNascita = data.guestProvinciaNascita
  if (data.guestStatoNascitaIstat !== undefined) guestUpdate.guestStatoNascitaIstat = data.guestStatoNascitaIstat
  if (data.guestCittadinanzaIstat !== undefined) guestUpdate.guestCittadinanzaIstat = data.guestCittadinanzaIstat
  if (data.guestTipoDocumento !== undefined) guestUpdate.guestTipoDocumento = data.guestTipoDocumento
  if (data.guestNumeroDocumento !== undefined) guestUpdate.guestNumeroDocumento = data.guestNumeroDocumento
  if (data.guestLuogoRilascio !== undefined) guestUpdate.guestLuogoRilascio = data.guestLuogoRilascio
  if (data.guestComuneRilascioIstat !== undefined) guestUpdate.guestComuneRilascioIstat = data.guestComuneRilascioIstat
  if (data.guestProvinciaRilascio !== undefined) guestUpdate.guestProvinciaRilascio = data.guestProvinciaRilascio
  if (data.guestStatoRilascioIstat !== undefined) guestUpdate.guestStatoRilascioIstat = data.guestStatoRilascioIstat

  await prisma.$transaction(async (tx) => {
    if (Object.keys(guestUpdate).length > 0) {
      await tx.prenotazione.update({
        where: { id: prenotazioneId },
        data: guestUpdate,
      })
    }

    if (data.accompagnatori) {
      for (const a of data.accompagnatori) {
        const accData = {
          nome: a.nome,
          cognome: a.cognome,
          sesso: a.sesso ?? null,
          dataNascita: a.dataNascita ? new Date(a.dataNascita) : null,
          luogoNascita: a.luogoNascita ?? null,
          provinciaNascita: a.provinciaNascita ?? null,
          comuneNascitaIstat: a.comuneNascitaIstat ?? null,
          statoNascitaIstat: a.statoNascitaIstat ?? null,
          cittadinanzaIstat: a.cittadinanzaIstat ?? null,
          tipoDocumento: a.tipoDocumento ?? null,
          numeroDocumento: a.numeroDocumento ?? null,
          luogoRilascio: a.luogoRilascio ?? null,
          comuneRilascioIstat: a.comuneRilascioIstat ?? null,
          provinciaRilascio: a.provinciaRilascio ?? null,
          isMinore: a.isMinore ?? false,
        }
        if (a.id) {
          // Update esistente
          await tx.accompagnatore.update({
            where: { id: a.id, prenotazioneId },
            data: accData,
          })
        } else {
          await tx.accompagnatore.create({
            data: { ...accData, prenotazioneId },
          })
        }
      }
    }
  })

  await auditFromAuth(auth, {
    azione: 'alloggiati.dati.completati',
    entita: 'prenotazione',
    entitaId: prenotazioneId,
    dettagli: `Dati Alloggiati Web completati per prenotazione ${prenotazione.guestCognome ?? ''}`,
  })

  return NextResponse.json({ ok: true })
}
