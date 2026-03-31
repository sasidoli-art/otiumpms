/**
 * Utility per ottimizzazioni di performance e lazy loading
 */

import dynamic from 'next/dynamic'
import React from 'react'

// ─── Componenti pesanti per lazy loading ─────────────────────────────────────

/**
 * Componente BodyMap per SPA (usa Framer Motion)
 */
export const BodyMap = dynamic(
  () => import('@/components/spa/body-map').then(mod => mod.BodyMap),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
  }
)

/**
 * Componente SignaturePad per SPA (usa Framer Motion)
 */
export const SignaturePad = dynamic(
  () => import('@/components/spa/signature-pad').then(mod => mod.SignaturePad),
  {
    ssr: false,
    loading: () => <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />,
  }
)

/**
 * Componente WaiverForm per SPA (usa Framer Motion)
 */
export const WaiverForm = dynamic(
  () => import('@/components/spa/waiver-spa-form').then(mod => mod.WaiverSpaForm),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
  }
)

/**
 * Componente PagamentoForm per SPA (usa Framer Motion)
 */
export const PagamentoForm = dynamic(
  () => import('@/components/spa/pagamento-spa-form').then(mod => mod.PagamentoSpaForm),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
  }
)

// Nota: I componenti PDFViewer e RevenueChart sono commentati perché non esistono ancora
// Saranno disponibili quando verranno creati i relativi componenti

// ─── Helper per ottimizzazioni ───────────────────────────────────────────────

/**
 * Debounce per ridurre chiamate frequenti (es. ricerca, resize)
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle per limitare frequenza chiamate (es. scroll, mousemove)
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Intersection Observer per lazy loading immagini
 */
export function createImageObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  return new IntersectionObserver((entries) => {
    entries.forEach(callback)
  }, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  })
}

/**
 * Formatta numero per performance (memoizzazione semplice)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num.toString()
}

// ─── Hook React per ottimizzazioni ───────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'

/**
 * Hook per debounce di valori (es. input di ricerca)
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook per memorizzazione di valori computati pesanti
 */
export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  const ref = useRef<{ value: T; deps: React.DependencyList }>()

  if (
    !ref.current ||
    deps.length !== ref.current.deps.length ||
    deps.some((dep, i) => dep !== ref.current!.deps[i])
  ) {
    ref.current = { value: factory(), deps }
  }

  return ref.current.value
}

/**
 * Hook per lazy loading di componenti con prefetching
 */
export function useLazyComponent<T>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  options: { ssr?: boolean } = { ssr: false }
) {
  const [Component, setComponent] = useState<React.ComponentType<T> | null>(null)

  useEffect(() => {
    let mounted = true
    
    const load = async () => {
      try {
        const module = await importFn()
        if (mounted) {
          setComponent(() => module.default)
        }
      } catch (error) {
        console.error('Failed to load component:', error)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [importFn])

  return Component
}
