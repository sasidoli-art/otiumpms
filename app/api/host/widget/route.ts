import { NextRequest, NextResponse } from 'next/server'
import { requireHost, isUnauthorized } from '@/lib/auth-middleware'
import { prisma } from '@/lib/db'

/**
 * GET /api/host/widget?strutturaId=xxx
 * Genera gli snippet di integrazione per il sito dell'hotel.
 */
export async function GET(req: NextRequest) {
  const auth = await requireHost()
  if (isUnauthorized(auth)) return auth

  const strutturaId = req.nextUrl.searchParams.get('strutturaId')
  if (!strutturaId) return NextResponse.json({ error: 'strutturaId obbligatorio' }, { status: 400 })

  const struttura = await prisma.struttura.findFirst({
    where: { id: strutturaId, hostId: auth.user.hostId },
    select: { id: true, nome: true },
  })
  if (!struttura) return NextResponse.json({ error: 'Struttura non trovata' }, { status: 404 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.otiumweek.it'
  const bookUrl = `${baseUrl}/book/${strutturaId}`

  return NextResponse.json({
    struttura: struttura.nome,
    bookUrl,
    snippets: {
      // Metodo 1: Bottone popup (1 riga)
      bottoneFisso: `<script src="${baseUrl}/widget.js" data-struttura="${strutturaId}" data-mode="button" data-text="Prenota Ora" data-color="#4f46e5"></script>`,

      // Metodo 2: Form inline (2 righe)
      formInline: `<div id="otium-booking"></div>\n<script src="${baseUrl}/widget.js" data-struttura="${strutturaId}" data-mode="inline"></script>`,

      // Metodo 3: Link semplice (nessun JS)
      linkDiretto: `<a href="${bookUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">Prenota Ora</a>`,

      // Metodo 4: iFrame puro
      iframe: `<iframe src="${bookUrl}?embed=true" width="100%" height="700" frameborder="0" style="border-radius:12px;"></iframe>`,

      // URL diretti
      urlPrenotazione: bookUrl,
      urlSpa: `${bookUrl}/spa`,
      urlPacchetti: `${bookUrl}/pacchetti`,
    },
  })
}
