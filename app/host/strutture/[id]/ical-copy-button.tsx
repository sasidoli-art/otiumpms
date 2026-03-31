'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface IcalCopyButtonProps {
  label: string
  url: string
}

export default function IcalCopyButton({ label, url }: IcalCopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback per browser senza clipboard API
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div>
      {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="input text-xs font-mono flex-1 bg-gray-50 cursor-text"
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" /> Copiato
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copia link
            </>
          )}
        </button>
      </div>
    </div>
  )
}
