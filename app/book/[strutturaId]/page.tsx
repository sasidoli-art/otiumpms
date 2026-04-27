import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { BedDouble, Sparkles, UtensilsCrossed, Package, ArrowRight, type LucideIcon } from 'lucide-react'
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

type Servizio = {
  id: string
  titolo: string
  descrizione: string
  href: string
  icon: LucideIcon
}

export default async function LandingStrutturaPage({
  params: paramsPromise,
}: {
  params: Promise<{ strutturaId: string }>
}) {
  const params = await paramsPromise
  const struttura = await getStrutturaPubblica(params.strutturaId)
  if (!struttura) notFound()

  const servizi: Servizio[] = []
  if (struttura.moduli.prenotazioni) {
    servizi.push({
      id: 'camere',
      titolo: 'Soggiorno',
      descrizione: 'Scegli la camera e le date del tuo soggiorno.',
      href: `/book/${struttura.id}/camere`,
      icon: BedDouble,
    })
  }
  if (struttura.moduli.spa) {
    servizi.push({
      id: 'spa',
      titolo: 'SPA & Benessere',
      descrizione: 'Massaggi, rituali e percorsi di benessere.',
      href: `/book/${struttura.id}/spa`,
      icon: Sparkles,
    })
  }
  if (struttura.moduli.ristorazione) {
    servizi.push({
      id: 'ristorante',
      titolo: 'Ristorante',
      descrizione: 'Riserva il tuo tavolo per pranzo o cena.',
      href: `/book/${struttura.id}/ristorante`,
      icon: UtensilsCrossed,
    })
  }
  if (struttura.moduli.pacchetti) {
    servizi.push({
      id: 'pacchetti',
      titolo: 'Pacchetti',
      descrizione: 'Esperienze combinate soggiorno + attività.',
      href: `/book/${struttura.id}/pacchetti`,
      icon: Package,
    })
  }

  // Se c'è un solo servizio attivo, redirect diretto
  if (servizi.length === 1) redirect(servizi[0].href)

  const primaryService = servizi[0]
  const heroActions = primaryService && (
    <>
      <Link
        href={primaryService.href}
        className="inline-flex items-center justify-center gap-2 h-11 px-6 text-[15px] font-semibold rounded-md transition-all hover:brightness-110 hover:-translate-y-px"
        style={{
          backgroundColor: 'var(--brand-primary)',
          color: 'var(--brand-on-primary)',
          borderRadius: 'var(--brand-radius)',
        }}
      >
        Prenota ora
        <ArrowRight className="w-4 h-4" />
      </Link>
      <a
        href="#servizi"
        className="inline-flex items-center justify-center h-11 px-6 text-[15px] font-semibold rounded-md border border-white/60 text-white hover:bg-white/10 backdrop-blur-sm transition-all"
        style={{ borderRadius: 'var(--brand-radius)' }}
      >
        Scopri di più
      </a>
    </>
  )

  return (
    <BookingLayout struttura={struttura} hero heroActions={heroActions}>
      <section id="servizi" className="scroll-mt-24">
        <div className="text-center mb-10 md:mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 mb-3">
            Cosa puoi prenotare
          </p>
          <h2 className="font-serif text-[28px] md:text-[32px] text-neutral-900 leading-tight tracking-[-0.02em]">
            Un soggiorno su misura
          </h2>
        </div>

        {servizi.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-150 p-10 text-center max-w-lg mx-auto">
            <p className="text-[14px] text-neutral-500">
              Al momento non ci sono servizi prenotabili online.
            </p>
          </div>
        ) : (
          <div
            className={
              servizi.length >= 3
                ? 'grid grid-cols-1 md:grid-cols-3 gap-5'
                : 'grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto'
            }
          >
            {servizi.map((s) => {
              const Icon = s.icon
              return (
                <Link
                  key={s.id}
                  href={s.href}
                  className="group bg-white rounded-2xl border border-neutral-150 p-6 md:p-7 flex flex-col hover:shadow-lg hover:-translate-y-1 hover:border-neutral-200 transition-all duration-normal ease-out"
                >
                  {/* Illustration icon */}
                  <div
                    className="w-14 h-14 flex items-center justify-center mb-5 shrink-0"
                    style={{
                      backgroundColor: 'var(--brand-primary-light, #e0e7ff)',
                      color: 'var(--brand-primary)',
                      borderRadius: 'var(--brand-radius)',
                    }}
                  >
                    <Icon className="w-7 h-7" />
                  </div>

                  <h3 className="font-serif text-[20px] leading-tight text-neutral-900 mb-2">
                    {s.titolo}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-neutral-500 flex-1">
                    {s.descrizione}
                  </p>

                  <div className="mt-5 pt-5 border-t border-neutral-100">
                    <span
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold group-hover:gap-2.5 transition-all"
                      style={{ color: 'var(--brand-primary)' }}
                    >
                      Prenota
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <PublicConciergeWidget
        strutturaId={struttura.id}
        strutturaNome={struttura.nome}
        lingua="it"
      />
    </BookingLayout>
  )
}
