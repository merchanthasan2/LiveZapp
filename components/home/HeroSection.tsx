'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Cloud,
  MessageSquare,
  Radio,
  ShieldCheck,
  Star,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { rtdb } from '@/lib/firebase'

const DUMMY_COUNTS = [12, 18, 9, 24, 15]
const DUMMY_MIN = Math.min(...DUMMY_COUNTS)

function JoinCodeCard() {
  const [pulse, setPulse] = useState(0)
  const [realCount, setRealCount] = useState<number | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setPulse(p => p + 1), 3000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    import('firebase/database')
      .then(({ equalTo, onValue, orderByChild, query, ref: fbRef }) => {
        const q = query(fbRef(rtdb, 'live_sessions'), orderByChild('isActive'), equalTo(true))
        const unsub = onValue(
          q,
          snap => setRealCount(snap.exists() ? Object.keys(snap.val()).length : 0),
          () => {}
        )
        return unsub
      })
      .catch(() => {})
  }, [])

  const displayCount =
    realCount !== null && realCount >= DUMMY_MIN ? realCount : DUMMY_COUNTS[pulse % DUMMY_COUNTS.length]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, delay: 0.2, type: 'spring', stiffness: 120 }}
      className="w-full max-w-[26rem]"
    >
      <motion.div
        className="rounded-3xl p-5"
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
        whileHover={{ scale: 1.02 }}
      >
        <Link href="/join" className="group flex items-center justify-between gap-4">
          <motion.div
            className="shrink-0 w-[80px] h-[80px] rounded-2xl flex items-center justify-center"
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
          >
            <Zap className="w-9 h-9" style={{ color: '#000814' }} />
          </motion.div>

          <div className="flex-1 flex flex-col items-start gap-1.5">
            <motion.div
              className="px-4 py-1 rounded-lg font-black tracking-widest uppercase w-full text-center"
              style={{
                background: '#ffc300',
                color: '#000814',
                fontSize: '0.9rem',
                letterSpacing: '0.18em',
                boxShadow: '0 4px 14px rgba(255,195,0,0.45)',
              }}
              animate={{ y: [0, -1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              JOIN
            </motion.div>
            <motion.div
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-black w-full"
              style={{
                background: '#000814',
                border: '2px solid #ffc300',
                color: '#ffffff',
                fontSize: '1.3rem',
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
          </div>

          <div
            className="shrink-0 rounded-xl px-3 py-2 text-center"
            style={{
              background: 'rgba(255,195,0,0.12)',
              border: '1px solid rgba(255,195,0,0.24)',
            }}
          >
            <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'rgba(255,255,255,0.60)' }}>
              Try code
            </p>
            <p className="text-base font-black tracking-widest" style={{ color: '#ffd60a' }}>
              LZ-4729
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 mt-3 pl-1">
          <motion.div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: '#22c55e' }}
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
              style={{ color: '#22c55e' }}
            >
              {displayCount} sessions live right now
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

function TrustStrip() {
  const trustItems = [
    { label: 'Trusted by teams', icon: Building2 },
    { label: 'No app installs', icon: ShieldCheck },
    { label: 'Fast onboarding', icon: Star },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="flex flex-wrap items-center gap-2"
    >
      {trustItems.map(item => (
        <div
          key={item.label}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.80)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <item.icon className="w-3.5 h-3.5" style={{ color: '#ffd60a' }} />
          {item.label}
        </div>
      ))}
    </motion.div>
  )
}

function MockDashboardCard() {
  const bars = [60, 85, 45, 95, 70, 55, 88, 40]
  const barColors = ['#ffc300', '#ffd60a', '#1e96fc', '#ffc300']

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}>
      <div
        className="p-6 space-y-5 animate-float rounded-2xl"
        style={{
          background: '#001d3d',
          border: '1px solid rgba(255,195,0,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.40)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Active Session
            </p>
            <h3 className="text-base font-bold mt-0.5" style={{ color: '#ffffff' }}>
              Q1 Strategy Kickoff
            </h3>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: '#ffc300', color: '#000814' }}>
            <Radio className="w-3 h-3 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wide">Live</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Responses', value: '47', bg: '#ffc300', text: '#000814' },
            { label: 'Engagement', value: '92%', bg: '#003566', text: '#ffc300' },
            { label: 'Audience', value: '52', bg: 'rgba(255,255,255,0.08)', text: '#ffffff' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.bg, border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-lg font-bold" style={{ color: s.text }}>
                {s.value}
              </p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: s.text, opacity: 0.75 }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold" style={{ color: '#ffffff' }}>
              Response Distribution
            </p>
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
                <p className="text-xs font-semibold" style={{ color: '#ffffff' }}>
                  {item.q}
                </p>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
                  {item.type}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold" style={{ color: '#ffc300' }}>
                <Users className="w-3 h-3" />
                {item.resp}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: 'rgba(255,195,0,0.08)', border: '1px solid rgba(255,195,0,0.20)' }}>
          <div>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
              Join with code
            </p>
            <p className="text-lg font-bold tracking-widest" style={{ color: '#ffc300' }}>
              LZ-7A29
            </p>
          </div>
          <CheckCircle2 className="w-5 h-5" style={{ color: '#ffc300' }} />
        </div>
      </div>
    </motion.div>
  )
}

export default function HeroSection() {
  const featurePills = [
    { label: 'Live polls', icon: Radio, bg: 'rgba(255,195,0,0.15)', text: '#ffc300', border: 'rgba(255,195,0,0.30)' },
    { label: 'Quizzes', icon: Trophy, bg: 'rgba(255,214,10,0.12)', text: '#ffd60a', border: 'rgba(255,214,10,0.25)' },
    { label: 'Word clouds', icon: Cloud, bg: 'rgba(30,150,252,0.12)', text: '#1e96fc', border: 'rgba(30,150,252,0.25)' },
    { label: 'Q&A', icon: MessageSquare, bg: 'rgba(255,195,0,0.10)', text: '#ffc300', border: 'rgba(255,195,0,0.20)' },
  ]

  return (
    <section
      className="relative min-h-[90vh] flex items-center pt-10 pb-20 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #000814 0%, #001d3d 60%, #000814 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 60% 40%, rgba(255,195,0,0.06) 0%, transparent 70%)' }}
      />

      <div className="section-container w-full relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6 pt-4"
          >
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <span
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(255,195,0,0.12)', color: '#ffc300', border: '1px solid rgba(255,195,0,0.25)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-yellow animate-pulse" />
                Live audience engagement - reimagined
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl sm:text-5xl"
              style={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#ffffff' }}
            >
              Turn every session into a <span className="gradient-text">live, interactive</span> experience.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-base sm:text-lg leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '34rem' }}
            >
              Build multi-question sessions in minutes. Audiences join from any phone or laptop - no app needed - and you
              see live responses instantly.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <Link href="/register" className="btn-primary text-base px-7 py-3.5 text-center">
                Start for free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/join" className="btn-ghost text-base px-7 py-3.5 text-center">
                Join a LiveZapp now
              </Link>
            </motion.div>

            <TrustStrip />
            <JoinCodeCard />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center gap-2"
            >
              {featurePills.map(feat => (
                <span
                  key={feat.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: feat.bg, color: feat.text, border: `1px solid ${feat.border}` }}
                >
                  <feat.icon className="w-3.5 h-3.5" />
                  {feat.label}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <div className="hidden lg:block">
            <MockDashboardCard />
          </div>
        </div>
      </div>
    </section>
  )
}
