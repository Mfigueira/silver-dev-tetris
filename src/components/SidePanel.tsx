import { useRef } from 'react'
import { useCountUp } from '../anim/useCountUp'

interface SidePanelProps {
  score: number
  level: number
  lines: number
  highScore: number
}

interface StatBoxProps {
  label: string
  value: number
  highlight?: boolean
  /** Smallest jump that earns a pop. See useCountUp. */
  popThreshold: number
}

function StatBox({ label, value, highlight, popThreshold }: StatBoxProps) {
  const valueRef = useRef<HTMLParagraphElement>(null)

  useCountUp(valueRef, value, { popThreshold })

  return (
    <div className="glass-panel w-24 rounded-xl p-3 sm:w-28">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
      {/* Text content is written by useCountUp, not React, so it can be tweened.
          tabular-nums keeps the width stable while the digits change. */}
      <p
        ref={valueRef}
        className={`origin-left text-lg font-extrabold tabular-nums will-change-transform ${
          highlight ? 'text-cyan-400' : 'text-white'
        }`}
      />
    </div>
  )
}

export function SidePanel({ score, level, lines, highScore }: SidePanelProps) {
  return (
    <>
      {/* A cleared line is worth at least 100, while soft and hard drops trickle
          in single points; the threshold keeps the pop for the former. */}
      <StatBox label="Score" value={score} highlight popThreshold={100} />
      <StatBox label="High Score" value={highScore} popThreshold={100} />
      <StatBox label="Level" value={level} popThreshold={1} />
      <StatBox label="Lines" value={lines} popThreshold={1} />
    </>
  )
}
