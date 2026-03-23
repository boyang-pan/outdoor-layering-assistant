'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/history', label: 'History' },
  { href: '/profile', label: 'Profile' },
]

export function TopBar() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-20 h-[57px] flex items-center justify-between px-5 bg-[var(--color-bg-base)] border-b border-[var(--color-border-subtle)]">
      <div className="flex items-center gap-6 self-stretch">
        <Link href="/" className="text-[var(--color-text-primary)] font-semibold text-base tracking-tight">
          👕
        </Link>
        <nav className="hidden md:flex items-center self-stretch gap-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'self-stretch flex items-center px-3 text-sm font-medium border-b-2 transition-colors',
                  active
                    ? 'text-[var(--color-text-primary)] border-[var(--color-accent-light)]'
                    : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-secondary)]'
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
      <Link
        href="/profile"
        className="md:hidden h-9 w-9 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-raised)] transition-colors"
      >
        <Settings size={16} strokeWidth={1.5} />
      </Link>
    </header>
  )
}
