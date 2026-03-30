'use client'

import { useState, useEffect } from 'react'
import { ref, get } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import { PLANS } from '@/types/plans'
import {
  DollarSign, TrendingUp, Users, BarChart3,
  RefreshCw, Download, CreditCard, AlertCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserFinancial {
  uid:            string
  name:           string
  email:          string
  planId:         string
  billingCycle:   'monthly' | 'annual' | null
  planExpiresAt:  string | null
  planCancelledAt:string | null
  createdAt:      string | null
}

interface PlanRevenue {
  planId:       string
  name:         string
  count:        number
  monthlyRev:   number
  annualCount:  number
  monthlyCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function isActivePlan(u: UserFinancial): boolean {
  if (u.planId === 'free') return false
  if (u.planCancelledAt) {
    if (!u.planExpiresAt) return false
    return new Date(u.planExpiresAt) > new Date()
  }
  if (u.planExpiresAt) return new Date(u.planExpiresAt) > new Date()
  return false
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, bg,
}: {
  label: string; value: string; sub: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  color: string; bg: string
}) {
  return (
    <div className="rounded-2xl p-6"
      style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-black mb-1" style={{ color: '#1A1A2E' }}>{value}</p>
      <p className="text-xs font-semibold mb-0.5" style={{ color: '#1A1A2E' }}>{label}</p>
      <p className="text-xs" style={{ color: '#9CA3AF' }}>{sub}</p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminFinancialsPage() {
  const [users, setUsers]         = useState<UserFinancial[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setIsLoading(true)
    try {
      const snap = await get(ref(rtdb, 'users'))
      if (!snap.exists()) { setUsers([]); return }
      const data = snap.val() as Record<string, any>
      const rows: UserFinancial[] = Object.entries(data).map(([uid, u]) => ({
        uid,
        name:           u.name          ?? 'Unknown',
        email:          u.email         ?? '—',
        planId:         u.planId        ?? 'free',
        billingCycle:   u.billingCycle  ?? null,
        planExpiresAt:  u.planExpiresAt ?? null,
        planCancelledAt:u.planCancelledAt ?? null,
        createdAt:      u.createdAt     ?? null,
      }))
      setUsers(rows)
    } catch (e) {
      console.error('[admin/financials] load failed', e)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Revenue calculations ──────────────────────────────────────────────────

  const paidActive = users.filter(isActivePlan)

  // MRR: monthly users × monthly price + annual users × (annual price / 12)
  const mrr = paidActive.reduce((sum, u) => {
    const plan = PLANS.find(p => p.id === u.planId)
    if (!plan) return sum
    if (u.billingCycle === 'annual') return sum + plan.pricePerYear / 12
    return sum + plan.pricePerMonth
  }, 0)

  const arr  = mrr * 12
  const arpu = paidActive.length > 0 ? mrr / paidActive.length : 0

  // Plan distribution (all users, not just active-paid)
  const planRevenue: PlanRevenue[] = PLANS.filter(p => p.pricePerMonth > 0).map(plan => {
    const planUsers = paidActive.filter(u => u.planId === plan.id)
    const annualCount  = planUsers.filter(u => u.billingCycle === 'annual').length
    const monthlyCount = planUsers.filter(u => u.billingCycle !== 'annual').length
    return {
      planId:      plan.id,
      name:        plan.name,
      count:       planUsers.length,
      monthlyRev:  annualCount * (plan.pricePerYear / 12) + monthlyCount * plan.pricePerMonth,
      annualCount,
      monthlyCount,
    }
  })

  const totalFree = users.filter(u => u.planId === 'free').length

  // Plan distribution for ALL users (including free)
  const allPlanDist = PLANS.map(plan => ({
    id:    plan.id,
    name:  plan.name,
    count: users.filter(u => u.planId === plan.id).length,
    color: plan.id === 'free' ? '#BBDEF0' : plan.id === 'basic' ? '#00A6A6' : plan.id === 'regular' ? '#EFCA08' : '#F08700',
    textColor: plan.id === 'free' || plan.id === 'regular' ? '#1A1A2E' : '#FFFFFF',
  }))
  const totalForDist = users.length || 1

  // Upcoming renewals (next 30 days)
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 86400000)
  const upcomingRenewals = paidActive.filter(u => {
    if (!u.planExpiresAt || u.planCancelledAt) return false
    const exp = new Date(u.planExpiresAt)
    return exp >= now && exp <= in30
  })

  // Cancelled but still active
  const cancelledActive = paidActive.filter(u => u.planCancelledAt).length

  // Admin-gifted: paid plan, no billing cycle (manually elevated without payment)
  const adminGifted = users.filter(u => u.planId !== 'free' && !u.billingCycle)

  function exportCSV() {
    const rows = [
      ['Name', 'Email', 'Plan', 'Billing', 'Status', 'Expires'],
      ...paidActive.map(u => [
        u.name, u.email, u.planId, u.billingCycle ?? '—',
        u.planCancelledAt ? 'Cancelled' : 'Active',
        u.planExpiresAt ? new Date(u.planExpiresAt).toLocaleDateString() : '—',
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `livezapp-revenue-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 rounded-full animate-spin"
          style={{ borderColor: 'rgba(0,166,166,0.20)', borderTopColor: '#00A6A6' }} />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12 max-w-6xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: '#9CA3AF' }}>Admin console</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1A1A2E' }}>
            Financials <span style={{ color: '#00A6A6' }}>Overview</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Revenue metrics from active subscriptions · PayPal billing</p>
        </div>
        <div className="flex gap-2 self-start">
          <button onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(0,166,166,0.10)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.22)' }}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#1A1A2E', color: '#FFFFFF' }}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="MRR" value={fmtUSD(mrr)}
          sub="Monthly recurring revenue" icon={DollarSign}
          color="#FFFFFF" bg="#00A6A6" />
        <KpiCard label="ARR" value={fmtUSD(arr)}
          sub="Annualised recurring revenue" icon={TrendingUp}
          color="#1A1A2E" bg="#EFCA08" />
        <KpiCard label="Paid subscribers" value={paidActive.length.toString()}
          sub={`${totalFree} on free plan`} icon={Users}
          color="#FFFFFF" bg="#F08700" />
        <KpiCard label="ARPU" value={fmtUSD(arpu)}
          sub="Avg revenue per paid user" icon={CreditCard}
          color="#1A1A2E" bg="#F49F0A" />
      </div>

      {/* Plan revenue + distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Plan revenue breakdown */}
        <div className="rounded-2xl p-6 space-y-5"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: '#1A1A2E' }}>Revenue by plan</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Active paid subscribers and their contribution</p>
          </div>
          {planRevenue.map(pr => {
            const mrrPct = mrr > 0 ? Math.round((pr.monthlyRev / mrr) * 100) : 0
            const badge = { free: { bg: '#BBDEF0', text: '#1A1A2E' }, basic: { bg: '#00A6A6', text: '#FFFFFF' }, regular: { bg: '#EFCA08', text: '#1A1A2E' }, pro: { bg: '#F08700', text: '#FFFFFF' } }[pr.planId] ?? { bg: '#BBDEF0', text: '#1A1A2E' }
            return (
              <div key={pr.planId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{ background: badge.bg, color: badge.text }}>
                      {pr.name}
                    </span>
                    <span className="text-xs" style={{ color: '#6B7280' }}>
                      {pr.count} sub{pr.count !== 1 ? 's' : ''}
                      {pr.annualCount > 0 && ` · ${pr.annualCount} annual`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold" style={{ color: '#1A1A2E' }}>{fmtUSD(pr.monthlyRev)}</span>
                    <span className="text-xs ml-1" style={{ color: '#9CA3AF' }}>/mo</span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${mrrPct}%`, background: badge.bg === '#BBDEF0' ? '#9CA3AF' : badge.bg }} />
                </div>
              </div>
            )
          })}
          {planRevenue.every(pr => pr.count === 0) && (
            <div className="text-center py-6">
              <BarChart3 className="w-8 h-8 mx-auto mb-2" style={{ color: '#E5E7EB' }} />
              <p className="text-sm" style={{ color: '#9CA3AF' }}>No paid subscribers yet</p>
            </div>
          )}
        </div>

        {/* Plan distribution (all users) */}
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: '#1A1A2E' }}>All users by plan</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Including free tier · {users.length} total</p>
          </div>
          {allPlanDist.map(p => {
            const pct = Math.round((p.count / totalForDist) * 100)
            return (
              <div key={p.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                      style={{ background: p.color, color: p.textColor }}>{p.name}</span>
                    <span style={{ color: '#374151' }}>{p.count} users</span>
                  </div>
                  <span className="font-bold" style={{ color: '#6B7280' }}>{pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Alerts row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Upcoming renewals */}
        <div className="rounded-2xl p-6"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: '#00A6A6' }} />
            <h2 className="text-sm font-bold" style={{ color: '#1A1A2E' }}>Renewals due (next 30 days)</h2>
            <span className="ml-auto text-lg font-black" style={{ color: '#00A6A6' }}>{upcomingRenewals.length}</span>
          </div>
          {upcomingRenewals.length === 0 ? (
            <p className="text-xs" style={{ color: '#9CA3AF' }}>No renewals in the next 30 days</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {upcomingRenewals.slice(0, 10).map(u => {
                const plan = PLANS.find(p => p.id === u.planId)
                const daysLeft = Math.ceil((new Date(u.planExpiresAt!).getTime() - Date.now()) / 86400000)
                return (
                  <div key={u.uid} className="flex items-center justify-between py-2"
                    style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#1A1A2E' }}>{u.name}</p>
                      <p className="text-[11px]" style={{ color: '#9CA3AF' }}>{u.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold" style={{ color: daysLeft <= 7 ? '#DC2626' : '#F08700' }}>
                        {daysLeft}d left
                      </p>
                      <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
                        {plan ? fmtUSD(u.billingCycle === 'annual' ? plan.pricePerYear : plan.pricePerMonth) : '—'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cancelled but still active */}
        <div className="rounded-2xl p-6"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4" style={{ color: '#F08700' }} />
            <h2 className="text-sm font-bold" style={{ color: '#1A1A2E' }}>Cancelled — still active</h2>
            <span className="ml-auto text-lg font-black" style={{ color: '#F08700' }}>{cancelledActive}</span>
          </div>
          {cancelledActive === 0 ? (
            <p className="text-xs" style={{ color: '#9CA3AF' }}>No users with cancelled but still-active plans</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {paidActive.filter(u => u.planCancelledAt).slice(0, 10).map(u => (
                <div key={u.uid} className="flex items-center justify-between py-2"
                  style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#1A1A2E' }}>{u.name}</p>
                    <p className="text-[11px]" style={{ color: '#9CA3AF' }}>{u.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: '#F08700' }}>Cancelled</p>
                    <p className="text-[11px]" style={{ color: '#9CA3AF' }}>
                      Expires {u.planExpiresAt ? new Date(u.planExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin-gifted section */}
      {adminGifted.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#FFFFFF', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'rgba(99,102,241,0.05)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
              <Users className="w-4 h-4" style={{ color: '#6366F1' }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: '#1A1A2E' }}>Admin-gifted accounts</h2>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{adminGifted.length} users with elevated plans — not paying</p>
            </div>
            <span className="ml-auto text-lg font-black" style={{ color: '#6366F1' }}>{adminGifted.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
                  {['User', 'Plan', 'Gifted at', 'Note'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adminGifted.map((u, i) => {
                  const badge = { basic: { bg: '#00A6A6', text: '#FFFFFF' }, regular: { bg: '#EFCA08', text: '#1A1A2E' }, pro: { bg: '#F08700', text: '#FFFFFF' } }[u.planId] ?? { bg: '#BBDEF0', text: '#1A1A2E' }
                  return (
                    <tr key={u.uid}
                      style={{ borderBottom: i < adminGifted.length - 1 ? '1px solid #F5F7FA' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-semibold" style={{ color: '#1A1A2E' }}>{u.name}</p>
                        <p className="text-[11px]" style={{ color: '#9CA3AF' }}>{u.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg" style={{ background: badge.bg, color: badge.text }}>{u.planId}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366F1' }}>Gift</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>No payment — admin elevated</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active subscriber table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <h2 className="text-base font-bold" style={{ color: '#1A1A2E' }}>Active subscribers</h2>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{paidActive.length} accounts with active paid plans</p>
        </div>
        {paidActive.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-8 h-8 mx-auto mb-2" style={{ color: '#E5E7EB' }} />
            <p className="text-sm" style={{ color: '#9CA3AF' }}>No paid subscribers yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
                  {['User', 'Plan', 'Billing', 'Monthly value', 'Expires', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: '#9CA3AF' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paidActive.map((u, i) => {
                  const plan  = PLANS.find(p => p.id === u.planId)
                  const badge = { free: { bg: '#BBDEF0', text: '#1A1A2E' }, basic: { bg: '#00A6A6', text: '#FFFFFF' }, regular: { bg: '#EFCA08', text: '#1A1A2E' }, pro: { bg: '#F08700', text: '#FFFFFF' } }[u.planId] ?? { bg: '#BBDEF0', text: '#1A1A2E' }
                  const moVal = plan ? (u.billingCycle === 'annual' ? plan.pricePerYear / 12 : plan.pricePerMonth) : 0
                  const isCancelled = !!u.planCancelledAt
                  return (
                    <tr key={u.uid}
                      style={{ borderBottom: i < paidActive.length - 1 ? '1px solid #F5F7FA' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-semibold" style={{ color: '#1A1A2E' }}>{u.name}</p>
                        <p className="text-[11px]" style={{ color: '#9CA3AF' }}>{u.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg"
                          style={{ background: badge.bg, color: badge.text }}>{u.planId}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs capitalize" style={{ color: '#374151' }}>{u.billingCycle ?? '—'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-bold" style={{ color: '#1A1A2E' }}>{fmtUSD(moVal)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>
                          {u.planExpiresAt ? new Date(u.planExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                          style={isCancelled
                            ? { background: 'rgba(245,158,11,0.12)', color: '#B45309' }
                            : { background: 'rgba(34,197,94,0.10)', color: '#16A34A' }}>
                          {isCancelled ? 'Cancelled' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
