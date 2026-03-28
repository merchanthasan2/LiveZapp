'use client'

import { useState, useEffect } from 'react'
import { ref, get } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import { PLANS } from '@/types/plans'
import {
  Users, TrendingUp, Shield, Activity,
  FileStack, DollarSign, CheckCircle2, Ban,
  RefreshCw, CreditCard, Clock,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewData {
  totalUsers:        number
  activeUsers30d:    number
  paidUsers:         number
  suspendedUsers:    number
  totalSessions:     number
  liveSessions:      number
  totalParticipants: number
  mrr:               number
  planDist:          { id: string; name: string; count: number; color: string; textColor: string }[]
  recentUsers:       { name: string; email: string; planId: string; createdAt: string | null }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function isActive(u: any): boolean {
  if (u.planId === 'free') return false
  if (u.planCancelledAt && !u.planExpiresAt) return false
  if (u.planExpiresAt) return new Date(u.planExpiresAt) > new Date()
  return false
}

const PLAN_BADGE: Record<string, { bg: string; text: string }> = {
  free:    { bg: '#BBDEF0', text: '#1A1A2E' },
  basic:   { bg: '#00A6A6', text: '#FFFFFF' },
  regular: { bg: '#EFCA08', text: '#1A1A2E' },
  pro:     { bg: '#F08700', text: '#FFFFFF' },
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, bg, text,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  bg: string; text: string
}) {
  return (
    <div className="rounded-2xl p-5"
      style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
          <Icon className="w-5 h-5" style={{ color: text }} />
        </div>
      </div>
      <p className="text-2xl font-bold mb-1" style={{ color: '#1A1A2E' }}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-xs font-semibold mb-0.5" style={{ color: '#374151' }}>{label}</p>
      {sub && <p className="text-xs" style={{ color: '#9CA3AF' }}>{sub}</p>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  const [data, setData]           = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setIsLoading(true)
    try {
      const [usersSnap, presSnap] = await Promise.all([
        get(ref(rtdb, 'users')),
        get(ref(rtdb, 'presentations')),
      ])

      const usersData = usersSnap.exists() ? usersSnap.val() as Record<string, any> : {}
      const presData  = presSnap.exists()  ? presSnap.val()  as Record<string, any> : {}

      const allUsers = Object.values(usersData)
      const allPres  = Object.values(presData)

      // User stats
      const now      = Date.now()
      const in30days = 30 * 86400000
      const totalUsers     = allUsers.length
      const activeUsers30d = allUsers.filter(u => u.lastLoginAt && (now - new Date(u.lastLoginAt).getTime()) < in30days).length
      const paidUsers      = allUsers.filter(isActive).length
      const suspendedUsers = allUsers.filter(u => u.suspended).length

      // MRR
      const mrr = allUsers.filter(isActive).reduce((sum, u) => {
        const plan = PLANS.find(p => p.id === u.planId)
        if (!plan) return sum
        return sum + (u.billingCycle === 'annual' ? plan.pricePerYear / 12 : plan.pricePerMonth)
      }, 0)

      // Session stats
      const totalSessions     = allPres.length
      const liveSessions      = allPres.filter(p => p.status === 'live' || p.status === 'active').length
      const totalParticipants = allPres.reduce((s, p) => s + (p.audienceSize ?? p.participantCount ?? 0), 0)

      // Plan distribution
      const planDist = PLANS.map(plan => ({
        id:        plan.id,
        name:      plan.name,
        count:     allUsers.filter(u => u.planId === plan.id).length,
        color:     plan.id === 'free' ? '#BBDEF0' : plan.id === 'basic' ? '#00A6A6' : plan.id === 'regular' ? '#EFCA08' : '#F08700',
        textColor: plan.id === 'free' || plan.id === 'regular' ? '#1A1A2E' : '#FFFFFF',
      }))

      // Recent users (last 5 by createdAt)
      const recentUsers = [...allUsers]
        .filter(u => u.createdAt)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(u => ({ name: u.name ?? 'Unknown', email: u.email ?? '—', planId: u.planId ?? 'free', createdAt: u.createdAt }))

      setData({
        totalUsers, activeUsers30d, paidUsers, suspendedUsers,
        totalSessions, liveSessions, totalParticipants, mrr,
        planDist, recentUsers,
      })
      setLastUpdated(new Date())
    } catch (e) {
      console.error('[admin/overview] load failed', e)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8 pb-12 max-w-6xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: '#9CA3AF' }}>Admin console</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1A1A2E' }}>
            Platform <span style={{ color: '#00A6A6' }}>Overview</span>
          </h1>
          {lastUpdated && (
            <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: '#9CA3AF' }}>
              <Clock className="w-3 h-3" />
              Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold self-start"
          style={{ background: 'rgba(0,166,166,0.10)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.22)' }}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 rounded-full animate-spin"
            style={{ borderColor: 'rgba(0,166,166,0.20)', borderTopColor: '#00A6A6' }} />
        </div>
      ) : data ? (
        <>
          {/* KPI grid — Users */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>Users</p>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard label="Total registered" value={data.totalUsers}
                sub="All-time signups" icon={Users} bg="#1A1A2E" text="#FFFFFF" />
              <KpiCard label="Active (30d)" value={data.activeUsers30d}
                sub="Logged in last 30 days" icon={CheckCircle2} bg="rgba(34,197,94,0.15)" text="#16A34A" />
              <KpiCard label="Paid subscribers" value={data.paidUsers}
                sub="Active paid plans" icon={CreditCard} bg="rgba(0,166,166,0.15)" text="#00A6A6" />
              <KpiCard label="Suspended" value={data.suspendedUsers}
                sub="Access restricted" icon={Ban} bg="rgba(239,68,68,0.12)" text="#DC2626" />
            </div>
          </div>

          {/* KPI grid — Revenue */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>Revenue</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard label="MRR" value={fmtUSD(data.mrr)}
                sub="Monthly recurring revenue" icon={DollarSign} bg="#00A6A6" text="#FFFFFF" />
              <KpiCard label="ARR" value={fmtUSD(data.mrr * 12)}
                sub="Annualised recurring revenue" icon={TrendingUp} bg="#EFCA08" text="#1A1A2E" />
              <KpiCard label="ARPU" value={data.paidUsers > 0 ? fmtUSD(data.mrr / data.paidUsers) : '$0'}
                sub="Avg revenue per paid user" icon={Shield} bg="#F08700" text="#FFFFFF" />
            </div>
          </div>

          {/* KPI grid — Engagement */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>Sessions</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard label="Total sessions" value={data.totalSessions}
                sub="All presentations created" icon={FileStack} bg="#F49F0A" text="#1A1A2E" />
              <KpiCard label="Live now" value={data.liveSessions}
                sub="Currently running" icon={Activity} bg="rgba(240,135,0,0.15)" text="#F08700" />
              <KpiCard label="Total participants" value={data.totalParticipants}
                sub="Across all sessions" icon={Users} bg="rgba(239,202,8,0.15)" text="#8A7000" />
            </div>
          </div>

          {/* Plan distribution + recent users */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Plan distribution */}
            <div className="rounded-2xl p-6 space-y-4"
              style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: '#1A1A2E' }}>Plan distribution</h2>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>All {data.totalUsers} registered accounts</p>
              </div>
              {data.planDist.map(p => {
                const pct = data.totalUsers > 0 ? Math.round((p.count / data.totalUsers) * 100) : 0
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

            {/* Recent signups */}
            <div className="rounded-2xl p-6 space-y-4"
              style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: '#1A1A2E' }}>Recent signups</h2>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Latest 5 registered accounts</p>
              </div>
              {data.recentUsers.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: '#9CA3AF' }}>No users yet</p>
              ) : (
                <div className="space-y-3">
                  {data.recentUsers.map((u, i) => {
                    const badge = PLAN_BADGE[u.planId] ?? PLAN_BADGE.free
                    const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    return (
                      <div key={i} className="flex items-center gap-3 py-2"
                        style={{ borderBottom: i < data.recentUsers.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: '#00A6A6', color: '#FFFFFF' }}>{initials}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: '#1A1A2E' }}>{u.name}</p>
                          <p className="text-[11px] truncate" style={{ color: '#9CA3AF' }}>{u.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                            style={{ background: badge.bg, color: badge.text }}>{u.planId}</span>
                          {u.createdAt && (
                            <span className="text-[10px]" style={{ color: '#9CA3AF' }}>
                              {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Failed to load data. Try refreshing.</p>
        </div>
      )}
    </div>
  )
}
