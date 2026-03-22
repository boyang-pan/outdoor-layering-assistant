'use client'
import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useSession } from '@/hooks/useSession'
import { useProfile } from '@/hooks/useProfile'
import { updateProfile, feedbackInsight } from '@/lib/personalization'
import { saveProfile, getProfile } from '@/lib/storage'
import type { BodyZone, Feedback, LayerEdit, LayerSet, PhaseRating, ThermalRating, WoreDifferentState } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CheckCircle2, ChevronDown } from 'lucide-react'

const ZONE_LABELS: Record<BodyZone, string> = {
  top: 'Base layer', jacket: 'Jacket', legs: 'Legs', hands: 'Hands', feet: 'Feet', overall: 'Overall'
}
const ALL_ZONES: BodyZone[] = ['top', 'jacket', 'legs', 'hands', 'feet', 'overall']

const SKIPPED_VALUE = "Didn't wear this"

function getAlternatives(activity: string): Partial<Record<keyof LayerSet, string[]>> {
  if (activity === 'cycle') {
    return {
      baseLayer: ['Short-sleeve jersey', 'Long-sleeve jersey', 'Thermal long-sleeve jersey', 'Other', SKIPPED_VALUE],
      midLayer: ['Skip it', 'Lightweight cycling gilet', 'Insulated gilet', 'Heavyweight fleece', 'Other', SKIPPED_VALUE],
      jacket: ['No jacket', 'Cycling wind jacket', 'Waterproof cycling jacket', 'Softshell', 'Other', SKIPPED_VALUE],
      legs: ['Bib shorts', 'Full-length bib tights', 'Shorts', 'Other', SKIPPED_VALUE],
      gloves: ['No gloves', 'Thin liner gloves', 'Insulated cycling gloves', 'Other', SKIPPED_VALUE],
      hat: ['Nothing', 'Cycling cap', 'Thermal beanie', 'Neck buff', 'Other', SKIPPED_VALUE],
      feet: ['Cycling socks', 'Lightweight overshoes', 'Insulated overshoes', 'Insulated overshoes + thermal socks', SKIPPED_VALUE],
    }
  }
  return {
    baseLayer: ['Short-sleeve top', 'Long-sleeve top', 'Long-sleeve thermal top', 'Other', SKIPPED_VALUE],
    midLayer: ['Skip it', 'Lightweight fleece', 'Heavyweight fleece', 'Insulated gilet', 'Other', SKIPPED_VALUE],
    jacket: ['No jacket', 'Lightweight wind jacket', 'Waterproof rain jacket', 'Softshell', 'Other', SKIPPED_VALUE],
    legs: ['Short running tights', 'Full-length running tights', 'Shorts', 'Other', SKIPPED_VALUE],
    gloves: ['No gloves', 'Thin liner gloves', 'Insulated running gloves', 'Other', SKIPPED_VALUE],
    hat: ['Nothing', 'Running cap', 'Thermal beanie', 'Neck buff', 'Other', SKIPPED_VALUE],
    feet: ['Standard running socks', 'Warm running socks', 'Thermal running socks', SKIPPED_VALUE],
  }
}

const LAYER_LABELS: Partial<Record<keyof LayerSet, string>> = {
  baseLayer: 'Base layer', midLayer: 'Fleece', jacket: 'Jacket',
  legs: 'Legs', gloves: 'Gloves', hat: 'Hat', feet: 'Feet',
}

type Phase = 'start' | 'middle' | 'end'
const PHASES: { key: Phase; label: string; sub: string; color: string }[] = [
  { key: 'start', label: 'Start', sub: 'First 5 min', color: '#3b82f6' },
  { key: 'middle', label: 'Middle', sub: 'Mid-session', color: '#6366f1' },
  { key: 'end', label: 'End', sub: 'Last 5 min', color: '#22c55e' },
]

