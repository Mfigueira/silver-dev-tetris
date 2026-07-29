import { BOARD_HEIGHT, BOARD_WIDTH } from './constants'
import { clearLines, getGhostPosition, isValidPosition, mergePiece } from './board'
import { TETROMINO_SHAPES, rotateMatrixClockwise } from './tetrominoes'
import type { ActivePiece, Board, TetrominoType } from './types'

export interface AutopilotMove {
  shape: number[][]
  x: number
}

// Weights for a classic 4-feature Tetris heuristic (aggregate height, complete
// lines, holes, bumpiness), commonly used for simple single-piece-lookahead AIs.
const WEIGHT_AGGREGATE_HEIGHT = -0.510066
const WEIGHT_COMPLETE_LINES = 0.760666
const WEIGHT_HOLES = -0.35663
const WEIGHT_BUMPINESS = -0.184483

export function shapesEqual(a: number[][], b: number[][]): boolean {
  if (a.length !== b.length) return false
  for (let y = 0; y < a.length; y++) {
    if (a[y].length !== b[y].length) return false
    for (let x = 0; x < a[y].length; x++) {
      if (a[y][x] !== b[y][x]) return false
    }
  }
  return true
}

function getUniqueRotations(type: TetrominoType): number[][][] {
  const shapes: number[][][] = []
  let shape = TETROMINO_SHAPES[type]
  for (let i = 0; i < 4; i++) {
    if (!shapes.some((existing) => shapesEqual(existing, shape))) shapes.push(shape)
    shape = rotateMatrixClockwise(shape)
  }
  return shapes
}

function getColumnHeights(board: Board): number[] {
  const heights = new Array<number>(BOARD_WIDTH).fill(0)
  for (let x = 0; x < BOARD_WIDTH; x++) {
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      if (board[y][x]) {
        heights[x] = BOARD_HEIGHT - y
        break
      }
    }
  }
  return heights
}

function countHoles(board: Board, heights: number[]): number {
  let holes = 0
  for (let x = 0; x < BOARD_WIDTH; x++) {
    const startY = BOARD_HEIGHT - heights[x]
    for (let y = startY; y < BOARD_HEIGHT; y++) {
      if (!board[y][x]) holes++
    }
  }
  return holes
}

function getBumpiness(heights: number[]): number {
  let bumpiness = 0
  for (let x = 0; x < heights.length - 1; x++) {
    bumpiness += Math.abs(heights[x] - heights[x + 1])
  }
  return bumpiness
}

function evaluateResult(board: Board, linesCleared: number): number {
  const heights = getColumnHeights(board)
  const aggregateHeight = heights.reduce((sum, h) => sum + h, 0)
  const holes = countHoles(board, heights)
  const bumpiness = getBumpiness(heights)
  return (
    WEIGHT_AGGREGATE_HEIGHT * aggregateHeight +
    WEIGHT_COMPLETE_LINES * linesCleared +
    WEIGHT_HOLES * holes +
    WEIGHT_BUMPINESS * bumpiness
  )
}

/**
 * Picks the best rotation + column for `type` on the current `board` by
 * simulating every reachable placement and scoring the resulting board.
 * Uses a single-piece lookahead (doesn't consider the queue).
 */
export function findBestMove(board: Board, type: TetrominoType): AutopilotMove | null {
  let best: AutopilotMove | null = null
  let bestScore = -Infinity

  for (const shape of getUniqueRotations(type)) {
    const width = shape[0].length
    for (let x = -width; x <= BOARD_WIDTH; x++) {
      const spawnY = -4
      if (!isValidPosition(board, shape, { x, y: spawnY })) continue

      const probe: ActivePiece = { type, shape, position: { x, y: spawnY } }
      const landing = getGhostPosition(board, probe)
      const merged = mergePiece(board, { ...probe, position: landing })
      const { board: cleared, linesCleared } = clearLines(merged)
      const score = evaluateResult(cleared, linesCleared)

      if (score > bestScore) {
        bestScore = score
        best = { shape, x }
      }
    }
  }

  return best
}
