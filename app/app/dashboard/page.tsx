'use client'

import { useState, useEffect } from 'react'
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
  quiz:      { label: 'Quiz',       bg: '#00A6A6', color: '#FFFFFF' }, // teal   → white text
  qa:        { label: 'Q&A',        bg: '#EFCA08', color: '#111111' }, // amber  → black text
  feedback:  { label: 'Feedback',   bg: '#BBDEF0', color: '#111111' }, // sky    → black text
  poll:      { label: 'Poll',       bg: '#F49F0A', color: '#111111' }, // golden → black text (NOT white — too low contrast)
  word_cloud:{ label: 'Word Cloud', bg: '#F08700', color: '#FFFFFF' }, // tiger  → white text
}

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  quiz: Sparkles, qa: MessageSquare, feedback: Star,
}

const STATUS_CFG: Record<PresentationStatus, { label: string; bg: string; color: string; dot?: boolean }> = {
  draft:     { label: 'Draft',     bg: '#BBDEF0', color: '#111111' }, // sky    → dark text
  scheduled: { label: 'Scheduled', bg: '#EFCA08', color: '#111111' }, // amber  → dark text
  live:      { label: 'Live',      bg: '#F08700', color: '#FFFFFF', dot: true }, // tiger → white text
  completed: { label: 'Done',      bg: '#00A6A6', color: '#FFFFFF' }, // teal   → white text
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
          <p className="text-2xl font-black text-[#111111]">{total}</p>
          <p className="text-[9px] text-[#9CA3AF] font-bold uppercase tracking-wide">TYPES</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-4 w-full">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
              <span className="text-[11px] text-[#6B7280]">{s.label}</span>
            </div>
            <span className="text-[11px] font-bold text-[#374151]">{s.value}</span>
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

  const typeCounts = presentations.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1
    return acc
  }, {})

  const donutSegments = [
    { value: typeCounts.quiz       ?? 0, color: '#00A6A6', label: 'Quiz' },
    { value: typeCounts.qa         ?? 0, color: '#EFCA08', label: 'Q&A' },
    { value: typeCounts.feedback   ?? 0, color: '#F08700', label: 'Feedback' },
    { value: typeCounts.poll       ?? 0, color: '#F49F0A', label: 'Poll' },
    { value: typeCounts.word_cloud ?? 0, color: '#6BBDD4', label: 'Word Cloud' }, // mid-blue — #BBDEF0 is too faint against white card
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
          <h1 className="text-3xl font-black text-[#111111] tracking-tight">Dashboard</h1>
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
            style={{ background: '#1A1A1A', minWidth: 260 }}
          >
            <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <input
              type="text"
              placeholder="Search presentations…"
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
        <StatCard
          label="Total Presentations"
          value={presentations.length}
          bg="#00A6A6"
          textColor="#FFFFFF"
          subColor="rgba(255,255,255,0.75)"
        />
        <StatCard
          label="Questions Built"
          value={totalQuestions.toLocaleString()}
          bg="#EFCA08"
          textColor="#111111"
          subColor="rgba(0,0,0,0.55)"
        />
        <StatCard
          label="Audience Reached"
          value={totalAudience > 999 ? `${(totalAudience/1000).toFixed(1)}k` : totalAudience}
          bg="#F49F0A"
          textColor="#111111"
          subColor="rgba(0,0,0,0.55)"
        />
        <StatCard
          label="Sessions Run"
          value={sessionsRun}
          bg="#F08700"
          textColor="#FFFFFF"
          subColor="rgba(255,255,255,0.75)"
        />
      </div>

      {/* ── Middle row: chart + donut + recent list ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-11 gap-4">

        {/* Activity trend — live data coming in Phase 11 */}
        <div className="lg:col-span-5 glass-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-[#111111]">Activity Trend</h2>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
            <BarChart3 className="w-8 h-8 text-[#D1D5DB]" />
            <p className="text-sm font-semibold text-[#6B7280]">No activity yet</p>
            <p className="text-xs text-[#9CA3AF]">Create your first Zapp to see trends here</p>
          </div>
        </div>

        {/* Donut: question types */}
        <div className="lg:col-span-3 glass-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-[#111111]">Question Types</h2>
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: '#1A1A1A' }}
            >
              All time
            </div>
          </div>

          {donutTotal > 0 ? (
            <DonutChart total={donutTotal} segments={donutSegments} />
          ) : (
            <div className="flex items-center justify-center h-40 text-[#9CA3AF] text-sm">
              No questions yet
            </div>
          )}
        </div>

        {/* Recent presentations */}
        <div className="lg:col-span-3 glass-card p-5 flex flex-col">
          <h2 className="text-base font-black text-[#111111] mb-4">Recent</h2>

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
                    style={{ borderBottom: '1px solid #F3F4F6' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full shrink-0"
                        style={{ background: '#F08700' }}
                      />
                      <p className="text-sm font-semibold text-[#111111] truncate max-w-[110px]">
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
                      <span className="text-xs font-bold text-[#374151]">
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
            New Presentation
          </Link>
        </div>
      </div>

      {/* ── Bottom row: filtered list + plan/stats ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Presentations table */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black text-[#111111]">My Presentations</h2>
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: '#1A1A1A' }}
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
                      ? s === 'live' ? '#F08700' : '#00A6A6'
                      : 'transparent',
                    color: isActive ? '#fff' : '#374151',
                    border: isActive
                      ? 'none'
                      : '1.5px solid rgba(0,0,0,0.12)',
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
                    style={{ borderBottom: '1px solid #F3F4F6' }}
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
                      <p className="text-sm font-semibold text-[#111111] truncate">{p.title}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{p.questionsCount ?? 0} questions</p>
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
                        className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#F08700] hover:bg-orange-50 transition-colors"
                        title="Go Live"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href={`/app/create/${p.id}`}
                        className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#00A6A6] hover:bg-teal-50 transition-colors"
                        title="Edit"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => setConfirmDelete(p)}
                        className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#EF4444] hover:bg-red-50 transition-colors"
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
                background: 'linear-gradient(135deg, rgba(240,135,0,0.12) 0%, rgba(240,135,0,0.06) 100%)',
                border: '1px solid rgba(240,135,0,0.28)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(240,135,0,0.20) 0%, rgba(240,135,0,0.10) 100%)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(240,135,0,0.12) 0%, rgba(240,135,0,0.06) 100%)')}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#F08700' }}
              >
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black" style={{ color: '#1A1A2E' }}>Admin Panel</p>
                <p className="text-xs mt-0.5" style={{ color: '#C07800' }}>Users · Revenue · Sessions · Settings</p>
              </div>
              <div
                className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg shrink-0"
                style={{ background: '#F08700', color: '#FFFFFF' }}
              >
                Open →
              </div>
            </Link>
          )}

          {/* Plan usage card */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-black text-[#111111]">Plan Usage</h2>
              <span
                className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg"
                style={{
                  background: plan.id === 'pro' ? '#F08700' : plan.id === 'free' ? '#6B7280' : '#00A6A6',
                  color: '#fff',
                }}
              >
                {plan.name}
              </span>
            </div>

            {/* Expiry notice */}
            {user?.planExpiresAt && plan.id !== 'free' && (
              <p className="text-[10px] text-[#9CA3AF] mb-4">
                {planLimits.isPlanExpired
                  ? <span className="text-red-500 font-semibold">Plan expired — upgrade to continue</span>
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
                      <span className="text-xs font-semibold text-[#374151]">{label}</span>
                      <span className="text-xs font-bold" style={{ color: isWarn ? '#F08700' : '#9CA3AF' }}>
                        {used}<span className="text-[#D1D5DB]">/{limit === 999 ? '∞' : limit}</span>
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
            <h2 className="text-base font-black text-[#111111] mb-4">Impact</h2>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Sessions',   value: sessionsRun,    bg: '#00A6A6', textColor: '#FFFFFF' }, // teal   → white
                { label: 'Live Now',   value: liveNow,        bg: '#F08700', textColor: '#FFFFFF' }, // tiger  → white
                { label: 'Questions',  value: totalQuestions, bg: '#EFCA08', textColor: '#111111' }, // amber  → black
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

            {/* Decorative geometric accent — nod to the Bauhaus palette */}
            <div className="mt-4 rounded-2xl overflow-hidden h-20 relative flex items-center justify-center gap-3"
              style={{ background: '#F0F6F9' }}>
              <div className="w-14 h-14 rounded-full" style={{ background: '#00A6A6', opacity: 0.7 }} />
              <div className="w-14 h-14 rounded-2xl rotate-12" style={{ background: '#EFCA08', opacity: 0.7 }} />
              <div className="w-14 h-14" style={{
                background: '#F08700', opacity: 0.7,
                clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              }} />
              <div className="w-10 h-10 rounded-lg" style={{ background: '#BBDEF0', border: '3px solid #00A6A6' }} />
              <p className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#374151] tracking-widest uppercase opacity-40">
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
              style={{ background: '#FFFFFF', boxShadow: '0 24px 48px rgba(0,0,0,0.18)' }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold" style={{ color: '#111111' }}>Delete Zapp?</h3>
                  <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                    <span className="font-semibold" style={{ color: '#111111' }}>&quot;{confirmDelete.title}&quot;</span> will be permanently deleted. This cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5">
                <button
                  onClick={() => setConfirmDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ background: '#F5F7FA', color: '#374151', border: '1px solid #E5E7EB' }}
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
