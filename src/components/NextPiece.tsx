import { TETROMINO_COLORS, TETROMINO_SHAPES } from '../game/tetrominoes'
import type { TetrominoType } from '../game/types'

interface NextPieceProps {
  type: TetrominoType | null
}

const GRID_SIZE = 4

/** Bounding box of the filled cells within a shape matrix, since shapes are padded with empty rows/columns. */
function getBounds(shape: number[][]) {
  let minY = shape.length
  let maxY = -1
  let minX = shape[0].length
  let maxX = -1
  shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
      }
    })
  })
  return { minY, maxY, minX, maxX }
}

/** Centers a piece's actual filled cells inside a fixed GRID_SIZE x GRID_SIZE grid so every piece renders at the same cell size. */
function toFixedGrid(shape: number[][]): number[][] {
  const { minY, maxY, minX, maxX } = getBounds(shape)
  const height = maxY - minY + 1
  const width = maxX - minX + 1
  const offsetY = Math.floor((GRID_SIZE - height) / 2)
  const offsetX = Math.floor((GRID_SIZE - width) / 2)

  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0))
  shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        grid[y - minY + offsetY][x - minX + offsetX] = cell
      }
    })
  })
  return grid
}

export function NextPiece({ type }: NextPieceProps) {
  const shape = type ? toFixedGrid(TETROMINO_SHAPES[type]) : null

  return (
    <div className="w-24 rounded-xl border border-white/10 bg-black/50 p-3 sm:w-28">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">Next</p>
      <div
        className="mx-auto grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, width: '100%', aspectRatio: '1 / 1' }}
      >
        {shape?.flatMap((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${y}-${x}`}
              className="aspect-square rounded-[2px]"
              style={{
                backgroundColor: cell ? TETROMINO_COLORS[type as TetrominoType] : 'transparent',
                boxShadow: cell ? 'inset 0 0 0 2px rgba(255,255,255,0.25)' : undefined,
              }}
            />
          )),
        )}
      </div>
    </div>
  )
}
