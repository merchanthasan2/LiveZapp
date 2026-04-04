'use client'

import { useEffect, useMemo, useState } from 'react'
import { ref, get, set } from 'firebase/database'
import {
  BadgeDollarSign,
  Check,
  FileStack,
  Globe2,
  Info,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
  X,
} from 'lucide-react'
import { rtdb } from '@/lib/firebase'
import { PLANS, type Plan, type PlanId, type PlanLimits } from '@/types/plans'
import { invalidatePlanLimitsCache } from '@/lib/hooks/usePlanLimits'
import { type PricingConfig, type SupportedCurrency, invalidatePricingCache } from '@/lib/hooks/useCurrency'

interface PlanStats {
  planId: PlanId
  totalUsers: number
  activeUsers: number
  monthlyUsers: number
  annualUsers: number
  mrr: number
}

type LimitOverrides = Partial<Record<PlanId, Partial<PlanLimits>>>
type PaidPlanId = Exclude<PlanId, 'free'>

interface PricingMeta {
  annualDiscountPercent: number
  exchangeRates: Record<SupportedCurrency, number>
}

type BaseUsdMonthly = Record<PaidPlanId, number>

const PAID_PLAN_IDS: PaidPlanId[] = ['basic', 'regular', 'pro']
const DEFAULT_PRICING_META: PricingMeta = {
  annualDiscountPercent: 25,
  exchangeRates: { USD: 1, GBP: 0.79, INR: 84 },
}

const PLAN_BADGE: Record<PlanId, { bg: string; text: string; border: string }> = {
  free: { bg: 'rgba(191,168,255,0.16)', text: '#bda6ff', border: 'rgba(191,168,255,0.18)' },
  basic: { bg: 'rgba(83,216,209,0.12)', text: '#53d8d1', border: 'rgba(83,216,209,0.18)' },
  regular: { bg: 'rgba(255,177,159,0.14)', text: '#ffb19f', border: 'rgba(255,177,159,0.18)' },
  pro: { bg: 'rgba(141,115,255,0.14)', text: '#c7b5ff', border: 'rgba(141,115,255,0.18)' },
}

const CURRENCY_META: Array<{ code: SupportedCurrency; label: string }> = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'INR', label: 'Indian Rupee' },
]

