'use client'
import { useRef, useCallback } from 'react'
import { DURATION_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface SliderProps {
  value: number // index 0–18
  onChange: (index: number) => void
  className?: string
}

export function Slider({ value, onChange, className }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  const getIndexFromX = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return value
    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(ratio * (DURATION_LABELS.length - 1))
  }, [value])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0) return
    onChange(getIndexFromX(e.clientX))
  }, [getIndexFromX, onChange])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    onChange(getIndexFromX(e.clientX))
  }, [getIndexFromX, onChange])

  const percent = (value / (DURATION_LABELS.length - 1)) * 100

  return (
    <div className={cn('space-y-3', className)}>
      <div className="text-[var(--color-text-primary)] font-medium font-mono text-sm">
        {DURATION_LABELS[value]}
      </div>
      <div
        ref={trackRef}
        className="relative h-10 flex items-center cursor-pointer select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {/* Track background */}
        <div className="absolute inset-x-0 h-1 rounded-full bg-[var(--color-bg-raised)]" />
        {/* Track fill */}
        <div
          className="absolute left-0 h-1 rounded-full bg-[var(--color-accent)]"
          style={{ width: `${percent}%` }}
        />
        {/* Thumb */}
        <div
          className="absolute h-4 w-4 rounded-full bg-[var(--color-accent)] border-2 border-white/20 shadow -translate-x-1/2"
          style={{ left: `${percent}%` }}
        />
      </div>
    </div>
  )
}
