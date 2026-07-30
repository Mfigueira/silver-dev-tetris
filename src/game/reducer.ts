import {
  clearLines,
  createEmptyBoard,
  createPiece,
  getFullRows,
  getGhostPosition,
  getPieceCells,
  isValidPosition,
  mergePiece,
} from './board'
import { HARD_DROP_SCORE, LINES_PER_LEVEL, SCORE_TABLE, SOFT_DROP_SCORE } from './constants'
import { createPieceQueue, refillQueueIfNeeded, rotateMatrixClockwise } from './tetrominoes'
import type { ActivePiece, Board, GameEffect, GameState } from './types'

export type Action =
  | { type: 'ENTER' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'MOVE_LEFT' }
  | { type: 'MOVE_RIGHT' }
  | { type: 'ROTATE' }
  | { type: 'SOFT_DROP' }
  | { type: 'HARD_DROP' }
  | { type: 'TICK' }
  | { type: 'COMMIT_CLEAR' }
  | { type: 'TOGGLE_AUTOPILOT' }

export function createInitialState(highScore: number): GameState {
  return {
    board: createEmptyBoard(),
    activePiece: null,
    queue: [],
    score: 0,
    level: 1,
    lines: 0,
    highScore,
    status: 'idle',
    clearingLines: [],
    pendingClear: null,
    autopilot: false,
    lastEffect: null,
  }
}

function startGame(state: GameState): GameState {
  const queue = refillQueueIfNeeded(createPieceQueue())
  const firstType = queue[0]
  return {
    ...state,
    board: createEmptyBoard(),
    activePiece: createPiece(firstType),
    queue: queue.slice(1),
    score: 0,
    level: 1,
    lines: 0,
    status: 'running',
    clearingLines: [],
    pendingClear: null,
    lastEffect: null,
  }
}

function tryRotatePiece(board: Board, piece: ActivePiece): ActivePiece | null {
  if (piece.type === 'O') return piece
  const rotatedShape = rotateMatrixClockwise(piece.shape)
  const kicks = [0, 1, -1, 2, -2]
  for (const dx of kicks) {
    const newPos = { x: piece.position.x + dx, y: piece.position.y }
    if (isValidPosition(board, rotatedShape, newPos)) {
      return { ...piece, shape: rotatedShape, position: newPos }
    }
  }
  return null
}

/** Finalizes a lock: advances score/level/lines, spawns the next piece, and checks game over. */
function finishLock(state: GameState, board: Board, linesCleared: number): GameState {
  const newLines = state.lines + linesCleared
  const newLevel = Math.floor(newLines / LINES_PER_LEVEL) + 1
  const points = linesCleared > 0 ? (SCORE_TABLE[linesCleared] ?? 0) * state.level : 0
  const newScore = state.score + points

  const queue = refillQueueIfNeeded(state.queue)
  const nextType = queue[0]
  const nextPiece = createPiece(nextType)
  const isGameOver = !isValidPosition(board, nextPiece.shape, nextPiece.position)

  return {
    ...state,
    board,
    activePiece: isGameOver ? null : nextPiece,
    queue: queue.slice(1),
    score: newScore,
    level: newLevel,
    lines: newLines,
    status: isGameOver ? 'gameover' : 'running',
    highScore: Math.max(state.highScore, newScore),
    clearingLines: [],
    pendingClear: null,
  }
}

function lockPieceAndSpawnNext(state: GameState, dropDistance = 0): GameState {
  if (!state.activePiece) return state

  const merged = mergePiece(state.board, state.activePiece)
  const fullRows = getFullRows(merged)

  const cells = getPieceCells(state.activePiece)
  const lockEffect: GameEffect = {
    kind: 'lock',
    cells,
    impactRow: cells.reduce((lowest, cell) => Math.max(lowest, cell.y), 0),
    dropDistance,
    linesCleared: fullRows.length,
  }

  if (fullRows.length === 0) {
    return { ...finishLock(state, merged, 0), lastEffect: lockEffect }
  }

  // Keep the completed rows on screen (still full) while the splash animation
  // plays, then commit the actual clear once COMMIT_CLEAR fires.
  const { board: clearedBoard, linesCleared } = clearLines(merged)
  const pendingClear = finishLock(state, clearedBoard, linesCleared)

  return {
    ...state,
    board: merged,
    activePiece: null,
    status: 'clearing',
    clearingLines: fullRows,
    pendingClear,
    lastEffect: lockEffect,
  }
}

function moveDown(state: GameState, scoreDelta = 0): GameState {
  if (!state.activePiece || state.status !== 'running') return state
  const newPos = { x: state.activePiece.position.x, y: state.activePiece.position.y + 1 }
  if (isValidPosition(state.board, state.activePiece.shape, newPos)) {
    return {
      ...state,
      activePiece: { ...state.activePiece, position: newPos },
      score: state.score + scoreDelta,
    }
  }
  return lockPieceAndSpawnNext(state)
}

function moveHorizontal(state: GameState, dx: number): GameState {
  if (!state.activePiece || state.status !== 'running') return state
  const newPos = { x: state.activePiece.position.x + dx, y: state.activePiece.position.y }
  if (isValidPosition(state.board, state.activePiece.shape, newPos)) {
    return { ...state, activePiece: { ...state.activePiece, position: newPos } }
  }
  return state
}

function rotate(state: GameState): GameState {
  if (!state.activePiece || state.status !== 'running') return state
  const rotated = tryRotatePiece(state.board, state.activePiece)
  if (!rotated) return state
  return { ...state, activePiece: rotated, lastEffect: { kind: 'rotate' } }
}

function hardDrop(state: GameState): GameState {
  if (!state.activePiece || state.status !== 'running') return state
  const ghostPos = getGhostPosition(state.board, state.activePiece)
  const dropDistance = ghostPos.y - state.activePiece.position.y
  const droppedState: GameState = {
    ...state,
    activePiece: { ...state.activePiece, position: ghostPos },
    score: state.score + dropDistance * HARD_DROP_SCORE,
  }
  return lockPieceAndSpawnNext(droppedState, dropDistance)
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'ENTER':
      if (state.status === 'idle' || state.status === 'gameover') return startGame(state)
      return state
    case 'TOGGLE_PAUSE':
      if (state.status === 'running') return { ...state, status: 'paused' }
      if (state.status === 'paused') return { ...state, status: 'running' }
      return state
    case 'MOVE_LEFT':
      return moveHorizontal(state, -1)
    case 'MOVE_RIGHT':
      return moveHorizontal(state, 1)
    case 'ROTATE':
      return rotate(state)
    case 'SOFT_DROP':
      return moveDown(state, SOFT_DROP_SCORE)
    case 'HARD_DROP':
      return hardDrop(state)
    case 'TICK':
      return moveDown(state)
    case 'COMMIT_CLEAR':
      if (state.status !== 'clearing' || !state.pendingClear) return state
      // pendingClear was snapshotted before the lock, so carry the live effect
      // forward instead of rewinding to an already-animated one.
      return {
        ...state.pendingClear,
        clearingLines: [],
        pendingClear: null,
        autopilot: state.autopilot,
        lastEffect: state.lastEffect,
      }
    case 'TOGGLE_AUTOPILOT':
      return { ...state, autopilot: !state.autopilot }
    default:
      return state
  }
}
