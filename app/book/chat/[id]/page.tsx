import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import GuestChatBox from './guest-chat-box'

export default async function GuestChatPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const chat = await prisma.chat.findUnique({
    where: { id: params.id },
    include: {
      messaggi: { orderBy: { createdAt: 'asc' } },
      prenotazione: {
        select: {
          guestNome: true, guestCognome: true,
          struttura: { select: { nome: true } },
        },
      },
      host: { select: { nomeAzienda: true } },
    },
  })

  if (!chat) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-xs text-gray-400 mb-1">Otium Week</div>
          <h1 className="text-xl font-bold text-gray-900">
            Chat con {chat.host.nomeAzienda}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {chat.prenotazione.struttura?.nome}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-600">
              Stai chattando come{' '}
              <span className="font-semibold text-gray-900">
                {chat.prenotazione.guestNome} {chat.prenotazione.guestCognome}
              </span>
            </p>
          </div>

          <GuestChatBox chatId={params.id} messaggiIniziali={chat.messaggi} hostNome={chat.host.nomeAzienda} />
        </div>
      </div>
    </div>
  )
}
