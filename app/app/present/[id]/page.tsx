'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Play, Square, Users, Copy,
  CheckCircle2, AlertCircle, Sparkles, BarChart3, Cloud,
  MessageSquare, Star, ChevronLeft, ChevronRight, Radio,
  Maximize2, Minimize2, Pause, Globe,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '@/lib/hooks/useAuth'
import { rtdb } from '@/lib/firebase'
import { PresentationService } from '@/lib/services/PresentationService'
import { QuestionService } from '@/lib/services/QuestionService'
import { LiveSessionService, LiveSessionData, ParticipantResponse } from '@/lib/services/LiveSessionService'
import { BrandingService } from '@/lib/services/BrandingService'
import ShareJoinLink from '@/components/ShareJoinLink'
import { generateJoinCode } from '@/types/join'
import type {
  Presentation, Question, QuizQuestion, PollQuestion,
  FeedbackQuestion, QAQuestion, WordCloudQuestion,
} from '@/types/domain'

// ─── Helpers ──────────────────────────────────────────────────────────────

const KIND_COLOR: Record<string, string> = {
  quiz:       '#00A6A6',
  poll:       '#F08700',
  word_cloud: '#EFCA08',
  qa:         '#00A6A6',
  feedback:   '#F49F0A',
}

const KIND_TEXT_COLOR: Record<string, string> = {
  quiz:       '#FFFFFF',
  poll:       '#FFFFFF',
  word_cloud: '#111111',
  qa:         '#FFFFFF',
  feedback:   '#111111',
}

const KIND_ICON: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  quiz:       Sparkles,
  poll:       BarChart3,
  word_cloud: Cloud,
  qa:         MessageSquare,
  feedback:   Star,
}

// ─── Dashboard-mode BarChart ──────────────────────────────────────────────

