'use client'

import { useState, useEffect } from 'react'
import { ref, get } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import { PLANS } from '@/types/plans'
import {
  Users, Search, ChevronUp, ChevronDown,
  LayoutDashboard, HelpCircle, Radio, RefreshCw,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────

interface MemberRow {
  uid:           string
  name:          string
  email:         string
  planId:        string
  role:          string
  presentations: number
  questions:     number
  sessions:      number
  joinedAt:      string | null
}

// ─── Plan badge ───────────────────────────────────────────────────────────

const PLAN_BADGE: Record<string, { bg: string; text: string }> = {
  free:    { bg: '#BBDEF0', text: '#1A1A2E' },
  basic:   { bg: '#00A6A6', text: '#FFFFFF' },
  regular: { bg: '#EFCA08', text: '#1A1A2E' },
  pro:     { bg: '#F08700', text: '#FFFFFF' },
}

// ─── Sort helper ──────────────────────────────────────────────────────────

type SortKey = 'name' | 'planId' | 'presentations' | 'questions' | 'sessions' | 'joinedAt'

function sortRows(rows: MemberRow[], key: SortKey, asc: boolean): MemberRow[] {
  return [...rows].sort((a, b) => {
    const av = a[key] ?? ''
    const bv = b[key] ?? ''
    if (typeof av === 'number' && typeof bv === 'number') return asc ? av - bv : bv - av
    return asc
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av))
  })
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function AdminMembersPage() {
  const [members, setMembers]     = useState<MemberRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch]       = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [sortKey, setSortKey]     = useState<SortKey>('joinedAt')
  const [sortAsc, setSortAsc]     = useState(false)

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    setIsLoading(true)
    try {
      // Fetch all users node
      const usersSnap = await get(ref(rtdb, 'users'))
      if (!usersSnap.exists()) { setMembers([]); return }

      const usersData = usersSnap.val() as Record<string, any>

      const rows: MemberRow[] = await Promise.all(
        Object.entries(usersData).map(async ([uid, userData]) => {
          // Count presentations from the user's index
          const presKeys = userData.presentations
            ? Object.keys(userData.presentations)
            : []
          const presentationCount = presKeys.length

          // Sum questions + count completed/live sessions across presentations
          let totalQuestions = 0
          let totalSessions  = 0

          if (presKeys.length > 0) {
            const presData = await Promise.all(
              presKeys.map(pid => get(ref(rtdb, `presentations/${pid}`)))
            )
            presData.forEach(snap => {
              if (!snap.exists()) return
              const p = snap.val()
              totalQuestions += p.questionsCount ?? 0
              if (p.status === 'live' || p.status === 'completed') totalSessions++
            })
          }

          return {
            uid,
            name:          userData.name          ?? 'Unknown',
            email:         userData.email         ?? '—',
            planId:        userData.planId        ?? 'free',
            role:          userData.role          ?? 'user',
            presentations: presentationCount,
            questions:     totalQuestions,
            sessions:      totalSessions,
            joinedAt:      userData.createdAt     ?? null,
          } satisfies MemberRow
        })
      )

      setMembers(rows)
    } catch (e) {
      console.error('Failed to load members', e)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter + sort
  const filtered = sortRows(
    members.filter(m => {
      const matchSearch = !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
      const matchPlan = planFilter === 'all' || m.planId === planFilter
      return matchSearch && matchPlan
    }),
    sortKey,
    sortAsc,
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20" />
    return sortAsc
      ? <ChevronUp   className="w-3 h-3" style={{ color: '#00A6A6' }} />
      : <ChevronDown className="w-3 h-3" style={{ color: '#00A6A6' }} />
  }

  // Summary totals
  const totalPresentations = members.reduce((s, m) => s + m.presentations, 0)
  const totalQuestions     = members.reduce((s, m) => s + m.questions, 0)
  const totalSessions      = members.reduce((s, m) => s + m.sessions, 0)

  return (
    <div className="space-y-6 pb-12 max-w-7xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: '#9CA3AF' }}>
            Admin console
          </p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1A1A2E' }}>
            Members <span style={{ color: '#00A6A6' }}>({members.length})</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            All registered accounts and their activity
          </p>
        </div>
        <button
          onClick={loadMembers}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all self-start"
          style={{ background: 'rgba(0,166,166,0.10)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.22)' }}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total members',     value: members.length,    bg: '#00A6A6', text: '#FFFFFF', icon: Users          },
          { label: 'Zapps made',        value: totalPresentations,bg: '#EFCA08', text: '#1A1A2E', icon: LayoutDashboard },
          { label: 'Questions created', value: totalQuestions,    bg: '#F49F0A', text: '#1A1A2E', icon: HelpCircle      },
          { label: 'Sessions presented',value: totalSessions,     bg: '#F08700', text: '#FFFFFF', icon: Radio           },
        ].map(tile => {
          const Icon = tile.icon
          return (
            <div
              key={tile.label}
              className="rounded-2xl p-5 flex items-center gap-4"
              style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: tile.bg }}
              >
                <Icon className="w-5 h-5" style={{ color: tile.text }} />
              </div>
              <div>
                <p className="text-xl font-black" style={{ color: '#1A1A2E' }}>{tile.value.toLocaleString()}</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>{tile.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1A1A2E' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#00A6A6' }}
            onBlur={e  => { e.currentTarget.style.borderColor = '#E5E7EB' }}
          />
        </div>

        <div
          className="flex rounded-xl overflow-hidden text-xs font-bold"
          style={{ border: '1px solid #E5E7EB', background: '#F5F7FA' }}
        >
          {['all', 'free', 'basic', 'regular', 'pro'].map(p => (
            <button
              key={p}
              onClick={() => setPlanFilter(p)}
              className="px-3 py-2.5 capitalize transition-all"
              style={
                planFilter === p
                  ? { background: '#1A1A2E', color: '#FFFFFF' }
                  : { color: '#6B7280' }
              }
            >
              {p === 'all' ? 'All plans' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(0,166,166,0.20)', borderTopColor: '#00A6A6' }} />
            <p className="text-sm" style={{ color: '#9CA3AF' }}>Loading members…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Users className="w-10 h-10 mx-auto" style={{ color: '#E5E7EB' }} />
            <p className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>
              {search || planFilter !== 'all' ? 'No members match your filters' : 'No members yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #F0F0F0', background: '#FAFAFA' }}>
                  {([
                    { key: 'name',          label: 'Member' },
                    { key: 'planId',        label: 'Plan'   },
                    { key: 'presentations', label: 'Zapps'  },
                    { key: 'questions',     label: 'Questions'   },
                    { key: 'sessions',      label: 'Sessions run'},
                    { key: 'joinedAt',      label: 'Joined' },
                  ] as { key: SortKey; label: string }[]).map(col => (
                    <th
                      key={col.key}
                      className="text-left px-5 py-3 cursor-pointer select-none"
                      style={{ color: '#9CA3AF' }}
                      onClick={() => toggleSort(col.key)}
                    >
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                        {col.label}
                        <SortIcon col={col.key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => {
                  const badge = PLAN_BADGE[m.planId] ?? PLAN_BADGE.free
                  const joinDate = m.joinedAt
                    ? new Date(m.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'
                  return (
                    <tr
                      key={m.uid}
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F5F7FA' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Member */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: m.role === 'admin' ? '#F08700' : '#00A6A6', color: '#FFFFFF' }}
                          >
                            {m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold leading-tight" style={{ color: '#1A1A2E' }}>
                              {m.name}
                              {m.role === 'admin' && (
                                <span
                                  className="ml-1.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                                  style={{ background: 'rgba(240,135,0,0.12)', color: '#F08700' }}
                                >
                                  Admin
                                </span>
                              )}
                            </p>
                            <p className="text-xs" style={{ color: '#9CA3AF' }}>{m.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-5 py-3.5">
                        <span
                          className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg"
                          style={{ background: badge.bg, color: badge.text }}
                        >
                          {m.planId}
                        </span>
                      </td>

                      {/* Presentations */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <LayoutDashboard className="w-3.5 h-3.5" style={{ color: '#D1D5DB' }} />
                          <span className="font-semibold" style={{ color: '#374151' }}>{m.presentations}</span>
                        </div>
                      </td>

                      {/* Questions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" style={{ color: '#D1D5DB' }} />
                          <span className="font-semibold" style={{ color: '#374151' }}>{m.questions}</span>
                        </div>
                      </td>

                      {/* Sessions */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5" style={{ color: m.sessions > 0 ? '#F08700' : '#D1D5DB' }} />
                          <span className="font-semibold" style={{ color: m.sessions > 0 ? '#1A1A2E' : '#9CA3AF' }}>
                            {m.sessions}
                          </span>
                        </div>
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-3.5">
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>{joinDate}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Footer row */}
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderTop: '1px solid #F0F0F0', background: '#FAFAFA' }}
            >
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                {filtered.length} of {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-4 text-xs" style={{ color: '#9CA3AF' }}>
                <span>{totalPresentations} total presentations</span>
                <span>·</span>
                <span>{totalSessions} sessions run</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
