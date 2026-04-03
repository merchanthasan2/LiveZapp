'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, BarChart3, Users, CheckCircle2, Radio, Tag, Clock, Sparkles, Zap } from 'lucide-react'
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

// ─── Join Widget ──────────────────────────────────────────────────────────

const DUMMY_COUNTS = [12, 18, 9, 24, 15]
const DUMMY_MIN = Math.min(...DUMMY_COUNTS)

function JoinWidget() {
  const [pulse, setPulse] = useState(0)
  const [realCount, setRealCount] = useState<number | null>(null)

  useEffect(() => {
    const t = setInterval(() => setPulse(p => p + 1), 3000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    import('firebase/database').then(({ onValue, ref: fbRef, query, orderByChild, equalTo }) => {
      const q = query(fbRef(rtdb, 'live_sessions'), orderByChild('isActive'), equalTo(true))
      const unsub = onValue(q, snap => {
        setRealCount(snap.exists() ? Object.keys(snap.val()).length : 0)
      }, () => {})
      return unsub
    }).catch(() => {})
  }, [])

  const displayCount = (realCount !== null && realCount >= DUMMY_MIN)
    ? realCount
    : DUMMY_COUNTS[pulse % DUMMY_COUNTS.length]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, delay: 0.2, type: 'spring', stiffness: 120 }}
      className="inline-block"
    >
      <motion.div
        className="inline-block rounded-3xl p-5"
        style={{
          background: '#001d3d',
          border: '1px solid rgba(255,195,0,0.18)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.50)',
        }}
        animate={{
          boxShadow: [
            '0 8px 40px rgba(0,0,0,0.50)',
            '0 12px 48px rgba(255,195,0,0.15), 0 8px 40px rgba(0,0,0,0.40)',
            '0 8px 40px rgba(0,0,0,0.50)',
          ],
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.03, boxShadow: '0 16px 56px rgba(255,195,0,0.22), 0 8px 40px rgba(0,0,0,0.50)' }}
      >
        <Link href="/join" className="group inline-flex items-center gap-4">

          {/* Logo icon */}
          <motion.div
            className="shrink-0 w-[88px] h-[88px] rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #ffc300 0%, #ffd60a 100%)',
              boxShadow: '0 8px 24px rgba(255,195,0,0.45)',
            }}
            animate={{
              boxShadow: [
                '0 8px 24px rgba(255,195,0,0.40)',
                '0 8px 36px rgba(255,195,0,0.75)',
                '0 8px 24px rgba(255,195,0,0.40)',
              ],
              rotate: [0, -2, 2, -1, 0],
            }}
            transition={{
              boxShadow: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
              rotate: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 },
            }}
            whileHover={{ scale: 1.08, rotate: 0 }}
          >
            <Zap className="w-10 h-10" style={{ color: '#000814' }} />
          </motion.div>

          {/* Badge stack */}
          <div className="flex flex-col items-start gap-[6px]">

            {/* JOIN */}
            <motion.div
              className="px-5 py-1.5 rounded-lg font-black tracking-widest uppercase w-full text-center"
              style={{
                background: '#ffc300',
                color: '#000814',
                fontSize: '1rem',
                letterSpacing: '0.18em',
                boxShadow: '0 4px 14px rgba(255,195,0,0.45)',
              }}
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
              whileHover={{ scale: 1.06 }}
            >
              JOIN
            </motion.div>

            {/* LIVE */}
            <motion.div
              className="flex items-center gap-2 px-5 py-2 rounded-lg font-black w-full"
              style={{
                background: '#000814',
                border: '2px solid #ffc300',
                color: '#FFFFFF',
                fontSize: '1.6rem',
                letterSpacing: '0.12em',
                boxShadow: '0 0 18px rgba(255,195,0,0.25)',
              }}
              animate={{
                boxShadow: [
                  '0 0 14px rgba(255,195,0,0.20)',
                  '0 0 28px rgba(255,195,0,0.55)',
                  '0 0 14px rgba(255,195,0,0.20)',
                ],
              }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: '#ffc300' }}
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              LIVE
            </motion.div>

            {/* NOW */}
            <motion.div
              className="px-5 py-1.5 rounded-lg font-black tracking-widest uppercase self-end"
              style={{
                background: '#003566',
                color: '#ffc300',
                fontSize: '1rem',
                letterSpacing: '0.18em',
                border: '1px solid rgba(255,195,0,0.30)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.30)',
              }}
              animate={{ y: [0, 2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              whileHover={{ scale: 1.06 }}
            >
              NOW
            </motion.div>
          </div>
        </Link>

        {/* Live counter */}
        <div className="flex items-center gap-1.5 mt-3 pl-1">
          <motion.div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: '#22C55E' }}
            animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <AnimatePresence mode="wait">
            <motion.span
              key={displayCount}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="text-xs font-bold whitespace-nowrap"
              style={{ color: '#22C55E' }}
            >
              {displayCount} sessions live right now
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>
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
      style={{ border: '1px solid rgba(255,195,0,0.20)', boxShadow: '0 16px 48px rgba(0,0,0,0.40)' }}
    >
      {/* Top dark panel */}
      <div className="px-7 pt-7 pb-5" style={{ background: 'linear-gradient(135deg, #001d3d 0%, #003566 100%)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4" style={{ color: '#ffc300' }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#ffc300' }}>Limited Offer</span>
        </div>
        <p className="font-black text-white" style={{ fontSize: '3.5rem', lineHeight: 1 }}>{discountLabel}</p>
        {promo.targetPlanId && (
          <p className="text-sm mt-1 font-semibold" style={{ color: 'rgba(255,255,255,0.50)' }}>
            on the <span className="capitalize" style={{ color: '#ffd60a' }}>{promo.targetPlanId}</span> plan
          </p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {daysLeft !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <Clock className="w-3 h-3" style={{ color: '#ffd60a' }} />
              <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {daysLeft === 0 ? 'Expires today' : `${daysLeft}d left`}
              </span>
            </div>
          )}
          {remaining !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <Users className="w-3 h-3" style={{ color: '#ffc300' }} />
              <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>{remaining} left</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom dark panel */}
      <div className="px-7 py-5" style={{ background: '#001d3d', borderTop: '1px solid rgba(255,195,0,0.12)' }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Promo code</p>
        <button
          onClick={copy}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl mb-4 transition-all"
          style={{ background: 'rgba(255,195,0,0.08)', border: '2px dashed rgba(255,195,0,0.35)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,195,0,0.14)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,195,0,0.08)' }}
        >
          <span className="font-black tracking-[0.22em] text-xl" style={{ color: '#ffc300' }}>{promo.code}</span>
          <AnimatePresence mode="wait">
            {copied
              ? <motion.span key="ok" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-xs font-black px-3 py-1 rounded-lg" style={{ background: '#22C55E', color: '#fff' }}>Copied!</motion.span>
              : <motion.span key="cp" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-xs font-bold px-3 py-1 rounded-lg" style={{ background: 'rgba(255,195,0,0.15)', color: '#ffc300' }}>Copy</motion.span>
            }
          </AnimatePresence>
        </button>
        <Link
          href={`/register?promo=${promo.code}`}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm"
          style={{ background: 'linear-gradient(135deg, #ffc300, #ffd60a)', color: '#000814', boxShadow: '0 4px 16px rgba(255,195,0,0.35)' }}
        >
          Claim this offer <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-[10px] text-center mt-2.5" style={{ color: 'rgba(255,255,255,0.30)' }}>No credit card required</p>
      </div>
    </motion.div>
  )
}

// ─── Mock dashboard card (fallback when no promo) ─────────────────────────

function MockDashboardCard() {
  const bars = [60, 85, 45, 95, 70, 55, 88, 40]
  const barColors = ['#ffc300', '#ffd60a', '#1e96fc', '#ffc300']
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}>
      <div
        className="p-6 space-y-5 animate-float rounded-2xl"
        style={{ background: '#001d3d', border: '1px solid rgba(255,195,0,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.40)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.40)' }}>Active Session</p>
            <h3 className="text-base font-bold mt-0.5" style={{ color: '#FFFFFF' }}>Q1 Strategy Kickoff</h3>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: '#ffc300', color: '#000814' }}>
            <Radio className="w-3 h-3 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wide">Live</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Responses', value: '47', bg: '#ffc300',       text: '#000814' },
            { label: 'Engagement', value: '92%', bg: '#003566',     text: '#ffc300' },
            { label: 'Audience', value: '52',  bg: 'rgba(255,255,255,0.08)', text: '#FFFFFF' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.bg, border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-lg font-bold" style={{ color: s.text }}>{s.value}</p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: s.text, opacity: 0.75 }}>{s.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold" style={{ color: '#FFFFFF' }}>Response Distribution</p>
            <BarChart3 className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
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
            { q: 'Rate this session so far', type: 'Poll', resp: 47 },
            { q: 'What topic next?', type: 'Choice', resp: 31 },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div>
                <p className="text-xs font-semibold" style={{ color: '#FFFFFF' }}>{item.q}</p>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.40)' }}>{item.type}</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold" style={{ color: '#ffc300' }}>
                <Users className="w-3 h-3" />{item.resp}
              </div>
            </div>
          ))}
        </div>
        <div
          className="flex items-center justify-between rounded-xl px-4 py-2.5"
          style={{ background: 'rgba(255,195,0,0.08)', border: '1px solid rgba(255,195,0,0.20)' }}
        >
          <div>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.40)' }}>Join with code</p>
            <p className="text-lg font-bold tracking-widest" style={{ color: '#ffc300' }}>LZ-7A29</p>
          </div>
          <CheckCircle2 className="w-5 h-5" style={{ color: '#ffc300' }} />
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
      style={{ background: 'linear-gradient(160deg, #000814 0%, #001d3d 60%, #000814 100%)' }}
    >
      {/* Subtle yellow radial glow in background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 60% 40%, rgba(255,195,0,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="section-container w-full relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

          {/* ── Left: Copy ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6 pt-4"
          >
            {/* Eyebrow */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <span
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,195,0,0.12)', color: '#ffc300', border: '1px solid rgba(255,195,0,0.25)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-yellow animate-pulse" />
                Live audience engagement — reimagined
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl sm:text-5xl"
              style={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#FFFFFF' }}
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
              style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '34rem' }}
            >
              Build multi-question sessions in minutes. Audiences join from any phone or
              laptop — no app needed — and you see live responses instantly.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <Link href="/register" className="btn-primary text-base px-7 py-3.5 text-center">
                Start for free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/join" className="btn-ghost text-base px-7 py-3.5 text-center">
                Join a LiveZapp now
              </Link>
            </motion.div>

            {/* Mobile Join widget */}
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
                { label: 'Live polls',  bg: 'rgba(255,195,0,0.15)',  text: '#ffc300',  border: 'rgba(255,195,0,0.30)' },
                { label: 'Quizzes',     bg: 'rgba(255,214,10,0.12)', text: '#ffd60a',  border: 'rgba(255,214,10,0.25)' },
                { label: 'Word clouds', bg: 'rgba(30,150,252,0.12)', text: '#1e96fc',  border: 'rgba(30,150,252,0.25)' },
                { label: 'Q&A',         bg: 'rgba(255,195,0,0.10)',  text: '#ffc300',  border: 'rgba(255,195,0,0.20)' },
              ].map(feat => (
                <span
                  key={feat.label}
                  className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: feat.bg, color: feat.text, border: `1px solid ${feat.border}` }}
                >
                  {feat.label}
                </span>
              ))}
            </motion.div>

            {/* Mobile promo strip */}
            {!promoLoading && featuredPromo && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="block lg:hidden">
                <div
                  className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl"
                  style={{ background: '#001d3d', border: '1px solid rgba(255,195,0,0.18)' }}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 shrink-0" style={{ color: '#ffd60a' }} />
                    <div>
                      <p className="font-black text-white text-sm">
                        {featuredPromo.discountType === 'percent' ? `${featuredPromo.discountValue}% off` : `$${featuredPromo.discountValue} off`}
                        {featuredPromo.targetPlanId ? ` the ${featuredPromo.targetPlanId} plan` : ''}
                      </p>
                      <p className="text-[10px] mt-0.5 font-mono tracking-widest" style={{ color: 'rgba(255,255,255,0.40)' }}>{featuredPromo.code}</p>
                    </div>
                  </div>
                  <Link
                    href={`/register?promo=${featuredPromo.code}`}
                    className="shrink-0 px-4 py-2 rounded-xl font-black text-xs"
                    style={{ background: '#ffc300', color: '#000814' }}
                  >
                    Claim
                  </Link>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* ── Right: Join widget + promo/dashboard ── */}
          <div className="hidden lg:flex flex-col gap-5">
            <JoinWidget />

            {promoLoading ? (
              <div className="rounded-3xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', height: 340 }} />
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
