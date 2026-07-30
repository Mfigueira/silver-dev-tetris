import { useMemo, useRef } from 'react'
import { MOTE_COUNT, useBackgroundField } from '../anim/useBackgroundField'
import { TETROMINO_COLORS } from '../game/tetrominoes'

interface BackgroundFieldProps {
  level: number
}

const PALETTE = Object.values(TETROMINO_COLORS) as string[]
const ACCENT = '#22d3ee'

interface Mote {
  size: number
  color: string
  opacity: number
  /** Outlined motes read as tetromino blocks and cost less to paint than fills. */
  outlined: boolean
  accent: boolean
}

function makeMotes(): Mote[] {
  return Array.from({ length: MOTE_COUNT }, (_, i) => {
    const size = 8 + Math.random() * 26
    const accent = i % 3 === 0
    return {
      size,
      color: accent ? ACCENT : PALETTE[i % PALETTE.length],
      opacity: accent ? 0.42 - (size / 34) * 0.14 : 0.32 - (size / 34) * 0.14,
      outlined: accent ? false : Math.random() > 0.45,
      accent,
    }
  })
}

export function BackgroundField({ level }: BackgroundFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const motes = useMemo(makeMotes, [])

  useBackgroundField({ fieldRef, level })

  return (
    <div
      ref={fieldRef}
      aria-hidden
      // Negative z-index sits above the body gradient but behind all app
      // content, so the field never intercepts pointers or covers the board.
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {motes.map((mote, i) => (
        <div
          key={i}
          data-mote
          className="absolute left-0 top-0 rounded-[3px] will-change-transform"
          style={{
            width: `${mote.size}px`,
            height: `${mote.size}px`,
            opacity: mote.opacity,
            // No blur filter here on purpose: only transforms animate, so the
            // painted texture stays cached on the compositor.
            backgroundColor: mote.outlined ? 'transparent' : mote.color,
            border: mote.outlined ? `2px solid ${mote.color}` : undefined,
            boxShadow: mote.accent
              ? `0 0 ${Math.round(mote.size * 1.2)}px rgba(34, 211, 238, 0.65), 0 0 ${Math.round(mote.size * 2.2)}px rgba(34, 211, 238, 0.25)`
              : `0 0 ${Math.round(mote.size * 0.7)}px ${mote.color}50, 0 0 ${Math.round(mote.size * 1.4)}px rgba(34, 211, 238, 0.18)`,
          }}
        />
      ))}
    </div>
  )
}
