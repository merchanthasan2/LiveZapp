'use client'

import { useState, useEffect } from 'react'
import { ref, get, set, update } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import { useAuth } from '@/lib/hooks/useAuth'
import { PLANS } from '@/types/plans'
import {
  Tag, Plus, Copy, Check, X, RefreshCw,
  Calendar, Users, Percent, DollarSign,
  AlertCircle, CheckCircle2, Loader2, ExternalLink,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromoCode {
  code:              string
  discountType:      'percent' | 'fixed'
  discountValue:     number
  maxRedemptions:    number | null   // null = unlimited
  currentRedemptions:number
  validFrom:         string
  validUntil:        string | null
  applicablePlanIds: string[]        // [] = all plans
  isActive:          boolean
  createdAt:         string
  createdBy:         string
  // Duration rules
  durationMonths:    number | null   // null = permanent; e.g. 3 = discount lasts 3 months then drops
  postExpiryPlanId:  string | null   // plan to drop to after duration (null = stay on plan)
  targetPlanId:      string | null   // if set: grant user this plan (bypasses normal upgrade flow)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isExpired(promo: PromoCode): boolean {
  if (!promo.validUntil) return false
  return new Date(promo.validUntil) < new Date()
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ─── Create modal ─────────────────────────────────────────────────────────────

const SITE_URL = 'https://live-zapp.com'

function CreateModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (promo: Omit<PromoCode, 'currentRedemptions' | 'createdAt' | 'createdBy'>) => Promise<void>
}) {
  const [code, setCode]             = useState(generateCode())
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [discountValue, setDiscountValue] = useState('')
  const [maxRedemptions, setMaxRedemptions] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [applicablePlans, setApplicablePlans] = useState<string[]>([])
  const [durationMonths, setDurationMonths] = useState('')
  const [postExpiryPlanId, setPostExpiryPlanId] = useState('free')
  const [targetPlanId, setTargetPlanId] = useState('')
  const [isSaving, setIsSaving]     = useState(false)
  const [error, setError]           = useState('')

  const promoLink = `${SITE_URL}/register?promo=${code.trim().toUpperCase() || 'CODE'}`

  async function handleSubmit() {
    const val = parseFloat(discountValue)
    if (!code.trim()) { setError('Code is required'); return }
    if (!discountValue || isNaN(val) || val <= 0) { setError('Enter a valid discount value'); return }
    if (discountType === 'percent' && val > 100) { setError('Percent discount cannot exceed 100%'); return }

    setIsSaving(true)
    setError('')
    try {
      await onCreate({
        code:              code.trim().toUpperCase(),
        discountType,
        discountValue:     val,
        maxRedemptions:    maxRedemptions ? parseInt(maxRedemptions) : null,
        validFrom:         new Date().toISOString(),
        validUntil:        validUntil ? new Date(validUntil).toISOString() : null,
        applicablePlanIds: applicablePlans,
        isActive:          true,
        durationMonths:    durationMonths ? parseInt(durationMonths) : null,
        postExpiryPlanId:  durationMonths ? postExpiryPlanId : null,
        targetPlanId:      targetPlanId || null,
      })
    } catch (e: any) {
      setError(e.message || 'Failed to create promo code')
    } finally {
      setIsSaving(false)
    }
  }

  function togglePlan(planId: string) {
    setApplicablePlans(prev =>
      prev.includes(planId) ? prev.filter(p => p !== planId) : [...prev, planId]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl p-6 space-y-4 z-10"
        style={{ background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.20)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: '#1A1A2E' }}>Create promo code</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" style={{ color: '#6B7280' }} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626' }}>
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Code */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Code</label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm font-mono outline-none"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#1A1A2E' }}
              placeholder="LAUNCH50"
            />
            <button onClick={() => setCode(generateCode())}
              className="px-3 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}>
              Random
            </button>
          </div>
        </div>

        {/* Discount type + value */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Discount type</label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
              {(['percent', 'fixed'] as const).map(t => (
                <button key={t} onClick={() => setDiscountType(t)}
                  className="flex-1 py-2.5 text-xs font-semibold transition-all"
                  style={discountType === t ? { background: '#1A1A2E', color: '#FFFFFF' } : { background: '#F5F7FA', color: '#6B7280' }}>
                  {t === 'percent' ? '% Off' : '$ Off'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
              Value {discountType === 'percent' ? '(%)' : '(USD)'}
            </label>
            <input
              type="number"
              min="1"
              max={discountType === 'percent' ? '100' : undefined}
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#1A1A2E' }}
              placeholder={discountType === 'percent' ? '25' : '10'}
            />
          </div>
        </div>

        {/* Max redemptions + expiry */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Max uses (blank = ∞)</label>
            <input
              type="number"
              min="1"
              value={maxRedemptions}
              onChange={e => setMaxRedemptions(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#1A1A2E' }}
              placeholder="Unlimited"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Valid until</label>
            <input
              type="date"
              value={validUntil}
              onChange={e => setValidUntil(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#1A1A2E' }}
            />
          </div>
        </div>

        {/* Applicable plans */}
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
            Applicable plans <span className="font-normal" style={{ color: '#9CA3AF' }}>(leave empty = all paid plans)</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {PLANS.filter(p => p.pricePerMonth > 0).map(p => {
              const selected = applicablePlans.includes(p.id)
              return (
                <button key={p.id} onClick={() => togglePlan(p.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                  style={selected
                    ? { background: '#1A1A2E', color: '#FFFFFF' }
                    : { background: '#F5F7FA', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                  {p.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Duration rules */}
        <div className="rounded-xl p-4 space-y-3" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <p className="text-xs font-semibold" style={{ color: '#374151' }}>Duration rule (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: '#6B7280' }}>
                Discount lasts (months)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={durationMonths}
                onChange={e => setDurationMonths(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1A1A2E' }}
                placeholder="Blank = permanent"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: '#6B7280' }}>
                Drop to plan after
              </label>
              <select
                value={postExpiryPlanId}
                onChange={e => setPostExpiryPlanId(e.target.value)}
                disabled={!durationMonths}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1A1A2E' }}
              >
                {PLANS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          {durationMonths && (
            <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
              After {durationMonths} month{parseInt(durationMonths) !== 1 ? 's' : ''}, user will be moved to the <strong>{postExpiryPlanId}</strong> plan automatically.
            </p>
          )}
        </div>

        {/* Grant specific plan */}
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>
            Grant plan on redeem <span className="font-normal" style={{ color: '#9CA3AF' }}>(optional — overrides normal upgrade)</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setTargetPlanId('')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={!targetPlanId ? { background: '#1A1A2E', color: '#FFFFFF' } : { background: '#F5F7FA', color: '#6B7280', border: '1px solid #E5E7EB' }}
            >
              None
            </button>
            {PLANS.filter(p => p.pricePerMonth > 0).map(p => (
              <button key={p.id} onClick={() => setTargetPlanId(p.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                style={targetPlanId === p.id ? { background: '#1A1A2E', color: '#FFFFFF' } : { background: '#F5F7FA', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Promo link preview */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(0,166,166,0.06)', border: '1px solid rgba(0,166,166,0.20)' }}>
          <p className="text-[11px] font-semibold mb-2" style={{ color: '#00A6A6' }}>Shareable promo link</p>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-mono flex-1 truncate" style={{ color: '#1A1A2E' }}>{promoLink}</p>
            <button
              onClick={() => navigator.clipboard.writeText(promoLink)}
              className="p-1.5 rounded-lg flex-shrink-0"
              style={{ background: 'rgba(0,166,166,0.12)', color: '#00A6A6' }}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: '#9CA3AF' }}>User lands on register page with code pre-filled</p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={{ background: '#00A6A6', color: '#FFFFFF' }}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {isSaving ? 'Creating…' : 'Create promo code'}
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPromosPage() {
  const { user } = useAuth()
  const [promos, setPromos]         = useState<PromoCode[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [toastMsg, setToastMsg]     = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => { loadData() }, [])

  function showToast(text: string, ok = true) {
    setToastMsg({ text, ok })
    setTimeout(() => setToastMsg(null), 4000)
  }

  async function loadData() {
    setIsLoading(true)
    try {
      const snap = await get(ref(rtdb, 'promoCodes'))
      if (!snap.exists()) { setPromos([]); return }
      const data = snap.val() as Record<string, PromoCode>
      setPromos(Object.values(data).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
    } catch (e) {
      console.error('[admin/promos] load failed', e)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreate(promo: Omit<PromoCode, 'currentRedemptions' | 'createdAt' | 'createdBy'>) {
    const existing = await get(ref(rtdb, `promoCodes/${promo.code}`))
    if (existing.exists()) throw new Error(`Code "${promo.code}" already exists`)

    const full: PromoCode = {
      ...promo,
      currentRedemptions: 0,
      createdAt: new Date().toISOString(),
      createdBy: user?.id ?? 'admin',
    }
    await set(ref(rtdb, `promoCodes/${promo.code}`), full)
    setPromos(prev => [full, ...prev])
    setShowCreate(false)
    showToast(`Promo code ${promo.code} created`)
  }

  async function handleDeactivate(code: string) {
    await update(ref(rtdb, `promoCodes/${code}`), { isActive: false })
    setPromos(prev => prev.map(p => p.code === code ? { ...p, isActive: false } : p))
    showToast(`${code} deactivated`)
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const activeCount   = promos.filter(p => p.isActive && !isExpired(p)).length
  const expiredCount  = promos.filter(p => isExpired(p)).length
  const totalUses     = promos.reduce((s, p) => s + p.currentRedemptions, 0)

  return (
    <div className="space-y-6 pb-12 max-w-5xl relative">

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg"
          style={{ background: toastMsg.ok ? '#1A1A2E' : '#DC2626', color: '#FFFFFF' }}>
          {toastMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toastMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: '#9CA3AF' }}>Admin console</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1A1A2E' }}>
            Promo <span style={{ color: '#00A6A6' }}>Codes</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Create and manage discount codes for plan upgrades</p>
        </div>
        <div className="flex gap-2 self-start">
          <button onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(0,166,166,0.10)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.22)' }}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#1A1A2E', color: '#FFFFFF' }}>
            <Plus className="w-4 h-4" /> Create code
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Active codes',   val: activeCount,  bg: '#22C55E', icon: CheckCircle2 },
          { label: 'Expired codes',  val: expiredCount, bg: '#9CA3AF', icon: Calendar     },
          { label: 'Total uses',     val: totalUses,    bg: '#00A6A6', icon: Users        },
        ].map(t => {
          const Icon = t.icon
          return (
            <div key={t.label} className="rounded-2xl p-5 flex items-center gap-4"
              style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.bg }}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-black" style={{ color: '#1A1A2E' }}>{t.val}</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>{t.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="w-8 h-8 border-4 rounded-full animate-spin"
              style={{ borderColor: 'rgba(0,166,166,0.20)', borderTopColor: '#00A6A6' }} />
          </div>
        ) : promos.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Tag className="w-10 h-10 mx-auto" style={{ color: '#E5E7EB' }} />
            <p className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>No promo codes yet</p>
            <button onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: '#1A1A2E', color: '#FFFFFF' }}>
              <Plus className="w-4 h-4" /> Create your first code
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
                  {['Code / Link', 'Discount', 'Duration', 'Uses', 'Valid until', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: '#9CA3AF' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {promos.map((p, i) => {
                  const expired  = isExpired(p)
                  const statusOk = p.isActive && !expired
                  return (
                    <tr key={p.code}
                      style={{ borderBottom: i < promos.length - 1 ? '1px solid #F5F7FA' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {/* Code + link */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold" style={{ color: '#1A1A2E' }}>{p.code}</span>
                          <button onClick={() => copyCode(p.code)}
                            className="p-1 rounded hover:bg-gray-100 transition-colors" title="Copy code">
                            {copiedCode === p.code
                              ? <Check className="w-3 h-3" style={{ color: '#22C55E' }} />
                              : <Copy className="w-3 h-3" style={{ color: '#9CA3AF' }} />}
                          </button>
                          <button
                            onClick={() => { const link = `${SITE_URL}/register?promo=${p.code}`; navigator.clipboard.writeText(link); setCopiedCode(`link_${p.code}`); setTimeout(() => setCopiedCode(null), 2000) }}
                            className="p-1 rounded hover:bg-gray-100 transition-colors" title="Copy promo link"
                          >
                            {copiedCode === `link_${p.code}`
                              ? <Check className="w-3 h-3" style={{ color: '#22C55E' }} />
                              : <ExternalLink className="w-3 h-3" style={{ color: '#9CA3AF' }} />}
                          </button>
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>
                          Created {fmtDate(p.createdAt)}
                        </p>
                      </td>
                      {/* Discount */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {p.discountType === 'percent'
                            ? <Percent className="w-3.5 h-3.5" style={{ color: '#00A6A6' }} />
                            : <DollarSign className="w-3.5 h-3.5" style={{ color: '#F08700' }} />}
                          <span className="text-sm font-bold" style={{ color: '#1A1A2E' }}>
                            {p.discountType === 'percent' ? `${p.discountValue}% off` : `$${p.discountValue} off`}
                          </span>
                        </div>
                        {p.targetPlanId && (
                          <p className="text-[10px] mt-0.5" style={{ color: '#6366F1' }}>Grants {p.targetPlanId} plan</p>
                        )}
                      </td>
                      {/* Duration */}
                      <td className="px-5 py-3.5">
                        {p.durationMonths ? (
                          <div>
                            <span className="text-xs font-semibold" style={{ color: '#1A1A2E' }}>{p.durationMonths}mo</span>
                            {p.postExpiryPlanId && (
                              <p className="text-[10px]" style={{ color: '#9CA3AF' }}>→ {p.postExpiryPlanId} after</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: '#9CA3AF' }}>Permanent</span>
                        )}
                      </td>
                      {/* Uses */}
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold" style={{ color: '#374151' }}>
                          {p.currentRedemptions}
                          <span className="font-normal" style={{ color: '#9CA3AF' }}>
                            {p.maxRedemptions ? ` / ${p.maxRedemptions}` : ' / ∞'}
                          </span>
                        </span>
                      </td>
                      {/* Valid until */}
                      <td className="px-5 py-3.5">
                        <span className="text-xs" style={{ color: expired ? '#DC2626' : '#9CA3AF' }}>
                          {fmtDate(p.validUntil)}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                          style={statusOk
                            ? { background: 'rgba(34,197,94,0.10)', color: '#16A34A' }
                            : expired
                            ? { background: '#F3F4F6', color: '#9CA3AF' }
                            : { background: 'rgba(239,68,68,0.08)', color: '#DC2626' }}>
                          {expired ? 'Expired' : statusOk ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-3.5">
                        {statusOk && (
                          <button
                            onClick={() => handleDeactivate(p.code)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                            style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.15)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}>
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
