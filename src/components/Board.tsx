import { useRef } from 'react'
import { DUST_POOL_SIZE, useBoardAnimations } from '../anim/useBoardAnimations'
import { BOARD_WIDTH } from '../game/constants'
import type { DisplayCell } from '../game/board'
import type { GameEffect, GameStatus } from '../game/types'
import { Cell } from './Cell'

interface BoardProps {
  grid: DisplayCell[][]
  clearingLines: number[]
  lastEffect: GameEffect | null
  status: GameStatus
  onClearComplete: () => void
}

export function Board({ grid, clearingLines, lastEffect, status, onClearComplete }: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const dustRef = useRef<HTMLDivElement>(null)

  useBoardAnimations({ boardRef, dustRef, clearingLines, lastEffect, status, onClearComplete })

  return (
    <div
      ref={boardRef}
      // Clipping is applied only for the game-over cascade, so the stack falls
      // out of the well rather than over the page. It stays off the rest of the
      // time because it would otherwise crop the line-clear particles that
      // burst past the board's edge.
      className={`relative grid gap-[3px] rounded-xl border border-white/10 bg-black/50 p-2 shadow-2xl ${
        status === 'gameover' ? 'overflow-hidden' : ''
      }`}
      style={{
        gridTemplateColumns: `repeat(${BOARD_WIDTH}, minmax(0, 1fr))`,
        width: 'min(88vw, 320px)',
      }}
    >
      {grid.flatMap((row, y) =>
        row.map((cell, x) => <Cell key={`${y}-${x}`} cell={cell} row={y} col={x} />),
      )}

      {/* Reused pool of impact motes, parked offscreen until a drop places them. */}
      <div ref={dustRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: DUST_POOL_SIZE }, (_, i) => (
          <span
            key={i}
            data-dust
            className="absolute left-0 top-0 h-1.25 w-1.25 rounded-full bg-white/70 opacity-0 will-change-transform"
          />
        ))}
      </div>
    </div>
  )
}
