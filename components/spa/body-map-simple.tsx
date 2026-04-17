'use client'

import { useCallback } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

const ZONES = [
  { id: 'testa-viso', label: 'Testa / Viso' },
  { id: 'collo-spalle', label: 'Collo / Spalle' },
  { id: 'braccia', label: 'Braccia' },
  { id: 'petto-addome', label: 'Petto / Addome' },
  { id: 'schiena', label: 'Schiena' },
  { id: 'zona-lombare', label: 'Zona lombare' },
  { id: 'gambe', label: 'Gambe' },
  { id: 'piedi', label: 'Piedi' },
] as const

type ZoneId = (typeof ZONES)[number]['id']

interface Props {
  selectedZones: string[]
  onZonesChange: (zones: string[]) => void
  disabled?: boolean
}

// ─── Zone SVG paths ─────────────────────────────────────────────────────────
// ViewBox: 0 0 200 440. Figure is centred at x=100, proportions tuned for
// generous touch targets (each zone ≥ 44px effective at 300px render width).

const ZONE_PATHS: Record<ZoneId, string> = {
  // Head — rounded top, jaw taper
  'testa-viso':
    'M88,18 C88,8 112,8 112,18 L112,42 C112,52 88,52 88,42 Z',
  // Neck + shoulders — wide band across
  'collo-spalle':
    'M92,52 L108,52 L108,62 L140,72 L140,96 L60,96 L60,72 L92,62 Z',
  // Arms — two symmetric limbs
  'braccia':
    'M60,96 L46,96 C42,96 38,100 38,104 L30,190 C28,196 34,200 38,196 L52,104 L60,104 Z '
    + 'M140,96 L154,96 C158,96 162,100 162,104 L170,190 C172,196 166,200 162,196 L148,104 L140,104 Z',
  // Chest + abdomen — torso front
  'petto-addome':
    'M60,96 L140,96 L140,180 L60,180 Z',
  // Back — overlaid behind torso (selected from front view, visually rendered
  // as a strip inside the torso with a "back" visual cue)
  'schiena':
    'M68,104 L132,104 L132,166 L68,166 Z',
  // Lower back / lumbar
  'zona-lombare':
    'M64,180 L136,180 L132,218 L68,218 Z',
  // Legs — two symmetric limbs
  'gambe':
    'M68,218 L96,218 L90,360 L62,360 Z '
    + 'M104,218 L132,218 L138,360 L110,360 Z',
  // Feet
  'piedi':
    'M58,360 L94,360 L94,386 C94,396 58,396 58,386 Z '
    + 'M106,360 L142,360 L142,386 C142,396 106,396 106,386 Z',
}

// Draw order so "schiena" renders behind "petto-addome" when both are idle,
// but pops above when selected.
const DRAW_ORDER: ZoneId[] = [
  'schiena', 'testa-viso', 'collo-spalle', 'braccia',
  'petto-addome', 'zona-lombare', 'gambe', 'piedi',
]

// ─── Component ──────────────────────────────────────────────────────────────

