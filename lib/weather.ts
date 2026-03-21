import { z } from 'zod'
import type { WeatherSnapshot } from './types'
import { getWeatherCache, setWeatherCache } from './storage'

export class WeatherFetchError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'WeatherFetchError'
  }
}

// ─── Geocoding ────────────────────────────────────────────────────────────────
const GeoResultSchema = z.object({
  results: z.array(z.object({
    latitude: z.number(),
    longitude: z.number(),
    name: z.string(),
    country: z.string().optional(),
    admin1: z.string().optional(),
  })).optional(),
})

export async function geocodeLocation(query: string): Promise<{ lat: number; lon: number; label: string }> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new WeatherFetchError('Network error during geocoding', 'NETWORK')
  }
  if (!res.ok) throw new WeatherFetchError(`Geocoding failed: ${res.status}`, 'GEO_HTTP')
  const json = await res.json()
  const parsed = GeoResultSchema.safeParse(json)
  if (!parsed.success || !parsed.data.results?.length) {
    throw new WeatherFetchError(`Location not found: "${query}"`, 'NOT_FOUND')
  }
  const r = parsed.data.results[0]
  const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ')
  return { lat: r.latitude, lon: r.longitude, label }
}

// ─── Forecast ─────────────────────────────────────────────────────────────────
const ForecastSchema = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    apparent_temperature: z.array(z.number()),
    windspeed_10m: z.array(z.number()),
    precipitation_probability: z.array(z.number()),
    precipitation: z.array(z.number()),
    weathercode: z.array(z.number()),
  }),
})

export async function fetchWeatherWindow(
  lat: number,
  lon: number,
  windowStart: Date,
  windowEnd: Date
): Promise<WeatherSnapshot> {
  const dateStr = windowStart.toISOString().slice(0, 10)
  const endDateStr = windowEnd.toISOString().slice(0, 10)
  const cacheKey = `weather_${lat.toFixed(3)}_${lon.toFixed(3)}_${dateStr}`

  const cached = getWeatherCache(cacheKey)
  if (cached) {
    return processWeatherData(cached as z.infer<typeof ForecastSchema>, windowStart, windowEnd)
  }

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'apparent_temperature,windspeed_10m,precipitation_probability,precipitation,weathercode',
    timezone: 'auto',
    start_date: dateStr,
    end_date: endDateStr,
  })

  let res: Response
  try {
    res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  } catch {
    throw new WeatherFetchError('Network error fetching weather', 'NETWORK')
  }
  if (!res.ok) throw new WeatherFetchError(`Weather API error: ${res.status}`, 'HTTP')

  const json = await res.json()
  const parsed = ForecastSchema.safeParse(json)
  if (!parsed.success) throw new WeatherFetchError('Unexpected weather API response format', 'PARSE')

  setWeatherCache(cacheKey, parsed.data)
  return processWeatherData(parsed.data, windowStart, windowEnd)
}

function processWeatherData(
  data: z.infer<typeof ForecastSchema>,
  windowStart: Date,
  windowEnd: Date
): WeatherSnapshot {
  const { time, apparent_temperature, windspeed_10m, precipitation_probability, precipitation, weathercode } = data.hourly

  const indices: number[] = []
  for (let i = 0; i < time.length; i++) {
    const t = new Date(time[i])
    if (t >= windowStart && t <= windowEnd) indices.push(i)
  }

  // If no hourly data falls exactly in window, use nearest hours
  const useIndices = indices.length > 0 ? indices : [0]

  const apparentTemps = useIndices.map(i => apparent_temperature[i])
  const winds = useIndices.map(i => windspeed_10m[i])
  const precips = useIndices.map(i => precipitation_probability[i])
  const precipAmounts = useIndices.map(i => precipitation[i])
  const codes = useIndices.map(i => weathercode[i])

  const hasSnow = codes.some(c => c >= 71 && c <= 77)
  const hasRain = precipAmounts.some(p => p > 0)

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    minApparentTemp: Math.min(...apparentTemps),
    maxApparentTemp: Math.max(...apparentTemps),
    maxWindspeed: Math.max(...winds),
    maxPrecipProbability: Math.max(...precips),
    precipType: hasSnow ? 'snow' : hasRain ? 'rain' : 'none',
  }
}
