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
import { CheckCircle2, X } from 'lucide-react'

const ZONE_LABELS: Record<BodyZone, string> = {
  top: 'Top', jacket: 'Jacket', legs: 'Legs', hands: 'Hands', overall: 'Overall'
}
const ALL_ZONES: BodyZone[] = ['top', 'jacket', 'legs', 'hands', 'overall']

const ALTERNATIVES: Record<keyof LayerSet, string[]> = {
  baseLayer: ['Short-sleeve top', 'Long-sleeve top', 'Long-sleeve thermal top', 'Other'],
  midLayer: ['Skip it', 'Lightweight fleece', 'Heavyweight fleece', 'Insulated gilet', 'Other'],
  jacket: ['No jacket', 'Lightweight wind jacket', 'Waterproof rain jacket', 'Softshell', 'Other'],
  legs: ['Short running tights', 'Full-length running tights', 'Bib tights', 'Shorts', 'Other'],
  gloves: ['No gloves', 'Thin liner gloves', 'Insulated running gloves', 'Other'],
  hat: ['Nothing', 'Running cap', 'Thermal beanie', 'Neck buff', 'Other'],
}

const LAYER_LABELS: Record<keyof LayerSet, string> = {
  baseLayer: 'Base layer', midLayer: 'Fleece', jacket: 'Jacket',
  legs: 'Legs', gloves: 'Gloves', hat: 'Hat',
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
  const [expandedZone, setExpandedZone] = useState<keyof LayerSet | null>(null)
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

  const toggleSkip = (zone: keyof LayerSet) => {
    setEdits(prev => {
      const existing = prev.find(e => e.zone === zone)
      if (existing?.action === 'skipped') return prev.filter(e => e.zone !== zone)
      return [...prev.filter(e => e.zone !== zone), { zone, action: 'skipped' }]
    })
  }

  const selectAlternative = (zone: keyof LayerSet, val: string) => {
    if (val === 'Other') { setExpandedZone(zone); return }
    setEdits(prev => [...prev.filter(e => e.zone !== zone), { zone, action: 'substituted', substituteValue: val }])
    setExpandedZone(null)
  }

  const submitOther = (zone: keyof LayerSet) => {
    const val = otherInputs[zone]?.trim()
    if (!val) return
    setEdits(prev => [...prev.filter(e => e.zone !== zone), { zone, action: 'substituted', substituteValue: val }])
    setExpandedZone(null)
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
  const calibPct = Math.min(100, Math.round((feedbackCount / 10) * 100))

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5">
        <CheckCircle2 size={40} strokeWidth={1.5} className="text-[var(--color-status-green)] mb-4" />
        <h2 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">Thanks — that helps</h2>
        <p className="text-[13px] text-[var(--color-text-secondary)] text-center mb-6">{insight}</p>
        <div className="w-full mb-6">
          <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] mb-1.5">
            <span>Calibration</span>
            <span className="font-mono">{calibPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--color-bg-raised)]">
            <div className="h-1.5 rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${calibPct}%` }} />
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
        <SectionLabel className="mt-0">What we recommended</SectionLabel>
        <Card className="mb-6">
          {(Object.keys(LAYER_LABELS) as (keyof LayerSet)[]).map(zone => {
            const edit = edits.find(e => e.zone === zone)
            const displayVal = edit?.action === 'substituted' ? edit.substituteValue! : layers[zone]
            const isSkipped = edit?.action === 'skipped'
            return (
              <div key={zone}>
                <div className="flex items-center gap-2 py-2.5 border-b border-[var(--color-border-subtle)] last:border-0">
                  <span className="text-[12px] text-[var(--color-text-muted)] w-20 shrink-0">{LAYER_LABELS[zone]}</span>
                  <button
                    type="button"
                    onClick={() => setExpandedZone(expandedZone === zone ? null : zone)}
                    className={cn(
                      'flex-1 text-left text-[13px] font-medium transition-colors',
                      isSkipped
                        ? 'line-through text-[var(--color-text-muted)]'
                        : edit?.action === 'substituted'
                        ? 'text-[var(--color-accent-light)]'
                        : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent-light)]'
                    )}
                  >
                    {displayVal}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSkip(zone)}
                    className={cn(
                      'h-6 w-6 rounded border flex items-center justify-center text-[11px] transition-all',
                      isSkipped
                        ? 'bg-[var(--color-status-red-bg)] border-red-500/30 text-[var(--color-status-red)]'
                        : 'border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-border-base)]'
                    )}
                    title="Didn't wear this"
                  >
                    <X size={11} strokeWidth={2} />
                  </button>
                </div>
                {expandedZone === zone && !isSkipped && (
                  <div className="pl-20 pb-3 space-y-1">
                    {ALTERNATIVES[zone].map(alt => (
                      <button
                        key={alt}
                        type="button"
                        onClick={() => selectAlternative(zone, alt)}
                        className="w-full text-left text-[12px] py-1.5 px-2 rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        {alt}
                      </button>
                    ))}
                    {expandedZone === zone && (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          maxLength={80}
                          placeholder="Describe what you wore"
                          value={otherInputs[zone] ?? ''}
                          onChange={e => setOtherInputs(prev => ({ ...prev, [zone]: e.target.value }))}
                          className="flex-1 h-9 bg-[var(--color-bg-raised)] border border-[var(--color-border-base)] rounded px-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
                          style={{ fontSize: '16px' }}
                        />
                        <button
                          type="button"
                          onClick={() => submitOther(zone)}
                          className="h-9 px-3 rounded bg-[var(--color-accent)] text-white text-[12px] font-medium"
                        >
                          Set
                        </button>
                      </div>
                    )}
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
