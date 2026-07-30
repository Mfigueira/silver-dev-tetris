import { useRef } from 'react'
import type { RefObject } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from './gsap'
import type { GameStatus } from '../game/types'

const BURST = {
  ringScale: 6.5,
  ringDuration: 0.9,
  textIn: 0.5,
  textHold: 0.35,
  textOut: 0.35,
  /** Border flashes per burst. */
  borderPulses: 3,
  borderPulse: 0.12,
  reducedHold: 0.9,
}

interface LevelUpArgs {
  rootRef: RefObject<HTMLDivElement | null>
  level: number
  status: GameStatus
}

/**
 * Plays a burst when the level climbs. The level only ever rises on
 * COMMIT_CLEAR, so this always starts just after the line-clear timeline has
 * finished and the two never compete for the board.
 */
export function useLevelUp({ rootRef, level, status }: LevelUpArgs) {
  const previousLevel = useRef(level)

  useGSAP(
    () => {
      const root = rootRef.current
      const climbed = level > previousLevel.current
      previousLevel.current = level

      // Suppress on game over: a final clear can cross a level threshold and
      // land on the game-over overlay at the same moment.
      if (!root || !climbed || status === 'gameover') return

      const ring = root.querySelector('[data-levelup-ring]')
      const text = root.querySelector('[data-levelup-text]')
      const border = root.querySelector('[data-levelup-border]')

      if (prefersReducedMotion()) {
        gsap
          .timeline()
          .set(root, { autoAlpha: 1 })
          .set(text, { opacity: 1, scale: 1 })
          .to(text, { opacity: 0, duration: 0.3, delay: BURST.reducedHold })
          .set(root, { autoAlpha: 0 })
        return
      }

      gsap
        .timeline()
        .set(root, { autoAlpha: 1 })
        .fromTo(
          ring,
          { scale: 0.2, opacity: 0.85 },
          { scale: BURST.ringScale, opacity: 0, duration: BURST.ringDuration, ease: 'power2.out' },
          0,
        )
        .fromTo(
          border,
          { opacity: 0 },
          {
            opacity: 1,
            duration: BURST.borderPulse,
            repeat: BURST.borderPulses * 2 - 1,
            yoyo: true,
            ease: 'sine.inOut',
          },
          0,
        )
        .fromTo(
          text,
          { scale: 0.4, y: 12, opacity: 0 },
          { scale: 1, y: 0, opacity: 1, duration: BURST.textIn, ease: 'back.out(2)' },
          0.05,
        )
        // A slow swell during the hold keeps it from looking frozen.
        .to(text, { scale: 1.06, duration: BURST.textHold, ease: 'sine.inOut' })
        .to(text, { opacity: 0, scale: 0.92, duration: BURST.textOut, ease: 'power2.in' }, '+=0.15')
        .set(root, { autoAlpha: 0 })
    },
    { dependencies: [level], scope: rootRef, revertOnUpdate: true },
  )
}
