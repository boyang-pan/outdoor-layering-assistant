'use client'
import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
  loading?: boolean
}

export function Button({ variant = 'primary', loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'w-full rounded-[var(--radius-md)] px-5 py-3 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'primary' && [
          'bg-[var(--color-accent)] text-white',
          'hover:bg-[#5558e3] hover:shadow-[0_0_24px_rgba(99,102,241,0.3)]',
        ],
        variant === 'ghost' && [
          'bg-transparent border border-[var(--color-border-base)] text-[var(--color-text-secondary)]',
          'hover:border-[var(--color-border-base)] hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-text-primary)]',
        ],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          {children}
        </span>
      ) : children}
    </button>
  )
}
