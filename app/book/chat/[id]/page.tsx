import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import GuestChatBox from './guest-chat-box'
import { getTranslations } from 'next-intl/server'

export default async function GuestChatPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const t = await getTranslations('booking.chat')

  const chat = await prisma.chat.findUnique({
    where: { id: params.id },
    include: {
      messaggi: { orderBy: { createdAt: 'asc' } },
      prenotazione: {
        select: {
          guestNome: true, guestCognome: true, stato: true,
          struttura: { select: { nome: true } },
        },
      },
      host: { select: { nomeAzienda: true } },
    },
  })

  if (!chat) notFound()

  const chatChiusa = ['COMPLETATA', 'ANNULLATA', 'NO_SHOW'].includes(chat.prenotazione.stato)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-xs text-gray-400 mb-1">Otium Week</div>
          <h1 className="text-xl font-bold text-gray-900">
            {t('chatWith')} {chat.host.nomeAzienda}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {chat.prenotazione.struttura?.nome}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-600">
              {t('chattingAs')}{' '}
              <span className="font-semibold text-gray-900">
                {chat.prenotazione.guestNome} {chat.prenotazione.guestCognome}
              </span>
            </p>
          </div>

          {chatChiusa ? (
            <div className="p-8 text-center">
              <p className="text-gray-400 text-sm">Questa conversazione è stata chiusa.</p>
              <p className="text-gray-300 text-xs mt-1">Il soggiorno è terminato. Grazie per averci scelto!</p>
              {/* Mostra storico in sola lettura */}
              <div className="mt-4 max-h-[400px] overflow-y-auto text-left space-y-2">
                {chat.messaggi.map(m => (
                  <div key={m.id} className={`flex ${m.mittente === 'GUEST' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-xl text-xs opacity-60 ${
                      m.mittente === 'GUEST' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {m.testo}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <GuestChatBox chatId={params.id} messaggiIniziali={chat.messaggi} hostNome={chat.host.nomeAzienda} />
          )}
        </div>
      </div>
    </div>
  )
}
