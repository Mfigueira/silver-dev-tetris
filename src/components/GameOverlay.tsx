import type { GameStatus } from '../game/types'

interface GameOverlayProps {
  status: GameStatus
  score: number
  highScore: number
}

export function GameOverlay({ status, score, highScore }: GameOverlayProps) {
  if (status === 'running' || status === 'clearing') return null

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/75 text-center backdrop-blur-sm">
      {status === 'idle' && (
        <>
          <h2 className="text-2xl font-extrabold">Tetris.dev</h2>
          <p className="text-sm text-white/60">Press Enter to start</p>
        </>
      )}
      {status === 'paused' && (
        <>
          <h2 className="text-2xl font-extrabold">Paused</h2>
          <p className="text-sm text-white/60">Press P to resume</p>
        </>
      )}
      {status === 'gameover' && (
        <>
          <h2 className="text-2xl font-extrabold text-red-400">Game Over</h2>
          <p className="text-sm text-white/70">Score: {score}</p>
          {score >= highScore && score > 0 && (
            <p className="text-sm font-semibold text-yellow-400">New high score!</p>
          )}
          <p className="mt-1 text-sm text-white/60">Press Enter to play again</p>
        </>
      )}
    </div>
  )
}
