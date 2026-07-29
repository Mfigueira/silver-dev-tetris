# Silver.dev Tetris

A classic Tetris game built with React, TypeScript, and Vite, featuring a built-in AI that can play the game for you.

## Features

- **Full Tetris gameplay** — all 7 tetrominoes (I, J, L, O, S, T, Z), rotation, soft/hard drop, line clears, and a leveling system that speeds up gravity as you clear more lines.
- **Autopilot AI** — a heuristic-based solver that scores every possible rotation/column placement for the current piece (aggregate height, lines cleared, holes, bumpiness) and plays the best one automatically. Toggle it on/off at any time.
- **Persistent high score** — saved to `localStorage` so it survives page reloads.
- **Line-clear animation** and a next-piece preview.
- Responsive, keyboard-driven UI styled with Tailwind CSS.

## Controls

| Key | Action |
| --- | --- |
| `←` / `→` | Move piece left/right |
| `↑` | Rotate piece |
| `↓` | Soft drop |
| `Space` | Hard drop |
| `P` | Pause/resume |
| `A` | Toggle autopilot |
| `Enter` | Start / restart |

## Getting Started

Requires Node.js.

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser.

### Other scripts

```bash
npm run build    # type-check and build for production (outputs to dist/)
npm run preview  # preview the production build locally
npm run lint      # run oxlint
```

## Project Structure

```
src/
  game/
    types.ts        # Core types (Board, ActivePiece, GameState, ...)
    constants.ts     # Board size, scoring table, drop speed, etc.
    tetrominoes.ts   # Piece shapes and rotation logic
    board.ts         # Board queries: collisions, ghost position, merging, line clearing
    reducer.ts       # Game state machine (movement, drops, pause, line clears, game over)
    storage.ts       # High score persistence (localStorage)
    ai.ts            # Autopilot heuristic: evaluates placements and picks the best move
  hooks/
    useTetris.ts     # Wires the reducer to game loop timers, keyboard input, and autopilot
  components/
    Board.tsx, Cell.tsx, NextPiece.tsx, SidePanel.tsx, GameOverlay.tsx
  App.tsx            # Top-level layout
```

## How the Autopilot Works

For the active piece, `findBestMove` (in `src/game/ai.ts`) simulates dropping every unique rotation at every valid column, then scores the resulting board using a weighted combination of:

- **Aggregate column height** (lower is better)
- **Lines cleared** (higher is better)
- **Holes created** (lower is better)
- **Bumpiness** — height difference between adjacent columns (lower is better)

The placement with the highest score is chosen, and `useTetris` steers the piece there one step at a time (rotate, then slide, then hard drop) in sync with the game's gravity speed. This is a single-piece lookahead — it doesn't consider the next piece in the queue.

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) for dev/build tooling
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [oxlint](https://oxc.rs/) for linting
