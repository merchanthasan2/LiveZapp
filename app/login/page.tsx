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

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="glass-card p-8 sm:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-btn-primary mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
            <p className="text-sm text-text-secondary mt-1">Sign in to your LiveZapp account</p>
          </div>

          {/* Form-level error */}
          {(authError || errors.root) && (
            <div className="mb-5 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-600" role="alert">
              {authError || errors.root?.message}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-text-primary mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email')}
                className={`w-full px-4 py-3 rounded-2xl bg-white/70 border text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary/60 ${
                  errors.email ? 'border-red-300 bg-red-50/30' : 'border-white/60'
                }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500" role="alert">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="login-password" className="text-sm font-medium text-text-primary">
                  Password
                </label>
                <Link href="#" className="text-xs text-primary hover:underline">
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
                  className={`w-full px-4 py-3 pr-11 rounded-2xl bg-white/70 border text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition-all focus:ring-2 focus:ring-primary/30 focus:border-primary/60 ${
                    errors.password ? 'border-red-300 bg-red-50/30' : 'border-white/60'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500" role="alert">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-7">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              Get started free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
