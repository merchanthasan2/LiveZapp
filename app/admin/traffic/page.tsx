'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { Monitor, Smartphone, Tablet, Globe, Clock, User, UserX, RefreshCw, MapPin, Chrome, Search } from 'lucide-react'
import { ref, get } from 'firebase/database'
import { rtdb } from '@/lib/firebase'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PageView {
  ts: number
  path: string | null
  referrer: string | null
  ip: string
  country: string
  countryCode: string
  city: string
  region: string
  lat: number | null
  lon: number | null
  isp: string
  device: 'mobile' | 'tablet' | 'desktop'
  os: string
  browser: string
  screenW: number | null
  screenH: number | null
  userId: string | null
  isRegistered: boolean
  sessionId: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function toDateStr(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

function groupCount<T>(arr: T[], key: (item: T) => string): { name: string; count: number }[] {
  const map: Record<string, number> = {}
  for (const item of arr) {
    const k = key(item) || 'Unknown'
    map[k] = (map[k] ?? 0) + 1
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

const BRAND_COLORS = ['#00A6A6', '#F08700', '#EFCA08', '#F49F0A', '#007A7A', '#C46E00']

// ─── Stat Tile ────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string
  value: number | string
  icon: React.ReactNode
  bgColor: string
  textColor: string
}

function StatTile({ label, value, icon, bgColor, textColor }: StatTileProps) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: textColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1A2E', lineHeight: 1.1 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ children, title, style }: { children: React.ReactNode; title?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        borderRadius: 16,
        padding: '20px 24px',
        ...style,
      }}
    >
      {title && (
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A2E', marginBottom: 16 }}>{title}</div>
      )}
      {children}
    </div>
  )
}

// ─── Device Icon ──────────────────────────────────────────────────────────────

