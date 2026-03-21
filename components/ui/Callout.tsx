import { cn } from '@/lib/utils'

interface CalloutProps {
  variant?: 'default' | 'warn'
  children: React.ReactNode
  className?: string
}

export function Callout({ variant = 'default', children, className }: CalloutProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 bg-[var(--color-bg-muted)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] p-3',
        variant === 'default' ? 'border-l-[3px] border-l-[var(--color-accent)]' : 'border-l-[3px] border-l-[var(--color-status-amber)]',
        className
      )}
    >
      <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">{children}</p>
    </div>
  )
}
