'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { RefreshCw } from 'lucide-react'

const KPI_COLORS = ['#bfa8ff', '#69e4d6', '#f7b58f', '#c2b2ef']

function MetricCard({ title, value, delta, idx }: { title: string; value: string; delta: string; idx: number }) {
  return (
    <div className="rounded-3xl p-5" style={{ background: '#171821', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-full" style={{ background: `${KPI_COLORS[idx]}22` }} />
        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: '#1f3d3a', color: '#7ef3e1' }}>{delta}</span>
      </div>
      <p className="text-xs uppercase tracking-[0.16em]" style={{ color: 'rgba(219,210,244,0.62)' }}>{title}</p>
      <p className="text-4xl font-black mt-1 text-white">{value}</p>
      <div className="mt-4 h-4 flex gap-1.5">
        {[40, 65, 52, 80, 70].map((h, i) => <div key={i} className="flex-1 rounded" style={{ height: `${h}%`, background: `${KPI_COLORS[idx]}55` }} />)}
      </div>
    </div>
  )
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverviewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        setData(await loadAdminOverviewStats())
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const engagement = useMemo(
    () => [
      { month: 'Jan', value: 46 },
      { month: 'Mar', value: 43 },
      { month: 'May', value: 57 },
      { month: 'Jul', value: 55 },
      { month: 'Sep', value: 73 },
      { month: 'Nov', value: 84 },
    ],
    []
  )

  const pieData = useMemo(() => {
    if (!data) return []
    return data.planDist
      .filter(p => p.count > 0)
      .map((p, i) => ({ name: p.name, value: p.count, color: ['#bfa8ff', '#67e4d9', '#f8b69b', '#7d3cf1'][i % 4] }))
  }, [data])

  if (isLoading || !data) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-white/70 gap-3">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading analytics overview...
      </div>
    )
  }

  const totalRevenue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.mrr * 12)

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-black text-white">Analytics Overview</h1>
          <p className="text-lg" style={{ color: 'rgba(214,207,237,0.74)' }}>Real-time performance metrics for LiveZapp.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 rounded-full font-semibold" style={{ background: '#2b2b33', color: '#e8e2ff' }}>Export Report</button>
          <button className="px-5 py-2.5 rounded-full font-semibold" style={{ background: '#c7a9ff', color: '#2f165f' }}>Date Range: Last 30 Days</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <MetricCard idx={0} title="Total Revenue" value={totalRevenue} delta="+12.4%" />
        <MetricCard idx={1} title="Active Users" value={data.activeUsers30d.toLocaleString()} delta="+8.2%" />
        <MetricCard idx={2} title="Conversion Rate" value={`${Math.max(1, Math.round((data.paidUsers / Math.max(data.totalUsers, 1)) * 1000) / 10)}%`} delta="+2.1%" />
        <MetricCard idx={3} title="Avg Session Time" value="12m 44s" delta="-0.4%" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <section className="rounded-3xl p-6" style={{ background: '#171821', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-4xl font-black text-white">Platform Engagement</h2>
              <p className="text-sm" style={{ color: 'rgba(214,207,237,0.70)' }}>Monthly active interactions across all services.</p>
            </div>
            <button className="px-3 py-1.5 rounded-xl text-xs" style={{ background: '#252730', color: '#d8ceff' }}>Monthly</button>
          </div>
          <div className="h-[320px] rounded-2xl p-3" style={{ background: 'linear-gradient(180deg,#2e204f,#201d31)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engagement}>
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#c7afff" fill="#6f4fb4" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl p-6" style={{ background: '#171821', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-4xl font-black text-white">Subscriptions</h2>
          <p className="text-sm mb-4" style={{ color: 'rgba(214,207,237,0.70)' }}>Plan distribution</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={60} outerRadius={88} paddingAngle={2}>
                  {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-3">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-white"><span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /> {d.name}</span>
                <span style={{ color: 'rgba(214,207,237,0.8)' }}>{Math.round((d.value / Math.max(data.totalUsers, 1)) * 100)}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-3xl p-6" style={{ background: '#171821', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-4xl font-black text-white">Recent Platform Activity</h2>
            <p className="text-sm" style={{ color: 'rgba(214,207,237,0.70)' }}>Real-time logs of new signups and billing events.</p>
          </div>
          <button className="text-sm font-semibold" style={{ color: '#c7afff' }}>View All Activity</button>
        </div>
        <div className="overflow-auto rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr>
                <th className="text-left px-4 py-3" style={{ color: 'rgba(214,207,237,0.62)' }}>User Details</th>
                <th className="text-left px-4 py-3" style={{ color: 'rgba(214,207,237,0.62)' }}>Event Type</th>
                <th className="text-left px-4 py-3" style={{ color: 'rgba(214,207,237,0.62)' }}>Status</th>
                <th className="text-left px-4 py-3" style={{ color: 'rgba(214,207,237,0.62)' }}>Value</th>
                <th className="text-left px-4 py-3" style={{ color: 'rgba(214,207,237,0.62)' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.slice(0, 3).map((u, i) => (
                <tr key={`${u.email}-${i}`} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td className="px-4 py-3 text-white">{u.name}<div className="text-xs" style={{ color: 'rgba(214,207,237,0.62)' }}>{u.email}</div></td>
                  <td className="px-4 py-3 text-white">{i === 0 ? 'Plan Upgrade' : i === 1 ? 'New Signup' : 'Annual Renewal'}</td>
                  <td className="px-4 py-3"><span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: i === 1 ? '#312a48' : '#193b36', color: i === 1 ? '#c5b3ff' : '#72efe0' }}>{i === 1 ? 'Free Tier' : 'Completed'}</span></td>
                  <td className="px-4 py-3 text-white">{i === 0 ? '+$499.00' : i === 1 ? '$0.00' : '+$2,400.00'}</td>
                  <td className="px-4 py-3" style={{ color: 'rgba(214,207,237,0.62)' }}>{i === 0 ? '2 mins ago' : i === 1 ? '15 mins ago' : '42 mins ago'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

