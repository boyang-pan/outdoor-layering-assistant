'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { searchLocations } from '@/lib/weather'

interface LocationResult {
  lat: number
  lon: number
  label: string
}

interface LocationInputProps {
  value: string
  onChange: (text: string) => void
  onSelect: (loc: LocationResult) => void
  placeholder?: string
  className?: string
}

export function LocationInput({ value, onChange, onSelect, placeholder = 'City or postcode', className }: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setLoading(true)
    const results = await searchLocations(query)
    setSuggestions(results)
    setOpen(results.length > 0 || query.length >= 2)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, search])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false)
  }

  function handleSelect(loc: LocationResult) {
    onChange(loc.label)
    onSelect(loc)
    setOpen(false)
    setSuggestions([])
  }

  return (
    <div ref={containerRef} className={`relative${className ? ` ${className}` : ''}`}>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          className="w-full h-12 bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] px-3 pr-9 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          style={{ fontSize: '16px' }}
        />
        {loading && (
          <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-[var(--color-bg-base)] border border-[var(--color-border-base)] rounded-[var(--radius-md)] shadow-lg overflow-hidden">
          {suggestions.length === 0 && !loading ? (
            <div className="px-3 py-2.5 text-sm text-[var(--color-text-muted)]">No results</div>
          ) : (
            suggestions.map((loc, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={e => { e.preventDefault(); handleSelect(loc) }}
                className="w-full text-left px-3 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-raised)] transition-colors"
              >
                {loc.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
