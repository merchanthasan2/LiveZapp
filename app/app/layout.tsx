'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  LayoutDashboard,
  PlusCircle,
  Settings,
  LogOut,
  Zap,
  Activity,
  ChevronRight,
  Shield,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'

const sidebarLinks = [
  { icon: LayoutDashboard, label: 'Dashboard',        href: '/app/dashboard' },
  { icon: PlusCircle,      label: 'New Presentation', href: '/app/create'    },
  { icon: Settings,        label: 'Settings',         href: '/app/settings'  },
]

/* Text color to use on each plan badge background */
const planBadge: Record<string, { bg: string; color: string }> = {
  free:    { bg: 'rgba(0,0,0,0.10)',     color: '#374151' },   // near-white → dark ✓
  basic:   { bg: '#00A6A6',              color: '#FFFFFF' },   // teal → white ✓
  regular: { bg: '#EFCA08',              color: '#1A1A2E' },   // amber → dark ✓
  pro:     { bg: '#F08700',              color: '#FFFFFF' },   // deep-orange → white ✓
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, isLoading, isAdmin, logout } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
  }, [isLoading, user, router])

  if (isLoading || !user) return null

  const initials = user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const badge    = planBadge[user.planId ?? 'free'] ?? planBadge.free

  return (
    <div className="min-h-screen flex">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col fixed top-16 bottom-0 py-5 px-3 z-40"
        style={{
          width: 200,
          background: '#BBDEF0',                /* pale-sky ✓ */
          borderRight: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        {/* User info */}
        <div
          className="px-3 pb-4 mb-4"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: '#00A6A6', boxShadow: '0 2px 8px rgba(0,166,166,0.25)' }}
            >
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-600 truncate leading-tight" style={{ color: '#1A1A2E' }}>
                {user.name}
              </p>
              <span
                className="text-[9px] font-black uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md mt-0.5 inline-block"
                style={{ background: badge.bg, color: badge.color }}
              >
                {user.planId ?? 'free'}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1" aria-label="App navigation">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] px-3 mb-2.5" style={{ color: '#6B7280' }}>
            Workspace
          </p>

          {sidebarLinks.map(({ icon: Icon, label, href }) => {
            const isActive =
              pathname === href || (href !== '/app/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} className={isActive ? 'nav-item-active' : 'nav-item'}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-nav">{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 opacity-40" />}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div
          className="pt-4 space-y-1"
          style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}
        >
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1 transition-all"
              style={{ background: 'rgba(240,135,0,0.10)', border: '1px solid rgba(240,135,0,0.22)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(240,135,0,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(240,135,0,0.10)')}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: '#F08700' }} />
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.08em]" style={{ color: '#F08700' }}>Admin Panel</p>
                <p className="text-[9px]" style={{ color: '#C07800' }}>Platform management</p>
              </div>
            </Link>
          )}

          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.20)' }}
          >
            <Activity className="w-3 h-3 shrink-0" style={{ color: '#16A34A' }} />
            <div>
              <p className="text-[9px] font-600" style={{ color: '#374151' }}>System status</p>
              <p className="text-[9px] font-bold" style={{ color: '#16A34A' }}>All systems live</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="nav-item w-full text-left group"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 transition-colors group-hover:text-[#F08700]" />
            <span className="transition-colors group-hover:text-[#F08700]">Sign out</span>
          </button>

          <Link href="/" className="nav-item">
            <div
              className="w-4 h-4 rounded-md flex items-center justify-center shrink-0"
              style={{ background: '#00A6A6' }}
            >
              <Zap className="w-2.5 h-2.5 text-white" />
            </div>
            Back to site
          </Link>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <main className="flex-1 p-5 lg:p-8" style={{ marginLeft: 200 }}>
        {children}
      </main>
    </div>
  )
}
