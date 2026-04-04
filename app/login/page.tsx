'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import BrandLockup from '@/components/BrandLockup'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const { user, isLoading, error: authError, login } = useAuth()

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/app/dashboard')
    }
  }, [user, isLoading, router])

  const {
    register,
    handleSubmit,
    setError,
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
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
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
                <Link href="#" className="text-xs font-semibold" style={{ color: 'var(--brand-primary-light)' }}>
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  {...register('password')}
                  className="w-full rounded-xl border px-4 py-3 pr-11 text-sm outline-none"
                  style={{
                    background: '#f0edec',
                    borderColor: errors.password ? '#f04438' : 'rgba(123,116,135,0.20)',
                    color: 'var(--text-strong)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
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
              Join now
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

