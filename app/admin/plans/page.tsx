'use client'

import { useState, useEffect } from 'react'
import { ref, get } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import { PLANS, type Plan } from '@/types/plans'
import {
  Zap, Users, FileStack, Check, Star,
  RefreshCw, Eye, TrendingUp,
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

const PLAN_BADGE: Record<string, { bg: string; text: string }> = {
  free:    { bg: '#BBDEF0', text: '#1A1A2E' },
  basic:   { bg: '#00A6A6', text: '#FFFFFF' },
  regular: { bg: '#EFCA08', text: '#1A1A2E' },
  pro:     { bg: '#F08700', text: '#FFFFFF' },
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, stats }: { plan: Plan; stats: PlanStats }) {
  const badge = PLAN_BADGE[plan.id] ?? PLAN_BADGE.free

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
          { label: 'Total users',    val: stats.totalUsers.toLocaleString()  },
          { label: 'Active paid',    val: stats.activeUsers.toLocaleString() },
          { label: 'Monthly billing',val: stats.monthlyUsers.toLocaleString() },
          { label: 'Annual billing', val: stats.annualUsers.toLocaleString() },
          { label: 'MRR contribution', val: fmtUSD(stats.mrr)               },
        ].map(({ label, val }) => (
          <div key={label} className="flex justify-between items-center py-1"
            style={{ borderBottom: '1px solid #F3F4F6' }}>
            <span className="text-xs" style={{ color: '#6B7280' }}>{label}</span>
            <span className="text-xs font-bold" style={{ color: '#1A1A2E' }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Limits */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Plan limits</p>
        {[
          { icon: FileStack, label: 'Lifetime sessions', val: plan.limits.maxPresentations === 'unlimited' ? '∞' : plan.limits.maxPresentations },
          { icon: Users,     label: 'Max participants',  val: plan.limits.maxParticipantsPerSession.toLocaleString() },
          { icon: Zap,       label: 'Questions / session', val: plan.limits.maxQuestionsPerPresentation },
        ].map(({ icon: Icon, label, val }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-xs flex items-center gap-1.5" style={{ color: '#6B7280' }}>
              <Icon className="w-3 h-3" />{label}
            </span>
            <span className="text-xs font-bold" style={{ color: '#1A1A2E' }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="space-y-1.5 pt-1" style={{ borderTop: '1px solid #F3F4F6' }}>
        {[
          { key: 'canExportResults', label: 'Export results'    },
          { key: 'canUseBranding',   label: 'Custom branding'   },
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
        {plan.features.exportFormats && plan.features.exportFormats.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {plan.features.exportFormats.map(fmt => (
              <span key={fmt} className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                style={{ background: 'rgba(0,166,166,0.10)', color: '#007A7A' }}>{fmt}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPlansPage() {
  const [planStats, setPlanStats]   = useState<Record<string, PlanStats>>({})
  const [isLoading, setIsLoading]   = useState(true)
  const [totalMRR, setTotalMRR]     = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setIsLoading(true)
    try {
      const snap = await get(ref(rtdb, 'users'))
      if (!snap.exists()) { setIsLoading(false); return }
      const data = snap.val() as Record<string, any>
      const allUsers = Object.values(data)
      setTotalUsers(allUsers.length)

      const stats: Record<string, PlanStats> = {}
      let totalMrrAcc = 0

      PLANS.forEach(plan => {
        const planUsers = allUsers.filter((u: any) => u.planId === plan.id)
        const activeUsers = plan.pricePerMonth > 0 ? planUsers.filter(isActive) : []
        const monthlyUsers = activeUsers.filter((u: any) => u.billingCycle !== 'annual')
        const annualUsers  = activeUsers.filter((u: any) => u.billingCycle === 'annual')
        const mrr = monthlyUsers.length * plan.pricePerMonth + annualUsers.length * (plan.pricePerYear / 12)
        totalMrrAcc += mrr
        stats[plan.id] = {
          planId: plan.id,
          totalUsers: planUsers.length,
          activeUsers: activeUsers.length,
          monthlyUsers: monthlyUsers.length,
          annualUsers: annualUsers.length,
          mrr,
        }
      })

      setPlanStats(stats)
      setTotalMRR(totalMrrAcc)
    } catch (e) {
      console.error('[admin/plans] load failed', e)
    } finally {
      setIsLoading(false)
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
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Current plan tiers, limits, and subscriber breakdown</p>
        </div>
        <button onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold self-start"
          style={{ background: 'rgba(0,166,166,0.10)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.22)' }}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
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
        <Zap className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#00A6A6' }} />
        <div>
          <p className="text-xs font-semibold" style={{ color: '#1A1A2E' }}>Plans are defined in code</p>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            Pricing and limits are set in <code className="font-mono text-[11px] px-1 py-0.5 rounded" style={{ background: '#E5E7EB' }}>types/plans.ts</code>.
            To change plan pricing or limits, update the file and redeploy. Subscriber counts and MRR shown above are live from Firebase.
          </p>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {PLANS.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            stats={planStats[plan.id] ?? {
              planId: plan.id, totalUsers: 0, activeUsers: 0,
              monthlyUsers: 0, annualUsers: 0, mrr: 0,
            }}
          />
        ))}
      </div>

    </div>
  )
}
