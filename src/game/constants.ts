export const BOARD_WIDTH = 10
export const BOARD_HEIGHT = 20

export const LINES_PER_LEVEL = 10

/** Points awarded per lines cleared in a single move, multiplied by the current level. */
export const SCORE_TABLE: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
}

export const SOFT_DROP_SCORE = 1
export const HARD_DROP_SCORE = 2

export const HIGH_SCORE_KEY = 'react-tetris-high-score'

/**
 * The line-clear timeline decides when the clear commits, so this is only a
 * backstop for the case where it never reports back (an unmount mid-animation,
 * say). Comfortably longer than the real animation; COMMIT_CLEAR is idempotent.
 */
export const CLEAR_SAFETY_TIMEOUT_MS = 2000

/** Gravity tick interval in ms, decreasing (faster) as level increases. */
export function getDropInterval(level: number): number {
  return Math.max(100, 1000 - (level - 1) * 75)
}
