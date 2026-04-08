'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import BrandLockup from '@/components/BrandLockup'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const { user, isLoading, error: authError, login, loginWithGoogle } = useAuth()
  const redirectPath = searchParams.get('redirect')
  const safeRedirect = redirectPath && redirectPath.startsWith('/') ? redirectPath : '/app/dashboard'

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(safeRedirect)
    }
  }, [user, isLoading, router, safeRedirect])

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    try {
      const ok = await login(data.email, data.password)
      if (!ok) {
        setError('root', { message: 'Authentication failed.' })
      }
    } catch (err: any) {
      setError('root', { message: err?.message || 'A critical error occurred. Check browser console.' })
    }
  }

  const onGoogleSignIn = async () => {
    clearErrors('root')
    setIsGoogleSubmitting(true)
    const ok = await loginWithGoogle()
    if (!ok) {
      setError('root', { message: 'Google sign-in failed.' })
    }
    setIsGoogleSubmitting(false)
  }

  return (
    <div className="min-h-screen surface-page flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="surface-card p-8 sm:p-10 shadow-xl">
          <div className="text-center mb-8">
            <div className="flex justify-center">
              <BrandLockup href="/" size="lg" theme="light" />
            </div>
            <h1 className="mt-4 text-3xl font-black" style={{ color: 'var(--text-strong)' }}>Welcome back</h1>
            <p className="mt-1 text-sm text-muted-light">Sign in to continue to your dashboard.</p>
          </div>

          {(authError || errors.root) && (
            <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#b42318' }}>
              {authError || errors.root?.message}
            </div>
          )}

          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={isGoogleSubmitting || isSubmitting}
            className="w-full rounded-2xl border py-3 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ borderColor: 'rgba(123,116,135,0.24)', color: 'var(--text-strong)', background: '#ffffff' }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15 18.9 12 24 12c3 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.8-3.3-11.5-8l-6.6 5.1C9.1 39.6 16 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3 5.2-5.6 6.8l6.3 5.2C39.9 36.8 44 30.9 44 24c0-1.2-.1-2.3-.4-3.5z" />
            </svg>
            {isGoogleSubmitting ? 'Connecting Google...' : 'Continue with Google'}
          </button>

          <div className="relative my-4 text-center">
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t" style={{ borderColor: 'rgba(123,116,135,0.18)' }} />
            <span className="relative px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted-light)', background: '#f8f5fc' }}>or</span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted-light)' }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email')}
                className="w-full rounded-xl border px-4 py-3 text-base outline-none"
                style={{
                  background: '#f0edec',
                  borderColor: errors.email ? '#f04438' : 'rgba(123,116,135,0.20)',
                  color: 'var(--text-strong)',
                }}
              />
              {errors.email && <p className="mt-1 text-xs" style={{ color: '#b42318' }}>{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted-light)' }}>
                  Password
                </label>
                <Link href="/contact" className="text-xs font-semibold" style={{ color: 'var(--brand-primary-light)' }}>
                  Contact support
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  {...register('password')}
                  className="w-full rounded-xl border px-4 py-3 pr-11 text-base outline-none"
                  style={{
                    background: '#f0edec',
                    borderColor: errors.password ? '#f04438' : 'rgba(123,116,135,0.20)',
                    color: 'var(--text-strong)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 inline-flex items-center justify-center rounded-lg"
                  style={{ color: '#7b7487' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs" style={{ color: '#b42318' }}>{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl py-3.5 font-bold text-white inline-flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #650cd9, #7a3af0)' }}
            >
              {isSubmitting ? 'Signing in...' : <>Log In <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted-light)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold" style={{ color: 'var(--brand-primary-light)' }}>
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen surface-page flex items-center justify-center px-4 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: 'rgba(101,12,217,0.15)', borderTopColor: '#650cd9' }} />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}

