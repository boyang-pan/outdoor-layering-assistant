'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@/lib/types'
import { getSessions, getSession, upsertSession } from '@/lib/storage'

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    setSessions(getSessions())
  }, [])

  const saveSession = useCallback((session: Session) => {
    upsertSession(session)
    setSessions(getSessions())
  }, [])

  const upcomingSession = sessions.find(s => s.status === 'upcoming')
  const pendingSession = sessions.find(s => s.status === 'feedback_pending')

  return { sessions, saveSession, upcomingSession, pendingSession }
}

export function useSession(id: string) {
  const [session, setSessionState] = useState<Session | null>(null)

  useEffect(() => {
    if (id) setSessionState(getSession(id))
  }, [id])

  const saveSession = useCallback((s: Session) => {
    upsertSession(s)
    setSessionState(s)
  }, [])

  return { session, saveSession }
}
