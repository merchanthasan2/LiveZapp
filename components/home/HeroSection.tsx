'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Zap, BarChart3, Users, CheckCircle2, Radio } from 'lucide-react'

// Animated mock dashboard card shown in the Hero right column
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
      {/* Main card — white, clean, no dark fills */}
      <div className="relative glass-card p-6 space-y-5 animate-float">
        {/* Card header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-600 text-[#6B7280] uppercase tracking-wider">Active Session</p>
            <h3 className="text-base font-700 text-[#1A1A2E] mt-0.5">Q1 Strategy Kickoff</h3>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: '#F08700', color: '#FFFFFF' }}
          >
            <Radio className="w-3 h-3 animate-pulse" />
            <span className="text-xs font-700 uppercase tracking-wide">Live</span>
          </div>
        </div>

        {/* Stat mini-cards — solid brand fills with correct text contrast */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Responses',  value: '47',  bg: '#00A6A6', text: '#FFFFFF' },
            { label: 'Engagement', value: '92%', bg: '#EFCA08', text: '#1A1A2E' },
            { label: 'Audience',   value: '52',  bg: '#F49F0A', text: '#1A1A2E' },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-2xl p-3 text-center"
              style={{ background: stat.bg }}
            >
              <p className="text-lg font-bold" style={{ color: stat.text }}>{stat.value}</p>
              <p className="text-[10px] font-500 mt-0.5" style={{ color: stat.text, opacity: 0.75 }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
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

        {/* Question list */}
        <div className="space-y-2">
          {[
            { q: 'Rate this session so far', type: 'Poll',   resp: 47 },
            { q: 'What topic next?',          type: 'Choice', resp: 31 },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 border"
              style={{ borderColor: '#E5E7EB', background: '#F5F7FA' }}
            >
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

        {/* Session code */}
        <div
          className="flex items-center justify-between rounded-xl px-4 py-2.5 border"
          style={{ background: 'rgba(0,166,166,0.06)', borderColor: 'rgba(0,166,166,0.20)' }}
        >
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

export default function HeroSection() {
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
              style={{
                fontSize: '3rem',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: '#1A1A2E',
              }}
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

            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="flex flex-wrap items-center gap-2"
              aria-label="Features summary"
            >
              {[
                { label: 'Live polls',   bg: '#00A6A6', text: '#FFFFFF' },
                { label: 'Quizzes',      bg: '#EFCA08', text: '#1A1A2E' },
                { label: 'Word clouds',  bg: '#F49F0A', text: '#1A1A2E' },
                { label: 'Q&A',          bg: '#F08700', text: '#FFFFFF' },
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

          {/* Right: Mock Dashboard */}
          <div className="hidden lg:block">
            <MockDashboardCard />
          </div>
        </div>
      </div>
    </section>
  )
}
