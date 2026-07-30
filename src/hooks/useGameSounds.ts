import { useCallback, useEffect, useRef, useState } from "react";
import { audioEngine } from "../audio/engine";
import { musicPlayer } from "../audio/music";
import {
  playGameOver,
  playGameStart,
  playLevelUp,
  playLineClear,
  playLock,
  playRotate,
  playSpawn,
} from "../audio/sfx";
import type { SoundSettings } from "../audio/storage";
import type { GameState } from "../game/types";

function isMusicActive(status: GameState["status"]): boolean {
  return status === "running" || status === "clearing";
}

export function useGameSounds(state: GameState) {
  const prevEffectRef = useRef(state.lastEffect);
  const prevStatusRef = useRef(state.status);
  const prevLevelRef = useRef(state.level);
  const skipNextSpawnRef = useRef(false);
  const wasMusicActiveRef = useRef(isMusicActive(state.status));

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
    prevStatusRef.current = state.status;
  }, [state.status]);

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
        playLock(state.lastEffect.dropDistance);
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
