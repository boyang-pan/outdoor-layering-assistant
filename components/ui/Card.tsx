import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
