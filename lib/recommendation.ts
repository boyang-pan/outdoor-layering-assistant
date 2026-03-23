import type { Activity, Intensity, LayerSet, Recommendation, Session, UserProfile, WeatherSnapshot } from './types'

// ─── Step 1: Effective windspeed ──────────────────────────────────────────────
function effectiveWindspeed(
  activity: Activity,
  intensity: Intensity,
  profile: UserProfile,
  ambientWind: number
): number {
  if (activity === 'run' || activity === 'other') return ambientWind
  const intensityOffset: Record<Intensity, number> = { easy: -5, moderate: 0, hard: 5 }
  return ambientWind + profile.cyclingSpeedKmh + intensityOffset[intensity]
}

// ─── Step 2: Baseline lookup ──────────────────────────────────────────────────
function baselineRecommendation(
  minApparentTemp: number,
  effectiveWind: number
): LayerSet {
  if (minApparentTemp > 18) {
    return {
      baseLayer: 'Short-sleeve top',
      midLayer: 'Skip it',
      jacket: 'No jacket',
      legs: 'Shorts',
      gloves: 'No gloves',
      hat: 'Nothing',
      neck: 'Nothing',
      feet: 'Standard running socks',
    }
  }
  if (minApparentTemp >= 12) {
    return {
      baseLayer: 'Long-sleeve top',
      midLayer: 'Skip it',
      jacket: effectiveWind > 20 ? 'Lightweight wind jacket' : 'No jacket',
      legs: 'Shorts',
      gloves: 'No gloves',
      hat: 'Nothing',
      neck: 'Nothing',
      feet: 'Standard running socks',
    }
  }
  if (minApparentTemp >= 6) {
    return {
      baseLayer: 'Long-sleeve top',
      midLayer: 'Skip it',
      jacket: 'Lightweight wind jacket',
      legs: 'Full-length running tights',
      gloves: minApparentTemp < 8 ? 'Thin liner gloves' : 'No gloves',
      hat: 'Nothing',
      neck: 'Nothing',
      feet: 'Warm running socks',
    }
  }
  if (minApparentTemp >= 0) {
    return {
      baseLayer: 'Long-sleeve thermal top',
      midLayer: 'Lightweight fleece',
      jacket: 'Lightweight wind jacket',
      legs: 'Full-length running tights',
      gloves: 'Thin liner gloves',
      hat: 'Thermal beanie',
      neck: 'Nothing',
      feet: 'Thermal running socks',
    }
  }
  // < 0
  return {
    baseLayer: 'Long-sleeve thermal top',
    midLayer: 'Insulated gilet',
    jacket: 'Waterproof rain jacket',
    legs: 'Full-length running tights',
    gloves: 'Insulated running gloves',
    hat: 'Thermal beanie',
    neck: 'Neck buff',
    feet: 'Thermal running socks',
  }
}

// ─── Step 3: Override rules ───────────────────────────────────────────────────
function applyOverrides(
  layers: LayerSet,
  weather: WeatherSnapshot,
  activity: Activity,
  intensity: Intensity,
  durationMins: number,
  effectiveWind: number
): LayerSet {
  const result = { ...layers }

  // 1. Heavy rain
  if (weather.maxPrecipProbability > 60) {
    result.jacket = 'Waterproof rain jacket'
  }

  // 2. High wind
  if (effectiveWind > 30 && result.jacket === 'No jacket') {
    result.jacket = 'Lightweight wind jacket'
  }

  // 3. Hard intensity — drop base one tier
  if (intensity === 'hard') {
    if (result.baseLayer === 'Long-sleeve thermal top') result.baseLayer = 'Long-sleeve top'
    else if (result.baseLayer === 'Long-sleeve top') result.baseLayer = 'Short-sleeve top'
  }

  // 4. Long duration — upgrade extremities
  if (durationMins > 120) {
    if (result.gloves === 'No gloves') result.gloves = 'Thin liner gloves'
    if (result.hat === 'Nothing') result.hat = 'Running cap'
  }

  // 5. Cycling cold
  if (
    activity === 'cycle' &&
    weather.minApparentTemp < 15 &&
    !(intensity === 'hard' && weather.minApparentTemp > 12)
  ) {
    if (result.jacket === 'No jacket') result.jacket = 'Lightweight wind jacket'
  }

  return result
}

// ─── Step 4a: Activity-specific labels ────────────────────────────────────────
function applyActivityLabels(layers: LayerSet, activity: Activity, minApparentTemp: number): LayerSet {
  if (activity !== 'cycle') return layers
  const result = { ...layers }
  // Upper body
  if (result.baseLayer === 'Short-sleeve top') result.baseLayer = 'Short-sleeve jersey'
  if (result.baseLayer === 'Long-sleeve top') result.baseLayer = 'Long-sleeve jersey'
  if (result.baseLayer === 'Long-sleeve thermal top') result.baseLayer = 'Thermal long-sleeve jersey'
  if (result.midLayer === 'Lightweight fleece') result.midLayer = 'Lightweight cycling gilet'
  if (result.jacket === 'Lightweight wind jacket') result.jacket = 'Cycling wind jacket'
  if (result.jacket === 'Waterproof rain jacket') result.jacket = 'Waterproof cycling jacket'
  // Lower body & extras
  if (result.legs === 'Short running tights') result.legs = 'Bib shorts'
  if (result.legs === 'Full-length running tights') result.legs = 'Full-length bib tights'
  if (result.hat === 'Running cap') result.hat = 'Cycling cap'
  if (result.gloves === 'Insulated running gloves') result.gloves = 'Insulated cycling gloves'
  // Feet (cycling-specific thresholds — feet get cold faster without muscle activity)
  if (minApparentTemp > 15) result.feet = 'Cycling socks'
  else if (minApparentTemp > 8) result.feet = 'Thermal socks'
  else if (minApparentTemp > 4) result.feet = 'Cycling socks + overshoes'
  else result.feet = 'Thermal socks + overshoes'
  result.helmet = 'Cycling helmet'
  return result
}

