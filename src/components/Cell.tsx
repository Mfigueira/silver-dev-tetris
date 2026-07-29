import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { DisplayCell } from '../game/board'

interface CellProps {
  cell: DisplayCell
}

const PARTICLE_COUNT = 7

interface Particle {
  tx: string
  ty: string
  rot: string
  delay: string
  size: number
}

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.6
    const distance = 16 + Math.random() * 20
    return {
      tx: `${Math.cos(angle) * distance}px`,
      ty: `${Math.sin(angle) * distance}px`,
      rot: `${Math.round((Math.random() - 0.5) * 480)}deg`,
      delay: `${Math.round(Math.random() * 40)}ms`,
      size: 3 + Math.random() * 3,
    }
  })
}

export function Cell({ cell }: CellProps) {
  const particles = useMemo(() => (cell.variant === 'clearing' ? makeParticles() : []), [cell.variant])

  if (cell.variant === 'ghost') {
    return (
      <div
        className="aspect-square rounded-[3px] border-2 bg-transparent"
        style={{ borderColor: `${cell.color}80` }}
      />
    )
  }

  if (cell.variant === 'empty') {
    return <div className="aspect-square rounded-[3px] bg-white/[0.04]" />
  }

  if (cell.variant === 'clearing') {
    return (
      <div className="relative aspect-square overflow-visible rounded-[3px]">
        <div
          className="absolute inset-0 rounded-[3px] [animation:line-clear-collapse_380ms_ease-in_forwards]"
          style={{ backgroundColor: cell.color ?? undefined }}
        />
        <div className="absolute inset-0 rounded-[3px] bg-white [animation:line-clear-flash_380ms_ease-out_forwards]" />
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 rounded-[1px] [animation:line-clear-particle_380ms_ease-out_forwards]"
            style={
              {
                width: `${p.size}px`,
                height: `${p.size}px`,
                marginLeft: `-${p.size / 2}px`,
                marginTop: `-${p.size / 2}px`,
                backgroundColor: cell.color ?? '#ffffff',
                animationDelay: p.delay,
                '--tx': p.tx,
                '--ty': p.ty,
                '--rot': p.rot,
              } as CSSProperties
            }
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className="aspect-square rounded-[3px]"
      style={{
        backgroundColor: cell.color ?? undefined,
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.25), inset 0 -3px 4px rgba(0,0,0,0.25)',
      }}
    />
  )
}
