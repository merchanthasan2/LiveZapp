'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BarChart3, Users, CheckCircle2, Radio, Tag, Clock, Sparkles, ChevronRight } from 'lucide-react'
import { ref, get } from 'firebase/database'
import { rtdb } from '@/lib/firebase'

// ─── Types ────────────────────────────────────────────────────────────────

interface PromoCode {
  code: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  maxRedemptions: number | null
  currentRedemptions: number
  validUntil: string | null
  isActive: boolean
  targetPlanId: string | null
}

function isExpired(p: PromoCode) {
  if (!p.validUntil) return false
  return new Date(p.validUntil) < new Date()
}

function isFull(p: PromoCode) {
  return p.maxRedemptions !== null && p.currentRedemptions >= p.maxRedemptions
}

function bestPromo(promos: PromoCode[]): PromoCode | null {
  const active = promos.filter(p => p.isActive && !isExpired(p) && !isFull(p))
  if (active.length === 0) return null
  return active.sort((a, b) => {
    const scoreA = a.discountType === 'percent' ? a.discountValue : a.discountValue * 10
    const scoreB = b.discountType === 'percent' ? b.discountValue : b.discountValue * 10
    return scoreB - scoreA
  })[0]
}

// ─── Lively Join Widget ───────────────────────────────────────────────────

const DUMMY_COUNTS = [12, 18, 9, 24, 15]
const DUMMY_MIN = Math.min(...DUMMY_COUNTS)

function JoinWidget() {
  const [pulse, setPulse] = useState(0)
  const [realCount, setRealCount] = useState<number | null>(null)

  // Cycle dummy counter
  useEffect(() => {
    const t = setInterval(() => setPulse(p => p + 1), 3000)
    return () => clearInterval(t)
  }, [])

  // Subscribe to real live_sessions count
  useEffect(() => {
    import('firebase/database').then(({ onValue, ref: fbRef, query, orderByChild, equalTo }) => {
      const q = query(fbRef(rtdb, 'live_sessions'), orderByChild('isActive'), equalTo(true))
      const unsub = onValue(q, snap => {
        setRealCount(snap.exists() ? Object.keys(snap.val()).length : 0)
      }, () => {})
      return unsub
    }).catch(() => {})
  }, [])

  // Show real count only when it's >= dummy minimum, otherwise show cycling dummy
  const displayCount = (realCount !== null && realCount >= DUMMY_MIN)
    ? realCount
    : DUMMY_COUNTS[pulse % DUMMY_COUNTS.length]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="self-start"
    >
      <Link href="/join" className="block group w-full sm:w-[70%]">
        <div
          className="relative overflow-hidden rounded-3xl p-5 transition-all duration-300 group-hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, #0A1628 0%, #002952 60%, #003D7A 100%)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          {/* Animated glow blob */}
          <div
            className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-20 group-hover:opacity-30 transition-opacity duration-500"
            style={{ background: 'radial-gradient(circle, #00A6A6 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full opacity-15 group-hover:opacity-25 transition-opacity duration-500"
            style={{ background: 'radial-gradient(circle, #F08700 0%, transparent 70%)' }}
          />

          <div className="relative flex items-center justify-between gap-4">
            {/* Left: logo mark + text */}
            <div className="flex items-center gap-4">
              {/* LiveZapp logo mark (the thunderbolt) */}
              <motion.div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #F08700, #EFCA08)', boxShadow: '0 8px 24px rgba(240,135,0,0.45)' }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Image src="/LiveZapp Logo only.png" alt="Live-Zapp" width={52} height={52} className="w-12 h-12 object-contain" />
              </motion.div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ background: '#22C55E' }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={displayCount}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.3 }}
                      className="text-xs font-bold"
                      style={{ color: '#22C55E' }}
                    >
                      {displayCount} sessions live now
                    </motion.span>
                  </AnimatePresence>
                </div>
                <p className="font-black text-white text-lg leading-tight">Join a Live-Zapp</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>No account · Any device</p>
              </div>
            </div>

            {/* Right: arrow */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:translate-x-1"
              style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

// ─── Active promo banner ───────────────────────────────────────────────────

function PromoBanner({ promo }: { promo: PromoCode }) {
  const [copied, setCopied] = useState(false)
  const discountLabel = promo.discountType === 'percent' ? `${promo.discountValue}% off` : `$${promo.discountValue} off`
  const daysLeft = promo.validUntil
    ? Math.max(0, Math.ceil((new Date(promo.validUntil).getTime() - Date.now()) / 86400000))
    : null
  const remaining = promo.maxRedemptions !== null ? promo.maxRedemptions - promo.currentRedemptions : null

  function copy() {
    navigator.clipboard.writeText(promo.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.35 }}
      className="rounded-3xl overflow-hidden"
      style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.12)' }}
    >
      <div className="px-7 pt-7 pb-5" style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #003566 100%)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4" style={{ color: '#00A6A6' }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#00A6A6' }}>Limited Offer</span>
        </div>
        <p className="font-black text-white" style={{ fontSize: '3.5rem', lineHeight: 1 }}>{discountLabel}</p>
        {promo.targetPlanId && (
          <p className="text-sm mt-1 font-semibold" style={{ color: 'rgba(255,255,255,0.50)' }}>
            on the <span className="capitalize" style={{ color: '#EFCA08' }}>{promo.targetPlanId}</span> plan
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {daysLeft !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Clock className="w-3 h-3" style={{ color: '#EFCA08' }} />
              <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {daysLeft === 0 ? 'Expires today' : `${daysLeft}d left`}
              </span>
            </div>
          )}
          {remaining !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Users className="w-3 h-3" style={{ color: '#F08700' }} />
              <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>{remaining} left</span>
            </div>
          )}
        </div>
      </div>
      <div className="px-7 py-5 bg-white">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#9CA3AF' }}>Promo code</p>
        <button onClick={copy} className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl mb-4 transition-all" style={{ background: 'rgba(0,166,166,0.07)', border: '2px dashed rgba(0,166,166,0.35)' }}>
          <span className="font-black tracking-[0.22em] text-xl" style={{ color: '#00A6A6' }}>{promo.code}</span>
          <AnimatePresence mode="wait">
            {copied
              ? <motion.span key="ok" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-xs font-black px-3 py-1 rounded-lg" style={{ background: '#22C55E', color: '#fff' }}>Copied!</motion.span>
              : <motion.span key="cp" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-xs font-bold px-3 py-1 rounded-lg" style={{ background: 'rgba(0,166,166,0.12)', color: '#00A6A6' }}>Copy</motion.span>
            }
          </AnimatePresence>
        </button>
        <Link href={`/register?promo=${promo.code}`} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm" style={{ background: 'linear-gradient(135deg, #00A6A6, #007F7F)', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(0,166,166,0.30)' }}>
          Claim this offer <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-[10px] text-center mt-2.5" style={{ color: '#9CA3AF' }}>No credit card required</p>
      </div>
    </motion.div>
  )
}

