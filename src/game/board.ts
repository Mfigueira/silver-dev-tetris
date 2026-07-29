import { BOARD_HEIGHT, BOARD_WIDTH } from './constants'
import { TETROMINO_COLORS, TETROMINO_SHAPES } from './tetrominoes'
import type { ActivePiece, Board, Position, TetrominoType } from './types'

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () => Array<null>(BOARD_WIDTH).fill(null))
}

function getTopOffset(shape: number[][]): number {
  for (let y = 0; y < shape.length; y++) {
    if (shape[y].some((cell) => cell)) return y
  }
  return 0
}

export function createPiece(type: TetrominoType): ActivePiece {
  const shape = TETROMINO_SHAPES[type].map((row) => [...row])
  const width = shape[0].length
  return {
    type,
    shape,
    position: { x: Math.floor((BOARD_WIDTH - width) / 2), y: -getTopOffset(shape) },
  }
}

export function isValidPosition(board: Board, shape: number[][], position: Position): boolean {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue
      const boardX = position.x + x
      const boardY = position.y + y
      if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) return false
      if (boardY >= 0 && board[boardY][boardX]) return false
    }
  }
  return true
}

export function mergePiece(board: Board, piece: ActivePiece): Board {
  const newBoard = board.map((row) => [...row])
  piece.shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return
      const boardY = piece.position.y + y
      const boardX = piece.position.x + x
      if (boardY >= 0) newBoard[boardY][boardX] = piece.type
    })
  })
  return newBoard
}

export function getFullRows(board: Board): number[] {
  const rows: number[] = []
  board.forEach((row, y) => {
    if (row.every((cell) => cell !== null)) rows.push(y)
  })
  return rows
}

export function clearLines(board: Board): { board: Board; linesCleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null))
  const linesCleared = BOARD_HEIGHT - remaining.length
  const newRows = Array.from({ length: linesCleared }, () => Array<null>(BOARD_WIDTH).fill(null))
  return { board: [...newRows, ...remaining], linesCleared }
}

export function getGhostPosition(board: Board, piece: ActivePiece): Position {
  let ghostY = piece.position.y
  while (isValidPosition(board, piece.shape, { x: piece.position.x, y: ghostY + 1 })) {
    ghostY++
  }
  return { x: piece.position.x, y: ghostY }
}

export type CellVariant = 'empty' | 'locked' | 'active' | 'ghost' | 'clearing'

export interface DisplayCell {
  color: string | null
  variant: CellVariant
}

function paintPiece(
  grid: DisplayCell[][],
  shape: number[][],
  position: Position,
  type: TetrominoType,
  variant: 'ghost' | 'active',
) {
  shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return
      const boardY = position.y + y
      const boardX = position.x + x
      if (boardY < 0 || boardY >= grid.length || boardX < 0 || boardX >= grid[0].length) return
      // Never let the ghost overwrite the active piece's own cells.
      if (variant === 'ghost' && grid[boardY][boardX].variant === 'active') return
      grid[boardY][boardX] = { color: TETROMINO_COLORS[type], variant }
    })
  })
}

export function buildDisplayGrid(
  board: Board,
  piece: ActivePiece | null,
  clearingLines: number[] = [],
): DisplayCell[][] {
  const grid: DisplayCell[][] = board.map((row, y) =>
    row.map((cell) => ({
      color: cell ? TETROMINO_COLORS[cell] : null,
      variant: (clearingLines.includes(y) ? 'clearing' : cell ? 'locked' : 'empty') as CellVariant,
    })),
  )

  if (piece) {
    paintPiece(grid, piece.shape, piece.position, piece.type, 'active')
    const ghost = getGhostPosition(board, piece)
    if (ghost.y !== piece.position.y) {
      paintPiece(grid, piece.shape, ghost, piece.type, 'ghost')
    }
  }

  return grid
}
