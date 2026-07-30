import { memo, useLayoutEffect, useMemo, useRef } from "react";
import type { DisplayCell } from "../game/board";

interface CellProps {
  cell: DisplayCell;
  row: number;
  col: number;
}

const PARTICLE_COUNT = 7;

interface Particle {
  tx: number;
  ty: number;
  rot: number;
  size: number;
}

/**
 * Per-particle trajectories are randomized here and read back by the clear
 * timeline through data attributes, so the burst differs cell to cell without
 * the animation layer needing to know anything about grid geometry.
 */
function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle =
      (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.6;
    const distance = 16 + Math.random() * 20;
    return {
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance,
      rot: Math.round((Math.random() - 0.5) * 480),
      size: 3 + Math.random() * 3,
    };
  });
}

function CellComponent({ cell, row, col }: CellProps) {
  const ref = useRef<HTMLDivElement>(null);
  const particles = useMemo(
    () => (cell.variant === "clearing" ? makeParticles() : []),
    [cell.variant],
  );

  // Spawn/rotate tweens target active cells by DOM node. When the piece moves,
  // those nodes become empty but can keep inline transforms from GSAP.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || (cell.variant !== "empty" && cell.variant !== "ghost")) return;
    el.style.transform = "";
    el.style.opacity = "";
    el.style.filter = "";
  }, [cell.variant]);

  if (cell.variant === "ghost") {
    return (
      <div
        ref={ref}
        data-row={row}
        data-col={col}
        data-variant="ghost"
        className="aspect-square rounded-[3px] border-2 bg-transparent"
        style={{ borderColor: `${cell.color}80` }}
      />
    );
  }

  if (cell.variant === "empty") {
    return (
      <div
        ref={ref}
        data-row={row}
        data-col={col}
        data-variant="empty"
        className="aspect-square rounded-[3px] bg-white/[0.04]"
      />
    );
  }

  if (cell.variant === "clearing") {
    return (
      <div
        data-row={row}
        data-col={col}
        data-variant="clearing"
        className="relative aspect-square overflow-visible rounded-[3px]"
      >
        <div
          data-clear-tile
          className="absolute inset-0 rounded-[3px] will-change-transform"
          style={{ backgroundColor: cell.color ?? undefined }}
        />
        <div
          data-clear-flash
          className="absolute inset-0 rounded-[3px] bg-white opacity-0 will-change-transform"
        />
        {particles.map((p, i) => (
          <span
            key={i}
            data-clear-particle
            data-tx={p.tx}
            data-ty={p.ty}
            data-rot={p.rot}
            className="absolute left-1/2 top-1/2 rounded-[1px] opacity-0 will-change-transform"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              marginLeft: `-${p.size / 2}px`,
              marginTop: `-${p.size / 2}px`,
              backgroundColor: cell.color ?? "#ffffff",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-row={row}
      data-col={col}
      data-variant={cell.variant}
      className="aspect-square rounded-[3px]"
      style={{
        backgroundColor: cell.color ?? undefined,
        boxShadow:
          "inset 0 0 0 2px rgba(255,255,255,0.25), inset 0 -3px 4px rgba(0,0,0,0.25)",
      }}
    />
  );
}

// buildDisplayGrid allocates fresh cell objects every gravity tick, so compare
// by value: without this all 200 cells re-render several times a second.
export const Cell = memo(
  CellComponent,
  (prev, next) =>
    prev.cell.variant === next.cell.variant &&
    prev.cell.color === next.cell.color &&
    prev.row === next.row &&
    prev.col === next.col,
);
