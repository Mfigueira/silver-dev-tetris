import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

// Registered once, at import time, so it is in place before any useGSAP call runs.
gsap.registerPlugin(useGSAP)

const reduceMotionQuery =
  typeof window === 'undefined' ? null : window.matchMedia('(prefers-reduced-motion: reduce)')

/**
 * Deliberately not gsap.matchMedia(): the line-clear timeline drives game
 * progression through its onComplete, and matchMedia reverts the animations it
 * creates when a query stops matching, which would strand the game mid-clear.
 * Callers use this to pick shorter, calmer values instead of skipping the work.
 */
export function prefersReducedMotion(): boolean {
  return reduceMotionQuery?.matches ?? false
}

export { gsap, useGSAP }
