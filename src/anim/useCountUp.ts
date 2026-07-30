import { useRef } from 'react'
import type { RefObject } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from './gsap'

const COUNT = {
  duration: 0.45,
  popDuration: 0.4,
  popScale: 1.28,
}

interface CountUpOptions {
  /**
   * Minimum jump that earns a scale pop. Score ticks up by 1 on every soft drop,
   * and popping on those would be constant jitter, so only real gains qualify.
   */
  popThreshold: number
}

/**
 * Animates a number toward `value`, writing the text imperatively. The element's
 * text is owned entirely by this hook rather than by React, so the two never
 * fight over the same text node.
 *
 * Uses quickTo rather than a fresh gsap.to per change: score updates arrive as
 * often as every gravity tick, and this reuses a single tween instead of
 * allocating one each time.
 */
export function useCountUp(
  ref: RefObject<HTMLElement | null>,
  value: number,
  { popThreshold }: CountUpOptions,
) {
  const counter = useRef({ value })
  const setValue = useRef<((next: number) => void) | null>(null)
  const previous = useRef(value)

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return

      const render = () => {
        el.textContent = String(Math.round(counter.current.value))
      }
      render()

      setValue.current = gsap.quickTo(counter.current, 'value', {
        duration: COUNT.duration,
        ease: 'power2.out',
        onUpdate: render,
      })

      return () => {
        setValue.current = null
      }
    },
    { dependencies: [], scope: ref },
  )

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return

      const delta = value - previous.current
      previous.current = value

      if (prefersReducedMotion() || !setValue.current) {
        counter.current.value = value
        el.textContent = String(value)
        return
      }

      setValue.current(value)

      if (delta >= popThreshold) {
        gsap.fromTo(
          el,
          { scale: COUNT.popScale },
          { scale: 1, duration: COUNT.popDuration, ease: 'back.out(2.5)', overwrite: 'auto', clearProps: 'transform' },
        )
      }
    },
    { dependencies: [value] },
  )
}
