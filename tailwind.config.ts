import type { Config } from 'tailwindcss'

/**
 * Design tokens — Otium PMS
 *
 * Tutti i colori/shadow/radius sono esposti come `var(--token)` così che
 * il dark mode e il custom domain white-label (che overridano le CSS vars
 * al runtime) funzionino senza cambi di classi.
 *
 * Namespace primary (nuovo)           + brand (alias legacy, 1760+ occorrenze)
 * Namespace neutral (nuovo, stone)    + gray (alias legacy)
 * Namespace accent (nuovo, amber)
 * Namespace surface, text, border     — tokens semantici
 * Namespace success/warning/error/info— tokens semantici a scala
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ── Colors ──────────────────────────────────────────────────────── */
      colors: {
        /* Primary (indigo) — NEW */
        primary: {
          50:  'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
          950: 'var(--color-primary-950)',
          DEFAULT: 'var(--color-primary-600)',
        },

        /* Brand — alias legacy verso primary */
        brand: {
          50:  'var(--color-brand-50)',
          100: 'var(--color-brand-100)',
          200: 'var(--color-brand-200)',
          300: 'var(--color-brand-300)',
          400: 'var(--color-brand-400)',
          500: 'var(--color-brand-500)',
          600: 'var(--color-brand-600)',
          700: 'var(--color-brand-700)',
          800: 'var(--color-brand-800)',
          900: 'var(--color-brand-900)',
          950: 'var(--color-brand-950)',
        },

        /* Accent (amber) — NEW */
        accent: {
          50:  'var(--color-accent-50)',
          100: 'var(--color-accent-100)',
          200: 'var(--color-accent-200)',
          300: 'var(--color-accent-300)',
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
          DEFAULT: 'var(--color-accent-500)',
        },

        /* Neutral (stone, warm) — NEW */
        neutral: {
          25:  'var(--color-neutral-25)',
          50:  'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          150: 'var(--color-neutral-150)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
          950: 'var(--color-neutral-950)',
        },

        /* Gray — alias legacy verso neutral (stone warm, non più zinc cool) */
        gray: {
          50:  'var(--color-gray-50)',
          100: 'var(--color-gray-100)',
          200: 'var(--color-gray-200)',
          300: 'var(--color-gray-300)',
          400: 'var(--color-gray-400)',
          500: 'var(--color-gray-500)',
          600: 'var(--color-gray-600)',
          700: 'var(--color-gray-700)',
          800: 'var(--color-gray-800)',
          900: 'var(--color-gray-900)',
          950: 'var(--color-gray-950)',
        },

        /* Semantic scales */
        success: {
          50:  'var(--color-success-50)',
          100: 'var(--color-success-100)',
          200: 'var(--color-success-200)',
          500: 'var(--color-success-500)',
          600: 'var(--color-success-600)',
          700: 'var(--color-success-700)',
          DEFAULT: 'var(--color-success-500)',
        },
        warning: {
          50:  'var(--color-warning-50)',
          100: 'var(--color-warning-100)',
          200: 'var(--color-warning-200)',
          500: 'var(--color-warning-500)',
          600: 'var(--color-warning-600)',
          700: 'var(--color-warning-700)',
          DEFAULT: 'var(--color-warning-500)',
        },
        error: {
          50:  'var(--color-error-50)',
          100: 'var(--color-error-100)',
          200: 'var(--color-error-200)',
          500: 'var(--color-error-500)',
          600: 'var(--color-error-600)',
          700: 'var(--color-error-700)',
          DEFAULT: 'var(--color-error-500)',
        },
        info: {
          50:  'var(--color-info-50)',
          100: 'var(--color-info-100)',
          200: 'var(--color-info-200)',
          500: 'var(--color-info-500)',
          600: 'var(--color-info-600)',
          700: 'var(--color-info-700)',
          DEFAULT: 'var(--color-info-500)',
        },

        /* Semantic tokens (non-scala) — surfaces, text, border */
        surface: {
          app:       'var(--surface-app)',
          primary:   'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
          tertiary:  'var(--surface-tertiary)',
          elevated:  'var(--surface-elevated)',
          overlay:   'var(--surface-overlay)',
          sidebar:   'var(--surface-sidebar)',
        },

        text: {
          primary:    'var(--text-primary)',
          secondary:  'var(--text-secondary)',
          tertiary:   'var(--text-tertiary)',
          disabled:   'var(--text-disabled)',
          'on-primary': 'var(--text-on-primary)',
          'on-accent':  'var(--text-on-accent)',
          link:        'var(--text-link)',
          'link-hover': 'var(--text-link-hover)',
        },

        border: {
          DEFAULT: 'var(--border-default)',
          subtle:  'var(--border-subtle)',
          hover:   'var(--border-hover)',
          focus:   'var(--border-focus)',
          error:   'var(--border-error)',
        },

        /* PMS (legacy — sidebar dark, da migrare) */
        pms: {
          sidebar:    '#0f172a',
          sidebarhvr: '#1e293b',
          sidebarfg:  'rgba(255,255,255,0.60)',
          body:       'var(--surface-secondary)',
        },
      },

      /* ── Font families ───────────────────────────────────────────────────
         - sans: Inter — UI, body, dashboard (unica famiglia per la dashboard)
         - serif: DM Serif Display — booking pubblico + email premium
         - heading: alias di sans (la dashboard host resta tutta sans-serif)
      */
      fontFamily: {
        sans:    ['var(--font-sans)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif:   ['var(--font-serif)', 'Georgia', '"Times New Roman"', 'serif'],
        heading: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },

      /* ── Font sizes (14px base for SaaS dashboard) ───────────────────── */
      fontSize: {
        'xs':   ['0.786rem',  { lineHeight: '1.3' }],   // ~11px
        'sm':   ['0.857rem',  { lineHeight: '1.4' }],   // ~12px
        'base': ['1rem',      { lineHeight: '1.5' }],   // 14px (root)
        'md':   ['1.071rem',  { lineHeight: '1.5' }],   // ~15px
        'lg':   ['1.143rem',  { lineHeight: '1.45' }],  // ~16px
        'xl':   ['1.286rem',  { lineHeight: '1.4' }],   // ~18px
        '2xl':  ['1.571rem',  { lineHeight: '1.35' }],  // ~22px
        '3xl':  ['2rem',      { lineHeight: '1.3' }],   // ~28px
        '4xl':  ['2.571rem',  { lineHeight: '1.2' }],   // ~36px
      },

      /* ── Border radius ───────────────────────────────────────────────── */
      borderRadius: {
        xs:   'var(--radius-xs)',
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },

      /* ── Box shadows ─────────────────────────────────────────────────── */
      boxShadow: {
        xs:           'var(--shadow-xs)',
        sm:           'var(--shadow-sm)',
        md:           'var(--shadow-md)',
        lg:           'var(--shadow-lg)',
        xl:           'var(--shadow-xl)',
        card:         'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        topbar:       'var(--shadow-topbar)',
        dropdown:     'var(--shadow-dropdown)',
        focus:        'var(--shadow-focus)',
        'focus-error':'var(--shadow-focus-error)',
      },

      /* ── Background images: gradient + KPI card sfondi ─────────────── */
      backgroundImage: {
        'gradient-primary':       'var(--gradient-primary)',
        'gradient-primary-light': 'var(--gradient-primary-light)',
        'gradient-success':       'var(--gradient-success)',
        'gradient-info':          'var(--gradient-info)',
        'gradient-warning':       'var(--gradient-warning)',
        'gradient-error':         'var(--gradient-error)',
        'gradient-violet':        'var(--gradient-violet)',
        'kpi-indigo':             'var(--kpi-indigo-bg)',
        'kpi-green':              'var(--kpi-green-bg)',
        'kpi-amber':              'var(--kpi-amber-bg)',
        'kpi-violet':             'var(--kpi-violet-bg)',
        'kpi-rose':               'var(--kpi-rose-bg)',
        'kpi-teal':               'var(--kpi-teal-bg)',
      },

      /* ── Transitions ─────────────────────────────────────────────────── */
      transitionDuration: {
        fast:   '120ms',
        normal: '200ms',
        slow:   '350ms',
      },
      transitionTimingFunction: {
        out:       'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out':  'cubic-bezier(0.65, 0, 0.35, 1)',
        spring:    'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
export default config
