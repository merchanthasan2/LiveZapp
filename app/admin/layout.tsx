'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  BarChart3,
  CircleDollarSign,
  Megaphone,
  Search,
  Settings,
  Shield,
  UserCog,
  Wallet,
  Bell,
  Moon,
  Zap,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import BrandLockup from '@/components/BrandLockup'

const adminLinks = [
  { icon: BarChart3, label: 'Analytics', href: '/admin' },
  { icon: Wallet, label: 'Finance', href: '/admin/financials' },
  { icon: UserCog, label: 'User Administration', href: '/admin/users' },
  { icon: CircleDollarSign, label: 'Plans', href: '/admin/plans' },
  { icon: Search, label: 'SEO', href: '/admin/seo' },
  { icon: Megaphone, label: 'Campaigns', href: '/admin/promos' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, isAdmin, logout } = useAuth()

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

  if (isLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#090910' }}>
        <div className="flex items-center gap-3 text-white/60">
          <Shield className="w-5 h-5" /> Checking access...
        </div>
      </div>
    )
  }

  const initials = user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen flex" style={{ background: '#0b0b12' }}>
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 w-[300px] p-5 flex-col"
        style={{
          background: 'linear-gradient(180deg, #070c23 0%, #04091b 100%)',
          borderRight: '1px solid rgba(122,58,240,0.24)',
        }}
      >
        <div className="flex items-center gap-3 mb-8">
          <div>
            <BrandLockup href="/" size="sm" theme="dark" subtitle="Admin Control" />
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          {adminLinks.map(item => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-2xl font-semibold transition-all"
                style={active
                  ? { background: 'rgba(122,58,240,0.28)', color: '#f2ebff', border: '1px solid rgba(191,167,255,0.35)' }
                  : { color: 'rgba(229,222,255,0.78)' }}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <button
          className="w-full rounded-2xl py-3.5 mb-5 text-2xl font-bold"
          style={{ background: 'linear-gradient(135deg, #be9bff, #6f39ea)', color: '#1e103d' }}
          onClick={() => router.push('/admin/promos')}
        >
          Create New Campaign
        </button>

        <div className="space-y-2 pt-4" style={{ borderTop: '1px solid rgba(122,58,240,0.20)' }}>
          <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-xl" style={{ color: 'rgba(229,222,255,0.75)' }}>
            <Settings className="w-5 h-5" /> Settings
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xl" style={{ color: 'rgba(255,204,214,0.88)' }}>
            <LogOut className="w-5 h-5" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-[300px]">
        <header className="sticky top-0 z-20 px-8 py-4 flex items-center gap-5" style={{ background: 'rgba(5,11,29,0.92)', borderBottom: '1px solid rgba(122,58,240,0.16)', backdropFilter: 'blur(10px)' }}>
          <div className="relative max-w-2xl flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(182,171,220,0.7)' }} />
            <input
              type="text"
              placeholder="Search platform data..."
              className="w-full rounded-full pl-10 pr-4 py-2.5 text-sm outline-none"
              style={{ background: 'rgba(20,28,56,0.82)', color: '#ece6ff', border: '1px solid rgba(122,58,240,0.22)' }}
            />
          </div>
          <Bell className="w-5 h-5" style={{ color: 'rgba(225,218,255,0.88)' }} />
          <Moon className="w-5 h-5" style={{ color: 'rgba(225,218,255,0.88)' }} />
          <div className="flex items-center gap-3 pl-5" style={{ borderLeft: '1px solid rgba(122,58,240,0.2)' }}>
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold text-white">Admin Profile</p>
              <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: '#bfa8ff' }}>Super Admin</p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg,#7a3af0,#a885ff)', color: '#fff' }}>
              {initials}
            </div>
          </div>
        </header>

        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}