// ─── Mock dashboard card (fallback) ───────────────────────────────────────

function MockDashboardCard() {
  const bars = [60, 85, 45, 95, 70, 55, 88, 40]
  const barColors = ['#00A6A6', '#EFCA08', '#F49F0A', '#F08700']
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}>
      <div className="glass-card p-6 space-y-5 animate-float">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-600 text-[#6B7280] uppercase tracking-wider">Active Session</p>
            <h3 className="text-base font-700 text-[#1A1A2E] mt-0.5">Q1 Strategy Kickoff</h3>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: '#F08700', color: '#FFFFFF' }}>
            <Radio className="w-3 h-3 animate-pulse" />
            <span className="text-xs font-700 uppercase tracking-wide">Live</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Responses', value: '47', bg: '#00A6A6', text: '#FFFFFF' },
            { label: 'Engagement', value: '92%', bg: '#EFCA08', text: '#1A1A2E' },
            { label: 'Audience', value: '52', bg: '#F49F0A', text: '#1A1A2E' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.bg }}>
              <p className="text-lg font-bold" style={{ color: s.text }}>{s.value}</p>
              <p className="text-[10px] font-500 mt-0.5" style={{ color: s.text, opacity: 0.75 }}>{s.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl p-4 border" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-600 text-[#1A1A2E]">Response Distribution</p>
            <BarChart3 className="w-3.5 h-3.5 text-[#6B7280]" />
          </div>
          <div className="flex items-end gap-2 h-16">
            {bars.map((h, i) => (
              <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.5 + i * 0.06, duration: 0.5, ease: 'easeOut' }} className="flex-1 rounded-t-md" style={{ background: barColors[i % barColors.length] }} />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {[{ q: 'Rate this session so far', type: 'Poll', resp: 47 }, { q: 'What topic next?', type: 'Choice', resp: 31 }].map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5 border" style={{ borderColor: '#E5E7EB', background: '#F5F7FA' }}>
              <div>
                <p className="text-xs font-600 text-[#1A1A2E]">{item.q}</p>
                <span className="text-[10px] text-[#6B7280]">{item.type}</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-700" style={{ color: '#00A6A6' }}>
                <Users className="w-3 h-3" />{item.resp}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl px-4 py-2.5 border" style={{ background: 'rgba(0,166,166,0.06)', borderColor: 'rgba(0,166,166,0.20)' }}>
          <div>
            <p className="text-[10px] text-[#6B7280]">Join with code</p>
            <p className="text-lg font-bold tracking-widest" style={{ color: '#00A6A6' }}>LZ-7A29</p>
          </div>
          <CheckCircle2 className="w-5 h-5" style={{ color: '#00A6A6' }} />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main hero ─────────────────────────────────────────────────────────────

export default function HeroSection() {
  const [featuredPromo, setFeaturedPromo] = useState<PromoCode | null>(null)
  const [promoLoading, setPromoLoading] = useState(true)

  useEffect(() => {
    get(ref(rtdb, 'promoCodes'))
      .then(snap => {
        if (!snap.exists()) return
        const all = Object.values(snap.val()) as PromoCode[]
        setFeaturedPromo(bestPromo(all))
      })
      .catch(() => {})
      .finally(() => setPromoLoading(false))
  }, [])

  return (
    <section
      className="relative min-h-[90vh] flex items-center pt-10 pb-20 overflow-hidden"
      style={{ background: '#BBDEF0' }}
    >
      <div className="section-container w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* ── Left: Copy ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6 pt-4"
          >
            {/* Logo */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="flex flex-col gap-2">
              <Image src="/LiveZapp Logo w_text.png" alt="LiveZapp" width={380} height={120} className="w-64 sm:w-80 h-auto object-contain -ml-2" priority />
              <p className="text-sm font-semibold tracking-wide" style={{ color: '#00A6A6' }}>Live audience engagement — reimagined</p>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl sm:text-5xl"
              style={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#1A1A2E' }}
            >
              Turn every session into a{' '}
              <span className="gradient-text">live, interactive</span>{' '}
              experience.
            </motion.h1>

            {/* Sub-copy */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-base sm:text-lg leading-relaxed"
              style={{ color: '#374151', maxWidth: '34rem' }}
            >
              Build multi-question sessions in minutes. Audiences join from any phone or
              laptop — no app needed — and you see live responses instantly.
            </motion.p>

            {/* Primary CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <Link href="/register" className="btn-primary text-base px-7 py-3.5 text-center">
                Start for free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/plans" className="btn-secondary text-base px-7 py-3.5 text-center">
                View plans
              </Link>
            </motion.div>

            {/* Mobile: Join widget (visible only on mobile, below CTAs) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="block lg:hidden"
            >
              <JoinWidget />
            </motion.div>

            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="flex flex-wrap items-center gap-2"
            >
              {[
                { label: 'Live polls',  bg: '#00A6A6', text: '#FFFFFF' },
                { label: 'Quizzes',     bg: '#EFCA08', text: '#1A1A2E' },
                { label: 'Word clouds', bg: '#F49F0A', text: '#1A1A2E' },
                { label: 'Q&A',         bg: '#F08700', text: '#FFFFFF' },
              ].map(feat => (
                <span key={feat.label} className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-600" style={{ background: feat.bg, color: feat.text }}>
                  {feat.label}
                </span>
              ))}
            </motion.div>

            {/* Mobile promo strip */}
            {!promoLoading && featuredPromo && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="block lg:hidden">
                <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, #1A1A2E, #003566)' }}>
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 shrink-0" style={{ color: '#EFCA08' }} />
                    <div>
                      <p className="font-black text-white text-sm">
                        {featuredPromo.discountType === 'percent' ? `${featuredPromo.discountValue}% off` : `$${featuredPromo.discountValue} off`}
                        {featuredPromo.targetPlanId ? ` the ${featuredPromo.targetPlanId} plan` : ''}
                      </p>
                      <p className="text-[10px] mt-0.5 font-mono tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>{featuredPromo.code}</p>
                    </div>
                  </div>
                  <Link href={`/register?promo=${featuredPromo.code}`} className="shrink-0 px-4 py-2 rounded-xl font-black text-xs" style={{ background: '#00A6A6', color: '#FFFFFF' }}>
                    Claim
                  </Link>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* ── Right: Join widget (top) + dashboard card or promo (below) ── */}
          <div className="hidden lg:flex flex-col gap-5">

            {/* Join widget — always at the top of the right column */}
            <JoinWidget />

            {/* Promo banner or mock dashboard */}
            {promoLoading ? (
              <div className="rounded-3xl animate-pulse" style={{ background: 'rgba(0,0,0,0.06)', height: 340 }} />
            ) : featuredPromo ? (
              <PromoBanner promo={featuredPromo} />
            ) : (
              <MockDashboardCard />
            )}
          </div>

        </div>
      </div>
    </section>
  )
}
