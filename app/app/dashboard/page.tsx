'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Edit, Play, Search, Trash2, Users } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePlanLimits } from '@/lib/hooks/usePlanLimits'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { PresentationService } from '@/lib/services/PresentationService'
import type { Presentation, PresentationStatus } from '@/types/domain'

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
    PresentationService.getUserPresentations(user.id)
      .then(setPresentations)
      .catch(console.error)
      .finally(() => setIsLoading(false))
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

  const pageBg = isDark ? '#12131c' : '#fcf9f8'
  const shellCard = isDark ? '#171821' : '#ffffff'
  const innerCard = isDark ? '#101725' : '#f8f5fb'
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,116,135,0.14)'
  const textStrong = isDark ? '#ffffff' : '#1c1b1b'
  const textMuted = isDark ? 'rgba(214,207,237,0.72)' : '#4f4860'
  const chipBg = isDark ? '#1d1f2a' : '#eee7f7'
  const actionBg = isDark ? '#1f2433' : '#ede7f7'
  const launchBg = isDark ? 'rgba(122,58,240,0.3)' : '#ede4ff'
  const launchText = isDark ? '#f4efff' : '#5a1cbc'
  const progressTrack = isDark ? '#2a2d3a' : '#ebe3f4'
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
    <div className="min-h-[80vh] rounded-[2rem] p-6 lg:p-8" style={{ background: pageBg, border: `1px solid ${border}` }}>
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <section className="rounded-3xl p-6" style={{ background: shellCard, border: `1px solid ${border}` }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-4xl font-black" style={{ color: textStrong }}>Zapp Dashboard</h1>
              <p className="text-sm" style={{ color: textMuted }}>Manage and launch your live Zapps.</p>
            </div>
            <Link href="/app/create" className="px-5 py-3 rounded-2xl font-bold text-white" style={{ background: 'linear-gradient(135deg,#650cd9,#7a3af0)' }}>
              Create New
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl p-4" style={{ background: innerCard, border: `1px solid ${border}` }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: textMuted }}>Total Participants</p>
              <p className="text-4xl font-black mt-1" style={{ color: textStrong }}>{totalAudience.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: innerCard, border: `1px solid ${border}` }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: textMuted }}>Questions Built</p>
              <p className="text-4xl font-black mt-1" style={{ color: textStrong }}>{totalQuestions}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: innerCard, border: `1px solid ${border}` }}>
              <p className="text-xs uppercase tracking-widest" style={{ color: textMuted }}>Live Now</p>
              <p className="text-4xl font-black" style={{ color: '#7ef3e1' }}>{liveNow}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Zapps" className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none" style={{ background: innerCard, border: `1px solid ${border}`, color: textStrong }} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'draft', 'scheduled', 'live', 'completed'] as const).map(s => (
                <button key={s} onClick={() => setFilter(s)} className="px-3 py-1.5 rounded-full text-xs font-bold capitalize" style={filter === s ? { background: '#7a3af0', color: '#fff' } : { background: chipBg, color: textMuted, border: !isDark ? '1px solid rgba(123,116,135,0.12)' : undefined }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-2xl p-6 text-sm" style={{ background: innerCard, color: textMuted }}>Loading Zapps...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl p-6 text-sm" style={{ background: innerCard, color: textMuted }}>No Zapps match this filter.</div>
            ) : filtered.map(p => (
              <div key={p.id} className="rounded-2xl p-4 flex items-center gap-4" style={{ background: innerCard, border: `1px solid ${border}` }}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xs font-black uppercase" style={{ background: isDark ? 'rgba(122,58,240,0.18)' : '#ece2ff', color: isDark ? '#d5c4ff' : '#6c2bd9' }}>{p.type}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate" style={{ color: textStrong }}>{p.title}</p>
                  <p className="text-xs" style={{ color: textMuted }}>{p.questionsCount ?? 0} questions • {p.audienceSize ?? 0} participants</p>
                  <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: statusStyle[p.status].bg, color: statusStyle[p.status].text }}>{p.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/app/present/${p.id}?launch=1`} className="p-2 rounded-xl" style={{ background: launchBg, color: launchText }} title="Go Zapp">
                    <Play className="w-4 h-4" />
                  </Link>
                  <Link href={`/app/create/${p.id}`} className="p-2 rounded-xl" style={{ background: actionBg, color: isDark ? '#d6cff0' : '#6941c6' }} title="Edit">
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button onClick={() => setConfirmDelete(p)} className="p-2 rounded-xl" style={{ background: '#311d28', color: '#ffb1cb' }} title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl p-5" style={{ background: shellCard, border: `1px solid ${border}` }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: textMuted }}>Current Plan</p>
            <p className="text-3xl font-black mt-1" style={{ color: textStrong }}>{planLimits.plan.name}</p>
            <div className="mt-3 h-2 rounded-full" style={{ background: progressTrack }}>
              <div className="h-full rounded-full" style={{ width: `${usageBarWidth}%`, background: '#7ef3e1' }} />
            </div>
            <p className="text-xs mt-2" style={{ color: textMuted }}>{planLimits.presentationsRemaining === Infinity ? 'Unlimited Zapps available' : `${planLimits.presentationsRemaining} Zapps left on this tier`}</p>
            <Link href={isTopPlan ? '/app/settings' : '/plans'} className="mt-4 block w-full text-center rounded-xl py-2.5 font-bold text-white" style={{ background: 'linear-gradient(135deg,#650cd9,#7a3af0)' }}>
              {isTopPlan ? 'Manage Plan' : 'Explore Upgrades'}
            </Link>
          </div>

          {isAdmin && (
            <Link href="/admin" className="rounded-3xl p-5 block" style={{ background: shellCard, border: `1px solid ${border}` }}>
              <p className="font-bold" style={{ color: textStrong }}>Admin Panel</p>
              <p className="text-xs" style={{ color: textMuted }}>Manage users, finance and platform settings.</p>
            </Link>
          )}

          <div className="rounded-3xl p-5" style={{ background: shellCard, border: `1px solid ${border}` }}>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: textMuted }}>Quick actions</p>
            <div className="space-y-2">
              <Link href="/join" className="w-full block rounded-xl px-3 py-2 text-sm font-semibold" style={{ background: actionBg, color: isDark ? '#d6cff0' : '#6941c6' }}>Open Join Screen</Link>
              <button onClick={() => navigator.clipboard.writeText(window.location.origin + '/join')} className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-left" style={{ background: actionBg, color: isDark ? '#d6cff0' : '#6941c6' }}>Copy Join Link</button>
            </div>
          </div>
        </section>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !isDeleting && setConfirmDelete(null)}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: shellCard, border: `1px solid ${border}` }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,120,151,0.2)' }}>
                <AlertTriangle className="w-5 h-5" style={{ color: '#ffb1cb' }} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold" style={{ color: textStrong }}>Delete Zapp?</h3>
                <p className="text-sm" style={{ color: textMuted }}>{confirmDelete.title} will be permanently deleted.</p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmDelete(null)} disabled={isDeleting} className="flex-1 rounded-xl py-2.5 font-semibold" style={{ background: actionBg, color: isDark ? '#d6cff0' : '#6941c6' }}>Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 rounded-xl py-2.5 font-bold" style={{ background: '#7a2947', color: '#ffd9e4' }}>{isDeleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

