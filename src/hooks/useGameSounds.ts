import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "../audio/engine";
import { musicPlayer } from "../audio/music";
import {
  playGameOver,
  playGameStart,
  playLevelUp,
  playLineClear,
  playLock,
  playMove,
  playPause,
  playResume,
  playRotate,
  playSpawn,
} from "../audio/sfx";
import type { SoundSettings } from "../audio/storage";
import { BOARD_WIDTH } from "../game/constants";
import type { GameState, Position } from "../game/types";

function isMusicActive(status: GameState["status"]): boolean {
  return status === "running" || status === "clearing";
}

/** Places a sound roughly where it happened on the board, at a gentle width. */
function columnPan(x: number): number {
  return (x / (BOARD_WIDTH - 1) - 0.5) * 0.9;
}

function cellsPan(cells: Position[]): number {
  if (cells.length === 0) return 0;
  const total = cells.reduce((sum, cell) => sum + cell.x, 0);
  return columnPan(total / cells.length);
}

export function useGameSounds(state: GameState) {
  const prevEffectRef = useRef(state.lastEffect);
  const prevStatusRef = useRef(state.status);
  const prevLevelRef = useRef(state.level);
  const skipNextSpawnRef = useRef(false);
  const wasMusicActiveRef = useRef(isMusicActive(state.status));
  const prevPieceXRef = useRef<number | null>(null);
  const prevMoveEffectRef = useRef(state.lastEffect);

  useEffect(() => {
    function unlock() {
      void audioEngine.unlock();
    }

    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => {
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  useEffect(() => {
    const active = isMusicActive(state.status);
    if (active && !wasMusicActiveRef.current) {
      void audioEngine.unlock().then(() => musicPlayer.start());
    } else if (!active && wasMusicActiveRef.current) {
      musicPlayer.stop();
    }
    wasMusicActiveRef.current = active;
  }, [state.status]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    if (
      state.status === "running" &&
      (prev === "idle" || prev === "gameover")
    ) {
      skipNextSpawnRef.current = true;
      void audioEngine.unlock().then(() => playGameStart());
    }
    if (state.status === "gameover" && prev !== "gameover") {
      playGameOver();
    }
    if (state.status === "paused" && prev === "running") {
      playPause();
    }
    if (state.status === "running" && prev === "paused") {
      playResume();
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  // The reducer publishes no signal for a sideways step, and it shouldn't:
  // a move that runs into a wall is a no-op. Watching the column instead means
  // only movement that actually happened makes a sound.
  useEffect(() => {
    const effect = state.lastEffect;
    const effectFired = effect !== prevMoveEffectRef.current;
    prevMoveEffectRef.current = effect;

    const x = state.activePiece?.position.x ?? null;
    const prevX = prevPieceXRef.current;
    prevPieceXRef.current = x;

    if (x === null || prevX === null || x === prevX) return;
    if (state.status !== "running") return;
    // A spawn resets the column to the middle, and a rotation that kicked off a
    // wall already made its own sound; neither is the player stepping sideways.
    if (effectFired) return;

    playMove(columnPan(x));
  }, [state.activePiece, state.lastEffect, state.status]);

  useEffect(() => {
    if (state.lastEffect === prevEffectRef.current) return;
    prevEffectRef.current = state.lastEffect;
    if (!state.lastEffect) return;

    switch (state.lastEffect.kind) {
      case "spawn":
        if (skipNextSpawnRef.current) {
          skipNextSpawnRef.current = false;
          break;
        }
        playSpawn();
        break;
      case "rotate":
        playRotate();
        break;
      case "lock":
        playLock(state.lastEffect.dropDistance, cellsPan(state.lastEffect.cells));
        if (state.lastEffect.linesCleared > 0) {
          playLineClear(state.lastEffect.linesCleared);
        }
        break;
      default:
        break;
    }
  }, [state.lastEffect]);

  useEffect(() => {
    if (state.level > prevLevelRef.current && prevLevelRef.current > 0) {
      playLevelUp();
    }
    prevLevelRef.current = state.level;
  }, [state.level]);
}

export function useSoundSettings(): SoundSettings & {
  toggleMusic: () => void;
  toggleSfx: () => void;
} {
  const [settings, setSettings] = useState<SoundSettings>(() =>
    audioEngine.getSettings(),
  );

  useEffect(() => audioEngine.subscribe(setSettings), []);

  const toggleMusic = useCallback(() => {
    void audioEngine.unlock();
    const enabled = audioEngine.toggleMusic();
    if (enabled) {
      musicPlayer.start();
    } else {
      musicPlayer.stop();
    }
  }, []);

  const toggleSfx = useCallback(() => {
    void audioEngine.unlock();
    audioEngine.toggleSfx();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "m":
        case "M":
          toggleMusic();
          break;
        case "s":
        case "S":
          toggleSfx();
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleMusic, toggleSfx]);

  return {
    ...settings,
    toggleMusic,
    toggleSfx,
  };
}
