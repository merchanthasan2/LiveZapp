'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Bell,
  House,
  LayoutDashboard,
  PlusCircle,
  Settings,
  LogOut,
  Shield,
  User,
  Moon,
  Sun,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { usePlanLimits } from '@/lib/hooks/usePlanLimits'
import BrandLockup from '@/components/BrandLockup'

const sidebarLinks = [
  { icon: LayoutDashboard, label: 'My Zapps', href: '/app/dashboard' },
  { icon: PlusCircle, label: 'Create New', href: '/app/create' },
  { icon: Settings, label: 'Settings', href: '/app/settings' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, isAdmin, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { plan } = usePlanLimits()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
  }, [isLoading, user, router])

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

  if (isLoading || !user) return null
  if (pathname.startsWith('/app/present/')) return <>{children}</>

  const initials = user.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const shellBg = isDark ? '#12131c' : '#f8f7ff'
  const sidebarBg = isDark ? '#171925' : '#ffffff'
  const headerBg = isDark ? 'rgba(18,19,28,0.92)' : 'rgba(248,247,255,0.92)'
  const cardBorder = isDark ? 'rgba(191,168,255,0.16)' : 'rgba(123,116,135,0.14)'
  const textBase = isDark ? '#f4efff' : '#1c1b1b'
  const textMuted = isDark ? 'rgba(214,207,237,0.80)' : '#4a4455'
  const iconMuted = isDark ? 'rgba(214,207,237,0.78)' : '#6c637a'
  const activeBg = isDark ? 'rgba(122,58,240,0.30)' : 'rgba(101,12,217,0.14)'
  const activeBorder = isDark ? '1px solid rgba(191,168,255,0.35)' : '1px solid rgba(101,12,217,0.28)'
  const activeText = isDark ? '#f1e8ff' : '#2e1065'
  const signOutBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(123,116,135,0.08)'
  const signOutBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(123,116,135,0.14)'
  const signOutText = isDark ? 'rgba(244,239,255,0.86)' : '#4a4455'
  const signOutIcon = isDark ? '#ffb4ab' : '#ba1a1a'

  return (
    <div
      className="flex h-[100dvh] min-h-0 max-w-[100dvw] flex-col overflow-hidden md:h-screen"
      style={{ background: shellBg, color: textBase }}
    >
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col p-4 space-y-2 z-40" style={{ background: sidebarBg, borderRight: `1px solid ${cardBorder}` }}>
        <div className="flex items-center gap-3 px-2 py-6 mb-4">
          <div>
            <BrandLockup href="/" size="md" theme={isDark ? 'dark' : 'light'} />
            <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: textMuted }}>{plan.name} Plan</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1" aria-label="App navigation">
          {sidebarLinks.map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href || (href !== '/app/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? 'font-semibold' : 'font-medium'}`}
                style={
                  isActive
                    ? { background: activeBg, color: activeText, border: activeBorder }
                    : { color: textMuted, border: '1px solid transparent' }
                }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="pt-5 pb-3 px-1 border-t space-y-2" style={{ borderColor: cardBorder }}>
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors"
              style={{
                color: isDark ? '#c4b5fd' : '#4c1d95',
                background: isDark ? 'rgba(122,58,240,0.12)' : 'rgba(101,12,217,0.06)',
                border: isDark ? '1px solid rgba(167,139,250,0.2)' : '1px solid rgba(101,12,217,0.12)',
              }}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Admin panel</span>
            </Link>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{ color: signOutText, background: signOutBg, border: signOutBorder }}
          >
            <LogOut className="w-4 h-4" style={{ color: signOutIcon }} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:ml-64 md:h-screen md:min-h-0">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 hidden md:block"
          style={{
            background: isDark
              ? 'radial-gradient(circle at 12% 18%, rgba(101,12,217,0.18), transparent 22%), radial-gradient(circle at 86% 10%, rgba(0,107,95,0.10), transparent 18%)'
              : 'radial-gradient(circle at 12% 18%, rgba(101,12,217,0.08), transparent 22%), radial-gradient(circle at 86% 10%, rgba(167,139,250,0.10), transparent 18%)',
          }}
        />
        <header
          className="sticky top-0 z-30 shrink-0 border-b shadow-sm backdrop-blur-none md:backdrop-blur-md"
          style={{ background: headerBg, borderColor: cardBorder }}
        >
          <div className="flex justify-between items-center w-full px-3 sm:px-6 md:px-8 lg:px-10 py-3.5 sm:py-4 max-w-[1520px] mx-auto gap-2">
            <div className="flex items-center gap-2 sm:gap-8 min-w-0">
              <button
                className="md:hidden w-11 h-11 rounded-full flex items-center justify-center transition-colors"
                style={{ color: iconMuted, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(101,12,217,0.06)' }}
                aria-label="Open side menu"
                title="Open side menu"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <BrandLockup href="/" size="sm" theme={isDark ? 'dark' : 'light'} className="md:hidden min-w-0" />
              <div className="hidden lg:flex items-center gap-6">
                <Link href="/" className="font-bold transition-colors inline-flex items-center gap-2" style={{ color: textMuted }}>
                  <House className="w-4 h-4" />
                  Home
                </Link>
                <Link href="/plans" className="font-bold transition-colors" style={{ color: textMuted }}>Pricing</Link>
                <Link href="/#how-it-works" className="font-bold transition-colors" style={{ color: textMuted }}>How it works</Link>
                <Link href="/contact" className="font-bold transition-colors" style={{ color: textMuted }}>Help</Link>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
              <button className="hidden sm:flex w-11 h-11 rounded-full items-center justify-center transition-colors opacity-40 cursor-default" style={{ color: iconMuted }} aria-label="Notifications (coming soon)" title="Notifications coming soon">
                <Bell className="w-5 h-5" />
              </button>
              <button
                onClick={toggleTheme}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-colors"
                style={{ color: iconMuted, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(101,12,217,0.06)' }}
                aria-label={isDark ? 'Use light mode' : 'Use dark mode'}
                title={isDark ? 'Use light mode' : 'Use dark mode'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link
                href="/app/create"
                className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-[#650cd9] to-[#7e3af2] text-white px-5 py-2.5 rounded-full font-bold shadow-md shadow-violet-700/30"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New</span>
              </Link>
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-2 flex items-center justify-center text-xs font-bold" style={{ borderColor: isDark ? 'rgba(200,173,255,0.25)' : 'rgba(101,12,217,0.12)', background: isDark ? '#171821' : '#ffffff', color: isDark ? '#d6c5ff' : '#650cd9' }}>
                {initials || <User className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </header>

        <section className="scroll-touch relative z-[1] mx-auto flex min-h-0 w-full min-w-0 max-w-[1520px] flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-4 sm:px-6 md:px-8 md:py-6 lg:px-10 pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-10">
          {children}
        </section>
      </main>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close side menu backdrop"
          />
          <aside
            className="absolute inset-y-0 left-0 flex h-full min-h-0 w-[82%] max-w-[320px] flex-col overflow-hidden p-4"
            style={{ background: sidebarBg, borderRight: `1px solid ${cardBorder}` }}
          >
            <div className="mb-3 flex shrink-0 items-center justify-between px-1 py-2">
              <BrandLockup href="/" size="sm" theme={isDark ? 'dark' : 'light'} />
              <button
                type="button"
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ color: iconMuted, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(101,12,217,0.06)' }}
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close side menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="scroll-touch min-h-0 flex-1 space-y-1 overflow-y-auto pt-1" aria-label="Mobile app navigation">
              {sidebarLinks.map(({ icon: Icon, label, href }) => {
                const isActive = pathname === href || (href !== '/app/dashboard' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200"
                    style={
                      isActive
                        ? { background: activeBg, color: activeText, border: activeBorder }
                        : { color: textMuted, border: '1px solid transparent' }
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </Link>
                )
              })}

              <p className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: textMuted }}>
                Website
              </p>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200"
                style={{ color: textMuted, border: '1px solid transparent' }}
              >
                <House className="w-4 h-4" />
                <span>Home</span>
              </Link>
              <Link
                href="/plans"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200"
                style={{ color: textMuted, border: '1px solid transparent' }}
              >
                <span>Pricing</span>
              </Link>
              <Link
                href="/#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200"
                style={{ color: textMuted, border: '1px solid transparent' }}
              >
                <span>How it works</span>
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200"
                style={{ color: textMuted, border: '1px solid transparent' }}
              >
                <span>Help</span>
              </Link>
            </nav>

            <div className="mt-3 shrink-0 space-y-2 border-t pt-4 pb-[env(safe-area-inset-bottom,0px)] px-1" style={{ borderColor: cardBorder }}>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors"
                  style={{
                    color: isDark ? '#c4b5fd' : '#4c1d95',
                    background: isDark ? 'rgba(122,58,240,0.12)' : 'rgba(101,12,217,0.06)',
                    border: isDark ? '1px solid rgba(167,139,250,0.2)' : '1px solid rgba(101,12,217,0.12)',
                  }}
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Admin panel</span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); logout() }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
                style={{ color: signOutText, background: signOutBg, border: signOutBorder }}
              >
                <LogOut className="w-4 h-4" style={{ color: signOutIcon }} />
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 z-40 flex w-full items-end justify-around gap-1 rounded-t-3xl border-t pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-none md:backdrop-blur-xl"
        style={{ background: isDark ? '#141626f2' : 'rgba(255,255,255,0.95)', boxShadow: isDark ? '0 -8px 30px rgba(0,0,0,0.35)' : '0 -8px 30px rgba(63,40,98,0.10)', borderColor: cardBorder }}
        aria-label="App bottom navigation"
      >
        <Link className="flex min-h-[48px] min-w-[4rem] flex-col items-center justify-end gap-0.5 pb-1 transition-colors" style={{ color: textMuted }} href="/app/dashboard">
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          <span className="text-[9px] font-semibold leading-tight text-center">My Zapps</span>
        </Link>
        <Link className="flex flex-col items-center justify-end -mt-3" href="/app/create">
          <span className="mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/50">
            <PlusCircle className="w-5 h-5" />
          </span>
          <span className="text-[9px] font-semibold leading-tight text-center" style={{ color: textMuted }}>Create</span>
        </Link>
        <Link className="flex min-h-[48px] min-w-[4rem] flex-col items-center justify-end gap-0.5 pb-1 transition-colors" style={{ color: textMuted }} href="/app/settings">
          <Settings className="w-5 h-5 shrink-0" />
          <span className="text-[9px] font-semibold leading-tight text-center">Settings</span>
        </Link>
        {isAdmin ? (
          <Link
            className="flex min-h-[48px] min-w-[4rem] flex-col items-center justify-end gap-0.5 pb-1 transition-colors"
            style={{ color: pathname.startsWith('/admin') ? activeText : textMuted }}
            href="/admin"
          >
            <Shield className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-semibold leading-tight text-center">Admin</span>
          </Link>
        ) : null}
      </nav>
    </div>
  )
}
