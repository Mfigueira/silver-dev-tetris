import { buildDisplayGrid } from "./game/board";
import { BackgroundField } from "./components/BackgroundField";
import { Board } from "./components/Board";
import { GameOverlay } from "./components/GameOverlay";
import { LevelUpBurst } from "./components/LevelUpBurst";
import { NextPiece } from "./components/NextPiece";
import { SidePanel } from "./components/SidePanel";
import { useTetris } from "./hooks/useTetris";

function App() {
  const { state, toggleAutopilot, commitClear } = useTetris();
  const grid = buildDisplayGrid(
    state.board,
    state.activePiece,
    state.clearingLines,
  );
  const nextType = state.queue[0] ?? null;

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 px-4 py-8">
      <BackgroundField level={state.level} />

      <h1
        className="text-3xl font-black tracking-tight"
        style={{ textShadow: "0 0 32px rgba(34, 211, 238, 0.15)" }}
      >
        Tetris
        <span
          className="text-cyan-400"
          style={{ textShadow: "0 0 20px rgba(34, 211, 238, 0.55)" }}
        >
          .dev
        </span>
      </h1>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative">
          <Board
            grid={grid}
            clearingLines={state.clearingLines}
            lastEffect={state.lastEffect}
            nextType={nextType}
            status={state.status}
            level={state.level}
            onClearComplete={commitClear}
          />
          <LevelUpBurst level={state.level} status={state.status} />
          <GameOverlay
            status={state.status}
            score={state.score}
            highScore={state.highScore}
          />
        </div>

        <div className="flex flex-row flex-wrap justify-center gap-3 sm:w-28 sm:flex-col">
          <NextPiece type={nextType} />
          <SidePanel
            score={state.score}
            level={state.level}
            lines={state.lines}
            highScore={state.highScore}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={toggleAutopilot}
        className={`rounded-xl border px-4 py-2 text-sm font-bold uppercase tracking-widest transition-colors ${
          state.autopilot
            ? "border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.25)]"
            : "glass-panel text-white/70 hover:border-cyan-400/40 hover:text-white/90"
        }`}
      >
        Autopilot: {state.autopilot ? "On" : "Off"}
      </button>

      <div className="max-w-sm text-center text-xs leading-relaxed text-white/40">
        <div className="mb-2">
          <div className="mb-1">
            <kbd className="rounded bg-white/10 px-1.5 py-0.5">←</kbd>{" "}
            <kbd className="rounded bg-white/10 px-1.5 py-0.5">→</kbd> move ·{" "}
            <kbd className="rounded bg-white/10 px-1.5 py-0.5">↑</kbd> rotate ·{" "}
            <kbd className="rounded bg-white/10 px-1.5 py-0.5">↓</kbd> soft drop
          </div>
          <div>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5">Space</kbd> hard
            drop · <kbd className="rounded bg-white/10 px-1.5 py-0.5">P</kbd>{" "}
            pause · <kbd className="rounded bg-white/10 px-1.5 py-0.5">A</kbd>{" "}
            autopilot
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
