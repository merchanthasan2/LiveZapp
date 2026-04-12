'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Activity,
  BarChart3,
  CircleDollarSign,
  LayoutDashboard,
  Megaphone,
  Radio,
  ScrollText,
  Search,
  Settings,
  Shield,
  UserCog,
  Users,
  Wallet,
  Bell,
  Moon,
  LogOut,
  Home,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import BrandLockup from '@/components/BrandLockup'

const adminLinks = [
  { icon: BarChart3, label: 'Analytics', href: '/admin' },
  { icon: Activity, label: 'Traffic', href: '/admin/traffic' },
  { icon: Radio, label: 'Sessions', href: '/admin/sessions' },
  { icon: Wallet, label: 'Finance', href: '/admin/financials' },
  { icon: UserCog, label: 'User Administration', href: '/admin/users' },
  { icon: Users, label: 'Members', href: '/admin/members' },
  { icon: CircleDollarSign, label: 'Plans', href: '/admin/plans' },
  { icon: Search, label: 'SEO', href: '/admin/seo' },
  { icon: Megaphone, label: 'Campaigns', href: '/admin/promos' },
  { icon: ScrollText, label: 'Logs', href: '/admin/logs' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, isAdmin, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!isAdmin) {
      router.replace('/app/dashboard')
    }
  }, [isLoading, user, isAdmin, router])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  if (isLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f6f2fb' }}>
        <div className="flex items-center gap-3" style={{ color: '#6f6681' }}>
          <Shield className="w-5 h-5" /> Checking access...
        </div>
      </div>
    )
  }

  const initials = user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const shellBg = '#f6f2fb'
  const sidebarBg = '#ffffff'
  const sidebarBorder = '1px solid #e9e4f2'
  const navActiveBg = '#f1e9ff'
  const navActiveBorder = '1px solid #d8c4ff'
  const navActiveText = '#4d1f96'
  const navText = '#5f566f'
  const headerBg = 'rgba(255,255,255,0.92)'
  const headerBorder = '#e9e4f2'
  const searchBg = '#f6f2fb'
  const searchBorder = '1px solid #ddd3ea'
  const searchText = '#2d2540'
  const iconTone = '#6f6681'

  return (
    <div
      className="flex min-h-screen w-full min-w-0 max-w-[100dvw] flex-row overflow-x-hidden"
      style={{ background: shellBg }}
    >
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 w-[280px] p-5 flex-col"
        style={{
          background: sidebarBg,
          borderRight: sidebarBorder,
        }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div>
            <BrandLockup href="/" size="sm" theme="light" subtitle="Admin Control" />
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          {adminLinks.map(item => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-semibold transition-all"
                style={active
                  ? { background: navActiveBg, color: navActiveText, border: navActiveBorder }
                  : { color: navText }}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <button
          className="w-full rounded-2xl py-3.5 mb-5 text-base font-bold"
          style={{ background: 'linear-gradient(135deg, #7a3af0, #5b21b6)', color: '#ffffff' }}
          onClick={() => router.push('/admin/promos')}
        >
          Create New Campaign
        </button>

        <div className="space-y-2 pt-4" style={{ borderTop: '1px solid #ece8f4' }}>
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
            style={{ color: navActiveText, background: 'rgba(122,58,240,0.08)', border: '1px solid rgba(122,58,240,0.18)' }}
          >
            <Home className="w-5 h-5" /> Back to website
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold" style={{ color: navText }}>
            <Settings className="w-5 h-5" /> Settings
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold"
            style={{ color: '#4f465f', background: '#f8f5fc', border: '1px solid #ece7f5' }}
          >
            <LogOut className="w-5 h-5" style={{ color: '#ba1a1a' }} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden lg:ml-[280px]">
        <header
          className="sticky top-0 z-20 border-b backdrop-blur-none lg:backdrop-blur-md"
          style={{ background: headerBg, borderBottomColor: headerBorder }}
        >
          <div className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-wrap items-center gap-2 px-3 py-3.5 sm:gap-3 sm:px-6 sm:py-4 lg:gap-5 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border lg:hidden"
              style={{ color: navText, background: '#ffffff', borderColor: '#e4dbf1' }}
              aria-label="Open admin menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="admin-mobile-menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
              <Link
                href="/app/dashboard"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-opacity hover:opacity-90"
                style={{ color: navActiveText, background: 'rgba(122,58,240,0.10)', borderColor: 'rgba(122,58,240,0.22)' }}
                aria-label="Open LiveZapp app"
                title="LiveZapp app"
              >
                <LayoutDashboard className="w-5 h-5" />
              </Link>
              <Link
                href="/"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-opacity hover:opacity-90"
                style={{ color: navActiveText, background: 'rgba(122,58,240,0.06)', borderColor: 'rgba(122,58,240,0.16)' }}
                aria-label="Marketing website"
                title="Website"
              >
                <Home className="w-5 h-5" />
              </Link>
            </div>
            <Link
              href="/admin/users"
              className="hidden min-w-0 flex-1 items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90 sm:flex sm:max-w-2xl"
              style={{ background: searchBg, color: searchText, border: searchBorder }}
              title="Open User Administration to search by name, email, or UID"
            >
              <Users className="h-4 w-4 shrink-0" style={{ color: '#9c93ac' }} />
              User search — name, email, or UID…
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border sm:hidden"
              style={{ color: iconTone, background: '#ffffff', borderColor: '#e4dbf1' }}
              aria-label="Open user search"
              title="User search"
            >
              <Users className="w-5 h-5" />
            </Link>
            <button
              type="button"
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full sm:flex sm:h-11 sm:w-11"
              style={{ color: iconTone, background: '#ffffff' }}
              aria-label="Notifications (coming soon)"
              title="Coming soon"
            >
              <Bell className="w-5 h-5 opacity-50" />
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11"
              style={{ color: iconTone, background: '#ffffff' }}
              aria-label="Toggle theme"
            >
              <Moon className="w-5 h-5" />
            </button>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3 sm:pl-5" style={{ borderLeft: '1px solid #ece7f5' }}>
              <div className="hidden text-right leading-tight sm:block">
                <p className="text-sm font-semibold" style={{ color: '#1a1a2e' }}>Admin Profile</p>
                <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: '#7a3af0' }}>Super Admin</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold sm:h-10 sm:w-10" style={{ background: 'linear-gradient(135deg,#7a3af0,#a885ff)', color: '#fff' }}>
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1600px] flex-1 px-3 py-5 sm:px-6 sm:py-6 md:py-8 lg:px-8 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
          {children}
        </main>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0"
            style={{ background: 'rgba(21, 12, 37, 0.45)' }}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close admin menu backdrop"
          />
          <aside
            id="admin-mobile-menu"
            className="absolute inset-y-0 left-0 flex h-full min-h-0 w-[86%] max-w-[340px] flex-col overflow-hidden p-4"
            style={{ background: sidebarBg, borderRight: sidebarBorder }}
          >
            <div className="mb-3 flex shrink-0 items-center justify-between px-1 py-2">
              <BrandLockup href="/" size="sm" theme="light" subtitle="Admin Control" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ color: iconTone, background: '#f7f3fc' }}
                aria-label="Close admin menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="scroll-touch min-h-0 flex-1 space-y-1 overflow-y-auto pt-1" aria-label="Mobile admin navigation">
              {adminLinks.map((item) => {
                const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition-all"
                    style={active
                      ? { background: navActiveBg, color: navActiveText, border: navActiveBorder }
                      : { color: navText }}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="mt-3 shrink-0 space-y-2 border-t pt-4 pb-[env(safe-area-inset-bottom,0px)]" style={{ borderTopColor: '#ece8f4' }}>
              <button
                type="button"
                className="w-full rounded-xl py-3 text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #7a3af0, #5b21b6)', color: '#ffffff' }}
                onClick={() => {
                  setMobileMenuOpen(false)
                  router.push('/admin/promos')
                }}
              >
                Create New Campaign
              </button>
              <Link
                href="/app/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold"
                style={{ color: navActiveText, background: 'rgba(122,58,240,0.08)', border: '1px solid rgba(122,58,240,0.18)' }}
              >
                <LayoutDashboard className="h-4 w-4" /> LiveZapp app
              </Link>
              <Link
                href="/admin/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold"
                style={{ color: navText, background: '#f8f5fc', border: '1px solid #ece7f5' }}
              >
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold"
                style={{ color: navActiveText, background: 'rgba(122,58,240,0.08)', border: '1px solid rgba(122,58,240,0.18)' }}
              >
                <Home className="h-4 w-4" /> Back to website
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  logout()
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold"
                style={{ color: '#4f465f', background: '#f8f5fc', border: '1px solid #ece7f5' }}
              >
                <LogOut className="h-4 w-4" style={{ color: '#ba1a1a' }} /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