function DeviceIcon({ device }: { device: string }) {
  if (device === 'mobile') return <Smartphone size={14} color="#F08700" />
  if (device === 'tablet') return <Tablet size={14} color="#EFCA08" />
  return <Monitor size={14} color="#00A6A6" />
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TrafficPage() {
  const [allViews, setAllViews] = useState<PageView[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all'>('7d')

  const loadData = async () => {
    setIsLoading(true)
    try {
      const snapshot = await get(ref(rtdb, 'analytics/pageviews'))
      if (!snapshot.exists()) {
        setAllViews([])
        return
      }
      const raw = snapshot.val() as Record<string, PageView>
      const arr = Object.values(raw)
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 500)
      setAllViews(arr)
    } catch (err) {
      console.error('[traffic] load error:', err)
      setAllViews([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // ── Filter by date range ──────────────────────────────────────────────────

  const views = useMemo(() => {
    const now = Date.now()
    if (dateRange === 'today') {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      return allViews.filter((v) => v.ts >= startOfDay.getTime())
    }
    if (dateRange === '7d') return allViews.filter((v) => v.ts >= now - 7 * 86400000)
    if (dateRange === '30d') return allViews.filter((v) => v.ts >= now - 30 * 86400000)
    return allViews
  }, [allViews, dateRange])

  // ── Computed stats ────────────────────────────────────────────────────────

  const totalVisits = views.length
  const uniqueVisitors = useMemo(() => new Set(views.map((v) => v.sessionId)).size, [views])
  const registeredUsers = useMemo(() => views.filter((v) => v.isRegistered === true).length, [views])
  const anonymousUsers = useMemo(() => views.filter((v) => v.isRegistered === false).length, [views])

  // ── Visits over time ──────────────────────────────────────────────────────

  const visitsOverTime = useMemo(() => {
    const map: Record<string, number> = {}
    for (const v of views) {
      const d = toDateStr(v.ts)
      map[d] = (map[d] ?? 0) + 1
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, visits]) => ({ date, visits }))
  }, [views])

  // ── Breakdowns ────────────────────────────────────────────────────────────

  const countryData = useMemo(() => groupCount(views, (v) => v.country || 'Unknown').slice(0, 10), [views])
  const deviceData = useMemo(() => groupCount(views, (v) => v.device || 'Unknown'), [views])
  const osData = useMemo(() => groupCount(views, (v) => v.os || 'Unknown').slice(0, 6), [views])
  const browserData = useMemo(() => groupCount(views, (v) => v.browser || 'Unknown').slice(0, 6), [views])
  const topPages = useMemo(() => groupCount(views, (v) => v.path || '/').slice(0, 10), [views])

  // ── Recent visits ─────────────────────────────────────────────────────────

  const recentVisits = useMemo(() => views.slice(0, 100), [views])

  // ─── Render ───────────────────────────────────────────────────────────────

  const dateRangeOptions: { key: 'today' | '7d' | '30d' | 'all'; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: 'all', label: 'All Time' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 28,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>Traffic Analytics</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
              Page view tracking and visitor insights
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Date range segmented control */}
            <div
              style={{
                display: 'flex',
                background: '#E5E7EB',
                borderRadius: 10,
                padding: 3,
                gap: 2,
              }}
            >
              {dateRangeOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setDateRange(opt.key)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: dateRange === opt.key ? 600 : 400,
                    background: dateRange === opt.key ? '#1A1A2E' : 'transparent',
                    color: dateRange === opt.key ? '#ffffff' : '#6B7280',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={loadData}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                background: '#ffffff',
                color: '#1A1A2E',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading spinner */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div
              style={{
                display: 'inline-block',
                width: 40,
                height: 40,
                border: '3px solid #E5E7EB',
                borderTopColor: '#00A6A6',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ color: '#6B7280', marginTop: 16 }}>Loading analytics data…</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && views.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 0',
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid #E5E7EB',
            }}
          >
            <Globe size={48} color="#E5E7EB" style={{ marginBottom: 16 }} />
            <h3 style={{ color: '#1A1A2E', fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>No data yet</h3>
            <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
              Visit some pages to start collecting data
            </p>
          </div>
        )}

        {/* Dashboard content */}
        {!isLoading && views.length > 0 && (
          <>
            {/* Stat tiles */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <StatTile
                label="Total Visits"
                value={totalVisits}
                icon={<Globe size={22} />}
                bgColor="#00A6A6"
                textColor="#ffffff"
              />
              <StatTile
                label="Unique Visitors"
                value={uniqueVisitors}
                icon={<User size={22} />}
                bgColor="#EFCA08"
                textColor="#1A1A2E"
              />
              <StatTile
                label="Registered Users"
                value={registeredUsers}
                icon={<User size={22} />}
                bgColor="#F08700"
                textColor="#ffffff"
              />
              <StatTile
                label="Anonymous Users"
                value={anonymousUsers}
                icon={<UserX size={22} />}
                bgColor="#F49F0A"
                textColor="#1A1A2E"
              />
            </div>

            {/* Visits over time chart */}
            <Card title="Visits Over Time" style={{ marginBottom: 24 }}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={visitsOverTime} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00A6A6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00A6A6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #E5E7EB',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visits"
                    stroke="#00A6A6"
                    strokeWidth={2}
                    fill="url(#tealGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Breakdowns row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 16,
                marginBottom: 24,
              }}
            >
              {/* Top Countries */}
              <Card title="Top Countries">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={countryData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} width={90} />
                    <Tooltip
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid #E5E7EB',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {countryData.map((_, i) => (
                        <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Device breakdown */}
              <Card title="Device Types">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                  {deviceData.map((d, i) => {
                    const pct = totalVisits > 0 ? Math.round((d.count / totalVisits) * 100) : 0
                    return (
                      <div key={d.name}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 13,
                            color: '#1A1A2E',
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}>
                            <DeviceIcon device={d.name} />
                            {d.name}
                          </span>
                          <span style={{ color: '#6B7280' }}>
                            {d.count} ({pct}%)
                          </span>
                        </div>
                        <div style={{ background: '#F3F4F6', borderRadius: 4, height: 6 }}>
                          <div
                            style={{
                              background: BRAND_COLORS[i % BRAND_COLORS.length],
                              width: `${pct}%`,
                              height: '100%',
                              borderRadius: 4,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* OS breakdown */}
              <Card title="Operating Systems">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                  {osData.map((d, i) => {
                    const pct = totalVisits > 0 ? Math.round((d.count / totalVisits) * 100) : 0
                    return (
                      <div key={d.name}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 13,
                            color: '#1A1A2E',
                            marginBottom: 4,
                          }}
                        >
                          <span>{d.name}</span>
                          <span style={{ color: '#6B7280' }}>
                            {d.count} ({pct}%)
                          </span>
                        </div>
                        <div style={{ background: '#F3F4F6', borderRadius: 4, height: 6 }}>
                          <div
                            style={{
                              background: BRAND_COLORS[i % BRAND_COLORS.length],
                              width: `${pct}%`,
                              height: '100%',
                              borderRadius: 4,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Browser breakdown */}
              <Card title="Browsers">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                  {browserData.map((d, i) => {
                    const pct = totalVisits > 0 ? Math.round((d.count / totalVisits) * 100) : 0
                    return (
                      <div key={d.name}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 13,
                            color: '#1A1A2E',
                            marginBottom: 4,
                          }}
                        >
                          <span>{d.name}</span>
                          <span style={{ color: '#6B7280' }}>
                            {d.count} ({pct}%)
                          </span>
                        </div>
                        <div style={{ background: '#F3F4F6', borderRadius: 4, height: 6 }}>
                          <div
                            style={{
                              background: BRAND_COLORS[i % BRAND_COLORS.length],
                              width: `${pct}%`,
                              height: '100%',
                              borderRadius: 4,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Top pages */}
              <Card title="Top Pages" style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {topPages.map((p, i) => {
                    const pct = totalVisits > 0 ? Math.round((p.count / totalVisits) * 100) : 0
                    return (
                      <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: BRAND_COLORS[i % BRAND_COLORS.length],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            color: i === 1 || i === 3 ? '#1A1A2E' : '#ffffff',
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            fontSize: 13,
                            color: '#1A1A2E',
                            fontFamily: 'monospace',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.name}
                        </span>
                        <span style={{ fontSize: 13, color: '#6B7280', flexShrink: 0 }}>
                          {p.count.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>

            {/* Recent visits table */}
            <Card title="Recent Visits">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Time', 'Page', 'User', 'Location', 'Device', 'OS', 'Browser', 'IP'].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: 'left',
                            padding: '8px 12px',
                            color: '#6B7280',
                            fontWeight: 600,
                            fontSize: 12,
                            borderBottom: '1px solid #E5E7EB',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentVisits.map((v, i) => {
                      const location =
                        v.city && v.countryCode
                          ? `${v.city}, ${v.countryCode}`
                          : v.country || '—'

                      return (
                        <tr
                          key={i}
                          style={{ cursor: 'default' }}
                          onMouseEnter={(e) => {
                            ;(e.currentTarget as HTMLTableRowElement).style.background = '#FAFBFF'
                          }}
                          onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
                          }}
                        >
                          {/* Time */}
                          <td
                            style={{
                              padding: '10px 12px',
                              borderBottom: '1px solid #F3F4F6',
                              whiteSpace: 'nowrap',
                              color: '#6B7280',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} />
                              {timeAgo(v.ts)}
                            </span>
                          </td>

                          {/* Page */}
                          <td
                            style={{
                              padding: '10px 12px',
                              borderBottom: '1px solid #F3F4F6',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontFamily: 'monospace',
                              color: '#1A1A2E',
                            }}
                          >
                            {v.path ?? '/'}
                          </td>

                          {/* User */}
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #F3F4F6', whiteSpace: 'nowrap' }}>
                            {v.isRegistered && v.userId ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: '#00A6A6',
                                  fontWeight: 500,
                                }}
                              >
                                <User size={12} />
                                {v.userId.slice(0, 8)}…
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  color: '#9CA3AF',
                                }}
                              >
                                <UserX size={12} />
                                Anonymous
                              </span>
                            )}
                          </td>

                          {/* Location */}
                          <td
                            style={{
                              padding: '10px 12px',
                              borderBottom: '1px solid #F3F4F6',
                              whiteSpace: 'nowrap',
                              color: '#1A1A2E',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <MapPin size={12} color="#F08700" />
                              {location}
                            </span>
                          </td>

                          {/* Device */}
                          <td
                            style={{
                              padding: '10px 12px',
                              borderBottom: '1px solid #F3F4F6',
                              whiteSpace: 'nowrap',
                              textTransform: 'capitalize',
                              color: '#1A1A2E',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <DeviceIcon device={v.device} />
                              {v.device}
                            </span>
                          </td>

                          {/* OS */}
                          <td
                            style={{
                              padding: '10px 12px',
                              borderBottom: '1px solid #F3F4F6',
                              whiteSpace: 'nowrap',
                              color: '#1A1A2E',
                            }}
                          >
                            {v.os}
                          </td>

                          {/* Browser */}
                          <td
                            style={{
                              padding: '10px 12px',
                              borderBottom: '1px solid #F3F4F6',
                              whiteSpace: 'nowrap',
                              color: '#1A1A2E',
                            }}
                          >
                            {v.browser}
                          </td>

                          {/* IP */}
                          <td
                            style={{
                              padding: '10px 12px',
                              borderBottom: '1px solid #F3F4F6',
                              whiteSpace: 'nowrap',
                              color: '#6B7280',
                              fontFamily: 'monospace',
                              fontSize: 12,
                            }}
                          >
                            {v.ip}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Keyframe animation for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
