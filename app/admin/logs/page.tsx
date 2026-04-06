'use client'

import { useState, useEffect } from 'react'
import { ref, get } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  ClipboardList, Search, RefreshCw, Download,
  Shield, AlertCircle, CheckCircle2, User,
  CreditCard, Ban, Settings2, Clock,
} from 'lucide-react'
import type { AuditLog } from '@/lib/services/AdminLogService'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const ACTION_STYLES: Record<string, { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>, bg: string, text: string }> = {
  plan_changed:    { icon: CreditCard,  bg: 'rgba(0,166,166,0.10)',  text: '#007A7A' },
  user_suspended:  { icon: Ban,         bg: 'rgba(239,68,68,0.10)',  text: '#DC2626' },
  user_restored:   { icon: CheckCircle2,bg: 'rgba(34,197,94,0.10)',  text: '#16A34A' },
  promo_created:   { icon: Shield,      bg: 'rgba(239,202,8,0.12)',  text: '#8A7000' },
  promo_deactivated:{ icon: AlertCircle,bg: 'rgba(245,158,11,0.12)', text: '#B45309' },
  settings_changed:{ icon: Settings2,   bg: '#F3F4F6',               text: '#6B7280' },
  admin_action:    { icon: User,        bg: '#F3F4F6',               text: '#6B7280' },
}

function getActionStyle(action: string) {
  return ACTION_STYLES[action] ?? ACTION_STYLES.admin_action
}

function humaniseAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminLogsPage() {
  const { user }  = useAuth()
  const [logs, setLogs]         = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch]     = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setIsLoading(true)
    try {
      const snap = await get(ref(rtdb, 'adminLogs'))
      if (!snap.exists()) { setLogs([]); return }
      const data = snap.val() as Record<string, any>
      const rows: AuditLog[] = Object.entries(data)
        .map(([id, v]) => ({ id, ...v } as AuditLog))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setLogs(rows)
    } catch (e) {
      console.error('[admin/logs] load failed', e)
    } finally {
      setIsLoading(false)
    }
  }

  function exportCSV() {
    const rows = [
      ['Timestamp', 'Admin', 'Action', 'Target', 'Before', 'After'],
      ...filtered.map(l => [
        fmtDateTime(l.timestamp),
        l.adminEmail,
        l.action,
        l.targetEmail ?? l.targetUid ?? '—',
        l.previousValue ? JSON.stringify(l.previousValue) : '—',
        l.newValue ? JSON.stringify(l.newValue) : '—',
      ]),
    ]
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `admin-audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const allActions = ['all', ...Array.from(new Set(logs.map(l => l.action)))]

  const filtered = logs.filter(l => {
    const matchSearch = !search ||
      l.adminEmail?.toLowerCase().includes(search.toLowerCase()) ||
      l.targetEmail?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase())
    const matchAction = actionFilter === 'all' || l.action === actionFilter
    return matchSearch && matchAction
  })

  return (
    <div className="space-y-6 pb-12 max-w-6xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: '#9CA3AF' }}>Admin console</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1A1A2E' }}>
            Audit <span style={{ color: '#00A6A6' }}>Log</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Append-only audit trail from the admin app · {logs.length} entries
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(0,166,166,0.10)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.22)' }}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: '#1A1A2E', color: '#FFFFFF' }}>
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search admin, target, or action…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1A1A2E' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#00A6A6')}
            onBlur={e  => (e.currentTarget.style.borderColor = '#E5E7EB')}
          />
        </div>
        {allActions.length > 1 && (
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm outline-none capitalize"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#374151' }}>
            {allActions.map(a => (
              <option key={a} value={a}>{a === 'all' ? 'All actions' : humaniseAction(a)}</option>
            ))}
          </select>
        )}
      </div>

      {/* Log table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="w-8 h-8 border-4 rounded-full animate-spin"
              style={{ borderColor: 'rgba(0,166,166,0.20)', borderTopColor: '#00A6A6' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <ClipboardList className="w-10 h-10 mx-auto" style={{ color: '#E5E7EB' }} />
            <p className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>
              {logs.length === 0 ? 'No audit entries yet' : 'No entries match your filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #F0F0F0' }}>
                  {['Timestamp', 'Admin', 'Action', 'Target', 'Change'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: '#9CA3AF' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => {
                  const { icon: ActionIcon, bg, text } = getActionStyle(l.action)
                  return (
                    <tr key={l.id}
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F5F7FA' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {/* Timestamp */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 shrink-0" style={{ color: '#D1D5DB' }} />
                          <span className="text-xs" style={{ color: '#6B7280' }}>{fmtDateTime(l.timestamp)}</span>
                        </div>
                      </td>
                      {/* Admin */}
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-semibold" style={{ color: '#1A1A2E' }}>{l.adminEmail ?? '—'}</p>
                        {l.ipAddress && (
                          <p className="text-[11px] font-mono" style={{ color: '#9CA3AF' }}>{l.ipAddress}</p>
                        )}
                      </td>
                      {/* Action */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
                            <ActionIcon className="w-3.5 h-3.5" style={{ color: text }} />
                          </div>
                          <span className="text-xs font-semibold capitalize" style={{ color: '#1A1A2E' }}>
                            {humaniseAction(l.action)}
                          </span>
                        </div>
                      </td>
                      {/* Target */}
                      <td className="px-5 py-3.5">
                        {l.targetEmail ? (
                          <p className="text-xs" style={{ color: '#374151' }}>{l.targetEmail}</p>
                        ) : l.targetUid ? (
                          <p className="text-xs font-mono" style={{ color: '#9CA3AF' }}>{l.targetUid.slice(0, 10)}…</p>
                        ) : (
                          <span className="text-xs" style={{ color: '#D1D5DB' }}>—</span>
                        )}
                      </td>
                      {/* Change */}
                      <td className="px-5 py-3.5 max-w-xs">
                        {(l.previousValue !== undefined || l.newValue !== undefined) ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            {l.previousValue !== undefined && (
                              <span className="line-through" style={{ color: '#DC2626' }}>
                                {typeof l.previousValue === 'object' ? JSON.stringify(l.previousValue) : String(l.previousValue)}
                              </span>
                            )}
                            {l.previousValue !== undefined && l.newValue !== undefined && (
                              <span style={{ color: '#D1D5DB' }}>→</span>
                            )}
                            {l.newValue !== undefined && (
                              <span className="font-semibold" style={{ color: '#16A34A' }}>
                                {typeof l.newValue === 'object' ? JSON.stringify(l.newValue) : String(l.newValue)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: '#D1D5DB' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-5 py-3" style={{ borderTop: '1px solid #F0F0F0', background: '#FAFAFA' }}>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                {filtered.length} of {logs.length} entries · Sorted newest first
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
