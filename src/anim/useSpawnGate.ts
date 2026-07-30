import { useCallback, useRef } from "react";
import type { RefObject } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "./gsap";
import { getDropInterval } from "../game/constants";
import type { GameEffect, GameStatus, TetrominoType } from "../game/types";
import { TETROMINO_COLORS } from "../game/tetrominoes";

const NEON = {
  idleLip: 0.2,
  peakLip: 1,
  idleGlow: 0.07,
  peakGlow: 0.34,
  prePeak: 0.82,
  /** Level-1 reference durations in seconds — scaled down as gravity speeds up. */
  rampDuration: 5,
  peakIn: 0.11,
  peakHold: 0.07,
  settle: 0.5,
  pieceIn: 0.26,
  colorShift: 0.4,
  colorHold: 0.5,
  clearRamp: 0.55,
  reducedPeak: 0.55,
  stagger: 0.018,
};

const FALLBACK_COLOR = "#22d3ee";

interface NeonPace {
  rampDuration: number;
  peakIn: number;
  peakHold: number;
  settle: number;
  pieceIn: number;
  colorShift: number;
  colorHold: number;
  clearRamp: number;
  stagger: number;
}

/** Scale neon timing to match gravity — snappier pulses as level climbs. */
function getNeonPace(level: number): NeonPace {
  const dropMs = getDropInterval(level);
  const pace = gsap.utils.clamp(0.28, 1, dropMs / getDropInterval(1));
  const rowsPerPiece = 9;

  return {
    rampDuration: gsap.utils.clamp(
      0.85,
      NEON.rampDuration,
      (dropMs * rowsPerPiece) / 1000,
    ),
    peakIn: NEON.peakIn * pace,
    peakHold: NEON.peakHold * pace,
    settle: NEON.settle * pace,
    pieceIn: NEON.pieceIn * pace,
    colorShift: NEON.colorShift * pace,
    colorHold: NEON.colorHold * pace,
    clearRamp: Math.max(0.2, NEON.clearRamp * pace),
    stagger: NEON.stagger * pace,
  };
}

function getSpawnType(effect: GameEffect | null): TetrominoType | null {
  if (!effect) return null;
  if (effect.kind === "spawn") return effect.type;
  if (effect.kind === "lock" && effect.spawnType) return effect.spawnType;
  return null;
}

function resolveColor(type: TetrominoType | null): string {
  return type ? TETROMINO_COLORS[type] : FALLBACK_COLOR;
}

interface SpawnGateArgs {
  gateRef: RefObject<HTMLDivElement | null>;
  boardRef: RefObject<HTMLDivElement | null>;
  lastEffect: GameEffect | null;
  nextType: TetrominoType | null;
  status: GameStatus;
  level: number;
}

/**
 * Persistent top neon keyed to the next piece in queue. Between spawns it
 * climbs slowly; a lock during a line clear accelerates toward the clear
 * commit; the spawn pulse hits full brightness as the piece appears.
 */
