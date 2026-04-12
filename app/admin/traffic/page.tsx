'use client'

import Link from 'next/link'
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
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  User,
  UserX,
  RefreshCw,
  MapPin,
  Search,
  ArrowLeftRight,
  LogOut,
  Radio,
} from 'lucide-react'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/lib/hooks/useAuth'

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

function referrerHost(referrer: string | null): string {
  if (!referrer || !referrer.trim()) return 'Direct / bookmark / app'
  try {
    const href = /^https?:\/\//i.test(referrer) ? referrer : `https://${referrer}`
    const u = new URL(href)
    return u.hostname || referrer.slice(0, 80)
  } catch {
    return referrer.slice(0, 80)
  }
}

/** Stable per-browser session key for engagement (falls back when sessionId missing). */
function sessionKey(v: PageView): string {
  if (v.sessionId && String(v.sessionId).trim().length > 0) return String(v.sessionId)
  return `anon:${v.ip}:${Math.floor(v.ts / 300_000)}`
}

/** Product area for analytics (not raw URL paths). */
function pathToSection(path: string | null): string {
  const raw = (path ?? '/').split('?')[0] || '/'
  if (raw === '/' || raw === '') return 'Marketing · Home'
  if (raw.startsWith('/admin')) return 'Admin console'
  if (raw.startsWith('/app')) return 'Presenter app'
  if (raw.startsWith('/join')) return 'Participant join'
  if (raw.startsWith('/login') || raw.startsWith('/register') || raw.startsWith('/checkout')) {
    return 'Auth & checkout'
  }
  if (raw.startsWith('/api')) return 'Other'
  return 'Marketing · Site pages'
}

const BRAND_COLORS = ['#00A6A6', '#F08700', '#EFCA08', '#F49F0A', '#007A7A', '#C46E00']

interface LiveOverviewState {
  activeSessionCount: number
  totalLiveParticipants: number
  sessions: {
    joinCode: string
    presentationId: string
    title: string
    hostId: string
    participantCount: number
    isPaused: boolean
  }[]
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string
  value: number | string
  icon: React.ReactNode
  bgColor: string
  textColor: string
  hint?: string
}

