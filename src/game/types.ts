export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z'

export type CellValue = TetrominoType | null

export type Board = CellValue[][]

export type GameStatus = 'idle' | 'running' | 'paused' | 'clearing' | 'gameover'

export interface Position {
  x: number
  y: number
}

export interface ActivePiece {
  type: TetrominoType
  shape: number[][]
  position: Position
}

/**
 * One-shot signal from the reducer to the animation layer. The reducer stays
 * pure, so it publishes what just happened and the view decides how to draw it.
 * A fresh object is allocated only when something actually happens, so the
 * animation layer can trigger on identity and ignore intervening gravity ticks.
 */
export type GameEffect =
  | { kind: 'rotate' }
  | {
      kind: 'lock'
      /** Board cells the piece occupied at the moment it locked. */
      cells: Position[]
      /** Lowest row the piece reached, where the impact dust belongs. */
      impactRow: number
      /** Rows crossed by a hard drop; 0 for gravity and soft-drop locks. */
      dropDistance: number
      /**
       * Rows this lock completed. The clear timeline owns the board shake when
       * this is non-zero, so the impact jolt stands down to avoid two
       * animations fighting over the same transform.
       */
      linesCleared: number
    }

/** Snapshot of the state to apply once the line-clear animation finishes. */
export interface PendingClear {
  board: Board
  activePiece: ActivePiece | null
  queue: TetrominoType[]
  score: number
  level: number
  lines: number
  status: GameStatus
  highScore: number
}

export interface GameState {
  board: Board
  activePiece: ActivePiece | null
  queue: TetrominoType[]
  score: number
  level: number
  lines: number
  highScore: number
  status: GameStatus
  /** Row indices currently playing the line-clear animation. */
  clearingLines: number[]
  /** State to commit once the line-clear animation completes. */
  pendingClear: PendingClear | null
  /** When true, the game plays itself by driving the same move actions a human would. */
  autopilot: boolean
  /** Most recent thing worth animating. See GameEffect. */
  lastEffect: GameEffect | null
}
