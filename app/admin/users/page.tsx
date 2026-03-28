'use client'

import { useState, useEffect, useRef } from 'react'
import { ref, get, update } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import { PLANS } from '@/types/plans'
import {
  Users, Search, ChevronUp, ChevronDown, RefreshCw,
  MoreVertical, X, ExternalLink, Mail, Calendar,
  Shield, AlertTriangle, CheckCircle2, Ban, RotateCcw,
  CreditCard, FileText, Loader2, ChevronRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  uid:                          string
  name:                         string
  email:                        string
  planId:                       string
  billingCycle:                 'monthly' | 'annual' | null
  planExpiresAt:                string | null
  planCancelledAt:              string | null
  role:                         string
  suspended:                    boolean
  suspendedReason:              string | null
  presentations:                number
  lifetimePresentationsCreated: number
  createdAt:                    string | null
  lastLoginAt:                  string | null
}

type SortKey = 'name' | 'planId' | 'presentations' | 'createdAt' | 'lastLoginAt'
type StatusFilter = 'all' | 'active' | 'inactive' | 'suspended' | 'paid'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function userStatus(u: UserRow): 'active' | 'inactive' | 'dormant' | 'suspended' {
  if (u.suspended) return 'suspended'
  if (!u.lastLoginAt) return 'dormant'
  const days = (Date.now() - new Date(u.lastLoginAt).getTime()) / 86400000
  if (days <= 30) return 'active'
  if (days <= 90) return 'inactive'
  return 'dormant'
}

const STATUS_STYLE = {
  active:    { bg: 'rgba(34,197,94,0.10)',  text: '#16A34A', label: 'Active'    },
  inactive:  { bg: 'rgba(245,158,11,0.12)', text: '#B45309', label: 'Inactive'  },
  dormant:   { bg: '#F3F4F6',               text: '#9CA3AF', label: 'Dormant'   },
  suspended: { bg: 'rgba(239,68,68,0.10)',  text: '#DC2626', label: 'Suspended' },
}

