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
  if (session.status === 'feedback_pending') return <Chip variant="amber">Feedback due</Chip>
  if (session.status === 'complete' && fb) {
    const hasWarm = (['start', 'middle', 'end'] as const).some(p => fb.phases[p].rating === 'too_warm')
    const hasCold = (['start', 'middle', 'end'] as const).some(p => fb.phases[p].rating === 'too_cold')
    if (hasWarm) return <Chip variant="red">Too warm</Chip>
    if (hasCold) return <Chip variant="blue">Too cold</Chip>
    return <Chip variant="green">Good ✓</Chip>
  }
  return <Chip variant="blue">Complete</Chip>
}

function SparklineBar({ pct }: { pct: number | null }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className="w-full flex items-end h-8 bg-[var(--color-bg-raised)] rounded-sm overflow-hidden">
        {pct !== null ? (
          <div
            className="w-full bg-[var(--color-accent)] transition-all"
            style={{ height: `${pct}%` }}
          />
        ) : (
          <div className="w-full h-1 bg-[var(--color-bg-overlay)]" />
        )}
      </div>
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
    return allGood ? 100 : 0
  })
  // Pad to 10
  while (sparkData.length < 10) sparkData.unshift(null)

  const sessionLink = (s: Session) =>
    s.status === 'feedback_pending' ? `/feedback/${s.id}` : `/session/${s.id}`

  return (
    <div className="pb-20 md:pb-8 page-enter">
      <TopBar />
      <div className="px-5 py-6">
        <SectionLabel className="mt-0">Sessions</SectionLabel>

        {sorted.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[var(--color-text-muted)] text-sm">No sessions yet</p>
            <p className="text-[var(--color-text-muted)] text-[12px] mt-1">Plan a workout to get started</p>
          </div>
        ) : (
          <div className="space-y-2.5 mb-8">
            {sorted.map(s => {
              const dep = new Date(s.departureTime)
              const tempStr = s.recommendation ? `${Math.round(s.recommendation.weatherSnapshot.minApparentTemp)}°C` : ''
              return (
                <Link key={s.id} href={sessionLink(s)}>
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
        )}

        {sparkData.some(d => d !== null) && (
          <>
            <SectionLabel>Accuracy (last 10)</SectionLabel>
            <div className="flex gap-1 h-10 items-end">
              {sparkData.map((pct, i) => <SparklineBar key={i} pct={pct} />)}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
