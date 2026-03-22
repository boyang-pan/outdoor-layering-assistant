'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { Slider } from '@/components/ui/Slider'
import { TimePicker } from '@/components/ui/TimePicker'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useProfile } from '@/hooks/useProfile'
import { useSessions } from '@/hooks/useSession'
import { fetchWeatherWindow, geocodeLocation } from '@/lib/weather'
import { getLastUsed, saveLastUsed } from '@/lib/storage'
import type { Activity, Intensity, Session } from '@/lib/types'
import { defaultProfile } from '@/lib/types'
import { DURATION_LABELS, DURATION_MINS, formatTime } from '@/lib/utils'
import { MapPin, Loader2 } from 'lucide-react'

const LOADING_MESSAGES = [
  { title: 'Fetching weather data', sub: (city: string, temp: number) => `${city} · ${temp}°C` },
  { title: 'Applying activity model', sub: (activity: string, intensity: string, dur: string) => `${activity} · ${intensity} · ${dur}` },
  { title: 'Checking forecast window', sub: (_: string, __: number, ___: string, dur: string) => `Covering full ${dur} window` },
  { title: 'Finalising recommendation', sub: (n: number, pct: number) => `Session ${n} · Calibration ${pct}%` },
]

function LoadingOverlay({ city, temp, activity, intensity, duration, sessionN, ratedSessions }: {
  city: string; temp: number; activity: string; intensity: string; duration: string
  sessionN: number; ratedSessions: number
}) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStep(s => Math.min(s + 1, 3)), 500)
    return () => clearInterval(id)
  }, [])

  const getMessage = () => {
    switch (step) {
      case 0: return { title: 'Fetching weather data', sub: `${city} · ${temp}°C` }
      case 1: return { title: 'Applying activity model', sub: `${activity} · ${intensity} · ${duration}` }
      case 2: return { title: 'Checking forecast window', sub: `Covering full ${duration} window` }
      case 3: return { title: 'Finalising recommendation', sub: `Session ${sessionN} · ${ratedSessions} rated` }
      default: return { title: '', sub: '' }
    }
  }

  const { title, sub } = getMessage()

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg-base)] flex flex-col items-center justify-center px-5">
      <div className="h-8 w-8 rounded-full border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] animate-spin mb-8" />
      <p className="text-[var(--color-text-primary)] font-medium text-sm mb-1">{title}</p>
      <p className="text-[var(--color-text-muted)] text-[12px] font-mono">{sub}</p>
    </div>
  )
}

