import { BOARD_WIDTH } from '../game/constants'
import type { DisplayCell } from '../game/board'
import { Cell } from './Cell'

interface BoardProps {
  grid: DisplayCell[][]
}

export function Board({ grid }: BoardProps) {
  return (
    <div
      className="grid gap-[3px] rounded-xl border border-white/10 bg-black/50 p-2 shadow-2xl"
      style={{
        gridTemplateColumns: `repeat(${BOARD_WIDTH}, minmax(0, 1fr))`,
        width: 'min(88vw, 320px)',
      }}
    >
      {grid.flatMap((row, y) => row.map((cell, x) => <Cell key={`${y}-${x}`} cell={cell} />))}
    </div>
  )
}
