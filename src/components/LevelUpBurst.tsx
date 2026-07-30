import { useRef } from 'react'
import { useLevelUp } from '../anim/useLevelUp'
import type { GameStatus } from '../game/types'

interface LevelUpBurstProps {
  level: number
  status: GameStatus
}

/**
 * Sits over the board and celebrates a level change. The ring and the inset
 * border are rendered here rather than reaching into Board, so the burst owns
 * every element it animates.
 */
export function LevelUpBurst({ level, status }: LevelUpBurstProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useLevelUp({ rootRef, level, status })

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none invisible absolute inset-0 flex items-center justify-center opacity-0"
    >
      {/* Matches the board's own rounded rect so it reads as the border flashing. */}
      <div data-levelup-border className="absolute inset-0 rounded-xl border-2 border-cyan-300 opacity-0" />

      <div
        data-levelup-ring
        className="absolute h-16 w-16 rounded-full border-2 border-cyan-200 opacity-0 will-change-transform"
        style={{ boxShadow: '0 0 24px rgba(103, 232, 249, 0.6)' }}
      />

      <p
        data-levelup-text
        className="relative text-4xl font-black uppercase tracking-tight text-cyan-200 opacity-0 will-change-transform"
        style={{ textShadow: '0 0 18px rgba(34, 211, 238, 0.85), 0 2px 0 rgba(0,0,0,0.4)' }}
      >
        Level {level}
      </p>
    </div>
  )
}
