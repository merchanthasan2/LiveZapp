'use client'

/**
 * lib/hooks/useAuth.ts
 *
 * Real Firebase auth hook. Listens to onAuthStateChanged and fetches the
 * expanded User profile (role, planId) from RTDB's `users` node.
 * 
 * Includes auto-provisioning logic for the 3 requested development accounts
 * (admin, user1, user2) so they don't have to be manually created in Firebase.
 */

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User, Role } from '@/types/auth'
import { isAdminRole } from '@/types/auth'
import type { PlanId } from '@/types/plans'
import { auth, rtdb } from '@/lib/firebase'
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { ref, get } from 'firebase/database'

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAdmin: boolean        // true for admin OR superadmin
  isSuperAdmin: boolean   // true only for superadmin
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  loginWithGoogle: () => Promise<boolean>
  logout: () => void
}

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

      try {
        const idToken = await firebaseUser.getIdToken()
        const bootstrapResponse = await fetch('/api/auth/bootstrap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ name: firebaseUser.displayName || undefined }),
        })

        if (!bootstrapResponse.ok) {
          const bootstrapData = await bootstrapResponse.json().catch(() => ({}))
          throw new Error(String(bootstrapData?.error ?? 'Failed to synchronize account profile'))
        }

        const userRef = ref(rtdb, `users/${firebaseUser.uid}`)
        const snapshot = await get(userRef)
        
        let userData: User
        
        if (snapshot.exists()) {
          const stored = snapshot.val() as User
          userData = {
            ...stored,
            id: firebaseUser.uid,
            role: stored.role as Role,
            planId: (stored.planId ?? 'free') as PlanId,
          }
        } else {
          userData = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'New User',
            role: 'user',
            planId: 'free',
          }
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

  const isAdmin      = user ? isAdminRole(user.role) : false
  const isSuperAdmin = user?.role === 'superadmin'

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

  const loginWithGoogle = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
      return true
    } catch (err: any) {
      const code = err?.code ?? ''
      if (code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled.')
      } else if (code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled in Firebase Authentication yet.')
      } else {
        const cleanError = err?.message?.replace('Firebase: ', '').trim()
        setError(cleanError || 'Google sign-in failed. Please try again.')
      }
      setIsLoading(false)
      return false
    }
  }, [])

  // 4. Logout function
  const logout = useCallback(async () => {
    // Optimistically clear local auth state so protected routes react immediately.
    setUser(null)
    setIsLoading(false)
    setError(null)

    try {
      await signOut(auth)
    } catch (err) {
      console.error('Error signing out', err)
    } finally {
      // Force route change away from /app/* even if auth listener lags.
      router.replace('/login')
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/app')) {
        window.location.replace('/login')
      }
    }
  }, [router])

  return { user, isLoading, isAdmin, isSuperAdmin, error, login, loginWithGoogle, logout }
}
