interface SidePanelProps {
  score: number
  level: number
  lines: number
  highScore: number
}

function StatBox({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="w-24 rounded-xl border border-white/10 bg-black/50 p-3 sm:w-28">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
      <p className={`text-lg font-extrabold tabular-nums ${highlight ? 'text-cyan-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

export function SidePanel({ score, level, lines, highScore }: SidePanelProps) {
  return (
    <>
      <StatBox label="Score" value={score} highlight />
      <StatBox label="High Score" value={highScore} />
      <StatBox label="Level" value={level} />
      <StatBox label="Lines" value={lines} />
    </>
  )
}
