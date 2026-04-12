'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { loadAdminOverviewStats, type AdminOverviewStats } from '@/lib/services/AdminStatsService'
import { AlertTriangle, RefreshCw } from 'lucide-react'

const KPI_COLORS = ['#7a3af0', '#00a6a6', '#f08700', '#5b6cff']

function MetricCard({
  title,
  value,
  caption,
  idx,
}: {
  title: string
  value: string
  caption?: string
  idx: number
}) {
  return (
    <div className="rounded-3xl p-5" style={{ background: '#ffffff', border: '1px solid #e8e4ef', boxShadow: '0 10px 30px rgba(33,22,62,0.06)' }}>
      <div className="mb-3 h-10 w-10 rounded-full" style={{ background: `${KPI_COLORS[idx % KPI_COLORS.length]}20` }} />
      <p className="text-xs uppercase tracking-[0.16em]" style={{ color: '#7b728d' }}>{title}</p>
      <p className="mt-1 text-3xl font-black tabular-nums sm:text-4xl" style={{ color: '#1a1a2e' }}>{value}</p>
      {caption ? (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: '#9ca3af' }}>{caption}</p>
      ) : null}
    </div>
  )
}

function fmtShortDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  regular: 'Regular',
  pro: 'Pro',
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverviewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)

  const loadOverview = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const next = await loadAdminOverviewStats()
      setData(next)
      setLoadedAt(new Date())
    } catch (e) {
      console.error('[admin/overview] load failed', e)
      setError('Analytics data could not be loaded right now.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const pieData = useMemo(() => {
    if (!data) return []
    return data.planDist
      .filter(p => p.count > 0)
      .map((p, i) => ({ name: p.name, value: p.count, color: ['#7a3af0', '#00a6a6', '#f08700', '#5b6cff'][i % 4] }))
  }, [data])

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3" style={{ color: '#6d667b' }}>
        <RefreshCw className="h-4 w-4 animate-spin" /> Loading analytics overview...
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center">
        <div className="w-full rounded-3xl p-8 text-center" style={{ background: '#ffffff', border: '1px solid #e8e4ef' }}>
          <AlertTriangle className="mx-auto mb-3 h-8 w-8" style={{ color: '#b45309' }} />
          <h2 className="text-xl font-black" style={{ color: '#1a1a2e' }}>Analytics unavailable</h2>
          <p className="mt-2 text-sm" style={{ color: '#6d667b' }}>{error}</p>
          <button
            onClick={() => void loadOverview()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{ background: '#1a1a2e', color: '#ffffff' }}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm" style={{ color: '#6d667b' }}>No analytics data available yet.</p>
      </div>
    )
  }

  const arrEstimate = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(data.mrr * 12)

  const paidSharePct =
    data.totalUsers > 0 ? Math.round((data.paidUsers / data.totalUsers) * 1000) / 10 : 0

  return (
    <div className="min-w-0 space-y-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-black md:text-5xl" style={{ color: '#1a1a2e' }}>Analytics Overview</h1>
          <p className="text-lg" style={{ color: '#6d667b' }}>Live metrics from your database (users and Zapps).</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#9ca3af' }}>
            Source: {data.source.toUpperCase()}
            {loadedAt ? ` · Updated ${loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 md:justify-end">
          <button
            type="button"
            onClick={() => void loadOverview()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-opacity disabled:opacity-50"
            style={{ background: '#1a1a2e', color: '#ffffff' }}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest" style={{ background: 'rgba(0,166,166,0.10)', color: '#007a7a', border: '1px solid rgba(0,166,166,0.22)' }}>
            Live data
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <MetricCard
          idx={0}
          title="ARR (estimate)"
          value={arrEstimate}
          caption={`MRR ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.mrr)} · ${data.paidUsers} active paid`}
        />
        <MetricCard
          idx={1}
          title="Active users (30d)"
          value={data.activeUsers30d.toLocaleString()}
          caption={
            data.suspendedUsers > 0
              ? `${data.totalUsers.toLocaleString()} total · ${data.suspendedUsers} suspended`
              : `${data.totalUsers.toLocaleString()} registered accounts`
          }
        />
        <MetricCard
          idx={2}
          title="Paid share"
          value={`${paidSharePct}%`}
          caption={`${data.paidUsers} paying · ${data.totalUsers - data.paidUsers} non-paying`}
        />
        <MetricCard
          idx={3}
          title="Zapps & reach"
          value={`${data.liveSessions} live`}
          caption={`${data.totalSessions.toLocaleString()} Zapps total · ${data.totalParticipants.toLocaleString()} participant seats recorded`}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="min-w-0 rounded-3xl p-6" style={{ background: '#ffffff', border: '1px solid #e8e4ef' }}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black md:text-4xl" style={{ color: '#1a1a2e' }}>Zapps created</h2>
              <p className="text-sm" style={{ color: '#6d667b' }}>New presentations per day (UTC), last 30 days.</p>
            </div>
            <span className="w-fit rounded-xl px-3 py-1.5 text-xs" style={{ background: '#f3eefb', color: '#6d28d9' }}>Daily</span>
          </div>
          <div className="h-[220px] min-h-[220px] w-full min-w-0 rounded-2xl p-2 sm:h-[280px] sm:min-h-[280px] sm:p-3 md:h-[320px] md:min-h-[320px]" style={{ background: 'linear-gradient(180deg,#ede4ff,#f6f2fb)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.zappsCreatedByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="zappArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7a3af0" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7a3af0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#6d667b' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tickFormatter={(v: string) => {
                    const [, mm, dd] = v.split('-')
                    return `${mm}/${dd}`
                  }}
                />
                <YAxis width={36} tick={{ fontSize: 10, fill: '#6d667b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e8e4ef', fontSize: 12 }}
                  labelFormatter={(v: string) => v}
                  formatter={(value: number) => [value, 'Zapps']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#7a3af0"
                  fill="url(#zappArea)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="min-w-0 rounded-3xl p-6" style={{ background: '#ffffff', border: '1px solid #e8e4ef' }}>
          <h2 className="text-2xl font-black md:text-4xl" style={{ color: '#1a1a2e' }}>Subscriptions</h2>
          <p className="mb-4 text-sm" style={{ color: '#6d667b' }}>Plan distribution</p>
          <div className="h-[200px] min-h-[200px] w-full min-w-0 sm:h-[220px] sm:min-h-[220px] md:h-[240px] md:min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={60} outerRadius={88} paddingAngle={2} isAnimationActive={false}>
                  {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2" style={{ color: '#1a1a2e' }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span style={{ color: '#6d667b' }}>{Math.round((d.value / Math.max(data.totalUsers, 1)) * 100)}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-3xl p-6" style={{ background: '#ffffff', border: '1px solid #e8e4ef' }}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black md:text-4xl" style={{ color: '#1a1a2e' }}>Recent signups</h2>
            <p className="text-sm" style={{ color: '#6d667b' }}>Newest accounts by profile <code className="text-xs">createdAt</code>. Billing actions live under Logs.</p>
          </div>
          <Link
            href="/admin/logs"
            className="text-sm font-bold transition-opacity hover:opacity-80"
            style={{ color: '#6d28d9' }}
          >
            Open audit log →
          </Link>
        </div>
        <div className="scroll-touch overflow-x-auto rounded-2xl" style={{ border: '1px solid #ece8f2' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#faf8fe' }}>
              <tr>
                <th className="px-4 py-3 text-left" style={{ color: '#8b8498' }}>User</th>
                <th className="px-4 py-3 text-left" style={{ color: '#8b8498' }}>Plan</th>
                <th className="px-4 py-3 text-left" style={{ color: '#8b8498' }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center" style={{ color: '#8b8498' }}>
                    No users with a stored join date yet.
                  </td>
                </tr>
              ) : (
                data.recentUsers.map((u, i) => (
                  <tr key={`${u.email}-${u.createdAt ?? i}`} style={{ borderTop: '1px solid #f1edf7' }}>
                    <td className="px-4 py-3" style={{ color: '#1a1a2e' }}>
                      {u.name}
                      <div className="text-xs" style={{ color: '#8b8498' }}>{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: '#ede4ff', color: '#6d28d9' }}>
                        {PLAN_LABEL[u.planId] ?? u.planId}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#8b8498' }}>{fmtShortDate(u.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
