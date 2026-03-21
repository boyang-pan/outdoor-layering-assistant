import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const DURATION_LABELS: string[] = [
  '30 min', '45 min', '1h', '1h 15m', '1h 30m',
  '1h 45m', '2h', '2h 15m', '2h 30m', '2h 45m',
  '3h', '3h 15m', '3h 30m', '3h 45m', '4h',
  '4h 15m', '4h 30m', '4h 45m', '5h',
]

export const DURATION_MINS: number[] = [
  30, 45, 60, 75, 90, 105, 120, 135, 150, 165,
  180, 195, 210, 225, 240, 255, 270, 285, 300,
]

export function durationIndexToMins(index: number): number {
  return DURATION_MINS[index] ?? 45
}

export function durationMinsToIndex(mins: number): number {
  const idx = DURATION_MINS.indexOf(mins)
  return idx >= 0 ? idx : 1
}

export function formatTime(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  const minStr = m.toString().padStart(2, '0')
  return `${hour12}:${minStr} ${ampm}`
}

export function nextQuarter(now: Date): Date {
  const ms = 15 * 60 * 1000
  return new Date(Math.ceil(now.getTime() / ms) * ms)
}
