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
  const [codeError, setCodeError] = useState('')

  function handleJoin() {
    const normalized = code.trim().toUpperCase()
    if (!normalized) {
      setCodeError('Please enter a session code to join.')
      return
    }
    setCodeError('')
    const path = `/join/${encodeURIComponent(normalized)}${name.trim() ? `?name=${encodeURIComponent(name.trim())}` : ''}`
    router.push(path)
  }

  return (
    <div className="surface-page min-h-screen pb-20 md:pb-28">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b" style={{ borderColor: 'rgba(123,116,135,0.12)' }}>
        <div className="mx-auto w-full max-w-5xl px-3 sm:px-6 py-3.5 sm:py-5 flex items-center justify-between gap-2.5">
          <div className="sm:hidden"><BrandLockup href="/" size="sm" theme="light" /></div>
          <div className="hidden sm:block"><BrandLockup href="/" size="lg" theme="light" /></div>
          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
            <Link href="/login" className="text-xs sm:text-base font-bold whitespace-nowrap px-2 py-1.5 rounded-lg" style={{ color: '#3f3a4f' }}>Log In</Link>
            <Link href="/register" className="rounded-full px-3.5 sm:px-6 py-2 text-xs sm:text-base font-bold text-white shadow-md whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #650cd9, #7a3af0)' }}>
              Join Now
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 md:py-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight" style={{ color: '#1c1b1b' }}>Ready to Play?</h1>
          <p className="mt-2 text-base sm:text-lg md:text-2xl" style={{ color: '#4a4455' }}>Enter the session code from the host screen</p>
        </div>

        <div className="mx-auto w-full max-w-2xl surface-card p-6 sm:p-8 md:p-10">
          <label className="block text-sm font-black uppercase tracking-[0.14em] mb-2" style={{ color: '#8f63df' }}>Game Pin</label>
          <input
            type="text"
            value={code}
            onChange={e => { setCode(e.target.value); if (codeError) setCodeError('') }}
            onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
            placeholder="000 000"
            className="w-full rounded-3xl px-5 sm:px-6 py-4 sm:py-5 text-center text-3xl sm:text-4xl md:text-5xl font-black tracking-[0.18em] sm:tracking-[0.25em] outline-none"
            style={{ background: '#ece9e8', color: '#a9a2b8' }}
          />
          {codeError && <p className="text-sm font-semibold mt-2 text-center" style={{ color: '#dc2626' }}>{codeError}</p>}

          <label className="block text-sm font-black uppercase tracking-[0.14em] mb-2 mt-8" style={{ color: '#8f63df' }}>Your Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
            placeholder="Rocket_Racer"
            className="w-full rounded-3xl px-5 sm:px-6 py-4 text-xl md:text-2xl font-semibold outline-none"
            style={{ background: '#ece9e8', color: '#a9a2b8' }}
          />

          <button
            type="button"
            onClick={handleJoin}
            className="w-full mt-8 rounded-3xl py-4 sm:py-5 text-2xl sm:text-3xl md:text-4xl font-black text-white"
            style={{ background: 'linear-gradient(135deg, #650cd9, #7019e2)', boxShadow: '0 12px 30px rgba(101,12,217,0.22)' }}
          >
            Join Session
          </button>
        </div>

        <div className="mt-8 w-full flex items-center justify-center">
          <div className="text-center inline-flex items-center gap-2 text-base sm:text-xl font-semibold" style={{ color: '#86808f' }}>
            <Shield className="w-5 h-5" /> Secure Peer-to-Peer Session
          </div>
        </div>
      </main>
    </div>
  )
}

