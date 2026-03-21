// ─── Activity ─────────────────────────────────────────────────────────────────
export type Activity = 'run' | 'cycle' | 'other'
export type Intensity = 'easy' | 'moderate' | 'hard'

// ─── Session ──────────────────────────────────────────────────────────────────
export type SessionStatus = 'upcoming' | 'active' | 'feedback_pending' | 'complete'

export interface Session {
  id: string
  activity: Activity
  durationMins: number
  intensity: Intensity
  departureTime: string // ISO datetime string
  location: { lat: number; lon: number; label: string }
  status: SessionStatus
  recommendation: Recommendation | null
  feedback: Feedback | null
  createdAt: string
}

// ─── Recommendation ───────────────────────────────────────────────────────────
export interface Recommendation {
  sessionId: string
  generatedAt: string
  weatherSnapshot: WeatherSnapshot
  layers: LayerSet
  guidanceLine: string
  deltaWarning: string | null
  confidence: {
    temperature: number
    wind: number
    personalised: number
  }
}

export interface LayerSet {
  baseLayer: string
  midLayer: string
  jacket: string
  legs: string
  gloves: string
  hat: string
}

// ─── Weather ──────────────────────────────────────────────────────────────────
export interface WeatherSnapshot {
  windowStart: string
  windowEnd: string
  minApparentTemp: number
  maxApparentTemp: number
  maxWindspeed: number
  maxPrecipProbability: number
  precipType: 'none' | 'rain' | 'snow'
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
export type ThermalRating = 'too_cold' | 'good' | 'too_warm'
export type BodyZone = 'top' | 'jacket' | 'legs' | 'hands' | 'overall'

export interface PhaseRating {
  rating: ThermalRating
  zones: BodyZone[]
}

export type WoreDifferentState = 'followed' | 'skipped_items' | 'substituted'

export interface LayerEdit {
  zone: keyof LayerSet
  action: 'skipped' | 'substituted'
  substituteValue?: string
}

export interface Feedback {
  sessionId: string
  submittedAt: string
  woreDifferentState: WoreDifferentState
  layerEdits: LayerEdit[]
  phases: {
    start: PhaseRating
    middle: PhaseRating
    end: PhaseRating
  }
  syncedToBackend: boolean
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export interface UserProfile {
  onboardingComplete: boolean
  heatSensitivity: number // –2 to +2
  cyclingSpeedKmh: number
  defaultLocation: { lat: number; lon: number; label: string } | null
  activityModifiers: Record<Activity, number>
  intensityModifiers: Record<Intensity, number>
  zoneFlags: Partial<Record<BodyZone, number>>
  sessionCount: number
  feedbackCount: number
}

export function defaultProfile(): UserProfile {
  return {
    onboardingComplete: false,
    heatSensitivity: 0,
    cyclingSpeedKmh: 24,
    defaultLocation: null,
    activityModifiers: { run: 0, cycle: 0, other: 0 },
    intensityModifiers: { easy: 0, moderate: 0, hard: 0 },
    zoneFlags: {},
    sessionCount: 0,
    feedbackCount: 0,
  }
}

// ─── Session name utility ──────────────────────────────────────────────────────
export function sessionName(activity: Activity, departureTime: Date): string {
  const hour = departureTime.getHours()
  const period =
    hour < 6  ? 'Early Morning' :
    hour < 12 ? 'Morning' :
    hour < 14 ? 'Lunchtime' :
    hour < 18 ? 'Afternoon' :
    hour < 21 ? 'Evening' : 'Night'
  const activityLabel: Record<Activity, string> = { run: 'Run', cycle: 'Ride', other: 'Workout' }
  return `${period} ${activityLabel[activity]}`
}
