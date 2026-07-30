import { useRef } from 'react'
import type { RefObject } from 'react'
import { gsap, prefersReducedMotion, useGSAP } from './gsap'
import { GAME_OVER } from './timings'
import type { GameEffect, GameStatus } from '../game/types'

/** Sequencing knobs for the line-clear timeline, in seconds. */
const CLEAR = {
  cellStagger: 0.015,
  /** Offset between rows so a multi-line clear cascades bottom to top. */
  rowStagger: 0.03,
  flashIn: 0.1,
  flashOut: 0.24,
  tileSwell: 0.09,
  tileCollapse: 0.26,
  particles: 0.45,
  /** Shake amplitude in px, multiplied by the number of rows going away. */
  rumblePerLine: 1.8,
  /** A Tetris earns a beat of slow motion. */
  tetrisTimeScale: 0.85,
  reducedTotal: 0.12,
}

const LOCK = {
  squash: 0.34,
  flash: 0.28,
  rotatePop: 0.18,
  /** Drop distances (in rows) mapped onto impact intensity. */
  distanceRange: [1, 18] as [number, number],
  /** Floor so a piece settling under gravity still registers. */
  minImpact: 0.25,
  /** Board shake amplitude in px across the impact range. */
  joltRange: [3, 14] as [number, number],
  minRowsForDust: 2,
  dustDuration: 0.5,
}

const DUST_POOL_SIZE = 14

interface BoardAnimationArgs {
  /** The grid element: animation scope, and the thing that shakes. */
  boardRef: RefObject<HTMLDivElement | null>
  dustRef: RefObject<HTMLDivElement | null>
  clearingLines: number[]
  lastEffect: GameEffect | null
  status: GameStatus
  onClearComplete: () => void
}

/** One matching descendant per cell, in column order, with misses dropped. */
function pluck(cells: ArrayLike<Element>, selector: string): HTMLElement[] {
  return Array.from(cells, (cell) => cell.querySelector<HTMLElement>(selector)).filter(
    (el): el is HTMLElement => el !== null,
  )
}

/** A decaying random shake, used for both hard-drop impacts and big clears. */
function rumble(target: Element, amplitude: number, steps = 5, duration = 0.4) {
  const tl = gsap.timeline()
  const step = duration / (steps + 1)
  for (let i = 0; i < steps; i++) {
    const falloff = 1 - i / steps
    tl.to(target, {
      x: gsap.utils.random(-amplitude, amplitude) * falloff,
      y: gsap.utils.random(-amplitude, amplitude) * falloff * 0.6,
      duration: step,
      ease: 'none',
    })
  }
  return tl.to(target, { x: 0, y: 0, duration: step, ease: 'power2.out' })
}

