import type { Activity, Feedback, Intensity, Session, ThermalRating, UserProfile } from './types'

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function woreDifferentWeight(state: Feedback['woreDifferentState']): number {
  if (state === 'followed') return 1.0
  if (state === 'skipped_items') return 0.75
  return 0.5 // substituted
}

type PhaseKey = 'start' | 'middle' | 'end'

function countRating(feedback: Feedback, rating: ThermalRating): number {
  return (['start', 'middle', 'end'] as PhaseKey[]).filter(
    phase => feedback.phases[phase].rating === rating
  ).length
}

export function updateProfile(
  profile: UserProfile,
  feedback: Feedback,
  session: Session
): UserProfile {
  const updated = { ...profile }
  updated.zoneFlags = { ...profile.zoneFlags }
  updated.activityModifiers = { ...profile.activityModifiers }
  updated.intensityModifiers = { ...profile.intensityModifiers }

  const weight = woreDifferentWeight(feedback.woreDifferentState)

  // Update heatSensitivity from start + middle phases
  for (const phase of ['start', 'middle'] as const) {
    const rating = feedback.phases[phase].rating
    if (rating === 'too_warm') updated.heatSensitivity += 0.5 * weight
    if (rating === 'too_cold') updated.heatSensitivity -= 0.5 * weight
  }
  updated.heatSensitivity = clamp(updated.heatSensitivity, -2, 2)

  // Update activityModifier (only if >= 3 sessions for this activity)
  const activity = session.activity as Activity
  const activitySessions = updated.sessionCount // simplification: use total count
  if (activitySessions >= 3) {
    const warmCount = countRating(feedback, 'too_warm')
    const coldCount = countRating(feedback, 'too_cold')
    const delta = (warmCount - coldCount) * 0.1 * weight
    updated.activityModifiers[activity] = clamp(
      updated.activityModifiers[activity] + delta,
      -1,
      1
    )
  }

  // Update intensityModifier (only if >= 5 sessions)
  const intensity = session.intensity as Intensity
  if (updated.sessionCount >= 5) {
    const warmCount = countRating(feedback, 'too_warm')
    const coldCount = countRating(feedback, 'too_cold')
    const delta = (warmCount - coldCount) * 0.05 * weight
    updated.intensityModifiers[intensity] = clamp(
      updated.intensityModifiers[intensity] + delta,
      -0.5,
      0.5
    )
  }

  // Update zoneFlags from too_warm ratings
  for (const phase of ['start', 'middle', 'end'] as const) {
    if (feedback.phases[phase].rating === 'too_warm') {
      for (const zone of feedback.phases[phase].zones) {
        updated.zoneFlags[zone] = (updated.zoneFlags[zone] ?? 0) + 1
      }
    }
  }

  updated.feedbackCount += 1
  return updated
}

export function feedbackInsight(feedback: Feedback): string {
  const warmCount = countRating(feedback, 'too_warm')
  const coldCount = countRating(feedback, 'too_cold')
  if (warmCount >= 2) {
    return "You ran warm. Next session we'll suggest a lighter base or skip the jacket unless wind is strong."
  }
  if (coldCount >= 2) {
    return "You felt cold at points. Next session we'll add a layer or suggest a warmer base."
  }
  return "Spot on. We'll keep this calibration for similar conditions."
}
