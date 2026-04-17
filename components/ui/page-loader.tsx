'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Thin progress bar at the top of the page during navigation.
 * Shows when pathname changes. YouTube/GitHub style.
 *
 * Place in the root layout — it does NOT block content below.
 */
export function PageLoader() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const prevPathRef = useRef(pathname)

  useEffect(() => {
    // Path changed → start loading animation
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname
      setLoading(true)
      setProgress(30)

      // Simulate progress
      timerRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 90) { clearInterval(timerRef.current); return p }
          return p + Math.random() * 10
        })
      }, 200)

      // Complete after a short delay (content is already rendering)
      const done = setTimeout(() => {
        clearInterval(timerRef.current)
        setProgress(100)
        setTimeout(() => { setLoading(false); setProgress(0) }, 200)
      }, 400)

      return () => {
        clearInterval(timerRef.current)
        clearTimeout(done)
      }
    }
  }, [pathname])

  if (!loading && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[90] h-[2px]">
      <div
        className="h-full bg-brand-500 transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? '200ms' : '400ms',
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  )
}