export function useBoardAnimations({
  boardRef,
  dustRef,
  clearingLines,
  lastEffect,
  status,
  onClearComplete,
}: BoardAnimationArgs) {
  // Held in a ref so the timeline never captures a stale dispatch and the clear
  // animation doesn't restart just because the caller passed a new closure.
  const onClearCompleteRef = useRef(onClearComplete)
  onClearCompleteRef.current = onClearComplete

  // Line clear. This timeline owns the clock: the game stays in the 'clearing'
  // status until onComplete reports back, so there is no duration to keep in
  // sync anywhere else.
  useGSAP(
    () => {
      const board = boardRef.current
      if (!board || clearingLines.length === 0) return

      if (prefersReducedMotion()) {
        gsap.to(board.querySelectorAll('[data-clear-tile]'), {
          opacity: 0,
          duration: CLEAR.reducedTotal,
          ease: 'none',
        })
        // A standalone delayedCall rather than the tween's onComplete: the game
        // must resume even if the tween above found no targets to animate.
        gsap.delayedCall(CLEAR.reducedTotal, () => onClearCompleteRef.current())
        return
      }

      const tl = gsap.timeline({ onComplete: () => onClearCompleteRef.current() })

      // Bottom row first, so a Tetris reads as a collapse rather than a blink.
      const rows = [...clearingLines].sort((a, b) => b - a)

      rows.forEach((row, rowIndex) => {
        const cells = board.querySelectorAll(`[data-row="${row}"][data-variant="clearing"]`)
        if (cells.length === 0) return

        const stagger = { each: CLEAR.cellStagger, from: 'center' as const }
        const rowTl = gsap.timeline()

        rowTl
          .to(pluck(cells, '[data-clear-tile]'), {
            keyframes: [
              { scale: 1.08, duration: CLEAR.tileSwell, ease: 'power2.out' },
              { scale: 0, duration: CLEAR.tileCollapse, ease: 'power2.in' },
            ],
            stagger,
          })
          .to(
            pluck(cells, '[data-clear-flash]'),
            {
              keyframes: [
                { opacity: 0.95, scale: 1.15, duration: CLEAR.flashIn, ease: 'power2.out' },
                { opacity: 0, scale: 1.35, duration: CLEAR.flashOut, ease: 'power2.in' },
              ],
              stagger,
            },
            0,
          )
          .fromTo(
            Array.from(cells).flatMap((c) => Array.from(c.querySelectorAll<HTMLElement>('[data-clear-particle]'))),
            { opacity: 1, x: 0, y: 0, scale: 1, rotation: 0 },
            {
              // Each particle carries its own trajectory as data attributes.
              x: (_i, target: HTMLElement) => Number(target.dataset.tx),
              y: (_i, target: HTMLElement) => Number(target.dataset.ty),
              rotation: (_i, target: HTMLElement) => Number(target.dataset.rot),
              scale: 0,
              opacity: 0,
              duration: CLEAR.particles,
              ease: 'power2.out',
              stagger: { each: 0.004, from: 'random' },
            },
            CLEAR.tileSwell,
          )

        tl.add(rowTl, rowIndex * CLEAR.rowStagger)
      })

      // Sole owner of the board shake during a clear; the impact jolt defers to
      // it so the two never write to the same transform at once.
      tl.add(rumble(board, CLEAR.rumblePerLine * clearingLines.length), 0)

      if (clearingLines.length >= 4) {
        tl.timeScale(CLEAR.tetrisTimeScale)
      }
    },
    { dependencies: [clearingLines], scope: boardRef, revertOnUpdate: true },
  )

  // Piece feel: impact jolt, squash, dust, and a pop on rotate. Triggered by the
  // identity of lastEffect, so gravity ticks in between are ignored.
  useGSAP(
    () => {
      const board = boardRef.current
      if (!board || !lastEffect || prefersReducedMotion()) return

      if (lastEffect.kind === 'rotate') {
        // overwrite kills any pop still running: the piece may have moved on,
        // leaving the previous tween mid-flight on cells it no longer occupies.
        gsap.fromTo(
          board.querySelectorAll('[data-variant="active"]'),
          { scale: 0.84 },
          { scale: 1, duration: LOCK.rotatePop, ease: 'back.out(3)', overwrite: 'auto', clearProps: 'transform' },
        )
        return
      }

      const cellAt = (x: number, y: number) =>
        board.querySelector<HTMLElement>(`[data-row="${y}"][data-col="${x}"]`)
      const isElement = (el: HTMLElement | null): el is HTMLElement => el !== null

      const { cells, dropDistance, impactRow, linesCleared } = lastEffect
      const landed = cells.map(({ x, y }) => cellAt(x, y)).filter(isElement)
      if (landed.length === 0) return

      // Longer drops hit harder, but even a piece settling under gravity gets a
      // floor's worth of feedback so every lock reads as a landing.
      const impact = gsap.utils.clamp(
        LOCK.minImpact,
        1,
        gsap.utils.mapRange(...LOCK.distanceRange, LOCK.minImpact, 1, dropDistance),
      )

      const tl = gsap.timeline()

      tl.fromTo(
        landed,
        { scaleY: 1 - 0.45 * impact, scaleX: 1 + 0.12 * impact },
        {
          scaleY: 1,
          scaleX: 1,
          duration: LOCK.squash,
          ease: 'back.out(2.2)',
          transformOrigin: 'center bottom',
          clearProps: 'transform',
        },
        0,
      ).fromTo(
        landed,
        { filter: `brightness(${1 + 1.4 * impact})` },
        { filter: 'brightness(1)', duration: LOCK.flash, ease: 'power2.out', clearProps: 'filter' },
        0,
      )

      if (dropDistance > 0 && linesCleared === 0) {
        tl.add(rumble(board, gsap.utils.mapRange(0, 1, ...LOCK.joltRange, impact), 4, 0.32), 0)
      }

      if (dropDistance >= LOCK.minRowsForDust) {
        // Dust belongs at the contact line only, not under the whole piece.
        const contact = cells.filter((cell) => cell.y === impactRow).map(({ x, y }) => cellAt(x, y)).filter(isElement)
        tl.add(burstDust(dustRef.current, contact, impact), 0)
      }
    },
    { dependencies: [lastEffect], scope: boardRef, revertOnUpdate: true },
  )

  // Game over: the stack drops out of the board. revertOnUpdate restores every
  // cell when the status leaves 'gameover', so a new game starts clean.
  useGSAP(
    () => {
      const board = boardRef.current
      if (!board || status !== 'gameover' || prefersReducedMotion()) return

      // Cells come back in DOM order (row-major, top row first), so staggering
      // from the end drops the bottom of the stack first.
      const stack = gsap.utils.toArray<HTMLElement>('[data-variant="locked"]', board)
      if (stack.length === 0) return

      // Far enough that every cell clears the board's bottom edge, where the
      // board's own overflow clip hides it. One read, before any writes.
      const fall = board.clientHeight

      gsap.to(stack, {
        y: () => fall + gsap.utils.random(0, 120),
        rotation: () => gsap.utils.random(-90, 90),
        duration: GAME_OVER.cascade,
        // Accelerating, so it reads as the stack giving way rather than sliding.
        ease: 'power2.in',
        stagger: { each: GAME_OVER.cellStagger, from: 'end' },
      })
    },
    { dependencies: [status], scope: boardRef, revertOnUpdate: true },
  )
}

