import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import WellnessCardForm from './wellness-card-form'

export default async function WellnessCardPage({ params: paramsPromise }: { params: Promise<{ token: string }> }) {
  const { token } = await paramsPromise

  const appuntamento = await prisma.appuntamentoSpa.findUnique({
    where: { id: token },
    select: {
      id: true,
      guestNome: true,
      guestCognome: true,
      dataOra: true,
      durata: true,
      trattamento: { select: { nome: true } },
      percorso: { select: { nome: true } },
      waiver: { select: { confermato: true } },
      host: { select: { nomeAzienda: true, logo: true } },
    },
  })

  if (!appuntamento) notFound()

  const servizio = appuntamento.trattamento?.nome ?? appuntamento.percorso?.nome ?? 'Trattamento'
  const giaCompilata = appuntamento.waiver?.confermato ?? false

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          {appuntamento.host.logo ? (
            <img src={appuntamento.host.logo} alt="" className="h-12 mx-auto mb-3" />
          ) : (
            <p className="text-sm text-purple-400 mb-1">{appuntamento.host.nomeAzienda}</p>
          )}
          <h1 className="text-2xl font-heading font-bold text-gray-900">Wellness Card</h1>
          <p className="text-sm text-gray-500 mt-1">
            {appuntamento.guestNome} {appuntamento.guestCognome} · {servizio}
          </p>
        </div>

        {giaCompilata ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-9 h-9 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Wellness Card completata</h2>
            <p className="text-sm text-gray-500 mt-2">La tua scheda è stata inviata. Il terapista è pronto ad accoglierti.</p>
          </div>
        ) : (
          <WellnessCardForm appuntamentoId={appuntamento.id} guestNome={appuntamento.guestNome} guestCognome={appuntamento.guestCognome ?? ''} />
        )}

        <p className="text-center text-[10px] text-gray-300 mt-6">
          Powered by <a href="https://otiumpms.com" className="underline">OtiumPMS</a>
        </p>
      </div>
    </div>
  )
}
