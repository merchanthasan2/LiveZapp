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
  { icon: LayoutDashboard, label: 'Dashboard', href: '/app/dashboard' },
  { icon: PlusCircle,      label: 'New Zapp',  href: '/app/create'    },
  { icon: Settings,        label: 'Settings',  href: '/app/settings'  },
]

const planBadge: Record<string, { bg: string; color: string }> = {
  free:    { bg: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.70)' },
  basic:   { bg: '#ffc300',               color: '#000814' },
  regular: { bg: '#1e96fc',               color: '#FFFFFF' },
  pro:     { bg: '#ffd60a',               color: '#000814' },
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
    <div className="min-h-screen flex" style={{ background: '#000814' }}>

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col fixed top-16 bottom-0 py-5 px-3 z-40"
        style={{
          width: 200,
          background: '#001d3d',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* User info */}
        <div className="px-3 pb-4 mb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                background: 'linear-gradient(135deg, #ffc300, #ffd60a)',
                color: '#000814',
                boxShadow: '0 2px 8px rgba(255,195,0,0.30)',
              }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate leading-tight" style={{ color: '#FFFFFF' }}>
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
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] px-3 mb-2.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
            Workspace
          </p>
          {sidebarLinks.map(({ icon: Icon, label, href }) => {
            const isActive =
              pathname === href || (href !== '/app/dashboard' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} className={isActive ? 'nav-item-active' : 'nav-item'}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-nav">{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="pt-4 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1 transition-all"
              style={{ background: 'rgba(255,195,0,0.10)', border: '1px solid rgba(255,195,0,0.22)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,195,0,0.20)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,195,0,0.10)')}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: '#ffc300' }} />
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.08em]" style={{ color: '#ffc300' }}>Admin Panel</p>
                <p className="text-[9px]" style={{ color: 'rgba(255,195,0,0.60)' }}>Platform management</p>
              </div>
            </Link>
          )}

          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1"
            style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.18)' }}
          >
            <Activity className="w-3 h-3 shrink-0" style={{ color: '#22C55E' }} />
            <div>
              <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.50)' }}>System status</p>
              <p className="text-[9px] font-bold" style={{ color: '#22C55E' }}>All systems live</p>
            </div>
          </div>

          <button onClick={logout} className="nav-item w-full text-left">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign out</span>
          </button>

          <Link href="/" className="nav-item">
            <div className="w-4 h-4 rounded-md flex items-center justify-center shrink-0" style={{ background: '#ffc300' }}>
              <Zap className="w-2.5 h-2.5" style={{ color: '#000814' }} />
            </div>
            Back to site
          </Link>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 p-5 lg:p-8 lg:ml-[200px]" style={{ minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
