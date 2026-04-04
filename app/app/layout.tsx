'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
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
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTheme } from '@/lib/contexts/ThemeContext'
import BrandLockup from '@/components/BrandLockup'

const sidebarLinks = [
  { icon: LayoutDashboard, label: 'My Library', href: '/app/dashboard' },
  { icon: PlusCircle, label: 'Create New', href: '/app/create' },
  { icon: Settings, label: 'Settings', href: '/app/settings' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, isAdmin, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
  }, [isLoading, user, router])

  if (isLoading || !user) return null
  if (pathname.startsWith('/app/present/')) return <>{children}</>

  const initials = user.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const shellBg = isDark ? '#12131c' : '#fcf9f8'
  const sidebarBg = isDark ? '#171925' : '#f5f1f8'
  const headerBg = isDark ? 'rgba(18,19,28,0.92)' : 'rgba(252,249,248,0.92)'
  const cardBorder = isDark ? 'rgba(191,168,255,0.16)' : 'rgba(123,116,135,0.14)'
  const textBase = isDark ? '#f4efff' : '#1c1b1b'
  const textMuted = isDark ? 'rgba(214,207,237,0.80)' : '#4a4455'
  const iconMuted = isDark ? 'rgba(214,207,237,0.78)' : '#6c637a'
  const activeBg = isDark ? 'rgba(122,58,240,0.30)' : 'rgba(101,12,217,0.12)'
  const activeBorder = isDark ? '1px solid rgba(191,168,255,0.35)' : '1px solid rgba(101,12,217,0.18)'
  const activeText = isDark ? '#f1e8ff' : '#4d1698'

  return (
    <div className="min-h-screen md:flex" style={{ background: shellBg, color: textBase }}>
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col p-4 space-y-2 z-40" style={{ background: sidebarBg, borderRight: `1px solid ${cardBorder}` }}>
        <div className="flex items-center gap-3 px-2 py-6 mb-4">
          <div>
            <BrandLockup href="/" size="md" theme={isDark ? 'dark' : 'light'} />
            <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: textMuted }}>Premium Plan</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1" aria-label="App navigation">
          {sidebarLinks.map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href || (href !== '/app/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200"
                style={
                  isActive
                    ? { background: activeBg, color: activeText, border: activeBorder }
                    : { color: textMuted }
                }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="pt-4 border-t border-[rgba(191,168,255,0.16)] space-y-1">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
              style={{ color: textMuted }}
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </Link>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
            style={{ color: 'rgba(255,190,206,0.88)' }}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 min-h-screen relative flex flex-col overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: isDark
              ? 'radial-gradient(circle at 12% 18%, rgba(101,12,217,0.18), transparent 22%), radial-gradient(circle at 86% 10%, rgba(0,107,95,0.10), transparent 18%)'
              : 'radial-gradient(circle at 12% 18%, rgba(101,12,217,0.08), transparent 22%), radial-gradient(circle at 86% 10%, rgba(167,139,250,0.10), transparent 18%)',
          }}
        />
        <header className="sticky top-0 z-30 backdrop-blur-md shadow-sm border-b" style={{ background: headerBg, borderColor: cardBorder }}>
          <div className="flex justify-between items-center w-full px-4 md:px-6 py-4 max-w-[1440px] mx-auto">
            <div className="flex items-center gap-8">
              <BrandLockup href="/" size="sm" theme={isDark ? 'dark' : 'light'} className="md:hidden" />
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

            <div className="flex items-center gap-4">
              <button className="w-10 h-10 rounded-full flex items-center justify-center transition-colors" style={{ color: iconMuted }} aria-label="Notifications">
                <Bell className="w-5 h-5" />
              </button>
              <button
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
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
              <div className="h-10 w-10 rounded-full border-2 flex items-center justify-center text-xs font-bold" style={{ borderColor: isDark ? 'rgba(200,173,255,0.25)' : 'rgba(101,12,217,0.12)', background: isDark ? '#171821' : '#ffffff', color: isDark ? '#d6c5ff' : '#650cd9' }}>
                {initials || <User className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </header>

        <section className="relative flex-1 p-4 md:p-6 pb-28 md:pb-8 max-w-[1440px] mx-auto w-full">
          {children}
        </section>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-6 pb-6 pt-2 backdrop-blur-xl rounded-t-3xl border-t" style={{ background: isDark ? '#141626f2' : 'rgba(255,255,255,0.95)', boxShadow: isDark ? '0 -8px 30px rgba(0,0,0,0.35)' : '0 -8px 30px rgba(63,40,98,0.10)', borderColor: cardBorder }}>
        <Link className="flex flex-col items-center justify-center transition-colors" style={{ color: textMuted }} href="/app/dashboard">
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Home</span>
        </Link>
        <Link className="flex flex-col items-center justify-center bg-violet-600 text-white rounded-full w-12 h-12 mb-4 shadow-lg shadow-violet-600/50" href="/app/create">
          <PlusCircle className="w-5 h-5" />
        </Link>
        <Link className="flex flex-col items-center justify-center transition-colors" style={{ color: textMuted }} href="/app/settings">
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Settings</span>
        </Link>
      </nav>
    </div>
  )
}
