'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Zap, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { ref, set } from 'firebase/database'
import { auth, rtdb } from '@/lib/firebase'

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

const inputClass = (hasError: boolean) =>
  `w-full px-4 py-3 rounded-2xl text-sm text-white placeholder:text-white/25 outline-none transition-all ${
    hasError
      ? 'border-2 border-red-500/50 bg-red-500/05'
      : 'border border-white/10 bg-white/05 focus:border-primary/50 focus:ring-2 focus:ring-primary/15'
  }`

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setServerError('')
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password,
      )
      await updateProfile(firebaseUser, { displayName: data.name })
      const isAdmin = ['happy143@gmail.com'].includes(data.email.toLowerCase())
      await set(ref(rtdb, `users/${firebaseUser.uid}`), {
        id: firebaseUser.uid,
        email: data.email,
        name: data.name,
        role: isAdmin ? 'admin' : 'user',
        planId: isAdmin ? 'pro' : 'free',
      })
      setDone(true)
      setTimeout(() => router.push('/app/dashboard'), 1500)
    } catch (err: any) {
      const code: string = err?.code ?? ''
      if (code === 'auth/email-already-in-use') {
        setServerError('An account with this email already exists. Try signing in instead.')
      } else if (code === 'auth/weak-password') {
        setServerError('Password is too weak. Please choose a stronger one.')
      } else {
        setServerError(err.message?.replace('Firebase: ', '') || 'Registration failed. Please try again.')
      }
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16 px-4">
        <div className="glass-card p-12 max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-secondary" />
          </div>
          <h2 className="text-2xl font-bold text-white">Account created!</h2>
          <p className="text-white/50 text-sm">
            Welcome to LiveZapp. Redirecting to your dashboard…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md relative">
        <div className="glass-card p-8 sm:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: 'linear-gradient(135deg, #5478FF, #53CBF3)',
                boxShadow: '0 0 24px rgba(84,120,255,0.45)',
              }}
            >
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="text-sm text-white/40 mt-1">Start free — no credit card required</p>
          </div>

          {serverError && (
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm mb-5"
              style={{ background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.25)', color: '#FB7185' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Name */}
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-white/60 mb-1.5">
                Full name
              </label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                {...register('name')}
                className={inputClass(!!errors.name)}
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-white/60 mb-1.5">
                Email address
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email')}
                className={inputClass(!!errors.email)}
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-white/60 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  {...register('password')}
                  className={inputClass(!!errors.password)}
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-white/60 mb-1.5">
                Confirm password
              </label>
              <input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                {...register('confirmPassword')}
                className={inputClass(!!errors.confirmPassword)}
              />
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword.message}</p>
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
                  Creating account…
                </>
              ) : (
                <>Create account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-white/30 mt-6">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="text-primary/70 hover:text-primary transition-colors">Terms</Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-primary/70 hover:text-primary transition-colors">Privacy Policy</Link>.
          </p>

          <p className="text-center text-sm text-white/35 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
