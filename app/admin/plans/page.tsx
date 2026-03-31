'use client'

import { useState, useEffect } from 'react'
import { ref, get, set } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import { PLANS, type Plan, type PlanId, type PlanLimits } from '@/types/plans'
import { invalidatePlanLimitsCache } from '@/lib/hooks/usePlanLimits'
import { type SupportedCurrency, type PricingConfig, type CurrencyPlanPrice, invalidatePricingCache } from '@/lib/hooks/useCurrency'
import {
  Zap, Users, FileStack, Check, Star, Globe,
  RefreshCw, Eye, TrendingUp, Edit2, Save, X, RotateCcw,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanStats {
  planId: string
  totalUsers: number
  activeUsers: number
  monthlyUsers: number
  annualUsers: number
  mrr: number
}

type LimitOverrides = Partial<Record<PlanId, Partial<PlanLimits>>>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function isActive(u: any): boolean {
  if (u.planId === 'free') return false
  if (u.planCancelledAt && !u.planExpiresAt) return false
  if (u.planCancelledAt && u.planExpiresAt) return new Date(u.planExpiresAt) > new Date()
  if (u.planExpiresAt) return new Date(u.planExpiresAt) > new Date()
  return false
}

function displayLimit(val: number | 'unlimited' | undefined, defaultVal: number | 'unlimited'): string {
  const v = val ?? defaultVal
  return v === 'unlimited' ? '∞' : String(v)
}

const PLAN_BADGE: Record<string, { bg: string; text: string }> = {
  free:    { bg: '#BBDEF0', text: '#1A1A2E' },
  basic:   { bg: '#00A6A6', text: '#FFFFFF' },
  regular: { bg: '#EFCA08', text: '#1A1A2E' },
  pro:     { bg: '#F08700', text: '#FFFFFF' },
}

// ─── Editable Limits Panel ────────────────────────────────────────────────────

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
  const [maxPresentations, setMaxPresentations] = useState(
    String(override.maxPresentations ?? defaults.maxPresentations)
  )
  const [maxParticipants, setMaxParticipants] = useState(
    String(override.maxParticipantsPerSession ?? defaults.maxParticipantsPerSession)
  )
  const [maxQuestions, setMaxQuestions] = useState(
    String(override.maxQuestionsPerPresentation ?? defaults.maxQuestionsPerPresentation)
  )
  const [maxSessions, setMaxSessions] = useState(
    String(override.maxActiveSessions ?? defaults.maxActiveSessions)
  )
  const [saving, setSaving] = useState(false)

  const parseLimit = (v: string): number | 'unlimited' => {
    if (v === 'unlimited' || v === '∞' || v === '') return 'unlimited'
    const n = parseInt(v, 10)
    return isNaN(n) ? 0 : n
  }

  async function handleSave() {
    setSaving(true)
    onSave({
      maxPresentations: parseLimit(maxPresentations),
      maxParticipantsPerSession: parseLimit(maxParticipants) as number,
      maxQuestionsPerPresentation: parseLimit(maxQuestions) as number,
      maxActiveSessions: parseLimit(maxSessions) as number,
    })
    setSaving(false)
  }

  const fields = [
    { label: 'Lifetime sessions', value: maxPresentations, set: setMaxPresentations, hint: 'Use "unlimited" for unlimited' },
    { label: 'Max participants / session', value: maxParticipants, set: setMaxParticipants, hint: '' },
    { label: 'Questions / session', value: maxQuestions, set: setMaxQuestions, hint: '' },
    { label: 'Concurrent live sessions', value: maxSessions, set: setMaxSessions, hint: '' },
  ]

  return (
    <div className="space-y-3 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#F08700' }}>Edit limits</p>
      {fields.map(f => (
        <div key={f.label}>
          <label className="block text-[11px] font-semibold mb-1" style={{ color: '#6B7280' }}>{f.label}</label>
          <input
            type="text"
            value={f.value}
            onChange={e => f.set(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm font-bold outline-none transition-all"
            style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#1A1A2E' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#00A6A6' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB' }}
            placeholder={f.hint || 'Enter number'}
          />
          {f.hint && <p className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>{f.hint}</p>}
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          style={{ background: '#00A6A6', color: '#FFFFFF' }}
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onReset}
          className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
          style={{ background: 'rgba(240,135,0,0.10)', color: '#F08700', border: '1px solid rgba(240,135,0,0.22)' }}
          title="Reset to code defaults"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
          style={{ background: '#F3F4F6', color: '#6B7280' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Currency Pricing Editor ──────────────────────────────────────────────────

const CURRENCIES: { code: SupportedCurrency; label: string; symbol: string }[] = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹' },
]

function CurrencyPricingEditor({
  initialPricing,
  onSave,
}: {
  initialPricing: PricingConfig
  onSave: (currency: SupportedCurrency, planId: PlanId, prices: CurrencyPlanPrice) => void
}) {
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('USD')
  const [editing, setEditing] = useState<Partial<Record<PlanId, CurrencyPlanPrice>>>({})
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const currencyConfig = initialPricing[selectedCurrency] ?? {}

  function initEditing(currency: SupportedCurrency) {
    const cfg = initialPricing[currency] ?? {}
    const init: Partial<Record<PlanId, CurrencyPlanPrice>> = {}
    PLANS.filter(p => p.pricePerMonth > 0).forEach(p => {
      init[p.id as PlanId] = cfg[p.id as PlanId] ?? {
        monthly: Math.round(p.pricePerMonth * (currency === 'INR' ? 84 : currency === 'GBP' ? 0.79 : 1)),
        annual:  Math.round(p.pricePerYear  * (currency === 'INR' ? 84 : currency === 'GBP' ? 0.79 : 1)),
      }
    })
    setEditing(init)
    setDirty(false)
  }

  useEffect(() => { initEditing(selectedCurrency) }, [selectedCurrency, initialPricing])

  const sym = CURRENCIES.find(c => c.code === selectedCurrency)?.symbol ?? ''

  async function handleSave() {
    setSaving(true)
    for (const [planId, prices] of Object.entries(editing)) {
      if (prices) await onSave(selectedCurrency, planId as PlanId, prices)
    }
    setSaving(false)
    setDirty(false)
  }

  return (
    <div className="rounded-2xl p-6 space-y-5" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: '#9CA3AF' }}>Per-country pricing</p>
          <h3 className="text-lg font-bold" style={{ color: '#1A1A2E' }}>Configure prices by currency</h3>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Set exact prices for each currency. If not configured, exchange-rate estimates are used for display.</p>
        </div>
        <Globe className="w-6 h-6 shrink-0" style={{ color: '#00A6A6' }} />
      </div>

      {/* Currency selector */}
      <div className="flex gap-2 flex-wrap">
        {CURRENCIES.map(c => (
          <button
            key={c.code}
            onClick={() => setSelectedCurrency(c.code)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: selectedCurrency === c.code ? '#00A6A6' : 'rgba(0,166,166,0.08)',
              color: selectedCurrency === c.code ? '#FFFFFF' : '#00A6A6',
              border: `1px solid ${selectedCurrency === c.code ? '#00A6A6' : 'rgba(0,166,166,0.20)'}`,
            }}
          >
            {c.symbol} {c.code} — {c.label}
          </button>
        ))}
      </div>

      {/* Prices table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Plan</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Monthly ({sym})</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Annual ({sym})</th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {PLANS.filter(p => p.pricePerMonth > 0).map((plan, i) => {
              const planId = plan.id as PlanId
              const prices = editing[planId]
              const hasConfig = !!currencyConfig[planId]
              const badge = PLAN_BADGE[plan.id]
              return (
                <tr key={plan.id} style={{ borderBottom: i < 2 ? '1px solid #F3F4F6' : 'none' }}>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{ background: badge.bg, color: badge.text }}>{plan.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>{sym}</span>
                      <input
                        type="number"
                        min="0"
                        value={prices?.monthly ?? ''}
                        onChange={e => { setEditing(prev => ({ ...prev, [planId]: { ...prev[planId]!, monthly: Number(e.target.value) } })); setDirty(true) }}
                        className="w-24 px-2 py-1.5 rounded-lg text-sm font-bold outline-none"
                        style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#1A1A2E' }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#00A6A6' }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB' }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>{sym}</span>
                      <input
                        type="number"
                        min="0"
                        value={prices?.annual ?? ''}
                        onChange={e => { setEditing(prev => ({ ...prev, [planId]: { ...prev[planId]!, annual: Number(e.target.value) } })); setDirty(true) }}
                        className="w-24 px-2 py-1.5 rounded-lg text-sm font-bold outline-none"
                        style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#1A1A2E' }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#00A6A6' }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB' }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                      style={{ background: hasConfig ? 'rgba(0,166,166,0.10)' : '#F3F4F6', color: hasConfig ? '#00A6A6' : '#9CA3AF' }}>
                      {hasConfig ? 'Configured' : 'Rate estimate'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
          style={{ background: '#00A6A6', color: '#FFFFFF' }}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : `Save ${selectedCurrency} prices`}
        </button>
        <button
          onClick={() => initEditing(selectedCurrency)}
          disabled={!dirty}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: '#F3F4F6', color: '#6B7280' }}
        >
          Reset
        </button>
        {!dirty && <span className="text-xs" style={{ color: '#9CA3AF' }}>All changes saved</span>}
      </div>
    </div>
  )
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan, stats, override,
  onSaveOverride, onResetOverride,
}: {
  plan: Plan
  stats: PlanStats
  override: Partial<PlanLimits>
  onSaveOverride: (limits: Partial<PlanLimits>) => void
  onResetOverride: () => void
}) {
  const [editing, setEditing] = useState(false)
  const badge = PLAN_BADGE[plan.id] ?? PLAN_BADGE.free
  const hasOverride = Object.keys(override).length > 0

  const effectiveLimits = {
    maxPresentations: override.maxPresentations ?? plan.limits.maxPresentations,
    maxParticipantsPerSession: override.maxParticipantsPerSession ?? plan.limits.maxParticipantsPerSession,
    maxQuestionsPerPresentation: override.maxQuestionsPerPresentation ?? plan.limits.maxQuestionsPerPresentation,
    maxActiveSessions: override.maxActiveSessions ?? plan.limits.maxActiveSessions,
  }

  return (
    <div className="rounded-2xl p-6 flex flex-col gap-4"
      style={{
        background: '#FFFFFF',
        border: plan.isRecommended ? '2px solid #00A6A6' : '1px solid #E5E7EB',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        position: 'relative',
      }}>

      {plan.isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white"
            style={{ background: '#00A6A6' }}>
            <Star className="w-3 h-3 fill-white" /> Most popular
          </div>
        </div>
      )}

      {/* Plan header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
            style={{ background: badge.bg, color: badge.text }}>{plan.name}</span>
          {hasOverride && (
            <span className="ml-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(240,135,0,0.12)', color: '#F08700' }}>
              Custom
            </span>
          )}
          <p className="text-xs mt-2" style={{ color: '#6B7280' }}>{plan.tagline}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black" style={{ color: '#1A1A2E' }}>
            {plan.pricePerMonth === 0 ? 'Free' : `$${plan.pricePerMonth}`}
          </p>
          {plan.pricePerMonth > 0 && (
            <p className="text-xs" style={{ color: '#9CA3AF' }}>/month</p>
          )}
        </div>
      </div>

      {/* Subscriber stats */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>Subscriber stats</p>
        {[
          { label: 'Total users',       val: stats.totalUsers.toLocaleString()  },
          { label: 'Active paid',       val: stats.activeUsers.toLocaleString() },
          { label: 'Monthly billing',   val: stats.monthlyUsers.toLocaleString() },
          { label: 'Annual billing',    val: stats.annualUsers.toLocaleString() },
          { label: 'MRR contribution',  val: fmtUSD(stats.mrr) },
        ].map(({ label, val }) => (
          <div key={label} className="flex justify-between items-center py-1" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <span className="text-xs" style={{ color: '#6B7280' }}>{label}</span>
            <span className="text-xs font-bold" style={{ color: '#1A1A2E' }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Limits (read view) */}
      {!editing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Plan limits</p>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
              style={{ background: 'rgba(0,166,166,0.08)', color: '#00A6A6' }}
            >
              <Edit2 className="w-2.5 h-2.5" /> Edit
            </button>
          </div>
          {[
            { icon: FileStack, label: 'Lifetime sessions', val: displayLimit(effectiveLimits.maxPresentations, plan.limits.maxPresentations) },
            { icon: Users,     label: 'Max participants',  val: displayLimit(effectiveLimits.maxParticipantsPerSession, plan.limits.maxParticipantsPerSession) },
            { icon: Zap,       label: 'Questions / session', val: displayLimit(effectiveLimits.maxQuestionsPerPresentation, plan.limits.maxQuestionsPerPresentation) },
          ].map(({ icon: Icon, label, val }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-xs flex items-center gap-1.5" style={{ color: '#6B7280' }}>
                <Icon className="w-3 h-3" />{label}
              </span>
              <span className="text-xs font-bold" style={{ color: hasOverride ? '#F08700' : '#1A1A2E' }}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Edit panel */}
      {editing && (
        <EditLimitsPanel
          plan={plan}
          override={override}
          onSave={limits => { onSaveOverride(limits); setEditing(false) }}
          onReset={() => { onResetOverride(); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* Features */}
      <div className="space-y-1.5 pt-1" style={{ borderTop: '1px solid #F3F4F6' }}>
        {[
          { key: 'canExportResults', label: 'Export results' },
          { key: 'canUseBranding',   label: 'Custom branding' },
        ].map(({ key, label }) => {
          const has = plan.features[key as keyof typeof plan.features]
          return (
            <div key={key} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={{ background: has ? 'rgba(0,166,166,0.10)' : '#F3F4F6' }}>
                <Check className="w-2.5 h-2.5" style={{ color: has ? '#00A6A6' : '#D1D5DB' }} />
              </div>
              <span className="text-xs" style={{ color: has ? '#374151' : '#9CA3AF' }}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPlansPage() {
  const [planStats,    setPlanStats]    = useState<Record<string, PlanStats>>({})
  const [overrides,    setOverrides]    = useState<LimitOverrides>({})
  const [pricingConfig,setPricingConfig]= useState<PricingConfig>({})
  const [isLoading,    setIsLoading]    = useState(true)
  const [totalMRR,     setTotalMRR]     = useState(0)
  const [totalUsers,   setTotalUsers]   = useState(0)
  const [saveStatus,   setSaveStatus]   = useState<string>('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setIsLoading(true)
    try {
      const [usersSnap, configSnap] = await Promise.all([
        get(ref(rtdb, 'users')),
        get(ref(rtdb, 'admin/planConfig')),
      ])

      // Load overrides from Firebase
      if (configSnap.exists()) {
        const raw = configSnap.val() as Record<string, { limits?: Partial<PlanLimits> }>
        const loaded: LimitOverrides = {}
        for (const [planId, cfg] of Object.entries(raw)) {
          if (cfg.limits) loaded[planId as PlanId] = cfg.limits
        }
        setOverrides(loaded)
      }

      // Load pricing config
      const pricingSnap = await get(ref(rtdb, 'admin/pricing'))
      if (pricingSnap.exists()) setPricingConfig(pricingSnap.val() as PricingConfig)

      if (!usersSnap.exists()) { setIsLoading(false); return }
      const data = usersSnap.val() as Record<string, any>
      const allUsers = Object.values(data)
      setTotalUsers(allUsers.length)

      const stats: Record<string, PlanStats> = {}
      let totalMrrAcc = 0

      PLANS.forEach(plan => {
        const planUsers  = allUsers.filter((u: any) => u.planId === plan.id)
        const activeUsers = plan.pricePerMonth > 0 ? planUsers.filter(isActive) : []
        const monthlyUsers = activeUsers.filter((u: any) => u.billingCycle !== 'annual')
        const annualUsers  = activeUsers.filter((u: any) => u.billingCycle === 'annual')
        const mrr = monthlyUsers.length * plan.pricePerMonth + annualUsers.length * (plan.pricePerYear / 12)
        totalMrrAcc += mrr
        stats[plan.id] = { planId: plan.id, totalUsers: planUsers.length, activeUsers: activeUsers.length, monthlyUsers: monthlyUsers.length, annualUsers: annualUsers.length, mrr }
      })

      setPlanStats(stats)
      setTotalMRR(totalMrrAcc)
    } catch (e) {
      console.error('[admin/plans] load failed', e)
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
    } catch (e) {
      console.error('Failed to save limits', e)
      setSaveStatus('Save failed — check permissions')
      setTimeout(() => setSaveStatus(''), 4000)
    }
  }

  async function saveCurrencyPrice(currency: SupportedCurrency, planId: PlanId, prices: CurrencyPlanPrice) {
    try {
      await set(ref(rtdb, `admin/pricing/${currency}/${planId}`), prices)
      setPricingConfig(prev => ({
        ...prev,
        [currency]: { ...(prev[currency] ?? {}), [planId]: prices },
      }))
      invalidatePricingCache()
      setSaveStatus(`${currency} prices saved`)
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (e) {
      console.error('Failed to save pricing', e)
      setSaveStatus('Save failed — check permissions')
      setTimeout(() => setSaveStatus(''), 4000)
    }
  }

  async function resetOverride(planId: PlanId) {
    try {
      await set(ref(rtdb, `admin/planConfig/${planId}/limits`), null)
      setOverrides(prev => { const next = { ...prev }; delete next[planId]; return next })
      invalidatePlanLimitsCache()
      setSaveStatus(`${planId} limits reset to defaults`)
      setTimeout(() => setSaveStatus(''), 3000)
    } catch (e) {
      console.error('Failed to reset limits', e)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 rounded-full animate-spin"
          style={{ borderColor: 'rgba(0,166,166,0.20)', borderTopColor: '#00A6A6' }} />
      </div>
    )
  }

  const totalPaid = PLANS.filter(p => p.pricePerMonth > 0)
    .reduce((s, p) => s + (planStats[p.id]?.activeUsers ?? 0), 0)

  return (
    <div className="space-y-8 pb-12 max-w-7xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: '#9CA3AF' }}>Admin console</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1A1A2E' }}>
            Plans <span style={{ color: '#00A6A6' }}>& Pricing</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Configure plan limits and view subscriber breakdown</p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl" style={{ background: 'rgba(0,166,166,0.10)', color: '#00A6A6' }}>
              {saveStatus}
            </span>
          )}
          <button onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold self-start"
            style={{ background: 'rgba(0,166,166,0.10)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.22)' }}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total users',       val: totalUsers.toLocaleString(),  icon: Users,      color: '#FFFFFF', bg: '#1A1A2E' },
          { label: 'Paid subscribers',  val: totalPaid.toLocaleString(),   icon: TrendingUp, color: '#FFFFFF', bg: '#00A6A6' },
          { label: 'Total MRR',         val: fmtUSD(totalMRR),            icon: Eye,        color: '#1A1A2E', bg: '#EFCA08' },
        ].map(({ label, val, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-black" style={{ color: '#1A1A2E' }}>{val}</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Notice */}
      <div className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: 'rgba(0,166,166,0.06)', border: '1px solid rgba(0,166,166,0.18)' }}>
        <Edit2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#00A6A6' }} />
        <div>
          <p className="text-xs font-semibold" style={{ color: '#1A1A2E' }}>Live overrides — no redeploy needed</p>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            Edited limits are saved to Firebase and take effect within 5 minutes for all users.
            Base defaults are in <code className="font-mono text-[11px] px-1 py-0.5 rounded" style={{ background: '#E5E7EB' }}>types/plans.ts</code>.
            Use the reset button (<RotateCcw className="inline w-3 h-3" />) to revert any plan to its coded defaults.
          </p>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {PLANS.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            stats={planStats[plan.id] ?? { planId: plan.id, totalUsers: 0, activeUsers: 0, monthlyUsers: 0, annualUsers: 0, mrr: 0 }}
            override={overrides[plan.id as PlanId] ?? {}}
            onSaveOverride={limits => saveOverride(plan.id as PlanId, limits)}
            onResetOverride={() => resetOverride(plan.id as PlanId)}
          />
        ))}
      </div>

      {/* Per-currency pricing */}
      <CurrencyPricingEditor
        initialPricing={pricingConfig}
        onSave={saveCurrencyPrice}
      />

    </div>
  )
}
