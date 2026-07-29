import type { TetrominoType } from './types'

export const TETROMINO_SHAPES: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
}

export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: '#22d3ee',
  J: '#3b82f6',
  L: '#f97316',
  O: '#eab308',
  S: '#22c55e',
  T: '#a855f7',
  Z: '#ef4444',
}

const ALL_TYPES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z']

/** Fisher-Yates shuffle producing one of each of the 7 pieces (the "7-bag" randomizer). */
function shuffledBag(): TetrominoType[] {
  const bag = [...ALL_TYPES]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  return bag
}

export function createPieceQueue(): TetrominoType[] {
  return shuffledBag()
}

export function refillQueueIfNeeded(queue: TetrominoType[]): TetrominoType[] {
  if (queue.length <= 7) {
    return [...queue, ...shuffledBag()]
  }
  return queue
}

export function rotateMatrixClockwise(matrix: number[][]): number[][] {
  const size = matrix.length
  const rotated: number[][] = Array.from({ length: size }, () => Array(size).fill(0))
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      rotated[x][size - 1 - y] = matrix[y][x]
    }
  }
  return rotated
}
