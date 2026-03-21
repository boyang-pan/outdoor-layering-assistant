import type { Session, UserProfile } from './types'

const isClient = typeof window !== 'undefined'

const KEYS = {
  PROFILE: 'layer_profile',
  SESSIONS: 'layer_sessions',
  WEATHER_CACHE: 'layer_weather_cache',
  LAST_ACTIVITY: 'layer_last_activity',
  LAST_DURATION_IDX: 'layer_last_duration_idx',
} as const

function getItem<T>(key: string): T | null {
  if (!isClient) return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function setItem<T>(key: string, value: T): void {
  if (!isClient) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable
  }
}

function removeItem(key: string): void {
  if (!isClient) return
  localStorage.removeItem(key)
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export function getProfile(): UserProfile | null {
  return getItem<UserProfile>(KEYS.PROFILE)
}

export function saveProfile(profile: UserProfile): void {
  setItem(KEYS.PROFILE, profile)
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export function getSessions(): Session[] {
  return getItem<Session[]>(KEYS.SESSIONS) ?? []
}

export function saveSessions(sessions: Session[]): void {
  setItem(KEYS.SESSIONS, sessions)
}

export function getSession(id: string): Session | null {
  return getSessions().find(s => s.id === id) ?? null
}

export function upsertSession(session: Session): void {
  const sessions = getSessions()
  const idx = sessions.findIndex(s => s.id === session.id)
  if (idx >= 0) {
    sessions[idx] = session
  } else {
    sessions.push(session)
  }
  saveSessions(sessions)
}

// ─── Weather cache ────────────────────────────────────────────────────────────
interface WeatherCacheEntry {
  data: unknown
  fetchedAt: number
}

type WeatherCache = Record<string, WeatherCacheEntry>

export function getWeatherCache(key: string): unknown | null {
  const cache = getItem<WeatherCache>(KEYS.WEATHER_CACHE) ?? {}
  const entry = cache[key]
  if (!entry) return null
  const ageMs = Date.now() - entry.fetchedAt
  if (ageMs > 15 * 60 * 1000) return null // 15 min TTL
  return entry.data
}

export function setWeatherCache(key: string, data: unknown): void {
  const cache = getItem<WeatherCache>(KEYS.WEATHER_CACHE) ?? {}
  cache[key] = { data, fetchedAt: Date.now() }
  setItem(KEYS.WEATHER_CACHE, cache)
}

// ─── Last-used activity / duration ────────────────────────────────────────────
export function getLastUsed(): { activity: string; durationIdx: number } | null {
  const activity = getItem<string>(KEYS.LAST_ACTIVITY)
  const durationIdx = getItem<number>(KEYS.LAST_DURATION_IDX)
  if (activity === null || durationIdx === null) return null
  return { activity, durationIdx }
}

export function saveLastUsed(activity: string, durationIdx: number): void {
  setItem(KEYS.LAST_ACTIVITY, activity)
  setItem(KEYS.LAST_DURATION_IDX, durationIdx)
}

export function clearAll(): void {
  removeItem(KEYS.PROFILE)
  removeItem(KEYS.SESSIONS)
  removeItem(KEYS.WEATHER_CACHE)
}
