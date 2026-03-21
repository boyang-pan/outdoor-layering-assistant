'use client'

interface TimePickerProps {
  value: Date
  onChange: (date: Date) => void
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const hours = value.getHours()
  const minutes = value.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12

  const update = (newHours: number, newMins: number) => {
    const d = new Date(value)
    d.setHours(newHours, newMins, 0, 0)
    onChange(d)
  }

  const incrementHour = () => {
    // Cycle 1–12 in 12h display, keeping AM/PM
    const nextHour12 = (hour12 % 12) + 1
    const newH = ampm === 'AM' ? (nextHour12 === 12 ? 0 : nextHour12) : (nextHour12 === 12 ? 12 : nextHour12 + 12)
    update(newH, minutes)
  }

  const cycleMinute = () => {
    const next = minutes === 45 ? 0 : minutes + 15
    update(hours, next)
  }

  const toggleAmPm = () => {
    update(hours < 12 ? hours + 12 : hours - 12, minutes)
  }

  const seg = 'flex-1 flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-raised)] border border-[var(--color-border-subtle)] h-14 cursor-pointer text-[var(--color-text-primary)] font-mono text-lg font-medium select-none hover:border-[var(--color-border-base)] hover:bg-[var(--color-bg-overlay)] active:scale-[0.97] transition-all'

  return (
    <div className="flex gap-1.5">
      <button type="button" className={seg} onClick={incrementHour}>
        {hour12}
      </button>
      <div className="flex items-center text-[var(--color-text-muted)] font-mono text-lg">:</div>
      <button type="button" className={seg} onClick={cycleMinute}>
        {String(minutes).padStart(2, '0')}
      </button>
      <button type="button" className={seg} onClick={toggleAmPm}>
        {ampm}
      </button>
    </div>
  )
}
