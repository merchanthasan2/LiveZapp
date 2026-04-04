'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app/error]', error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="glass-card max-w-lg w-full p-8 text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Something went wrong</p>
        <h1 className="text-2xl font-bold text-white">We hit an unexpected error</h1>
        <p className="text-sm text-white/60">
          Try reloading this section. If the issue continues, return to the dashboard and try again.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/app/dashboard" className="btn-ghost">
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
