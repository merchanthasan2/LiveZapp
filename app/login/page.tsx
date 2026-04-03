'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Zap, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const { user, isAdmin, isLoading, error: authError, login } = useAuth()

  useEffect(() => {
    if (!isLoading && user) {
      router.push(isAdmin ? '/admin' : '/app/dashboard')
    }
  }, [user, isAdmin, isLoading, router])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    try {
      const ok = await login(data.email, data.password)
      // The specific error is now held in the useAuth hook, which we map to the root form error 
      // down below, or we just trust authError to render. But to stop isSubmitting spin:
      if (!ok) {
        // useAuth explicitly sets error state when success is false, which hooks up to our UI above
        setError('root', { message: 'Authentication failed.' })
        return
      }
      // On success, the `useEffect` at the top of the component handles the redirect automatically
      // based on the `user.role` from the state payload.
    } catch (err: any) {
      console.error('CRITICAL LOGIN EXCEPTION:', err)
      setError('root', { message: err?.message || 'A critical error occurred. Check browser console.' })
    }
  }

  const inputStyle = (hasError: boolean) => ({
    width: '100%', padding: '0.75rem 1rem', borderRadius: '1rem',
    background: hasError ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)',
    border: `1.5px solid ${hasError ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.12)'}`,
    color: '#FFFFFF', fontSize: '0.875rem', outline: 'none',
  })

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4" style={{ background: '#000814' }}>
      {/* Background glows */}
      <div className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,195,0,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(30,150,252,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      <div className="w-full max-w-md relative">
        <div className="p-8 sm:p-10 rounded-3xl" style={{ background: '#001d3d', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px rgba(0,0,0,0.50)' }}>
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #ffc300, #ffd60a)', boxShadow: '0 4px 16px rgba(255,195,0,0.40)' }}
            >
              <Zap className="w-6 h-6" style={{ color: '#000814' }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Welcome back</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Sign in to your LiveZapp account</p>
          </div>

          {/* Form-level error */}
          {(authError || errors.root) && (
            <div className="mb-5 px-4 py-3 rounded-2xl text-sm" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171' }} role="alert">
              {authError || errors.root?.message}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email')}
                style={inputStyle(!!errors.email)}
                onFocus={e => { e.currentTarget.style.borderColor = '#ffc300'; e.currentTarget.style.background = 'rgba(255,195,0,0.06)' }}
                onBlur={e => { e.currentTarget.style.borderColor = errors.email ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = errors.email ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)' }}
              />
              {errors.email && <p className="mt-1.5 text-xs" style={{ color: '#F87171' }} role="alert">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="login-password" className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Password
                </label>
                <Link href="#" className="text-xs font-semibold transition-colors" style={{ color: '#ffc300' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ffd60a' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#ffc300' }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  {...register('password')}
                  style={{ ...inputStyle(!!errors.password), paddingRight: '2.75rem' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#ffc300'; e.currentTarget.style.background = 'rgba(255,195,0,0.06)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = errors.password ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = errors.password ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs" style={{ color: '#F87171' }} role="alert">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,8,20,0.25)', borderTopColor: '#000814' }} />
                  Signing in…
                </>
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-7" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold transition-colors" style={{ color: '#ffc300' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ffd60a' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#ffc300' }}
            >
              Get started free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
