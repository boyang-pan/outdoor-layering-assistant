'use client'
import { useState, useEffect, useCallback } from 'react'
import type { UserProfile } from '@/lib/types'
import { defaultProfile } from '@/lib/types'
import { getProfile, saveProfile } from '@/lib/storage'

export function useProfile() {
  const [profile, setProfileState] = useState<UserProfile>(defaultProfile)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const stored = getProfile()
    if (stored) setProfileState(stored)
    setLoaded(true)
  }, [])

  const updateProfile = useCallback((updater: (p: UserProfile) => UserProfile) => {
    setProfileState(prev => {
      const next = updater(prev)
      saveProfile(next)
      return next
    })
  }, [])

  const setProfile = useCallback((p: UserProfile) => {
    saveProfile(p)
    setProfileState(p)
  }, [])

  return { profile, updateProfile, setProfile, loaded }
}
