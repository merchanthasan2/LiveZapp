'use client'

/**
 * lib/hooks/useAuth.ts
 *
 * Real Firebase auth hook. Listens to onAuthStateChanged and fetches the
 * expanded User profile (role, planId) from Firestore's `users` collection.
 * 
 * Includes auto-provisioning logic for the 3 requested development accounts
 * (admin, user1, user2) so they don't have to be manually created in Firebase.
 */

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User, Role } from '@/types/auth'
import type { PlanId } from '@/types/plans'
import { auth, rtdb } from '@/lib/firebase'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { ref, get, set } from 'firebase/database'

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAdmin: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

// Emails that always receive the admin role on first login / registration
const ADMIN_EMAILS = new Set(['happy143@gmail.com'])

export function useAuth(): AuthState {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. Listen for Firebase Auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setIsLoading(false)
        return
      }

      // Fetch user doc from Realtime Database to get `role` and `planId`
      try {
        const userRef = ref(rtdb, `users/${firebaseUser.uid}`)
        const snapshot = await get(userRef)
        
        let userData: User
        
        if (snapshot.exists()) {
          // Always override id with the live Firebase UID — the stored value
          // may be missing or stale if the record was written by an older version.
          const stored = snapshot.val() as User
          const emailLower = firebaseUser.email?.toLowerCase() || ''
          // Enforce admin role for allowlisted emails regardless of stored value
          const shouldBeAdmin = ADMIN_EMAILS.has(emailLower)
          if (shouldBeAdmin && stored.role !== 'admin') {
            await set(ref(rtdb, `users/${firebaseUser.uid}/role`), 'admin')
            await set(ref(rtdb, `users/${firebaseUser.uid}/planId`), 'pro')
          }
          const effectiveRole: Role = shouldBeAdmin ? 'admin' : stored.role
          const effectivePlan: PlanId = shouldBeAdmin ? 'pro' : stored.planId
          userData = { ...stored, id: firebaseUser.uid, role: effectiveRole, planId: effectivePlan }
        } else {
          // New user — create RTDB profile, granting admin to allowlisted emails
          const emailLower = firebaseUser.email?.toLowerCase() || ''
          const isAdmin = ADMIN_EMAILS.has(emailLower)

          userData = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'New User',
            role: isAdmin ? 'admin' : 'user',
            planId: isAdmin ? 'pro' : 'free',
          }
          await set(userRef, userData)
        }
        
        setUser(userData)
      } catch (err: any) {
        console.error('Error fetching user profile from Realtime Database:', err)
        setUser(null)
        setError(
          err.message?.includes('permission') 
            ? 'Access to the database was denied. Please check your Realtime Database security rules.'
            : err.message || 'Error loading user profile.'
        )
        // Sign out if we can't load the profile so they aren't stuck in limbo
        signOut(auth).catch(console.error)
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsub()
  }, [])

  const isAdmin = user?.role === 'admin'

  // 2. Login function
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (err: any) {
      const cleanError = err.message.replace('Firebase: ', '').trim()
      setError(cleanError || 'Invalid email or password.')
      setIsLoading(false)
      return false
    }
  }, [])

  // 4. Logout function
  const logout = useCallback(async () => {
    try {
      await signOut(auth)
      // Redirect happens in layout effect, but pushing login is safe
      router.push('/login')
    } catch (err) {
      console.error('Error signing out', err)
    }
  }, [router])

  return { user, isLoading, isAdmin, error, login, logout }
}
