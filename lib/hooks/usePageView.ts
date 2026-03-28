'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function usePageView() {
  const pathname = usePathname()

  useEffect(() => {
    try {
      // Get or create sessionId
      let sessionId = sessionStorage.getItem('eq_sid')
      if (!sessionId) {
        sessionId = Math.random().toString(36).slice(2)
        sessionStorage.setItem('eq_sid', sessionId)
      }

      // Get userId if present
      const userId = localStorage.getItem('eq_uid') ?? null

      fetch('/api/track', {
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
      }).catch(() => {
        // Silently ignore fetch errors
      })
    } catch {
      // Silently ignore all errors
    }
  }, [pathname])
}
