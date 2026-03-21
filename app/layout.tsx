import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { FeedbackSyncProvider } from '@/components/FeedbackSync'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Layer — Outdoor Layering Assistant',
  description: 'Smart clothing recommendations for your outdoor workouts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-[var(--color-bg-base)]">
        <div className="max-w-[420px] mx-auto min-h-screen relative">
          <FeedbackSyncProvider />
          {children}
        </div>
      </body>
    </html>
  )
}
