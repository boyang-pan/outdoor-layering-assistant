'use client'
import { useState, useEffect, useRef } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  content: string
  side?: 'right' | 'left'
  placement?: 'top' | 'bottom'
  className?: string
}

export function InfoTooltip({ content, side = 'right', placement = 'top', className }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <span
      ref={wrapperRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className={cn('relative inline-flex items-center', className)}
    >
      <button
        type="button"
        aria-label="More information"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'p-0.5 bg-transparent border-none cursor-pointer transition-colors rounded-full',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]',
          open
            ? 'text-[var(--color-text-secondary)]'
            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
        )}
      >
        <Info size={12} strokeWidth={1.8} />
      </button>

      {open && (
        <div
          role="tooltip"
          className={cn(
            'tooltip-enter absolute z-50',
            placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
            'w-[220px] px-3 py-2.5',
            'bg-[var(--color-bg-overlay)] border border-[var(--color-border-base)]',
            'rounded-[var(--radius-md)]',
            'text-[11px] leading-relaxed text-[var(--color-text-secondary)] normal-case tracking-normal',
            'shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
            side === 'left' ? 'right-0' : 'left-0'
          )}
        >
          {content}
        </div>
      )}
    </span>
  )
}
