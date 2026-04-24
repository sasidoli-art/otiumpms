import { notFound } from 'next/navigation'
import { UtensilsCrossed, Mail, Phone } from 'lucide-react'
import BookingLayout from '@/components/book/booking-layout'
import RistoranteFlow from '@/components/book/ristorante/ristorante-flow'
import { getStrutturaPubblica } from '@/lib/book/get-struttura-pubblica'
import { getRistoranteConfig } from '@/lib/book/ristorante'
import { prisma } from '@/lib/db'

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

type SearchParams = Promise<{ pin?: string }>

export default async function BookingRistorantePage({
  params: paramsPromise,
  searchParams: searchPromise,
}: {
  params: Promise<{ strutturaId: string }>
  searchParams?: SearchParams
}) {
  const params = await paramsPromise
  const search = (await searchPromise) ?? {}

  const struttura = await getStrutturaPubblica(params.strutturaId)
  if (!struttura || !struttura.moduli.ristorazione) notFound()

  // Se il ristorante non ha fasce PRANZO/CENA configurate -> placeholder "contatta"
  const configs = await getRistoranteConfig(params.strutturaId)
  const hasConfig = configs.length > 0

  // Precompila da PIN se l'ospite e` in-house
  let prefill: {
    nome?: string | null
    cognome?: string | null
    email?: string | null
    telefono?: string | null
    pin?: string | null
  } | null = null
  if (search.pin) {
    const p = await prisma.prenotazione.findFirst({
      where: { hostId: struttura.hostId, pin: search.pin, deletedAt: null },
      select: { guestNome: true, guestCognome: true, guestEmail: true, guestTelefono: true },
    })
    if (p) {
      prefill = {
        nome: p.guestNome,
        cognome: p.guestCognome,
        email: p.guestEmail,
        telefono: p.guestTelefono,
        pin: search.pin,
      }
    }
  }

  return (
    <BookingLayout struttura={struttura}>
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <div
            className="w-14 h-14 flex items-center justify-center mx-auto mb-3"
            style={{
              backgroundColor: 'var(--brand-primary)',
              color: 'var(--brand-on-primary)',
              borderRadius: 'var(--brand-radius)',
            }}
          >
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Prenota un tavolo</h1>
          <p className="mt-2 text-sm text-gray-500">
            Ristorante {struttura.nome}
          </p>
        </div>

        {hasConfig ? (
          <RistoranteFlow strutturaId={params.strutturaId} prefill={prefill} />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
            <p className="text-sm text-gray-500 leading-relaxed">
              Il booking online del ristorante non è ancora configurato.
              Contatta la struttura per riservare il tuo tavolo.
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
        )}
      </div>
    </BookingLayout>
  )
}
