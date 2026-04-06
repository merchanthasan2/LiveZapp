'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Edit, List, Play, Radio, Search, Trash2, Users } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePlanLimits } from '@/lib/hooks/usePlanLimits'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { PresentationService } from '@/lib/services/PresentationService'
import { LiveSessionService } from '@/lib/services/LiveSessionService'
import type { Presentation, PresentationStatus } from '@/types/domain'

/** Decorative sparkline for metric cards (light-mode analytics style). */
function MetricSparkline({ stroke }: { stroke: string }) {
  return (
    <svg viewBox="0 0 100 28" className="mt-3 h-7 w-full max-w-[140px]" aria-hidden>
      <path
        d="M0 22 C 18 8, 32 24, 50 14 S 78 20, 100 6"
        fill="none"
        stroke={stroke}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </svg>
  )
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const { isDark } = useTheme()
  const planLimits = usePlanLimits()
  const [presentations, setPresentations] = useState<Presentation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PresentationStatus | 'all'>('all')
  const [confirmDelete, setConfirmDelete] = useState<Presentation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!user) return
    let isMounted = true

    const loadPresentations = async () => {
      setIsLoading(true)
      try {
        const rows = await PresentationService.getUserPresentations(user.id)
        const staleLiveRows = rows.filter(p => p.status === 'live')
        const nextRows = [...rows]

        if (staleLiveRows.length > 0) {
          await Promise.all(staleLiveRows.map(async liveRow => {
            try {
              if (!liveRow.joinCode) {
                await PresentationService.updatePresentation(liveRow.id, { status: 'completed' })
                const missingJoinCodeIndex = nextRows.findIndex(item => item.id === liveRow.id)
                if (missingJoinCodeIndex >= 0) {
                  nextRows[missingJoinCodeIndex] = { ...nextRows[missingJoinCodeIndex], status: 'completed' }
                }
                return
              }

              const existing = await LiveSessionService.getSession(liveRow.joinCode)
              if (existing?.isActive) return

              await PresentationService.updatePresentation(liveRow.id, { status: 'completed' })
              const index = nextRows.findIndex(item => item.id === liveRow.id)
              if (index >= 0) {
                nextRows[index] = { ...nextRows[index], status: 'completed' }
              }
            } catch (error) {
              console.error('[dashboard] live status reconciliation failed', error)
            }
          }))
        }

        if (isMounted) setPresentations(nextRows)
      } catch (error) {
        console.error('[dashboard] failed to load presentations', error)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadPresentations()
    return () => { isMounted = false }
  }, [user])

  const filtered = useMemo(
    () => presentations
      .filter(p => filter === 'all' || p.status === filter)
      .filter(p => p.title.toLowerCase().includes(search.toLowerCase())),
    [presentations, filter, search]
  )

  const totalAudience = presentations.reduce((a, p) => a + (p.audienceSize || 0), 0)
  const totalQuestions = presentations.reduce((a, p) => a + (p.questionsCount || 0), 0)
  const liveNow = presentations.filter(p => p.status === 'live').length
  const currentPlanIndex = ['free', 'basic', 'regular', 'pro'].indexOf(planLimits.plan.id)
  const highestPlanIndex = 3
  const isTopPlan = currentPlanIndex >= highestPlanIndex
  const usageBarWidth = planLimits.presentationsRemaining === Infinity
    ? 100
    : Math.max(10, Math.min(100, ((planLimits.lifetimePresentationsCreated / Math.max(1, planLimits.lifetimePresentationsCreated + planLimits.presentationsRemaining)) * 100)))

  async function handleDelete() {
    if (!confirmDelete || !user) return
    setIsDeleting(true)
    try {
      await PresentationService.deletePresentation(user.id, confirmDelete.id)
      setPresentations(prev => prev.filter(p => p.id !== confirmDelete.id))
    } finally {
      setIsDeleting(false)
      setConfirmDelete(null)
    }
  }

  const pageBg = isDark ? '#12131c' : '#f8f7ff'
  const shellCard = isDark ? '#171821' : '#ffffff'
  const innerCard = isDark ? '#101725' : '#faf9ff'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(122, 58, 240, 0.08)'
  const cardShadow = isDark
    ? '0 12px 40px rgba(0,0,0,0.35)'
    : '0 4px 24px rgba(80, 50, 120, 0.07), 0 1px 3px rgba(15, 23, 42, 0.04)'
  const softShadow = isDark
    ? '0 8px 28px rgba(0,0,0,0.28)'
    : '0 2px 16px rgba(80, 50, 120, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)'
  const textStrong = isDark ? '#ffffff' : '#1a1a2e'
  const textMuted = isDark ? 'rgba(214,207,237,0.72)' : '#6b7280'
  const labelMuted = isDark ? 'rgba(214,207,237,0.55)' : '#9ca3af'
  const chipBg = isDark ? '#1d1f2a' : '#f3f0ff'
  const actionBg = isDark ? '#1f2433' : '#f3f0ff'
  const launchBg = isDark ? 'rgba(122,58,240,0.3)' : 'rgba(122, 58, 240, 0.12)'
  const launchText = isDark ? '#f4efff' : '#5b21b6'
  const progressTrack = isDark ? '#2a2d3a' : '#ede9fe'
  const metricAccents = isDark
    ? {
        a: { iconBg: 'rgba(167,139,250,0.22)', iconFg: '#c4b5fd', spark: '#a78bfa' },
        b: { iconBg: 'rgba(52,211,153,0.18)', iconFg: '#6ee7b7', spark: '#34d399' },
        c: { iconBg: 'rgba(251,191,36,0.18)', iconFg: '#fcd34d', spark: '#fbbf24' },
      }
    : {
        a: { iconBg: 'rgba(167, 139, 250, 0.22)', iconFg: '#7c3aed', spark: '#a78bfa' },
        b: { iconBg: 'rgba(52, 211, 153, 0.18)', iconFg: '#059669', spark: '#34d399' },
        c: { iconBg: 'rgba(251, 146, 60, 0.16)', iconFg: '#ea580c', spark: '#fb923c' },
      }
  const statusStyle: Record<PresentationStatus, { bg: string; text: string }> = isDark
    ? {
        draft: { bg: 'rgba(191,168,255,0.18)', text: '#d6c5ff' },
        scheduled: { bg: 'rgba(103,228,217,0.18)', text: '#95fff4' },
        live: { bg: 'rgba(126,243,225,0.20)', text: '#7ef3e1' },
        completed: { bg: 'rgba(247,181,143,0.18)', text: '#ffd0b3' },
      }
    : {
        draft: { bg: '#efe6ff', text: '#6c2bd9' },
        scheduled: { bg: '#dff7f2', text: '#0f766e' },
        live: { bg: '#e7faf5', text: '#0f766e' },
        completed: { bg: '#fff1e8', text: '#c2410c' },
      }

  return (
    <div className="min-h-[80vh] p-4 sm:p-6 lg:p-8 rounded-[1.75rem] md:rounded-[2rem]" style={{ background: pageBg }}>
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <section
          className="rounded-[1.75rem] p-6 md:p-8"
          style={{
            background: shellCard,
            border: `1px solid ${border}`,
            boxShadow: cardShadow,
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="text-center sm:text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: labelMuted }}>
                Your workspace
              </p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: textStrong }}>
                Zapp Dashboard
              </h1>
              <p className="text-sm mt-1" style={{ color: textMuted }}>
                Manage and launch your live Zapps.
              </p>
            </div>
            <Link
              href="/app/create"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full font-bold text-white text-center shadow-md transition-opacity hover:opacity-95"
              style={{
                background: 'linear-gradient(135deg, #650cd9, #7a3af0)',
                boxShadow: isDark ? '0 8px 24px rgba(101,12,217,0.35)' : '0 8px 24px rgba(101, 12, 217, 0.25)',
              }}
            >
              Create New
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              {
                label: 'Total participants',
                value: totalAudience.toLocaleString(),
                Icon: Users,
                ...metricAccents.a,
              },
              {
                label: 'Questions built',
                value: String(totalQuestions),
                Icon: List,
                ...metricAccents.b,
              },
              {
                label: 'Live now',
                value: String(liveNow),
                Icon: Radio,
                ...metricAccents.c,
              },
            ].map(m => (
              <div
                key={m.label}
                className="rounded-2xl p-5"
                style={{
                  background: isDark ? innerCard : '#ffffff',
                  border: `1px solid ${border}`,
                  boxShadow: softShadow,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ background: m.iconBg }}
                  >
                    <m.Icon className="h-5 w-5" style={{ color: m.iconFg }} aria-hidden />
                  </div>
                </div>
                <p
                  className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: labelMuted }}
                >
                  {m.label}
                </p>
                <p className="text-3xl md:text-4xl font-black mt-1 tabular-nums" style={{ color: textStrong }}>
                  {m.value}
                </p>
                <MetricSparkline stroke={m.spark} />
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search Zapps…"
                className="w-full rounded-full pl-11 pr-4 py-3 text-sm outline-none transition-shadow"
                style={{
                  background: isDark ? innerCard : '#f8f7ff',
                  border: `1px solid ${border}`,
                  color: textStrong,
                  boxShadow: isDark ? undefined : 'inset 0 1px 2px rgba(255,255,255,0.8)',
                }}
              />
            </div>
            <div className="flex gap-2 flex-wrap sm:justify-end">
              {(['all', 'draft', 'scheduled', 'live', 'completed'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilter(s)}
                  className="px-4 py-2 rounded-full text-xs font-bold capitalize transition-colors"
                  style={
                    filter === s
                      ? {
                          background: 'linear-gradient(135deg, #650cd9, #7a3af0)',
                          color: '#fff',
                          boxShadow: '0 4px 14px rgba(101, 12, 217, 0.28)',
                        }
                      : {
                          background: chipBg,
                          color: textMuted,
                          border: `1px solid ${border}`,
                        }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div
                className="rounded-2xl p-8 text-sm text-center"
                style={{ background: innerCard, color: textMuted, border: `1px solid ${border}`, boxShadow: softShadow }}
              >
                Loading Zapps…
              </div>
            ) : filtered.length === 0 ? (
              <div
                className="rounded-2xl p-8 text-sm text-center"
                style={{ background: innerCard, color: textMuted, border: `1px solid ${border}`, boxShadow: softShadow }}
              >
                No Zapps match this filter.
              </div>
            ) : filtered.map(p => {
              const presenterHref = p.status === 'live' ? `/app/present/${p.id}` : `/app/present/${p.id}?launch=1`
              const presenterTitle = p.status === 'live' ? 'Open live controls' : 'Go Zapp'
              return (
                <div
                  key={p.id}
                  className="rounded-2xl p-4 flex items-center gap-4 transition-shadow hover:shadow-md"
                  style={{
                    background: isDark ? innerCard : '#ffffff',
                    border: `1px solid ${border}`,
                    boxShadow: softShadow,
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-xs font-black uppercase shrink-0"
                    style={{
                      background: isDark ? 'rgba(122,58,240,0.18)' : 'rgba(167, 139, 250, 0.15)',
                      color: isDark ? '#d5c4ff' : '#6d28d9',
                    }}
                  >
                    {p.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate" style={{ color: textStrong }}>{p.title}</p>
                    <p className="text-xs" style={{ color: textMuted }}>{p.questionsCount ?? 0} questions • {p.audienceSize ?? 0} participants</p>
                    <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: statusStyle[p.status].bg, color: statusStyle[p.status].text }}>{p.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={presenterHref} className="p-2.5 rounded-full" style={{ background: launchBg, color: launchText }} title={presenterTitle}>
                      <Play className="w-4 h-4" />
                    </Link>
                    <Link href={`/app/create/${p.id}?step=questions`} className="p-2.5 rounded-full" style={{ background: actionBg, color: isDark ? '#d6cff0' : '#6941c6' }} title="Questions — edit or delete">
                      <List className="w-4 h-4" />
                    </Link>
                    <Link href={`/app/create/${p.id}`} className="p-2.5 rounded-full" style={{ background: actionBg, color: isDark ? '#d6cff0' : '#6941c6' }} title="Edit Zapp">
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button type="button" onClick={() => setConfirmDelete(p)} className="p-2.5 rounded-full" style={{ background: '#311d28', color: '#ffb1cb' }} title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div
            className="rounded-[1.75rem] p-6"
            style={{ background: shellCard, border: `1px solid ${border}`, boxShadow: cardShadow }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: labelMuted }}>
              Current plan
            </p>
            <p className="text-3xl font-black mt-2 tracking-tight" style={{ color: textStrong }}>
              {planLimits.plan.name}
            </p>
            <div className="mt-4 h-2.5 rounded-full overflow-hidden" style={{ background: progressTrack }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${usageBarWidth}%`,
                  background: isDark ? '#6ee7b7' : 'linear-gradient(90deg, #34d399, #6ee7b7)',
                }}
              />
            </div>
            <p className="text-xs mt-3 leading-relaxed" style={{ color: textMuted }}>
              {planLimits.presentationsRemaining === Infinity
                ? 'Unlimited Zapps available this month'
                : `${planLimits.presentationsRemaining} Zapps left this month on this tier`}
            </p>
            <Link
              href={isTopPlan ? '/app/settings' : '/plans'}
              className="mt-5 block w-full text-center rounded-full py-3 font-bold text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #650cd9, #7a3af0)' }}
            >
              {isTopPlan ? 'Manage Plan' : 'Explore Upgrades'}
            </Link>
          </div>

          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-[1.75rem] p-6 block transition-opacity hover:opacity-95"
              style={{ background: shellCard, border: `1px solid ${border}`, boxShadow: softShadow }}
            >
              <p className="font-bold text-lg" style={{ color: textStrong }}>
                Admin panel
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: textMuted }}>
                Manage users, finance and platform settings.
              </p>
            </Link>
          )}

          <div
            className="rounded-[1.75rem] p-6"
            style={{ background: shellCard, border: `1px solid ${border}`, boxShadow: softShadow }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: labelMuted }}>
              Quick actions
            </p>
            <div className="space-y-2">
              <Link
                href="/join"
                className="w-full block rounded-full px-4 py-3 text-sm font-semibold text-center"
                style={{ background: actionBg, color: isDark ? '#d6cff0' : '#5b21b6', border: `1px solid ${border}` }}
              >
                Open Join Screen
              </Link>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join`)}
                className="w-full rounded-full px-4 py-3 text-sm font-semibold text-center"
                style={{ background: actionBg, color: isDark ? '#d6cff0' : '#5b21b6', border: `1px solid ${border}` }}
              >
                Copy Join Link
              </button>
            </div>
          </div>
        </section>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !isDeleting && setConfirmDelete(null)}>
          <div
            className="w-full max-w-sm rounded-[1.5rem] p-6"
            style={{ background: shellCard, border: `1px solid ${border}`, boxShadow: cardShadow }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,120,151,0.2)' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: '#ffb1cb' }} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold" style={{ color: textStrong }}>Delete Zapp?</h3>
                <p className="text-sm" style={{ color: textMuted }}>{confirmDelete.title} will be permanently deleted.</p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setConfirmDelete(null)} disabled={isDeleting} className="flex-1 rounded-full py-3 font-semibold" style={{ background: actionBg, color: isDark ? '#d6cff0' : '#6941c6', border: `1px solid ${border}` }}>Cancel</button>
              <button type="button" onClick={handleDelete} disabled={isDeleting} className="flex-1 rounded-full py-3 font-bold" style={{ background: '#7a2947', color: '#ffd9e4' }}>{isDeleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