/**
 * Throws the dust pool out from the cells that just landed. Positions come from
 * measured rects so the pool needs no knowledge of cell size or grid padding;
 * all reads happen before any writes to avoid layout thrashing.
 */
function burstDust(layer: HTMLDivElement | null, cells: HTMLElement[], intensity: number) {
  const tl = gsap.timeline()
  if (!layer) return tl

  const motes = Array.from(layer.querySelectorAll<HTMLElement>('[data-dust]'))
  if (motes.length === 0) return tl

  const layerRect = layer.getBoundingClientRect()
  const spots = cells.map((cell) => {
    const rect = cell.getBoundingClientRect()
    return {
      x: rect.left - layerRect.left + rect.width / 2,
      y: rect.top - layerRect.top + rect.height,
      width: rect.width,
    }
  })

  motes.forEach((mote, i) => {
    const spot = spots[i % spots.length]
    const spread = spot.width * (0.6 + intensity)
    tl.fromTo(
      mote,
      {
        x: spot.x + gsap.utils.random(-spot.width / 2, spot.width / 2),
        y: spot.y,
        scale: gsap.utils.random(0.5, 1.2),
        opacity: 0.5 * intensity + 0.2,
      },
      {
        x: `+=${gsap.utils.random(-spread, spread)}`,
        y: `-=${gsap.utils.random(2, 10 + 14 * intensity)}`,
        scale: 0,
        opacity: 0,
        duration: LOCK.dustDuration * gsap.utils.random(0.7, 1.1),
        ease: 'power2.out',
      },
      0,
    )
  })

  return tl
}

export { DUST_POOL_SIZE }
