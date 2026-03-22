'use client'
import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Callout } from '@/components/ui/Callout'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { useSession } from '@/hooks/useSession'
import { useProfile } from '@/hooks/useProfile'
import { sessionName, type LayerSet } from '@/lib/types'
import { formatTime, DURATION_LABELS, DURATION_MINS } from '@/lib/utils'
import { Shirt, Layers, Wind, Footprints, Hand, Crown, Bike } from 'lucide-react'

function durationLabel(mins: number): string {
  const idx = DURATION_MINS.indexOf(mins)
  return idx >= 0 ? DURATION_LABELS[idx] : `${mins} min`
}

function LayerTag({ value }: { value: string }) {
  const isSkip = value === 'Skip it' || value === 'No jacket' || value === 'No gloves' || value === 'Nothing'
  if (isSkip) {
    return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-bg-raised)] text-[var(--color-text-muted)]">Skip</span>
  }
  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-status-green-bg)] text-[var(--color-status-green)]">Wear</span>
}

function LayerRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-[var(--color-border-subtle)] last:border-0">
      <span className="text-[var(--color-text-muted)] w-4 shrink-0">{icon}</span>
      <span className="text-[12px] text-[var(--color-text-muted)] w-24 shrink-0">{label}</span>
      <span className="flex-1 text-[13px] font-medium text-[var(--color-text-primary)]">{value}</span>
      <LayerTag value={value} />
    </div>
  )
}

function ConfidenceBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-[var(--color-text-muted)] w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-[var(--color-bg-raised)]">
        <div
          className="h-1 rounded-full bg-[var(--color-accent)]"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="text-[12px] font-mono text-[var(--color-text-muted)] w-9 text-right">
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { session, saveSession } = useSession(id)
  const { profile } = useProfile()

  if (!session || !session.recommendation) {
    return (
      <div className="px-5 py-10 text-center text-[var(--color-text-muted)]">
        Session not found
      </div>
    )
  }

  const { recommendation: rec } = session
  const { layers, weatherSnapshot: w } = rec

  const departureDate = new Date(session.departureTime)
  const now = new Date()
  const minsUntil = (departureDate.getTime() - now.getTime()) / (1000 * 60)
  const isSoon = minsUntil <= 15

  const handleHeadOut = () => {
    saveSession({ ...session, status: 'feedback_pending' })
  }

  const activityLabel: Record<string, string> = { run: 'Run', cycle: 'Cycle', other: 'Other' }
  const intensityLabel: Record<string, string> = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' }

  return (
    <div className="pb-20 md:pb-8 page-enter">
      <TopBar />
      <div className="px-5 py-6">
        {/* Header chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Chip variant="blue">{activityLabel[session.activity]}</Chip>
          <Chip variant="blue">{durationLabel(session.durationMins)}</Chip>
          <Chip variant="blue">{intensityLabel[session.intensity]}</Chip>
          <Chip variant="blue">{session.location.label} · {Math.round(w.minApparentTemp)}°C · {Math.round(w.maxWindspeed)} km/h</Chip>
        </div>

        {/* Upper body */}
        <SectionLabel className="mt-0">Upper body</SectionLabel>
        <Card className="mb-2.5">
          <LayerRow icon={<Shirt size={16} strokeWidth={1.5} />} label="Base layer" value={layers.baseLayer} />
          <LayerRow icon={<Layers size={16} strokeWidth={1.5} />} label="Fleece / mid layer" value={layers.midLayer} />
          <LayerRow icon={<Wind size={16} strokeWidth={1.5} />} label="Jacket" value={layers.jacket} />
        </Card>

        {/* Lower body */}
        <SectionLabel>Lower body</SectionLabel>
        <Card className="mb-2.5">
          <LayerRow icon={<Footprints size={16} strokeWidth={1.5} />} label="Legs" value={layers.legs} />
        </Card>

        {/* Extras */}
        <SectionLabel>Extras</SectionLabel>
        <Card className="mb-6">
          <LayerRow icon={<Hand size={16} strokeWidth={1.5} />} label="Gloves" value={layers.gloves} />
          {layers.helmet && (
            <LayerRow icon={<Bike size={16} strokeWidth={1.5} />} label="Helmet" value={layers.helmet} />
          )}
          <LayerRow icon={<Crown size={16} strokeWidth={1.5} />} label="Hat / buff" value={layers.hat} />
          {layers.feet && (
            <LayerRow icon={<Footprints size={16} strokeWidth={1.5} />} label="Feet" value={layers.feet} />
          )}
        </Card>

        {/* Guidance */}
        <Callout className="mb-3">{rec.guidanceLine}</Callout>
        {rec.deltaWarning && <Callout variant="warn" className="mb-6">{rec.deltaWarning}</Callout>}

        {/* Confidence */}
        <SectionLabel>Confidence</SectionLabel>
        <Card className="mb-6 space-y-3">
          <ConfidenceBar label="Temperature" value={rec.confidence.temperature} />
          <ConfidenceBar label="Wind" value={rec.confidence.wind} />
          <ConfidenceBar label="Personalised" value={rec.confidence.personalised} />
          <p className="text-[11px] text-[var(--color-text-muted)] pt-1">
            {profile.feedbackCount} rated session{profile.feedbackCount !== 1 ? 's' : ''} — more ratings sharpen future recommendations.
          </p>
        </Card>

        {/* CTA */}
        {session.status === 'upcoming' && (
          isSoon ? (
            <Button onClick={handleHeadOut} className="mb-3">
              I&apos;m heading out
            </Button>
          ) : (
            <Button onClick={handleHeadOut} className="mb-3">
              Save — heading out at {formatTime(departureDate)}
            </Button>
          )
        )}

        {session.status === 'feedback_pending' && (
          <Button onClick={() => router.push(`/feedback/${session.id}`)} className="mb-3">
            I&apos;m back — give feedback →
          </Button>
        )}

        <Button variant="ghost" onClick={() => router.push('/')}>
          Back to home
        </Button>
      </div>
      <BottomNav />
    </div>
  )
}
