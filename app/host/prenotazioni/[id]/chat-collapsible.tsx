'use client'

import { useState } from 'react'
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'

export default function ChatCollapsible({
  children,
  messaggiCount,
  nonLetti,
}: {
  children: React.ReactNode
  messaggiCount: number
  nonLetti: number
}) {
  const [aperta, setAperta] = useState(false)

  return (
    <div className="card">
      <button
        onClick={() => setAperta(v => !v)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-500" />
          <h2 className="text-base font-semibold text-gray-900">Chat con l&apos;ospite</h2>
          {messaggiCount > 0 && (
            <span className="text-xs text-gray-400">{messaggiCount} messaggi</span>
          )}
          {nonLetti > 0 && (
            <span className="w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
              {nonLetti}
            </span>
          )}
        </div>
        {aperta ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {aperta && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  )
}
