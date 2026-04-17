import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import KioskDisplay from './kiosk-display'

export const metadata = { title: 'Kiosk — Firma' }

export default async function KioskPage({
  params: paramsPromise,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await paramsPromise

  // Token è lo strutturaId per il kiosk display
  const struttura = await prisma.struttura.findUnique({
    where: { id: token },
    select: {
      id: true, nome: true, logo: true,
      colorePrimario: true, coloreSecondario: true,
      fotoHero: true, messaggioChiusura: true,
    },
  })

  if (!struttura) {
    // Fallback: prova come checkInToken (compatibilità vecchio flusso)
    const p = await prisma.prenotazione.findFirst({
      where: { checkInToken: token },
      select: {
        struttura: { select: { id: true, nome: true, logo: true, colorePrimario: true, coloreSecondario: true, fotoHero: true, messaggioChiusura: true } },
      },
    })
    if (!p?.struttura) notFound()
    return (
      <KioskDisplay
        strutturaId={p.struttura.id}
        struttura={p.struttura}
      />
    )
  }

  return (
    <KioskDisplay
      strutturaId={struttura.id}
      struttura={struttura}
    />
  )
}
