'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, AlertCircle, Zap } from 'lucide-react'
import Link from 'next/link'
import { LiveSessionService } from '@/lib/services/LiveSessionService'

export default function JoinPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = code.trim()
    if (cleanCode.length < 4) return

    setIsLoading(true)
    setError('')

    try {
      const session = await LiveSessionService.getSession(cleanCode)
      if (!session) {
        setError('Session not found. Double-check your code and try again.')
        setIsLoading(false)
        return
      }
      if (!session.isActive) {
        setError('This session has already ended.')
        setIsLoading(false)
        return
      }
      router.push(`/join/${cleanCode}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  const hasValue = code.length >= 4

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#F5F7FA' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: '#00A6A6', boxShadow: '0 4px 16px rgba(0,166,166,0.30)' }}
          >
            <Zap className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1A1A2E', lineHeight: 1.2 }}>
            Join a session
          </h1>
          <p className="text-sm mt-1.5" style={{ color: '#6B7280' }}>
            Enter the code shown on screen
          </p>
        </div>

        <div className="glass-card p-7">
          <form onSubmit={handleJoin} className="space-y-5">
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              autoFocus
              placeholder="123456"
              value={code}
              onChange={e => {
                setCode(e.target.value.replace(/\D/g, ''))
                setError('')
              }}
              className="w-full text-center rounded-2xl py-5 outline-none transition-all font-black"
              style={{
                background: '#F5F7FA',
                border: `2px solid ${error ? '#EF4444' : hasValue ? '#00A6A6' : '#E5E7EB'}`,
                fontSize: '2.5rem',
                letterSpacing: '0.25em',
                color: '#1A1A2E',
                boxShadow: hasValue && !error ? '0 0 0 3px rgba(0,166,166,0.12)' : 'none',
              }}
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.20)',
                  color: '#DC2626',
                }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={code.length < 4 || isLoading}
              className="btn-primary w-full justify-center py-3.5 text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Joining…
                </span>
              ) : (
                <>Join Session <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#9CA3AF' }}>
          Presenting?{' '}
          <Link href="/login" className="font-semibold transition-colors" style={{ color: '#00A6A6' }}>
            Sign in here
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
