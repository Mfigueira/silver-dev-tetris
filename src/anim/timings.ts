/**
 * Timings shared between components that animate the same moment. Board runs the
 * game-over cascade while GameOverlay waits to slide in over it, so both import
 * these rather than each hard-coding a number that could drift apart.
 */
export const GAME_OVER = {
  /** How long the stack takes to fall away, in seconds. */
  cascade: 0.85,
  cellStagger: 0.014,
  /** The overlay starts while cells are still falling, so it never feels stalled. */
  overlayDelay: 0.45,
}

export const OVERLAY = {
  in: 0.4,
  out: 0.22,
}
