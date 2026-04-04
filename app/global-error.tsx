'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error('[app/global-error]', error)

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-[#06090f] text-white">
          <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-white/5 p-8 text-center space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300/90">Critical error</p>
            <h1 className="text-2xl font-bold">Application failed to render</h1>
            <p className="text-sm text-white/70">
              A global runtime error occurred. Retry to continue.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold bg-yellow-300 text-black"
            >
              Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
