'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Play, Square, Users, Copy,
  CheckCircle2, AlertCircle, Sparkles, BarChart3, Cloud,
  MessageSquare, Star, ChevronLeft, ChevronRight, Radio,
  Maximize2, Minimize2, Pause, Moon, Sun,
} from 'lucide-react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { rtdb } from '@/lib/firebase'
import { PresentationService } from '@/lib/services/PresentationService'
import { QuestionService } from '@/lib/services/QuestionService'
import { LiveSessionService, LiveSessionData, ParticipantResponse } from '@/lib/services/LiveSessionService'
import { BrandingService } from '@/lib/services/BrandingService'
import ShareJoinLink from '@/components/ShareJoinLink'
import BrandLockup from '@/components/BrandLockup'
import { generateJoinCode } from '@/types/join'
import type {
  Presentation, Question, QuizQuestion, PollQuestion,
  FeedbackQuestion, QAQuestion, WordCloudQuestion,
} from '@/types/domain'

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const KIND_COLOR: Record<string, string> = {
  quiz:       '#ffb19f',
  poll:       '#bda6ff',
  word_cloud: '#53d8d1',
  qa:         '#7f8fff',
  feedback:   '#d89bff',
}

const KIND_TEXT_COLOR: Record<string, string> = {
  quiz:       '#201719',
  poll:       '#22163b',
  word_cloud: '#102220',
  qa:         '#FFFFFF',
  feedback:   '#2a1437',
}

const KIND_ICON: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  quiz:       Sparkles,
  poll:       BarChart3,
  word_cloud: Cloud,
  qa:         MessageSquare,
  feedback:   Star,
}

