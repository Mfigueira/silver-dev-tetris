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
}
