import type { Variants, Transition } from 'framer-motion'

/**
 * Reusable Framer Motion variants for Otium PMS.
 *
 * Rules:
 * - User actions: < 200ms
 * - State transitions: 200-300ms
 * - Never > 400ms
 * - Always respect prefers-reduced-motion
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Check if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Returns empty variants if reduced motion is preferred */
export function safeVariants(variants: Variants): Variants {
  if (typeof window !== 'undefined' && prefersReducedMotion()) {
    return { initial: {}, animate: {}, exit: {} }
  }
  return variants
}

// ─── Transitions ────────────────────────────────────────────────────────────

export const TRANSITION_FAST: Transition = { duration: 0.15, ease: 'easeOut' }
export const TRANSITION_NORMAL: Transition = { duration: 0.2, ease: 'easeOut' }
export const TRANSITION_SLOW: Transition = { duration: 0.3, ease: 'easeOut' }
export const TRANSITION_SPRING: Transition = { type: 'spring', damping: 25, stiffness: 300 }
export const TRANSITION_BOUNCE: Transition = { type: 'spring', damping: 12, stiffness: 200 }

// ─── Fade in from bottom (cards appearing) ──────────────────────────────────

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: TRANSITION_NORMAL },
  exit: { opacity: 0, y: -8, transition: TRANSITION_FAST },
}

// ─── Fade in simple ─────────────────────────────────────────────────────────

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: TRANSITION_FAST },
  exit: { opacity: 0, transition: TRANSITION_FAST },
}

// ─── Slide in from left (sidebar mobile, panels) ───────────────────────────

export const slideInLeft: Variants = {
  initial: { x: -280, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: TRANSITION_SPRING },
  exit: { x: -280, opacity: 0, transition: { duration: 0.2 } },
}

// ─── Slide in from right (panels, drawers) ──────────────────────────────────

export const slideInRight: Variants = {
  initial: { x: 280, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: TRANSITION_SPRING },
  exit: { x: 280, opacity: 0, transition: { duration: 0.2 } },
}

// ─── Scale in (modals, dialogs, popovers) ───────────────────────────────────

export const scaleIn: Variants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: TRANSITION_FAST },
  exit: { scale: 0.95, opacity: 0, transition: TRANSITION_FAST },
}

// ─── Scale in with bounce (success check, completion) ───────────────────────

export const scaleInBounce: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: TRANSITION_BOUNCE },
  exit: { scale: 0, opacity: 0, transition: TRANSITION_FAST },
}

// ─── Stagger children (lists, grids) ────────────────────────────────────────

export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05 } },
}

export const staggerContainerSlow: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: TRANSITION_NORMAL },
}

// ─── Collapse / expand (accordion, collapsible sections) ────────────────────

export const collapse: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: 0.2, ease: 'easeInOut' } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.15, ease: 'easeInOut' } },
}

// ─── Pulse (badge counter update) ───────────────────────────────────────────

export const pulse: Variants = {
  animate: { scale: [1, 1.15, 1], transition: { duration: 0.3 } },
}

// ─── Horizontal slide (stepper transitions) ─────────────────────────────────

export function slideHorizontal(direction: 1 | -1): Variants {
  return {
    initial: { x: direction * 50, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: TRANSITION_NORMAL },
    exit: { x: direction * -50, opacity: 0, transition: TRANSITION_FAST },
  }
}

// ─── Backdrop ───────────────────────────────────────────────────────────────

export const backdrop: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}
