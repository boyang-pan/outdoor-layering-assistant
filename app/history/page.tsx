'use client'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Chip } from '@/components/ui/Chip'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useSessions } from '@/hooks/useSession'
import { sessionName, type Session } from '@/lib/types'
import { formatTime } from '@/lib/utils'
import { Activity } from 'lucide-react'

function getStatusChip(session: Session) {
  const fb = session.feedback
  if (session.status === 'upcoming') return <Chip variant="blue">Upcoming</Chip>
  if (session.status === 'active') return <Chip variant="blue">In progress</Chip>
  if (session.status === 'feedback_pending') {
    const endTime = new Date(session.departureTime).getTime() + session.durationMins * 60 * 1000
    if (Date.now() < endTime) return <Chip variant="blue">In progress</Chip>
    return <Chip variant="amber">Feedback due</Chip>
  }
  if (session.status === 'expired') return <Chip variant="muted">No feedback</Chip>
  if (session.status === 'complete' && fb) {
    const hasWarm = (['start', 'middle', 'end'] as const).some(p => fb.phases[p].rating === 'too_warm')
    const hasCold = (['start', 'middle', 'end'] as const).some(p => fb.phases[p].rating === 'too_cold')
    if (hasWarm) return <Chip variant="red">Too warm</Chip>
    if (hasCold) return <Chip variant="blue">Too cold</Chip>
    return <Chip variant="green">Good ✓</Chip>
  }
  return <Chip variant="blue">Complete</Chip>
}

function SessionDot({ state }: { state: 'good' | 'mixed' | null }) {
  if (state === 'good') return (
    <div className="w-6 h-6 rounded-full bg-[var(--color-status-green-bg)] border border-green-500/20 flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-[var(--color-status-green)]" />
    </div>
  )
  if (state === 'mixed') return (
    <div className="w-6 h-6 rounded-full bg-[var(--color-status-amber-bg)] border border-amber-500/20 flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-[var(--color-status-amber)]" />
    </div>
  )
  return (
    <div className="w-6 h-6 rounded-full bg-[var(--color-bg-raised)] border border-[var(--color-border-subtle)] flex items-center justify-center">
      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] opacity-40" />
    </div>
  )
}

export default function HistoryPage() {
  const { sessions } = useSessions()
  const sorted = [...sessions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const lastTen = sorted.slice(0, 10)
  const sparkData = lastTen.reverse().map(s => {
    if (s.status !== 'complete' || !s.feedback) return null
    const allGood = (['start', 'middle', 'end'] as const).every(p => s.feedback!.phases[p].rating === 'good')
    return allGood ? 'good' : 'mixed'
  }) as Array<'good' | 'mixed' | null>
  // Pad to 10
  while (sparkData.length < 10) sparkData.unshift(null)

  const grouped: Record<string, Session[]> = {}
  for (const s of sorted) {
    const key = new Date(s.departureTime).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  }
  const months = Object.keys(grouped)

  const sessionLink = (s: Session) =>
    s.status === 'feedback_pending' ? `/feedback/${s.id}` : `/session/${s.id}`

  return (
    <div className="pb-20 md:pb-8 page-enter">
      <TopBar />
      <div className="px-5 py-6">
        {sparkData.some(d => d !== null) && (
          <div className="mb-6">
            <SectionLabel className="mt-0">Last 10 sessions</SectionLabel>
            <div className="flex gap-2 items-center">
              {sparkData.map((state, i) => <SessionDot key={i} state={state} />)}
            </div>
            <div className="flex gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                <div className="w-2 h-2 rounded-full bg-[var(--color-status-green)]" /> All good
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                <div className="w-2 h-2 rounded-full bg-[var(--color-status-amber)]" /> Mixed
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                <div className="w-2 h-2 rounded-full bg-[var(--color-text-muted)] opacity-40" /> No feedback
              </span>
            </div>
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[var(--color-text-muted)] text-sm">No sessions yet</p>
            <p className="text-[var(--color-text-muted)] text-[12px] mt-1">Plan a workout to get started</p>
          </div>
        ) : (
          <div className="space-y-6">
            {months.map(month => (
              <div key={month}>
                <p className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-[0.8px] mb-3">
                  {month}
                </p>
                <div className="space-y-3">
                  {grouped[month].map(s => {
                    const dep = new Date(s.departureTime)
                    const tempStr = s.recommendation ? `${Math.round(s.recommendation.weatherSnapshot.minApparentTemp)}°C` : ''
                    return (
                      <Link key={s.id} href={sessionLink(s)} className="block">
                        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] p-4 hover:bg-[var(--color-bg-muted)] transition-colors">
                          <Activity size={16} strokeWidth={1.5} className="text-[var(--color-text-muted)] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                              {sessionName(s.activity, dep)}
                            </p>
                            <p className="text-[12px] text-[var(--color-text-muted)] font-mono">
                              {dep.toLocaleDateString()} · {formatTime(dep)} {tempStr && `· ${tempStr}`}
                            </p>
                          </div>
                          {getStatusChip(s)}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