function StatTile({ label, value, icon, bgColor, textColor, hint }: StatTileProps) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'flex-start',
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
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: 26, fontWeight: 700, color: '#1A1A2E', lineHeight: 1.1 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{label}</div>
        {hint ? (
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6, lineHeight: 1.35 }}>{hint}</div>
        ) : null}
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
  const { user } = useAuth()
  const [allViews, setAllViews] = useState<PageView[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [totalInDb, setTotalInDb] = useState<number | null>(null)
  const [capped, setCapped] = useState(false)
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all'>('7d')
  const [liveOverview, setLiveOverview] = useState<LiveOverviewState | null>(null)
  const [liveError, setLiveError] = useState<string | null>(null)

  const loadData = async () => {
    const currentUser = auth.currentUser
    if (!currentUser) {
      setAllViews([])
      setLiveOverview(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    setLiveError(null)
    try {
      const token = await currentUser.getIdToken()
      const headers = { Authorization: `Bearer ${token}` }

      const [pvRes, liveRes] = await Promise.all([
        fetch('/api/admin/pageviews', { headers, cache: 'no-store' }),
        fetch('/api/admin/live-sessions-summary', { headers, cache: 'no-store' }),
      ])

      const liveJson = (await liveRes.json()) as {
        success?: boolean
        activeSessionCount?: number
        totalLiveParticipants?: number
        sessions?: LiveOverviewState['sessions']
        error?: string
      }
      if (!liveRes.ok || !liveJson.success) {
        setLiveError(liveJson.error || 'Could not load live Zapp snapshot.')
        setLiveOverview(null)
      } else {
        setLiveOverview({
          activeSessionCount: liveJson.activeSessionCount ?? 0,
          totalLiveParticipants: liveJson.totalLiveParticipants ?? 0,
          sessions: Array.isArray(liveJson.sessions) ? liveJson.sessions : [],
        })
      }

      const data = (await pvRes.json()) as {
        success?: boolean
        pageviews?: PageView[]
        totalInDatabase?: number
        capped?: boolean
        error?: string
      }
      if (!pvRes.ok || !data.success) {
        throw new Error(data.error || 'Failed to load traffic data.')
      }
      setAllViews(Array.isArray(data.pageviews) ? data.pageviews : [])
      setTotalInDb(typeof data.totalInDatabase === 'number' ? data.totalInDatabase : null)
      setCapped(Boolean(data.capped))
    } catch (err) {
      console.error('[traffic] load error:', err)
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Failed to load analytics.'
      setLoadError(msg)
      setAllViews([])
      setTotalInDb(null)
      setCapped(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    void loadData()
  }, [user])

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

  const totalPageViews = views.length

  const engagement = useMemo(() => {
    const byKey = new Map<string, number>()
    for (const v of views) {
      const k = sessionKey(v)
      byKey.set(k, (byKey.get(k) ?? 0) + 1)
    }
    let singlePage = 0
    let multiPage = 0
    for (const n of byKey.values()) {
      if (n <= 1) singlePage++
      else multiPage++
    }
    const sessions = byKey.size
    const bouncePct = sessions > 0 ? Math.round((singlePage / sessions) * 100) : 0
    return { sessions, singlePage, multiPage, bouncePct }
  }, [views])

  const uniqueVisitors = engagement.sessions
  const loggedInHits = useMemo(() => views.filter((v) => v.isRegistered === true).length, [views])
  const anonymousHits = useMemo(() => views.filter((v) => v.isRegistered === false).length, [views])
  const distinctLoggedInUsers = useMemo(() => {
    const ids = new Set<string>()
    for (const v of views) {
      const id = v.userId && String(v.userId).trim()
      if (id) ids.add(id)
    }
    return ids.size
  }, [views])

  // ── Visits over time ──────────────────────────────────────────────────────

  const pageViewsOverTime = useMemo(() => {
    const map: Record<string, number> = {}
    for (const v of views) {
      const d = toDateStr(v.ts)
      map[d] = (map[d] ?? 0) + 1
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, pageViews]) => ({ date, pageViews }))
  }, [views])

  // ── Breakdowns ────────────────────────────────────────────────────────────

  const countryData = useMemo(() => groupCount(views, (v) => v.country || 'Unknown').slice(0, 10), [views])
  const cityData = useMemo(
    () =>
      groupCount(views, (v) => {
        if (v.city && v.countryCode) return `${v.city}, ${v.countryCode}`
        if (v.city) return v.city
        if (v.region && v.country) return `${v.region}, ${v.country}`
        return v.country || 'Unknown'
      }).slice(0, 12),
    [views],
  )
  const referrerData = useMemo(() => groupCount(views, (v) => referrerHost(v.referrer)).slice(0, 12), [views])
  const deviceData = useMemo(() => groupCount(views, (v) => v.device || 'Unknown'), [views])
  const osData = useMemo(() => groupCount(views, (v) => v.os || 'Unknown').slice(0, 6), [views])
  const browserData = useMemo(() => groupCount(views, (v) => v.browser || 'Unknown').slice(0, 6), [views])
  const sectionData = useMemo(() => groupCount(views, (v) => pathToSection(v.path)).slice(0, 12), [views])

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
    <div className="w-full min-w-0 max-w-full bg-[#F5F7FA] px-3 py-5 sm:px-5 sm:py-6 md:px-6">
      {/* Header */}
      <div className="mx-auto w-full min-w-0 max-w-[1280px]">
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
            <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0', maxWidth: 720, lineHeight: 1.45 }}>
              Site page views (each navigation is one hit) — not the same as unique people or live audience in a Zapp. Use{' '}
              <strong>Unique sessions</strong> and <strong>Distinct logged-in users</strong> for people-ish signals; use{' '}
              <strong>Live Zapps</strong> for who is in sessions right now.
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

        {loadError && !isLoading && (
          <div
            style={{
              marginBottom: 20,
              padding: '14px 18px',
              borderRadius: 12,
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              fontSize: 14,
            }}
          >
            {loadError}
          </div>
        )}

        {liveError && !isLoading && user && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: 12,
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              color: '#92400E',
              fontSize: 13,
            }}
          >
            {liveError}
          </div>
        )}

        {!isLoading && user && liveOverview && (
          <Card title="Live Zapps now" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Radio size={20} color="#00A6A6" />
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A2E' }}>
                  {liveOverview.totalLiveParticipants.toLocaleString()} live participant
                  {liveOverview.totalLiveParticipants === 1 ? '' : 's'}
                </span>
                <span style={{ fontSize: 13, color: '#6B7280' }}>
                  across {liveOverview.activeSessionCount} active session
                  {liveOverview.activeSessionCount === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            {liveOverview.sessions.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>
                No active Zapps right now. When a host starts a session and participants join, they appear here with join
                links.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Join', 'Participants', 'Title', 'Host', 'Status'].map((h) => (
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
                    {liveOverview.sessions.map((s) => (
                      <tr key={s.joinCode}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #F3F4F6' }}>
                          <Link
                            href={`/join/${encodeURIComponent(s.joinCode)}`}
                            style={{ color: '#00A6A6', fontWeight: 600, textDecoration: 'none' }}
                          >
                            /join/{s.joinCode}
                          </Link>
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #F3F4F6', fontWeight: 600 }}>
                          {s.participantCount}
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            borderBottom: '1px solid #F3F4F6',
                            maxWidth: 240,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={s.title}
                        >
                          {s.title || '—'}
                        </td>
                        <td
                          style={{
                            padding: '10px 12px',
                            borderBottom: '1px solid #F3F4F6',
                            fontFamily: 'monospace',
                            fontSize: 12,
                            color: '#6B7280',
                          }}
                        >
                          {s.hostId ? `${s.hostId.slice(0, 8)}…` : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #F3F4F6', color: '#6B7280' }}>
                          {s.isPaused ? 'Paused' : 'Live'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

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

        {/* Empty: no data in database */}
        {!isLoading && !loadError && allViews.length === 0 && (
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
            <h3 style={{ color: '#1A1A2E', fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>No traffic data yet</h3>
            <p style={{ color: '#6B7280', fontSize: 14, margin: '0 auto', maxWidth: 460, lineHeight: 1.5 }}>
              Page views are sent to <code style={{ fontSize: 12 }}>/api/track</code> on each navigation (device, OS, geo,
              referrer). Browse the public site while signed out or in, then refresh. If this stays empty, confirm{' '}
              <code style={{ fontSize: 12 }}>FIREBASE_ADMIN_*</code> is set so the track API can write to Realtime Database.
            </p>
          </div>
        )}

        {/* Filtered range has no rows */}
        {!isLoading && !loadError && allViews.length > 0 && views.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              background: '#ffffff',
              borderRadius: 16,
              border: '1px solid #E5E7EB',
              marginBottom: 16,
            }}
          >
            <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
              No page views in the selected date range. Try <strong>All Time</strong> or a wider window.
            </p>
          </div>
        )}

        {/* Dashboard content */}
        {!isLoading && views.length > 0 && (
          <>
            {capped && totalInDb != null && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1E40AF',
                  fontSize: 13,
                }}
              >
                Showing the <strong>{allViews.length.toLocaleString()}</strong> most recent events of{' '}
                <strong>{totalInDb.toLocaleString()}</strong> stored. Charts and tables use this sample; widen infrastructure
                later if you need full history in-browser.
              </div>
            )}
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
                label="Page views"
                value={totalPageViews}
                icon={<Globe size={22} />}
                bgColor="#00A6A6"
                textColor="#ffffff"
                hint="Every page load in this date range. One person browsing five pages counts as five."
              />
              <StatTile
                label="Unique sessions"
                value={uniqueVisitors}
                icon={<User size={22} />}
                bgColor="#EFCA08"
                textColor="#1A1A2E"
                hint="Estimated browsers (session id or IP + time bucket). Not the same as logged-in accounts."
              />
              <StatTile
                label="Distinct logged-in users"
                value={distinctLoggedInUsers}
                icon={<User size={22} />}
                bgColor="#007A7A"
                textColor="#ffffff"
                hint="Unique user IDs on logged-in hits in this range."
              />
              <StatTile
                label="Logged-in hits"
                value={loggedInHits}
                icon={<User size={22} />}
                bgColor="#F08700"
                textColor="#ffffff"
                hint="Page views while signed in (can be many per user)."
              />
              <StatTile
                label="Anonymous hits"
                value={anonymousHits}
                icon={<UserX size={22} />}
                bgColor="#F49F0A"
                textColor="#1A1A2E"
                hint="Page views with no Firebase user on the request."
              />
              <StatTile
                label="Bounce rate (est.)"
                value={`${engagement.bouncePct}%`}
                icon={<LogOut size={22} />}
                bgColor="#1A1A2E"
                textColor="#ffffff"
                hint="Share of sessions with only one page view in this sample."
              />
              <StatTile
                label="Multi-page sessions"
                value={engagement.multiPage}
                icon={<ArrowLeftRight size={22} />}
                bgColor="#00A6A6"
                textColor="#ffffff"
                hint="Sessions with more than one page view in the selected range."
              />
            </div>

            {/* Visits over time chart */}
            <Card title="Page views over time" style={{ marginBottom: 24 }}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={pageViewsOverTime} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
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
                    dataKey="pageViews"
                    name="Page views"
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

              <Card title="Top cities & regions">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={cityData} layout="vertical" margin={{ left: 4, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} width={118} />
                    <Tooltip
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid #E5E7EB',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {cityData.map((_, i) => (
                        <Cell key={i} fill={BRAND_COLORS[(i + 2) % BRAND_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Traffic sources (referrer host)">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={referrerData} layout="vertical" margin={{ left: 4, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} width={118} />
                    <Tooltip
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid #E5E7EB',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {referrerData.map((_, i) => (
                        <Cell key={i} fill={BRAND_COLORS[(i + 1) % BRAND_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Device breakdown */}
              <Card title="Device Types">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                  {deviceData.map((d, i) => {
                    const pct = totalPageViews > 0 ? Math.round((d.count / totalPageViews) * 100) : 0
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
                    const pct = totalPageViews > 0 ? Math.round((d.count / totalPageViews) * 100) : 0
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
                    const pct = totalPageViews > 0 ? Math.round((d.count / totalPageViews) * 100) : 0
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

              {/* Traffic by product section */}
              <Card title="Traffic by section" style={{ gridColumn: 'span 2' }}>
                <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px', lineHeight: 1.4 }}>
                  Paths grouped into product areas (marketing, app, join, admin, etc.), not individual URLs.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sectionData.map((p, i) => {
                    const pct = totalPageViews > 0 ? Math.round((p.count / totalPageViews) * 100) : 0
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
            <Card title="Recent page views">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Time', 'Page', 'Section', 'Referrer', 'User', 'Location', 'Device', 'OS', 'Browser', 'IP'].map(
                        (h) => (
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

                          {/* Section */}
                          <td
                            style={{
                              padding: '10px 12px',
                              borderBottom: '1px solid #F3F4F6',
                              maxWidth: 160,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: '#374151',
                              fontSize: 12,
                            }}
                          >
                            {pathToSection(v.path)}
                          </td>

                          {/* Referrer */}
                          <td
                            style={{
                              padding: '10px 12px',
                              borderBottom: '1px solid #F3F4F6',
                              maxWidth: 160,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: '#374151',
                              fontSize: 12,
                            }}
                            title={v.referrer ?? undefined}
                          >
                            {referrerHost(v.referrer)}
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
