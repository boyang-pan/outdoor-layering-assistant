'use client'
import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export function Pill({ active, className, children, ...props }: PillProps) {
  return (
    <button
      type="button"
      className={cn(
        'px-3.5 py-2 rounded-full border text-[13px] cursor-pointer transition-all active:scale-[0.97]',
        active
          ? 'bg-[var(--color-accent-glow)] border-[var(--color-accent)] text-[var(--color-accent-light)] font-medium'
          : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-base)] hover:text-[var(--color-text-primary)]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
