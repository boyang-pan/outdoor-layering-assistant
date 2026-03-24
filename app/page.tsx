import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { CloudSun, Zap, TrendingUp } from 'lucide-react'

const FEATURES = [
  {
    Icon: CloudSun,
    title: 'Weather-aware',
    description: 'Real-time conditions pulled for your location',
  },
  {
    Icon: Zap,
    title: 'Built for your pace',
    description: 'Recommendations adapt to your effort level',
  },
  {
    Icon: TrendingUp,
    title: 'Learns over time',
    description: 'Feedback shapes future suggestions',
  },
]

export default async function LandingPage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-[360px] flex flex-col items-center text-center">
        {/* Hero */}
        <h1 className="text-4xl font-light tracking-tight text-[var(--color-text-primary)] mb-3">
          Layer
        </h1>
        <p className="text-[15px] text-[var(--color-text-secondary)] leading-relaxed mb-10">
          Smart clothing recommendations for your outdoor workouts
        </p>

        {/* Feature highlights */}
        <div className="w-full flex flex-col gap-3 mb-10">
          {FEATURES.map(({ Icon, title, description }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-[var(--radius-lg)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] px-4 py-3 text-left"
            >
              <Icon size={16} strokeWidth={1.5} className="text-[var(--color-accent-light)] mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{title}</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="w-full flex flex-col gap-3">
          <Link href="/sign-up" className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] text-[var(--color-bg-base)] text-[14px] font-medium transition-opacity hover:opacity-90 active:opacity-80 flex items-center justify-center">
            Get started
          </Link>
          <Link href="/sign-in" className="w-full h-11 rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] text-[14px] font-medium transition-colors hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-base)] flex items-center justify-center">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
