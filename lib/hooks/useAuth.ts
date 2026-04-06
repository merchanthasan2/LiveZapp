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
import { ref, get, set } from 'firebase/database'
import { ADMIN_EMAILS, SUPERADMIN_EMAILS } from '@/lib/auth/allowlist'

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

      // Fetch user doc from Realtime Database to get `role` and `planId`
      try {
        const userRef = ref(rtdb, `users/${firebaseUser.uid}`)
        const snapshot = await get(userRef)
        
        let userData: User
        
        if (snapshot.exists()) {
          const stored = snapshot.val() as User
          const emailLower = firebaseUser.email?.toLowerCase() || ''
          const isSuperAdminEmail = SUPERADMIN_EMAILS.has(emailLower)
          const isAdminEmail      = ADMIN_EMAILS.has(emailLower)
          const enforcedRole: Role = isSuperAdminEmail ? 'superadmin'
                                    : isAdminEmail      ? 'admin'
                                    : stored.role

          // Write back if role has changed (e.g. first login after email was added to allowlist)
          if (enforcedRole !== stored.role) {
            await set(ref(rtdb, `users/${firebaseUser.uid}/role`), enforcedRole)
          }
          // Superadmins and admins always get pro plan
          const enforcedPlan: PlanId = isAdminRole(enforcedRole) ? 'pro' : stored.planId
          if (isAdminRole(enforcedRole) && stored.planId !== 'pro') {
            await set(ref(rtdb, `users/${firebaseUser.uid}/planId`), 'pro')
          }

          userData = { ...stored, id: firebaseUser.uid, role: enforcedRole, planId: enforcedPlan }
        } else {
          // New user — create RTDB profile
          const emailLower = firebaseUser.email?.toLowerCase() || ''
          const isSuperAdminEmail = SUPERADMIN_EMAILS.has(emailLower)
          const isAdminEmail      = ADMIN_EMAILS.has(emailLower)
          const role: Role = isSuperAdminEmail ? 'superadmin' : isAdminEmail ? 'admin' : 'user'

          userData = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'New User',
            role,
            planId: isAdminRole(role) ? 'pro' : 'free',
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
