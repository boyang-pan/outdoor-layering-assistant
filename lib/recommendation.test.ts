import { describe, it, expect } from 'vitest'
import { baselineRecommendation, applyOverrides, effectiveWindspeed, deltaWarning } from './recommendation'
import { defaultProfile } from './types'
import type { WeatherSnapshot } from './types'

function makeWeather(overrides: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return {
    windowStart: '2025-01-01T08:00:00Z',
    windowEnd: '2025-01-01T10:00:00Z',
    minApparentTemp: 10,
    maxApparentTemp: 12,
    maxWindspeed: 10,
    maxPrecipProbability: 0,
    precipType: 'none',
    ...overrides,
  }
}

describe('baselineRecommendation', () => {
  it('hot band > 18°C', () => {
    const r = baselineRecommendation(20, 10)
    expect(r.baseLayer).toBe('Short-sleeve top')
    expect(r.jacket).toBe('No jacket')
    expect(r.gloves).toBe('No gloves')
    expect(r.hat).toBe('Nothing')
  })

  it('warm band 12–18°C, low wind → no jacket', () => {
    const r = baselineRecommendation(15, 10)
    expect(r.baseLayer).toBe('Long-sleeve top')
    expect(r.jacket).toBe('No jacket')
  })

  it('warm band 12–18°C, high wind → wind jacket', () => {
    const r = baselineRecommendation(15, 25)
    expect(r.jacket).toBe('Lightweight wind jacket')
  })

  it('cool band 6–12°C, temp < 8 → liner gloves', () => {
    const r = baselineRecommendation(7, 10)
    expect(r.gloves).toBe('Thin liner gloves')
  })

  it('cool band 6–12°C, temp >= 8 → no gloves', () => {
    const r = baselineRecommendation(9, 10)
    expect(r.gloves).toBe('No gloves')
  })

  it('cold band 0–6°C', () => {
    const r = baselineRecommendation(3, 10)
    expect(r.baseLayer).toBe('Long-sleeve thermal top')
    expect(r.midLayer).toBe('Lightweight fleece')
    expect(r.hat).toBe('Thermal beanie')
  })

  it('freezing band < 0°C', () => {
    const r = baselineRecommendation(-5, 10)
    expect(r.baseLayer).toBe('Long-sleeve thermal top')
    expect(r.jacket).toBe('Waterproof rain jacket')
    expect(r.legs).toBe('Full-length running tights')
    expect(r.hat).toBe('Thermal beanie')
  })
})

describe('applyOverrides', () => {
  it('precip > 60% → waterproof jacket', () => {
    const base = baselineRecommendation(15, 10)
    const weather = makeWeather({ maxPrecipProbability: 80, minApparentTemp: 15 })
    const r = applyOverrides(base, weather, 'run', 'moderate', 60, 10)
    expect(r.jacket).toBe('Waterproof rain jacket')
  })

  it('high wind > 30 and no jacket → wind jacket', () => {
    const base = baselineRecommendation(20, 5)
    const weather = makeWeather({ maxWindspeed: 35, minApparentTemp: 20 })
    const r = applyOverrides(base, weather, 'run', 'moderate', 60, 35)
    expect(r.jacket).toBe('Lightweight wind jacket')
  })

  it('hard intensity drops base layer tier', () => {
    const base = baselineRecommendation(3, 10) // thermal top
    const weather = makeWeather({ minApparentTemp: 3 })
    const r = applyOverrides(base, weather, 'run', 'hard', 60, 10)
    expect(r.baseLayer).toBe('Long-sleeve top')
  })

  it('duration > 120 upgrades extremities', () => {
    const base = baselineRecommendation(20, 10)
    const weather = makeWeather({ minApparentTemp: 20 })
    const r = applyOverrides(base, weather, 'run', 'moderate', 150, 10)
    expect(r.gloves).toBe('Thin liner gloves')
    expect(r.hat).toBe('Running cap')
  })
})

describe('effectiveWindspeed', () => {
  it('run returns ambient wind unchanged', () => {
    const p = defaultProfile()
    expect(effectiveWindspeed('run', 'moderate', p, 15)).toBe(15)
  })

  it('cycle adds speed + intensity offset', () => {
    const p = { ...defaultProfile(), cyclingSpeedKmh: 24 }
    expect(effectiveWindspeed('cycle', 'moderate', p, 10)).toBe(34)
    expect(effectiveWindspeed('cycle', 'hard', p, 10)).toBe(39)
    expect(effectiveWindspeed('cycle', 'easy', p, 10)).toBe(29)
  })
})

describe('deltaWarning', () => {
  it('returns null when delta <= 5', () => {
    expect(deltaWarning(makeWeather({ minApparentTemp: 10, maxApparentTemp: 14 }))).toBeNull()
  })

  it('returns warning when delta > 5', () => {
    const result = deltaWarning(makeWeather({ minApparentTemp: 5, maxApparentTemp: 12 }))
    expect(result).toContain('7°C')
  })
})
