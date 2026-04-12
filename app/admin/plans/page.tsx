'use client'

import { useEffect, useMemo, useState } from 'react'
import { ref, get, set } from 'firebase/database'
import {
  BadgeDollarSign,
  Check,
  CheckCircle2,
  FileStack,
  Globe2,
  Info,
  Loader2,
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
import { PLANS, type Plan, type PlanFeatureFlags, type PlanId, type PlanLimits } from '@/types/plans'
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

type PlanOverride = {
  limits?: Partial<PlanLimits>
  features?: Partial<PlanFeatureFlags>
}
type LimitOverrides = Partial<Record<PlanId, PlanOverride>>
type PaidPlanId = Exclude<PlanId, 'free'>

interface PricingMeta {
  annualDiscountPercent: number
  exchangeRates: Record<SupportedCurrency, number>
  exchangeRateSource: string
  exchangeRateSyncedAt: string | null
  exchangeRateSyncMethod: 'manual' | 'frankfurter' | 'fallback'
}

type BaseUsdMonthly = Record<PaidPlanId, number>

const PAID_PLAN_IDS: PaidPlanId[] = ['basic', 'regular', 'pro']
const DEFAULT_PRICING_META: PricingMeta = {
  annualDiscountPercent: 25,
  exchangeRates: { USD: 1, GBP: 0.79, INR: 84 },
  exchangeRateSource: 'Manual',
  exchangeRateSyncedAt: null,
  exchangeRateSyncMethod: 'manual',
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
  const syncMethod = raw?.exchangeRateSyncMethod
  return {
    annualDiscountPercent: clampDiscount(Number(raw?.annualDiscountPercent ?? DEFAULT_PRICING_META.annualDiscountPercent)),
    exchangeRates: {
      USD: 1,
      GBP: normalizeRate(Number(raw?.exchangeRates?.GBP ?? DEFAULT_PRICING_META.exchangeRates.GBP), DEFAULT_PRICING_META.exchangeRates.GBP),
      INR: normalizeRate(Number(raw?.exchangeRates?.INR ?? DEFAULT_PRICING_META.exchangeRates.INR), DEFAULT_PRICING_META.exchangeRates.INR),
    },
    exchangeRateSource: typeof raw?.exchangeRateSource === 'string' ? raw.exchangeRateSource : DEFAULT_PRICING_META.exchangeRateSource,
    exchangeRateSyncedAt: typeof raw?.exchangeRateSyncedAt === 'string' ? raw.exchangeRateSyncedAt : null,
    exchangeRateSyncMethod: syncMethod === 'frankfurter' || syncMethod === 'fallback' || syncMethod === 'manual' ? syncMethod : 'manual',
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
    return Number.isNaN(nextValue) || nextValue < 1 ? 1 : Math.round(nextValue)
  }

  return (
    <div className="space-y-3 rounded-[1.5rem] border p-4" style={{ background: '#ffffff', borderColor: '#e8e4ef' }}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#bda6ff' }}>Edit limits</p>
        <p className="mt-1 text-xs" style={{ color: '#7b728d' }}>These save to Firebase instantly. Use "unlimited" where needed.</p>
      </div>

      {[
        { label: 'Monthly Zapps', value: maxPresentations, setValue: setMaxPresentations },
        { label: 'Max participants', value: maxParticipants, setValue: setMaxParticipants },
        { label: 'Questions per Zapp', value: maxQuestions, setValue: setMaxQuestions },
        { label: 'Concurrent live sessions', value: maxSessions, setValue: setMaxSessions },
      ].map(field => (
        <div key={field.label}>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#7b728d' }}>
            {field.label}
          </label>
          <input
            type="text"
            value={field.value}
            onChange={event => field.setValue(event.target.value)}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold outline-none"
            style={{ background: '#ffffff', border: '1px solid rgba(191,168,255,0.12)', color: '#1a1a2e' }}
          />
        </div>
      ))}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSave({
            maxPresentations: parseLimit(maxPresentations),
            maxParticipantsPerSession: Math.max(1, Number(maxParticipants) || defaults.maxParticipantsPerSession),
            maxQuestionsPerPresentation: Math.max(1, Number(maxQuestions) || defaults.maxQuestionsPerPresentation),
            maxActiveSessions: Math.max(1, Number(maxSessions) || defaults.maxActiveSessions),
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
          style={{ borderColor: '#e8e4ef', color: '#5f566f', background: '#ffffff' }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function EditFeaturesPanel({
  plan,
  override,
  onSave,
  onReset,
  onCancel,
}: {
  plan: Plan
  override: Partial<PlanFeatureFlags>
  onSave: (features: Partial<PlanFeatureFlags>) => void
  onReset: () => void
  onCancel: () => void
}) {
  const defaults = plan.features
  const [canUseQuiz, setCanUseQuiz] = useState(override.canUseQuiz ?? defaults.canUseQuiz)
  const [canUseQA, setCanUseQA] = useState(override.canUseQA ?? defaults.canUseQA)
  const [canUseFeedback, setCanUseFeedback] = useState(override.canUseFeedback ?? defaults.canUseFeedback)
  const [canExportResults, setCanExportResults] = useState(override.canExportResults ?? defaults.canExportResults)
  const [canUseBranding, setCanUseBranding] = useState(override.canUseBranding ?? defaults.canUseBranding)
  const [exportFormats, setExportFormats] = useState<Array<'csv' | 'pdf' | 'api'>>((
    override.exportFormats ?? defaults.exportFormats ?? []
  ).filter((fmt): fmt is 'csv' | 'pdf' | 'api' => fmt === 'csv' || fmt === 'pdf' || fmt === 'api'))

  function toggleFormat(format: 'csv' | 'pdf' | 'api') {
    setExportFormats(prev => prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format])
  }

  return (
    <div className="space-y-3 rounded-[1.5rem] border p-4" style={{ background: '#ffffff', borderColor: '#e8e4ef' }}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#0f766e' }}>Edit entitlements</p>
        <p className="mt-1 text-xs" style={{ color: '#7b728d' }}>Enable or disable feature access for this plan.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {[
          { label: 'Live quizzes', value: canUseQuiz, setValue: setCanUseQuiz },
          { label: 'Q and A', value: canUseQA, setValue: setCanUseQA },
          { label: 'Feedback', value: canUseFeedback, setValue: setCanUseFeedback },
          { label: 'Exports', value: canExportResults, setValue: setCanExportResults },
          { label: 'Branding', value: canUseBranding, setValue: setCanUseBranding },
        ].map(item => (
          <label key={item.label} className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm" style={{ borderColor: '#e8e4ef' }}>
            <span className="font-semibold" style={{ color: '#1a1a2e' }}>{item.label}</span>
            <input type="checkbox" checked={item.value} onChange={e => item.setValue(e.target.checked)} className="h-4 w-4" />
          </label>
        ))}
      </div>

      <div className="rounded-xl border p-3" style={{ borderColor: '#e8e4ef' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#7b728d' }}>Export formats</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['csv', 'pdf', 'api'] as const).map(format => {
            const selected = exportFormats.includes(format)
            return (
              <button
                key={format}
                type="button"
                disabled={!canExportResults}
                onClick={() => toggleFormat(format)}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase disabled:cursor-not-allowed disabled:opacity-50"
                style={selected
                  ? { background: 'rgba(101,12,217,0.10)', color: '#650cd9', borderColor: 'rgba(101,12,217,0.30)' }
                  : { background: '#f8f5fc', color: '#6d667b', borderColor: '#e8e4ef' }
                }
              >
                {format}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSave({
            canUseQuiz,
            canUseQA,
            canUseFeedback,
            canExportResults,
            canUseBranding,
            exportFormats: canExportResults ? exportFormats : [],
          })}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #650cd9, #8f63ff)' }}
        >
          <Save className="h-4 w-4" /> Save entitlements
        </button>
        <button type="button" onClick={onReset} className="rounded-2xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: '#e8e4ef', color: '#9a3412', background: '#fff3ef' }}>
          <RotateCcw className="h-4 w-4" />
        </button>
        <button type="button" onClick={onCancel} className="rounded-2xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: '#e8e4ef', color: '#5f566f', background: '#ffffff' }}>
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
  isSyncingRates,
  onSyncRates,
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
  isSyncingRates: boolean
  onSyncRates: () => void
  onReset: () => void
  onSave: () => void
}) {
  return (
    <section className="rounded-[2rem] border p-6 md:p-8" style={{ background: '#ffffff', borderColor: '#e8e4ef', boxShadow: '0 10px 30px rgba(33,22,62,0.06)' }}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: '#bda6ff' }}>Pricing engine</p>
          <h2 className="mt-2 text-2xl font-black" style={{ color: '#1a1a2e' }}>Annual pricing is now rule-based</h2>
          <p className="mt-2 max-w-3xl text-sm" style={{ color: '#6d667b' }}>
            USD monthly prices are the base input. Annual list price is monthly x 12, then the annual discount is applied once. GBP and INR are generated automatically from the same rule set.
          </p>
        </div>
        <div className="rounded-2xl border px-4 py-3 text-xs font-semibold" style={{ background: '#f8f5fc', borderColor: '#ddd3ea', color: '#5f566f' }}>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Home, plans, and checkout read from this pricing catalogue.
          </div>
          <p className="mt-1">Rate source: {pricingMeta.exchangeRateSource}</p>
          <p className="mt-1">Last synced: {pricingMeta.exchangeRateSyncedAt ? new Date(pricingMeta.exchangeRateSyncedAt).toLocaleString() : 'Not synced yet'}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.5rem] border p-5" style={{ background: '#fcf9ff', borderColor: '#e8e4ef' }}>
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
              style={{ background: '#ffffff', border: '1px solid rgba(191,168,255,0.12)', color: '#1a1a2e' }}
            />
            <span className="text-sm font-semibold" style={{ color: '#6d667b' }}>% off the annual total</span>
          </div>
        </div>

        <div className="rounded-[1.5rem] border p-5" style={{ background: '#fcf9ff', borderColor: '#e8e4ef' }}>
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
                exchangeRateSource: 'Manual',
                exchangeRateSyncMethod: 'manual',
                exchangeRateSyncedAt: new Date().toISOString(),
              }))}
              className="w-28 rounded-2xl px-4 py-3 text-lg font-black outline-none"
              style={{ background: '#ffffff', border: '1px solid rgba(83,216,209,0.18)', color: '#1a1a2e' }}
            />
            <span className="text-sm font-semibold" style={{ color: '#6d667b' }}>1 USD = {pricingMeta.exchangeRates.GBP} GBP</span>
          </div>
        </div>

        <div className="rounded-[1.5rem] border p-5" style={{ background: '#fcf9ff', borderColor: '#e8e4ef' }}>
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
                exchangeRateSource: 'Manual',
                exchangeRateSyncMethod: 'manual',
                exchangeRateSyncedAt: new Date().toISOString(),
              }))}
              className="w-28 rounded-2xl px-4 py-3 text-lg font-black outline-none"
              style={{ background: '#ffffff', border: '1px solid rgba(255,177,159,0.18)', color: '#1a1a2e' }}
            />
            <span className="text-sm font-semibold" style={{ color: '#6d667b' }}>1 USD = {pricingMeta.exchangeRates.INR} INR</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSyncRates}
          disabled={isSyncingRates}
          className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          style={{ background: '#ecf8f7', borderColor: '#bfeae7', color: '#0f766e' }}
        >
          {isSyncingRates ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isSyncingRates ? 'Syncing rates...' : 'Sync rates now'}
        </button>
        <span className="text-xs" style={{ color: '#7b728d' }}>
          Reference feed uses Frankfurter (ECB). Checkout capture is processed by PayPal.
        </span>
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.75rem] border" style={{ borderColor: '#e8e4ef' }}>
        <div className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.9fr] gap-0 border-b px-5 py-4 text-[11px] font-black uppercase tracking-[0.18em]" style={{ background: '#fcf9ff', borderColor: '#e8e4ef', color: '#7b728d' }}>
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
            <div key={planId} className="grid grid-cols-[1.1fr_0.8fr_0.8fr_0.9fr] items-center gap-4 px-5 py-4" style={{ background: '#ffffff', borderTop: '1px solid #f1edf7' }}>
              <div>
                <span className="inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ background: badge.bg, borderColor: badge.border, color: badge.text }}>
                  {plan.name}
                </span>
                <p className="mt-2 text-xs" style={{ color: '#7b728d' }}>{plan.tagline}</p>
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
                style={{ background: '#ffffff', border: '1px solid rgba(191,168,255,0.12)', color: '#1a1a2e' }}
              />
              <div className="text-lg font-black" style={{ color: '#5f566f' }}>{fmtCurrency(annualList, 'USD')}</div>
              <div>
                <div className="text-lg font-black" style={{ color: '#1a1a2e' }}>{fmtCurrency(annualBilled, 'USD')}</div>
                <p className="mt-1 text-[11px] font-semibold" style={{ color: '#7b728d' }}>
                  {pricingMeta.annualDiscountPercent}% annual discount applied
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {CURRENCY_META.map(currency => (
          <div key={currency.code} className="rounded-[1.5rem] border p-5" style={{ background: '#fcf9ff', borderColor: '#e8e4ef' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#7b728d' }}>{currency.code}</p>
                <h3 className="mt-1 text-lg font-black" style={{ color: '#1a1a2e' }}>{currency.label}</h3>
              </div>
              <Globe2 className="h-5 w-5" style={{ color: '#bda6ff' }} />
            </div>
            <div className="mt-4 space-y-3">
              {PLANS.map(plan => {
                const prices = derivedPricing[currency.code]?.[plan.id]
                return (
                  <div key={`${currency.code}-${plan.id}`} className="rounded-2xl border px-4 py-3" style={{ background: '#ffffff', borderColor: '#e8e4ef' }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold" style={{ color: '#1a1a2e' }}>{plan.name}</span>
                      <span className="text-sm font-black" style={{ color: '#1a1a2e' }}>{fmtCurrency(prices?.monthly ?? 0, currency.code)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs" style={{ color: '#7b728d' }}>
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
          style={{ background: '#ffffff', borderColor: '#e8e4ef', color: '#5f566f' }}
        >
          Reset
        </button>
        <span className="text-xs" style={{ color: '#7b728d' }}>
          Save writes `admin/pricing` and `admin/pricingMeta`, then invalidates the shared pricing cache.
        </span>
      </div>
    </section>
  )
}
function emptyPlanStats(planId: PlanId): PlanStats {
  return {
    planId,
    totalUsers: 0,
    activeUsers: 0,
    monthlyUsers: 0,
    annualUsers: 0,
    mrr: 0,
  }
}

function SubscribersByTierTable({ planStats }: { planStats: Record<PlanId, PlanStats> }) {
  const columns = [
    { key: 'plan', label: 'Plan' },
    { key: 'total', label: 'Total users' },
    { key: 'active', label: 'Active paid' },
    { key: 'monthly', label: 'Monthly billing' },
    { key: 'annual', label: 'Annual billing' },
    { key: 'mrr', label: 'MRR contribution' },
  ] as const

  return (
    <div className="mt-6 rounded-[1.75rem] border p-5 md:p-6" style={{ background: '#faf8fe', borderColor: '#e8e4ef' }}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: '#bda6ff' }}>Subscriptions</p>
          <h3 className="mt-1 text-lg font-black" style={{ color: '#1a1a2e' }}>Subscribers by tier</h3>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: '#6d667b' }}>
            Per-plan counts and MRR in one place. Totals above reflect the same live data from Firebase.
          </p>
        </div>
      </div>

      <div className="scroll-touch overflow-x-auto rounded-2xl border" style={{ background: '#ffffff', borderColor: '#e8e4ef' }}>
        <table className="min-w-[640px] w-full border-collapse text-left text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #e8e4ef' }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  className="whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em]"
                  style={{ color: '#7b728d' }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLANS.map(plan => {
              const stats = planStats[plan.id] ?? emptyPlanStats(plan.id)
              const badge = PLAN_BADGE[plan.id]
              return (
                <tr key={plan.id} style={{ borderBottom: '1px solid #f4f1fa' }}>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]"
                      style={{ background: badge.bg, borderColor: badge.border, color: badge.text }}
                    >
                      {plan.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold tabular-nums" style={{ color: '#1a1a2e' }}>{stats.totalUsers.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold tabular-nums" style={{ color: '#1a1a2e' }}>{stats.activeUsers.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold tabular-nums" style={{ color: '#1a1a2e' }}>{stats.monthlyUsers.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold tabular-nums" style={{ color: '#1a1a2e' }}>{stats.annualUsers.toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold tabular-nums" style={{ color: '#1a1a2e' }}>{fmtCurrency(stats.mrr, 'USD')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PlanCard({
  plan,
  override,
  monthlyPrice,
  annualPrice,
  onSaveLimits,
  onResetLimits,
  onSaveFeatures,
  onResetFeatures,
}: {
  plan: Plan
  override: PlanOverride
  monthlyPrice: number
  annualPrice: number
  onSaveLimits: (limits: Partial<PlanLimits>) => void
  onResetLimits: () => void
  onSaveFeatures: (features: Partial<PlanFeatureFlags>) => void
  onResetFeatures: () => void
}) {
  const [editing, setEditing] = useState<'limits' | 'features' | null>(null)
  const badge = PLAN_BADGE[plan.id]
  const hasLimitOverride = !!override.limits && Object.keys(override.limits).length > 0
  const hasFeatureOverride = !!override.features && Object.keys(override.features).length > 0
  const effectiveLimits = {
    maxPresentations: override.limits?.maxPresentations ?? plan.limits.maxPresentations,
    maxParticipantsPerSession: override.limits?.maxParticipantsPerSession ?? plan.limits.maxParticipantsPerSession,
    maxQuestionsPerPresentation: override.limits?.maxQuestionsPerPresentation ?? plan.limits.maxQuestionsPerPresentation,
    maxActiveSessions: override.limits?.maxActiveSessions ?? plan.limits.maxActiveSessions,
  }
  const effectiveFeatures = {
    canUseQuiz: override.features?.canUseQuiz ?? plan.features.canUseQuiz,
    canUseQA: override.features?.canUseQA ?? plan.features.canUseQA,
    canUseFeedback: override.features?.canUseFeedback ?? plan.features.canUseFeedback,
    canExportResults: override.features?.canExportResults ?? plan.features.canExportResults,
    canUseBranding: override.features?.canUseBranding ?? plan.features.canUseBranding,
    exportFormats: override.features?.exportFormats ?? plan.features.exportFormats ?? [],
  }

  return (
    <article className="rounded-[1.75rem] border p-6" style={{ background: '#ffffff', borderColor: plan.isRecommended ? 'rgba(101,12,217,0.40)' : 'rgba(191,168,255,0.12)', boxShadow: plan.isRecommended ? '0 20px 50px rgba(101,12,217,0.20)' : 'none' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ background: badge.bg, borderColor: badge.border, color: badge.text }}>
            {plan.name}
          </span>
          {hasLimitOverride && (
            <span className="ml-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ background: 'rgba(255,177,159,0.12)', borderColor: 'rgba(255,177,159,0.16)', color: '#ffb19f' }}>
              Limits custom
            </span>
          )}
          {hasFeatureOverride && (
            <span className="ml-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em]" style={{ background: 'rgba(15,118,110,0.10)', borderColor: 'rgba(15,118,110,0.20)', color: '#0f766e' }}>
              Entitlements custom
            </span>
          )}
          <p className="mt-3 text-xs leading-relaxed" style={{ color: '#7b728d' }}>{plan.tagline}</p>
        </div>
        {plan.isRecommended && (
          <div className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white" style={{ background: 'linear-gradient(135deg, #650cd9, #8f63ff)' }}>
            <Star className="h-3 w-3 fill-white" /> Most popular
          </div>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between gap-4 rounded-[1.5rem] border p-4" style={{ background: '#faf8fe', borderColor: '#e8e4ef' }}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: '#7b728d' }}>Live price</p>
          <p className="mt-2 text-3xl font-black" style={{ color: '#1a1a2e' }}>{plan.id === 'free' ? 'Free' : fmtCurrency(monthlyPrice, 'USD')}</p>
          {plan.id !== 'free' && (
            <p className="mt-1 text-xs" style={{ color: '#6d667b' }}>Annual billed at {fmtCurrency(annualPrice, 'USD')}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(prev => prev === 'limits' ? null : 'limits')}
            className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold"
            style={{ background: 'rgba(101,12,217,0.10)', borderColor: 'rgba(101,12,217,0.20)', color: '#6d28d9' }}
          >
            <Pencil className="h-3.5 w-3.5" /> {editing === 'limits' ? 'Close limits' : 'Edit limits'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(prev => prev === 'features' ? null : 'features')}
            className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold"
            style={{ background: 'rgba(15,118,110,0.10)', borderColor: 'rgba(15,118,110,0.20)', color: '#0f766e' }}
          >
            <Sparkles className="h-3.5 w-3.5" /> {editing === 'features' ? 'Close entitlements' : 'Edit entitlements'}
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border p-4" style={{ background: '#ffffff', borderColor: '#e8e4ef' }}>
        <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#7b728d' }}>Plan limits</p>
        <div className="mt-4 space-y-2 text-sm">
          {[
            { icon: FileStack, label: 'Monthly Zapps', value: displayLimit(effectiveLimits.maxPresentations, plan.limits.maxPresentations) },
            { icon: Users, label: 'Max participants', value: displayLimit(effectiveLimits.maxParticipantsPerSession, plan.limits.maxParticipantsPerSession) },
            { icon: Zap, label: 'Questions per Zapp', value: displayLimit(effectiveLimits.maxQuestionsPerPresentation, plan.limits.maxQuestionsPerPresentation) },
            { icon: Sparkles, label: 'Live at once', value: displayLimit(effectiveLimits.maxActiveSessions, plan.limits.maxActiveSessions) },
          ].map(item => (
            <div key={item.label} className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-xs" style={{ color: '#7b728d' }}>
                <item.icon className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{item.label}</span>
              </span>
              <span className="max-w-[7rem] break-words text-right font-bold leading-tight" style={{ color: '#1a1a2e' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          { enabled: effectiveFeatures.canUseQuiz, label: 'Live quizzes' },
          { enabled: effectiveFeatures.canUseQA, label: 'Q and A' },
          { enabled: effectiveFeatures.canUseFeedback, label: 'Feedback' },
          { enabled: effectiveFeatures.canExportResults, label: `Exports${effectiveFeatures.exportFormats.length ? ` (${effectiveFeatures.exportFormats.join(', ')})` : ''}` },
          { enabled: effectiveFeatures.canUseBranding, label: 'Branding' },
        ].map(feature => (
          <span key={feature.label} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold" style={{ background: feature.enabled ? 'rgba(83,216,209,0.10)' : '#f4f1fa', borderColor: feature.enabled ? 'rgba(83,216,209,0.16)' : '#e8e4ef', color: feature.enabled ? '#0f766e' : '#7b728d' }}>
            <Check className="h-3 w-3" /> {feature.label}
          </span>
        ))}
      </div>

      {editing === 'limits' && (
        <div className="mt-5">
          <EditLimitsPanel
            plan={plan}
            override={override.limits ?? {}}
            onSave={limits => { onSaveLimits(limits); setEditing(null) }}
            onReset={() => { onResetLimits(); setEditing(null) }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {editing === 'features' && (
        <div className="mt-5">
          <EditFeaturesPanel
            plan={plan}
            override={override.features ?? {}}
            onSave={features => { onSaveFeatures(features); setEditing(null) }}
            onReset={() => { onResetFeatures(); setEditing(null) }}
            onCancel={() => setEditing(null)}
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
  const [isSyncingRates, setIsSyncingRates] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

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
    setLoadError(null)

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
        const rawOverrides = configSnap.val() as Record<string, { limits?: Partial<PlanLimits>; features?: Partial<PlanFeatureFlags> }>
        const loadedOverrides: LimitOverrides = {}
        for (const [planId, config] of Object.entries(rawOverrides)) {
          loadedOverrides[planId as PlanId] = {
            limits: config.limits ?? {},
            features: config.features ?? {},
          }
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
      const msg = error instanceof Error ? error.message : 'Failed to load pricing data'
      setLoadError(msg)
      setSaveStatus('')
    } finally {
      setIsLoading(false)
    }
  }

  async function saveLimitsOverride(planId: PlanId, limits: Partial<PlanLimits>) {
    try {
      await set(ref(rtdb, `admin/planConfig/${planId}/limits`), limits)
      setOverrides(prev => ({
        ...prev,
        [planId]: { ...(prev[planId] ?? {}), limits },
      }))
      invalidatePlanLimitsCache()
      setSaveStatus(`${planId} limits saved`)
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      console.error('Failed to save limits', error)
      const msg = error instanceof Error ? error.message : 'Could not save limits'
      setSaveStatus(`Could not save limits: ${msg}`)
      setTimeout(() => setSaveStatus(''), 6000)
    }
  }

  async function resetLimitsOverride(planId: PlanId) {
    try {
      await set(ref(rtdb, `admin/planConfig/${planId}/limits`), null)
      setOverrides(prev => ({
        ...prev,
        [planId]: { ...(prev[planId] ?? {}), limits: {} },
      }))
      invalidatePlanLimitsCache()
      setSaveStatus(`${planId} limits reset`)
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      console.error('Failed to reset limits', error)
      const msg = error instanceof Error ? error.message : 'Reset failed'
      setSaveStatus(`Could not reset limits: ${msg}`)
      setTimeout(() => setSaveStatus(''), 6000)
    }
  }

  async function saveFeaturesOverride(planId: PlanId, features: Partial<PlanFeatureFlags>) {
    try {
      await set(ref(rtdb, `admin/planConfig/${planId}/features`), features)
      setOverrides(prev => ({
        ...prev,
        [planId]: { ...(prev[planId] ?? {}), features },
      }))
      invalidatePlanLimitsCache()
      setSaveStatus(`${planId} entitlements saved`)
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      console.error('Failed to save entitlements', error)
      const msg = error instanceof Error ? error.message : 'Could not save entitlements'
      setSaveStatus(`Could not save entitlements: ${msg}`)
      setTimeout(() => setSaveStatus(''), 6000)
    }
  }

  async function resetFeaturesOverride(planId: PlanId) {
    try {
      await set(ref(rtdb, `admin/planConfig/${planId}/features`), null)
      setOverrides(prev => ({
        ...prev,
        [planId]: { ...(prev[planId] ?? {}), features: {} },
      }))
      invalidatePlanLimitsCache()
      setSaveStatus(`${planId} entitlements reset`)
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (error) {
      console.error('Failed to reset entitlements', error)
      const msg = error instanceof Error ? error.message : 'Could not reset entitlements'
      setSaveStatus(`Could not reset entitlements: ${msg}`)
      setTimeout(() => setSaveStatus(''), 6000)
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
      const msg = error instanceof Error ? error.message : 'Could not save pricing engine'
      setSaveStatus(`Could not save pricing engine: ${msg}`)
      setTimeout(() => setSaveStatus(''), 6000)
    } finally {
      setIsSavingPricing(false)
    }
  }

  async function syncExchangeRates() {
    setIsSyncingRates(true)
    try {
      const response = await fetch('/api/admin/pricing-rates', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Rate sync failed')
      }

      const nextMeta: PricingMeta = {
        ...pricingMeta,
        exchangeRates: {
          USD: 1,
          GBP: normalizeRate(Number(payload.rates?.GBP), pricingMeta.exchangeRates.GBP),
          INR: normalizeRate(Number(payload.rates?.INR), pricingMeta.exchangeRates.INR),
        },
        exchangeRateSource: String(payload.source ?? 'Frankfurter (ECB)'),
        exchangeRateSyncedAt: String(payload.fetchedAt ?? new Date().toISOString()),
        exchangeRateSyncMethod: payload.method === 'frankfurter' ? 'frankfurter' : 'fallback',
      }

      const nextPricing = buildPricingConfig(baseUsdMonthly, nextMeta)
      await Promise.all([
        set(ref(rtdb, 'admin/pricing'), nextPricing),
        set(ref(rtdb, 'admin/pricingMeta'), nextMeta),
      ])

      setPricingMeta(nextMeta)
      setSavedPricingMeta(nextMeta)
      invalidatePricingCache()
      setSaveStatus('Exchange rates synced and saved')
      setTimeout(() => setSaveStatus(''), 3500)
      await loadData()
    } catch (error) {
      console.error('Failed to sync exchange rates', error)
      const msg = error instanceof Error ? error.message : 'Could not sync exchange rates'
      setSaveStatus(`Could not sync exchange rates: ${msg}`)
      setTimeout(() => setSaveStatus(''), 6000)
    } finally {
      setIsSyncingRates(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4" style={{ borderColor: '#e8e4ef', borderTopColor: '#8f63ff' }} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px] space-y-8 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: '#bda6ff' }}>Admin console</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight" style={{ color: '#1a1a2e' }}>Plans and pricing engine</h1>
          <p className="mt-2 text-sm" style={{ color: '#6d667b' }}>
            Clean up the tier catalogue once, then let LiveZapp generate annual, GBP, and INR pricing consistently everywhere.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {saveStatus && (
            <span
              className="rounded-2xl border px-4 py-2 text-xs font-semibold max-w-[min(100%,28rem)]"
              style={
                /Could not|Failed/i.test(saveStatus)
                  ? { background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }
                  : { background: '#ecf8f7', borderColor: '#bfeae7', color: '#0f766e' }
              }
            >
              {saveStatus}
            </span>
          )}
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold"
            style={{ background: '#ffffff', borderColor: '#e8e4ef', color: '#5f566f' }}
          >
            <RefreshCw className="h-4 w-4" /> Refresh data
          </button>
        </div>
      </div>

      {loadError && (
        <div
          className="rounded-2xl border px-4 py-3 text-sm"
          style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
        >
          <strong className="font-semibold">Could not load plans data.</strong> {loadError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total users', value: totalUsers.toLocaleString(), icon: Users, tone: 'rgba(191,168,255,0.18)' },
          { label: 'Paid subscribers', value: totalPaid.toLocaleString(), icon: TrendingUp, tone: 'rgba(83,216,209,0.18)' },
          { label: 'Current MRR', value: fmtCurrency(totalMRR, 'USD'), icon: BadgeDollarSign, tone: 'rgba(255,177,159,0.18)' },
        ].map(card => (
          <div key={card.label} className="rounded-[1.75rem] border p-5" style={{ background: '#ffffff', borderColor: '#e8e4ef' }}>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: card.tone }}>
                <card.icon className="h-5 w-5" style={{ color: '#1a1a2e' }} />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ color: '#1a1a2e' }}>{card.value}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#7b728d' }}>{card.label}</p>
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
        isSyncingRates={isSyncingRates}
        onSyncRates={() => void syncExchangeRates()}
        onReset={() => {
          setBaseUsdMonthly(savedBaseUsdMonthly)
          setPricingMeta(savedPricingMeta)
        }}
        onSave={() => void savePricingEngine()}
      />

      <section className="rounded-[2rem] border p-6 md:p-8" style={{ background: '#ffffff', borderColor: '#e8e4ef' }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: '#bda6ff' }}>Plan controls</p>
            <h2 className="mt-2 text-2xl font-black" style={{ color: '#1a1a2e' }}>Usage limits and tier detail</h2>
            <p className="mt-2 text-sm" style={{ color: '#6d667b' }}>
              Pricing now uses the shared engine above. Tier cards focus on limits and entitlements; subscriber metrics are summarized in the table below.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold" style={{ background: '#faf8fe', borderColor: '#e8e4ef', color: '#5f566f' }}>
            <Info className="h-4 w-4" />
            If limits or entitlements are changed here, Firebase applies them without a redeploy.
          </div>
        </div>

        <SubscribersByTierTable planStats={planStats} />

        <div className="mt-8 grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
          {PLANS.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              override={overrides[plan.id] ?? {}}
              monthlyPrice={derivedPricing.USD?.[plan.id]?.monthly ?? plan.pricePerMonth}
              annualPrice={derivedPricing.USD?.[plan.id]?.annual ?? plan.pricePerYear}
              onSaveLimits={limits => void saveLimitsOverride(plan.id, limits)}
              onResetLimits={() => void resetLimitsOverride(plan.id)}
              onSaveFeatures={features => void saveFeaturesOverride(plan.id, features)}
              onResetFeatures={() => void resetFeaturesOverride(plan.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
