'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type Theme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

/**
 * ThemeToggle — singolo bottone che cicla light → dark → system → light.
 *
 * - Icona = stato corrente (Sun / Moon / Monitor)
 * - Hover tooltip = prossimo stato
 * - Animazione: rotazione 180° + crossfade dell'icona al cambio
 *
 * Uso: nel footer della sidebar o nella topbar.
 *
 *   <ThemeToggle />               // default size sm
 *   <ThemeToggle size="md" />     // più grande, per topbar
 */
export function ThemeToggle({
  size = 'sm',
  className,
}: {
  size?: 'sm' | 'md'
  className?: string
}) {
  const { theme, toggle } = useTheme()

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  const nextLabel: Record<Theme, string> = {
    light: 'Passa a tema scuro',
    dark: 'Passa a tema sistema',
    system: 'Passa a tema chiaro',
  }
  const stateLabel: Record<Theme, string> = {
    light: 'Tema chiaro',
    dark: 'Tema scuro',
    system: 'Tema sistema',
  }

  const dim = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'
  const iconPx = size === 'sm' ? 14 : 16

  return (
    <button
      type="button"
      onClick={toggle}
      title={nextLabel[theme]}
      aria-label={`${stateLabel[theme]}. ${nextLabel[theme]}`}
      className={cn(
        'inline-flex items-center justify-center rounded-md',
        'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700',
        'dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
        'transition-colors duration-fast ease-out',
        'focus-visible:outline-none focus-visible:shadow-focus',
        dim,
        className,
      )}
    >
      {/* Icona con rotazione: la `key` forza il remount → CSS animation parte da capo */}
      <Icon
        key={theme}
        width={iconPx}
        height={iconPx}
        className="animate-[themeIconIn_300ms_var(--ease-out)_both]"
      />
    </button>
  )
}

export default ThemeToggle