function BarChart({ options, responses, kindColor }: {
  options: { id: string; label: string }[]
  responses: Record<string, ParticipantResponse>
  kindColor?: string
}) {
  const barColor = kindColor ?? '#00A6A6'
  const counts: Record<string, number> = {}
  options.forEach(o => { counts[o.id] = 0 })
  Object.values(responses).forEach(r => {
    const ans = r.answer
    if (Array.isArray(ans)) {
      ans.forEach(a => { if (counts[a] !== undefined) counts[a]++ })
    } else if (typeof ans === 'string' && counts[ans] !== undefined) {
      counts[ans]++
    }
  })
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const max = Math.max(...Object.values(counts), 1)
  return (
    <div className="space-y-3 mt-4">
      {options.map((opt, i) => {
        const count = counts[opt.id] ?? 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        const barPct = Math.round((count / max) * 100)
        return (
          <div key={opt.id} className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="font-semibold" style={{ color: '#1A1A2E', fontSize: '0.95rem' }}>
                <span className="mr-2 font-black" style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>{String.fromCharCode(65 + i)}</span>
                {opt.label}
              </span>
              <span className="font-black tabular-nums" style={{ color: barColor, fontSize: '1.1rem' }}>
                {count}<span className="font-medium ml-1" style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>({pct}%)</span>
              </span>
            </div>
            <div className="h-10 rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
              <motion.div
                className="h-full rounded-xl flex items-center px-4"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(barPct, count > 0 ? 6 : 0)}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                style={{ background: barColor }}
              >
                {barPct > 18 && <span className="font-black text-white text-sm">{pct}%</span>}
              </motion.div>
            </div>
          </div>
        )
      })}
      <p className="text-xs text-right pt-1 font-medium" style={{ color: '#9CA3AF' }}>
        {total} response{total !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

const CLOUD_COLORS = ['#00A6A6','#F08700','#EFCA08','#F49F0A','#E11D48','#7C3AED','#059669','#2563EB']

function WordCloudDisplay({ responses, dark = false }: { responses: Record<string, ParticipantResponse>; dark?: boolean }) {
  const wordMap: Record<string, number> = {}
  Object.values(responses).forEach(r => {
    const ans = r.answer
    const words = Array.isArray(ans) ? ans : [String(ans)]
    words.forEach(w => {
      const clean = w.trim().toLowerCase()
      if (clean) wordMap[clean] = (wordMap[clean] ?? 0) + 1
    })
  })
  const sorted = Object.entries(wordMap).sort(([, a], [, b]) => b - a).slice(0, 30)
  const maxCount = sorted[0]?.[1] ?? 1
  if (sorted.length === 0) {
    return <p className="text-sm text-center py-8" style={{ color: dark ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}>No words submitted yet</p>
  }
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3 mt-4 items-baseline justify-center">
      {sorted.map(([word, count], idx) => {
        const ratio = count / maxCount
        const fontSize = dark
          ? Math.round(28 + ratio * 72)   // 28–100 px for projector
          : Math.round(20 + ratio * 44)   // 20–64 px for dashboard
        const color = CLOUD_COLORS[idx % CLOUD_COLORS.length]
        return (
          <span key={word} className="font-black leading-none inline-flex items-start gap-0.5">
            <span style={{ fontSize, color, lineHeight: 1.1 }}>{word}</span>
            <sup style={{ fontSize: Math.max(11, Math.round(fontSize * 0.32)), color, fontWeight: 800, opacity: 0.75, lineHeight: 1, marginTop: '0.15em' }}>
              {count}
            </sup>
          </span>
        )
      })}
    </div>
  )
}

function QADisplay({ responses, dark = false }: { responses: Record<string, ParticipantResponse>; dark?: boolean }) {
  const entries = Object.values(responses).map(r => String(r.answer)).filter(Boolean)
  if (entries.length === 0) {
    return <p className="text-sm text-center py-8" style={{ color: dark ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}>No responses yet</p>
  }
  return (
    <div className="space-y-2.5 mt-4 max-h-80 overflow-y-auto scrollbar-hide">
      {entries.map((text, i) => (
        <div
          key={i}
          className="px-4 py-3.5 rounded-2xl font-medium"
          style={{
            background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,166,166,0.07)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,166,166,0.18)'}`,
            color: dark ? '#EEF2F7' : '#1A1A2E',
            fontSize: dark ? '1.1rem' : '1rem',
          }}
        >
          {text}
        </div>
      ))}
    </div>
  )
}

function RatingDisplay({ responses, max, dark = false }: { responses: Record<string, ParticipantResponse>; max: number; dark?: boolean }) {
  const values = Object.values(responses).map(r => Number(r.answer)).filter(n => !isNaN(n) && n > 0)
  const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '—'
  const counts = Array.from({ length: max }, (_, i) => values.filter(v => v === i + 1).length)
  return (
    <div className="mt-4 space-y-3">
      <div className="text-center">
        <p className="font-black" style={{ fontSize: dark ? '6rem' : '3rem', color: '#EFCA08', lineHeight: 1 }}>{avg}</p>
        <p className="text-xs mt-1" style={{ color: dark ? 'rgba(255,255,255,0.40)' : '#9CA3AF' }}>avg / {max} · {values.length} response{values.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="flex gap-1 items-end h-16">
        {counts.map((c, i) => {
          const maxC = Math.max(...counts, 1)
          const h = Math.round((c / maxC) * 100)
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div className="w-full rounded-t-md" initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.5 }} style={{ background: 'rgba(239,202,8,0.50)', minHeight: c > 0 ? 4 : 0 }} />
              <span className="text-[9px]" style={{ color: dark ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}>{i + 1}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ResponsePanel({ question, responses }: { question: Question; responses: Record<string, ParticipantResponse> }) {
  const total = Object.keys(responses).length
  const kindColor = KIND_COLOR[question.kind] ?? '#00A6A6'
  return (
    <div className="rounded-2xl p-5" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Live responses</p>
        <span className="text-base font-black px-2.5 py-0.5 rounded-lg" style={{ color: '#FFFFFF', background: '#00A6A6' }}>{total}</span>
      </div>
      {question.kind === 'quiz' && <BarChart options={(question as QuizQuestion).options} responses={responses} kindColor={kindColor} />}
      {question.kind === 'poll' && <BarChart options={(question as PollQuestion).options} responses={responses} kindColor={kindColor} />}
      {question.kind === 'word_cloud' && <WordCloudDisplay responses={responses} />}
      {question.kind === 'qa' && <QADisplay responses={responses} />}
      {question.kind === 'feedback' && (
        (question as FeedbackQuestion).feedbackType === 'rating'
          ? <RatingDisplay responses={responses} max={(question as FeedbackQuestion).scaleMax ?? 5} />
          : (question as FeedbackQuestion).feedbackType === 'multiple_choice'
          ? <BarChart options={(question as FeedbackQuestion).options ?? []} responses={responses} kindColor={kindColor} />
          : <QADisplay responses={responses} />
      )}
    </div>
  )
}

// ─── QR panel (dashboard mode) ────────────────────────────────────────────

function QRPanel({ joinCode }: { joinCode: string }) {
  const [lanIp, setLanIp] = useState<string | null>(null)
  const prodOrigin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.livezapp.com'
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const isProduction = !isLocalhost && typeof window !== 'undefined'
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : prodOrigin
  const port = typeof window !== 'undefined' ? window.location.port : ''
  useEffect(() => {
    if (!isLocalhost) return
    fetch('/api/local-ip').then(r => r.json()).then(d => setLanIp(d.ip ?? null)).catch(() => {})
  }, [isLocalhost])
  const primaryUrl = isProduction
    ? `${prodOrigin}/join/${joinCode}`
    : lanIp
    ? `http://${lanIp}${port ? `:${port}` : ''}/join/${joinCode}`
    : `${currentOrigin}/join/${joinCode}`
  const localhostUrl = isLocalhost ? `${currentOrigin}/join/${joinCode}` : null
  return (
    <div className="space-y-3 text-center">
      <div className="p-3 rounded-2xl inline-block" style={{ background: '#fff' }}>
        <QRCodeSVG value={primaryUrl} size={120} bgColor="#ffffff" fgColor="#111111" level="M" />
      </div>
      <div className="space-y-1">
        {isLocalhost && lanIp && <div><p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: '#9CA3AF' }}>Network</p><p className="text-xs font-mono font-bold break-all" style={{ color: '#00A6A6' }}>http://{lanIp}{port ? `:${port}` : ''}/join/{joinCode}</p></div>}
        {localhostUrl && <div><p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: '#9CA3AF' }}>Localhost</p><p className="text-[10px] font-mono break-all" style={{ color: '#6B7280' }}>{localhostUrl}</p></div>}
        {!isLocalhost && <p className="text-[10px] font-mono break-all" style={{ color: '#6B7280' }}>livezapp.com/join/{joinCode}</p>}
      </div>
    </div>
  )
}

// ─── Fullscreen: Join/QR slide ────────────────────────────────────────────

function JoinSlide({ joinCode, onStart, brandLogoUrl, brandName }: { joinCode: string; onStart: () => void; brandLogoUrl?: string; brandName?: string }) {
  const prodOrigin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.livezapp.com'
  const [lanIp, setLanIp] = useState<string | null>(null)
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const port = typeof window !== 'undefined' ? window.location.port : ''
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : prodOrigin
  // On localhost use LAN IP (so phones on same Wi-Fi can scan); in production use real domain
  const isProduction = !isLocalhost && typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
  useEffect(() => {
    if (!isLocalhost) return
    fetch('/api/local-ip').then(r => r.json()).then(d => setLanIp(d.ip ?? null)).catch(() => {})
  }, [isLocalhost])
  const qrUrl = isProduction
    ? `${prodOrigin}/join/${joinCode}`
    : lanIp
    ? `http://${lanIp}${port ? `:${port}` : ''}/join/${joinCode}`
    : `${currentOrigin}/join/${joinCode}`
  const displayUrl = isProduction
    ? `livezapp.com/join/${joinCode}`
    : lanIp
    ? `${lanIp}${port ? `:${port}` : ''}/join/${joinCode}`
    : `livezapp.com/join/${joinCode}`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4 }}
      className="h-full flex flex-col items-center justify-center px-12 gap-10"
    >
      {/* Brand logo — host's logo if set, else LiveZapp default */}
      <div className="flex flex-col items-center gap-2">
        {brandLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brandLogoUrl} alt={brandName || 'Brand logo'} className="h-16 w-auto object-contain max-w-xs" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }} />
        ) : (
          <Image src="/LiveZapp Logo w_text.png" alt="LiveZapp" width={260} height={80} className="h-16 w-auto object-contain brightness-0 invert" priority />
        )}
        {brandName && brandLogoUrl && (
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>{brandName}</p>
        )}
      </div>

      {/* QR + code side by side */}
      <div className="flex items-center gap-16">
        {/* QR code */}
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-3xl" style={{ background: '#FFFFFF' }}>
            <QRCodeSVG value={qrUrl} size={220} bgColor="#ffffff" fgColor="#0D1117" level="H" />
          </div>
          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Scan to join</p>
        </div>

        {/* Divider */}
        <div className="flex flex-col items-center gap-3" style={{ color: 'rgba(255,255,255,0.20)' }}>
          <div className="w-px h-16" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.30)' }}>or</span>
          <div className="w-px h-16" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Code + URL */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] mb-2" style={{ color: 'rgba(255,255,255,0.40)' }}>Session code</p>
            <p className="font-black tracking-[0.18em]" style={{ fontSize: '4.5rem', color: '#FFFFFF', lineHeight: 1, letterSpacing: '0.12em' }}>
              {joinCode}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] mb-2" style={{ color: 'rgba(255,255,255,0.40)' }}>Go to</p>
            <p className="font-bold" style={{ fontSize: '1.35rem', color: '#00A6A6' }}>
              livezapp.com/live
            </p>
            <p className="text-sm mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{displayUrl}</p>
          </div>
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        className="flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-lg transition-all"
        style={{ background: '#00A6A6', color: '#FFFFFF', boxShadow: '0 0 40px rgba(0,166,166,0.35)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#008A8A' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#00A6A6' }}
      >
        <Play className="w-5 h-5" fill="currentColor" />
        Start presentation
      </button>
    </motion.div>
  )
}

