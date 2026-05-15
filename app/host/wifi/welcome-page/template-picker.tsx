'use client'

import { SPLASH_TEMPLATES, type SplashTemplate } from '@/lib/wifi/splash-templates'
import type { SplashConfig } from '@/lib/wifi/splash-config'

interface Props {
  currentTemplate: SplashConfig['template']
  onApply: (id: SplashTemplate['id']) => void
}

export default function TemplatePicker({ currentTemplate, onApply }: Props) {
  return (
    <div className="bg-white border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Template</h2>
      <p className="text-xs text-gray-500 mb-4">
        Punto di partenza con un click. Le tue personalizzazioni (logo, titolo, link) vengono preservate.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SPLASH_TEMPLATES.map(tpl => {
          const active = currentTemplate === tpl.id
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onApply(tpl.id)}
              className={`text-left p-3 border-2 rounded-lg transition-all ${
                active
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl shrink-0">{tpl.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">{tpl.nome}</h3>
                    {active && <span className="text-xs text-indigo-600 font-medium shrink-0">✓ attivo</span>}
                  </div>
                  <p className="text-xs text-gray-500 leading-snug mb-2">{tpl.descrizione}</p>
                  <div className="flex gap-1">
                    {tpl.swatches.map((c, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded border border-gray-200"
                        style={{ background: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
