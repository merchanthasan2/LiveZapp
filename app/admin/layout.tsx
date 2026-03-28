'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  LayoutDashboard, TrendingUp, Globe, Wrench,
  Zap, Settings2, LogOut, Shield, ChevronRight, Users,
  Activity, ClipboardList, Search,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'

const sidebarLinks = [
  { icon: LayoutDashboard, label: 'Overview',      href: '/admin'              },
  { icon: Users,           label: 'Users',         href: '/admin/users'        },
  { icon: Globe,           label: 'Traffic',       href: '/admin/traffic'      },
  { icon: TrendingUp,      label: 'Financials',    href: '/admin/financials'   },
  { icon: Zap,             label: 'Plans',         href: '/admin/plans'        },
  { icon: Wrench,          label: 'Promo Codes',   href: '/admin/promos'       },
  { icon: Activity,        label: 'Sessions',      href: '/admin/sessions'     },
  { icon: ClipboardList,   label: 'Audit Log',     href: '/admin/logs'         },
  { icon: Search,          label: 'SEO Config',    href: '/admin/seo'          },
  { icon: Settings2,       label: 'Settings',      href: '/admin/settings'     },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, isLoading, isAdmin, logout } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!user)    { router.replace('/login');         return }
    if (!isAdmin) { router.replace('/app/dashboard'); return }
  }, [isLoading, user, isAdmin, router])

  if (isLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F7FA' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: '#1A1A2E' }}
          >
            <Shield className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Checking access…</p>
        </div>
      </div>
    )
  }

  const initials = user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen flex">

      {/* ── Sidebar — dark navy, distinct from user dashboard ── */}
      <aside
        className="hidden lg:flex flex-col fixed top-16 bottom-0 py-4 px-3 z-40 overflow-y-auto"
        style={{
          width: 230,
          background: '#1A1A2E',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Admin badge */}
        <div className="px-3 pb-4 mb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Admin Console
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: '#F08700', boxShadow: '0 2px 8px rgba(240,135,0,0.35)' }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'rgba(255,255,255,0.90)' }}>
                {user.name}
              </p>
              <span
                className="text-[9px] font-black uppercase tracking-[0.10em] px-1.5 py-0.5 rounded-md mt-0.5 inline-block"
                style={{ background: 'rgba(240,135,0,0.20)', color: '#F08700', border: '1px solid rgba(240,135,0,0.30)' }}
              >
                Super Admin
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5" aria-label="Admin navigation">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] px-3 mb-2.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Navigation
          </p>
          {sidebarLinks.map(({ icon: Icon, label, href }) => {
            const hrefBase = href.split('#')[0]
            const isActive = hrefBase === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(hrefBase)
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: isActive ? '#00A6A6' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="pt-4 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>

          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'transparent' }}
          >
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
              style={{ background: '#00A6A6' }}
            >
              <Zap className="w-2.5 h-2.5 text-white" />
            </div>
            Back to site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 lg:p-8" style={{ marginLeft: 230 }}>
        {children}
      </main>
    </div>
  )
}