function PhaseBlock({
  phase, rating, zones, onRate, onZone,
}: {
  phase: { key: Phase; label: string; sub: string; color: string }
  rating: ThermalRating | null
  zones: BodyZone[]
  onRate: (r: ThermalRating) => void
  onZone: (z: BodyZone) => void
}) {
  return (
    <div className="py-4 border-b border-[var(--color-border-subtle)] last:border-0">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: phase.color }} />
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{phase.label}</span>
        <span className="text-[12px] text-[var(--color-text-muted)]">{phase.sub}</span>
      </div>
      <div className="flex gap-2">
        {(['too_cold', 'good', 'too_warm'] as ThermalRating[]).map(r => (
          <button
            key={r}
            type="button"
            onClick={() => onRate(r)}
            className={cn(
              'flex-1 h-11 rounded-[var(--radius-md)] border text-[12px] font-medium transition-all active:scale-[0.97]',
              rating === r
                ? r === 'good'
                  ? 'bg-[var(--color-status-green-bg)] border-green-500/30 text-[var(--color-status-green)]'
                  : r === 'too_cold'
                  ? 'bg-[var(--color-status-blue-bg)] border-blue-500/30 text-[var(--color-status-blue)]'
                  : 'bg-[var(--color-status-red-bg)] border-red-500/30 text-[var(--color-status-red)]'
                : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-base)]'
            )}
          >
            {r === 'too_cold' ? '🥶 Too cold' : r === 'good' ? '✓ Good' : '🥵 Too warm'}
          </button>
        ))}
      </div>
      {(rating === 'too_cold' || rating === 'too_warm') && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {ALL_ZONES.map(z => (
            <button
              key={z}
              type="button"
              onClick={() => onZone(z)}
              className={cn(
                'px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all',
                zones.includes(z)
                  ? 'bg-[var(--color-accent-glow)] border-[var(--color-accent)] text-[var(--color-accent-light)]'
                  : 'border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-border-base)]'
              )}
            >
              {ZONE_LABELS[z]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { session, saveSession } = useSession(id)
  const { profile } = useProfile()

  const [edits, setEdits] = useState<LayerEdit[]>([])
  const [otherZone, setOtherZone] = useState<keyof LayerSet | null>(null)
  const [otherInputs, setOtherInputs] = useState<Partial<Record<keyof LayerSet, string>>>({})
  const [phases, setPhases] = useState<Record<Phase, { rating: ThermalRating | null; zones: BodyZone[] }>>({
    start: { rating: null, zones: [] },
    middle: { rating: null, zones: [] },
    end: { rating: null, zones: [] },
  })
  const [submitted, setSubmitted] = useState(false)
  const [insight, setInsight] = useState('')
  const [validationError, setValidationError] = useState('')

  if (!session || !session.recommendation) {
    return <div className="px-5 py-10 text-[var(--color-text-muted)]">Session not found</div>
  }

  const layers = session.recommendation.layers
  const ALTERNATIVES = getAlternatives(session.activity)

  const handleSelectChange = (zone: keyof LayerSet, val: string) => {
    if (val === 'Other') {
      setOtherZone(zone)
      return
    }
    setOtherZone(null)
    if (val === SKIPPED_VALUE) {
      setEdits(prev => [...prev.filter(e => e.zone !== zone), { zone, action: 'skipped' }])
    } else if (val === layers[zone]) {
      setEdits(prev => prev.filter(e => e.zone !== zone))
    } else {
      setEdits(prev => [...prev.filter(e => e.zone !== zone), { zone, action: 'substituted', substituteValue: val }])
    }
  }

  const submitOther = (zone: keyof LayerSet) => {
    const val = otherInputs[zone]?.trim()
    if (!val) return
    setEdits(prev => [...prev.filter(e => e.zone !== zone), { zone, action: 'substituted', substituteValue: val }])
    setOtherZone(null)
  }

  const setPhaseRating = (phase: Phase, rating: ThermalRating) => {
    setPhases(prev => ({ ...prev, [phase]: { rating, zones: rating === 'good' ? [] : prev[phase].zones } }))
  }

  const toggleZone = (phase: Phase, zone: BodyZone) => {
    setPhases(prev => {
      const zones = prev[phase].zones.includes(zone)
        ? prev[phase].zones.filter(z => z !== zone)
        : [...prev[phase].zones, zone]
      return { ...prev, [phase]: { ...prev[phase], zones } }
    })
  }

  const handleSubmit = () => {
    const allRated = (['start', 'middle', 'end'] as Phase[]).every(p => phases[p].rating !== null)
    if (!allRated) { setValidationError('Please rate all three phases'); return }
    setValidationError('')

    const skippedCount = edits.filter(e => e.action === 'skipped').length
    const subCount = edits.filter(e => e.action === 'substituted').length
    const woreDifferentState: WoreDifferentState =
      subCount > 0 ? 'substituted' : skippedCount > 0 ? 'skipped_items' : 'followed'

    const feedback: Feedback = {
      sessionId: id,
      submittedAt: new Date().toISOString(),
      woreDifferentState,
      layerEdits: edits,
      phases: {
        start: { rating: phases.start.rating!, zones: phases.start.zones },
        middle: { rating: phases.middle.rating!, zones: phases.middle.zones },
        end: { rating: phases.end.rating!, zones: phases.end.zones },
      },
      syncedToBackend: false,
    }

    const currentProfile = getProfile() ?? profile
    const updatedProfile = updateProfile(currentProfile, feedback, session)
    saveProfile(updatedProfile)

    saveSession({ ...session, status: 'complete', feedback })
    setInsight(feedbackInsight(feedback))
    setSubmitted(true)
  }

  const feedbackCount = profile.feedbackCount

  if (submitted) {
    const ratedAfter = feedbackCount + 1
    const barPct = Math.min(100, Math.round((ratedAfter / 20) * 100))
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5">
        <CheckCircle2 size={40} strokeWidth={1.5} className="text-[var(--color-status-green)] mb-4" />
        <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">Thanks — that helps</h2>
        <p className="text-[13px] text-[var(--color-text-secondary)] text-center mb-6">{insight}</p>
        <div className="w-full mb-6">
          <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] mb-1.5">
            <span>Rated sessions</span>
            <span className="font-mono">{ratedAfter} <span className="font-sans font-normal">(keeps improving)</span></span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--color-bg-raised)]">
            <div className="h-1.5 rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${barPct}%` }} />
          </div>
        </div>
        <Button onClick={() => router.push('/')}>Back to home</Button>
      </div>
    )
  }

  return (
    <div className="pb-8 page-enter">
      <TopBar />
      <div className="px-5 py-6">
        {/* Section A: Recap */}
        <SectionLabel className="mt-0">What did you wear?</SectionLabel>
        <Card className="mb-6">
          {(Object.keys(LAYER_LABELS) as (keyof LayerSet)[]).map(zone => {
            const edit = edits.find(e => e.zone === zone)
            const isSkipped = edit?.action === 'skipped'
            const alts = ALTERNATIVES[zone] ?? []
            const selectVal = isSkipped
              ? SKIPPED_VALUE
              : edit?.action === 'substituted'
              ? (alts.includes(edit.substituteValue!) ? edit.substituteValue! : 'Other')
              : layers[zone]
            // Options: recommended value first (if not already in list), then alternatives
            const opts = [
              layers[zone],
              ...alts.filter(a => a !== layers[zone]),
            ]
            return (
              <div key={zone} className="py-2.5 border-b border-[var(--color-border-subtle)] last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[var(--color-text-muted)] w-20 shrink-0">{LAYER_LABELS[zone]}</span>
                  <div className="relative flex-1">
                    <select
                      value={otherZone === zone ? 'Other' : selectVal}
                      onChange={e => handleSelectChange(zone, e.target.value)}
                      className={cn(
                        'appearance-none w-full h-8 rounded-[var(--radius-sm)] border pl-3 pr-8 text-[13px] font-medium bg-[var(--color-bg-raised)] focus:outline-none focus:border-[var(--color-accent)] transition-colors',
                        isSkipped
                          ? 'border-[var(--color-border-subtle)] text-[var(--color-text-muted)]'
                          : edit?.action === 'substituted'
                          ? 'border-[var(--color-accent)] text-[var(--color-accent-light)]'
                          : 'border-[var(--color-border-subtle)] text-[var(--color-text-primary)]'
                      )}
                    >
                      {opts.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown
                      size={13}
                      strokeWidth={2}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-muted)]"
                    />
                  </div>
                </div>
                {otherZone === zone && !isSkipped && (
                  <div className="flex gap-2 mt-2 pl-22">
                    <input
                      type="text"
                      maxLength={80}
                      placeholder="Describe what you wore"
                      value={otherInputs[zone] ?? ''}
                      onChange={e => setOtherInputs(prev => ({ ...prev, [zone]: e.target.value }))}
                      className="flex-1 h-8 bg-[var(--color-bg-raised)] border border-[var(--color-border-base)] rounded-[var(--radius-sm)] px-2 text-[12px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                    />
                    <button
                      type="button"
                      onClick={() => submitOther(zone)}
                      className="h-8 px-3 rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white text-[12px] font-medium"
                    >
                      Set
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </Card>

        {/* Section C: Phases */}
        <SectionLabel>How did it feel?</SectionLabel>
        <Card className="mb-6">
          {PHASES.map(phase => (
            <PhaseBlock
              key={phase.key}
              phase={phase}
              rating={phases[phase.key].rating}
              zones={phases[phase.key].zones}
              onRate={r => setPhaseRating(phase.key, r)}
              onZone={z => toggleZone(phase.key, z)}
            />
          ))}
        </Card>

        {validationError && (
          <p className="text-[var(--color-status-red)] text-[12px] mb-3">{validationError}</p>
        )}

        <Button onClick={handleSubmit} className="mb-3">Submit feedback</Button>
        <Button variant="ghost" onClick={() => router.push('/')}>Skip for now</Button>
      </div>
    </div>
  )
}
