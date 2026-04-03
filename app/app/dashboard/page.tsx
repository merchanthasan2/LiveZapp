'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, FileText,
  Sparkles, BarChart3, MessageSquare, Cloud, Star, Radio,
  Clock, CheckCircle2, Users, Play, Trash2, AlertTriangle, Shield,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePlanLimits } from '@/lib/hooks/usePlanLimits'
import { PresentationService } from '@/lib/services/PresentationService'
import { PLANS } from '@/types/plans'
import type { Presentation, PresentationStatus } from '@/types/domain'

// ─── Constants ────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  quiz:      { label: 'Quiz',       bg: '#ffc300',               color: '#000814' },
  qa:        { label: 'Q&A',        bg: '#1e96fc',               color: '#FFFFFF' },
  feedback:  { label: 'Feedback',   bg: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' },
  poll:      { label: 'Poll',       bg: '#ffd60a',               color: '#000814' },
  word_cloud:{ label: 'Word Cloud', bg: '#072ac8',               color: '#FFFFFF' },
}

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  quiz: Sparkles, qa: MessageSquare, feedback: Star,
}

const STATUS_CFG: Record<PresentationStatus, { label: string; bg: string; color: string; dot?: boolean }> = {
  draft:     { label: 'Draft',     bg: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' },
  scheduled: { label: 'Scheduled', bg: '#ffd60a',               color: '#000814' },
  live:      { label: 'Live',      bg: '#ffc300',               color: '#000814', dot: true },
  completed: { label: 'Done',      bg: 'rgba(30,150,252,0.20)', color: '#1e96fc' },
}


// ─── Donut chart (SVG) ────────────────────────────────────────────────────

function DonutChart({ total, segments }: {
  total: number
  segments: { value: number; color: string; label: string }[]
}) {
  const r = 56
  const cx = 72; const cy = 72
  const circumference = 2 * Math.PI * r
  let offset = 0

  const arcs = segments.map(s => {
    const pct   = total > 0 ? s.value / total : 0
    const dash  = pct * circumference
    const gap   = circumference - dash
    const arc   = { dash, gap, offset, ...s }
    offset += dash
    return arc
  })

  return (
    <div className="flex flex-col items-center mt-4">
      <div className="relative w-36 h-36">
        <svg width="144" height="144" viewBox="0 0 144 144">
          {arcs.map((a, i) => (
            <circle
              key={i}
              r={r} cx={cx} cy={cy}
              fill="none"
              stroke={a.color}
              strokeWidth="18"
              strokeDasharray={`${a.dash} ${a.gap}`}
              strokeDashoffset={-a.offset + circumference * 0.25}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-black" style={{ color: '#FFFFFF' }}>{total}</p>
          <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.38)' }}>TYPES</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-4 w-full">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{s.label}</span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────

function StatCard({ label, value, bg, textColor, subColor }: {
  label: string
  value: string | number
  bg: string
  textColor: string
  subColor: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 flex flex-col justify-between min-h-[120px]"
      style={{ background: bg }}
    >
      <p className="text-sm font-bold" style={{ color: subColor }}>{label}</p>
      <p className="text-4xl font-black mt-2 leading-none" style={{ color: textColor }}>
        {value}
      </p>
    </motion.div>
  )
}

function ActivityTrendChart({
  points,
  maxPoints,
}: {
  points: { label: string; count: number }[]
  maxPoints: number
}) {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex items-end justify-center gap-2 mt-2 h-[92px] w-full">
        {points.map(p => {
          const height = 10 + Math.round((p.count / maxPoints) * 72)
          const isActive = p.count > 0
          return (
            <div key={p.label} className="flex flex-col items-center justify-end gap-2">
              <div
                className="w-2.5 rounded-full"
                style={{
                  height,
                  background: isActive ? '#ffc300' : 'rgba(255,255,255,0.07)',
                  boxShadow: isActive ? '0 0 0 3px rgba(255,195,0,0.18)' : 'none',
                }}
              />
              <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const planLimits = usePlanLimits()
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [isLoading,     setIsLoading]     = useState(true)
  const [filter,        setFilter]        = useState<PresentationStatus | 'all'>('all')
  const [search,        setSearch]        = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Presentation | null>(null)
  const [isDeleting,    setIsDeleting]    = useState(false)

  const plan    = planLimits.plan
  const maxPres = plan.limits.maxPresentations === 'unlimited' ? 999 : plan.limits.maxPresentations

  useEffect(() => {
    if (!user) return
    PresentationService.getUserPresentations(user.id)
      .then(setPresentations)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [user])

  const handleDelete = async () => {
    if (!confirmDelete || !user) return
    setIsDeleting(true)
    try {
      await PresentationService.deletePresentation(user.id, confirmDelete.id)
      setPresentations(prev => prev.filter(p => p.id !== confirmDelete.id))
    } catch (e) {
      console.error('Delete failed', e)
    } finally {
      setIsDeleting(false)
      setConfirmDelete(null)
    }
  }


  // ── Derived stats ──────────────────────────────────────────────────────
  const totalQuestions = presentations.reduce((a, p) => a + (p.questionsCount || 0), 0)
  const totalAudience  = presentations.reduce((a, p) => a + (p.audienceSize   || 0), 0)
  const sessionsRun    = presentations.filter(p => p.status === 'completed').length
  const liveNow        = presentations.filter(p => p.status === 'live').length

  const activitySeries = useMemo(() => {
    const now = new Date()
    const toDayKey = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    const days = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(now)
      d.setDate(now.getDate() - (6 - idx))
      return {
        key: toDayKey(d),
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }
    })

    const counts: Record<string, number> = {}
    for (const p of presentations) {
      if (!p.updatedAt) continue
      const d = new Date(p.updatedAt)
      if (Number.isNaN(d.getTime())) continue
      const key = toDayKey(d)
      counts[key] = (counts[key] ?? 0) + 1
    }

    return days.map(d => ({ label: d.label, count: counts[d.key] ?? 0 }))
  }, [presentations])

  const activityTotal = activitySeries.reduce((a, p) => a + p.count, 0)
  const activityMax = Math.max(...activitySeries.map(p => p.count), 1)

  const typeCounts = presentations.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1
    return acc
  }, {})

  const donutSegments = [
    { value: typeCounts.quiz       ?? 0, color: '#ffc300', label: 'Quiz' },
    { value: typeCounts.qa         ?? 0, color: '#1e96fc', label: 'Q&A' },
    { value: typeCounts.feedback   ?? 0, color: '#ffd60a', label: 'Feedback' },
    { value: typeCounts.poll       ?? 0, color: '#072ac8', label: 'Poll' },
    { value: typeCounts.word_cloud ?? 0, color: '#a2d6f9', label: 'Word Cloud' },
  ].filter(s => s.value > 0)

  const donutTotal = donutSegments.reduce((a, s) => a + s.value, 0)

  // ── Filtered presentations ─────────────────────────────────────────────
  const filtered = presentations
    .filter(p => filter === 'all' || p.status === filter)
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()))

  const recent = [...presentations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 7)

  return (
    <>
    <div className="space-y-5 pb-14">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#FFFFFF' }}>Dashboard</h1>
          {liveNow > 0 && (
            <p className="text-sm text-[#6B7280] mt-0.5 flex items-center gap-1.5">
              <span className="live-badge"><span className="live-dot" />{liveNow} live</span>
              session{liveNow > 1 ? 's' : ''} running
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div
            className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 260 }}
          >
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <input
              type="text"
              placeholder="Search Zapps…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm text-white/70 placeholder:text-white/30 outline-none flex-1"
            />
          </div>

          {/* New presentation */}

          <Link href="/app/create" className="btn-primary shrink-0">
            <Plus className="w-4 h-4" /> New
          </Link>
        </div>
      </div>

      {/* ── Stat cards row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Zapps"       value={presentations.length}                                                     bg="#ffc300"               textColor="#000814"              subColor="rgba(0,8,20,0.65)" />
        <StatCard label="Questions Built"   value={totalQuestions.toLocaleString()}                                           bg="#003566"               textColor="#FFFFFF"              subColor="rgba(255,255,255,0.55)" />
        <StatCard label="Audience Reached"  value={totalAudience > 999 ? `${(totalAudience/1000).toFixed(1)}k` : totalAudience} bg="#001d3d"            textColor="#ffc300"             subColor="rgba(255,195,0,0.60)" />
        <StatCard label="Sessions Run"      value={sessionsRun}                                                               bg="rgba(255,255,255,0.07)" textColor="#FFFFFF"             subColor="rgba(255,255,255,0.45)" />
      </div>

      {/* ── Middle row: chart + donut + recent list ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-11 gap-4">

        {/* Activity trend — live data coming in Phase 11 */}
        <div className="lg:col-span-5 glass-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black" style={{ color: '#FFFFFF' }}>Activity Trend</h2>
          </div>
          {activityTotal === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
              <BarChart3 className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.20)' }} />
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.50)' }}>No activity yet</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>Create your first Zapp to see trends here</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6 text-center">
              <ActivityTrendChart points={activitySeries} maxPoints={activityMax} />
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>{activityTotal} updates</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Last 7 days (by last update)</p>
            </div>
          )}
        </div>

        {/* Donut: question types */}
        <div className="lg:col-span-3 glass-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black" style={{ color: '#FFFFFF' }}>Question Types</h2>
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}
            >
              All time
            </div>
          </div>

          {donutTotal > 0 ? (
            <DonutChart total={donutTotal} segments={donutSegments} />
          ) : (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              No questions yet
            </div>
          )}
        </div>

        {/* Recent presentations */}
        <div className="lg:col-span-3 glass-card p-5 flex flex-col">
          <h2 className="text-base font-black mb-4" style={{ color: '#FFFFFF' }}>Recent</h2>

          <div className="flex-1 space-y-0 overflow-y-auto scrollbar-hide">
            {recent.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-8">No presentations yet</p>
            ) : (
              recent.map(p => {
                const badge = TYPE_BADGE[p.type] ?? TYPE_BADGE.quiz
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2.5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full shrink-0"
                        style={{ background: '#ffc300' }}
                      />
                      <p className="text-sm font-semibold truncate max-w-[110px]" style={{ color: '#FFFFFF' }}>
                        {p.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wide"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {p.questionsCount ?? 0}q
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <Link
            href="/app/create"
            className="btn-primary w-full justify-center mt-4 text-sm"
          >
            New Zapp
          </Link>
        </div>
      </div>

      {/* ── Bottom row: filtered list + plan/stats ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Zapps table */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black" style={{ color: '#FFFFFF' }}>My Zapps</h2>
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}
            >
              {presentations.length} total
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['all', 'draft', 'live', 'completed'] as const).map(s => {
              const isActive = filter === s
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all"
                  style={{
                    background: isActive
                      ? s === 'live' ? '#ffc300' : '#ffc300'
                      : 'transparent',
                    color: isActive ? '#000814' : 'rgba(255,255,255,0.55)',
                    border: isActive
                      ? 'none'
                      : '1.5px solid rgba(255,255,255,0.12)',
                  }}
                >
                  {s === 'live' && isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1 animate-pulse align-middle" />}
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              )
            })}
          </div>

          {/* List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-10 rounded-xl shimmer-skeleton" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[#9CA3AF] text-sm">
                {filter === 'all' ? 'No presentations yet' : `No ${filter} presentations`}
              </p>
              {filter === 'all' && (
                <Link href="/app/create" className="btn-primary inline-flex mt-3 text-sm">
                  <Plus className="w-4 h-4" /> Create one
                </Link>
              )}
            </div>
          ) : (
            <AnimatePresence>
              {filtered.slice(0, 6).map((p, i) => {
                const st    = STATUS_CFG[p.status]
                const badge = TYPE_BADGE[p.type] ?? TYPE_BADGE.quiz
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 py-2.5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {/* Dot */}
                    <div
                      className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center"
                      style={{ background: badge.bg }}
                    >
                      <span className="text-[8px] font-black" style={{ color: badge.color }}>
                        {badge.label[0]}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#FFFFFF' }}>{p.title}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.questionsCount ?? 0} questions</p>
                    </div>

                    {/* Status badge */}
                    <span
                      className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md tracking-wide shrink-0"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {st.dot && <span className="inline-block w-1 h-1 rounded-full bg-green-600 mr-1 align-middle" />}
                      {st.label}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/app/present/${p.id}`}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ffc300'; e.currentTarget.style.background = 'rgba(255,195,0,0.10)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent' }}
                        title="Go Live"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href={`/app/create/${p.id}`}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#1e96fc'; e.currentTarget.style.background = 'rgba(30,150,252,0.10)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent' }}
                        title="Edit"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => setConfirmDelete(p)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = 'transparent' }}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Plan usage + impact visual */}
        <div className="flex flex-col gap-4">

          {/* Admin Panel card — admins only */}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-4 p-5 rounded-2xl transition-all group"
              style={{
                background: 'rgba(255,195,0,0.08)',
                border: '1px solid rgba(255,195,0,0.22)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,195,0,0.16)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,195,0,0.08)')}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#ffc300' }}
              >
                <Shield className="w-5 h-5" style={{ color: '#000814' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black" style={{ color: '#FFFFFF' }}>Admin Panel</p>
                <p className="text-xs mt-0.5" style={{ color: '#ffc300' }}>Users · Revenue · Sessions · Settings</p>
              </div>
              <div
                className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg shrink-0"
                style={{ background: '#ffc300', color: '#000814' }}
              >
                Open →
              </div>
            </Link>
          )}

          {/* Plan usage card */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-black" style={{ color: '#FFFFFF' }}>Plan Usage</h2>
              <span
                className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg"
                style={{
                  background: plan.id === 'pro' ? '#ffd60a' : plan.id === 'free' ? 'rgba(255,255,255,0.10)' : '#ffc300',
                  color: plan.id === 'free' ? 'rgba(255,255,255,0.60)' : '#000814',
                }}
              >
                {plan.name}
              </span>
            </div>

            {/* Expiry notice */}
            {user?.planExpiresAt && plan.id !== 'free' && (
              <p className="text-[10px] mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {planLimits.isPlanExpired
                  ? <span style={{ color: '#F87171', fontWeight: 600 }}>Plan expired — upgrade to continue</span>
                  : user?.planCancelledAt
                  ? `Cancelled · Access until ${new Date(user.planExpiresAt).toLocaleDateString()}`
                  : `Active until ${new Date(user.planExpiresAt).toLocaleDateString()}`
                }
              </p>
            )}

            <div className="space-y-4 mt-4">
              {[
                {
                  label: 'Sessions (lifetime)',
                  used: planLimits.lifetimePresentationsCreated,
                  limit: maxPres,
                  tooltip: 'Counts all sessions ever created, including deleted',
                },
                {
                  label: 'Questions Built',
                  used: totalQuestions,
                  limit: plan.limits.maxQuestionsPerPresentation,
                  tooltip: 'Per-session question limit',
                },
                {
                  label: 'Max Participants',
                  used: totalAudience,
                  limit: plan.limits.maxParticipantsPerSession,
                  tooltip: 'Max participants per live session',
                },
              ].map(({ label, used, limit }) => {
                const pct    = Math.min(Math.round((used / limit) * 100), 100)
                const isWarn = pct > 75
                return (
                  <div key={label}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>{label}</span>
                      <span className="text-xs font-bold" style={{ color: isWarn ? '#ffc300' : 'rgba(255,255,255,0.38)' }}>
                        {used}<span style={{ color: 'rgba(255,255,255,0.25)' }}>/{limit === 999 ? '∞' : limit}</span>
                      </span>
                    </div>
                    <div className="usage-bar-track">
                      <motion.div
                        className={`usage-bar-fill ${isWarn ? 'usage-bar-fill-warning' : ''}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1], delay: 0.3 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2 mt-5">
              <Link href="/plans" className="btn-primary flex-1 justify-center text-sm">
                {plan.id === 'free' ? 'Upgrade Plan' : 'Change Plan'}
              </Link>
              {plan.id !== 'free' && (
                <Link href="/app/settings" className="btn-ghost text-sm px-3">
                  Manage
                </Link>
              )}
            </div>
          </div>

          {/* Impact stats */}
          <div className="glass-card p-5">
            <h2 className="text-base font-black mb-4" style={{ color: '#FFFFFF' }}>Impact</h2>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Sessions',  value: sessionsRun,    bg: '#ffc300',               textColor: '#000814' },
                { label: 'Live Now',  value: liveNow,        bg: 'rgba(255,255,255,0.07)', textColor: '#FFFFFF' },
                { label: 'Questions', value: totalQuestions, bg: '#003566',               textColor: '#ffc300' },
              ].map(({ label, value, bg, textColor }) => (
                <div
                  key={label}
                  className="rounded-2xl p-3 text-center"
                  style={{ background: bg }}
                >
                  <p className="text-2xl font-black" style={{ color: textColor }}>{value}</p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Decorative geometric accent */}
            <div className="mt-4 rounded-2xl overflow-hidden h-20 relative flex items-center justify-center gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-14 h-14 rounded-full" style={{ background: '#ffc300', opacity: 0.6 }} />
              <div className="w-14 h-14 rounded-2xl rotate-12" style={{ background: '#1e96fc', opacity: 0.5 }} />
              <div className="w-14 h-14" style={{
                background: '#003566', opacity: 0.8,
                clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              }} />
              <div className="w-10 h-10 rounded-lg" style={{ background: '#003566', border: '3px solid #1e96fc' }} />
              <p className="absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-widest uppercase opacity-40" style={{ color: '#FFFFFF' }}>
                LiveZapp
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ── Delete confirm modal ──────────────────────────────────────── */}
    <AnimatePresence>
      {confirmDelete && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => !isDeleting && setConfirmDelete(null)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18 }}
            className="fixed z-50 inset-0 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-sm rounded-2xl p-6 pointer-events-auto"
              style={{ background: '#001d3d', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 24px 48px rgba(0,0,0,0.60)' }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold" style={{ color: '#FFFFFF' }}>Delete Zapp?</h3>
                  <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    <span className="font-semibold" style={{ color: '#FFFFFF' }}>&quot;{confirmDelete.title}&quot;</span> will be permanently deleted. This cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5">
                <button
                  onClick={() => setConfirmDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                  style={{ background: '#EF4444', color: '#FFFFFF' }}
                >
                  {isDeleting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting…
                    </span>
                  ) : 'Delete'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  )
}