export function BodyMapSimple({ selectedZones, onZonesChange, disabled }: Props) {
  const toggle = useCallback(
    (id: string) => {
      if (disabled) return
      onZonesChange(
        selectedZones.includes(id)
          ? selectedZones.filter(z => z !== id)
          : [...selectedZones, id],
      )
    },
    [selectedZones, onZonesChange, disabled],
  )

  const remove = useCallback(
    (id: string) => {
      if (disabled) return
      onZonesChange(selectedZones.filter(z => z !== id))
    },
    [selectedZones, onZonesChange, disabled],
  )

  return (
    <div className="flex flex-col items-center gap-4">
      {/* ─── SVG body ───────────────────────────────────────── */}
      <svg
        viewBox="0 0 200 410"
        className="w-full max-w-[300px]"
        role="group"
        aria-label="Mappa del corpo — seleziona le zone da evitare"
      >
        {/* Body outline silhouette (decorative) */}
        <path
          d={
            'M100,10 C114,10 116,22 116,30 L116,48 C116,54 112,56 108,56 '
            + 'L108,62 L144,72 C150,74 154,82 154,88 L154,96 C158,96 164,100 164,106 '
            + 'L172,192 C174,200 166,204 162,198 L150,108 L140,104 '
            + 'L140,180 L136,218 L138,360 L142,362 '
            + 'C146,364 148,400 106,400 L106,362 L110,360 '
            + 'L104,218 L100,218 '
            + 'L96,218 L90,360 L94,362 '
            + 'C98,364 94,400 58,400 L58,362 L62,360 '
            + 'L64,218 L60,180 L60,104 L50,108 '
            + 'L38,198 C34,204 26,200 28,192 L36,106 C36,100 42,96 46,96 '
            + 'L46,88 C46,82 50,74 56,72 L92,62 '
            + 'L92,56 C88,56 84,54 84,48 L84,30 C84,22 86,10 100,10 Z'
          }
          fill="none"
          className="stroke-gray-300 dark:stroke-gray-600"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Interactive zones */}
        {DRAW_ORDER.map(id => {
          const isSelected = selectedZones.includes(id)
          const zone = ZONES.find(z => z.id === id)!

          return (
            <g
              key={id}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`${zone.label}${isSelected ? ' — selezionata' : ''}`}
              aria-pressed={isSelected}
              onClick={() => toggle(id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(id) } }}
              className={`outline-none ${disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
            >
              <path
                d={ZONE_PATHS[id]}
                className={
                  isSelected
                    ? 'fill-orange-400/60 stroke-orange-500 dark:fill-orange-500/50 dark:stroke-orange-400'
                    : 'fill-transparent stroke-gray-300 dark:stroke-gray-600 hover:fill-orange-100/40 dark:hover:fill-orange-900/20'
                }
                strokeWidth={isSelected ? '2' : '1'}
                strokeDasharray={isSelected ? 'none' : '4 3'}
                strokeLinejoin="round"
                style={{
                  transition: 'fill 200ms ease, stroke 200ms ease, stroke-width 150ms ease',
                }}
              >
                {isSelected && (
                  <animate
                    attributeName="fill-opacity"
                    values="0.6;0.35;0.6"
                    dur="1.2s"
                    repeatCount="1"
                  />
                )}
              </path>

              {/* Focus ring (keyboard nav) */}
              <path
                d={ZONE_PATHS[id]}
                fill="none"
                stroke="transparent"
                strokeWidth="4"
                className="group-focus-visible:stroke-blue-500 focus-visible:stroke-blue-400"
                style={{ pointerEvents: 'none' }}
              />
            </g>
          )
        })}

        {/* Zone labels rendered on SVG for spatial context */}
        <ZoneLabel x={100} y={35} text="Testa" selected={selectedZones.includes('testa-viso')} />
        <ZoneLabel x={100} y={84} text="Collo" selected={selectedZones.includes('collo-spalle')} />
        <ZoneLabel x={34} y={155} text="Braccio" selected={selectedZones.includes('braccia')} rotate={-80} />
        <ZoneLabel x={100} y={140} text="Petto" selected={selectedZones.includes('petto-addome')} />
        <ZoneLabel x={100} y={135} text="Schiena" selected={selectedZones.includes('schiena')} dy={14} />
        <ZoneLabel x={100} y={200} text="Lombare" selected={selectedZones.includes('zona-lombare')} />
        <ZoneLabel x={78} y={295} text="Gamba" selected={selectedZones.includes('gambe')} rotate={-85} />
        <ZoneLabel x={100} y={384} text="Piedi" selected={selectedZones.includes('piedi')} />
      </svg>

      {/* ─── Removable chips ───────────────────────────────── */}
      {selectedZones.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {selectedZones.map(id => {
            const zone = ZONES.find(z => z.id === id)
            if (!zone) return null
            return (
              <button
                key={id}
                type="button"
                onClick={() => remove(id)}
                disabled={disabled}
                className={
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold '
                  + 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 '
                  + 'hover:bg-orange-200 dark:hover:bg-orange-900/60 '
                  + 'transition-colors disabled:opacity-50 disabled:pointer-events-none'
                }
                aria-label={`Rimuovi ${zone.label}`}
              >
                {zone.label}
                <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden="true">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function ZoneLabel({ x, y, text, selected, rotate, dy }: {
  x: number; y: number; text: string; selected: boolean; rotate?: number; dy?: number
}) {
  return (
    <text
      x={x}
      y={y}
      dy={dy}
      textAnchor="middle"
      fontSize="8"
      fontWeight={selected ? '700' : '500'}
      className={selected ? 'fill-orange-700 dark:fill-orange-300' : 'fill-gray-400 dark:fill-gray-500'}
      style={{
        pointerEvents: 'none',
        transition: 'fill 200ms ease',
        ...(rotate ? { transform: `rotate(${rotate}deg)`, transformOrigin: `${x}px ${y}px` } : {}),
      }}
    >
      {text}
    </text>
  )
}
