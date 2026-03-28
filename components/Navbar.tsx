'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Menu, X, LogOut, LayoutDashboard, Shield, Sun, Moon,
  ChevronDown, User, Settings, CreditCard, TrendingUp, ArrowUpRight,
  BarChart3, Users, Tag,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { PLANS } from '@/types/plans'

const navLinks = [
  { label: 'Plans',        href: '/plans' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'About',        href: '/about' },
  { label: 'Contact',      href: '/contact' },
]

// Plan badge colours (on the white navbar)
const planBadgeStyle: Record<string, { bg: string; color: string }> = {
  free:    { bg: '#F3F4F6',  color: '#6B7280' },
  basic:   { bg: '#00A6A6',  color: '#fff' },
  regular: { bg: '#EFCA08',  color: '#1A1A2E' },
  pro:     { bg: '#F08700',  color: '#fff' },
}

export default function Navbar() {
  const [scrolled,    setScrolled]    = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const pathname = usePathname()
  const { user, isAdmin, logout, isLoading } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMobileOpen(false); setProfileOpen(false) }, [pathname])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = user
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : ''

  const plan  = PLANS.find(p => p.id === user?.planId) ?? PLANS[0]
  const badge = planBadgeStyle[user?.planId ?? 'free'] ?? planBadgeStyle.free

  const isPlanExpired =
    plan.pricePerMonth > 0 &&
    !!user?.planExpiresAt &&
    new Date(user.planExpiresAt) < new Date()

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `2px solid ${scrolled ? 'rgba(0,166,166,0.30)' : 'rgba(0,166,166,0.18)'}`,
          boxShadow: scrolled ? '0 2px 12px rgba(0,166,166,0.08)' : 'none',
        }}
      >
        <nav className="section-container" aria-label="Primary navigation">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <Link href="/" aria-label="LiveZapp Home">
              <Image
                src="/LiveZapp Logo w_text.png"
                alt="LiveZapp"
                width={220}
                height={60}
                className="h-12 w-auto object-contain"
                priority
              />
            </Link>

            {/* Desktop Nav */}
            <ul className="hidden md:flex items-center gap-0.5" role="list">
              {navLinks.map(link => {
                const isActive = pathname === link.href
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="px-4 py-2 rounded-xl text-sm transition-all duration-200"
                      style={{
                        color: isActive ? '#00A6A6' : '#374151',
                        background: isActive ? 'rgba(0,166,166,0.08)' : 'transparent',
                        fontWeight: isActive ? 600 : 500,
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2.5">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl transition-all"
                style={{ color: isDark ? '#EFCA08' : '#6B7280', background: isDark ? 'rgba(239,202,8,0.10)' : 'rgba(0,0,0,0.04)' }}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {!isLoading && user ? (
                <>
                  <Link href="/app/dashboard" className="btn-ghost text-sm px-4 py-2">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </Link>

                  {/* ── Profile dropdown trigger ── */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setProfileOpen(o => !o)}
                      className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-xl transition-all hover:bg-black/5"
                      style={{ borderLeft: '1px solid #E5E7EB' }}
                      aria-expanded={profileOpen}
                      aria-label="Account menu"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: '#00A6A6', boxShadow: '0 2px 8px rgba(0,166,166,0.25)' }}
                      >
                        {initials}
                      </div>
                      <div className="hidden lg:block text-left">
                        <p className="text-xs font-semibold leading-tight" style={{ color: '#1A1A2E' }}>
                          {user.name}
                        </p>
                        <span
                          className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md inline-block mt-0.5"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {plan.name}
                        </span>
                      </div>
                      <ChevronDown
                        className="w-3.5 h-3.5 transition-transform ml-0.5"
                        style={{
                          color: '#9CA3AF',
                          transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      />
                    </button>

                    {/* ── Dropdown panel ── */}
                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-72 rounded-2xl overflow-hidden"
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            boxShadow: '0 16px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
                            zIndex: 60,
                          }}
                        >
                          {/* Profile header */}
                          <div className="px-4 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                              style={{ background: '#00A6A6', boxShadow: '0 2px 8px rgba(0,166,166,0.25)' }}
                            >
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate" style={{ color: '#111111' }}>{user.name}</p>
                              <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>{user.email}</p>
                            </div>
                          </div>

                          {/* Plan status */}
                          <div
                            className="px-4 py-3 flex items-center justify-between"
                            style={{ borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}
                          >
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Current Plan</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-black uppercase px-2 py-0.5 rounded-md" style={{ background: badge.bg, color: badge.color }}>
                                  {plan.name}
                                </span>
                                {isPlanExpired && <span className="text-xs text-red-500 font-semibold">Expired</span>}
                                {user.planCancelledAt && !isPlanExpired && (
                                  <span className="text-xs font-semibold" style={{ color: '#F08700' }}>Cancelled</span>
                                )}
                              </div>
                              {user.planExpiresAt && plan.id !== 'free' && (
                                <p className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>
                                  {isPlanExpired ? 'Expired' : user.billingCycle === 'annual' ? 'Renews' : 'Next billing'}:
                                  {' '}{new Date(user.planExpiresAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              )}
                            </div>
                            <Link
                              href="/plans"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                              style={{ background: 'rgba(0,166,166,0.08)', color: '#00A6A6' }}
                            >
                              {plan.id === 'free' || isPlanExpired ? 'Upgrade' : 'Change'}
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>

                          {/* Menu items */}
                          <nav className="py-1.5">
                            <DropdownItem
                              icon={User}
                              label="My Profile"
                              sublabel="Name, phone, address"
                              href="/app/settings?tab=profile"
                              onClick={() => setProfileOpen(false)}
                            />
                            <DropdownItem
                              icon={CreditCard}
                              label="Subscription"
                              sublabel="Upgrade, downgrade, cancel"
                              href="/app/settings?tab=subscription"
                              onClick={() => setProfileOpen(false)}
                            />
                            <DropdownItem
                              icon={Settings}
                              label="Brand Settings"
                              sublabel="Logo, colours, session footer"
                              href="/app/settings?tab=branding"
                              onClick={() => setProfileOpen(false)}
                            />
                            {plan.id === 'free' && (
                              <div className="mx-3 my-1.5">
                                <Link
                                  href="/plans"
                                  onClick={() => setProfileOpen(false)}
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                                  style={{ background: 'rgba(0,166,166,0.08)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.20)' }}
                                >
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  Upgrade your plan
                                  <ArrowUpRight className="w-3 h-3 ml-auto" />
                                </Link>
                              </div>
                            )}
                          </nav>

                          {/* Admin Panel — admins only */}
                          {isAdmin && (
                            <div className="px-3 pb-2" style={{ borderTop: '1px solid #F3F4F6' }}>
                              <p className="text-[9px] font-bold uppercase tracking-[0.16em] px-1 pt-3 pb-1.5" style={{ color: '#9CA3AF' }}>
                                Admin
                              </p>
                              <Link
                                href="/admin"
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group"
                                style={{ background: 'rgba(240,135,0,0.08)', border: '1px solid rgba(240,135,0,0.18)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(240,135,0,0.16)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(240,135,0,0.08)')}
                              >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#F08700' }}>
                                  <Shield className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold" style={{ color: '#1A1A2E' }}>Admin Panel</p>
                                  <p className="text-[11px] leading-none mt-0.5" style={{ color: '#C07800' }}>Platform management</p>
                                </div>
                                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" style={{ color: '#F08700' }} />
                              </Link>

                              {/* Quick admin links */}
                              <div className="grid grid-cols-3 gap-1.5 mt-2">
                                {[
                                  { icon: Users,    label: 'Users',    href: '/admin/users' },
                                  { icon: BarChart3, label: 'Revenue',  href: '/admin/financials' },
                                  { icon: Tag,      label: 'Promos',   href: '/admin/promos' },
                                ].map(({ icon: Icon, label, href }) => (
                                  <Link
                                    key={href}
                                    href={href}
                                    onClick={() => setProfileOpen(false)}
                                    className="flex flex-col items-center gap-1 py-2 rounded-xl text-center transition-all"
                                    style={{ background: 'rgba(240,135,0,0.06)', border: '1px solid rgba(240,135,0,0.12)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(240,135,0,0.14)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(240,135,0,0.06)')}
                                  >
                                    <Icon className="w-3.5 h-3.5" style={{ color: '#F08700' }} />
                                    <span className="text-[10px] font-semibold" style={{ color: '#374151' }}>{label}</span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sign out */}
                          <div style={{ borderTop: '1px solid #F3F4F6' }} className="py-1.5">
                            <button
                              onClick={() => { setProfileOpen(false); logout() }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-50 group"
                            >
                              <LogOut className="w-4 h-4 flex-shrink-0" style={{ color: '#9CA3AF' }} />
                              <span style={{ color: '#374151' }} className="group-hover:text-red-600 transition-colors">
                                Sign out
                              </span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : !isLoading ? (
                <>
                  <Link href="/login"    className="btn-ghost text-sm px-5 py-2.5">Login</Link>
                  <Link href="/register" className="btn-primary text-sm px-5 py-2.5">Get started</Link>
                </>
              ) : null}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-xl transition-colors"
              style={{ color: '#374151' }}
              onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile slide-over ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Panel */}
            <motion.div
              id="mobile-menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 flex flex-col md:hidden"
              style={{
                width: 'min(288px, 88vw)',
                background: '#FFFFFF',
                borderLeft: '1px solid #E5E7EB',
                boxShadow: '-4px 0 24px rgba(0,0,0,0.10)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
                <Image src="/LiveZapp Logo w_text.png" alt="LiveZapp" width={120} height={36} className="h-8 w-auto object-contain" />
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg" style={{ color: '#6B7280' }} aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">

                {/* User card */}
                {user && (
                  <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: '#00A6A6' }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: '#111111' }}>{user.name}</p>
                        <p className="text-[11px] truncate" style={{ color: '#9CA3AF' }}>{user.email}</p>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-lg shrink-0" style={{ background: badge.bg, color: badge.color }}>
                        {plan.name}
                      </span>
                    </div>

                    {/* Quick account links */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Profile',      href: '/app/settings?tab=profile' },
                        { label: 'Subscription', href: '/app/settings?tab=subscription' },
                        { label: 'Branding',     href: '/app/settings?tab=branding' },
                      ].map(({ label, href }) => (
                        <Link key={href} href={href}
                          className="text-center text-[11px] font-semibold py-2 rounded-lg transition-colors"
                          style={{ background: '#F3F4F6', color: '#374151' }}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* App nav */}
                {user && (
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: '#9CA3AF' }}>App</p>
                    <Link href="/app/dashboard"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                      style={{ color: '#1A1A2E' }}
                    >
                      <LayoutDashboard className="w-4 h-4 shrink-0" style={{ color: '#00A6A6' }} />
                      Dashboard
                    </Link>
                  </div>
                )}

                {/* Admin section — admins only */}
                {user && isAdmin && (
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: '#9CA3AF' }}>Admin</p>
                    <Link href="/admin"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold mb-2 transition-all"
                      style={{ background: 'rgba(240,135,0,0.10)', border: '1px solid rgba(240,135,0,0.22)', color: '#1A1A2E' }}
                    >
                      <Shield className="w-4 h-4 shrink-0" style={{ color: '#F08700' }} />
                      Admin Panel
                      <ArrowUpRight className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: '#F08700' }} />
                    </Link>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Users',    href: '/admin/users' },
                        { label: 'Revenue',  href: '/admin/financials' },
                        { label: 'Sessions', href: '/admin/sessions' },
                        { label: 'Promos',   href: '/admin/promos' },
                        { label: 'SEO',      href: '/admin/seo' },
                        { label: 'Settings', href: '/admin/settings' },
                      ].map(({ label, href }) => (
                        <Link key={href} href={href}
                          className="text-center text-[11px] font-semibold py-2 rounded-lg transition-colors"
                          style={{ background: 'rgba(240,135,0,0.08)', color: '#C07800', border: '1px solid rgba(240,135,0,0.15)' }}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Public nav links */}
                <nav className="px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: '#9CA3AF' }}>Site</p>
                  {navLinks.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      style={{ color: '#374151' }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                {/* Theme toggle */}
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ color: '#374151' }}
                  >
                    {isDark ? <Sun className="w-4 h-4 shrink-0" style={{ color: '#EFCA08' }} /> : <Moon className="w-4 h-4 shrink-0" style={{ color: '#6B7280' }} />}
                    {isDark ? 'Light mode' : 'Dark mode'}
                  </button>
                </div>

                {/* Auth actions */}
                <div className="px-4 py-4">
                  {user ? (
                    <button
                      onClick={logout}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                      style={{ color: '#EF4444', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      Sign out
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link href="/login"    className="btn-ghost text-sm text-center">Login</Link>
                      <Link href="/register" className="btn-primary text-sm text-center">Get started free</Link>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Reusable dropdown item ───────────────────────────────────────────────────
function DropdownItem({
  icon: Icon, label, sublabel, href, onClick,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  sublabel: string
  href: string
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 group"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors group-hover:bg-teal-50"
        style={{ background: '#F3F4F6' }}
      >
        <Icon className="w-4 h-4 transition-colors" style={{ color: '#6B7280' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#374151' }}>{label}</p>
        <p className="text-[11px] leading-none mt-0.5" style={{ color: '#9CA3AF' }}>{sublabel}</p>
      </div>
    </Link>
  )
}
