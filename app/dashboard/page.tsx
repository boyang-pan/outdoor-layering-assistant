'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { StatCard } from '@/components/ui/StatCard'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useProfile } from '@/hooks/useProfile'
import { useSessions } from '@/hooks/useSession'
import { fetchWeatherWindow } from '@/lib/weather'
import type { WeatherSnapshot, Session } from '@/lib/types'
import { sessionName } from '@/lib/types'
import { formatSessionDate } from '@/lib/utils'
import { Wind, Droplets, Activity } from 'lucide-react'

function WeatherStrip({ location, weather }: { location: { lat: number; lon: number; label: string }; weather: WeatherSnapshot | null }) {
  if (!weather) return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] p-4 mb-4">
      <p className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-[0.5px]">{location.label}</p>
      <p className="text-[12px] text-[var(--color-text-muted)] mt-1">Loading weather…</p>
    </div>
  )

  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] p-4 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="relative group min-w-0">
          <p className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-[0.5px] truncate">{location.label}</p>
          <div className="hidden group-hover:block absolute bottom-full mb-1 left-0 z-50 w-max max-w-[260px] px-3 py-2.5 bg-[var(--color-bg-overlay)] border border-[var(--color-border-base)] rounded-[var(--radius-md)] text-[11px] leading-relaxed text-[var(--color-text-secondary)] normal-case tracking-normal shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
            {location.label}
          </div>
          <p className="text-3xl font-light font-mono text-[var(--color-text-primary)] mt-1">
            {Math.round(weather.minApparentTemp)}°C
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-1 shrink-0">
          <div className="flex items-center gap-1 text-[12px] text-[var(--color-text-muted)] whitespace-nowrap">
            <Wind size={12} strokeWidth={1.5} />
            {Math.round(weather.maxWindspeed)} km/h
          </div>
          <div className="flex items-center gap-1 text-[12px] text-[var(--color-text-muted)] whitespace-nowrap">
            <Droplets size={12} strokeWidth={1.5} />
            {weather.maxPrecipProbability}%
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionBanner({ session, href, extraCount, children }: { session: Session; href: string; extraCount?: number; children: React.ReactNode }) {
  return (
    <Link href={href} className="block mb-3">
      <div className="rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] p-4 flex items-center gap-3 hover:bg-[var(--color-bg-muted)] transition-colors active:scale-[0.99]">
        <Activity size={16} strokeWidth={1.5} className="text-[var(--color-text-muted)] shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
            {sessionName(session.activity, new Date(session.departureTime))}
          </p>
          <p className="text-[12px] text-[var(--color-text-muted)]">
            {formatSessionDate(new Date(session.departureTime))}
          </p>
          {extraCount != null && extraCount > 0 && (
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              +{extraCount} more session{extraCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {children}
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { profile, loaded } = useProfile()
  const { sessions, upcomingSession, pendingSession, pendingSessions } = useSessions()
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)

  useEffect(() => {
    if (loaded && !profile.onboardingComplete) {
      router.replace('/onboarding')
    }
  }, [loaded, profile.onboardingComplete, router])

  useEffect(() => {
    if (!profile.defaultLocation) return
    const now = new Date()
    const end = new Date(now.getTime() + 60 * 60 * 1000)
    fetchWeatherWindow(profile.defaultLocation.lat, profile.defaultLocation.lon, now, end)
      .then(setWeather)
      .catch(() => {})
  }, [profile.defaultLocation])

  const completeSessions = sessions.filter(s => s.status === 'complete')
  const goodCount = completeSessions.filter(s => {
    const fb = s.feedback
    if (!fb) return false
    return (['start', 'middle', 'end'] as const).every(p => fb.phases[p].rating === 'good')
  }).length
  const goodPct = completeSessions.length > 0 ? Math.round((goodCount / completeSessions.length) * 100) : 0
  const feedbackDue = sessions.filter(s => s.status === 'feedback_pending').length
  if (!loaded) return null

  return (
    <div className="pb-20 md:pb-8 page-enter">
      <TopBar />
      <div className="px-5 py-6">
        {profile.defaultLocation ? (
          <WeatherStrip location={profile.defaultLocation} weather={weather} />
        ) : (
          <div className="rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] p-4 mb-4">
            <p className="text-[13px] text-[var(--color-text-muted)]">Set a default location in your profile to see weather here</p>
          </div>
        )}

        <Button onClick={() => router.push('/new')} className="mb-6">
          Plan a workout
        </Button>

        {upcomingSession && (
          <SessionBanner session={upcomingSession} href={`/session/${upcomingSession.id}`}>
            <Chip variant="upcoming">Upcoming</Chip>
          </SessionBanner>
        )}

        {pendingSession && (
          <SessionBanner session={pendingSession} href={`/feedback/${pendingSession.id}`} extraCount={pendingSessions.length - 1}>
            {Date.now() < new Date(pendingSession.departureTime).getTime() + pendingSession.durationMins * 60 * 1000
              ? <Chip variant="blue">In progress</Chip>
              : <Chip variant="amber">Feedback due</Chip>
            }
          </SessionBanner>
        )}

        <SectionLabel>This month</SectionLabel>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard value={profile.sessionCount} label="Sessions" />
          <StatCard value={`${goodPct}%`} label="Good rating" />
          <StatCard value={profile.feedbackCount} label="Rated sessions" />
          <StatCard value={feedbackDue} label="Feedback due" />
        </div>
        <p className="text-[11px] text-[var(--color-text-muted)] mt-2">More ratings = sharper recommendations</p>
      </div>
      <BottomNav />
    </div>
  )
}
