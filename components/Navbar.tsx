'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Menu, X, LogOut, LayoutDashboard, Shield,
  ChevronDown, User, Settings, CreditCard, TrendingUp, ArrowUpRight,
  BarChart3, Users, Tag,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/hooks/useAuth'
import { PLANS } from '@/types/plans'
import BrandLockup from '@/components/BrandLockup'

const navLinks = [
  { label: 'Plans',        href: '/plans' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'About',        href: '/about' },
  { label: 'Contact',      href: '/contact' },
]

const planBadgeStyle: Record<string, { bg: string; color: string }> = {
  free:    { bg: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.70)' },
  basic:   { bg: '#bfa8ff',               color: '#000814' },
  regular: { bg: '#1e96fc',               color: '#FFFFFF' },
  pro:     { bg: '#e1d1ff',               color: '#000814' },
}

export default function Navbar() {
  const pathname = usePathname()
  const shouldHideNavbar =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/checkout' ||
    pathname.startsWith('/join') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/admin')

  if (shouldHideNavbar) {
    return null
  }

  return <NavbarContent pathname={pathname} />
}

function NavbarContent({ pathname }: { pathname: string }) {
  const [scrolled,    setScrolled]    = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { user, isAdmin, logout, isLoading } = useAuth()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMobileOpen(false); setProfileOpen(false) }, [pathname])

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
          background: scrolled
            ? 'rgba(0,8,20,0.97)'
            : 'rgba(0,8,20,0.90)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${scrolled ? 'rgba(101,12,217,0.20)' : 'rgba(255,255,255,0.07)'}`,
          boxShadow: scrolled ? '0 2px 24px rgba(0,0,0,0.50)' : 'none',
        }}
      >
        <nav className="section-container" aria-label="Primary navigation">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <BrandLockup href="/" size="md" theme="dark" className="shrink-0" />

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
                        color: isActive ? '#bfa8ff' : 'rgba(255,255,255,0.65)',
                        background: isActive ? 'rgba(101,12,217,0.10)' : 'transparent',
                        fontWeight: isActive ? 600 : 500,
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.color = '#FFFFFF'
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.color = 'rgba(255,255,255,0.65)'
                          e.currentTarget.style.background = 'transparent'
                        }
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
              {!isLoading && user ? (
                <>
                  <Link
                    href="/app/dashboard"
                    className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                    style={{ color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(101,12,217,0.12)'; e.currentTarget.style.color = '#bfa8ff'; e.currentTarget.style.borderColor = 'rgba(101,12,217,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </Link>

                  {/* Profile dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setProfileOpen(o => !o)}
                      className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-xl transition-all"
                      style={{
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: profileOpen ? 'rgba(101,12,217,0.10)' : 'transparent',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(101,12,217,0.08)' }}
                      onMouseLeave={e => { if (!profileOpen) e.currentTarget.style.background = 'transparent' }}
                      aria-expanded={profileOpen}
                      aria-label="Account menu"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg, #bfa8ff, #e1d1ff)', color: '#000814', boxShadow: '0 2px 8px rgba(101,12,217,0.30)' }}
                      >
                        {initials}
                      </div>
                      <div className="hidden lg:block text-left">
                        <p className="text-xs font-semibold leading-tight" style={{ color: '#FFFFFF' }}>
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
                          color: 'rgba(255,255,255,0.40)',
                          transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                      />
                    </button>

                    {/* Dropdown panel */}
                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-72 rounded-2xl overflow-hidden"
                          style={{
                            background: '#001d3d',
                            border: '1px solid rgba(255,255,255,0.10)',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.60), 0 2px 8px rgba(0,0,0,0.30)',
                            zIndex: 60,
                          }}
                        >
                          {/* Profile header */}
                          <div className="px-4 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                              style={{ background: 'linear-gradient(135deg, #bfa8ff, #e1d1ff)', color: '#000814', boxShadow: '0 2px 8px rgba(101,12,217,0.30)' }}
                            >
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate" style={{ color: '#FFFFFF' }}>{user.name}</p>
                              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.40)' }}>{user.email}</p>
                            </div>
                          </div>

                          {/* Plan status */}
                          <div
                            className="px-4 py-3 flex items-center justify-between"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.20)' }}
                          >
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>Current Plan</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-black uppercase px-2 py-0.5 rounded-md" style={{ background: badge.bg, color: badge.color }}>
                                  {plan.name}
                                </span>
                                {isPlanExpired && <span className="text-xs font-semibold" style={{ color: '#EF4444' }}>Expired</span>}
                                {user.planCancelledAt && !isPlanExpired && (
                                  <span className="text-xs font-semibold" style={{ color: 'rgba(101,12,217,0.80)' }}>Cancelled</span>
                                )}
                              </div>
                              {user.planExpiresAt && plan.id !== 'free' && (
                                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                  {isPlanExpired ? 'Expired' : user.billingCycle === 'annual' ? 'Renews' : 'Next billing'}:
                                  {' '}{new Date(user.planExpiresAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              )}
                            </div>
                            <Link
                              href="/plans"
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all"
                              style={{ background: 'rgba(101,12,217,0.15)', color: '#bfa8ff', border: '1px solid rgba(101,12,217,0.25)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#bfa8ff'; e.currentTarget.style.color = '#000814' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(101,12,217,0.15)'; e.currentTarget.style.color = '#bfa8ff' }}
                            >
                              {plan.id !== 'pro' || isPlanExpired ? 'Upgrade' : 'Change'}
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>

                          {/* Menu items */}
                          <nav className="py-1.5">
                            <DropdownItem icon={User}       label="My Profile"     sublabel="Name, phone, address"       href="/app/settings?tab=profile"      onClick={() => setProfileOpen(false)} />
                            <DropdownItem icon={CreditCard} label="Subscription"   sublabel="Upgrade, downgrade, cancel"  href="/app/settings?tab=subscription"  onClick={() => setProfileOpen(false)} />
                            <DropdownItem icon={Settings}   label="Brand Settings" sublabel="Logo, colours, session footer" href="/app/settings?tab=branding"   onClick={() => setProfileOpen(false)} />
                            {plan.id !== 'pro' && (
                              <div className="mx-3 my-1.5">
                                <Link
                                  href="/plans"
                                  onClick={() => setProfileOpen(false)}
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                                  style={{ background: 'rgba(101,12,217,0.12)', color: '#bfa8ff', border: '1px solid rgba(101,12,217,0.22)' }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#bfa8ff'; e.currentTarget.style.color = '#000814' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(101,12,217,0.12)'; e.currentTarget.style.color = '#bfa8ff' }}
                                >
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  Upgrade your plan
                                  <ArrowUpRight className="w-3 h-3 ml-auto" />
                                </Link>
                              </div>
                            )}
                          </nav>

                          {/* Admin Panel */}
                          {isAdmin && (
                            <div className="px-3 pb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              <p className="text-[9px] font-bold uppercase tracking-[0.16em] px-1 pt-3 pb-1.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
                                Admin
                              </p>
                              <Link
                                href="/admin"
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                                style={{ background: 'rgba(101,12,217,0.08)', border: '1px solid rgba(101,12,217,0.18)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(101,12,217,0.18)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(101,12,217,0.08)' }}
                              >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#bfa8ff' }}>
                                  <Shield className="w-4 h-4" style={{ color: '#000814' }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold" style={{ color: '#FFFFFF' }}>Admin Panel</p>
                                  <p className="text-[11px] leading-none mt-0.5" style={{ color: '#bfa8ff' }}>Platform management</p>
                                </div>
                                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" style={{ color: '#bfa8ff' }} />
                              </Link>
                              <div className="grid grid-cols-3 gap-1.5 mt-2">
                                {[
                                  { icon: Users,    label: 'Users',   href: '/admin/users' },
                                  { icon: BarChart3, label: 'Revenue', href: '/admin/financials' },
                                  { icon: Tag,      label: 'Promos',  href: '/admin/promos' },
                                ].map(({ icon: Icon, label, href }) => (
                                  <Link
                                    key={href}
                                    href={href}
                                    onClick={() => setProfileOpen(false)}
                                    className="flex flex-col items-center gap-1 py-2 rounded-xl text-center transition-all"
                                    style={{ background: 'rgba(101,12,217,0.06)', border: '1px solid rgba(101,12,217,0.12)' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(101,12,217,0.16)' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(101,12,217,0.06)' }}
                                  >
                                    <Icon className="w-3.5 h-3.5" style={{ color: '#bfa8ff' }} />
                                    <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>{label}</span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Sign out */}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="py-1.5">
                            <button
                              onClick={() => { setProfileOpen(false); logout() }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all group"
                              style={{ color: 'rgba(255,255,255,0.55)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#EF4444' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
                            >
                              <LogOut className="w-4 h-4 flex-shrink-0" />
                              Sign out
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : !isLoading ? (
                <>
                  <Link href="/login" className="btn-ghost text-sm px-5 py-2.5">Login</Link>
                  <Link href="/register" className="btn-primary text-sm px-5 py-2.5">Get started free</Link>
                </>
              ) : null}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-xl transition-all"
              style={{ color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.07)' }}
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

      {/* Mobile slide-over */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0,8,20,0.70)', backdropFilter: 'blur(4px)' }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              id="mobile-menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 flex flex-col md:hidden"
              style={{
                width: 'min(288px, 88vw)',
                background: '#001d3d',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '-8px 0 40px rgba(0,0,0,0.50)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2.5">
                  <BrandLockup href="/" size="md" theme="dark" />
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg transition-all" style={{ color: 'rgba(255,255,255,0.50)', background: 'rgba(255,255,255,0.07)' }} aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* User card */}
                {user && (
                  <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #bfa8ff, #e1d1ff)', color: '#000814' }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: '#FFFFFF' }}>{user.name}</p>
                        <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.40)' }}>{user.email}</p>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-lg shrink-0" style={{ background: badge.bg, color: badge.color }}>
                        {plan.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Profile',      href: '/app/settings?tab=profile' },
                        { label: 'Subscription', href: '/app/settings?tab=subscription' },
                        { label: 'Branding',     href: '/app/settings?tab=branding' },
                      ].map(({ label, href }) => (
                        <Link key={href} href={href}
                          className="text-center text-[11px] font-semibold py-2 rounded-lg transition-all"
                          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {user && (
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: 'rgba(255,255,255,0.30)' }}>App</p>
                    <Link href="/app/dashboard"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{ color: 'rgba(255,255,255,0.75)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(101,12,217,0.10)'; e.currentTarget.style.color = '#bfa8ff' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
                    >
                      <LayoutDashboard className="w-4 h-4 shrink-0" style={{ color: '#bfa8ff' }} />
                      Dashboard
                    </Link>
                  </div>
                )}

                {user && isAdmin && (
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: 'rgba(255,255,255,0.30)' }}>Admin</p>
                    <Link href="/admin"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold mb-2 transition-all"
                      style={{ background: 'rgba(101,12,217,0.10)', border: '1px solid rgba(101,12,217,0.22)', color: '#FFFFFF' }}
                    >
                      <Shield className="w-4 h-4 shrink-0" style={{ color: '#bfa8ff' }} />
                      Admin Panel
                      <ArrowUpRight className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: '#bfa8ff' }} />
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
                          className="text-center text-[11px] font-semibold py-2 rounded-lg transition-all"
                          style={{ background: 'rgba(101,12,217,0.08)', color: '#bfa8ff', border: '1px solid rgba(101,12,217,0.15)' }}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <nav className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: 'rgba(255,255,255,0.30)' }}>Site</p>
                  {navLinks.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{ color: 'rgba(255,255,255,0.65)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.background = 'transparent' }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>

                <div className="px-4 py-4">
                  {user ? (
                    <button
                      onClick={logout}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{ color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      Sign out
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link href="/login" className="btn-ghost text-sm text-center">Login</Link>
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
      className="flex items-center gap-3 px-4 py-2.5 transition-all group"
      style={{ color: 'rgba(255,255,255,0.75)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(101,12,217,0.07)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
        style={{ background: 'rgba(255,255,255,0.07)' }}
      >
        <Icon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.50)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>{label}</p>
        <p className="text-[11px] leading-none mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{sublabel}</p>
      </div>
    </Link>
  )
}


