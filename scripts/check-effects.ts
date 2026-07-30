/**
 * Ad-hoc harness for the reducer's animation-effect contract. Run with:
 *   npx vite-node scripts/check-effects.ts
 */
import { reducer, createInitialState } from '../src/game/reducer'
import type { Action } from '../src/game/reducer'
import { BOARD_HEIGHT, BOARD_WIDTH, LINES_PER_LEVEL } from '../src/game/constants'
import type { GameState } from '../src/game/types'

let failures = 0

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok   ${label}`)
  } else {
    failures++
    console.log(`  FAIL ${label}`, detail ?? '')
  }
}

function run(state: GameState, actions: Action[]): GameState {
  return actions.reduce(reducer, state)
}

console.log('\nhard drop emits a lock effect carrying drop distance')
{
  const started = run(createInitialState(0), [{ type: 'ENTER' }])
  const dropped = run(started, [{ type: 'HARD_DROP' }])
  const effect = dropped.lastEffect
  check('effect is a lock', effect?.kind === 'lock', effect)
  if (effect?.kind === 'lock') {
    check('dropDistance > 0', effect.dropDistance > 0, effect.dropDistance)
    check('cells match the piece', effect.cells.length === 4, effect.cells)
    check(
      'impactRow is the lowest cell',
      effect.impactRow === Math.max(...effect.cells.map((c) => c.y)),
      effect,
    )
    check('linesCleared is 0', effect.linesCleared === 0, effect.linesCleared)
  }
}

console.log('\ngravity lock reports no drop distance')
{
  let state = run(createInitialState(0), [{ type: 'ENTER' }])
  while (state.lastEffect?.kind !== 'lock') state = reducer(state, { type: 'TICK' })
  const effect = state.lastEffect
  check('dropDistance is 0', effect.kind === 'lock' && effect.dropDistance === 0, effect)
}

console.log('\nrotate emits a fresh effect, gravity ticks do not')
{
  const started = run(createInitialState(0), [{ type: 'ENTER' }])
  // The O piece never rotates, so advance until we hold something that does.
  let state = started
  while (state.activePiece?.type === 'O') state = run(reducer(state, { type: 'HARD_DROP' }), [])
  const rotated = reducer(state, { type: 'ROTATE' })
  check('rotate produced an effect', rotated.lastEffect?.kind === 'rotate', rotated.lastEffect)
  const ticked = reducer(rotated, { type: 'TICK' })
  check(
    'a gravity tick keeps the same effect object',
    ticked.lastEffect === rotated.lastEffect,
    ticked.lastEffect,
  )
  const rotatedAgain = reducer(ticked, { type: 'ROTATE' })
  check(
    'rotating again allocates a new object',
    rotatedAgain.lastEffect !== rotated.lastEffect,
    rotatedAgain.lastEffect,
  )
}

console.log('\nclearing a row reports linesCleared and holds until COMMIT_CLEAR')
{
  // Board with the bottom row full except for the last column.
  const base = createInitialState(0)
  const board = base.board.map((row) => [...row])
  for (let x = 0; x < BOARD_WIDTH - 1; x++) board[BOARD_HEIGHT - 1][x] = 'I'

  const staged: GameState = {
    ...base,
    board,
    status: 'running',
    activePiece: { type: 'O', shape: [[1]], position: { x: BOARD_WIDTH - 1, y: 0 } },
    queue: ['T', 'L', 'J'],
  }

  const cleared = reducer(staged, { type: 'HARD_DROP' })
  check('status is clearing', cleared.status === 'clearing', cleared.status)
  check('clearingLines names the bottom row', cleared.clearingLines.join() === String(BOARD_HEIGHT - 1), cleared.clearingLines)
  check(
    'lock effect reports linesCleared: 1',
    cleared.lastEffect?.kind === 'lock' && cleared.lastEffect.linesCleared === 1,
    cleared.lastEffect,
  )
  check('the full row is still on the board', cleared.board[BOARD_HEIGHT - 1].every((c) => c !== null))

  const committed = reducer(cleared, { type: 'COMMIT_CLEAR' })
  check('status returns to running', committed.status === 'running', committed.status)
  check('row is gone', committed.board[BOARD_HEIGHT - 1].every((c) => c === null))
  check(
    'COMMIT_CLEAR carries the live effect forward, not a stale one',
    committed.lastEffect === cleared.lastEffect,
    committed.lastEffect,
  )
  check(
    'COMMIT_CLEAR is idempotent, so the safety timeout is harmless',
    reducer(committed, { type: 'COMMIT_CLEAR' }) === committed,
  )
}

console.log('\nlevel only ever rises on COMMIT_CLEAR, after the clear animation')
{
  // One row short of a level, so the next clear crosses the threshold.
  const base = createInitialState(0)
  const board = base.board.map((row) => [...row])
  for (let x = 0; x < BOARD_WIDTH - 1; x++) board[BOARD_HEIGHT - 1][x] = 'I'

  const staged: GameState = {
    ...base,
    board,
    status: 'running',
    lines: LINES_PER_LEVEL - 1,
    level: 1,
    activePiece: { type: 'O', shape: [[1]], position: { x: BOARD_WIDTH - 1, y: 0 } },
    queue: ['T', 'L', 'J'],
  }

  const clearing = reducer(staged, { type: 'HARD_DROP' })
  check('level is unchanged while the clear animates', clearing.level === 1, clearing.level)
  check('the pending state is the one holding the new level', clearing.pendingClear?.level === 2, clearing.pendingClear?.level)

  const committed = reducer(clearing, { type: 'COMMIT_CLEAR' })
  check('level rises only once the clear commits', committed.level === 2, committed.level)
}

console.log('\na lock that clears nothing cannot change the level')
{
  const started = run(createInitialState(0), [{ type: 'ENTER' }])
  const dropped = reducer(started, { type: 'HARD_DROP' })
  check('level held at 1', dropped.level === started.level, dropped.level)
}

// Throwing rather than process.exit keeps the exit code non-zero without
// needing node types, which this folder is outside the tsconfig projects for.
if (failures > 0) throw new Error(`${failures} check(s) failed`)
console.log('\nall checks passed\n')
