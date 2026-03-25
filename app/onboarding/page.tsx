'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { useProfile } from '@/hooks/useProfile'
import { geocodeLocation, reverseGeocodeLocation } from '@/lib/weather'
import { LocationInput } from '@/components/ui/LocationInput'
import { MapPin, Loader2 } from 'lucide-react'

const HEAT_OPTIONS = [
  { label: 'Run hot', value: 1 },
  { label: 'About average', value: 0 },
  { label: 'Run cold', value: -1 },
  { label: 'Not sure', value: 0 },
]

const PACE_OPTIONS = [
  { label: 'Leisurely · 15–20 km/h', value: 17 },
  { label: 'Moderate · 20–28 km/h', value: 24 },
  { label: 'Fast · 28–35 km/h', value: 31 },
  { label: 'Racing · 35+ km/h', value: 38 },
  { label: 'Not sure', value: 24 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { setProfile, profile } = useProfile()
  const [step, setStep] = useState(0)
  const [heatIdx, setHeatIdx] = useState<number | null>(null)
  const [paceIdx, setPaceIdx] = useState<number | null>(null)
  const [locationText, setLocationText] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState('')

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => s - 1)

  const detectLocation = () => {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported'); return }
    setGeoLoading(true)
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { lat, lon } = { lat: pos.coords.latitude, lon: pos.coords.longitude }
          const loc = await reverseGeocodeLocation(lat, lon)
          setProfile({ ...profile, defaultLocation: loc })
          setLocationText(loc.label)
        } finally {
          setGeoLoading(false)
        }
      },
      () => { setGeoError('Location access denied'); setGeoLoading(false) }
    )
  }

  const finish = async () => {
    let loc = profile.defaultLocation
    if (locationText && !loc) {
      try {
        loc = await geocodeLocation(locationText)
      } catch {
        // skip location if geocode fails
      }
    }
    setProfile({
      ...profile,
      onboardingComplete: true,
      heatSensitivity: heatIdx !== null ? HEAT_OPTIONS[heatIdx].value : 0,
      cyclingSpeedKmh: paceIdx !== null ? PACE_OPTIONS[paceIdx].value : 24,
      defaultLocation: loc,
    })
    router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col px-5 pt-16 pb-10">
      {/* Progress dots */}
      <div className="flex gap-1.5 mb-12">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all ${i === step ? 'w-6 bg-[var(--color-accent)]' : 'w-1.5 bg-[var(--color-bg-raised)]'}`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="flex-1">
          <h1 className="text-xl font-medium text-[var(--color-text-primary)] mb-1">Do you tend to run hot or cold?</h1>
          <p className="text-[13px] text-[var(--color-text-muted)] mb-8">If you run hot, we&apos;ll suggest fewer or lighter layers than the weather calls for — and warmer if you run cold.</p>
          <div className="flex flex-wrap gap-2">
            {HEAT_OPTIONS.map((opt, i) => (
              <Pill key={opt.label} active={heatIdx === i} onClick={() => setHeatIdx(i)}>
                {opt.label}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex-1">
          <h1 className="text-xl font-medium text-[var(--color-text-primary)] mb-1">What&apos;s your typical cycling pace?</h1>
          <p className="text-[13px] text-[var(--color-text-muted)] mb-8">Used to calculate wind chill. You can change this in settings.</p>
          <div className="flex flex-col gap-2">
            {PACE_OPTIONS.map((opt, i) => (
              <Pill key={opt.label} active={paceIdx === i} onClick={() => setPaceIdx(i)} className="justify-start">
                {opt.label}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1">
          <h1 className="text-xl font-medium text-[var(--color-text-primary)] mb-1">Where are you usually based?</h1>
          <p className="text-[13px] text-[var(--color-text-muted)] mb-8">Used to pre-fill your location each time</p>
          <button
            type="button"
            onClick={detectLocation}
            disabled={geoLoading}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-[var(--radius-md)] border border-[var(--color-border-base)] text-[var(--color-text-secondary)] text-sm hover:bg-[var(--color-bg-raised)] transition-colors mb-4 disabled:opacity-50"
          >
            {geoLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} strokeWidth={1.5} />}
            Use my location
          </button>
          <LocationInput
            value={locationText}
            onChange={setLocationText}
            onSelect={loc => { setProfile({ ...profile, defaultLocation: loc }); setLocationText(loc.label) }}
            placeholder="Or enter a city or postcode"
          />
          {geoError && <p className="text-[var(--color-status-red)] text-[12px] mt-2">{geoError}</p>}
        </div>
      )}

      {/* Footer nav */}
      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <Button variant="ghost" onClick={back} className="flex-1">
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button
            onClick={next}
            className="flex-1"
            disabled={step === 0 ? heatIdx === null : paceIdx === null}
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={finish}
            className="flex-1"
            disabled={!locationText.trim() && !profile.defaultLocation}
          >
            Get started
          </Button>
        )}
      </div>
    </div>
  )
}
