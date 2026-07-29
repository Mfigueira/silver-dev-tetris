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

/** Duration of the line-clear splash animation, in ms. Must match the CSS keyframe durations. */
export const LINE_CLEAR_DURATION_MS = 380

/** Gravity tick interval in ms, decreasing (faster) as level increases. */
export function getDropInterval(level: number): number {
  return Math.max(100, 1000 - (level - 1) * 75)
}
