import { cn } from '@/lib/utils'

type ChipVariant = 'upcoming' | 'amber' | 'green' | 'red' | 'blue'

interface ChipProps {
  variant: ChipVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<ChipVariant, string> = {
  upcoming: 'bg-[var(--color-status-blue-bg)] border-blue-500/20 text-[var(--color-status-blue)]',
  blue: 'bg-[var(--color-status-blue-bg)] border-blue-500/20 text-[var(--color-status-blue)]',
  amber: 'bg-[var(--color-status-amber-bg)] border-amber-500/20 text-[var(--color-status-amber)]',
  green: 'bg-[var(--color-status-green-bg)] border-green-500/20 text-[var(--color-status-green)]',
  red: 'bg-[var(--color-status-red-bg)] border-red-500/20 text-[var(--color-status-red)]',
}

export function Chip({ variant, children, className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
