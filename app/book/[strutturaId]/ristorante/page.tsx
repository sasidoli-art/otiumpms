import { notFound } from 'next/navigation'
import { UtensilsCrossed, Mail, Phone } from 'lucide-react'
import BookingLayout from '@/components/book/booking-layout'
import { getStrutturaPubblica } from '@/lib/book/get-struttura-pubblica'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params: paramsPromise,
}: {
  params: Promise<{ strutturaId: string }>
}) {
  const params = await paramsPromise
  const struttura = await getStrutturaPubblica(params.strutturaId)
  return { title: struttura ? `Ristorante — ${struttura.nome}` : 'Ristorante' }
}

export default async function BookingRistorantePage({
  params: paramsPromise,
}: {
  params: Promise<{ strutturaId: string }>
}) {
  const params = await paramsPromise
  const struttura = await getStrutturaPubblica(params.strutturaId)
  if (!struttura || !struttura.moduli.ristorazione) notFound()

  return (
    <BookingLayout struttura={struttura}>
      <div className="max-w-xl mx-auto bg-white rounded-xl border border-gray-100 p-8 text-center">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white mx-auto mb-4"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <UtensilsCrossed className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Prenotazione ristorante</h1>
        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
          Il booking online del ristorante sarà presto disponibile.
          Nel frattempo puoi contattarci direttamente per riservare il tuo tavolo.
        </p>

        <div className="mt-6 space-y-2">
          {struttura.telefonoHost && (
            <a
              href={`tel:${struttura.telefonoHost}`}
              className="flex items-center justify-center gap-2 text-sm font-semibold"
              style={{ color: 'var(--brand-primary)' }}
            >
              <Phone className="w-4 h-4" />
              {struttura.telefonoHost}
            </a>
          )}
          <a
            href={`mailto:${struttura.emailHost}?subject=${encodeURIComponent(`Prenotazione ristorante — ${struttura.nome}`)}`}
            className="flex items-center justify-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--brand-primary)' }}
          >
            <Mail className="w-4 h-4" />
            {struttura.emailHost}
          </a>
        </div>
      </div>
    </BookingLayout>
  )
}
