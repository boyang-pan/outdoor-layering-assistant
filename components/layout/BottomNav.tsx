'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/history', label: 'History', Icon: Clock },
  { href: '/profile', label: 'Profile', Icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 md:hidden bg-[var(--color-bg-base)] border-t border-[var(--color-border-subtle)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-[420px] mx-auto h-14 flex items-center">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors',
                active
                  ? 'text-[var(--color-accent-light)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              )}
            >
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
