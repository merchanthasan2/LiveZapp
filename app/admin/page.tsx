'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { loadAdminOverviewStats, type AdminOverviewStats } from '@/lib/services/AdminStatsService'
import { AlertTriangle, RefreshCw } from 'lucide-react'

const KPI_COLORS = ['#7a3af0', '#00a6a6', '#f08700', '#5b6cff']

function MetricCard({ title, value, delta, idx }: { title: string; value: string; delta: string; idx: number }) {
  return (
    <div className="rounded-3xl p-5" style={{ background: '#ffffff', border: '1px solid #e8e4ef', boxShadow: '0 10px 30px rgba(33,22,62,0.06)' }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="h-10 w-10 rounded-full" style={{ background: `${KPI_COLORS[idx]}20` }} />
        <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: '#edf9f8', color: '#007a74' }}>{delta}</span>
      </div>
      <p className="text-xs uppercase tracking-[0.16em]" style={{ color: '#7b728d' }}>{title}</p>
      <p className="mt-1 text-4xl font-black" style={{ color: '#1a1a2e' }}>{value}</p>
      <div className="mt-4 flex h-4 gap-1.5">
        {[40, 65, 52, 80, 70].map((h, i) => <div key={i} className="flex-1 rounded" style={{ height: `${h}%`, background: `${KPI_COLORS[idx]}55` }} />)}
      </div>
    </div>
  )
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverviewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOverview = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const next = await loadAdminOverviewStats()
      setData(next)
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

  const engagement = useMemo(
    () => [
      { month: 'Jan', value: 46 },
      { month: 'Mar', value: 43 },
      { month: 'May', value: 57 },
      { month: 'Jul', value: 55 },
      { month: 'Sep', value: 73 },
      { month: 'Nov', value: 84 },
    ],
    [],
  )

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

  const totalRevenue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.mrr * 12)

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-black md:text-5xl" style={{ color: '#1a1a2e' }}>Analytics Overview</h1>
          <p className="text-lg" style={{ color: '#6d667b' }}>Real-time performance metrics for LiveZapp.</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#9ca3af' }}>Source: {data.source.toUpperCase()}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 md:justify-end">
          <span className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest" style={{ background: 'rgba(249,115,22,0.10)', color: '#b45309', border: '1px solid rgba(249,115,22,0.20)' }}>Sample Data</span>
          <button disabled className="rounded-full px-5 py-2.5 font-semibold opacity-40 cursor-not-allowed" style={{ background: '#eef1f7', color: '#4f4a63' }} title="Coming soon">Export Report</button>
          <button disabled className="rounded-full px-5 py-2.5 font-semibold opacity-40 cursor-not-allowed" style={{ background: '#ede4ff', color: '#5e2fb5' }} title="Coming soon">Date Range: Last 30 Days</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <MetricCard idx={0} title="Total Revenue" value={totalRevenue} delta="+12.4%" />
        <MetricCard idx={1} title="Active Users" value={data.activeUsers30d.toLocaleString()} delta="+8.2%" />
        <MetricCard idx={2} title="Conversion Rate" value={`${Math.max(1, Math.round((data.paidUsers / Math.max(data.totalUsers, 1)) * 1000) / 10)}%`} delta="+2.1%" />
        <MetricCard idx={3} title="Avg Session Time" value="12m 44s" delta="-0.4%" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-3xl p-6" style={{ background: '#ffffff', border: '1px solid #e8e4ef' }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black md:text-4xl" style={{ color: '#1a1a2e' }}>Platform Engagement</h2>
              <p className="text-sm" style={{ color: '#6d667b' }}>Monthly active interactions across all services.</p>
            </div>
            <span className="rounded-xl px-3 py-1.5 text-xs cursor-default" style={{ background: '#f3eefb', color: '#6d28d9' }}>Monthly</span>
          </div>
          <div className="h-[320px] rounded-2xl p-3" style={{ background: 'linear-gradient(180deg,#ede4ff,#f6f2fb)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engagement}>
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#7a3af0" fill="#bfa8ff" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl p-6" style={{ background: '#ffffff', border: '1px solid #e8e4ef' }}>
          <h2 className="text-2xl font-black md:text-4xl" style={{ color: '#1a1a2e' }}>Subscriptions</h2>
          <p className="mb-4 text-sm" style={{ color: '#6d667b' }}>Plan distribution</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={60} outerRadius={88} paddingAngle={2}>
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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black md:text-4xl" style={{ color: '#1a1a2e' }}>Recent Platform Activity</h2>
            <p className="text-sm" style={{ color: '#6d667b' }}>Real-time logs of new signups and billing events.</p>
          </div>
          <span className="text-sm font-semibold opacity-40 cursor-default" style={{ color: '#6d28d9' }} title="Coming soon">View All Activity</span>
        </div>
        <div className="overflow-auto rounded-2xl" style={{ border: '1px solid #ece8f2' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#faf8fe' }}>
              <tr>
                <th className="px-4 py-3 text-left" style={{ color: '#8b8498' }}>User Details</th>
                <th className="px-4 py-3 text-left" style={{ color: '#8b8498' }}>Event Type</th>
                <th className="px-4 py-3 text-left" style={{ color: '#8b8498' }}>Status</th>
                <th className="px-4 py-3 text-left" style={{ color: '#8b8498' }}>Value</th>
                <th className="px-4 py-3 text-left" style={{ color: '#8b8498' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.slice(0, 3).map((u, i) => (
                <tr key={`${u.email}-${i}`} style={{ borderTop: '1px solid #f1edf7' }}>
                  <td className="px-4 py-3" style={{ color: '#1a1a2e' }}>
                    {u.name}
                    <div className="text-xs" style={{ color: '#8b8498' }}>{u.email}</div>
                  </td>
                  <td className="px-4 py-3" style={{ color: '#1a1a2e' }}>{i === 0 ? 'Plan Upgrade' : i === 1 ? 'New Signup' : 'Annual Renewal'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: i === 1 ? '#ede4ff' : '#e7faf5', color: i === 1 ? '#6d28d9' : '#0f766e' }}>
                      {i === 1 ? 'Free Tier' : 'Completed'}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: '#1a1a2e' }}>{i === 0 ? '+$499.00' : i === 1 ? '$0.00' : '+$2,400.00'}</td>
                  <td className="px-4 py-3" style={{ color: '#8b8498' }}>{i === 0 ? '2 mins ago' : i === 1 ? '15 mins ago' : '42 mins ago'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
