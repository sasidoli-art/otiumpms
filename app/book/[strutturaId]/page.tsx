import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { BedDouble, Sparkles, UtensilsCrossed, Package, ArrowRight } from 'lucide-react'
import BookingLayout from '@/components/book/booking-layout'
import { getStrutturaPubblica } from '@/lib/book/get-struttura-pubblica'
import { PublicConciergeWidget } from '@/components/book/public-concierge-widget'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params: paramsPromise,
}: {
  params: Promise<{ strutturaId: string }>
}) {
  const params = await paramsPromise
  const s = await prisma.struttura.findFirst({
    where: { id: params.strutturaId, attiva: true },
    select: { nome: true, descrizione: true },
  })
  if (!s) return { title: 'Non trovato' }
  return { title: s.nome, description: s.descrizione ?? undefined }
}

export default async function LandingStrutturaPage({
  params: paramsPromise,
}: {
  params: Promise<{ strutturaId: string }>
}) {
  const params = await paramsPromise
  const struttura = await getStrutturaPubblica(params.strutturaId)
  if (!struttura) notFound()

  // Costruisci l'elenco dei servizi prenotabili
  const servizi: {
    id: string
    titolo: string
    descrizione: string
    href: string
    icon: React.ComponentType<{ className?: string }>
  }[] = []
  if (struttura.moduli.prenotazioni) {
    servizi.push({
      id: 'camere',
      titolo: 'Prenota una camera',
      descrizione: 'Scegli la sistemazione e le date del tuo soggiorno.',
      href: `/book/${struttura.id}/camere`,
      icon: BedDouble,
    })
  }
  if (struttura.moduli.spa) {
    servizi.push({
      id: 'spa',
      titolo: 'Prenota un trattamento SPA',
      descrizione: 'Massaggi, rituali e percorsi benessere.',
      href: `/book/${struttura.id}/spa`,
      icon: Sparkles,
    })
  }
  if (struttura.moduli.ristorazione) {
    servizi.push({
      id: 'ristorante',
      titolo: 'Prenota al ristorante',
      descrizione: 'Riserva il tuo tavolo per colazione, pranzo o cena.',
      href: `/book/${struttura.id}/ristorante`,
      icon: UtensilsCrossed,
    })
  }
  if (struttura.moduli.pacchetti) {
    servizi.push({
      id: 'pacchetti',
      titolo: 'Pacchetti e offerte',
      descrizione: 'Offerte combinate soggiorno + esperienze.',
      href: `/book/${struttura.id}/pacchetti`,
      icon: Package,
    })
  }

  // Se c'è un solo servizio attivo, redirect diretto
  if (servizi.length === 1) redirect(servizi[0].href)

  return (
    <BookingLayout struttura={struttura} hero>
      {!struttura.fotoHero && (
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{struttura.nome}</h1>
          {struttura.descrizione && (
            <p className="mt-3 text-base text-gray-600 max-w-2xl mx-auto">
              {struttura.descrizione}
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center md:text-left">
          Cosa vuoi prenotare?
        </h2>

        {servizi.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-500">
              Al momento non ci sono servizi prenotabili online.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servizi.map((s) => {
              const Icon = s.icon
              return (
                <Link
                  key={s.id}
                  href={s.href}
                  className="group bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-gray-950">
                        {s.titolo}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{s.descrizione}</p>
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold mt-3 group-hover:gap-2 transition-all"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        Continua <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <PublicConciergeWidget
        strutturaId={struttura.id}
        strutturaNome={struttura.nome}
        lingua="it"
      />
    </BookingLayout>
  )
}
