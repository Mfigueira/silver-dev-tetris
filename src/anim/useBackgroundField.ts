import { useRef } from 'react'
import type { RefObject } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from './gsap'

/**
 * Small enough that the whole field costs one transform-and-opacity tween per
 * mote. This is the only animation that runs continuously, so it sets the
 * steady-state frame budget for everything else on the page.
 */
export const MOTE_COUNT = 24

const FIELD = {
  /** Seconds for a mote to cross the viewport, before level scaling. */
  riseRange: [26, 58] as [number, number],
  /** Sideways sway, as a yoyo so it returns to its start seamlessly. */
  swayRange: [12, 46] as [number, number],
  swayDurationRange: [9, 20] as [number, number],
  /** Padding beyond the viewport where motes wrap, so they never pop in view. */
  margin: 80,
  /** Field speed at level 1, and how much each level adds. */
  baseSpeed: 1,
  speedPerLevel: 0.07,
  maxSpeed: 2.6,
  speedRamp: 1.6,
  /** A level-up shoves the field forward briefly. */
  surgeSpeed: 5,
  surgeIn: 0.25,
  surgeOut: 1.7,
}

function levelSpeed(level: number): number {
  return Math.min(FIELD.maxSpeed, FIELD.baseSpeed + (level - 1) * FIELD.speedPerLevel)
}

interface BackgroundFieldArgs {
  fieldRef: RefObject<HTMLDivElement | null>
  level: number
}

export function useBackgroundField({ fieldRef, level }: BackgroundFieldArgs) {
  // The parent timeline is the single speed control for the whole field.
  const fieldTl = useRef<gsap.core.Timeline | null>(null)
  const previousLevel = useRef(level)

  useGSAP(
    () => {
      const field = fieldRef.current
      // Purely decorative and nothing waits on it, so reduced motion can skip
      // it outright rather than play a shortened version.
      if (!field || prefersReducedMotion()) return

      const motes = gsap.utils.toArray<HTMLElement>('[data-mote]', field)
      if (motes.length === 0) return

      // Cached rather than read per frame: window.innerHeight in a modifier
      // would mean a layout read per mote per frame.
      const view = { height: window.innerHeight }
      const onResize = () => {
        view.height = window.innerHeight
      }
      window.addEventListener('resize', onResize, { passive: true })

      const tl = gsap.timeline()
      fieldTl.current = tl

      motes.forEach((mote) => {
        // Travel matches the wrap band exactly, so the loop point is invisible.
        const travel = view.height + FIELD.margin * 2

        gsap.set(mote, {
          xPercent: -50,
          yPercent: -50,
          x: gsap.utils.random(0, window.innerWidth),
          y: gsap.utils.random(-FIELD.margin, view.height + FIELD.margin),
          rotation: gsap.utils.random(0, 360),
        })

        // Rise and spin. A full 360 per cycle means the orientation matches at
        // the loop point too, so nothing snaps when the tween repeats.
        tl.add(
          gsap.to(mote, {
            y: `-=${travel}`,
            rotation: gsap.utils.random(['+=360', '-=360']),
            duration: gsap.utils.random(...FIELD.riseRange),
            ease: 'none',
            repeat: -1,
            modifiers: {
              // Wrapping in a modifier keeps one endless tween per mote instead
              // of churning tweens as motes leave the viewport.
              y: gsap.utils.unitize(gsap.utils.wrap(-FIELD.margin, view.height + FIELD.margin), 'px'),
            },
          }),
          0,
        )

        // Sway on its own tween: a separate property, and yoyo returns it to the
        // start value so there is no jump on repeat.
        tl.add(
          gsap.to(mote, {
            x: `+=${gsap.utils.random(...FIELD.swayRange) * gsap.utils.random([1, -1])}`,
            duration: gsap.utils.random(...FIELD.swayDurationRange),
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          }),
          0,
        )
      })

      tl.timeScale(levelSpeed(level))

      return () => {
        window.removeEventListener('resize', onResize)
        fieldTl.current = null
      }
    },
    { dependencies: [], scope: fieldRef },
  )

  // Speed follows the level without rebuilding the field, which would reshuffle
  // every mote's position mid-flight. Levelling up surges through first. Both
  // live in one effect because they write the same timeScale and would fight if
  // they were separate.
  useGSAP(
    () => {
      const tl = fieldTl.current
      if (!tl) return

      const climbed = level > previousLevel.current
      previousLevel.current = level
      const settled = levelSpeed(level)

      if (!climbed) {
        gsap.to(tl, { timeScale: settled, duration: FIELD.speedRamp, ease: 'power2.out' })
        return
      }

      gsap
        .timeline()
        .to(tl, { timeScale: FIELD.surgeSpeed, duration: FIELD.surgeIn, ease: 'power2.in' })
        .to(tl, { timeScale: settled, duration: FIELD.surgeOut, ease: 'power2.out' })
    },
    { dependencies: [level] },
  )
}
