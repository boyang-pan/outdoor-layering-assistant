'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useClerk } from '@clerk/nextjs'
import { useProfile } from '@/hooks/useProfile'
import { defaultProfile, type Activity } from '@/lib/types'
import { clearAll } from '@/lib/storage'
import { geocodeLocation } from '@/lib/weather'
import { LocationInput } from '@/components/ui/LocationInput'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { toast } from 'sonner'

const PACE_OPTIONS = [
  { label: 'Leisurely · 15–20 km/h', value: 17 },
  { label: 'Moderate · 20–28 km/h', value: 24 },
  { label: 'Fast · 28–35 km/h', value: 31 },
  { label: 'Racing · 35+ km/h', value: 38 },
]

function heatLabel(v: number): string {
  if (v >= 1.5) return 'Runs very warm'
  if (v >= 0.5) return 'Runs slightly warm'
  if (v <= -1.5) return 'Runs very cold'
  if (v <= -0.5) return 'Runs slightly cold'
  return 'Neutral'
}

function activityLabel(v: number): string {
  if (v >= 0.7) return 'Runs warm'
  if (v >= 0.3) return 'Slightly warm'
  if (v <= -0.7) return 'Runs cold'
  if (v <= -0.3) return 'Slightly cold'
  return 'Neutral'
}

const ACTIVITY_SUMMARY_LABELS: Record<Activity, string> = { run: 'running', cycle: 'cycling', other: 'other activities' }

function profileSummary(profile: { heatSensitivity: number; sessionCount: number; feedbackCount: number; activityModifiers: Record<Activity, number> }): string {
  if (profile.feedbackCount === 0) {
    return 'Rate a few sessions and the app will start learning your tendencies.'
  }

  const h = profile.heatSensitivity
  const heatDesc = heatLabel(h).toLowerCase().replace(/^runs\b/, 'run')
  const heatPart = Math.abs(h) < 0.4
    ? 'Your heat tendency is roughly average'
    : `You tend to ${heatDesc}`

  let activityPart = ''
  if (profile.sessionCount >= 3) {
    const activities: Activity[] = ['run', 'cycle', 'other']
    const strongest = activities
      .filter(a => Math.abs(profile.activityModifiers[a]) >= 0.3)
      .sort((a, b) => Math.abs(profile.activityModifiers[b]) - Math.abs(profile.activityModifiers[a]))[0]
    if (strongest) {
      const label = activityLabel(profile.activityModifiers[strongest]).toLowerCase().replace(/^runs\b/, 'run')
      activityPart = `, though ${label} when ${ACTIVITY_SUMMARY_LABELS[strongest]}`
    }
  }

  const nudge = profile.feedbackCount < 10 ? '. Keep rating sessions to sharpen the recommendations.' : '.'
  return `${heatPart}${activityPart}${nudge}`
}