// ─── Fullscreen: Question slide ───────────────────────────────────────────

function QuestionSlide({
  question, responses, slideNum, total,
}: {
  question: Question
  responses: Record<string, ParticipantResponse>
  slideNum: number
  total: number
}) {
  const hasResponses = Object.keys(responses).length > 0
  const kindColor = KIND_COLOR[question.kind] ?? '#00A6A6'
  const kindTextColor = KIND_TEXT_COLOR[question.kind] ?? '#FFFFFF'
  const KindIcon = KIND_ICON[question.kind] ?? Sparkles
  const responseCount = Object.keys(responses).length

  return (
    <AnimatePresence mode="wait">
      {!hasResponses ? (
        /* ── Waiting phase: question centered large ── */
        <motion.div
          key="waiting"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.4 }}
          className="h-full flex flex-col items-center justify-center px-16 text-center"
        >
          <div className="flex items-center gap-3 mb-10">
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ background: kindColor }}>
              <KindIcon className="w-4 h-4" style={{ color: kindTextColor }} />
              <span className="text-sm font-black uppercase tracking-widest" style={{ color: kindTextColor }}>
                {question.kind.replace('_', ' ')}
              </span>
            </div>
            <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {slideNum} / {total}
            </span>
          </div>

          <h2
            className="max-w-5xl"
            style={{
              fontSize: 'clamp(2.4rem, 5vw, 5rem)',
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            {question.prompt || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>No prompt set</span>}
          </h2>

          {/* Options preview for quiz/poll */}
          {(question.kind === 'quiz' || question.kind === 'poll') && (
            <div className="grid grid-cols-2 gap-4 mt-12 max-w-4xl w-full">
              {(question as QuizQuestion | PollQuestion).options.map((opt, i) => (
                <div
                  key={opt.id}
                  className="flex items-center gap-4 px-6 py-4 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <span className="text-sm font-black w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{opt.label}</span>
                </div>
              ))}
            </div>
          )}

          <motion.div
            className="flex items-center gap-2.5 mt-14"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ background: 'rgba(255,255,255,0.40)' }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
            <span className="text-sm ml-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Waiting for responses…
            </span>
          </motion.div>
        </motion.div>
      ) : (
        /* ── Response phase: question at top, visualisation fills centre ── */
        <motion.div
          key="responding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="h-full flex flex-col"
        >
          {/* Question header band */}
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="px-10 py-5 shrink-0"
            style={{ borderBottom: `1px solid ${kindColor}35`, background: `${kindColor}18` }}
          >
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl shrink-0" style={{ background: kindColor }}>
                  <KindIcon className="w-3.5 h-3.5" style={{ color: kindTextColor }} />
                  <span className="text-xs font-black uppercase tracking-widest" style={{ color: kindTextColor }}>
                    {question.kind.replace('_', ' ')}
                  </span>
                </div>
                <h2
                  className="truncate"
                  style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.9rem)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}
                >
                  {question.prompt}
                </h2>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span style={{ color: 'rgba(255,255,255,0.40)', fontSize: '0.9rem' }}>{slideNum} / {total}</span>
                <span className="font-black text-xl px-3 py-1 rounded-xl" style={{ color: '#FFFFFF', background: kindColor }}>
                  {responseCount}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Response visualisation — fills remaining space */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex-1 px-10 py-8 overflow-y-auto scrollbar-hide"
          >
            {question.kind === 'quiz' && (
              <ProjectorBarChart options={(question as QuizQuestion).options} responses={responses} kindColor={kindColor} />
            )}
            {question.kind === 'poll' && (
              <ProjectorBarChart options={(question as PollQuestion).options} responses={responses} kindColor={kindColor} />
            )}
            {question.kind === 'word_cloud' && <WordCloudDisplay responses={responses} dark />}
            {question.kind === 'qa' && <QADisplay responses={responses} dark />}
            {question.kind === 'feedback' && (
              (question as FeedbackQuestion).feedbackType === 'rating'
                ? <RatingDisplay responses={responses} max={(question as FeedbackQuestion).scaleMax ?? 5} dark />
                : (question as FeedbackQuestion).feedbackType === 'multiple_choice'
                ? <ProjectorBarChart options={(question as FeedbackQuestion).options ?? []} responses={responses} kindColor={kindColor} />
                : <QADisplay responses={responses} dark />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Projector-scale bar chart (fullscreen only) ──────────────────────────

function ProjectorBarChart({ options, responses, kindColor }: {
  options: { id: string; label: string }[]
  responses: Record<string, ParticipantResponse>
  kindColor: string
}) {
  const counts: Record<string, number> = {}
  options.forEach(o => { counts[o.id] = 0 })
  Object.values(responses).forEach(r => {
    const ans = r.answer
    if (Array.isArray(ans)) ans.forEach(a => { if (counts[a] !== undefined) counts[a]++ })
    else if (typeof ans === 'string' && counts[ans] !== undefined) counts[ans]++
  })
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const max = Math.max(...Object.values(counts), 1)

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {options.map((opt, i) => {
        const count = counts[opt.id] ?? 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        const barPct = Math.round((count / max) * 100)
        return (
          <div key={opt.id} className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="font-bold" style={{ color: 'rgba(255,255,255,0.80)', fontSize: '1.4rem' }}>
                <span className="mr-3 font-black" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '1.1rem' }}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt.label}
              </span>
              <span className="font-black tabular-nums" style={{ color: kindColor, fontSize: '2rem' }}>
                {count}
                <span className="font-medium ml-2" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '1rem' }}>({pct}%)</span>
              </span>
            </div>
            <div className="h-14 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <motion.div
                className="h-full rounded-2xl flex items-center px-5"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(barPct, count > 0 ? 4 : 0)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ background: kindColor }}
              >
                {barPct > 15 && (
                  <span className="font-black text-white text-xl">{pct}%</span>
                )}
              </motion.div>
            </div>
          </div>
        )
      })}
      <p className="text-sm text-right font-medium" style={{ color: 'rgba(255,255,255,0.30)' }}>
        {total} response{total !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

// ─── Main presenter page ───────────────────────────────────────────────────

export default function PresentPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [session, setSession] = useState<LiveSessionData | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [participantCount, setParticipantCount] = useState(0)
  const [responses, setResponses] = useState<Record<string, ParticipantResponse>>({})
  const [codeCopied, setCodeCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showJoinSlide, setShowJoinSlide] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const presenterRef = useRef<HTMLDivElement>(null)

  // Fullscreen handlers
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      setShowJoinSlide(true)   // always start at join slide
      presenterRef.current?.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Keyboard navigation in fullscreen
  useEffect(() => {
    if (!isFullscreen || !session) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        if (showJoinSlide) { setShowJoinSlide(false); return }
        if (currentIndex < questions.length - 1) navigateTo(currentIndex + 1)
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (!showJoinSlide && currentIndex > 0) navigateTo(currentIndex - 1)
        else if (!showJoinSlide) setShowJoinSlide(true)
      }
      if (e.key === 'Escape') {
        document.exitFullscreen().catch(() => {})
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen, session, showJoinSlide, currentIndex, questions.length])

  // Load presentation + questions
  useEffect(() => {
    if (!id || !user) return
    ;(async () => {
      try {
        const pres = await PresentationService.getPresentation(id)
        if (!pres) { setError('Presentation not found'); return }
        setPresentation(pres)
        const qs = await QuestionService.getQuestionSet(id)
        if (qs?.questions?.length) setQuestions(qs.questions)
        if (pres.joinCode && pres.status === 'live') {
          const existing = await LiveSessionService.getSession(pres.joinCode)
          if (existing?.isActive) {
            setSession(existing)
            setCurrentIndex(existing.currentQuestionIndex)
            setIsPaused(existing.isPaused ?? false)
          }
        }
      } catch {
        setError('Failed to load presentation')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [id, user])

  // Subscribe to session
  useEffect(() => {
    if (!session) return
    const unsub = LiveSessionService.subscribeToSession(session.joinCode, data => {
      if (data) {
        setSession(data)
        setCurrentIndex(data.currentQuestionIndex)
        setIsPaused(data.isPaused ?? false)
      }
    })
    const unsubP = LiveSessionService.subscribeToParticipants(session.joinCode, setParticipantCount)
    return () => { unsub(); unsubP() }
  }, [session?.joinCode])

  // Subscribe to current question responses
  useEffect(() => {
    if (!session || !questions[currentIndex]) return
    setResponses({})
    const qId = questions[currentIndex].id
    const unsub = LiveSessionService.subscribeToResponses(session.joinCode, qId, setResponses)
    return unsub
  }, [session?.joinCode, currentIndex, questions])

  const handleGoLive = async () => {
    if (!presentation || !user || questions.length === 0) return
    setIsStarting(true)
    try {
      // Generate a unique join code (async to check uniqueness)
      const joinCode = await generateJoinCode(6, rtdb)
      // Fetch branding so logo appears on the join screen
      const branding = await BrandingService.getBranding(user.id).catch(() => null)
      await LiveSessionService.startSession({
        presentationId: id,
        hostId: user.id,
        joinCode,
        title: presentation.title,
        questions,
        brandLogoUrl: branding?.logoUrl || undefined,
        brandName:    branding?.brandName || undefined,
      })
      const newSession = await LiveSessionService.getSession(joinCode)
      if (newSession) { setSession(newSession); setCurrentIndex(0) }
    } catch (e: any) {
      setError(e.message || 'Failed to start session')
    } finally {
      setIsStarting(false)
    }
  }

  const handleEndSession = async () => {
    if (!session || !presentation) return
    if (!confirm('End this session? Participants will be disconnected.')) return
    setIsEnding(true)
    try {
      await LiveSessionService.endSession(session.joinCode, id)
      setSession(null)
      router.push('/app/dashboard')
    } catch (e: any) {
      setError(e.message || 'Failed to end session')
    } finally {
      setIsEnding(false)
    }
  }

  const navigateTo = useCallback(async (index: number) => {
    if (!session || index < 0 || index >= questions.length) return
    setCurrentIndex(index)
    setResponses({})
    // If presenter hasn't started yet (non-fullscreen path), mark as started now
    if (!session.hasStarted) {
      await LiveSessionService.startPresentation(session.joinCode)
    }
    await LiveSessionService.setCurrentQuestion(session.joinCode, index)
  }, [session, questions.length])

  const handlePause = async () => {
    if (!session) return
    await LiveSessionService.pauseSession(session.joinCode)
    setIsPaused(true)
  }

  const handleResume = async () => {
    if (!session) return
    await LiveSessionService.resumeSession(session.joinCode)
    setIsPaused(false)
  }

  const copyCode = () => {
    if (!session) return
    navigator.clipboard.writeText(session.joinCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const handleSlideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!session) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const isRightHalf = clickX > rect.width / 2
    if (isRightHalf) {
      if (showJoinSlide) { setShowJoinSlide(false); return }
      if (currentIndex < questions.length - 1) navigateTo(currentIndex + 1)
    } else {
      if (!showJoinSlide && currentIndex > 0) navigateTo(currentIndex - 1)
      else if (!showJoinSlide) setShowJoinSlide(true)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(0,166,166,0.20)', borderTopColor: '#00A6A6' }} />
        <p className="text-sm" style={{ color: '#9CA3AF' }}>Loading presenter view…</p>
      </div>
    )
  }

  if (error || !presentation) {
    return (
      <div className="glass-card p-12 text-center space-y-4 max-w-lg mx-auto mt-12">
        <AlertCircle className="w-10 h-10 mx-auto" style={{ color: '#F08700' }} />
        <h2 className="text-xl font-bold" style={{ color: '#111111' }}>{error ?? 'Something went wrong'}</h2>
        <Link href="/app/dashboard" className="btn-primary inline-flex">Back to Dashboard</Link>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const kindColor = currentQuestion ? (KIND_COLOR[currentQuestion.kind] ?? '#00A6A6') : '#00A6A6'
  const kindTextColor = currentQuestion ? (KIND_TEXT_COLOR[currentQuestion.kind] ?? '#FFFFFF') : '#FFFFFF'
  const KindIcon = currentQuestion ? (KIND_ICON[currentQuestion.kind] ?? Sparkles) : Sparkles

  // ── Pre-live setup ─────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="max-w-2xl mx-auto pb-16 space-y-6">
        <Link href={`/app/create/${id}`} className="inline-flex items-center gap-2 text-sm transition-colors" style={{ color: '#9CA3AF' }} onMouseEnter={e => (e.currentTarget.style.color = '#374151')} onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}>
          <ArrowLeft className="w-4 h-4" /> Back to builder
        </Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: '#9CA3AF' }}>Presenter view</p>
          <h1 className="font-display text-3xl font-bold" style={{ color: '#111111' }}>
            Launch <span style={{ color: '#00A6A6' }}>{presentation.title}</span>
          </h1>
          <p className="text-sm mt-2" style={{ color: '#6B7280' }}>{questions.length} question{questions.length !== 1 ? 's' : ''} ready</p>
        </div>
        {questions.length === 0 && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(244,159,10,0.10)', border: '1px solid rgba(244,159,10,0.25)', color: '#F49F0A' }}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            You haven&apos;t added any questions yet.{' '}
            <Link href={`/app/create/${id}`} className="underline">Go back to the builder</Link> to add some.
          </div>
        )}
        {questions.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Questions</p>
            </div>
            {questions.map((q, i) => {
              const Icon = KIND_ICON[q.kind] ?? Sparkles
              const color = KIND_COLOR[q.kind] ?? '#00A6A6'
              return (
                <div key={q.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <span className="text-[10px] font-black w-5 text-center" style={{ color: '#9CA3AF' }}>{i + 1}</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <p className="text-sm truncate flex-1" style={{ color: '#374151' }}>{q.prompt || <span style={{ color: '#9CA3AF' }} className="italic">No prompt</span>}</p>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0" style={{ background: `${color}14`, color, border: `1px solid ${color}25` }}>
                    {q.kind.replace('_', ' ')}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={handleGoLive} disabled={isStarting || questions.length === 0} className="btn-live text-base px-8 py-3.5 font-bold disabled:opacity-40 disabled:cursor-not-allowed">
            {isStarting ? (
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />Starting…</span>
            ) : (
              <><Radio className="w-5 h-5" />Go Live</>
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── Fullscreen slideshow ───────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <div
        ref={presenterRef}
        className="fixed inset-0 z-50 flex flex-col select-none"
        style={{ background: '#0D1117' }}
      >
        {/* ── Top control bar ── */}
        <div
          className="flex items-center justify-between px-6 py-3 shrink-0 z-10"
          style={{ background: 'rgba(0,0,0,0.55)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
        >
          {/* Left: LIVE + participants */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: '#F08700' }}>
              <span className="live-dot" />
              <span className="text-sm font-black uppercase tracking-widest text-white">Live</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <Users className="w-4 h-4" />
              <span className="font-black text-white">{participantCount}</span>
              <span className="text-sm">joined</span>
            </div>
          </div>

          {/* Center: Code + URL */}
          <div className="flex items-center gap-3">
            <button
              onClick={copyCode}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Code</span>
              <span className="font-black tracking-[0.15em] text-white">{session.joinCode}</span>
              {codeCopied
                ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
                : <Copy className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
              }
            </button>
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,166,166,0.15)', border: '1px solid rgba(0,166,166,0.25)' }}>
              <Globe className="w-3.5 h-3.5" style={{ color: '#00A6A6' }} />
              <span className="text-sm font-semibold" style={{ color: '#00A6A6' }}>livezapp.com/live</span>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            {session && (
              <ShareJoinLink
                joinCode={session.joinCode}
                presenterName={user?.name || 'Presenter'}
                sessionTitle={presentation?.title || 'Session'}
              />
            )}
            <button
              onClick={isPaused ? handleResume : handlePause}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all"
              style={{
                background: isPaused ? 'rgba(0,166,166,0.20)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${isPaused ? 'rgba(0,166,166,0.40)' : 'rgba(255,255,255,0.12)'}`,
                color: isPaused ? '#00A6A6' : 'rgba(255,255,255,0.75)',
              }}
            >
              {isPaused ? <Play className="w-4 h-4" fill="currentColor" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}
            >
              <Minimize2 className="w-4 h-4" />
              Exit
            </button>
            <button
              onClick={handleEndSession}
              disabled={isEnding}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
              style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.30)', color: '#F87171' }}
            >
              <Square className="w-4 h-4" />
              End session
            </button>
          </div>
        </div>

        {/* ── Slide area ── */}
        <div
          className="flex-1 relative overflow-hidden cursor-pointer"
          onClick={handleSlideClick}
        >
          <AnimatePresence mode="wait">
            {showJoinSlide ? (
              <motion.div key="join" className="absolute inset-0" onClick={e => e.stopPropagation()}>
                <JoinSlide
                  joinCode={session.joinCode}
                  brandLogoUrl={session.brandLogoUrl}
                  brandName={session.brandName}
                  onStart={async () => {
                    setShowJoinSlide(false)
                    await LiveSessionService.startPresentation(session.joinCode)
                  }}
                />
              </motion.div>
            ) : currentQuestion ? (
              <motion.div key={`q-${currentIndex}`} className="absolute inset-0">
                <QuestionSlide
                  question={currentQuestion}
                  responses={responses}
                  slideNum={currentIndex + 1}
                  total={questions.length}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Click zone hints (subtle arrows on hover) */}
          {!showJoinSlide && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-1/2 flex items-center justify-start pl-6 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                {currentIndex > 0 && <ChevronLeft className="w-12 h-12" style={{ color: 'rgba(255,255,255,0.25)' }} />}
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-end pr-6 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                {currentIndex < questions.length - 1 && <ChevronRight className="w-12 h-12" style={{ color: 'rgba(255,255,255,0.25)' }} />}
              </div>
            </>
          )}

          {/* Paused overlay */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center z-20"
                style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
                onClick={e => e.stopPropagation()}
              >
                <Pause className="w-20 h-20 mb-6" style={{ color: 'rgba(255,255,255,0.20)' }} />
                <p className="text-4xl font-black text-white mb-3">Session Paused</p>
                <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Participants see a waiting screen
                </p>
                <button
                  onClick={handleResume}
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg"
                  style={{ background: '#00A6A6', color: '#FFFFFF' }}
                >
                  <Play className="w-5 h-5" fill="currentColor" /> Resume session
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom navigation bar ── */}
        <div
          className="shrink-0 flex items-center justify-between px-8 py-3"
          style={{ background: 'rgba(0,0,0,0.40)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={() => {
              if (!showJoinSlide && currentIndex > 0) navigateTo(currentIndex - 1)
              else if (!showJoinSlide) setShowJoinSlide(true)
            }}
            disabled={showJoinSlide}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm disabled:opacity-30 transition-all"
            style={{ color: 'rgba(255,255,255,0.60)', background: 'rgba(255,255,255,0.06)' }}
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          {/* Slide dots */}
          <div className="flex items-center gap-2">
            {/* Join slide dot */}
            <button
              onClick={() => setShowJoinSlide(true)}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: showJoinSlide ? '#00A6A6' : 'rgba(255,255,255,0.20)', transform: showJoinSlide ? 'scale(1.4)' : 'scale(1)' }}
              title="Join slide"
            />
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => { setShowJoinSlide(false); navigateTo(i) }}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: !showJoinSlide && i === currentIndex ? '#00A6A6' : 'rgba(255,255,255,0.20)',
                  transform: !showJoinSlide && i === currentIndex ? 'scale(1.4)' : 'scale(1)',
                }}
                title={`Question ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={() => {
              if (showJoinSlide) { setShowJoinSlide(false); return }
              if (currentIndex < questions.length - 1) navigateTo(currentIndex + 1)
            }}
            disabled={!showJoinSlide && currentIndex >= questions.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm disabled:opacity-30 transition-all"
            style={{ color: 'rgba(255,255,255,0.60)', background: 'rgba(255,255,255,0.06)' }}
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // ── Dashboard (non-fullscreen) live session ────────────────────────────
  return (
    <div ref={presenterRef} className="flex flex-col gap-5 h-[calc(100vh-90px)] -mt-4">

      {/* Top bar */}
      <div className="flex items-center justify-between shrink-0 px-4 py-3 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: '#F08700', border: '1px solid rgba(240,135,0,0.30)' }}>
            <span className="live-dot" />
            <span className="text-sm font-black uppercase tracking-widest text-white">Live</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: '#6B7280' }}>
            <Users className="w-4 h-4" />
            <span className="font-bold" style={{ color: '#111111' }}>{participantCount}</span>
            <span>joined</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl cursor-pointer" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }} onClick={copyCode}>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>Code</span>
            <span className="font-black tracking-widest text-sm" style={{ color: '#111111' }}>{session.joinCode}</span>
            {codeCopied ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#16A34A' }} /> : <Copy className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />}
          </div>
          {session && (
            <ShareJoinLink
              joinCode={session.joinCode}
              presenterName={user?.name || 'Presenter'}
              sessionTitle={presentation?.title || 'Session'}
            />
          )}
          <button onClick={isPaused ? handleResume : handlePause} className="btn-ghost text-sm" style={isPaused ? { color: '#00A6A6', borderColor: 'rgba(0,166,166,0.30)' } : {}}>
            {isPaused ? <Play className="w-4 h-4" fill="currentColor" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={toggleFullscreen} className="btn-ghost text-sm">
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
          <button onClick={handleEndSession} disabled={isEnding} className="btn-ghost text-sm disabled:opacity-40" style={{ color: '#DC2626', borderColor: 'rgba(220,38,38,0.25)' }}>
            <Square className="w-4 h-4" /> End session
          </button>
        </div>
      </div>

      {/* Content grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">

        {/* Question sidebar */}
        <div className="rounded-2xl overflow-y-auto scrollbar-hide" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Questions</p>
          </div>
          {questions.map((q, i) => {
            const Icon = KIND_ICON[q.kind] ?? Sparkles
            const color = KIND_COLOR[q.kind] ?? '#00A6A6'
            const isActive = i === currentIndex
            return (
              <button key={q.id} onClick={() => navigateTo(i)} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all" style={{ background: isActive ? 'rgba(0,166,166,0.07)' : 'transparent', borderLeft: isActive ? '3px solid #00A6A6' : '3px solid transparent', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <span className="text-[10px] font-black w-4 text-center shrink-0" style={{ color: '#9CA3AF' }}>{i + 1}</span>
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                  <Icon className="w-3 h-3" style={{ color }} />
                </div>
                <p className="text-xs truncate flex-1" style={{ color: isActive ? '#111111' : '#6B7280' }}>{q.prompt || '—'}</p>
              </button>
            )
          })}
        </div>

        {/* Main panel */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0 overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            {currentQuestion && (
              <motion.div key={currentQuestion.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest" style={{ background: kindColor, color: kindTextColor }}>
                    <KindIcon className="w-3 h-3" />
                    {currentQuestion.kind.replace('_', ' ')}
                  </div>
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>{currentIndex + 1} / {questions.length}</span>
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.02em', color: '#111111' }}>
                  {currentQuestion.prompt || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No prompt set</span>}
                </h2>
                {(currentQuestion.kind === 'quiz' || currentQuestion.kind === 'poll') && (
                  <div className="grid grid-cols-2 gap-2">
                    {(currentQuestion as QuizQuestion | PollQuestion).options.map((opt, i) => (
                      <div key={opt.id} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(0,0,0,0.03)', border: `1px solid ${currentQuestion.kind === 'quiz' && (currentQuestion as QuizQuestion).correctOptionId === opt.id ? 'rgba(22,163,74,0.35)' : 'rgba(0,0,0,0.08)'}` }}>
                        <span className="text-[10px] font-black" style={{ color: '#9CA3AF' }}>{String.fromCharCode(65 + i)}</span>
                        <span className="truncate" style={{ color: '#374151' }}>{opt.label}</span>
                        {currentQuestion.kind === 'quiz' && (currentQuestion as QuizQuestion).correctOptionId === opt.id && (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-auto" style={{ color: '#16A34A' }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {currentQuestion && <ResponsePanel question={currentQuestion} responses={responses} />}

          <div className="flex items-center justify-between">
            <button onClick={() => navigateTo(currentIndex - 1)} disabled={currentIndex === 0} className="btn-ghost text-sm disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            {currentIndex < questions.length - 1 ? (
              <button onClick={() => navigateTo(currentIndex + 1)} className="btn-primary text-sm">
                Next question <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleEndSession} disabled={isEnding} className="btn-live text-sm disabled:opacity-40">
                <Square className="w-4 h-4" /> End session
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
