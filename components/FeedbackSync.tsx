'use client'
import { useEffect } from 'react'
import { getSessions, upsertSession } from '@/lib/storage'

export function FeedbackSyncProvider() {
  useEffect(() => {
    const sessions = getSessions()
    const unsynced = sessions.filter(s => s.feedback && !s.feedback.syncedToBackend)
    if (unsynced.length === 0) return

    unsynced.forEach(async session => {
      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(session.feedback),
        })
        if (res.ok) {
          upsertSession({
            ...session,
            feedback: { ...session.feedback!, syncedToBackend: true },
          })
        }
      } catch {
        // Network unavailable — will retry on next load
      }
    })
  }, [])

  return null
}
