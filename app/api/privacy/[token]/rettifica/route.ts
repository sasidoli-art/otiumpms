import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verificaPortaleToken } from '@/lib/consent'
import { audit } from '@/lib/audit'

/**
 * POST /api/privacy/[token]/rettifica
 * Body: { campo, valoreCorretto, motivazione? }
 *
 * Crea una notifica per l'host con la rettifica richiesta.
 * L'host decide se accettarla (Art. 16 GDPR).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const subject = verificaPortaleToken(token)
  if (!subject) {
    return NextResponse.json({ error: 'Token non valido' }, { status: 401 })
  }
  const { email, hostId } = subject

  let body: { campo?: string; valoreCorretto?: string; motivazione?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body malformato' }, { status: 400 })
  }

  const campo = body.campo?.trim()
  const valore = body.valoreCorretto?.trim()
  if (!campo || !valore) {
    return NextResponse.json({ error: 'campo e valoreCorretto richiesti' }, { status: 400 })
  }

  // Whitelist dei campi rettificabili (per sicurezza/UX)
  const CAMPI_VALIDI = ['nome', 'cognome', 'telefono', 'nazionalita', 'preferenze']
  if (!CAMPI_VALIDI.includes(campo)) {
    return NextResponse.json(
      { error: `Campo '${campo}' non rettificabile da portale. Contatta la struttura.` },
      { status: 422 },
    )
  }

  await audit({
    hostId,
    azione: 'gdpr.art16.richiesta_rettifica',
    entita: 'ospiteCRM',
    dettagli: `Ospite ${email} richiede rettifica campo "${campo}" → "${valore.substring(0, 100)}"${body.motivazione ? `. Motivazione: ${body.motivazione.substring(0, 200)}` : ''}`,
  })

  await prisma.notifica.create({
    data: {
      hostId,
      tipo: 'sistema',
      titolo: 'Richiesta rettifica dati (GDPR Art. 16)',
      messaggio: `${email} chiede di correggere "${campo}" in "${valore.substring(0, 80)}${valore.length > 80 ? '…' : ''}". ${body.motivazione ? `Motivazione: ${body.motivazione.substring(0, 150)}` : ''}`,
      linkUrl: `/host/crm?search=${encodeURIComponent(email)}`,
    },
  })

  return NextResponse.json({ ok: true })
}