export function useSpawnGate({
  gateRef,
  boardRef,
  lastEffect,
  nextType,
  status,
  level,
}: SpawnGateArgs) {
  const intensity = useRef({ v: 0 });
  const ramp = useRef<gsap.core.Tween | null>(null);
  const colorRef = useRef(FALLBACK_COLOR);
  const colorJob = useRef<gsap.core.Tween | null>(null);
  const paceRef = useRef(getNeonPace(level));
  paceRef.current = getNeonPace(level);

  const shiftColor = useCallback(
    (gate: HTMLElement, target: string, delay = 0, shiftDuration?: number) => {
      colorJob.current?.kill();

      const from = colorRef.current;
      if (from === target) {
        gate.style.setProperty("--spawn-color", target);
        return;
      }

      const duration = shiftDuration ?? paceRef.current.colorShift;
      const blend = { t: 0 };
      const tween = () => {
        colorJob.current = gsap.to(blend, {
          t: 1,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
            gate.style.setProperty(
              "--spawn-color",
              gsap.utils.interpolate(from, target, blend.t),
            );
          },
          onComplete: () => {
            colorRef.current = target;
          },
        });
      };

      if (delay > 0) {
        colorJob.current = gsap.delayedCall(delay, tween);
      } else {
        tween();
      }
    },
    [],
  );

  const holdSpawnColor = useCallback(
    (
      gate: HTMLElement,
      spawnType: TetrominoType,
      queuedNext: TetrominoType | null,
    ) => {
      const pace = paceRef.current;
      const spawnColor = resolveColor(spawnType);
      colorJob.current?.kill();
      gate.style.setProperty("--spawn-color", spawnColor);
      colorRef.current = spawnColor;
      shiftColor(
        gate,
        resolveColor(queuedNext),
        pace.colorHold,
        pace.colorShift,
      );
    },
    [shiftColor],
  );

  const applyIntensity = useCallback((gate: HTMLElement) => {
    const lip = gate.querySelector("[data-spawn-lip]");
    const glow = gate.querySelector("[data-spawn-glow]");
    const t = intensity.current.v;

    gsap.set(lip, {
      opacity: gsap.utils.interpolate(NEON.idleLip, NEON.peakLip, t),
      scaleX: 1,
    });
    gsap.set(glow, {
      opacity: gsap.utils.interpolate(NEON.idleGlow, NEON.peakGlow, t),
    });
  }, []);

  const stopRamp = useCallback(() => {
    ramp.current?.kill();
    ramp.current = null;
  }, []);

  const startRamp = useCallback(
    (gate: HTMLElement) => {
      const pace = paceRef.current;
      stopRamp();

      const remaining = NEON.prePeak - intensity.current.v;
      const duration =
        remaining >= NEON.prePeak - 0.01
          ? pace.rampDuration
          : pace.rampDuration * (remaining / NEON.prePeak);

      ramp.current = gsap.to(intensity.current, {
        v: NEON.prePeak,
        duration,
        ease: "power1.in",
        onUpdate: () => applyIntensity(gate),
      });
    },
    [applyIntensity, stopRamp],
  );

  const pulsePeak = useCallback(
    (gate: HTMLElement, board: HTMLDivElement | null) => {
      const pace = paceRef.current;
      stopRamp();

      const active = board?.querySelectorAll('[data-variant="active"]');
      const reduced = prefersReducedMotion();

      if (board) {
        const cells = board.querySelectorAll("[data-row]");
        gsap.killTweensOf(cells);
        gsap.set(cells, { clearProps: "transform,opacity,filter" });
      }

      const tl = gsap.timeline({
        onComplete: () => {
          if (status === "running") startRamp(gate);
        },
      });

      if (reduced) {
        tl.to(intensity.current, {
          v: NEON.reducedPeak,
          duration: pace.peakIn,
          onUpdate: () => applyIntensity(gate),
        }).to(intensity.current, {
          v: 0,
          duration: pace.settle,
          onUpdate: () => applyIntensity(gate),
        });
        return;
      }

      tl.to(intensity.current, {
        v: 1,
        duration: pace.peakIn,
        ease: "power2.out",
        onUpdate: () => applyIntensity(gate),
      })
        .to({}, { duration: pace.peakHold })
        .to(intensity.current, {
          v: 0,
          duration: pace.settle,
          ease: "power2.inOut",
          onUpdate: () => applyIntensity(gate),
        });

      if (active && active.length > 0) {
        tl.fromTo(
          active,
          { opacity: 0.55 },
          {
            opacity: 1,
            duration: pace.pieceIn,
            ease: "power2.out",
            stagger: pace.stagger,
            clearProps: "opacity",
          },
          0.02,
        );
      }
    },
    [applyIntensity, startRamp, status, stopRamp],
  );

  // Visibility + ramp lifecycle for play state.
  useGSAP(
    () => {
      const gate = gateRef.current;
      if (!gate) return;

      const active =
        status === "running" || status === "clearing" || status === "paused";

      if (!active) {
        stopRamp();
        colorJob.current?.kill();
        gsap.set(gate, { autoAlpha: 0 });
        intensity.current.v = 0;
        applyIntensity(gate);
        return;
      }

      gsap.set(gate, { autoAlpha: 1 });
      applyIntensity(gate);

      if (status === "paused") {
        stopRamp();
        return;
      }

      if (
        status === "running" &&
        !ramp.current &&
        intensity.current.v < NEON.prePeak
      ) {
        startRamp(gate);
      }
    },
    { dependencies: [status], scope: gateRef, revertOnUpdate: false },
  );

  // Retime the ambient ramp when level — and therefore gravity — changes.
  useGSAP(
    () => {
      const gate = gateRef.current;
      if (!gate || status !== "running" || !ramp.current) return
      startRamp(gate);
    },
    { dependencies: [level], scope: gateRef, revertOnUpdate: false },
  );

  // Spawn pulse + line-clear anticipation ramp.
  useGSAP(
    () => {
      const gate = gateRef.current;
      const board = boardRef.current;
      if (!gate || !lastEffect) return;

      const pace = paceRef.current;

      if (lastEffect.kind === "lock" && lastEffect.linesCleared > 0) {
        stopRamp();
        ramp.current = gsap.to(intensity.current, {
          v: NEON.prePeak,
          duration: pace.clearRamp,
          ease: "sine.in",
          onUpdate: () => applyIntensity(gate),
        });
        return;
      }

      const spawnType = getSpawnType(lastEffect);
      if (!spawnType) return;

      holdSpawnColor(gate, spawnType, nextType);
      pulsePeak(gate, board);
    },
    {
      dependencies: [lastEffect, nextType],
      scope: gateRef,
      revertOnUpdate: false,
    },
  );
}
