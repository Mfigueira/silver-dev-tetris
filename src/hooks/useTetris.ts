import { useEffect, useRef, useReducer } from 'react'
import { findBestMove, shapesEqual } from '../game/ai'
import { getDropInterval, LINE_CLEAR_DURATION_MS } from '../game/constants'
import { createInitialState, reducer } from '../game/reducer'
import { loadHighScore, saveHighScore } from '../game/storage'
import type { GameState } from '../game/types'

export function useTetris() {
  const [state, dispatch] = useReducer(reducer, undefined, () => createInitialState(loadHighScore()))

  // Kept in sync every render so the autopilot interval (below) always acts on
  // the latest state without needing to restart every time a piece moves.
  const stateRef = useRef<GameState>(state)
  stateRef.current = state

  useEffect(() => {
    if (state.status !== 'running') return
    const interval = setInterval(() => dispatch({ type: 'TICK' }), getDropInterval(state.level))
    return () => clearInterval(interval)
  }, [state.status, state.level])

  // Autopilot: recomputes the best placement for the active piece and steps
  // toward it (rotate, then slide, then hard drop) at the same pace as gravity.
  // Runs on its own interval (rather than depending on activePiece) so gravity
  // ticks moving the piece don't keep resetting/cancelling this timer.
  useEffect(() => {
    if (!state.autopilot) return

    const interval = setInterval(() => {
      const current = stateRef.current
      if (current.status !== 'running' || !current.activePiece) return

      const piece = current.activePiece
      const target = findBestMove(current.board, piece.type)
      if (!target) return

      if (!shapesEqual(piece.shape, target.shape)) {
        dispatch({ type: 'ROTATE' })
      } else if (piece.position.x < target.x) {
        dispatch({ type: 'MOVE_RIGHT' })
      } else if (piece.position.x > target.x) {
        dispatch({ type: 'MOVE_LEFT' })
      } else {
        dispatch({ type: 'HARD_DROP' })
      }
    }, getDropInterval(state.level))

    return () => clearInterval(interval)
  }, [state.autopilot, state.level])

  useEffect(() => {
    if (state.status !== 'clearing') return
    const timeout = setTimeout(() => dispatch({ type: 'COMMIT_CLEAR' }), LINE_CLEAR_DURATION_MS)
    return () => clearTimeout(timeout)
  }, [state.status])

  useEffect(() => {
    saveHighScore(state.highScore)
  }, [state.highScore])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case 'Enter':
          dispatch({ type: 'ENTER' })
          break
        case 'p':
        case 'P':
          dispatch({ type: 'TOGGLE_PAUSE' })
          break
        case 'a':
        case 'A':
          dispatch({ type: 'TOGGLE_AUTOPILOT' })
          break
        case 'ArrowLeft':
          event.preventDefault()
          dispatch({ type: 'MOVE_LEFT' })
          break
        case 'ArrowRight':
          event.preventDefault()
          dispatch({ type: 'MOVE_RIGHT' })
          break
        case 'ArrowUp':
          event.preventDefault()
          dispatch({ type: 'ROTATE' })
          break
        case 'ArrowDown':
          event.preventDefault()
          dispatch({ type: 'SOFT_DROP' })
          break
        case ' ':
          event.preventDefault()
          dispatch({ type: 'HARD_DROP' })
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function toggleAutopilot() {
    dispatch({ type: 'TOGGLE_AUTOPILOT' })
  }

  return { state, toggleAutopilot }
}