const PLAN_BADGE: Record<string, { bg: string; text: string }> = {
  free:    { bg: '#BBDEF0', text: '#1A1A2E' },
  basic:   { bg: '#00A6A6', text: '#FFFFFF' },
  regular: { bg: '#EFCA08', text: '#1A1A2E' },
  pro:     { bg: '#F08700', text: '#FFFFFF' },
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function sortRows(rows: UserRow[], key: SortKey, asc: boolean): UserRow[] {
  return [...rows].sort((a, b) => {
    const av = a[key] ?? ''
    const bv = b[key] ?? ''
    if (typeof av === 'number' && typeof bv === 'number') return asc ? av - bv : bv - av
    return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
  })
}

// ─── User Detail Drawer ───────────────────────────────────────────────────────

function UserDrawer({
  user,
  onClose,
  onSuspend,
  onRestore,
  onChangePlan,
  isSaving,
}: {
  user: UserRow
  onClose: () => void
  onSuspend: (uid: string, reason: string) => Promise<void>
  onRestore: (uid: string) => Promise<void>
  onChangePlan: (uid: string, planId: string) => Promise<void>
  isSaving: boolean
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'actions'>('overview')
  const [suspendReason, setSuspendReason] = useState('')
  const [showSuspendForm, setShowSuspendForm] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(user.planId)

  const status = userStatus(user)
  const planInfo = PLANS.find(p => p.id === user.planId)

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'billing',  label: 'Billing'  },
    { key: 'actions',  label: 'Actions'  },
  ] as const

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div
        className="absolute right-0 top-0 bottom-0 flex flex-col"
        style={{
          width: 480,
          background: '#FFFFFF',
          borderLeft: '1px solid #E5E7EB',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #F0F0F0' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: user.role === 'admin' ? '#F08700' : '#00A6A6', color: '#FFFFFF' }}
            >
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: '#1A1A2E' }}>{user.name}</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-1 pt-3 pb-0" style={{ borderBottom: '1px solid #F0F0F0' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors"
              style={{
                color: activeTab === t.key ? '#00A6A6' : '#9CA3AF',
                borderBottom: activeTab === t.key ? '2px solid #00A6A6' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <>
              {/* Status + Role */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: STATUS_STYLE[status].bg, color: STATUS_STYLE[status].text }}
                >
                  {status === 'active' && <CheckCircle2 className="w-3 h-3" />}
                  {status === 'suspended' && <Ban className="w-3 h-3" />}
                  {status === 'inactive' && <AlertTriangle className="w-3 h-3" />}
                  {STATUS_STYLE[status].label}
                </span>
                {user.role === 'admin' && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(240,135,0,0.12)', color: '#F08700' }}>
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>

              {/* Suspension notice */}
              {user.suspended && user.suspendedReason && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#DC2626' }}>Suspension reason</p>
                  <p className="text-xs" style={{ color: '#374151' }}>{user.suspendedReason}</p>
                </div>
              )}

              {/* Info grid */}
              <div className="space-y-3">
                {[
                  { icon: Mail,     label: 'Email',          val: user.email },
                  { icon: Calendar, label: 'Joined',         val: fmtDate(user.createdAt) },
                  { icon: Calendar, label: 'Last login',     val: fmtDate(user.lastLoginAt) },
                  { icon: FileText, label: 'Presentations',  val: `${user.presentations} active · ${user.lifetimePresentationsCreated} lifetime` },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#F3F4F6' }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#9CA3AF' }}>{label}</p>
                      <p className="text-sm" style={{ color: '#1A1A2E' }}>{val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Plan usage */}
              {planInfo && (
                <div className="rounded-xl p-4" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold" style={{ color: '#1A1A2E' }}>Plan usage</p>
                    <span
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{ background: PLAN_BADGE[user.planId]?.bg ?? '#BBDEF0', color: PLAN_BADGE[user.planId]?.text ?? '#1A1A2E' }}
                    >
                      {user.planId}
                    </span>
                  </div>
                  {planInfo.limits.maxPresentations !== 'unlimited' && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: '#6B7280' }}>Lifetime sessions</span>
                        <span className="font-semibold" style={{ color: '#1A1A2E' }}>
                          {user.lifetimePresentationsCreated} / {planInfo.limits.maxPresentations}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E5E7EB' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (user.lifetimePresentationsCreated / (planInfo.limits.maxPresentations as number)) * 100)}%`,
                            background: '#00A6A6',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── BILLING TAB ── */}
          {activeTab === 'billing' && (
            <>
              <div className="space-y-3">
                {[
                  { label: 'Current plan',    val: (user.planId || 'free').charAt(0).toUpperCase() + (user.planId || 'free').slice(1) },
                  { label: 'Billing cycle',   val: user.billingCycle ? user.billingCycle.charAt(0).toUpperCase() + user.billingCycle.slice(1) : 'N/A (Free)' },
                  { label: 'Plan expires',    val: fmtDate(user.planExpiresAt) },
                  { label: 'Cancelled at',    val: fmtDate(user.planCancelledAt) },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between items-center py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <span className="text-xs" style={{ color: '#6B7280' }}>{label}</span>
                    <span className="text-sm font-semibold" style={{ color: '#1A1A2E' }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Change plan */}
              <div className="rounded-xl p-4" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: '#1A1A2E' }}>Change plan</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {PLANS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlan(p.id)}
                      className="py-2 px-3 rounded-lg text-xs font-semibold text-left transition-all"
                      style={
                        selectedPlan === p.id
                          ? { background: '#1A1A2E', color: '#FFFFFF' }
                          : { background: '#FFFFFF', color: '#374151', border: '1px solid #E5E7EB' }
                      }
                    >
                      {p.name}
                      <span className="block text-[10px] font-normal opacity-60">
                        {p.pricePerMonth === 0 ? 'Free' : `$${p.pricePerMonth}/mo`}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onChangePlan(user.uid, selectedPlan)}
                  disabled={isSaving || selectedPlan === user.planId}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: selectedPlan === user.planId ? '#F3F4F6' : '#00A6A6',
                    color: selectedPlan === user.planId ? '#9CA3AF' : '#FFFFFF',
                    cursor: selectedPlan === user.planId ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                  {isSaving ? 'Saving…' : selectedPlan === user.planId ? 'Same plan selected' : `Switch to ${selectedPlan}`}
                </button>
              </div>
            </>
          )}

          {/* ── ACTIONS TAB ── */}
          {activeTab === 'actions' && (
            <div className="space-y-3">
              {/* Send password reset */}
              <button
                className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#00A6A6')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,166,166,0.10)' }}>
                  <Mail className="w-4 h-4" style={{ color: '#00A6A6' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#1A1A2E' }}>Send password reset</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Email a reset link to {user.email}</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto" style={{ color: '#D1D5DB' }} />
              </button>

              {/* Suspend / Restore */}
              {!user.suspended ? (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.20)' }}>
                  {!showSuspendForm ? (
                    <button
                      onClick={() => setShowSuspendForm(true)}
                      className="w-full flex items-center gap-3 p-4 text-left transition-all"
                      style={{ background: 'rgba(239,68,68,0.04)' }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.10)' }}>
                        <Ban className="w-4 h-4" style={{ color: '#DC2626' }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#DC2626' }}>Suspend account</p>
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>Prevent user from logging in</p>
                      </div>
                    </button>
                  ) : (
                    <div className="p-4 space-y-3" style={{ background: 'rgba(239,68,68,0.04)' }}>
                      <p className="text-xs font-semibold" style={{ color: '#DC2626' }}>Reason for suspension (required)</p>
                      <textarea
                        value={suspendReason}
                        onChange={e => setSuspendReason(e.target.value)}
                        rows={3}
                        placeholder="e.g. Terms of service violation…"
                        className="w-full text-xs rounded-lg p-3 resize-none outline-none"
                        style={{ background: '#FFFFFF', border: '1px solid #FCA5A5', color: '#1A1A2E' }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowSuspendForm(false); setSuspendReason('') }}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold"
                          style={{ background: '#F3F4F6', color: '#6B7280' }}
                        >
                          Cancel
                        </button>
                        <button
                          disabled={!suspendReason.trim() || isSaving}
                          onClick={() => onSuspend(user.uid, suspendReason)}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                          style={{
                            background: suspendReason.trim() ? '#DC2626' : '#FCA5A5',
                            color: '#FFFFFF',
                            cursor: suspendReason.trim() ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                          Suspend
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => onRestore(user.uid)}
                  disabled={isSaving}
                  className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                  style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.20)' }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.10)' }}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#16A34A' }} /> : <RotateCcw className="w-4 h-4" style={{ color: '#16A34A' }} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#16A34A' }}>Restore account</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>Remove suspension and allow login</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users, setUsers]           = useState<UserRow[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [search, setSearch]         = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey]       = useState<SortKey>('createdAt')
  const [sortAsc, setSortAsc]       = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [isSaving, setIsSaving]     = useState(false)
  const [toastMsg, setToastMsg]     = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => { loadUsers() }, [])

  function showToast(text: string, ok = true) {
    setToastMsg({ text, ok })
    setTimeout(() => setToastMsg(null), 4000)
  }

  async function loadUsers() {
    setIsLoading(true)
    try {
      const snap = await get(ref(rtdb, 'users'))
      if (!snap.exists()) { setUsers([]); return }
      const data = snap.val() as Record<string, any>

      const rows: UserRow[] = Object.entries(data).map(([uid, u]) => ({
        uid,
        name:                         u.name          ?? 'Unknown',
        email:                        u.email         ?? '—',
        planId:                       u.planId        ?? 'free',
        billingCycle:                 u.billingCycle  ?? null,
        planExpiresAt:                u.planExpiresAt ?? null,
        planCancelledAt:              u.planCancelledAt ?? null,
        role:                         u.role          ?? 'user',
        suspended:                    u.suspended     ?? false,
        suspendedReason:              u.suspendedReason ?? null,
        presentations:                u.presentations ? Object.keys(u.presentations).length : 0,
        lifetimePresentationsCreated: u.lifetimePresentationsCreated ?? 0,
        createdAt:                    u.createdAt     ?? null,
        lastLoginAt:                  u.lastLoginAt   ?? null,
      }))

      setUsers(rows)
    } catch (e) {
      console.error('[admin/users] load failed', e)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSuspend(uid: string, reason: string) {
    setIsSaving(true)
    try {
      await update(ref(rtdb, `users/${uid}`), {
        suspended: true,
        suspendedReason: reason,
        suspendedAt: new Date().toISOString(),
      })
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, suspended: true, suspendedReason: reason } : u))
      if (selectedUser?.uid === uid) setSelectedUser(prev => prev ? { ...prev, suspended: true, suspendedReason: reason } : null)
      showToast('Account suspended')
    } catch {
      showToast('Failed to suspend', false)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRestore(uid: string) {
    setIsSaving(true)
    try {
      await update(ref(rtdb, `users/${uid}`), {
        suspended: false,
        suspendedReason: null,
        suspendedAt: null,
      })
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, suspended: false, suspendedReason: null } : u))
      if (selectedUser?.uid === uid) setSelectedUser(prev => prev ? { ...prev, suspended: false, suspendedReason: null } : null)
      showToast('Account restored')
    } catch {
      showToast('Failed to restore', false)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleChangePlan(uid: string, planId: string) {
    setIsSaving(true)
    try {
      await update(ref(rtdb, `users/${uid}`), { planId })
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, planId } : u))
      if (selectedUser?.uid === uid) setSelectedUser(prev => prev ? { ...prev, planId } : null)
      showToast(`Plan changed to ${planId}`)
    } catch {
      showToast('Failed to change plan', false)
    } finally {
      setIsSaving(false)
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

  const filtered = sortRows(
    users.filter(u => {
      const matchSearch  = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
      const matchPlan    = planFilter === 'all' || u.planId === planFilter
      const status       = userStatus(u)
      const matchStatus  =
        statusFilter === 'all'      ? true :
        statusFilter === 'paid'     ? u.planId !== 'free' :
        statusFilter === status
      return matchSearch && matchPlan && matchStatus
    }),
    sortKey,
    sortAsc,
  )

  const totalPaid    = users.filter(u => u.planId !== 'free').length
  const totalSuspended = users.filter(u => u.suspended).length
  const totalActive  = users.filter(u => userStatus(u) === 'active').length

  return (
    <div className="space-y-6 pb-12 max-w-7xl relative">

      {/* Toast */}
      {toastMsg && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg"
          style={{
            background: toastMsg.ok ? '#1A1A2E' : '#DC2626',
            color: '#FFFFFF',
          }}
        >
          {toastMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toastMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: '#9CA3AF' }}>Admin console</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1A1A2E' }}>
            Users <span style={{ color: '#00A6A6' }}>({users.length.toLocaleString()})</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Registered accounts and their activity</p>
        </div>
        <button
          onClick={loadUsers}
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
          { label: 'Total users',    value: users.length,    bg: '#1A1A2E', text: '#FFFFFF', icon: Users },
          { label: 'Active (30d)',   value: totalActive,     bg: '#22C55E', text: '#FFFFFF', icon: CheckCircle2 },
          { label: 'Paid subscribers', value: totalPaid,    bg: '#00A6A6', text: '#FFFFFF', icon: CreditCard },
          { label: 'Suspended',      value: totalSuspended,  bg: '#EF4444', text: '#FFFFFF', icon: Ban },
        ].map(tile => {
          const Icon = tile.icon
          return (
            <div key={tile.label} className="rounded-2xl p-5 flex items-center gap-4"
              style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: tile.bg }}>
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
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="relative min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1A1A2E' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#00A6A6')}
            onBlur={e  => (e.currentTarget.style.borderColor = '#E5E7EB')}
          />
        </div>

        {/* Plan filter */}
        <div className="flex rounded-xl overflow-hidden text-xs font-bold" style={{ border: '1px solid #E5E7EB', background: '#F5F7FA' }}>
          {['all', 'free', 'basic', 'regular', 'pro'].map(p => (
            <button key={p} onClick={() => setPlanFilter(p)}
              className="px-3 py-2.5 capitalize transition-all"
              style={planFilter === p ? { background: '#1A1A2E', color: '#FFFFFF' } : { color: '#6B7280' }}>
              {p === 'all' ? 'All plans' : p}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex rounded-xl overflow-hidden text-xs font-bold" style={{ border: '1px solid #E5E7EB', background: '#F5F7FA' }}>
          {(['all', 'active', 'inactive', 'suspended', 'paid'] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-2.5 capitalize transition-all"
              style={statusFilter === s ? { background: '#1A1A2E', color: '#FFFFFF' } : { color: '#6B7280' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-20">
            <div className="w-8 h-8 border-4 rounded-full animate-spin"
              style={{ borderColor: 'rgba(0,166,166,0.20)', borderTopColor: '#00A6A6' }} />
            <p className="text-sm" style={{ color: '#9CA3AF' }}>Loading users…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Users className="w-10 h-10 mx-auto" style={{ color: '#E5E7EB' }} />
            <p className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>No users match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #F0F0F0', background: '#FAFAFA' }}>
                  {([
                    { key: 'name',       label: 'User'        },
                    { key: 'planId',     label: 'Plan'        },
                    { key: null,         label: 'Status'      },
                    { key: 'presentations', label: 'Sessions' },
                    { key: 'lastLoginAt',label: 'Last login'  },
                    { key: 'createdAt',  label: 'Joined'      },
                    { key: null,         label: ''            },
                  ] as { key: SortKey | null; label: string }[]).map((col, i) => (
                    <th key={i}
                      className={`text-left px-5 py-3 ${col.key ? 'cursor-pointer select-none' : ''}`}
                      style={{ color: '#9CA3AF' }}
                      onClick={() => col.key && toggleSort(col.key)}
                    >
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                        {col.label}
                        {col.key && <SortIcon col={col.key} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const badge  = PLAN_BADGE[u.planId] ?? PLAN_BADGE.free
                  const status = userStatus(u)
                  const ss     = STATUS_STYLE[status]
                  return (
                    <tr key={u.uid}
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F5F7FA' : 'none', cursor: 'pointer' }}
                      onClick={() => setSelectedUser(u)}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: u.role === 'admin' ? '#F08700' : '#00A6A6', color: '#FFFFFF' }}>
                            {u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold leading-tight text-xs" style={{ color: '#1A1A2E' }}>
                              {u.name}
                              {u.role === 'admin' && (
                                <span className="ml-1.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                                  style={{ background: 'rgba(240,135,0,0.12)', color: '#F08700' }}>
                                  Admin
                                </span>
                              )}
                            </p>
                            <p className="text-[11px]" style={{ color: '#9CA3AF' }}>{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg"
                          style={{ background: badge.bg, color: badge.text }}>
                          {u.planId}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                          style={{ background: ss.bg, color: ss.text }}>
                          {ss.label}
                        </span>
                      </td>

                      {/* Sessions */}
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold" style={{ color: '#374151' }}>
                          {u.presentations} <span className="font-normal" style={{ color: '#9CA3AF' }}>active</span>
                        </span>
                      </td>

                      {/* Last login */}
                      <td className="px-5 py-3.5">
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>{fmtDate(u.lastLoginAt)}</span>
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-3.5">
                        <span className="text-xs" style={{ color: '#9CA3AF' }}>{fmtDate(u.createdAt)}</span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5">
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          onClick={e => { e.stopPropagation(); setSelectedUser(u) }}>
                          <ExternalLink className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="px-5 py-3 flex items-center justify-between"
              style={{ borderTop: '1px solid #F0F0F0', background: '#FAFAFA' }}>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                {filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Click any row to view details
              </p>
            </div>
          </div>
        )}
      </div>

      {/* User detail drawer */}
      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSuspend={handleSuspend}
          onRestore={handleRestore}
          onChangePlan={handleChangePlan}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
