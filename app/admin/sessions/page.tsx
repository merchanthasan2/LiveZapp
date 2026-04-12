'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ref, get } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import {
  Radio, Users, Search, RefreshCw,
  ChevronUp, ChevronDown, Clock, FileStack, ExternalLink,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionRow {
  id:           string
  name:         string
  joinCode:     string | null
  ownerName:    string
  ownerEmail:   string
  status:       string
  participants: number
  questions:    number
  createdAt:    string | null
  updatedAt:    string | null
}

type SortKey = 'name' | 'status' | 'participants' | 'createdAt'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function questionCountFromPresentation(p: Record<string, unknown>): number {
  const qs = p.questions as { questions?: unknown[] } | undefined
  if (qs && Array.isArray(qs.questions)) return qs.questions.length
  return typeof p.questionsCount === 'number' ? p.questionsCount : 0
}

function sortRows(rows: SessionRow[], key: SortKey, asc: boolean): SessionRow[] {
  return [...rows].sort((a, b) => {
    const av = a[key] ?? ''
    const bv = b[key] ?? ''
    if (typeof av === 'number' && typeof bv === 'number') return asc ? av - bv : bv - av
    return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
  })
}

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  draft:     { bg: '#F3F4F6',                   text: '#9CA3AF', label: 'Draft'     },
  scheduled: { bg: 'rgba(59,130,246,0.10)',     text: '#2563EB', label: 'Scheduled' },
  live:      { bg: 'rgba(240,135,0,0.12)',       text: '#C05F00', label: 'Live'      },
  completed: { bg: 'rgba(34,197,94,0.10)',       text: '#16A34A', label: 'Completed' },
  paused:    { bg: 'rgba(245,158,11,0.12)',      text: '#B45309', label: 'Paused'    },
  active:    { bg: 'rgba(240,135,0,0.12)',       text: '#C05F00', label: 'Active'    },
  ended:     { bg: 'rgba(34,197,94,0.10)',       text: '#16A34A', label: 'Ended'     },
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminSessionsPage() {
  const [sessions, setSessions]     = useState<SessionRow[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [loadError, setLoadError]   = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey]       = useState<SortKey>('createdAt')
  const [sortAsc, setSortAsc]       = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setIsLoading(true)
    setLoadError(null)
    try {
      // Load all users to build owner lookup
      const usersSnap = await get(ref(rtdb, 'users'))
      const usersMap: Record<string, { name: string; email: string }> = {}
      if (usersSnap.exists()) {
        Object.entries(usersSnap.val() as Record<string, any>).forEach(([uid, u]) => {
          usersMap[uid] = { name: u.name ?? 'Unknown', email: u.email ?? '—' }
        })
      }

      const liveSnap = await get(ref(rtdb, 'live_sessions'))
      const liveParticipantByCode: Record<string, number> = {}
      if (liveSnap.exists()) {
        Object.entries(liveSnap.val() as Record<string, any>).forEach(([code, sess]) => {
          const parts = sess?.participants
          liveParticipantByCode[code] =
            parts && typeof parts === 'object' ? Object.keys(parts).length : 0
        })
      }

      // Load all presentations
      const presSnap = await get(ref(rtdb, 'presentations'))
      if (!presSnap.exists()) {
        setSessions([])
        return
      }

      const rows: SessionRow[] = Object.entries(presSnap.val() as Record<string, any>)
        .map(([id, p]) => {
          const ownerId = p.createdBy ?? p.ownerId
          const joinCode = typeof p.joinCode === 'string' ? p.joinCode : null
          const storedAudience = p.audienceSize ?? p.participantCount ?? 0
          const liveNow = joinCode ? (liveParticipantByCode[joinCode] ?? 0) : 0
          return {
            id,
            name:         p.title ?? p.name ?? 'Untitled',
            joinCode,
            ownerName:    usersMap[ownerId]?.name  ?? '—',
            ownerEmail:   usersMap[ownerId]?.email ?? '—',
            status:       p.status      ?? 'draft',
            participants: Math.max(Number(storedAudience) || 0, liveNow),
            questions:    questionCountFromPresentation(p),
            createdAt:    p.createdAt   ?? null,
            updatedAt:    p.updatedAt   ?? null,
          }
        })

      setSessions(rows)
    } catch (e) {
      console.error('[admin/sessions] load failed', e)
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Failed to load sessions.'
      setLoadError(msg)
      setSessions([])
    } finally {
      setIsLoading(false)
    }
  }

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

  const statuses = ['all', ...Array.from(new Set(sessions.map(s => s.status)))]

  const filtered = sortRows(
    sessions.filter(s => {
      const q = search.toLowerCase()
      const matchSearch = !search ||
        s.name.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.ownerEmail.toLowerCase().includes(q) ||
        (s.joinCode && s.joinCode.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || s.status === statusFilter
      return matchSearch && matchStatus
    }),
    sortKey, sortAsc,
  )

  const liveSessions      = sessions.filter(s => s.status === 'live' || s.status === 'active').length
  const completedSessions = sessions.filter(s => s.status === 'completed' || s.status === 'ended').length
  const totalParticipants = sessions.reduce((s, r) => s + r.participants, 0)

  return (
    <div className="space-y-6 pb-12 max-w-7xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: '#9CA3AF' }}>Admin console</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1A1A2E' }}>
            Sessions <span style={{ color: '#00A6A6' }}>({sessions.length})</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>All presentations and sessions across all accounts</p>
        </div>
        <button onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold self-start"
          style={{ background: 'rgba(0,166,166,0.10)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.22)' }}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total sessions',    val: sessions.length,     bg: '#1A1A2E', text: '#FFFFFF', icon: FileStack },
          { label: 'Live now',          val: liveSessions,        bg: '#F08700', text: '#FFFFFF', icon: Radio     },
          { label: 'Completed',         val: completedSessions,   bg: '#22C55E', text: '#FFFFFF', icon: Clock     },
          { label: 'Total participants',val: totalParticipants,   bg: '#00A6A6', text: '#FFFFFF', icon: Users     },
        ].map(tile => {
          const Icon = tile.icon
          return (
            <div key={tile.label} className="rounded-2xl p-5 flex items-center gap-4"
              style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: tile.bg }}>
                <Icon className="w-5 h-5" style={{ color: tile.text }} />
              </div>
              <div>
                <p className="text-xl font-black" style={{ color: '#1A1A2E' }}>{tile.val.toLocaleString()}</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>{tile.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {loadError && !isLoading && (
        <div
          className="rounded-2xl px-4 py-3 text-sm"
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}
        >
          {loadError}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative min-w-0 w-full sm:min-w-[16rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search by title or owner…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1A1A2E' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#00A6A6')}
            onBlur={e  => (e.currentTarget.style.borderColor = '#E5E7EB')}
          />
        </div>
        <div className="scroll-touch min-w-0 flex-1 overflow-x-auto sm:overflow-visible">
          <div className="inline-flex min-w-max rounded-xl text-xs font-bold" style={{ border: '1px solid #E5E7EB', background: '#F5F7FA' }}>
            {statuses.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="shrink-0 px-3 py-2.5 capitalize transition-all"
                style={statusFilter === s ? { background: '#1A1A2E', color: '#FFFFFF' } : { color: '#6B7280' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="w-8 h-8 border-4 rounded-full animate-spin"
              style={{ borderColor: 'rgba(0,166,166,0.20)', borderTopColor: '#00A6A6' }} />
            <p className="text-sm" style={{ color: '#9CA3AF' }}>Loading sessions…</p>
          </div>
        ) : sessions.length === 0 && !loadError ? (
          <div className="text-center py-16 space-y-2 px-4">
            <FileStack className="w-10 h-10 mx-auto" style={{ color: '#E5E7EB' }} />
            <p className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>No Zapps in the database yet</p>
            <p className="text-xs max-w-md mx-auto" style={{ color: '#9CA3AF' }}>
              When presenters create Zapps, they appear here with owner, join code, and participant counts (including live
              lobby counts when a session is active).
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2 px-4">
            <FileStack className="w-10 h-10 mx-auto" style={{ color: '#E5E7EB' }} />
            <p className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>No rows match your filters</p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Clear search or set status to &quot;all&quot;.</p>
          </div>
        ) : (
          <div className="scroll-touch overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
                  {([
                    { key: 'name',        label: 'Session'       },
                    { key: null,          label: 'Owner'         },
                    { key: 'status',      label: 'Status'        },
                    { key: 'participants',label: 'Participants'   },
                    { key: null,          label: 'Join'          },
                    { key: null,          label: 'Questions'     },
                    { key: 'createdAt',   label: 'Created'       },
                  ] as { key: SortKey | null; label: string }[]).map((col, i) => (
                    <th key={i}
                      className={`text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest ${col.key ? 'cursor-pointer select-none' : ''}`}
                      style={{ color: '#9CA3AF' }}
                      onClick={() => col.key && toggleSort(col.key)}>
                      <span className="flex items-center gap-1.5">
                        {col.label}
                        {col.key && <SortIcon col={col.key} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const ss = STATUS_STYLE[s.status] ?? STATUS_STYLE.draft
                  return (
                    <tr key={s.id}
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F5F7FA' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-semibold" style={{ color: '#1A1A2E' }}>{s.name}</p>
                        <p className="text-[11px] font-mono" style={{ color: '#9CA3AF' }}>{s.id.slice(0, 8)}…</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-semibold" style={{ color: '#374151' }}>{s.ownerName}</p>
                        <p className="text-[11px]" style={{ color: '#9CA3AF' }}>{s.ownerEmail}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                          style={{ background: ss.bg, color: ss.text }}>{ss.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" style={{ color: '#D1D5DB' }} />
                          <span className="text-xs font-semibold" style={{ color: '#374151' }}>{s.participants}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {s.joinCode ? (
                          <Link
                            href={`/join/${encodeURIComponent(s.joinCode)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                            style={{ color: '#00A6A6' }}
                          >
                            {s.joinCode}
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </Link>
                        ) : (
                          <span className="text-xs" style={{ color: '#D1D5DB' }}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold" style={{ color: '#374151' }}>{s.questions}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>{fmtDate(s.createdAt)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderTop: '1px solid #F0F0F0', background: '#FAFAFA' }}>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                {filtered.length} of {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
