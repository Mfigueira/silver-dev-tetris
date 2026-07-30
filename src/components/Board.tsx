import { useRef } from "react";
import { DUST_POOL_SIZE, useBoardAnimations } from "../anim/useBoardAnimations";
import { BOARD_WIDTH } from "../game/constants";
import type { DisplayCell } from "../game/board";
import type { GameEffect, GameStatus, TetrominoType } from "../game/types";
import { Cell } from "./Cell";
import { SpawnGate } from "./SpawnGate";

interface BoardProps {
  grid: DisplayCell[][];
  clearingLines: number[];
  lastEffect: GameEffect | null;
  nextType: TetrominoType | null;
  status: GameStatus;
  level: number;
  onClearComplete: () => void;
}

export function Board({
  grid,
  clearingLines,
  lastEffect,
  nextType,
  status,
  level,
  onClearComplete,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const dustRef = useRef<HTMLDivElement>(null);

  useBoardAnimations({
    boardRef,
    dustRef,
    clearingLines,
    lastEffect,
    status,
    onClearComplete,
  });

  return (
    <div
      ref={boardRef}
      // Clipping is applied only for the game-over cascade, so the stack falls
      // out of the well rather than over the page. It stays off the rest of the
      // time because it would otherwise crop the line-clear particles that
      // burst past the board's edge.
      className={`glass-panel relative grid gap-0.75 rounded-xl p-2 ${
        status === "gameover" ? "overflow-hidden" : ""
      }`}
      style={{
        gridTemplateColumns: `repeat(${BOARD_WIDTH}, minmax(0, 1fr))`,
        width: "min(88vw, 320px)",
      }}
    >
      {grid.flatMap((row, y) =>
        row.map((cell, x) => (
          <Cell key={`${y}-${x}`} cell={cell} row={y} col={x} />
        )),
      )}

      <SpawnGate boardRef={boardRef} lastEffect={lastEffect} nextType={nextType} status={status} level={level} />

      {/* Reused pool of impact motes, parked offscreen until a drop places them. */}
      <div
        ref={dustRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {Array.from({ length: DUST_POOL_SIZE }, (_, i) => (
          <span
            key={i}
            data-dust
            className="absolute left-0 top-0 h-1.25 w-1.25 rounded-full bg-white/70 opacity-0 will-change-transform"
          />
        ))}
      </div>
    </div>
  );
}
