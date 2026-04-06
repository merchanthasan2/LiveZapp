'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Zap, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { ref, set } from 'firebase/database'
import { auth, rtdb } from '@/lib/firebase'
import BrandLockup from '@/components/BrandLockup'
import { ADMIN_EMAILS, SUPERADMIN_EMAILS } from '@/lib/auth/allowlist'
import type { Role } from '@/types/auth'
import { isAdminRole } from '@/types/auth'
import type { PlanId } from '@/types/plans'

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
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

const inputClass = (hasError: boolean) =>
  `w-full px-4 py-3 rounded-2xl text-sm text-[#1f1830] placeholder:text-[#9d93b1] outline-none transition-all ${
    hasError
      ? 'border-2 border-rose-300 bg-rose-50/90 focus:border-rose-400 focus:ring-4 focus:ring-rose-100'
      : 'border border-[#eadff7] bg-white/95 focus:border-[#650cd9] focus:ring-4 focus:ring-violet-100'
  }`

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState('')
  const [promoCode, setPromoCode] = useState<string | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    const code = searchParams.get('promo')
    if (code) {
      validatePromo(code)
    }
  }, [searchParams])

  const validatePromo = async (code: string) => {
    try {
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setPromoCode(code.trim().toUpperCase())
        setPromoError(null)
      } else {
        setPromoError(data.error || 'Invalid promo code')
        setPromoCode(null)
      }
    } catch {
      setPromoError('Failed to validate promo code')
      setPromoCode(null)
    }
  }

  const onSubmit = async (data: FormValues) => {
    setServerError('')
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password,
      )
      await updateProfile(firebaseUser, { displayName: data.name })
      const emailLower = data.email.toLowerCase()
      const role: Role = SUPERADMIN_EMAILS.has(emailLower)
        ? 'superadmin'
        : ADMIN_EMAILS.has(emailLower)
          ? 'admin'
          : 'user'

      let planId: PlanId = isAdminRole(role) ? 'pro' : 'free'
      let planExpiresAt: string | undefined

      if (promoCode) {
        try {
          const idToken = await firebaseUser.getIdToken()
          const redeemResponse = await fetch('/api/promo/redeem', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              code: promoCode,
              userId: firebaseUser.uid,
            }),
          })

          if (redeemResponse.ok) {
            const redeemData = await redeemResponse.json()
            if (redeemData.promo?.targetPlanId) {
              planId = redeemData.promo.targetPlanId
              if (redeemData.promo.durationMonths) {
                const expiryDate = new Date()
                expiryDate.setMonth(expiryDate.getMonth() + redeemData.promo.durationMonths)
                planExpiresAt = expiryDate.toISOString()
              }
            }
          }
        } catch (err) {
          console.error('Failed to redeem promo code:', err)
        }
      }

      const userPayload: {
        id: string
        email: string
        name: string
        role: Role
        planId: PlanId
        planExpiresAt?: string
      } = {
        id: firebaseUser.uid,
        email: data.email,
        name: data.name,
        role,
        planId,
      }

      if (planExpiresAt) {
        userPayload.planExpiresAt = planExpiresAt
      }

      await set(ref(rtdb, `users/${firebaseUser.uid}`), userPayload)
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
      <div className="min-h-screen flex items-center justify-center py-16 px-4" style={{ background: 'linear-gradient(180deg, #fcfaf7 0%, #f5eefc 100%)' }}>
        <div className="p-12 max-w-md w-full text-center space-y-5 rounded-[2rem] border" style={{ background: 'rgba(255,255,255,0.92)', borderColor: '#eadff7', boxShadow: '0 30px 80px rgba(101,12,217,0.10)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(101,12,217,0.10)' }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: '#650cd9' }} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: '#181324' }}>Account created!</h2>
          <p className="text-sm" style={{ color: '#6d667b' }}>
            Welcome to LiveZapp. Redirecting to your Zapp dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4" style={{ background: 'linear-gradient(180deg, #fcfaf7 0%, #f5eefc 100%)' }}>
      <div className="w-full max-w-md relative">
        <div className="p-8 sm:p-10 rounded-[2rem] border" style={{ background: 'rgba(255,255,255,0.92)', borderColor: '#eadff7', boxShadow: '0 30px 80px rgba(101,12,217,0.10)' }}>
          <div className="flex flex-col items-center mb-8 text-center">
            <BrandLockup href="/" size="md" theme="light" variant="wordmark" />
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mt-5"
              style={{
                background: 'linear-gradient(135deg, #650cd9, #8f63ff)',
                boxShadow: '0 16px 34px rgba(101,12,217,0.22)',
              }}
            >
              <Zap className="w-6 h-6" style={{ color: '#ffffff' }} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: '#8f78ba' }}>Create Your Account</p>
            <h1 className="text-3xl font-black mt-3" style={{ color: '#181324' }}>Start your first Zapp</h1>
            <p className="text-sm mt-2 max-w-xs" style={{ color: '#6d667b' }}>Build live quizzes, polls, and word clouds with the new LiveZapp design system.</p>
          </div>

          {serverError && (
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm mb-5"
              style={{ background: '#fff3f5', border: '1px solid #fecdd3', color: '#e11d48' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {serverError}
            </div>
          )}

          {promoCode && (
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm mb-5"
              style={{ background: '#f3efff', border: '1px solid #dacbff', color: '#5b21b6' }}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              Promo code <strong>{promoCode}</strong> applied. Your participant offer is ready.
            </div>
          )}

          {promoError && (
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm mb-5"
              style={{ background: '#fff3f5', border: '1px solid #fecdd3', color: '#e11d48' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {promoError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium mb-1.5" style={{ color: '#564d67' }}>
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
              {errors.name && <p className="mt-1.5 text-xs" style={{ color: '#e11d48' }}>{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium mb-1.5" style={{ color: '#564d67' }}>
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
              {errors.email && <p className="mt-1.5 text-xs" style={{ color: '#e11d48' }}>{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium mb-1.5" style={{ color: '#564d67' }}>
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
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#8f87a2' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs" style={{ color: '#e11d48' }}>{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium mb-1.5" style={{ color: '#564d67' }}>
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
                <p className="mt-1.5 text-xs" style={{ color: '#e11d48' }}>{errors.confirmPassword.message}</p>
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
                  Creating account...
                </>
              ) : (
                <>Create account <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: '#8f87a2' }}>
            By creating an account you agree to our{' '}
            <Link href="/terms" className="font-semibold transition-colors" style={{ color: '#650cd9' }}>Terms</Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-semibold transition-colors" style={{ color: '#650cd9' }}>Privacy Policy</Link>.
          </p>

          <p className="text-center text-sm mt-4" style={{ color: '#6d667b' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold transition-colors" style={{ color: '#650cd9' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center py-16 px-4" style={{ background: 'linear-gradient(180deg, #fcfaf7 0%, #f5eefc 100%)' }}>
          <div className="p-8 text-sm rounded-[1.75rem] border" style={{ background: 'rgba(255,255,255,0.92)', borderColor: '#eadff7', color: '#6d667b' }}>Loading...</div>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  )
}
