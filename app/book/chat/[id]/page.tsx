import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ChatGuest } from '@/components/chat/chat-guest'

export const metadata = { title: 'Chat — Otium' }

export default async function GuestChatPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = await paramsPromise

  const chat = await prisma.chat.findUnique({
    where: { id },
    include: {
      messaggi: {
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
      prenotazione: {
        select: {
          id: true,
          guestNome: true,
          guestCognome: true,
          stato: true,
          strutturaId: true,
          struttura: {
            select: { nome: true, logo: true, colorePrimario: true },
          },
        },
      },
      host: { select: { nomeAzienda: true } },
    },
  })

  if (!chat) notFound()

  const chatChiusa = ['COMPLETATA', 'ANNULLATA', 'NO_SHOW'].includes(chat.prenotazione.stato)

  // Closed chat: read-only message history
  if (chatChiusa) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">{chat.host.nomeAzienda}</p>
            <p className="text-xs text-slate-400">Conversazione chiusa</p>
          </div>
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-slate-500">Questa conversazione è stata chiusa.</p>
            <p className="text-xs text-slate-400 mt-1">Il soggiorno è terminato. Grazie per averci scelto!</p>
          </div>
          {chat.messaggi.length > 0 && (
            <div className="px-5 pb-5 max-h-[400px] overflow-y-auto space-y-2">
              {chat.messaggi.map(m => (
                <div key={m.id} className={`flex ${m.mittente === 'GUEST' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-3 py-2 rounded-xl text-xs opacity-60 ${
                    m.mittente === 'GUEST' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {m.testo}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const backHref = chat.prenotazione.strutturaId
    ? `/book/${chat.prenotazione.strutturaId}`
    : null

  return (
    <ChatGuest
      chatId={id}
      messaggiIniziali={chat.messaggi}
      hostNome={chat.host.nomeAzienda}
      strutturaNome={chat.prenotazione.struttura?.nome}
      logo={chat.prenotazione.struttura?.logo}
      colorePrimario={chat.prenotazione.struttura?.colorePrimario}
      backHref={backHref}
    />
  )
}