// ─── Step 4: Personalization ──────────────────────────────────────────────────
const BASE_LAYER_TIERS = [
  'Short-sleeve top',
  'Long-sleeve top',
  'Long-sleeve thermal top',
]

function shiftBaseLayer(current: string, delta: number): string {
  const idx = BASE_LAYER_TIERS.indexOf(current)
  if (idx === -1) return current
  const newIdx = Math.max(0, Math.min(BASE_LAYER_TIERS.length - 1, idx + delta))
  return BASE_LAYER_TIERS[newIdx]
}

function applyPersonalization(layers: LayerSet, profile: UserProfile): LayerSet {
  const result = { ...layers }

  if (profile.heatSensitivity >= 1) {
    result.baseLayer = shiftBaseLayer(result.baseLayer, -1)
  } else if (profile.heatSensitivity <= -1) {
    result.baseLayer = shiftBaseLayer(result.baseLayer, +1)
  }

  // Zone flags: too_warm >= 3 → lighten that zone
  const flags = profile.zoneFlags
  if ((flags.top ?? 0) >= 3) {
    result.baseLayer = shiftBaseLayer(result.baseLayer, -1)
  }
  if ((flags.jacket ?? 0) >= 3 && result.jacket !== 'No jacket') {
    result.jacket = 'No jacket'
  }
  if ((flags.hands ?? 0) >= 3 && result.gloves !== 'No gloves') {
    result.gloves = 'No gloves'
  }

  return result
}

// ─── Step 5: Guidance line ────────────────────────────────────────────────────
function generateGuidanceLine(
  weather: WeatherSnapshot,
  _layers: LayerSet,
  _activity: Activity
): string {
  if (weather.minApparentTemp < 5) {
    return "Start slightly cool — you'll warm up within 10–15 min"
  }
  if (weather.maxWindspeed > 30) {
    return "Wind is strong today — the jacket earns its place even if the temp feels mild"
  }
  if (weather.maxPrecipProbability > 60) {
    return "Rain likely mid-session — the waterproof jacket is worth the extra weight"
  }
  if (weather.maxApparentTemp > 22) {
    return "Slight risk of overheating mid-session — the base layer is as light as makes sense"
  }
  return `Likely comfortable throughout — layers are calibrated for ${Math.round(weather.minApparentTemp)}°C conditions`
}

// ─── Step 6: Delta warning ────────────────────────────────────────────────────
function deltaWarning(weather: WeatherSnapshot): string | null {
  const delta = weather.maxApparentTemp - weather.minApparentTemp
  if (delta > 5) {
    return `Temperature drops ~${Math.round(delta)}°C during your session — consider a packable layer`
  }
  return null
}

// ─── Step 7: Confidence scores ────────────────────────────────────────────────
function confidenceScores(
  weather: WeatherSnapshot,
  profile: UserProfile
): { temperature: number; wind: number; personalised: number } {
  const windowMs = new Date(weather.windowEnd).getTime() - new Date(weather.windowStart).getTime()
  const windowHours = windowMs / (1000 * 60 * 60)

  let temperature: number
  if (windowHours < 1) temperature = 0.92
  else if (windowHours < 2) temperature = 0.85
  else if (windowHours < 3) temperature = 0.75
  else temperature = 0.65

  return {
    temperature,
    wind: 0.74,
    personalised: Math.min(0.95, profile.feedbackCount / 10),
  }
}

// ─── Top-level composer ───────────────────────────────────────────────────────
export function computeRecommendation(session: Session, profile: UserProfile): Recommendation {
  const weather = session.recommendation?.weatherSnapshot
  if (!weather) throw new Error('Session has no weather snapshot')

  const effWind = effectiveWindspeed(session.activity, session.intensity, profile, weather.maxWindspeed)
  let layers = baselineRecommendation(weather.minApparentTemp, effWind)
  layers = applyOverrides(layers, weather, session.activity, session.intensity, session.durationMins, effWind)
  layers = applyPersonalization(layers, profile)
  layers = applyActivityLabels(layers, session.activity, weather.minApparentTemp)

  return {
    sessionId: session.id,
    generatedAt: new Date().toISOString(),
    weatherSnapshot: weather,
    layers,
    guidanceLine: generateGuidanceLine(weather, layers, session.activity),
    deltaWarning: deltaWarning(weather),
    confidence: confidenceScores(weather, profile),
  }
}

// Export internals for testing
export { effectiveWindspeed, baselineRecommendation, applyOverrides, applyPersonalization, applyActivityLabels, deltaWarning, confidenceScores }
