'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'

interface BodyMapProps {
  zoneSelezionate: string[]
  onChange: (zone: string[]) => void
  tipo: 'trattate' | 'evitare' // colore diverso
  disabilitato?: boolean
}

const ZONE_CORPO = [
  'testa',
  'viso',
  'collo',
  'spalle',
  'schiena',
  'petto',
  'addome',
  'fianchi',
  'mani',
  'braccia',
  'avambracci',
  'gambe',
  'piedi',
  'caviglie',
]

/**
 * Mappa corpo interattiva con zone selezionabili.
 * Consente di specificare zone da trattare o evitare.
 */
export function BodyMap({ zoneSelezionate, onChange, tipo, disabilitato }: BodyMapProps) {
  const t = useTranslations('spa.bodyMap')
  const [view, setView] = useState<'front' | 'back'>('front')

  const colore = tipo === 'trattate' ? 'bg-green-100 hover:bg-green-200' : 'bg-red-100 hover:bg-red-200'
  const borderColore = tipo === 'trattate' ? 'border-green-500' : 'border-red-500'

  const toggleZona = (zona: string) => {
    if (disabilitato) return
    if (zoneSelezionate.includes(zona)) {
      onChange(zoneSelezionate.filter(z => z !== zona))
    } else {
      onChange([...zoneSelezionate, zona])
    }
  }

  const ZONE_LABELS: Record<string, string> = {
    testa: t('head'),
    viso: t('face'),
    collo: t('neck'),
    spalle: t('shoulders'),
    petto: t('chest'),
    addome: t('abdomen'),
    fianchi: t('hips'),
    braccia: t('arms'),
    avambracci: t('forearms'),
    mani: t('hands'),
    gambe: t('legs'),
    caviglie: t('ankles'),
    piedi: t('feet'),
    schiena: t('back'),
  }

  // Mapping zone a posizioni approssimative nel SVG
  const zoneMap: Record<string, { front?: string; back?: string }> = {
    testa: { front: 'M100,30 L130,30 L130,70 L100,70 Z' },
    viso: { front: 'M105,40 L125,40 L125,65 L105,65 Z' },
    collo: { front: 'M110,70 L120,70 L120,85 L110,85 Z' },
    spalle: { front: 'M80,85 L140,85 L140,100 L80,100 Z' },
    petto: { front: 'M90,100 L130,100 L130,150 L90,150 Z' },
    addome: { front: 'M90,150 L130,150 L130,200 L90,200 Z' },
    fianchi: { front: 'M75,200 L145,200 L145,230 L75,230 Z' },
    braccia: { front: 'M60,100 L85,100 L85,180 L70,180 M135,100 L160,100 L160,180 L145,180' },
    avambracci: { front: 'M65,180 L80,180 L80,240 L65,240 M140,180 L155,180 L155,240 L140,240 Z' },
    mani: { front: 'M60,240 L85,240 L85,270 L60,270 M135,240 L160,240 L160,270 L135,270 Z' },
    gambe: { front: 'M85,230 L105,230 L105,320 L85,320 M115,230 L135,230 L135,320 L115,320 Z' },
    caviglie: { front: 'M85,320 L105,320 L105,340 L85,340 M115,320 L135,320 L135,340 L115,340 Z' },
    piedi: { front: 'M80,340 L110,340 L110,370 L80,370 M110,340 L140,340 L140,370 L110,370 Z' },
    schiena: { back: 'M90,100 L130,100 L130,200 L90,200 Z' },
  }

  return (
    <div className="space-y-4">
      {/* Selector front/back */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setView('front')}
          className={`px-4 py-2 rounded font-medium transition ${
            view === 'front' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          disabled={disabilitato}
        >
          {/* TODO: i18n */}
          Fronte
        </button>
        <button
          onClick={() => setView('back')}
          className={`px-4 py-2 rounded font-medium transition ${
            view === 'back' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          disabled={disabilitato}
        >
          {/* TODO: i18n */}
          Retro
        </button>
      </div>

      {/* SVG interattivo */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <svg viewBox="0 0 200 400" className="w-full max-w-xs mx-auto" style={{ aspectRatio: '1/2' }}>
          {/* Corpo stilizzato */}
          {view === 'front' && (
            <>
              {/* Testa */}
              <circle cx="100" cy="50" r="20" fill="#f5f5f5" stroke="#ccc" strokeWidth="1" />
              {/* Corpo */}
              <rect x="85" y="75" width="30" height="80" fill="#f5f5f5" stroke="#ccc" strokeWidth="1" rx="5" />
              {/* Braccia */}
              <line x1="85" y1="85" x2="50" y2="110" stroke="#ccc" strokeWidth="8" />
              <line x1="115" y1="85" x2="150" y2="110" stroke="#ccc" strokeWidth="8" />
              {/* Gambe */}
              <line x1="90" y1="155" x2="80" y2="280" stroke="#ccc" strokeWidth="10" />
              <line x1="110" y1="155" x2="120" y2="280" stroke="#ccc" strokeWidth="10" />
              {/* Piedi */}
              <ellipse cx="75" cy="295" rx="8" ry="12" fill="#f5f5f5" stroke="#ccc" strokeWidth="1" />
              <ellipse cx="125" cy="295" rx="8" ry="12" fill="#f5f5f5" stroke="#ccc" strokeWidth="1" />

              {/* Zone cliccabili */}
              {ZONE_CORPO.map(zona => {
                if (!zoneMap[zona]?.front) return null
                const isSelected = zoneSelezionate.includes(zona)

                return (
                  <motion.g key={zona} onClick={() => toggleZona(zona)} style={{ cursor: disabilitato ? 'default' : 'pointer' }}>
                    <path
                      d={zoneMap[zona].front!}
                      fill={isSelected ? (tipo === 'trattate' ? '#22c55e' : '#ef4444') : '#f5f5f5'}
                      fillOpacity={isSelected ? 0.7 : 0.1}
                      stroke={isSelected ? (tipo === 'trattate' ? '#16a34a' : '#dc2626') : '#d1d5db'}
                      strokeWidth="1"
                      className={disabilitato ? '' : 'hover:fill-opacity-50 transition'}
                    />
                    {isSelected && (
                      <text x="100" y="100" fontSize="10" fill="white" textAnchor="middle" pointerEvents="none">
                        ✓
                      </text>
                    )}
                  </motion.g>
                )
              })}
            </>
          )}

          {/* Back view */}
          {view === 'back' && (
            <>
              {/* Testa */}
              <circle cx="100" cy="50" r="20" fill="#f5f5f5" stroke="#ccc" strokeWidth="1" />
              {/* Schiena */}
              <rect x="85" y="75" width="30" height="100" fill="#f5f5f5" stroke="#ccc" strokeWidth="1" rx="5" />
              {/* Braccia retro */}
              <line x1="85" y1="85" x2="50" y2="110" stroke="#ccc" strokeWidth="8" />
              <line x1="115" y1="85" x2="150" y2="110" stroke="#ccc" strokeWidth="8" />
              {/* Gambe retro */}
              <line x1="90" y1="175" x2="80" y2="280" stroke="#ccc" strokeWidth="10" />
              <line x1="110" y1="175" x2="120" y2="280" stroke="#ccc" strokeWidth="10" />
              {/* Piedi retro */}
              <ellipse cx="75" cy="295" rx="8" ry="12" fill="#f5f5f5" stroke="#ccc" strokeWidth="1" />
              <ellipse cx="125" cy="295" rx="8" ry="12" fill="#f5f5f5" stroke="#ccc" strokeWidth="1" />

              {/* Zona schiena */}
              {zoneMap.schiena?.back && (
                <motion.path
                  d={zoneMap.schiena.back}
                  fill={zoneSelezionate.includes('schiena') ? (tipo === 'trattate' ? '#22c55e' : '#ef4444') : '#f5f5f5'}
                  fillOpacity={zoneSelezionate.includes('schiena') ? 0.7 : 0.1}
                  stroke={zoneSelezionate.includes('schiena') ? (tipo === 'trattate' ? '#16a34a' : '#dc2626') : '#d1d5db'}
                  strokeWidth="1"
                  onClick={() => toggleZona('schiena')}
                  style={{ cursor: disabilitato ? 'default' : 'pointer' }}
                  className={disabilitato ? '' : 'hover:fill-opacity-50 transition'}
                />
              )}
            </>
          )}
        </svg>
      </div>

      {/* Label zone selezionate */}
      {zoneSelezionate.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {zoneSelezionate.map(zona => (
            <div
              key={zona}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded text-sm font-medium ${
                tipo === 'trattate' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {ZONE_LABELS[zona] || zona.charAt(0).toUpperCase() + zona.slice(1)}
              <button
                onClick={() => toggleZona(zona)}
                className="ml-1 hover:opacity-70 transition"
                disabled={disabilitato}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
