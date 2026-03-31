'use client'

import dynamic from 'next/dynamic'

// Caricato solo lato client: evita hydration mismatch
// perché ChatBox usa state, polling e date formatting locale-dipendente
const ChatBox = dynamic(() => import('./chat-box'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col h-[440px]">
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-400">Caricamento chat...</p>
      </div>
    </div>
  ),
})

export default ChatBox
