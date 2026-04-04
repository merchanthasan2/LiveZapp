'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import BrandLockup from '@/components/BrandLockup'

export default function JoinLandingPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  function handleJoin() {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return
    const path = `/join/${encodeURIComponent(normalized)}${name.trim() ? `?name=${encodeURIComponent(name.trim())}` : ''}`
    router.push(path)
  }

  return (
    <div className="surface-page min-h-screen pb-28">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b" style={{ borderColor: 'rgba(123,116,135,0.12)' }}>
        <div className="mx-auto max-w-4xl px-6 py-5 flex items-center justify-between">
          <BrandLockup href="/" size="lg" theme="light" />
          <div className="flex items-center gap-6">
            <Link href="/login" className="font-bold" style={{ color: '#3f3a4f' }}>Log In</Link>
            <Link href="/register" className="rounded-full px-6 py-2.5 font-bold text-white shadow-md" style={{ background: 'linear-gradient(135deg, #650cd9, #7a3af0)' }}>
              Join Now
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black" style={{ color: '#1c1b1b' }}>Ready to Play?</h1>
          <p className="mt-2 text-2xl" style={{ color: '#4a4455' }}>Enter the session code from the host screen</p>
        </div>

        <div className="mx-auto max-w-2xl surface-card p-8 md:p-10">
          <label className="block text-sm font-black uppercase tracking-[0.14em] mb-2" style={{ color: '#8f63df' }}>Game Pin</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
            placeholder="000 000"
            className="w-full rounded-3xl px-6 py-5 text-center text-5xl font-black tracking-[0.25em] outline-none"
            style={{ background: '#ece9e8', color: '#a9a2b8' }}
          />

          <label className="block text-sm font-black uppercase tracking-[0.14em] mb-2 mt-8" style={{ color: '#8f63df' }}>Your Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
            placeholder="Rocket_Racer"
            className="w-full rounded-3xl px-6 py-4 text-2xl font-semibold outline-none"
            style={{ background: '#ece9e8', color: '#a9a2b8' }}
          />

          <button
            type="button"
            onClick={handleJoin}
            className="w-full mt-8 rounded-3xl py-5 text-5xl font-black text-white"
            style={{ background: 'linear-gradient(135deg, #650cd9, #7019e2)', boxShadow: '0 12px 30px rgba(101,12,217,0.22)' }}
          >
            Join Session
          </button>
        </div>

        <div className="mt-8 text-center inline-flex items-center gap-2 text-xl font-semibold" style={{ color: '#86808f' }}>
          <Shield className="w-5 h-5" /> Secure Peer-to-Peer Session
        </div>
      </main>
    </div>
  )
}

