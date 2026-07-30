# Tetris.AI

A classic Tetris game built with React, TypeScript, and Vite, featuring a built-in AI that can play the game for you.

**[▶ Play it here](https://mfigueira.github.io/tetris-ai/)**

## Features

- **Full Tetris gameplay** — all 7 tetrominoes (I, J, L, O, S, T, Z), rotation, soft/hard drop, line clears, and a leveling system that speeds up gravity as you clear more lines.
- **Autopilot AI** — a heuristic-based solver that scores every possible rotation/column placement for the current piece (aggregate height, lines cleared, holes, bumpiness) and plays the best one automatically. Toggle it on/off at any time.
- **Persistent high score** — saved to `localStorage` so it survives page reloads.
- **GSAP-driven game feel** — line clears burst outward from the centre of each row and cascade bottom-to-top, with a board shake that scales up to a slow-motion beat on a Tetris. Landings get squash-and-stretch, a brightness flash, impact dust, and a jolt proportional to how far the piece fell.
- **Level-up celebration** — an expanding shockwave, a flashing border, and a surge through the background field.
- **Animated background** — drifting tetromino motes that speed up as the level climbs.
- **Animated stats and overlays** — score and high score count up rather than snapping, overlays fade and scale in and out, and the stack collapses out of the well on game over.
- **Next-piece preview** and a responsive, keyboard-driven UI styled with Tailwind CSS.
- Honours `prefers-reduced-motion` throughout, either skipping decorative effects or replacing them with a short fade.

## Controls

| Key       | Action                |
| --------- | --------------------- |
| `←` / `→` | Move piece left/right |
| `↑`       | Rotate piece          |
| `↓`       | Soft drop             |
| `Space`   | Hard drop             |
| `P`       | Pause/resume          |
| `A`       | Toggle autopilot      |
| `Enter`   | Start / restart       |

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

## Deployment

Live at <https://mfigueira.github.io/tetris-ai/>.

Every push to `main` is linted, built, and published to GitHub Pages by
`.github/workflows/deploy.yml`. Enable it once under **Settings → Pages** by
setting **Source** to **GitHub Actions**.

Pages serves the site from `/<repo-name>/`, so the workflow passes that prefix to
the build as `BASE_PATH`. Local `dev` and `preview` leave it unset and run at `/`.
To reproduce the deployed build locally:

```bash
BASE_PATH=/tetris-ai/ npm run build
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
  anim/
    gsap.ts          # GSAP registration and the reduced-motion check
    timings.ts       # Timings shared by components that animate the same moment
    useBoardAnimations.ts  # Line-clear, impact, and game-over timelines
    useBackgroundField.ts  # The drifting mote field and its level-driven speed
    useLevelUp.ts    # Level-up burst
    useCountUp.ts    # Number tweening for the stat boxes
  components/
    Board.tsx, Cell.tsx, NextPiece.tsx, SidePanel.tsx, GameOverlay.tsx
    BackgroundField.tsx, LevelUpBurst.tsx
  App.tsx            # Top-level layout
```

## How the Animations Fit In

The reducer stays pure and publishes a `lastEffect` describing what just happened
(a rotation, or a lock with its cells, contact row, drop distance, and rows
completed). `useBoardAnimations` reacts to that, so gameplay logic never holds a
duration or an easing curve. `Cell` exposes `data-row`/`data-col`/`data-variant`
attributes for the animation layer to target, which keeps GSAP out of all 200
cell components.

The line-clear timeline **owns the game clock**: the reducer parks in the
`clearing` status and only advances when the timeline's `onComplete` dispatches
`COMMIT_CLEAR`, so the animation's length is defined in exactly one place.
`CLEAR_SAFETY_TIMEOUT_MS` is a backstop for the case where that callback never
arrives; `COMMIT_CLEAR` is idempotent, so a late backstop is harmless.

`scripts/check-effects.ts` covers that contract. Run it with
`npx vite-node scripts/check-effects.ts`.

A few performance rules the animation code sticks to:

- Only `transform` and `opacity` are animated, so work stays on the compositor.
  `will-change` is set only on elements that actually move.
- The background field is the one continuously running animation. It is capped at
  24 elements, each looping forever through a wrap modifier rather than churning
  new tweens, and its viewport height is cached against `resize` instead of being
  read every frame.
- Stat numbers use `gsap.quickTo`, which reuses a single tween. Score can change
  on every gravity tick, so a fresh tween per update would be wasteful.
- Multi-element moments (the clear cascade, the game-over collapse) use one
  staggered tween rather than one tween per cell.

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
- [GSAP](https://gsap.com/) + [@gsap/react](https://gsap.com/resources/React) for the animation timelines
- [oxlint](https://oxc.rs/) for linting
