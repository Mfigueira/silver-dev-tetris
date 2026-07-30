import { useRef, type CSSProperties, type RefObject } from "react";
import { useSpawnGate } from "../anim/useSpawnGate";
import type { GameEffect, GameStatus, TetrominoType } from "../game/types";

interface SpawnGateProps {
  boardRef: RefObject<HTMLDivElement | null>;
  lastEffect: GameEffect | null;
  nextType: TetrominoType | null;
  status: GameStatus;
  level: number;
}

/** Always-on top neon — color follows the next piece, brightness ramps toward spawn. */
export function SpawnGate({
  boardRef,
  lastEffect,
  nextType,
  status,
  level,
}: SpawnGateProps) {
  const gateRef = useRef<HTMLDivElement>(null);

  useSpawnGate({ gateRef, boardRef, lastEffect, nextType, status, level });

  return (
    <div
      ref={gateRef}
      aria-hidden
      className="pointer-events-none invisible absolute inset-2 overflow-hidden rounded-md"
      style={{ "--spawn-color": "#22d3ee" } as CSSProperties}
    >
      <div
        data-spawn-lip
        className="absolute inset-x-0 top-0 h-0.5 origin-center will-change-[opacity]"
        style={{
          background:
            "linear-gradient(90deg, transparent 4%, color-mix(in srgb, var(--spawn-color) 90%, #fff) 35%, #ecfeff 50%, color-mix(in srgb, var(--spawn-color) 90%, #fff) 65%, transparent 96%)",
          boxShadow:
            "0 0 8px color-mix(in srgb, var(--spawn-color) 55%, transparent), 0 0 18px color-mix(in srgb, var(--spawn-color) 30%, transparent)",
        }}
      />

      <div
        data-spawn-glow
        className="absolute inset-x-0 top-0 h-[24%] will-change-[opacity]"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--spawn-color) 32%, transparent) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
