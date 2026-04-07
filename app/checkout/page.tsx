'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  PayPalScriptProvider, PayPalButtons,
  type ReactPayPalScriptOptions,
} from '@paypal/react-paypal-js'
import {
  ArrowLeft, Check, Shield, AlertTriangle, Loader2,
  CheckCircle, RefreshCw, Info, ChevronDown, ChevronUp,
} from 'lucide-react'
import { ref, update, get } from 'firebase/database'
import { auth, rtdb } from '@/lib/firebase'
import { useAuth } from '@/lib/hooks/useAuth'
import { useCurrency } from '@/lib/hooks/useCurrency'
import { AdminConfigService } from '@/lib/services/AdminConfigService'
import { PLANS, annualSavingPercent } from '@/types/plans'
import type { PlanId } from '@/types/plans'

// ─── PayPal script options ─────────────────────────────────────────────────
const PAYPAL_OPTS: ReactPayPalScriptOptions = {
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
  currency: 'USD',
  intent: 'capture',
}

// ─── Profile field ──────────────────────────────────────────────────────────
interface ProfileData {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
}

// ─── Input styling ──────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(84,120,255,0.18)',
  borderRadius: 10,
  color: '#fff',
  width: '100%',
  padding: '11px 14px',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

function InputField({
  label, id, required, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      <input
        id={id}
        required={required}
        style={{
          ...inputStyle,
          borderColor: focused ? 'rgba(84,120,255,0.50)' : 'rgba(84,120,255,0.18)',
          boxShadow: focused ? '0 0 0 3px rgba(84,120,255,0.10)' : 'none',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </div>
  )
}

// ─── Main checkout component ────────────────────────────────────────────────
function CheckoutContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { formatPrice, currency } = useCurrency()

  const rawPlanId = params.get('plan') as PlanId | null
  const rawBilling = params.get('billing') as 'monthly' | 'annual' | null

  const [planId, setPlanId] = useState<PlanId>(rawPlanId ?? 'basic')
  const [billing, setBilling] = useState<'monthly' | 'annual'>(rawBilling ?? 'monthly')
  const [recurringAck, setRecurringAck] = useState(false)

  const plan = PLANS.find(p => p.id === planId) ?? PLANS[1]
  const amount = billing === 'annual' ? plan.pricePerYear : plan.pricePerMonth

  // Profile state — pre-filled from auth
  const [profile, setProfile] = useState<ProfileData>({
    fullName: '', email: '', phone: '',
    dateOfBirth: '', addressLine1: '', addressLine2: '',
    city: '', state: '', postalCode: '', country: '',
  })
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof ProfileData, string>>>({})
  const [addressOpen, setAddressOpen] = useState(false)

  // Payment status
  const [payStatus, setPayStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [payError, setPayError] = useState('')
  const [profileComplete, setProfileComplete] = useState(false)
  const [requiresAddressConfirmation, setRequiresAddressConfirmation] = useState(false)
  const [addressConfirmedThisSession, setAddressConfirmedThisSession] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(`/checkout?plan=${planId}&billing=${billing}`)}`)
    }
  }, [authLoading, user, router, planId, billing])

  // Pre-fill profile from user + RTDB
  useEffect(() => {
    if (!user) return
    const fetchProfile = async () => {
      const [snap, userSnap, adminConfig] = await Promise.all([
        get(ref(rtdb, `users/${user.id}/profile`)),
        get(ref(rtdb, `users/${user.id}`)),
        AdminConfigService.getConfig().catch(() => null),
      ])

      const saved = snap.exists() ? snap.val() : {}
      const userRoot = userSnap.exists() ? userSnap.val() : {}
      const requiresGlobalConfirm = !!adminConfig?.checkoutPolicy?.requireAddressConfirmationOnPurchase
      const requiresUserConfirm = !!userRoot?.requireAddressConfirmationOnPurchase
      const requiresConfirm = requiresGlobalConfirm || requiresUserConfirm

      setRequiresAddressConfirmation(requiresConfirm)
      setAddressConfirmedThisSession(!requiresConfirm)

      setProfile(prev => ({
        ...prev,
        fullName: saved.fullName || user.name || '',
        email: saved.email || user.email || '',
        phone: saved.phone || '',
        dateOfBirth: saved.dateOfBirth || '',
        addressLine1: saved.addressLine1 || '',
        addressLine2: saved.addressLine2 || '',
        city: saved.city || '',
        state: saved.state || '',
        postalCode: saved.postalCode || '',
        country: saved.country || '',
      }))

      const hasRequiredProfile = !!(saved.fullName && saved.phone && saved.addressLine1 && saved.city)
      setProfileComplete(hasRequiredProfile)
      setProfileSaved(hasRequiredProfile && !requiresConfirm)
    }
    fetchProfile()
  }, [user])

  const setProfileField = (key: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [key]: value }))
    if (profileErrors[key]) setProfileErrors(prev => ({ ...prev, [key]: undefined }))
    if (profileSaved) setProfileSaved(false)
    if (addressConfirmedThisSession) setAddressConfirmedThisSession(false)
  }

  const validateProfile = (): boolean => {
    const errs: Partial<Record<keyof ProfileData, string>> = {}
    if (!profile.fullName.trim()) errs.fullName = 'Full name is required'
    if (!profile.email.trim() || !/\S+@\S+\.\S+/.test(profile.email)) errs.email = 'Valid email required'
    if (!profile.phone.trim()) errs.phone = 'Phone number is required'
    if (!profile.addressLine1.trim()) errs.addressLine1 = 'Address is required'
    if (!profile.city.trim()) errs.city = 'City is required'
    if (!profile.country.trim()) errs.country = 'Country is required'
    setProfileErrors(errs)
    return Object.keys(errs).length === 0
  }

  const saveProfile = async () => {
    if (!validateProfile() || !user) return
    const confirmedAt = new Date().toISOString()
    await update(ref(rtdb, `users/${user.id}/profile`), profile)
    await update(ref(rtdb, `users/${user.id}`), {
      lastAddressConfirmationAt: confirmedAt,
    })
    setProfileSaved(true)
    setProfileComplete(true)
    setAddressConfirmedThisSession(true)
  }

  // ── PayPal callbacks ──────────────────────────────────────────────────────
  const createOrder = useCallback(async () => {
    const idToken = await auth.currentUser?.getIdToken()
    if (!idToken) {
      throw new Error('Your session expired. Please sign in again.')
    }

    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ planId, billingCycle: billing }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to create order')
    return data.orderId as string
  }, [planId, billing])

  const onApprove = useCallback(async (data: { orderID: string }) => {
    setPayStatus('processing')
    try {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) {
        throw new Error('Your session expired. Please sign in again.')
      }

      const res = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ orderId: data.orderID, planId, billingCycle: billing }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || 'Payment verification failed')

      setPayStatus('success')
      setTimeout(() => router.push('/app/dashboard'), 3000)
    } catch (err: any) {
      setPayError(err.message || 'Payment failed. Please contact support.')
      setPayStatus('error')
    }
  }, [planId, billing, router])

  const onPayPalError = useCallback((err: Record<string, unknown>) => {
    console.error('[PayPal]', err)
    setPayError('PayPal encountered an error. Please try again or use a different payment method.')
    setPayStatus('error')
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0E1A' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#5478FF' }} />
      </div>
    )
  }

  if (!user) return null

  // ── Success screen ──────────────────────────────────────────────────────
  if (payStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0A0E1A' }}>
        <div
          className="text-center max-w-md mx-auto p-12 rounded-3xl"
          style={{ background: 'rgba(17,31,162,0.12)', border: '1px solid rgba(84,120,255,0.20)' }}
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(34,197,94,0.15)' }}>
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">You're on {plan.name}!</h1>
          <p className="text-white/50 text-sm mb-6">
            Payment confirmed. Your {billing} plan is now active.
            {billing === 'monthly' && ' You\u2019ll be charged monthly \u2014 cancel anytime from Settings.'}
          </p>
          <p className="text-xs text-white/25">Redirecting to dashboard…</p>
        </div>
      </div>
    )
  }

  const addressConfirmationDone = !requiresAddressConfirmation || addressConfirmedThisSession
  const canPay = profileComplete && addressConfirmationDone && (billing === 'annual' || recurringAck)

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#0A0E1A' }}>
      <div className="max-w-5xl mx-auto">

        {/* Back */}
        <Link
          href="/plans"
          className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-white/70 transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Plans
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── LEFT: Plan selection + profile ── */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Checkout</p>
              <h1 className="text-3xl font-bold text-white">Complete your purchase</h1>
            </div>

            {/* ── Plan selector ── */}
            <div
              className="rounded-2xl p-6"
              style={{ background: 'rgba(17,31,162,0.12)', border: '1px solid rgba(84,120,255,0.18)' }}
            >
              <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">Select Plan</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                {PLANS.filter(p => p.pricePerMonth > 0).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPlanId(p.id)}
                    className="flex flex-col items-center py-3 px-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: planId === p.id ? 'rgba(84,120,255,0.18)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${planId === p.id ? 'rgba(84,120,255,0.55)' : 'rgba(255,255,255,0.08)'}`,
                      color: planId === p.id ? '#fff' : 'rgba(255,255,255,0.45)',
                    }}
                  >
                    <span className="font-bold">{p.name}</span>
                    <span className="text-xs mt-0.5" style={{ color: planId === p.id ? '#53CBF3' : 'rgba(255,255,255,0.25)' }}>
                      {formatPrice(p.pricePerMonth)}/mo
                    </span>
                  </button>
                ))}
              </div>

              {/* Billing cycle toggle */}
              <div>
                <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Billing Cycle</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(['monthly', 'annual'] as const).map(cycle => {
                    const isAnn = cycle === 'annual'
                    const price = isAnn ? plan.pricePerYear : plan.pricePerMonth
                    return (
                      <button
                        key={cycle}
                        onClick={() => setBilling(cycle)}
                        className="flex flex-col items-start p-4 rounded-xl text-left transition-all"
                        style={{
                          background: billing === cycle ? 'rgba(84,120,255,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${billing === cycle ? 'rgba(84,120,255,0.45)' : 'rgba(255,255,255,0.07)'}`,
                        }}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-sm font-bold text-white capitalize">{cycle}</span>
                          {isAnn && (
                            <span
                              className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(255,222,66,0.15)', color: '#FFDE42' }}
                            >
                              Save {annualSavingPercent(plan)}%
                            </span>
                          )}
                        </div>
                        <span className="text-xl font-bold" style={{ color: billing === cycle ? '#5478FF' : 'rgba(255,255,255,0.50)' }}>
                          {formatPrice(price)}
                        </span>
                        <span className="text-xs text-white/30">{isAnn ? 'per year' : 'per month'}</span>
                        {isAnn && (
                          <span className="text-xs mt-1" style={{ color: 'rgba(255,222,66,0.70)' }}>
                            vs {formatPrice(plan.pricePerMonth * 12)} monthly
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── Profile form ── */}
            <div
              className="rounded-2xl p-6"
              style={{ background: 'rgba(17,31,162,0.12)', border: '1px solid rgba(84,120,255,0.18)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider">
                  Your Details
                </h2>
                {profileComplete && (
                  <span className="flex items-center gap-1.5 text-xs text-green-400">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Full Name" id="fullName" required
                    placeholder="John Smith"
                    value={profile.fullName}
                    onChange={e => setProfileField('fullName', e.target.value)}
                  />
                  <InputField
                    label="Email" id="email" type="email" required
                    placeholder="you@example.com"
                    value={profile.email}
                    onChange={e => setProfileField('email', e.target.value)}
                  />
                </div>
                {(profileErrors.fullName || profileErrors.email) && (
                  <p className="text-xs text-red-400">{profileErrors.fullName || profileErrors.email}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Phone Number" id="phone" type="tel" required
                    placeholder="+1 555 000 0000"
                    value={profile.phone}
                    onChange={e => setProfileField('phone', e.target.value)}
                  />
                  <InputField
                    label="Date of Birth" id="dob" type="date"
                    value={profile.dateOfBirth}
                    onChange={e => setProfileField('dateOfBirth', e.target.value)}
                  />
                </div>
                {profileErrors.phone && <p className="text-xs text-red-400">{profileErrors.phone}</p>}

                {/* Address section — collapsible */}
                <div>
                  <button
                    type="button"
                    onClick={() => setAddressOpen(v => !v)}
                    className="flex items-center gap-2 text-xs font-semibold text-white/50 uppercase tracking-wider hover:text-white/70 transition-colors"
                  >
                    Billing Address
                    {addressOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {!profile.addressLine1 && (
                      <span className="text-primary ml-1">* required</span>
                    )}
                  </button>

                  {addressOpen && (
                    <div className="space-y-3 mt-3">
                      <InputField
                        label="Address Line 1" id="addr1" required
                        placeholder="123 Main Street"
                        value={profile.addressLine1}
                        onChange={e => setProfileField('addressLine1', e.target.value)}
                      />
                      <InputField
                        label="Address Line 2" id="addr2"
                        placeholder="Apt, suite, floor (optional)"
                        value={profile.addressLine2}
                        onChange={e => setProfileField('addressLine2', e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <InputField
                          label="City" id="city" required
                          placeholder="Mumbai"
                          value={profile.city}
                          onChange={e => setProfileField('city', e.target.value)}
                        />
                        <InputField
                          label="State / Province" id="state"
                          placeholder="Maharashtra"
                          value={profile.state}
                          onChange={e => setProfileField('state', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField
                          label="Postal Code" id="postal"
                          placeholder="400001"
                          value={profile.postalCode}
                          onChange={e => setProfileField('postalCode', e.target.value)}
                        />
                        <InputField
                          label="Country" id="country" required
                          placeholder="India"
                          value={profile.country}
                          onChange={e => setProfileField('country', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  {(profileErrors.addressLine1 || profileErrors.city || profileErrors.country) && (
                    <p className="text-xs text-red-400 mt-1">
                      Please expand billing address and fill required fields
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={saveProfile}
                  className="btn-primary text-sm w-full justify-center"
                >
                  {profileSaved ? (
                    <><Check className="w-4 h-4" /> Details Saved</>
                  ) : 'Save Details & Continue'}
                </button>
                {requiresAddressConfirmation && !addressConfirmedThisSession && (
                  <p className="text-xs text-yellow-300">
                    Address confirmation required: save your details once in this checkout session before payment.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Order summary + payment ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Order summary */}
            <div
              className="rounded-2xl p-6"
              style={{ background: 'rgba(17,31,162,0.12)', border: '1px solid rgba(84,120,255,0.18)' }}
            >
              <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-5">Order Summary</h2>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-white">LiveZapp {plan.name}</p>
                  <p className="text-xs text-white/40 capitalize">{billing} billing</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">{formatPrice(amount)}</p>
                  {currency !== 'USD' && (
                    <p className="text-[10px] text-white/25">≈ ${amount} USD</p>
                  )}
                </div>
              </div>

              {billing === 'annual' && (
                <div
                  className="flex items-center justify-between py-3 px-3 rounded-xl mb-4"
                  style={{ background: 'rgba(255,222,66,0.06)', border: '1px solid rgba(255,222,66,0.15)' }}
                >
                  <span className="text-xs" style={{ color: '#FFDE42' }}>Annual saving</span>
                  <span className="text-xs font-bold" style={{ color: '#FFDE42' }}>
                    −{formatPrice(plan.pricePerMonth * 12 - plan.pricePerYear)} ({annualSavingPercent(plan)}% off)
                  </span>
                </div>
              )}

              {/* Limits recap */}
              <div
                className="space-y-2 py-4 border-t"
                style={{ borderColor: 'rgba(84,120,255,0.12)' }}
              >
                {[
                  [`Sessions (monthly)`, plan.limits.maxPresentations === 'unlimited' ? 'Unlimited' : `${plan.limits.maxPresentations}`],
                  [`Max participants`, plan.limits.maxParticipantsPerSession.toLocaleString()],
                  [`Questions / session`, `${plan.limits.maxQuestionsPerPresentation}`],
                  [`Live at once`, `${plan.limits.maxActiveSessions}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-white/40">{label}</span>
                    <span className="text-white/70 font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              <div
                className="flex items-center justify-between py-3 border-t font-bold text-base"
                style={{ borderColor: 'rgba(84,120,255,0.12)' }}
              >
                <span className="text-white">Total today</span>
                <span className="text-white">{formatPrice(amount)}</span>
              </div>
            </div>

            {/* Recurring charge ack (monthly only) */}
            {billing === 'monthly' && (
              <label
                className="flex items-start gap-3 p-4 rounded-xl cursor-pointer"
                style={{
                  background: recurringAck ? 'rgba(84,120,255,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${recurringAck ? 'rgba(84,120,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={recurringAck}
                  onChange={e => setRecurringAck(e.target.checked)}
                />
                <span className="text-xs text-white/60 leading-relaxed">
                  I understand that <strong className="text-white/80">{formatPrice(plan.pricePerMonth)}/month</strong> will
                  be charged to my PayPal account each month. I can cancel anytime from{' '}
                  <strong className="text-white/80">Settings → Subscription</strong>.
                </span>
              </label>
            )}

            {/* Annual info note */}
            {billing === 'annual' && (
              <div
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: 'rgba(83,203,243,0.06)', border: '1px solid rgba(83,203,243,0.15)' }}
              >
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-secondary" />
                <p className="text-xs text-white/50 leading-relaxed">
                  You're paying for 12 months upfront. No recurring charge — your plan stays active
                  for one full year from today.
                </p>
              </div>
            )}

            {/* Profile incomplete warning */}
            {!profileComplete && (
              <div
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.18)' }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <p className="text-xs" style={{ color: '#fb7185' }}>
                  Please save your details above before paying.
                </p>
              </div>
            )}

            {!addressConfirmationDone && (
              <div
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: 'rgba(250,204,21,0.10)', border: '1px solid rgba(250,204,21,0.22)' }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#FACC15' }} />
                <p className="text-xs" style={{ color: '#FDE68A' }}>
                  Your account requires address re-confirmation for purchases. Save details above to continue.
                </p>
              </div>
            )}

            {/* Error */}
            {payStatus === 'error' && (
              <div
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.18)' }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <p className="text-xs" style={{ color: '#fb7185' }}>{payError}</p>
              </div>
            )}

            {/* Processing */}
            {payStatus === 'processing' && (
              <div className="flex items-center justify-center gap-3 py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-sm text-white/50">Verifying payment…</span>
              </div>
            )}

            {/* PayPal button */}
            {(payStatus === 'idle' || payStatus === 'error') && (
              <div className={canPay ? '' : 'opacity-40 pointer-events-none'}>
                <PayPalScriptProvider options={PAYPAL_OPTS}>
                  <PayPalButtons
                    style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' }}
                    createOrder={createOrder}
                    onApprove={onApprove}
                    onError={onPayPalError}
                    disabled={!canPay}
                  />
                </PayPalScriptProvider>
                {!canPay && (
                  <p className="text-center text-xs text-white/30 mt-2">
                    {!profileComplete
                      ? 'Complete your details above to unlock payment'
                      : !addressConfirmationDone
                        ? 'Save your details to confirm billing address before payment'
                        : 'Please confirm the recurring charge above'}
                  </p>
                )}
              </div>
            )}

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-white/25">
                <Shield className="w-3.5 h-3.5" /> Secured by PayPal
              </div>
              <div className="text-xs text-white/25">·</div>
              <div className="text-xs text-white/25">Cancel anytime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Wrap in Suspense for useSearchParams
export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#5478FF' }} />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
