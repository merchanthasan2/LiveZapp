'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'

/** Keep legacy key in sync so pageviews attribute logged-in users (one hit per navigation only). */
function useSyncAnalyticsUserId() {
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      try {
        if (u?.uid) localStorage.setItem('eq_uid', u.uid)
        else localStorage.removeItem('eq_uid')
      } catch {
        /* ignore */
      }
    })
  }, [])
}

export default function usePageView() {
  const pathname = usePathname()
  useSyncAnalyticsUserId()

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      let sessionId = sessionStorage.getItem('eq_sid')
      if (!sessionId) {
        sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36)
        sessionStorage.setItem('eq_sid', sessionId)
      }

      const userId = auth.currentUser?.uid ?? localStorage.getItem('eq_uid') ?? null

      void fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: pathname,
          referrer: document.referrer || null,
          sessionId,
          userId,
          screenW: window.screen.width,
          screenH: window.screen.height,
        }),
      }).catch(() => {})
    } catch {
      /* ignore */
    }
  }, [pathname])
}
