import { useMemo, useRef } from 'react'
import { MOTE_COUNT, useBackgroundField } from '../anim/useBackgroundField'
import { TETROMINO_COLORS } from '../game/tetrominoes'

interface BackgroundFieldProps {
  level: number
}

const PALETTE = Object.values(TETROMINO_COLORS) as string[]

interface Mote {
  size: number
  color: string
  opacity: number
  /** Outlined motes read as tetromino blocks and cost less to paint than fills. */
  outlined: boolean
}

function makeMotes(): Mote[] {
  return Array.from({ length: MOTE_COUNT }, (_, i) => {
    const size = 8 + Math.random() * 26
    return {
      size,
      color: PALETTE[i % PALETTE.length],
      // Bigger motes read as further away, so keep them fainter.
      opacity: 0.3 - (size / 34) * 0.16,
      outlined: Math.random() > 0.45,
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
            boxShadow: `0 0 ${Math.round(mote.size * 0.8)}px ${mote.color}40`,
          }}
        />
      ))}
    </div>
  )
}
