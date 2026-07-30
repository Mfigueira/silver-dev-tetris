import { useRef } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from '../anim/gsap'
import { GAME_OVER, OVERLAY } from '../anim/timings'
import type { GameStatus } from '../game/types'

interface GameOverlayProps {
  status: GameStatus
  score: number
  highScore: number
}

function isVisible(status: GameStatus): boolean {
  return status === 'idle' || status === 'paused' || status === 'gameover'
}

export function GameOverlay({ status, score, highScore }: GameOverlayProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // The overlay stays mounted so it can animate out. During the exit it keeps
  // showing the status it was displaying, rather than blanking the instant the
  // game resumes.
  const visible = isVisible(status)
  const lastVisible = useRef<GameStatus>(status)
  if (visible) lastVisible.current = status
  const shown = visible ? status : lastVisible.current

  useGSAP(
    () => {
      const root = rootRef.current
      const panel = panelRef.current
      if (!root || !panel) return

      if (prefersReducedMotion()) {
        gsap.set(root, { autoAlpha: visible ? 1 : 0 })
        gsap.set(panel, { scale: 1, y: 0, opacity: 1 })
        return
      }

      if (!visible) {
        gsap
          .timeline()
          .to(panel, { scale: 0.94, opacity: 0, duration: OVERLAY.out, ease: 'power2.in', overwrite: 'auto' }, 0)
          .to(root, { autoAlpha: 0, duration: OVERLAY.out, ease: 'power2.in', overwrite: 'auto' }, 0)
        return
      }

      // Game over waits for the stack to start falling before covering it.
      const delay = status === 'gameover' ? GAME_OVER.overlayDelay : 0

      gsap
        .timeline({ delay })
        .to(root, { autoAlpha: 1, duration: OVERLAY.in, ease: 'power2.out', overwrite: 'auto' }, 0)
        .fromTo(
          panel,
          { scale: 0.92, y: 8, opacity: 0 },
          { scale: 1, y: 0, opacity: 1, duration: OVERLAY.in, ease: 'back.out(1.7)', overwrite: 'auto' },
          0,
        )
    },
    // Deliberately no revertOnUpdate: reverting would snap the overlay back to
    // hidden before the exit tween starts, so it would vanish instead of fading.
    // overwrite: 'auto' handles rapid pause/resume instead.
    { dependencies: [status], scope: rootRef },
  )

  return (
    <div
      ref={rootRef}
      className="invisible absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/75 text-center opacity-0 backdrop-blur-sm"
    >
      <div ref={panelRef} className="flex flex-col items-center gap-2 will-change-transform">
        {shown === 'idle' && (
          <>
            <h2 className="text-2xl font-extrabold">Tetris.dev</h2>
            <p className="text-sm text-white/60">Press Enter to start</p>
          </>
        )}
        {shown === 'paused' && (
          <>
            <h2 className="text-2xl font-extrabold">Paused</h2>
            <p className="text-sm text-white/60">Press P to resume</p>
          </>
        )}
        {shown === 'gameover' && (
          <>
            <h2 className="text-2xl font-extrabold text-red-400">Game Over</h2>
            <p className="text-sm text-white/70">Score: {score}</p>
            {score >= highScore && score > 0 && (
              <p className="text-sm font-semibold text-yellow-400">New high score!</p>
            )}
            <p className="mt-1 text-sm text-white/60">Press Enter to play again</p>
          </>
        )}
      </div>
    </div>
  )
}
