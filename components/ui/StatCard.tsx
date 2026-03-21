import { cn } from '@/lib/utils'

interface StatCardProps {
  value: string | number
  label: string
  className?: string
}

export function StatCard({ value, label, className }: StatCardProps) {
  return (
    <div className={cn(
      'bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] p-3.5',
      className
    )}>
      <div className="text-[22px] font-light font-mono tracking-tight mb-1 text-[var(--color-text-primary)]">
        {value}
      </div>
      <div className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-[0.5px]">
        {label}
      </div>
    </div>
  )
}