function fmtCurrency(amount: number, currency: SupportedCurrency = 'USD') {
  if (amount === 0) return 'Free'

  const locale = currency === 'INR' ? 'en-IN' : currency === 'GBP' ? 'en-GB' : 'en-US'
  const hasDecimals = Math.abs(amount % 1) > 0.0001

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function isActive(user: any): boolean {
  if (user.planId === 'free') return false
  if (user.planCancelledAt && !user.planExpiresAt) return false
  if (user.planCancelledAt && user.planExpiresAt) return new Date(user.planExpiresAt) > new Date()
  if (user.planExpiresAt) return new Date(user.planExpiresAt) > new Date()
  return false
}

function displayLimit(value: number | 'unlimited' | undefined, fallback: number | 'unlimited') {
  const nextValue = value ?? fallback
  return nextValue === 'unlimited' ? 'Unlimited' : String(nextValue)
}

function getDefaultBaseMonthly(): BaseUsdMonthly {
  return {
    basic: PLANS.find(plan => plan.id === 'basic')?.pricePerMonth ?? 9,
    regular: PLANS.find(plan => plan.id === 'regular')?.pricePerMonth ?? 29,
    pro: PLANS.find(plan => plan.id === 'pro')?.pricePerMonth ?? 79,
  }
}

function clampDiscount(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_PRICING_META.annualDiscountPercent
  return Math.max(0, Math.min(95, value))
}

function normalizeRate(value: number, fallback: number) {
  if (!Number.isFinite(value) || value <= 0) return fallback
  return value
}

function roundForCurrency(amount: number, currency: SupportedCurrency) {
  if (currency === 'GBP') return Number(amount.toFixed(2))
  return Math.round(amount)
}

function deriveAnnualList(monthly: number) {
  return Number((monthly * 12).toFixed(2))
}

function deriveAnnualBilled(monthly: number, discountPercent: number) {
  const annualList = deriveAnnualList(monthly)
  return Number((annualList * (1 - discountPercent / 100)).toFixed(2))
}

function seedBaseMonthly(pricing?: PricingConfig): BaseUsdMonthly {
  const defaults = getDefaultBaseMonthly()
  return {
    basic: pricing?.USD?.basic?.monthly ?? defaults.basic,
    regular: pricing?.USD?.regular?.monthly ?? defaults.regular,
    pro: pricing?.USD?.pro?.monthly ?? defaults.pro,
  }
}

function buildPricingConfig(baseUsdMonthly: BaseUsdMonthly, pricingMeta: PricingMeta): PricingConfig {
  const nextConfig: PricingConfig = {
    USD: { free: { monthly: 0, annual: 0 } },
    GBP: { free: { monthly: 0, annual: 0 } },
    INR: { free: { monthly: 0, annual: 0 } },
  }

  for (const currency of ['USD', 'GBP', 'INR'] as SupportedCurrency[]) {
    const rate = pricingMeta.exchangeRates[currency]

    for (const planId of PAID_PLAN_IDS) {
      const usdMonthly = baseUsdMonthly[planId]
      const localMonthly = roundForCurrency(usdMonthly * rate, currency)
      const localAnnual = roundForCurrency(deriveAnnualBilled(usdMonthly * rate, pricingMeta.annualDiscountPercent), currency)

      nextConfig[currency] = {
        ...(nextConfig[currency] ?? {}),
        [planId]: { monthly: localMonthly, annual: localAnnual },
      }
    }
  }

  return nextConfig
}

function mergePricingMeta(raw: any): PricingMeta {
  return {
    annualDiscountPercent: clampDiscount(Number(raw?.annualDiscountPercent ?? DEFAULT_PRICING_META.annualDiscountPercent)),
    exchangeRates: {
      USD: 1,
      GBP: normalizeRate(Number(raw?.exchangeRates?.GBP ?? DEFAULT_PRICING_META.exchangeRates.GBP), DEFAULT_PRICING_META.exchangeRates.GBP),
      INR: normalizeRate(Number(raw?.exchangeRates?.INR ?? DEFAULT_PRICING_META.exchangeRates.INR), DEFAULT_PRICING_META.exchangeRates.INR),
    },
  }
}

function EditLimitsPanel({
  plan,
  override,
  onSave,
  onReset,
  onCancel,
}: {
  plan: Plan
  override: Partial<PlanLimits>
  onSave: (limits: Partial<PlanLimits>) => void
  onReset: () => void
  onCancel: () => void
}) {
  const defaults = plan.limits
  const [maxPresentations, setMaxPresentations] = useState(String(override.maxPresentations ?? defaults.maxPresentations))
  const [maxParticipants, setMaxParticipants] = useState(String(override.maxParticipantsPerSession ?? defaults.maxParticipantsPerSession))
  const [maxQuestions, setMaxQuestions] = useState(String(override.maxQuestionsPerPresentation ?? defaults.maxQuestionsPerPresentation))
  const [maxSessions, setMaxSessions] = useState(String(override.maxActiveSessions ?? defaults.maxActiveSessions))

  const parseLimit = (value: string): number | 'unlimited' => {
    if (value.trim() === '' || value.trim().toLowerCase() === 'unlimited') return 'unlimited'
    const nextValue = Number(value)
    return Number.isNaN(nextValue) ? 0 : nextValue
  }

  return (
    <div className="space-y-3 rounded-[1.5rem] border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(191,168,255,0.10)' }}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#bda6ff' }}>Edit limits</p>
        <p className="mt-1 text-xs" style={{ color: '#9ca3b4' }}>These save to Firebase instantly. Use "unlimited" where needed.</p>
      </div>

      {[
        { label: 'Lifetime Zapps', value: maxPresentations, setValue: setMaxPresentations },
        { label: 'Max participants', value: maxParticipants, setValue: setMaxParticipants },
        { label: 'Questions per Zapp', value: maxQuestions, setValue: setMaxQuestions },
        { label: 'Concurrent live sessions', value: maxSessions, setValue: setMaxSessions },
      ].map(field => (
        <div key={field.label}>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#9ca3b4' }}>
            {field.label}
          </label>
          <input
            type="text"
            value={field.value}
            onChange={event => field.setValue(event.target.value)}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold outline-none"
            style={{ background: '#0f1018', border: '1px solid rgba(191,168,255,0.12)', color: '#f6f1ff' }}
          />
        </div>
      ))}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSave({
            maxPresentations: parseLimit(maxPresentations),
            maxParticipantsPerSession: Number(parseLimit(maxParticipants)),
            maxQuestionsPerPresentation: Number(parseLimit(maxQuestions)),
            maxActiveSessions: Number(parseLimit(maxSessions)),
          })}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #650cd9, #8f63ff)' }}
        >
          <Save className="h-4 w-4" /> Save limits
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-2xl border px-4 py-3 text-sm font-semibold"
          style={{ borderColor: 'rgba(255,177,159,0.18)', color: '#ffb19f', background: 'rgba(255,177,159,0.08)' }}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border px-4 py-3 text-sm font-semibold"
          style={{ borderColor: 'rgba(191,168,255,0.12)', color: '#d1cae3', background: 'rgba(255,255,255,0.03)' }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
function PricingEnginePanel({
  baseUsdMonthly,
  setBaseUsdMonthly,
  pricingMeta,
  setPricingMeta,
  derivedPricing,
  isDirty,
  isSaving,
  onReset,
  onSave,
}: {
  baseUsdMonthly: BaseUsdMonthly
  setBaseUsdMonthly: React.Dispatch<React.SetStateAction<BaseUsdMonthly>>
  pricingMeta: PricingMeta
  setPricingMeta: React.Dispatch<React.SetStateAction<PricingMeta>>
  derivedPricing: PricingConfig
  isDirty: boolean
  isSaving: boolean
  onReset: () => void
  onSave: () => void
}) {
  return (
    <section className="rounded-[2rem] border p-6 md:p-8" style={{ background: '#14141b', borderColor: 'rgba(191,168,255,0.14)', boxShadow: '0 24px 60px rgba(0,0,0,0.24)' }}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: '#bda6ff' }}>Pricing engine</p>
          <h2 className="mt-2 text-2xl font-black" style={{ color: '#fbf7ff' }}>Annual pricing is now rule-based</h2>
          <p className="mt-2 max-w-3xl text-sm" style={{ color: '#b7afc8' }}>
            USD monthly prices are the base input. Annual list price is monthly x 12, then the annual discount is applied once. GBP and INR are generated automatically from the same rule set.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold" style={{ background: 'rgba(101,12,217,0.10)', borderColor: 'rgba(101,12,217,0.18)', color: '#d9ccff' }}>
          <Info className="h-4 w-4" />
          Home, plans, and the app all read from the same pricing catalogue after save.
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.5rem] border p-5" style={{ background: '#1a1a24', borderColor: 'rgba(191,168,255,0.12)' }}>
          <label className="block text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: '#bda6ff' }}>Annual discount</label>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="number"
              min="0"
              max="95"
              step="1"
              value={pricingMeta.annualDiscountPercent}
              onChange={event => setPricingMeta(prev => ({ ...prev, annualDiscountPercent: clampDiscount(Number(event.target.value)) }))}
              className="w-28 rounded-2xl px-4 py-3 text-lg font-black outline-none"
              style={{ background: '#0f1018', border: '1px solid rgba(191,168,255,0.12)', color: '#fbf7ff' }}
            />
            <span className="text-sm font-semibold" style={{ color: '#b7afc8' }}>% off the annual total</span>
          </div>
        </div>

        <div className="rounded-[1.5rem] border p-5" style={{ background: '#1a1a24', borderColor: 'rgba(191,168,255,0.12)' }}>
          <label className="block text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: '#53d8d1' }}>GBP exchange rate</label>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={pricingMeta.exchangeRates.GBP}
              onChange={event => setPricingMeta(prev => ({
                ...prev,
                exchangeRates: { ...prev.exchangeRates, GBP: normalizeRate(Number(event.target.value), DEFAULT_PRICING_META.exchangeRates.GBP) },
              }))}
              className="w-28 rounded-2xl px-4 py-3 text-lg font-black outline-none"
              style={{ background: '#0f1018', border: '1px solid rgba(83,216,209,0.18)', color: '#fbf7ff' }}
            />
            <span className="text-sm font-semibold" style={{ color: '#b7afc8' }}>1 USD = {pricingMeta.exchangeRates.GBP} GBP</span>
          </div>
        </div>

        <div className="rounded-[1.5rem] border p-5" style={{ background: '#1a1a24', borderColor: 'rgba(191,168,255,0.12)' }}>
          <label className="block text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: '#ffb19f' }}>INR exchange rate</label>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={pricingMeta.exchangeRates.INR}
              onChange={event => setPricingMeta(prev => ({
                ...prev,
                exchangeRates: { ...prev.exchangeRates, INR: normalizeRate(Number(event.target.value), DEFAULT_PRICING_META.exchangeRates.INR) },
              }))}
              className="w-28 rounded-2xl px-4 py-3 text-lg font-black outline-none"
              style={{ background: '#0f1018', border: '1px solid rgba(255,177,159,0.18)', color: '#fbf7ff' }}
            />
            <span className="text-sm font-semibold" style={{ color: '#b7afc8' }}>1 USD = {pricingMeta.exchangeRates.INR} INR</span>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.75rem] border" style={{ borderColor: 'rgba(191,168,255,0.12)' }}>
        <div className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.9fr] gap-0 border-b px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em]" style={{ background: '#1a1a24', borderColor: 'rgba(191,168,255,0.10)', color: '#9ca3b4' }}>
          <span>Plan</span>
          <span>Monthly USD</span>
          <span>Annual list</span>
          <span>Annual billed</span>
        </div>
        {PAID_PLAN_IDS.map(planId => {
          const plan = PLANS.find(item => item.id === planId)!
          const badge = PLAN_BADGE[planId]
          const monthly = baseUsdMonthly[planId]
          const annualList = deriveAnnualList(monthly)
          const annualBilled = deriveAnnualBilled(monthly, pricingMeta.annualDiscountPercent)

          return (
            <div key={planId} className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.9fr] items-center gap-4 px-5 py-4" style={{ background: '#14141b', borderTop: '1px solid rgba(191,168,255,0.08)' }}>
              <div>
                <span className="inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ background: badge.bg, borderColor: badge.border, color: badge.text }}>
                  {plan.name}
                </span>
                <p className="mt-2 text-xs" style={{ color: '#9ca3b4' }}>{plan.tagline}</p>
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={monthly}
                onChange={event => {
                  const nextValue = Number(event.target.value)
                  setBaseUsdMonthly(prev => ({ ...prev, [planId]: Number.isFinite(nextValue) ? nextValue : 0 }))
                }}
                className="w-full rounded-2xl px-4 py-3 text-lg font-black outline-none"
                style={{ background: '#0f1018', border: '1px solid rgba(191,168,255,0.12)', color: '#fbf7ff' }}
              />
              <div className="text-lg font-black" style={{ color: '#d9ccff' }}>{fmtCurrency(annualList, 'USD')}</div>
              <div>
                <div className="text-lg font-black" style={{ color: '#ffffff' }}>{fmtCurrency(annualBilled, 'USD')}</div>
                <p className="mt-1 text-[11px] font-semibold" style={{ color: '#9ca3b4' }}>
                  {pricingMeta.annualDiscountPercent}% annual discount applied
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {CURRENCY_META.map(currency => (
          <div key={currency.code} className="rounded-[1.5rem] border p-5" style={{ background: '#1a1a24', borderColor: 'rgba(191,168,255,0.12)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#9ca3b4' }}>{currency.code}</p>
                <h3 className="mt-1 text-lg font-black" style={{ color: '#fbf7ff' }}>{currency.label}</h3>
              </div>
              <Globe2 className="h-5 w-5" style={{ color: '#bda6ff' }} />
            </div>
            <div className="mt-4 space-y-3">
              {PLANS.map(plan => {
                const prices = derivedPricing[currency.code]?.[plan.id]
                return (
                  <div key={`${currency.code}-${plan.id}`} className="rounded-2xl border px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(191,168,255,0.10)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold" style={{ color: '#f4efff' }}>{plan.name}</span>
                      <span className="text-sm font-black" style={{ color: '#ffffff' }}>{fmtCurrency(prices?.monthly ?? 0, currency.code)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs" style={{ color: '#9ca3b4' }}>
                      <span>Monthly</span>
                      <span>Annual: {fmtCurrency(prices?.annual ?? 0, currency.code)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !isDirty}
          className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #650cd9, #8f63ff)' }}
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving pricing...' : 'Save pricing engine'}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={!isDirty}
          className="rounded-2xl border px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(191,168,255,0.12)', color: '#d1cae3' }}
        >
          Reset
        </button>
        <span className="text-xs" style={{ color: '#9ca3b4' }}>
          Save writes `admin/pricing` and `admin/pricingMeta`, then invalidates the shared pricing cache.
        </span>
      </div>
    </section>
  )
}
function PlanCard({
  plan,
  stats,
  override,
  monthlyPrice,
  annualPrice,
  onSaveOverride,
  onResetOverride,
}: {
  plan: Plan
  stats: PlanStats
  override: Partial<PlanLimits>
  monthlyPrice: number
  annualPrice: number
  onSaveOverride: (limits: Partial<PlanLimits>) => void
  onResetOverride: () => void
}) {
  const [editing, setEditing] = useState(false)
  const badge = PLAN_BADGE[plan.id]
  const hasOverride = Object.keys(override).length > 0
  const effectiveLimits = {
    maxPresentations: override.maxPresentations ?? plan.limits.maxPresentations,
    maxParticipantsPerSession: override.maxParticipantsPerSession ?? plan.limits.maxParticipantsPerSession,
    maxQuestionsPerPresentation: override.maxQuestionsPerPresentation ?? plan.limits.maxQuestionsPerPresentation,
    maxActiveSessions: override.maxActiveSessions ?? plan.limits.maxActiveSessions,
  }

  return (
    <article className="rounded-[1.75rem] border p-6" style={{ background: '#171720', borderColor: plan.isRecommended ? 'rgba(101,12,217,0.40)' : 'rgba(191,168,255,0.12)', boxShadow: plan.isRecommended ? '0 20px 50px rgba(101,12,217,0.20)' : 'none' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ background: badge.bg, borderColor: badge.border, color: badge.text }}>
            {plan.name}
          </span>
          {hasOverride && (
            <span className="ml-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ background: 'rgba(255,177,159,0.12)', borderColor: 'rgba(255,177,159,0.16)', color: '#ffb19f' }}>
              Custom
            </span>
          )}
          <p className="mt-3 text-xs leading-relaxed" style={{ color: '#9ca3b4' }}>{plan.tagline}</p>
        </div>
        {plan.isRecommended && (
          <div className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white" style={{ background: 'linear-gradient(135deg, #650cd9, #8f63ff)' }}>
            <Star className="h-3 w-3 fill-white" /> Most popular
          </div>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between gap-4 rounded-[1.5rem] border p-4" style={{ background: '#111119', borderColor: 'rgba(191,168,255,0.10)' }}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: '#9ca3b4' }}>Live price</p>
          <p className="mt-2 text-3xl font-black" style={{ color: '#ffffff' }}>{plan.id === 'free' ? 'Free' : fmtCurrency(monthlyPrice, 'USD')}</p>
          {plan.id !== 'free' && (
            <p className="mt-1 text-xs" style={{ color: '#b7afc8' }}>Annual billed at {fmtCurrency(annualPrice, 'USD')}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing(prev => !prev)}
          className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold"
          style={{ background: 'rgba(101,12,217,0.10)', borderColor: 'rgba(101,12,217,0.20)', color: '#d9ccff' }}
        >
          <Pencil className="h-3.5 w-3.5" /> {editing ? 'Close' : 'Edit limits'}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-[1.5rem] border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(191,168,255,0.10)' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#9ca3b4' }}>Subscribers</p>
          <div className="mt-4 space-y-2 text-sm">
            {[
              { label: 'Total users', value: stats.totalUsers.toLocaleString() },
              { label: 'Active paid', value: stats.activeUsers.toLocaleString() },
              { label: 'Monthly billing', value: stats.monthlyUsers.toLocaleString() },
              { label: 'Annual billing', value: stats.annualUsers.toLocaleString() },
              { label: 'MRR contribution', value: fmtCurrency(stats.mrr, 'USD') },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span style={{ color: '#9ca3b4' }}>{item.label}</span>
                <span className="font-bold" style={{ color: '#ffffff' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border p-4" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(191,168,255,0.10)' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#9ca3b4' }}>Plan limits</p>
          <div className="mt-4 space-y-2 text-sm">
            {[
              { icon: FileStack, label: 'Lifetime Zapps', value: displayLimit(effectiveLimits.maxPresentations, plan.limits.maxPresentations) },
              { icon: Users, label: 'Max participants', value: displayLimit(effectiveLimits.maxParticipantsPerSession, plan.limits.maxParticipantsPerSession) },
              { icon: Zap, label: 'Questions per Zapp', value: displayLimit(effectiveLimits.maxQuestionsPerPresentation, plan.limits.maxQuestionsPerPresentation) },
              { icon: Sparkles, label: 'Live at once', value: displayLimit(effectiveLimits.maxActiveSessions, plan.limits.maxActiveSessions) },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2" style={{ color: '#9ca3b4' }}>
                  <item.icon className="h-3.5 w-3.5" /> {item.label}
                </span>
                <span className="font-bold" style={{ color: '#ffffff' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          { enabled: plan.features.canUseQuiz, label: 'Live quizzes' },
          { enabled: plan.features.canUseQA, label: 'Q and A' },
          { enabled: plan.features.canUseFeedback, label: 'Feedback' },
          { enabled: plan.features.canExportResults, label: 'Exports' },
          { enabled: plan.features.canUseBranding, label: 'Branding' },
        ].map(feature => (
          <span key={feature.label} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold" style={{ background: feature.enabled ? 'rgba(83,216,209,0.10)' : 'rgba(255,255,255,0.03)', borderColor: feature.enabled ? 'rgba(83,216,209,0.16)' : 'rgba(191,168,255,0.10)', color: feature.enabled ? '#c8fffb' : '#9ca3b4' }}>
            <Check className="h-3 w-3" /> {feature.label}
          </span>
        ))}
      </div>

      {editing && (
        <div className="mt-5">
          <EditLimitsPanel
            plan={plan}
            override={override}
            onSave={limits => { onSaveOverride(limits); setEditing(false) }}
            onReset={() => { onResetOverride(); setEditing(false) }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
    </article>
  )
}
export default function AdminPlansPage() {
  const [planStats, setPlanStats] = useState<Record<PlanId, PlanStats>>({} as Record<PlanId, PlanStats>)
  const [overrides, setOverrides] = useState<LimitOverrides>({})
  const [baseUsdMonthly, setBaseUsdMonthly] = useState<BaseUsdMonthly>(getDefaultBaseMonthly())
  const [savedBaseUsdMonthly, setSavedBaseUsdMonthly] = useState<BaseUsdMonthly>(getDefaultBaseMonthly())
  const [pricingMeta, setPricingMeta] = useState<PricingMeta>(DEFAULT_PRICING_META)
  const [savedPricingMeta, setSavedPricingMeta] = useState<PricingMeta>(DEFAULT_PRICING_META)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingPricing, setIsSavingPricing] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  useEffect(() => {
    void loadData()
  }, [])

  const derivedPricing = useMemo(
    () => buildPricingConfig(baseUsdMonthly, pricingMeta),
    [baseUsdMonthly, pricingMeta],
  )

  const pricingDirty = useMemo(() => (
    JSON.stringify(baseUsdMonthly) !== JSON.stringify(savedBaseUsdMonthly)
      || JSON.stringify(pricingMeta) !== JSON.stringify(savedPricingMeta)
  ), [baseUsdMonthly, savedBaseUsdMonthly, pricingMeta, savedPricingMeta])

  const totalUsers = useMemo(
    () => Object.values(planStats).reduce((sum, stats) => sum + stats.totalUsers, 0),
    [planStats],
  )

  const totalPaid = useMemo(
    () => PAID_PLAN_IDS.reduce((sum, planId) => sum + (planStats[planId]?.activeUsers ?? 0), 0),
    [planStats],
  )

  const totalMRR = useMemo(
    () => Object.values(planStats).reduce((sum, stats) => sum + stats.mrr, 0),
    [planStats],
  )

  async function loadData() {
    setIsLoading(true)

    try {
      const [usersSnap, configSnap, pricingSnap, pricingMetaSnap] = await Promise.all([
        get(ref(rtdb, 'users')),
        get(ref(rtdb, 'admin/planConfig')),
        get(ref(rtdb, 'admin/pricing')),
        get(ref(rtdb, 'admin/pricingMeta')),
      ])

      const rawPricing = pricingSnap.exists() ? (pricingSnap.val() as PricingConfig) : {}
      const nextBaseUsdMonthly = seedBaseMonthly(rawPricing)
      const nextPricingMeta = pricingMetaSnap.exists() ? mergePricingMeta(pricingMetaSnap.val()) : DEFAULT_PRICING_META
      const nextPricing = buildPricingConfig(nextBaseUsdMonthly, nextPricingMeta)

      setBaseUsdMonthly(nextBaseUsdMonthly)
      setSavedBaseUsdMonthly(nextBaseUsdMonthly)
      setPricingMeta(nextPricingMeta)
      setSavedPricingMeta(nextPricingMeta)

      if (configSnap.exists()) {
        const rawOverrides = configSnap.val() as Record<string, { limits?: Partial<PlanLimits> }>
        const loadedOverrides: LimitOverrides = {}
        for (const [planId, config] of Object.entries(rawOverrides)) {
          if (config.limits) loadedOverrides[planId as PlanId] = config.limits
        }
        setOverrides(loadedOverrides)
      } else {
        setOverrides({})
      }

      const nextStats = {} as Record<PlanId, PlanStats>
      const allUsers = usersSnap.exists() ? Object.values(usersSnap.val() as Record<string, any>) : []

      for (const plan of PLANS) {
        const planUsers = allUsers.filter((user: any) => user.planId === plan.id)
        const activeUsers = plan.pricePerMonth > 0 ? planUsers.filter(isActive) : []
        const monthlyUsers = activeUsers.filter((user: any) => user.billingCycle !== 'annual')
        const annualUsers = activeUsers.filter((user: any) => user.billingCycle === 'annual')
        const monthlyRate = nextPricing.USD?.[plan.id]?.monthly ?? plan.pricePerMonth
        const annualRate = nextPricing.USD?.[plan.id]?.annual ?? plan.pricePerYear
        const mrr = (monthlyUsers.length * monthlyRate) + (annualUsers.length * (annualRate / 12))

        nextStats[plan.id] = {
          planId: plan.id,
          totalUsers: planUsers.length,
          activeUsers: activeUsers.length,
          monthlyUsers: monthlyUsers.length,
          annualUsers: annualUsers.length,
          mrr,
        }
      }

      setPlanStats(nextStats)
    } catch (error) {
      console.error('[admin/plans] load failed', error)
      setSaveStatus('Failed to load pricing data')
    } finally {
      setIsLoading(false)
    }
  }

  async function saveOverride(planId: PlanId, limits: Partial<PlanLimits>) {
    try {
      await set(ref(rtdb, `admin/planConfig/${planId}/limits`), limits)
      setOverrides(prev => ({ ...prev, [planId]: limits }))
      invalidatePlanLimitsCache()
      setSaveStatus(`${planId} limits saved`)
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      console.error('Failed to save limits', error)
      setSaveStatus('Could not save limits')
      setTimeout(() => setSaveStatus(''), 3500)
    }
  }

  async function resetOverride(planId: PlanId) {
    try {
      await set(ref(rtdb, `admin/planConfig/${planId}/limits`), null)
      setOverrides(prev => {
        const next = { ...prev }
        delete next[planId]
        return next
      })
      invalidatePlanLimitsCache()
      setSaveStatus(`${planId} limits reset`)
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      console.error('Failed to reset limits', error)
      setSaveStatus('Could not reset limits')
      setTimeout(() => setSaveStatus(''), 3500)
    }
  }

  async function savePricingEngine() {
    setIsSavingPricing(true)

    try {
      await Promise.all([
        set(ref(rtdb, 'admin/pricing'), derivedPricing),
        set(ref(rtdb, 'admin/pricingMeta'), pricingMeta),
      ])

      setSavedBaseUsdMonthly(baseUsdMonthly)
      setSavedPricingMeta(pricingMeta)
      invalidatePricingCache()
      setSaveStatus('Pricing engine saved across USD, GBP and INR')
      setTimeout(() => setSaveStatus(''), 3500)
      await loadData()
    } catch (error) {
      console.error('Failed to save pricing engine', error)
      setSaveStatus('Could not save pricing engine')
      setTimeout(() => setSaveStatus(''), 3500)
    } finally {
      setIsSavingPricing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4" style={{ borderColor: 'rgba(191,168,255,0.12)', borderTopColor: '#8f63ff' }} />
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] space-y-8 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: '#bda6ff' }}>Admin console</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight" style={{ color: '#fbf7ff' }}>Plans and pricing engine</h1>
          <p className="mt-2 text-sm" style={{ color: '#b7afc8' }}>
            Clean up the tier catalogue once, then let LiveZapp generate annual, GBP, and INR pricing consistently everywhere.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {saveStatus && (
            <span className="rounded-2xl border px-4 py-2 text-xs font-semibold" style={{ background: 'rgba(101,12,217,0.10)', borderColor: 'rgba(101,12,217,0.18)', color: '#d9ccff' }}>
              {saveStatus}
            </span>
          )}
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(191,168,255,0.12)', color: '#f2ebff' }}
          >
            <RefreshCw className="h-4 w-4" /> Refresh data
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total users', value: totalUsers.toLocaleString(), icon: Users, tone: 'rgba(191,168,255,0.18)' },
          { label: 'Paid subscribers', value: totalPaid.toLocaleString(), icon: TrendingUp, tone: 'rgba(83,216,209,0.18)' },
          { label: 'Current MRR', value: fmtCurrency(totalMRR, 'USD'), icon: BadgeDollarSign, tone: 'rgba(255,177,159,0.18)' },
        ].map(card => (
          <div key={card.label} className="rounded-[1.75rem] border p-5" style={{ background: '#171720', borderColor: 'rgba(191,168,255,0.12)' }}>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: card.tone }}>
                <card.icon className="h-5 w-5" style={{ color: '#ffffff' }} />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ color: '#ffffff' }}>{card.value}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#9ca3b4' }}>{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <PricingEnginePanel
        baseUsdMonthly={baseUsdMonthly}
        setBaseUsdMonthly={setBaseUsdMonthly}
        pricingMeta={pricingMeta}
        setPricingMeta={setPricingMeta}
        derivedPricing={derivedPricing}
        isDirty={pricingDirty}
        isSaving={isSavingPricing}
        onReset={() => {
          setBaseUsdMonthly(savedBaseUsdMonthly)
          setPricingMeta(savedPricingMeta)
        }}
        onSave={() => void savePricingEngine()}
      />

      <section className="rounded-[2rem] border p-6 md:p-8" style={{ background: '#14141b', borderColor: 'rgba(191,168,255,0.14)' }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: '#bda6ff' }}>Plan controls</p>
            <h2 className="mt-2 text-2xl font-black" style={{ color: '#fbf7ff' }}>Usage limits and tier detail</h2>
            <p className="mt-2 text-sm" style={{ color: '#b7afc8' }}>
              Pricing now uses the shared engine above. These cards remain the place for plan limits, subscriber visibility, and feature checks.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold" style={{ background: 'rgba(255,177,159,0.10)', borderColor: 'rgba(255,177,159,0.18)', color: '#ffd8cc' }}>
            <Info className="h-4 w-4" />
            If limits are changed here, Firebase applies them without a redeploy.
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-4">
          {PLANS.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              stats={planStats[plan.id] ?? {
                planId: plan.id,
                totalUsers: 0,
                activeUsers: 0,
                monthlyUsers: 0,
                annualUsers: 0,
                mrr: 0,
              }}
              override={overrides[plan.id] ?? {}}
              monthlyPrice={derivedPricing.USD?.[plan.id]?.monthly ?? plan.pricePerMonth}
              annualPrice={derivedPricing.USD?.[plan.id]?.annual ?? plan.pricePerYear}
              onSaveOverride={limits => void saveOverride(plan.id, limits)}
              onResetOverride={() => void resetOverride(plan.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}