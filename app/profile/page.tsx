'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useProfile } from '@/hooks/useProfile'
import { defaultProfile, type Activity } from '@/lib/types'
import { clearAll } from '@/lib/storage'
import { geocodeLocation } from '@/lib/weather'
import { LocationInput } from '@/components/ui/LocationInput'

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

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="h-1.5 rounded-full bg-[var(--color-bg-raised)]">
      <div className="h-1.5 rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { profile, setProfile } = useProfile()
  const [locationText, setLocationText] = useState(profile.defaultLocation?.label ?? '')
  const [locationLoading, setLocationLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)

  const saveLocation = async () => {
    if (!locationText.trim()) return
    setLocationLoading(true)
    try {
      const loc = await geocodeLocation(locationText)
      setProfile({ ...profile, defaultLocation: loc })
      setLocationText(loc.label)
    } catch {
      // keep existing
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
        <SectionLabel className="mt-0">Heat sensitivity</SectionLabel>
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
        <SectionLabel>Activity adjustments</SectionLabel>
        <Card className="mb-2.5 space-y-3">
          {ACTIVITIES.map(a => (
            <div key={a} className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-secondary)]">{ACTIVITY_LABELS[a]}</span>
              {profile.sessionCount >= 3 ? (
                <span className="font-mono text-[12px] text-[var(--color-text-muted)]">
                  {profile.activityModifiers[a] >= 0 ? '+' : ''}{profile.activityModifiers[a].toFixed(1)} tier
                </span>
              ) : (
                <span className="text-[12px] text-[var(--color-text-muted)]">{'< 3 sessions'}</span>
              )}
            </div>
          ))}
        </Card>

        {/* Calibration */}
        <SectionLabel>Calibration</SectionLabel>
        <Card className="mb-2.5 space-y-3">
          <div>
            <div className="flex justify-between text-[12px] text-[var(--color-text-muted)] mb-1.5">
              <span>Overall</span>
              <span className="font-mono">{Math.min(100, Math.round((profile.sessionCount / 10) * 100))}%</span>
            </div>
            <ProgressBar value={profile.sessionCount} max={10} />
          </div>
          {ACTIVITIES.map(a => (
            <div key={a}>
              <div className="flex justify-between text-[12px] text-[var(--color-text-muted)] mb-1.5">
                <span>{ACTIVITY_LABELS[a]}</span>
                <span className="font-mono">{profile.sessionCount > 0 ? `${Math.min(100, profile.sessionCount * 10)}%` : '0%'}</span>
              </div>
              <ProgressBar value={profile.sessionCount} max={10} />
            </div>
          ))}
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
                onClick={() => setProfile({ ...profile, cyclingSpeedKmh: opt.value })}
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
              onSelect={loc => { setProfile({ ...profile, defaultLocation: loc }); setLocationText(loc.label) }}
              className="flex-1"
            />
            <button
              type="button"
              onClick={saveLocation}
              disabled={locationLoading}
              className="h-12 px-4 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-[12px] font-medium disabled:opacity-50 shrink-0"
            >
              Save
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-[var(--color-border-subtle)]">
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