export default function ProfilePage() {
  const router = useRouter()
  const { signOut } = useClerk()
  const { profile, setProfile, loaded } = useProfile()
  const [locationText, setLocationText] = useState(profile.defaultLocation?.label ?? '')
  const [locationLoading, setLocationLoading] = useState(false)

  useEffect(() => {
    if (loaded) setLocationText(profile.defaultLocation?.label ?? '')
  }, [loaded])
  const [showReset, setShowReset] = useState(false)

  const saveLocation = async () => {
    if (!locationText.trim()) return
    if (locationText === profile.defaultLocation?.label) {
      toast.success('Location saved')
      return
    }
    setLocationLoading(true)
    try {
      const loc = await geocodeLocation(locationText)
      setProfile({ ...profile, defaultLocation: loc })
      setLocationText(loc.label)
      toast.success('Location saved')
    } catch {
      toast.error('Location not found — try a more specific name')
    } finally {
      setLocationLoading(false)
    }
  }

  const resetProfile = () => {
    clearAll()
    router.push('/onboarding')
  }

  const ACTIVITIES: Activity[] = ['run', 'cycle', 'other']
  const ACTIVITY_LABELS: Record<Activity, string> = { run: '🏃 Running', cycle: '🚴 Cycling', other: '+ Other' }

  return (
    <div className="pb-20 md:pb-8 page-enter">
      <TopBar />
      <div className="px-5 py-6">
        {/* Heat sensitivity */}
        <div className="flex items-center gap-1.5 mt-0 mb-3">
          <SectionLabel className="mt-0 mb-0">Heat sensitivity</SectionLabel>
          <InfoTooltip
            content="Running warm means you overheat more easily than average — the app uses this to suggest fewer or lighter layers than the weather alone would call for, and vice versa."
            placement="bottom"
          />
        </div>
        <Card className="mb-2.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{heatLabel(profile.heatSensitivity)}</span>
            <span className="font-mono text-[12px] text-[var(--color-text-muted)]">{profile.heatSensitivity.toFixed(1)}</span>
          </div>
          {/* Display-only slider */}
          <div className="relative h-1.5 rounded-full bg-[var(--color-bg-raised)]">
            <div
              className="absolute h-3 w-3 rounded-full bg-[var(--color-accent)] -translate-y-[3px] -translate-x-1/2"
              style={{ left: `${((profile.heatSensitivity + 2) / 4) * 100}%` }}
            />
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-3">
            Derived from {profile.feedbackCount} session{profile.feedbackCount !== 1 ? 's' : ''}. Updated automatically.
          </p>
        </Card>

        {/* Activity adjustments */}
        <div className="flex items-center gap-1.5 mt-7 mb-3">
          <SectionLabel className="mt-0 mb-0">Activity adjustments</SectionLabel>
          <InfoTooltip
            content="The app learns whether you tend to run warmer or cooler for each activity type, and fine-tunes layer suggestions accordingly."
          />
        </div>
        <Card className="mb-2.5 space-y-3">
          {ACTIVITIES.map(a => (
            <div key={a} className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">{ACTIVITY_LABELS[a]}</span>
              {profile.sessionCount >= 3 ? (
                <span className="text-[12px] text-[var(--color-text-secondary)]">
                  {activityLabel(profile.activityModifiers[a])}
                </span>
              ) : (
                <span className="text-[12px] text-[var(--color-text-muted)]">{'< 3 sessions'}</span>
              )}
            </div>
          ))}
        </Card>

        {/* Your profile */}
        <SectionLabel>Your profile</SectionLabel>
        <Card className="mb-2.5">
          <p className="text-[12px] text-[var(--color-text-muted)] mb-2">
            {profile.feedbackCount} session{profile.feedbackCount !== 1 ? 's' : ''} rated
          </p>
          <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            {profileSummary(profile)}
          </p>
        </Card>

        {/* Settings */}
        <SectionLabel>Settings</SectionLabel>
        <Card className="mb-2.5">
          <p className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-[0.5px] mb-3">Typical cycling pace</p>
          <div className="flex flex-col gap-2">
            {PACE_OPTIONS.map(opt => (
              <Pill
                key={opt.value}
                active={profile.cyclingSpeedKmh === opt.value}
                onClick={() => { setProfile({ ...profile, cyclingSpeedKmh: opt.value }); toast.success('Saved') }}
                className="justify-start text-left"
              >
                {opt.label}
              </Pill>
            ))}
          </div>

          <p className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-[0.5px] mt-5 mb-3">Default location</p>
          <div className="flex gap-2 items-start">
            <LocationInput
              value={locationText}
              onChange={setLocationText}
              onSelect={loc => { setProfile({ ...profile, defaultLocation: loc }); setLocationText(loc.label); toast.success('Location saved') }}
              className="flex-1"
            />
            <button
              type="button"
              onClick={saveLocation}
              disabled={locationLoading}
              className="h-10 px-4 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-[12px] font-medium disabled:opacity-50 shrink-0"
            >
              Save
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-[var(--color-border-subtle)]">
            <button
              type="button"
              onClick={() => signOut({ redirectUrl: '/' })}
              className="text-[var(--color-text-secondary)] text-[13px] hover:opacity-80 transition-opacity mb-4 block"
            >
              Sign out
            </button>
            {!showReset ? (
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="text-[var(--color-status-red)] text-[13px] hover:opacity-80 transition-opacity"
              >
                Reset profile data
              </button>
            ) : (
              <div>
                <p className="text-[13px] text-[var(--color-text-secondary)] mb-3">
                  This will delete all sessions, feedback, and calibration data. Are you sure?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetProfile}
                    className="flex-1 h-10 rounded-[var(--radius-md)] bg-[var(--color-status-red-bg)] border border-red-500/30 text-[var(--color-status-red)] text-[13px] font-medium"
                  >
                    Yes, reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReset(false)}
                    className="flex-1 h-10 rounded-[var(--radius-md)] border border-[var(--color-border-base)] text-[var(--color-text-secondary)] text-[13px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
      <BottomNav />
    </div>
  )
}