export default function NewPage() {
  const router = useRouter()
  const { profile } = useProfile()
  const { saveSession } = useSessions()

  const lastUsed = typeof window !== 'undefined' ? getLastUsed() : null
  const [activity, setActivity] = useState<Activity>((lastUsed?.activity as Activity) ?? 'run')
  const [durationIdx, setDurationIdx] = useState(lastUsed?.durationIdx ?? 1) // default 45 min
  const [intensity, setIntensity] = useState<Intensity>('moderate')
  const [departureTime, setDepartureTime] = useState(() => {
    const d = new Date()
    d.setSeconds(0, 0)
    return d
  })
  const [locationText, setLocationText] = useState(profile.defaultLocation?.label ?? '')
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lon: number } | null>(
    profile.defaultLocation ? { lat: profile.defaultLocation.lat, lon: profile.defaultLocation.lon } : null
  )

  const [loading, setLoading] = useState(false)
  const [loadingWeather, setLoadingWeather] = useState<{ temp: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [locationError, setLocationError] = useState('')

  // Sync default location
  useEffect(() => {
    if (profile.defaultLocation && !locationText) {
      setLocationText(profile.defaultLocation.label)
      setLocationCoords({ lat: profile.defaultLocation.lat, lon: profile.defaultLocation.lon })
    }
  }, [profile.defaultLocation, locationText])

  const durationMins = DURATION_MINS[durationIdx]
  const windowEnd = new Date(departureTime.getTime() + durationMins * 60 * 1000)

  const detectLocation = () => {
    if (!navigator.geolocation) return
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setLocationCoords({ lat, lon })
        setLocationText(`${lat.toFixed(2)}, ${lon.toFixed(2)}`)
        setGeoLoading(false)
      },
      () => { setGeoLoading(false); setLocationError('Location access denied') }
    )
  }

  const submit = async () => {
    if (!locationText.trim()) {
      setLocationError('Please enter a location')
      return
    }
    setLocationError('')
    setLoading(true)

    try {
      let lat: number, lon: number, label: string

      if (locationCoords && locationText === profile.defaultLocation?.label) {
        lat = locationCoords.lat
        lon = locationCoords.lon
        label = locationText
      } else {
        const geo = await geocodeLocation(locationText)
        lat = geo.lat; lon = geo.lon; label = geo.label
      }

      const windowStartDate = new Date(departureTime)
      const windowEndDate = new Date(departureTime.getTime() + durationMins * 60 * 1000)
      const weather = await fetchWeatherWindow(lat, lon, windowStartDate, windowEndDate)

      setLoadingWeather({ temp: Math.round(weather.minApparentTemp) })

      // Import recommendation compute
      const { computeRecommendation } = await import('@/lib/recommendation')

      const id = uuidv4()
      const sessionDraft: Session = {
        id,
        activity,
        durationMins,
        intensity,
        departureTime: departureTime.toISOString(),
        location: { lat, lon, label },
        status: 'upcoming',
        recommendation: {
          sessionId: id,
          generatedAt: new Date().toISOString(),
          weatherSnapshot: weather,
          layers: { baseLayer: '', midLayer: '', jacket: '', legs: '', gloves: '', hat: '', feet: '' },
          guidanceLine: '',
          deltaWarning: null,
          confidence: { temperature: 0, wind: 0, personalised: 0 },
        },
        feedback: null,
        createdAt: new Date().toISOString(),
      }

      const rec = computeRecommendation(sessionDraft, profile)
      const session: Session = { ...sessionDraft, recommendation: rec }

      saveSession(session)
      saveLastUsed(activity, durationIdx)

      // Update sessionCount in profile
      const { saveProfile, getProfile } = await import('@/lib/storage')
      const currentProfile = getProfile() ?? profile
      saveProfile({ ...currentProfile, sessionCount: currentProfile.sessionCount + 1 })

      router.push(`/session/${id}`)
    } catch (err) {
      setLoading(false)
      setLoadingWeather(null)
      setLocationError(err instanceof Error ? err.message : 'Failed to fetch weather')
    }
  }

  return (
    <>
      {loading && (
        <LoadingOverlay
          city={locationText}
          temp={loadingWeather?.temp ?? 0}
          activity={activity}
          intensity={intensity}
          duration={DURATION_LABELS[durationIdx]}
          sessionN={profile.sessionCount + 1}
          ratedSessions={profile.feedbackCount}
        />
      )}
      <div className="pb-8 page-enter">
        <TopBar />
        <div className="px-5 py-6 space-y-6">
          <div>
            <SectionLabel className="mt-0">Activity</SectionLabel>
            <div className="flex gap-2">
              {(['run', 'cycle', 'other'] as Activity[]).map(a => (
                <Pill key={a} active={activity === a} onClick={() => setActivity(a)}>
                  {a === 'run' ? '🏃 Run' : a === 'cycle' ? '🚴 Cycle' : '+ Other'}
                </Pill>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel className="mt-0">Duration</SectionLabel>
            <Slider value={durationIdx} onChange={setDurationIdx} />
          </div>

          <div>
            <SectionLabel className="mt-0">Intensity</SectionLabel>
            <div className="flex gap-2 mb-2">
              {(['easy', 'moderate', 'hard'] as Intensity[]).map(i => (
                <Pill key={i} active={intensity === i} onClick={() => setIntensity(i)}>
                  {i.charAt(0).toUpperCase() + i.slice(1)}
                </Pill>
              ))}
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Easy = conversational · Moderate = short phrases · Hard = can&apos;t talk
            </p>
          </div>

          <div>
            <SectionLabel className="mt-0">When</SectionLabel>
            <TimePicker value={departureTime} onChange={setDepartureTime} />
            <p className="text-[11px] text-[var(--color-text-muted)] mt-2">
              Forecast covers {formatTime(departureTime)} → {formatTime(windowEnd)}
            </p>
          </div>

          <div>
            <SectionLabel className="mt-0">Location</SectionLabel>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="City or postcode"
                value={locationText}
                onChange={e => { setLocationText(e.target.value); setLocationCoords(null) }}
                className="flex-1 h-12 bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                style={{ fontSize: '16px' }}
              />
              <button
                type="button"
                onClick={detectLocation}
                disabled={geoLoading}
                className="h-12 px-4 rounded-[var(--radius-md)] border border-[var(--color-border-base)] text-[var(--color-text-secondary)] text-sm hover:bg-[var(--color-bg-raised)] transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {geoLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} strokeWidth={1.5} />}
                Detect
              </button>
            </div>
            {locationError && <p className="text-[var(--color-status-red)] text-[12px] mt-2">{locationError}</p>}
          </div>

          <Button onClick={submit} loading={loading}>
            Get recommendation →
          </Button>
        </div>
      </div>
    </>
  )
}
