'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Zap, BarChart3, Users, CheckCircle2, Radio, Tag, Clock, Sparkles } from 'lucide-react'
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

// Pick the single best promo to feature: highest % discount first, then fixed
function bestPromo(promos: PromoCode[]): PromoCode | null {
  const active = promos.filter(p => p.isActive && !isExpired(p) && !isFull(p))
  if (active.length === 0) return null
  return active.sort((a, b) => {
    const scoreA = a.discountType === 'percent' ? a.discountValue : a.discountValue * 10
    const scoreB = b.discountType === 'percent' ? b.discountValue : b.discountValue * 10
    return scoreB - scoreA
  })[0]
}

// ─── Active promo banner (right column) ───────────────────────────────────

function PromoBanner({ promo }: { promo: PromoCode }) {
  const [copied, setCopied] = useState(false)
  const isPercent = promo.discountType === 'percent'
  const discountLabel = isPercent ? `${promo.discountValue}% off` : `$${promo.discountValue} off`
  const daysLeft = promo.validUntil
    ? Math.max(0, Math.ceil((new Date(promo.validUntil).getTime() - Date.now()) / 86400000))
    : null

  const remaining = promo.maxRedemptions !== null
    ? promo.maxRedemptions - promo.currentRedemptions
    : null

  function copy() {
    navigator.clipboard.writeText(promo.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.3 }}
      className="relative"
    >
      <div
        className="relative rounded-3xl overflow-hidden animate-float"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.14)' }}
      >
        {/* Gradient header */}
        <div
          className="px-8 pt-8 pb-6"
          style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #003566 100%)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,166,166,0.25)' }}>
              <Tag className="w-4 h-4" style={{ color: '#00A6A6' }} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#00A6A6' }}>
              Limited Offer
            </span>
          </div>

          {/* Big discount */}
          <div className="mb-4">
            <p className="font-black" style={{ fontSize: '4rem', color: '#FFFFFF', lineHeight: 1 }}>
              {discountLabel}
            </p>
            {promo.targetPlanId && (
              <p className="text-sm mt-1 font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
                on the <span className="capitalize" style={{ color: '#EFCA08' }}>{promo.targetPlanId}</span> plan
              </p>
            )}
          </div>

          {/* Urgency chips */}
          <div className="flex flex-wrap gap-2">
            {daysLeft !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <Clock className="w-3 h-3" style={{ color: '#EFCA08' }} />
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.80)' }}>
                  {daysLeft === 0 ? 'Expires today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                </span>
              </div>
            )}
            {remaining !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <Users className="w-3 h-3" style={{ color: '#F08700' }} />
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.80)' }}>
                  {remaining} use{remaining !== 1 ? 's' : ''} left
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Code + CTA */}
        <div className="px-8 py-6" style={{ background: '#FFFFFF' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#9CA3AF' }}>Your promo code</p>
          <button
            onClick={copy}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl mb-4 transition-all active:scale-[0.99]"
            style={{ background: 'rgba(0,166,166,0.07)', border: '2px dashed rgba(0,166,166,0.35)' }}
          >
            <span className="font-black tracking-[0.25em] text-xl" style={{ color: '#00A6A6' }}>
              {promo.code}
            </span>
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span key="ok" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
                  className="text-xs font-black px-3 py-1 rounded-lg" style={{ background: '#22C55E', color: '#fff' }}>
                  Copied!
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
                  className="text-xs font-bold px-3 py-1 rounded-lg" style={{ background: 'rgba(0,166,166,0.12)', color: '#00A6A6' }}>
                  Copy
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <Link
            href={`/register?promo=${promo.code}`}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all"
            style={{ background: 'linear-gradient(135deg, #00A6A6, #007F7F)', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(0,166,166,0.35)' }}
          >
            Claim this offer <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-[10px] text-center mt-3" style={{ color: '#9CA3AF' }}>
            No credit card required · Cancel anytime
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Animated mock dashboard card (fallback) ──────────────────────────────

function MockDashboardCard() {
  const bars = [60, 85, 45, 95, 70, 55, 88, 40]
  const barColors = ['#00A6A6', '#EFCA08', '#F49F0A', '#F08700']

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.3 }}
      className="relative"
    >
      <div className="relative glass-card p-6 space-y-5 animate-float">
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
            { label: 'Responses',  value: '47',  bg: '#00A6A6', text: '#FFFFFF' },
            { label: 'Engagement', value: '92%', bg: '#EFCA08', text: '#1A1A2E' },
            { label: 'Audience',   value: '52',  bg: '#F49F0A', text: '#1A1A2E' },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl p-3 text-center" style={{ background: stat.bg }}>
              <p className="text-lg font-bold" style={{ color: stat.text }}>{stat.value}</p>
              <p className="text-[10px] font-500 mt-0.5" style={{ color: stat.text, opacity: 0.75 }}>{stat.label}</p>
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
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.5 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                className="flex-1 rounded-t-md"
                style={{ background: barColors[i % barColors.length] }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {[
            { q: 'Rate this session so far', type: 'Poll',   resp: 47 },
            { q: 'What topic next?',          type: 'Choice', resp: 31 },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5 border" style={{ borderColor: '#E5E7EB', background: '#F5F7FA' }}>
              <div>
                <p className="text-xs font-600 text-[#1A1A2E]">{item.q}</p>
                <span className="text-[10px] text-[#6B7280]">{item.type}</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-700" style={{ color: '#00A6A6' }}>
                <Users className="w-3 h-3" />
                {item.resp}
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
      className="relative min-h-[90vh] flex items-center pt-12 pb-24 overflow-hidden"
      style={{ background: '#BBDEF0' }}
    >
      <div className="section-container w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-7"
          >
            {/* Logo block */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="flex flex-col gap-2"
            >
              <Image
                src="/LiveZapp Logo w_text.png"
                alt="LiveZapp"
                width={380}
                height={120}
                className="w-72 sm:w-96 h-auto object-contain -ml-2"
                priority
              />
              <p className="text-sm font-semibold tracking-wide" style={{ color: '#00A6A6' }}>
                Live audience engagement — reimagined
              </p>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#1A1A2E' }}
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
              className="text-base sm:text-lg leading-relaxed max-w-lg"
              style={{ color: '#374151' }}
            >
              Build multi-question presentations in minutes. Audiences join from any phone or
              laptop — no app download needed — and you see live responses instantly.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <Link href="/register" className="btn-primary text-base px-7 py-3.5">
                Start for free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/plans" className="btn-secondary text-base px-7 py-3.5">
                View plans
              </Link>
            </motion.div>

            {/* 5A — Join LiveZapp Now CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Link
                href="/join"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-base transition-all"
                style={{
                  background: 'linear-gradient(135deg, #F08700, #F49F0A)',
                  color: '#FFFFFF',
                  boxShadow: '0 8px 28px rgba(240,135,0,0.35)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 12px 36px rgba(240,135,0,0.45)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = ''; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 28px rgba(240,135,0,0.35)' }}
              >
                <Zap className="w-5 h-5" fill="currentColor" />
                Join a Live-Zapp Now
              </Link>
              <p className="text-xs mt-2 ml-1" style={{ color: '#6B7280' }}>
                No account needed · Enter your session code to join
              </p>
            </motion.div>

            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center gap-2"
              aria-label="Features summary"
            >
              {[
                { label: 'Live polls',  bg: '#00A6A6', text: '#FFFFFF' },
                { label: 'Quizzes',     bg: '#EFCA08', text: '#1A1A2E' },
                { label: 'Word clouds', bg: '#F49F0A', text: '#1A1A2E' },
                { label: 'Q&A',         bg: '#F08700', text: '#FFFFFF' },
              ].map(feat => (
                <span
                  key={feat.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-600"
                  style={{ background: feat.bg, color: feat.text }}
                >
                  {feat.label}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Active promo or mock dashboard */}
          <div className="hidden lg:block">
            {promoLoading ? (
              /* Skeleton while loading */
              <div className="rounded-3xl overflow-hidden animate-pulse" style={{ background: 'rgba(0,0,0,0.06)', height: 420 }} />
            ) : featuredPromo ? (
              <PromoBanner promo={featuredPromo} />
            ) : (
              <MockDashboardCard />
            )}
          </div>
        </div>

        {/* 5B — Mobile promo strip (shown below the copy on small screens when promo exists) */}
        {!promoLoading && featuredPromo && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 lg:hidden"
          >
            <div
              className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #1A1A2E, #003566)' }}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 shrink-0" style={{ color: '#EFCA08' }} />
                <div>
                  <p className="font-black text-white text-sm">
                    {featuredPromo.discountType === 'percent'
                      ? `${featuredPromo.discountValue}% off`
                      : `$${featuredPromo.discountValue} off`}
                    {featuredPromo.targetPlanId ? ` the ${featuredPromo.targetPlanId} plan` : ''}
                  </p>
                  <p className="text-[10px] mt-0.5 font-mono tracking-widest" style={{ color: 'rgba(255,255,255,0.50)' }}>
                    {featuredPromo.code}
                  </p>
                </div>
              </div>
              <Link
                href={`/register?promo=${featuredPromo.code}`}
                className="shrink-0 px-4 py-2 rounded-xl font-black text-xs transition-all"
                style={{ background: '#00A6A6', color: '#FFFFFF' }}
              >
                Claim
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
