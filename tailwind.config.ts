import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ── Brand colors (indigo scale, mapped from CSS vars) ────────────── */
      colors: {
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
        surface: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          elevated: 'var(--bg-elevated)',
        },
        pms: {
          sidebar:    '#0f172a',
          sidebarhvr: '#1e293b',
          sidebarfg:  'rgba(255,255,255,0.60)',
          body:       'var(--bg-secondary)',
        },
      },

      /* ── Font families ───────────────────────────────────────────────── */
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['var(--font-montserrat)', 'Montserrat', 'system-ui', 'sans-serif'],
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
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },

      /* ── Box shadows ─────────────────────────────────────────────────── */
      boxShadow: {
        sm:       'var(--shadow-sm)',
        md:       'var(--shadow-md)',
        lg:       'var(--shadow-lg)',
        xl:       'var(--shadow-xl)',
        card:     'var(--shadow-card)',
        topbar:   'var(--shadow-topbar)',
        dropdown: 'var(--shadow-dropdown)',
        focus:    'var(--shadow-focus)',
      },

      /* ── Transitions ─────────────────────────────────────────────────── */
      transitionDuration: {
        fast:   '150ms',
        normal: '200ms',
        slow:   '300ms',
      },
    },
  },
  plugins: [],
}
export default config
