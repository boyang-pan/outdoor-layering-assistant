'use client'

import { useState } from 'react'

interface TimePickerProps {
  value: Date
  onChange: (date: Date) => void
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const hours = value.getHours()
  const minutes = value.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12

  const [hourRaw, setHourRaw] = useState<string>(String(hour12))
  const [minRaw, setMinRaw] = useState<string>(String(minutes).padStart(2, '0'))

  const update = (newHours: number, newMins: number) => {
    const d = new Date(value)
    d.setHours(newHours, newMins, 0, 0)
    onChange(d)
  }

  const toggleAmPm = () => {
    update(hours < 12 ? hours + 12 : hours - 12, minutes)
  }

  const commitHour = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!isNaN(n) && n >= 1 && n <= 12) {
      const newH = ampm === 'AM' ? (n === 12 ? 0 : n) : (n === 12 ? 12 : n + 12)
      update(newH, minutes)
      setHourRaw(String(n))
    } else {
      setHourRaw(String(hour12))
    }
  }

  const commitMinute = (raw: string) => {
    const n = parseInt(raw, 10)
    if (!isNaN(n) && n >= 0 && n <= 59) {
      update(hours, n)
      setMinRaw(String(n).padStart(2, '0'))
    } else {
      setMinRaw(String(minutes).padStart(2, '0'))
    }
  }

  const seg = 'flex-1 flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-raised)] border border-[var(--color-border-subtle)] h-14 text-[var(--color-text-primary)] font-mono text-lg font-medium transition-all hover:border-[var(--color-border-base)] hover:bg-[var(--color-bg-overlay)] focus-within:border-[var(--color-accent)] focus-within:bg-[var(--color-bg-overlay)]'

  const inputCls = 'w-full h-full text-center bg-transparent outline-none font-mono text-lg font-medium text-[var(--color-text-primary)] cursor-text'

  return (
    <div className="flex gap-1.5">
      <div className={seg}>
        <input
          type="number"
          min={1}
          max={12}
          value={hourRaw}
          onChange={e => setHourRaw(e.target.value)}
          onFocus={e => e.target.select()}
          onBlur={e => commitHour(e.target.value)}
          className={inputCls}
          style={{ MozAppearance: 'textfield' } as React.CSSProperties}
        />
      </div>
      <div className="flex items-center text-[var(--color-text-muted)] font-mono text-lg">:</div>
      <div className={seg}>
        <input
          type="number"
          min={0}
          max={59}
          value={minRaw}
          onChange={e => setMinRaw(e.target.value)}
          onFocus={e => e.target.select()}
          onBlur={e => commitMinute(e.target.value)}
          className={inputCls}
          style={{ MozAppearance: 'textfield' } as React.CSSProperties}
        />
      </div>
      <button
        type="button"
        onClick={toggleAmPm}
        className={seg + ' cursor-pointer select-none active:scale-[0.97]'}
      >
        {ampm}
      </button>
    </div>
  )
}