// â”€â”€â”€ Dashboard-mode BarChart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function BarChart({ options, responses, kindColor, dark = false }: {
  options: { id: string; label: string }[]
  responses: Record<string, ParticipantResponse>
  kindColor?: string
  dark?: boolean
}) {
  const barColor = kindColor ?? '#53d8d1'
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
              <span className="font-semibold" style={{ color: dark ? 'rgba(255,255,255,0.88)' : '#1A1A2E', fontSize: '0.95rem' }}>
                <span className="mr-2 font-black" style={{ color: dark ? 'rgba(255,255,255,0.38)' : '#9CA3AF', fontSize: '0.8rem' }}>{String.fromCharCode(65 + i)}</span>
                {opt.label}
              </span>
              <span className="font-black tabular-nums" style={{ color: barColor, fontSize: '1.1rem' }}>
                {count}<span className="font-medium ml-1" style={{ color: dark ? 'rgba(255,255,255,0.38)' : '#9CA3AF', fontSize: '0.75rem' }}>({pct}%)</span>
              </span>
            </div>
            <div className="h-10 rounded-xl overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
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
      <p className="text-xs text-right pt-1 font-medium" style={{ color: dark ? 'rgba(255,255,255,0.38)' : '#9CA3AF' }}>
        {total} response{total !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

const CLOUD_COLORS = ['#c7b5ff', '#53d8d1', '#ffb19f', '#7f8fff', '#f49cff', '#8f63ff', '#72e0c5', '#f8b86a']

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
          ? Math.round(28 + ratio * 72)   // 28â€“100 px for projector
          : Math.round(20 + ratio * 44)   // 20â€“64 px for dashboard
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
            background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(101,12,217,0.05)',
            border: `1px solid ${dark ? 'rgba(191,168,255,0.16)' : 'rgba(101,12,217,0.14)'}`,
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
  const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 'â€”'
  const counts = Array.from({ length: max }, (_, i) => values.filter(v => v === i + 1).length)
  return (
    <div className="mt-4 space-y-3">
      <div className="text-center">
        <p className="font-black" style={{ fontSize: dark ? '6rem' : '3rem', color: '#c7b5ff', lineHeight: 1 }}>{avg}</p>
        <p className="text-xs mt-1" style={{ color: dark ? 'rgba(255,255,255,0.40)' : '#9CA3AF' }}>avg / {max} Â· {values.length} response{values.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="flex gap-1 items-end h-16">
        {counts.map((c, i) => {
          const maxC = Math.max(...counts, 1)
          const h = Math.round((c / maxC) * 100)
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div className="w-full rounded-t-md" initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.5 }} style={{ background: 'rgba(199,181,255,0.65)', minHeight: c > 0 ? 4 : 0 }} />
              <span className="text-[9px]" style={{ color: dark ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}>{i + 1}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ResponsePanel({ question, responses, dark = false }: { question: Question; responses: Record<string, ParticipantResponse>; dark?: boolean }) {
  const total = Object.keys(responses).length
  const kindColor = KIND_COLOR[question.kind] ?? '#53d8d1'
  return (
    <div className="rounded-[1.75rem] p-5" style={{ background: dark ? '#15151d' : '#FFFFFF', border: `1px solid ${dark ? 'rgba(191,168,255,0.16)' : 'rgba(0,0,0,0.07)'}`, boxShadow: dark ? '0 18px 40px rgba(0,0,0,0.24)' : '0 1px 3px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: dark ? 'rgba(255,255,255,0.40)' : '#9CA3AF' }}>Live responses</p>
        <span className="text-base font-black px-2.5 py-0.5 rounded-lg" style={{ color: dark ? '#17111f' : '#FFFFFF', background: kindColor }}>{total}</span>
      </div>
      {question.kind === 'quiz' && <BarChart options={(question as QuizQuestion).options} responses={responses} kindColor={kindColor} dark={dark} />}
      {question.kind === 'poll' && <BarChart options={(question as PollQuestion).options} responses={responses} kindColor={kindColor} dark={dark} />}
      {question.kind === 'word_cloud' && <WordCloudDisplay responses={responses} dark={dark} />}
      {question.kind === 'qa' && <QADisplay responses={responses} dark={dark} />}
      {question.kind === 'feedback' && (
        (question as FeedbackQuestion).feedbackType === 'rating'
          ? <RatingDisplay responses={responses} max={(question as FeedbackQuestion).scaleMax ?? 5} dark={dark} />
          : (question as FeedbackQuestion).feedbackType === 'multiple_choice'
          ? <BarChart options={(question as FeedbackQuestion).options ?? []} responses={responses} kindColor={kindColor} dark={dark} />
          : <QADisplay responses={responses} dark={dark} />
      )}
    </div>
  )
}

// â”€â”€â”€ QR panel (dashboard mode) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function QRPanel({ joinCode }: { joinCode: string }) {
  const [lanIp, setLanIp] = useState<string | null>(null)
  const prodOrigin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.live-zapp.com'
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
        {isLocalhost && lanIp && <div><p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: '#9CA3AF' }}>Network</p><p className="text-xs font-mono font-bold break-all" style={{ color: '#650cd9' }}>http://{lanIp}{port ? `:${port}` : ''}/join/{joinCode}</p></div>}
        {localhostUrl && <div><p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: '#9CA3AF' }}>Localhost</p><p className="text-[10px] font-mono break-all" style={{ color: '#6B7280' }}>{localhostUrl}</p></div>}
        {!isLocalhost && <p className="text-[10px] font-mono break-all" style={{ color: '#6B7280' }}>live-zapp.com/join/{joinCode}</p>}
      </div>
    </div>
  )
}

// â”€â”€â”€ Fullscreen: Join/QR slide â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function JoinSlide({ joinCode, onStart, brandLogoUrl, brandName }: { joinCode: string; onStart: () => void; brandLogoUrl?: string; brandName?: string }) {
  const prodOrigin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.live-zapp.com'
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
    ? `live-zapp.com/join/${joinCode}`
    : lanIp
    ? `${lanIp}${port ? `:${port}` : ''}/join/${joinCode}`
    : `live-zapp.com/join/${joinCode}`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4 }}
      className="h-full flex items-center justify-center px-4 md:px-8 py-6"
    >
      <div className="w-full max-w-[92vw] rounded-[2.75rem] border overflow-hidden relative" style={{ background: '#15151d', borderColor: 'rgba(191,168,255,0.16)', boxShadow: '0 28px 80px rgba(0,0,0,0.40)' }}>
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(101,12,217,0.26), transparent 30%), radial-gradient(circle at bottom right, rgba(83,216,209,0.12), transparent 24%)' }} />
        <div className="relative z-10 p-8 md:p-12 xl:p-14">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-10">
            <div className="flex items-center gap-4 min-w-0">
              {brandLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brandLogoUrl} alt={brandName || 'Brand logo'} className="h-20 max-w-[180px] rounded-2xl object-contain bg-white/95 p-2.5" />
              ) : (
                <BrandLockup href="/" size="lg" theme="dark" />
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: '#9CA3AF' }}>Join lobby</p>
                <p className="text-3xl md:text-4xl xl:text-5xl font-black truncate mt-2" style={{ color: '#f4efff' }}>{brandName || 'LiveZapp Session'}</p>
                <p className="text-base md:text-lg mt-2 max-w-3xl" style={{ color: '#b6acc7' }}>Invite everyone in, let the room fill, then start the Zapp when you&apos;re ready.</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-3 rounded-[1.35rem] px-6 py-4 self-start" style={{ background: 'linear-gradient(135deg, #650cd9, #8f63ff)', boxShadow: '0 16px 34px rgba(101,12,217,0.28)' }}>
              <span className="text-[11px] uppercase tracking-[0.18em] font-black" style={{ color: 'rgba(255,255,255,0.76)' }}>Game PIN</span>
              <span className="text-3xl md:text-4xl font-black tracking-[0.22em]" style={{ color: '#ffffff' }}>{joinCode}</span>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-stretch">
            <div className="rounded-[2.4rem] p-7 text-center flex flex-col justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(191,168,255,0.12)' }}>
              <div className="inline-block p-5 rounded-[2rem]" style={{ background: '#ffffff' }}>
                <QRCodeSVG value={qrUrl} size={360} bgColor="#ffffff" fgColor="#111111" level="H" style={{ width: '100%', height: 'auto', maxWidth: '36rem' }} />
              </div>
              <p className="text-lg font-bold mt-6" style={{ color: '#f4efff' }}>Scan to join the Zapp</p>
              <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.50)' }}>The QR stays on stage until you press Start Zapp.</p>
            </div>

            <div className="space-y-5 flex flex-col justify-center">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(191,168,255,0.12)' }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#9CA3AF' }}>Presenter brand</p>
                  <p className="text-sm font-semibold mt-2" style={{ color: '#f4efff' }}>{brandName || 'LiveZapp'}</p>
                </div>
                <div className="rounded-[1.5rem] p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(191,168,255,0.12)' }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#9CA3AF' }}>Stage flow</p>
                  <p className="text-sm font-semibold mt-2" style={{ color: '#f4efff' }}>Lobby first, prompts after Start Zapp</p>
                </div>
              </div>

              <div className="rounded-[1.8rem] p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(191,168,255,0.12)' }}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#9CA3AF' }}>Join route</p>
                <p className="text-base md:text-lg font-bold mt-3" style={{ color: '#53d8d1' }}>{displayUrl}</p>
                <p className="text-sm mt-3" style={{ color: 'rgba(255,255,255,0.55)' }}>Use this if anyone in the room prefers typing the code instead of scanning the QR.</p>
              </div>

              <button
                onClick={onStart}
                className="flex items-center justify-center gap-3 px-8 py-5 rounded-[1.6rem] font-black text-xl transition-all"
                style={{ background: 'linear-gradient(135deg, #650cd9, #8f63ff)', color: '#FFFFFF', boxShadow: '0 18px 38px rgba(101,12,217,0.32)' }}
              >
                <Play className="w-5 h-5" fill="currentColor" />
                Start Zapp
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// â”€â”€â”€ Fullscreen: Question slide â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function QuestionSlide({
  question, responses, slideNum, total,
}: {
  question: Question
  responses: Record<string, ParticipantResponse>
  slideNum: number
  total: number
}) {
  const hasResponses = Object.keys(responses).length > 0
  const kindColor = KIND_COLOR[question.kind] ?? '#53d8d1'
  const kindTextColor = KIND_TEXT_COLOR[question.kind] ?? '#FFFFFF'
  const KindIcon = KIND_ICON[question.kind] ?? Sparkles
  const responseCount = Object.keys(responses).length

  return (
    <AnimatePresence mode="wait">
      {!hasResponses ? (
        /* â”€â”€ Waiting phase: question centered large â”€â”€ */
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
              Waiting for responsesâ€¦
            </span>
          </motion.div>
        </motion.div>
      ) : (
        /* â”€â”€ Response phase: question at top, visualisation fills centre â”€â”€ */
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

          {/* Response visualisation â€” fills remaining space */}
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

// â”€â”€â”€ Projector-scale bar chart (fullscreen only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Main presenter page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function PresentPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [session, setSession] = useState<LiveSessionData | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  type LeaderboardEntry = { participantId: string; name: string; score: number }
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([])
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [isComputingLeaderboard, setIsComputingLeaderboard] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [participantCount, setParticipantCount] = useState(0)
  const [responses, setResponses] = useState<Record<string, ParticipantResponse>>({})
  const [codeCopied, setCodeCopied] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showJoinSlide, setShowJoinSlide] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [showInsights, setShowInsights] = useState(true)
  const [hasAutoLaunchAttempted, setHasAutoLaunchAttempted] = useState(false)
  const [joinOrigin, setJoinOrigin] = useState<string | null>(null)
  const presenterRef = useRef<HTMLDivElement>(null)
  const themeIconLabel = isDark ? 'Use light mode' : 'Use dark mode'
  const shareSiteUrl = joinOrigin ?? undefined
  const joinUrl = session ? `${joinOrigin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://www.live-zapp.com')}/join/${session.joinCode}` : ''

  useEffect(() => {
    if (typeof window === 'undefined') return
    const prodOrigin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.live-zapp.com'
    const hostname = window.location.hostname
    const port = window.location.port

    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      setJoinOrigin(window.location.origin)
      return
    }

    fetch('/api/local-ip')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ip) {
          setJoinOrigin(`http://${data.ip}${port ? `:${port}` : ''}`)
        } else {
          setJoinOrigin(prodOrigin)
        }
      })
      .catch(() => setJoinOrigin(prodOrigin))
  }, [])

  // Fullscreen handlers
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      setShowJoinSlide(true)   // always start at join slide
      presenterRef.current?.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  const handleBackToBuilder = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {})
    }
    router.push(`/app/create/${id}`)
  }, [id, router])

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

  const handleStartZapp = async () => {
    if (!session) return
    setIsStarting(true)
    try {
      await LiveSessionService.startPresentation(session.joinCode)
      setShowJoinSlide(false)
    } catch (e: any) {
      setError(e.message || 'Failed to start Zapp')
    } finally {
      setIsStarting(false)
    }
  }

  useEffect(() => {
    const shouldAutoLaunch = searchParams.get('launch') === '1'
    if (!shouldAutoLaunch || hasAutoLaunchAttempted || session || !presentation || !user || questions.length === 0) return

    setHasAutoLaunchAttempted(true)
    void handleGoLive()
  }, [searchParams, hasAutoLaunchAttempted, session, presentation, user, questions.length])

  const handleEndSession = async () => {
    if (!session || !presentation) return
    if (!confirm('End this session? Participants will be disconnected.')) return
    setIsEnding(true)
    try {
      const joinCode = session.joinCode
      await LiveSessionService.endSession(joinCode, id)

      // Compute quiz leaderboard (if the Zapp contains quiz questions).
      setIsComputingLeaderboard(true)
      const quizQuestions = questions.filter((q): q is QuizQuestion => q.kind === 'quiz')

      const participants = await LiveSessionService.getParticipants(joinCode)
      const scores: Record<string, number> = {}
      const participantIds = new Set<string>()

      if (quizQuestions.length > 0) {
        const responsesByQuestion = await Promise.all(
          quizQuestions.map(q => LiveSessionService.getResponsesForQuestion(joinCode, q.id))
        )

        quizQuestions.forEach((q, idx) => {
          const responsesForQ = responsesByQuestion[idx] ?? {}
          Object.entries(responsesForQ).forEach(([participantId, resp]) => {
            participantIds.add(participantId)
            if (typeof resp.answer === 'string' && resp.answer === q.correctOptionId) {
              scores[participantId] = (scores[participantId] ?? 0) + (q.points ?? 0)
            }
          })
        })
      }

      const entries = Array.from(participantIds).map(participantId => ({
        participantId,
        name: participants[participantId]?.name || 'Guest',
        score: scores[participantId] ?? 0,
      }))

      entries.sort((a, b) => b.score - a.score)

      setLeaderboardEntries(entries)
      setShowLeaderboard(true)
    } catch (e: any) {
      setError(e.message || 'Failed to end session')
    } finally {
      setIsEnding(false)
      setIsComputingLeaderboard(false)
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

  // â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(101,12,217,0.20)', borderTopColor: '#650cd9' }} />
        <p className="text-sm" style={{ color: '#9CA3AF' }}>Loading presenter viewâ€¦</p>
      </div>
    )
  }

  if (error || !presentation) {
    return (
      <div className="glass-card p-12 text-center space-y-4 max-w-lg mx-auto mt-12">
        <AlertCircle className="w-10 h-10 mx-auto" style={{ color: '#bda6ff' }} />
        <h2 className="text-xl font-bold" style={{ color: '#111111' }}>{error ?? 'Something went wrong'}</h2>
        <Link href="/app/dashboard" className="btn-primary inline-flex">Back to Dashboard</Link>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const kindColor = currentQuestion ? (KIND_COLOR[currentQuestion.kind] ?? '#53d8d1') : '#53d8d1'
  const kindTextColor = currentQuestion ? (KIND_TEXT_COLOR[currentQuestion.kind] ?? '#FFFFFF') : '#FFFFFF'
  const KindIcon = currentQuestion ? (KIND_ICON[currentQuestion.kind] ?? Sparkles) : Sparkles

  const handleCloseLeaderboard = () => {
    setShowLeaderboard(false)
    setLeaderboardEntries([])
    router.push('/app/dashboard')
  }

  const leaderboardModal = showLeaderboard ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={() => !isComputingLeaderboard && handleCloseLeaderboard()}
    >
      <div
        className="w-full max-w-lg rounded-3xl p-6"
        style={{ background: '#FFFFFF', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-black" style={{ color: '#1A1A2E' }}>Quiz leaderboard</h3>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              Top scores from this Zapp
            </p>
          </div>
          <button
            onClick={handleCloseLeaderboard}
            disabled={isComputingLeaderboard}
            className="px-3 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: 'rgba(0,0,0,0.05)', color: '#6B7280' }}
            title="Back to dashboard"
          >
            âœ•
          </button>
        </div>

        {isComputingLeaderboard ? (
          <div className="py-10 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(101,12,217,0.20)', borderTopColor: '#650cd9' }} />
            <p className="text-sm" style={{ color: '#6B7280' }}>Calculating scoresâ€¦</p>
          </div>
        ) : leaderboardEntries.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-14 h-14 rounded-3xl flex items-center justify-center mx-auto" style={{ background: 'rgba(101,12,217,0.10)', border: '1px solid rgba(101,12,217,0.20)' }}>
              <BarChart3 className="w-7 h-7" style={{ color: '#650cd9' }} />
            </div>
            <p className="text-sm font-semibold mt-4" style={{ color: '#1A1A2E' }}>No quiz leaderboard yet</p>
            <p className="text-xs mt-2" style={{ color: '#6B7280' }}>Make sure the Zapp contains quiz questions and participants submit answers.</p>
          </div>
        ) : (
          <div className="max-h-[52vh] overflow-y-auto pr-1">
            {leaderboardEntries.slice(0, 10).map((entry, idx) => (
              <div
                key={entry.participantId}
                className="flex items-center justify-between gap-4 py-3"
                style={{ borderBottom: idx < Math.min(10, leaderboardEntries.length) - 1 ? '1px solid #F3F4F6' : 'none' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 text-[12px] font-black"
                    style={{ background: '#650cd9', color: '#FFFFFF' }}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: '#1A1A2E' }}>{entry.name}</p>
                    <p className="text-[11px] truncate" style={{ color: '#9CA3AF' }}>{entry.participantId.slice(0, 10)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black" style={{ color: '#650cd9' }}>{entry.score}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>points</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleCloseLeaderboard}
            disabled={isComputingLeaderboard}
            className="btn-primary w-full disabled:opacity-60"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  ) : null

  // â”€â”€ Pre-live setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!session) {
    const launchAccent = presentation.brandAccentColor || '#650cd9'
    return (
      <div className="max-w-6xl mx-auto pb-16 space-y-6">
        <Link href={`/app/create/${id}`} className="inline-flex items-center gap-2 text-sm transition-colors" style={{ color: '#9CA3AF' }} onMouseEnter={e => (e.currentTarget.style.color = '#d2bbff')} onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}>
          <ArrowLeft className="w-4 h-4" /> Back to builder
        </Link>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border p-7 md:p-9 overflow-hidden relative" style={{ background: '#15151d', borderColor: 'rgba(191,168,255,0.16)' }}>
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(101,12,217,0.24), transparent 32%), radial-gradient(circle at bottom right, rgba(83,216,209,0.12), transparent 24%)' }} />
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: '#9CA3AF' }}>Presenter view</p>
              <div className="flex items-center gap-4">
                {presentation.brandLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={presentation.brandLogoUrl} alt={presentation.brandName || presentation.title} className="h-14 w-auto max-w-[124px] rounded-xl object-contain bg-white/95 p-2" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${launchAccent}22` }}>
                    <Sparkles className="w-6 h-6" style={{ color: launchAccent }} />
                  </div>
                )}
                <div>
                  <h1 className="font-display text-3xl md:text-4xl font-bold" style={{ color: '#f4efff' }}>
                    {presentation.title}
                  </h1>
                  <p className="text-sm mt-1" style={{ color: '#b6acc7' }}>
                    {questions.length} question{questions.length !== 1 ? 's' : ''} ready for your branded lobby and live stage.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 mt-7">
                {[
                  { label: 'Brand', value: presentation.brandLogoUrl ? 'Custom logo ready' : 'Default LiveZapp brand' },
                  { label: 'Theme', value: presentation.brandAccentColor ? 'Custom accent applied' : 'Purple signature theme' },
                  { label: 'Launch', value: 'QR lobby before questions begin' },
                ].map(item => (
                  <div key={item.label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(191,168,255,0.12)' }}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: '#8f85a6' }}>{item.label}</p>
                    <p className="text-sm font-semibold mt-2" style={{ color: '#f4efff' }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {questions.length > 0 && (
                <div className="mt-7 rounded-[1.7rem] border overflow-hidden" style={{ background: 'rgba(10,10,14,0.62)', borderColor: 'rgba(191,168,255,0.12)' }}>
                  <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(191,168,255,0.10)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Question lineup</p>
                  </div>
                  {questions.map((q, i) => {
                    const Icon = KIND_ICON[q.kind] ?? Sparkles
                    const color = KIND_COLOR[q.kind] ?? '#650cd9'
                    return (
                      <div key={q.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: i < questions.length - 1 ? '1px solid rgba(191,168,255,0.08)' : 'none' }}>
                        <span className="text-[10px] font-black w-5 text-center" style={{ color: '#8f85a6' }}>{i + 1}</span>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <p className="text-sm truncate flex-1" style={{ color: '#ede6fb' }}>{q.prompt || <span style={{ color: '#8f85a6' }} className="italic">No prompt</span>}</p>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0" style={{ background: `${color}14`, color, border: `1px solid ${color}25` }}>
                          {q.kind.replace('_', ' ')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border p-7 md:p-8 flex flex-col justify-between" style={{ background: '#181821', borderColor: 'rgba(191,168,255,0.16)' }}>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]" style={{ background: 'rgba(101,12,217,0.14)', color: '#cdb8ff' }}>
                Lobby first
              </div>
              <h2 className="text-2xl font-black mt-5" style={{ color: '#f4efff' }}>Go live into a polished branded lobby</h2>
              <p className="text-sm mt-3" style={{ color: '#b6acc7' }}>
                We&apos;ll open with the QR code, Zapp name, and presenter branding first. Questions begin from the fullscreen stage after that.
              </p>
            </div>

            {questions.length === 0 ? (
              <div className="mt-6 flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(145,47,3,0.10)', border: '1px solid rgba(145,47,3,0.25)', color: '#ffb59c' }}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                You haven&apos;t added any questions yet. <Link href={`/app/create/${id}`} className="underline">Go back to the builder</Link> to add some.
              </div>
            ) : null}

            <div className="mt-8 flex justify-end">
              <button onClick={handleGoLive} disabled={isStarting || questions.length === 0} className="btn-primary text-base px-8 py-3.5 font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                {isStarting ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />Starting…</span>
                ) : (
                  <><Radio className="w-5 h-5" />Go Live</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // â”€â”€ Fullscreen slideshow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isFullscreen) {
    return (
      <div
        ref={presenterRef}
        className="fixed inset-0 z-50 flex flex-col select-none"
        style={{ background: '#0D1117' }}
      >
        {leaderboardModal}
        {/* â”€â”€ Top control bar â”€â”€ */}
        <div
          className="flex items-center justify-between px-6 py-3 shrink-0 z-10"
          style={{ background: 'rgba(0,0,0,0.55)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
        >
          {/* Left: back + brand */}
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={handleBackToBuilder}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: '#d2bbff' }}>
              LiveZapp
            </span>
          </div>

          {/* Center: joined count */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(191,168,255,0.18)' }}>
            <Users className="w-4 h-4" style={{ color: '#8f63ff' }} />
            <span className="font-black text-white">{participantCount}</span>
            <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }}>joined</span>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-xl transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}
              title={themeIconLabel}
              aria-label={themeIconLabel}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {session && (
              <ShareJoinLink
                joinCode={session.joinCode}
                presenterName={user?.name || 'Presenter'}
                sessionTitle={presentation?.title || 'Session'}
                siteUrl={shareSiteUrl}
              />
            )}
            {!showJoinSlide && (
              <button
                onClick={isPaused ? handleResume : handlePause}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: isPaused ? 'rgba(101,12,217,0.18)' : 'rgba(255,255,255,0.08)',
                  border: `1px solid ${isPaused ? 'rgba(191,168,255,0.30)' : 'rgba(255,255,255,0.12)'}`,
                  color: isPaused ? '#c7b5ff' : 'rgba(255,255,255,0.75)',
                }}
              >
                {isPaused ? <Play className="w-4 h-4" fill="currentColor" /> : <Pause className="w-4 h-4" />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            )}
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

        {/* â”€â”€ Slide area â”€â”€ */}
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
                  onStart={handleStartZapp}
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
                  style={{ background: 'linear-gradient(135deg, #650cd9, #8f63ff)', color: '#FFFFFF' }}
                >
                  <Play className="w-5 h-5" fill="currentColor" /> Resume session
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* â”€â”€ Bottom navigation bar â”€â”€ */}
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
              style={{ background: showJoinSlide ? '#8f63ff' : 'rgba(255,255,255,0.20)', transform: showJoinSlide ? 'scale(1.4)' : 'scale(1)' }}
              title="Join slide"
            />
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => { setShowJoinSlide(false); navigateTo(i) }}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: !showJoinSlide && i === currentIndex ? '#8f63ff' : 'rgba(255,255,255,0.20)',
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

  // â”€â”€ Dashboard (non-fullscreen) live session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalResponses = Object.keys(responses).length
  const engagementPct = participantCount > 0 ? Math.round((totalResponses / participantCount) * 100) : 0
  const optionPalette = [
    { bg: '#ba1a1a', label: 'Option A' },
    { bg: '#650cd9', label: 'Option B' },
    { bg: '#912f03', label: 'Option C' },
    { bg: '#006b5f', label: 'Option D' },
  ]
  const surface = isDark ? '#131313' : '#fcf9f8'
  const surfaceSoft = isDark ? '#201f1f' : '#f0edec'
  const surfaceCard = isDark ? '#0e0e0e' : '#ffffff'
  const surfaceCardAlt = isDark ? '#1c1b1b' : '#f6f3f2'
  const borderSoft = isDark ? 'rgba(149,141,161,0.35)' : 'rgba(123,116,135,0.20)'
  const textStrong = isDark ? '#e5e2e1' : '#1c1b1b'
  const textMuted = isDark ? '#ccc3d8' : '#4a4455'
  let optionItems: { id: string; label: string }[] = []
  if (currentQuestion?.kind === 'quiz' || currentQuestion?.kind === 'poll') {
    optionItems = (currentQuestion as QuizQuestion | PollQuestion).options
  } else if (
    currentQuestion?.kind === 'feedback' &&
    (currentQuestion as FeedbackQuestion).feedbackType === 'multiple_choice'
  ) {
    optionItems = (currentQuestion as FeedbackQuestion).options ?? []
  }

  const optionCounts = optionItems.map((option) => {
    let count = 0
    Object.values(responses).forEach((resp) => {
      const ans = resp.answer
      if (Array.isArray(ans)) {
        if (ans.includes(option.id)) count += 1
      } else if (ans === option.id) {
        count += 1
      }
    })
    return { id: option.id, label: option.label, count }
  })

  const topOption = optionCounts.slice().sort((a, b) => b.count - a.count)[0]

  if (!session.hasStarted) {
    return (
      <div
        ref={presenterRef}
        className="-mt-10 md:-mt-16 -mx-6 md:-mx-10 min-h-screen pb-12"
        style={{ background: surface, color: textStrong }}
      >
        {leaderboardModal}

        <nav
          className="sticky top-0 z-20 px-4 md:px-8 py-5 backdrop-blur-md border-b"
          style={{ background: isDark ? 'rgba(19,19,19,0.82)' : 'rgba(252,249,248,0.82)', borderColor: borderSoft }}
        >
          <div className="max-w-screen-2xl mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link href={`/app/create/${id}`} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold" style={{ background: surfaceCardAlt, borderColor: borderSoft, color: textStrong }}>
                <ArrowLeft className="w-4 h-4" />
                Back to builder
              </Link>
              <span className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: isDark ? '#d2bbff' : '#650cd9' }}>
                LiveZapp
              </span>
            </div>

            <div className="justify-self-center flex items-center gap-2 px-4 py-2 rounded-full border" style={{ background: surfaceSoft, borderColor: borderSoft }}>
              <Users className="w-4 h-4" style={{ color: '#650cd9' }} />
              <span className="text-sm font-bold" style={{ color: textMuted }}>{participantCount} Participants</span>
            </div>

            <div className="justify-self-end flex items-center gap-2 md:gap-3">
              <button
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full border flex items-center justify-center transition-colors"
                style={{ background: surfaceCardAlt, borderColor: borderSoft, color: textMuted }}
                title={themeIconLabel}
                aria-label={themeIconLabel}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={copyCode}
                className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold border"
                style={{ background: surfaceCardAlt, borderColor: borderSoft, color: textStrong }}
              >
                <Copy className="w-4 h-4" />
                Copy code
              </button>
              <ShareJoinLink
                joinCode={session.joinCode}
                presenterName={user?.name || 'Presenter'}
                sessionTitle={presentation?.title || 'Zapp'}
                siteUrl={shareSiteUrl}
              />
              <button
                onClick={toggleFullscreen}
                className="px-5 md:px-7 py-3 rounded-2xl text-sm md:text-base font-black shadow-lg"
                style={{ background: 'linear-gradient(135deg,#650cd9,#7a3af0)', color: '#ffffff', boxShadow: '0 18px 36px rgba(101,12,217,0.35)' }}
              >
                Enter Fullscreen Stage
              </button>
            </div>
          </div>
        </nav>

        <main className="max-w-screen-2xl mx-auto px-4 md:px-8 pt-5 md:pt-6 min-h-[calc(100vh-92px)] flex">
          <section className="flex-1 rounded-[2.5rem] border overflow-hidden relative" style={{ background: surfaceCard, borderColor: borderSoft }}>
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(101,12,217,0.24), transparent 32%), radial-gradient(circle at bottom right, rgba(83,216,209,0.10), transparent 24%)' }} />
            <div className="relative z-10 p-6 md:p-10 xl:p-12 grid gap-8 lg:grid-cols-[1fr_1.08fr] items-stretch min-h-[76vh]">
              <div className="space-y-6 flex flex-col justify-center">
                <div className="flex items-center gap-4">
                  {session.brandLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.brandLogoUrl} alt={session.brandName || presentation.title} className="h-20 max-w-[170px] rounded-2xl object-contain bg-white/95 p-2.5" />
                  ) : (
                    <div className="w-20 h-20 rounded-[1.75rem] flex items-center justify-center" style={{ background: 'rgba(101,12,217,0.14)' }}>
                      <Sparkles className="w-9 h-9" style={{ color: '#650cd9' }} />
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: textMuted }}>Lobby is live</p>
                    <h1 className="text-4xl md:text-5xl xl:text-6xl font-black mt-2" style={{ color: textStrong }}>{presentation.title}</h1>
                  </div>
                </div>

                <p className="text-base md:text-lg max-w-2xl leading-relaxed" style={{ color: textMuted }}>
                  This Go Zapp lobby is ready. Share the QR code and PIN, welcome people in, then take the Zapp fullscreen when you&apos;re ready to begin.
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Prompts', value: `${questions.length} ready` },
                    { label: 'Brand', value: session.brandName || 'LiveZapp' },
                    { label: 'Lobby', value: 'Open for participants' },
                  ].map(item => (
                    <div key={item.label} className="rounded-[1.5rem] p-5 border" style={{ background: surfaceCardAlt, borderColor: borderSoft }}>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: textMuted }}>{item.label}</p>
                      <p className="text-base font-semibold mt-2" style={{ color: textStrong }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button onClick={handleStartZapp} disabled={isStarting || questions.length === 0} className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-lg font-black text-white disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg,#650cd9,#7a3af0)', boxShadow: '0 20px 40px rgba(101,12,217,0.35)' }}>
                    <Play className="w-5 h-5" fill="currentColor" />
                    {isStarting ? 'Starting...' : 'Start Zapp'}
                  </button>
                  <button onClick={toggleFullscreen} className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-lg font-black text-white" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${borderSoft}`, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}>
                    <Maximize2 className="w-5 h-5" />
                    Fullscreen Stage
                  </button>
                  <button onClick={copyCode} className="btn-ghost px-5 py-4 text-base" style={{ color: isDark ? '#f4efff' : '#4a4455', borderColor: borderSoft }}>
                    <Copy className="w-4 h-4" />
                    {codeCopied ? 'Copied' : 'Copy Zapp Code'}
                  </button>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] items-stretch">
                <div className="rounded-[2rem] p-6 text-center border flex flex-col justify-center" style={{ background: surfaceCardAlt, borderColor: borderSoft }}>
                  <div className="mx-auto w-full max-w-[28rem] rounded-[1.8rem] p-5" style={{ background: '#ffffff' }}>
                    <QRCodeSVG value={joinUrl} size={520} bgColor="#ffffff" fgColor="#111111" level="H" style={{ width: '100%', height: 'auto' }} />
                  </div>
                  <p className="text-lg mt-5 font-semibold" style={{ color: textMuted }}>Scan to join the Zapp</p>
                </div>

                <div className="space-y-5 flex flex-col justify-center">
                  <div className="rounded-[2rem] p-6 border" style={{ background: surfaceCardAlt, borderColor: borderSoft }}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: textMuted }}>Game PIN</p>
                    <button onClick={copyCode} className="mt-4 text-5xl md:text-6xl font-black tracking-[0.18em]" style={{ color: '#650cd9' }}>
                      {session.joinCode}
                    </button>
                    <p className="text-sm mt-3" style={{ color: textMuted }}>Share this code or the QR to bring participants into the Zapp lobby.</p>
                  </div>
                  <div className="rounded-[2rem] p-6 border" style={{ background: surfaceCardAlt, borderColor: borderSoft }}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: textMuted }}>Next step</p>
                    <p className="text-base mt-3 leading-relaxed" style={{ color: textStrong }}>Use the fullscreen stage for the polished presenter view, then start the first prompt from the branded Go Zapp lobby.</p>
                  </div>
                  <div className="text-sm" style={{ color: textMuted }}>
                    Tip: once fullscreen opens, the first screen your audience sees will still be the branded lobby before you start the live prompts.
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div
      ref={presenterRef}
      className="-mt-10 md:-mt-16 -mx-6 md:-mx-10 min-h-screen pb-44"
      style={{ background: surface, color: textStrong }}
    >
      {leaderboardModal}

      <nav
        className="sticky top-0 z-20 px-4 md:px-8 py-4 backdrop-blur-md border-b"
        style={{ background: isDark ? 'rgba(19,19,19,0.82)' : 'rgba(252,249,248,0.82)', borderColor: borderSoft }}
      >
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className="text-xl md:text-2xl font-black tracking-tight" style={{ color: isDark ? '#d2bbff' : '#650cd9' }}>
              LiveZapp
            </span>
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full border" style={{ background: surfaceSoft, borderColor: borderSoft }}>
              <Users className="w-4 h-4" style={{ color: '#650cd9' }} />
              <span className="text-sm font-bold" style={{ color: textMuted }}>{participantCount} Participants</span>
            </div>
          </div>

          <div className="hidden md:flex items-center px-5 py-2.5 rounded-2xl shadow-lg" style={{ background: isDark ? '#7e3af2' : '#efe3ff' }}>
            <span className="text-[11px] uppercase tracking-[0.16em] font-bold mr-2" style={{ color: isDark ? '#efe3ff' : '#5a00c6' }}>
              Game PIN:
            </span>
            <button onClick={copyCode} className="text-2xl font-black tracking-[0.2em]" style={{ color: isDark ? '#ffffff' : '#25005a' }}>
              {session.joinCode}
            </button>
            {codeCopied && <CheckCircle2 className="w-4 h-4 ml-2" style={{ color: isDark ? '#71f8e4' : '#006b5f' }} />}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full border flex items-center justify-center transition-colors"
              style={{ background: surfaceCardAlt, borderColor: borderSoft, color: textMuted }}
              title={themeIconLabel}
              aria-label={themeIconLabel}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={isPaused ? handleResume : handlePause}
              className="px-4 py-2 rounded-xl text-xs md:text-sm font-bold border"
              style={{ background: surfaceCardAlt, borderColor: borderSoft, color: textStrong }}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-4 py-2 rounded-xl text-xs md:text-sm font-bold border"
              style={{ background: surfaceCardAlt, borderColor: borderSoft, color: textStrong }}
            >
              Fullscreen
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-2xl mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-10 space-y-5">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div
            className="lg:col-span-9 relative rounded-[2rem] p-8 md:p-12 min-h-[360px] md:min-h-[440px] border overflow-hidden"
            style={{ background: surfaceCard, borderColor: borderSoft }}
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(101,12,217,0.25), transparent 50%)' }} />
            <div className="absolute top-6 right-6 md:top-8 md:right-8 w-20 h-20 md:w-24 md:h-24 rounded-full border-8 flex items-center justify-center" style={{ borderColor: isDark ? '#353534' : '#ebe7e7', color: '#650cd9' }}>
              <span className="text-xl md:text-2xl font-black">18</span>
            </div>

            <div className="relative z-10 h-full flex flex-col justify-center items-center text-center">
              <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-5" style={{ background: isDark ? 'rgba(255,181,156,0.18)' : 'rgba(145,47,3,0.12)', color: isDark ? '#ffb59c' : '#912f03' }}>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight max-w-4xl" style={{ color: textStrong }}>
                {currentQuestion?.prompt || 'No prompt set for this slide yet.'}
              </h1>
            </div>
          </div>

          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="rounded-3xl p-5 border h-full" style={{ background: surfaceCardAlt, borderColor: borderSoft }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold">Real-time Activity</h3>
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#4fdbc8' }} />
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl p-4 border" style={{ background: surfaceCard, borderColor: borderSoft }}>
                  <p className="text-xs font-bold mb-1" style={{ color: textMuted }}>Answers Submitted</p>
                  <p className="text-3xl font-black" style={{ color: '#650cd9' }}>
                    {totalResponses}
                    <span className="text-sm ml-1" style={{ color: textMuted }}>/ {participantCount}</span>
                  </p>
                </div>
                <div className="rounded-2xl p-4 border" style={{ background: surfaceCard, borderColor: borderSoft }}>
                  <p className="text-xs font-bold mb-1" style={{ color: textMuted }}>Engagement</p>
                  <p className="text-3xl font-black" style={{ color: '#006b5f' }}>{engagementPct}%</p>
                </div>
                <div className="rounded-2xl p-4 border" style={{ background: surfaceCard, borderColor: borderSoft }}>
                  <p className="text-xs font-bold mb-1" style={{ color: textMuted }}>Top Option</p>
                  <p className="text-sm font-bold truncate" style={{ color: textStrong }}>
                    {topOption && topOption.count > 0 ? topOption.label : 'Awaiting responses'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInsights((prev) => !prev)}
                className="w-full mt-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border"
                style={{ background: surfaceCard, borderColor: borderSoft, color: textMuted }}
              >
                {showInsights ? 'Hide Results' : 'Preview Results'}
              </button>
            </div>
          </div>
        </section>

        {optionItems.length > 0 ? (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {optionItems.slice(0, 4).map((option, index) => {
              const palette = optionPalette[index] ?? optionPalette[optionPalette.length - 1]
              const entryCount = optionCounts.find((entry) => entry.id === option.id)?.count ?? 0
              return (
                <div
                  key={option.id}
                  className="group rounded-[1.5rem] p-5 md:p-6 border-b-8 flex items-center gap-5"
                  style={{ background: surfaceCard, borderColor: `${palette.bg}80`, boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.35)' : '0 2px 10px rgba(0,0,0,0.08)' }}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0" style={{ background: palette.bg }}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold leading-snug" style={{ color: textStrong }}>{option.label}</p>
                    <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: textMuted }}>
                      {palette.label} · {entryCount} votes
                    </p>
                  </div>
                </div>
              )
            })}
          </section>
        ) : (
          currentQuestion && <ResponsePanel question={currentQuestion} responses={responses} dark={isDark} />
        )}

        {showInsights && currentQuestion && (
          <section className="rounded-3xl p-5 border" style={{ background: surfaceCardAlt, borderColor: borderSoft }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Live Insights</h3>
              <span className="text-xs font-semibold" style={{ color: textMuted }}>
                {totalResponses} response{totalResponses !== 1 ? 's' : ''}
              </span>
            </div>
            <ResponsePanel question={currentQuestion} responses={responses} dark={isDark} />
          </section>
        )}
      </main>

      <footer
        className="fixed bottom-0 left-0 right-0 z-20 px-4 md:px-8 py-4 border-t backdrop-blur-xl"
        style={{ background: isDark ? 'rgba(14,14,14,0.9)' : 'rgba(255,255,255,0.9)', borderColor: borderSoft }}
      >
        <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: surfaceSoft }}>
            <span className="text-xs font-bold" style={{ color: textMuted }}>Lobby Groove - Vol. 4</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInsights((prev) => !prev)}
              className="px-5 md:px-8 py-3 rounded-full font-black text-sm border"
              style={{ background: surfaceCardAlt, borderColor: borderSoft, color: textStrong }}
            >
              {showInsights ? 'Hide Results' : 'Show Results'}
            </button>
            <button
              onClick={() => {
                if (currentIndex < questions.length - 1) {
                  navigateTo(currentIndex + 1)
                  return
                }
                handleEndSession()
              }}
              disabled={isEnding}
              className="px-8 md:px-12 py-3 rounded-full font-black text-sm text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #650cd9 0%, #7e3af2 100%)' }}
            >
              {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Session'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {session && (
              <ShareJoinLink
                joinCode={session.joinCode}
                presenterName={user?.name || 'Presenter'}
                sessionTitle={presentation?.title || 'Session'}
              />
            )}
            <button
              onClick={handleEndSession}
              disabled={isEnding}
              className="text-xs font-black uppercase tracking-widest px-3 py-2 rounded-lg disabled:opacity-40"
              style={{ color: isDark ? '#ffb4ab' : '#ba1a1a' }}
            >
              End Session
            </button>
          </div>
        </div>
      </footer>

      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full blur-[120px]" style={{ background: isDark ? 'rgba(210,187,255,0.08)' : 'rgba(101,12,217,0.08)' }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full blur-[100px]" style={{ background: isDark ? 'rgba(79,219,200,0.08)' : 'rgba(0,107,95,0.08)' }} />
      </div>
    </div>
  )
}


