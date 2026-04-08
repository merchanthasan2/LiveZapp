'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { get, ref } from 'firebase/database'
import {
  CheckCircle2, Sparkles, BarChart3, Cloud,
  MessageSquare, Star, Send, Zap, ArrowRight, Users, ThumbsUp, ThumbsDown,
} from 'lucide-react'
import Image from 'next/image'
import BrandLockup from '@/components/BrandLockup'
import { rtdb } from '@/lib/firebase'
import { LiveSessionService, LiveSessionData, ParticipantResponse } from '@/lib/services/LiveSessionService'
import type {
  Question, QuizQuestion, PollQuestion,
  FeedbackQuestion, QAQuestion, WordCloudQuestion,
} from '@/types/domain'

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getParticipantId(): string {
  if (typeof window === 'undefined') return 'ssr'
  const key = 'eiq_pid'
  const stored = sessionStorage.getItem(key)
  if (stored) return stored
  const id = `p_${Math.random().toString(36).substring(2, 10)}`
  sessionStorage.setItem(key, id)
  return id
}

const KIND_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  quiz: Sparkles, poll: BarChart3, word_cloud: Cloud, qa: MessageSquare, feedback: Star,
}

const DEFAULT_ACCENT = '#650cd9'

type ParticipantTheme = {
  accent: string
  accentStrong: string
  accentSoft: string
  accentSoftStrong: string
  accentBorder: string
  accentRing: string
  accentSurface: string
  accentGradientTo: string
  accentText: string
}

function normalizeHexColor(value?: string | null): string {
  if (!value) return DEFAULT_ACCENT
  const trimmed = value.trim()
  if (!/^#?[0-9A-Fa-f]{6}$/.test(trimmed)) return DEFAULT_ACCENT
  return trimmed.startsWith('#') ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`
}

function hexToRgb(hex: string) {
  const clean = normalizeHexColor(hex).slice(1)
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function mix(hex: string, otherHex: string, weight: number): string {
  const a = hexToRgb(hex)
  const b = hexToRgb(otherHex)
  const clamp = Math.max(0, Math.min(1, weight))
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
  return `#${toHex(a.r + (b.r - a.r) * clamp)}${toHex(a.g + (b.g - a.g) * clamp)}${toHex(a.b + (b.b - a.b) * clamp)}`.toUpperCase()
}

function readableText(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const [rs, gs, bs] = [r, g, b].map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  return luminance > 0.58 ? '#111827' : '#FFFFFF'
}

function buildParticipantTheme(accent?: string | null): ParticipantTheme {
  const base = normalizeHexColor(accent)
  return {
    accent: base,
    accentStrong: mix(base, '#12081F', 0.3),
    accentSoft: rgba(base, 0.10),
    accentSoftStrong: rgba(base, 0.16),
    accentBorder: rgba(base, 0.28),
    accentRing: rgba(base, 0.18),
    accentSurface: mix(base, '#FFFFFF', 0.90),
    accentGradientTo: mix(base, '#FFFFFF', 0.18),
    accentText: readableText(base),
  }
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const WAITING_MESSAGES = [
  'We are excited you joined us. Settle in while the room fills up.',
  'Have a sip of your favorite drink while other participants join in.',
  'You are in early. The presenter will welcome everyone shortly.',
  'Your place is saved. We are getting this Zapp ready for takeoff.',
  'Stay close. The first live prompt is about to begin.',
]

// â”€â”€â”€ Response components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function QuizView({ question, onSubmit, submitted, submittedAnswer, locked, revealCorrectAnswer, timeRemainingMs, theme, errorMessage }: {
  question: QuizQuestion
  onSubmit: (a: string) => void
  submitted: boolean
  submittedAnswer?: string | null
  locked: boolean
  revealCorrectAnswer: boolean
  timeRemainingMs?: number
  theme: ParticipantTheme
  errorMessage?: string
}) {
  const [selected, setSelected] = useState<string | null>(submittedAnswer ?? null)

  useEffect(() => {
    setSelected(submittedAnswer ?? null)
  }, [submittedAnswer, question.id])

  const canInteract = !submitted && !locked && !revealCorrectAnswer
  const isCorrect = typeof submittedAnswer === 'string' && submittedAnswer === question.correctOptionId

  return (
    <div className="space-y-3">
      <div className="rounded-2xl px-4 py-3" style={{ background: revealCorrectAnswer ? 'rgba(34,197,94,0.10)' : locked ? 'rgba(251,191,36,0.14)' : theme.accentSoft, border: `1px solid ${revealCorrectAnswer ? 'rgba(34,197,94,0.24)' : locked ? 'rgba(251,191,36,0.24)' : theme.accentBorder}` }}>
        <p className="text-sm font-bold" style={{ color: revealCorrectAnswer ? '#166534' : locked ? '#92400e' : theme.accentStrong }}>
          {revealCorrectAnswer
            ? submitted
              ? isCorrect
                ? 'Correct answer revealed. Nice one.'
                : 'Correct answer revealed. See the winning option below.'
              : 'Time is up. The correct answer is now shown below.'
            : submitted
              ? 'Answer locked in. Results will appear when the timer ends.'
              : locked
                ? 'Answering has closed for this quiz question.'
                : `Time remaining: ${formatCountdown(timeRemainingMs ?? 0)}`}
        </p>
      </div>
      {question.options.map((opt, i) => (
        <button
          key={opt.id}
          disabled={!canInteract}
          onClick={() => canInteract && setSelected(opt.id)}
          className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
          style={{
            background:
              revealCorrectAnswer && question.correctOptionId === opt.id
                ? 'rgba(34,197,94,0.12)'
                : revealCorrectAnswer && submittedAnswer === opt.id && submittedAnswer !== question.correctOptionId
                  ? 'rgba(239,68,68,0.10)'
                  : selected === opt.id
                    ? theme.accentSoft
                    : '#FFFFFF',
            border:
              revealCorrectAnswer && question.correctOptionId === opt.id
                ? '2px solid rgba(34,197,94,0.45)'
                : revealCorrectAnswer && submittedAnswer === opt.id && submittedAnswer !== question.correctOptionId
                  ? '2px solid rgba(239,68,68,0.30)'
                  : `2px solid ${selected === opt.id ? theme.accent : '#E5E7EB'}`,
            boxShadow: selected === opt.id && canInteract ? `0 0 0 3px ${theme.accentRing}` : 'none',
            opacity: canInteract ? 1 : 0.95,
          }}
        >
          <span className="w-9 h-9 rounded-xl text-sm font-black flex items-center justify-center shrink-0" style={{ background: selected === opt.id && canInteract ? theme.accent : theme.accentSurface, color: selected === opt.id && canInteract ? theme.accentText : theme.accentStrong }}>
            {String.fromCharCode(65 + i)}
          </span>
          <span className="text-base font-medium flex-1 min-w-0 break-words" style={{ color: '#1A1A2E' }}>{opt.label}</span>
          {revealCorrectAnswer && question.correctOptionId === opt.id && (
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.14)', color: '#15803d' }}>
              Correct
            </span>
          )}
        </button>
      ))}
      {!submitted && !locked && !revealCorrectAnswer && (
        <button disabled={!selected} onClick={() => selected && onSubmit(selected)} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base mt-3 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentStrong})`, color: theme.accentText, boxShadow: `0 10px 24px ${theme.accentRing}` }}>
          Submit answer <Send className="w-4 h-4" />
        </button>
      )}
      {errorMessage && (
        <div className="rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.10)', color: '#B91C1C', border: '1px solid rgba(239,68,68,0.18)' }}>
          {errorMessage}
        </div>
      )}
    </div>
  )
}

function PollView({ question, onSubmit, submitted, theme }: {
  question: PollQuestion; onSubmit: (a: string[]) => void; submitted: boolean; theme: ParticipantTheme
}) {
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (id: string) => {
    if (!question.allowMultipleSelections) setSelected([id])
    else setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: theme.accentStrong }}>
        {question.allowMultipleSelections ? 'Select all that apply' : 'Choose one'}
      </p>
      {question.options.map(opt => {
        const isSelected = selected.includes(opt.id)
        return (
          <button key={opt.id} disabled={submitted} onClick={() => !submitted && toggle(opt.id)} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.98]" style={{ background: isSelected ? theme.accentSoft : '#FFFFFF', border: `2px solid ${isSelected ? theme.accent : '#E5E7EB'}`, boxShadow: isSelected ? `0 0 0 3px ${theme.accentRing}` : 'none', opacity: submitted ? 0.65 : 1 }}>
            <span className="w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all" style={{ borderColor: isSelected ? theme.accent : '#D1D5DB', background: isSelected ? theme.accent : 'transparent' }}>
              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </span>
            <span className="text-base font-medium flex-1 min-w-0 break-words" style={{ color: isSelected ? theme.accentStrong : '#1A1A2E' }}>{opt.label}</span>
          </button>
        )
      })}
      {!submitted && (
        <button disabled={selected.length === 0} onClick={() => onSubmit(selected)} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base mt-3 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentStrong})`, color: theme.accentText, boxShadow: `0 10px 24px ${theme.accentRing}` }}>
          Submit <Send className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function WordCloudView({ question, onSubmit, submittedCount, theme }: {
  question: WordCloudQuestion; onSubmit: (a: string[]) => void; submittedCount: number; theme: ParticipantTheme
}) {
  const max = question.maxWordsPerResponse
  const [current, setCurrent] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const atMax = submittedCount >= max
  const canSubmit = current.trim().length > 0 && !atMax
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.accentStrong }}>Submit up to {max} word{max > 1 ? 's' : ''}</p>
        <span className="text-sm font-bold" style={{ color: submittedCount >= max ? theme.accent : '#9CA3AF' }}>{submittedCount}/{max}</span>
      </div>
      {!atMax && (
        <div className="flex gap-2 items-center">
          <input ref={inputRef} type="text" maxLength={30} placeholder="Type a word or phrase..." value={current} autoFocus onChange={e => setCurrent(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (canSubmit) { onSubmit([current.trim()]); setCurrent('') } } }} className="flex-1 px-4 py-3.5 rounded-xl text-base outline-none transition-all" style={{ background: '#FFFFFF', border: '2px solid #E5E7EB', color: '#1A1A2E', fontSize: '1rem' }} onFocus={e => { e.currentTarget.style.borderColor = theme.accent }} onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB' }} />
        </div>
      )}
      <button
        disabled={!canSubmit}
        onClick={() => {
          if (!canSubmit) return
          onSubmit([current.trim()])
          setCurrent('')
          inputRef.current?.focus()
        }}
        className="w-full py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: atMax ? '#9CA3AF' : `linear-gradient(135deg, ${theme.accent}, ${theme.accentStrong})`, color: theme.accentText, boxShadow: atMax ? 'none' : `0 10px 24px ${theme.accentRing}` }}
      >
        Submit ({submittedCount}/{max}) <Send className="w-4 h-4" />
      </button>
    </div>
  )
}

function QAView({ onSubmit, submitted, theme }: { question: QAQuestion; onSubmit: (a: string) => void; submitted: boolean; theme: ParticipantTheme }) {
  const [text, setText] = useState('')
  return (
    <div className="space-y-3">
      <textarea rows={4} placeholder="Type your response here..." disabled={submitted} value={text} onChange={e => setText(e.target.value)} className="w-full px-4 py-4 rounded-xl text-base outline-none resize-none transition-all" style={{ background: '#FFFFFF', border: '2px solid #E5E7EB', color: '#1A1A2E', fontSize: '1rem', lineHeight: 1.5 }} onFocus={e => { e.currentTarget.style.borderColor = theme.accent }} onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB' }} />
      {!submitted && (
        <button disabled={!text.trim()} onClick={() => onSubmit(text.trim())} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentStrong})`, color: theme.accentText, boxShadow: `0 10px 24px ${theme.accentRing}` }}>
          Submit <Send className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function FeedbackView({ question, onSubmit, submitted, theme }: { question: FeedbackQuestion; onSubmit: (a: string | number) => void; submitted: boolean; theme: ParticipantTheme }) {
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const max = question.scaleMax ?? 5
  if (question.feedbackType === 'rating') {
    return (
      <div className="space-y-6">
        <div className="flex gap-2 justify-center flex-wrap">
          {Array.from({ length: max }, (_, i) => i + 1).map(n => (
            <button key={n} disabled={submitted} onClick={() => setRating(n)} className="w-14 h-14 rounded-2xl font-black text-2xl transition-all active:scale-95" style={{ background: rating >= n ? theme.accent : '#F5F7FA', color: rating >= n ? theme.accentText : theme.accentStrong, border: `2px solid ${rating >= n ? theme.accent : '#E5E7EB'}`, boxShadow: rating >= n ? `0 0 0 3px ${theme.accentRing}` : 'none' }}>*</button>
          ))}
        </div>
        {rating > 0 && !submitted && <p className="text-center text-sm font-bold" style={{ color: theme.accentStrong }}>{rating} / {max} stars selected</p>}
        {!submitted && <button disabled={rating === 0} onClick={() => onSubmit(rating)} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentStrong})`, color: theme.accentText, boxShadow: `0 10px 24px ${theme.accentRing}` }}>Submit rating <Send className="w-4 h-4" /></button>}
      </div>
    )
  }
  if (question.feedbackType === 'multiple_choice' && question.options) {
    return (
      <div className="space-y-3">
        {question.options.map(opt => (
          <button key={opt.id} disabled={submitted} onClick={() => setSelected(opt.id)} className="w-full px-4 py-4 rounded-2xl text-base font-medium text-left transition-all active:scale-[0.98]" style={{ background: selected === opt.id ? theme.accentSoft : '#FFFFFF', border: `2px solid ${selected === opt.id ? theme.accent : '#E5E7EB'}`, color: selected === opt.id ? theme.accentStrong : '#1A1A2E' }}>
            <span className="block break-words">{opt.label}</span>
          </button>
        ))}
        {!submitted && <button disabled={!selected} onClick={() => selected && onSubmit(selected)} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base mt-2 transition-all disabled:opacity-40" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentStrong})`, color: theme.accentText, boxShadow: `0 10px 24px ${theme.accentRing}` }}>Submit <Send className="w-4 h-4" /></button>}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <textarea rows={question.feedbackType === 'long_text' ? 5 : 3} placeholder="Your response..." disabled={submitted} value={text} onChange={e => setText(e.target.value)} className="w-full px-4 py-4 rounded-xl text-base outline-none resize-none" style={{ background: '#FFFFFF', border: '2px solid #E5E7EB', color: '#1A1A2E', fontSize: '1rem' }} onFocus={e => { e.currentTarget.style.borderColor = theme.accent }} onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB' }} />
      {!submitted && <button disabled={!text.trim()} onClick={() => onSubmit(text.trim())} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentStrong})`, color: theme.accentText, boxShadow: `0 10px 24px ${theme.accentRing}` }}>Submit <Send className="w-4 h-4" /></button>}
    </div>
  )
}

// â”€â”€â”€ Name entry screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function NameEntryScreen({
  sessionTitle, participantCount, nameInput, setNameInput, onJoin, isJoining,
  brandLogoUrl, brandName, theme,
}: {
  sessionTitle: string
  participantCount: number
  nameInput: string
  setNameInput: (v: string) => void
  onJoin: () => void
  isJoining: boolean
  brandLogoUrl?: string
  brandName?: string
  theme: ParticipantTheme
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col"
      style={{ background: '#0A0E1A' }}
    >
      {/* Header */}
      <div
        className="w-full shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="max-w-md mx-auto w-full flex items-center justify-between px-4 sm:px-5 py-4">
          <BrandLockup href="/" size="sm" theme="dark" />
          {participantCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: theme.accentSoft, color: theme.accent, border: `1px solid ${theme.accentBorder}` }}>
              <Users className="w-3 h-3" />
              {participantCount} joined
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 pb-8 max-w-md mx-auto w-full">

        {/* Brand hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-10 flex flex-col items-center text-center"
        >
          {/* Logo: presenter brand or LiveZapp */}
          {brandLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandLogoUrl}
              alt={brandName || 'Brand'}
              className="h-16 w-auto object-contain max-w-[200px] mb-6"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
              style={{
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentStrong})`,
                boxShadow: `0 8px 32px ${theme.accentRing}`,
              }}
            >
              <Zap className="w-10 h-10 text-white" />
            </div>
          )}

          {/* Session name */}
          <p className="text-xs font-bold uppercase tracking-[0.18em] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            You&rsquo;re joining
          </p>
          <h1
            className="text-white font-black leading-tight"
            style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', letterSpacing: '-0.02em' }}
          >
            {sessionTitle}
          </h1>
        </motion.div>

        {/* Join form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.35 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-bold mb-2.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              What&rsquo;s your name?
            </label>
            <input
              ref={inputRef}
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && nameInput.trim()) onJoin() }}
              placeholder="Enter your name..."
              maxLength={40}
              autoComplete="given-name"
              className="w-full outline-none transition-all"
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '1rem',
                border: '2px solid rgba(255,255,255,0.12)',
                fontSize: '1.1rem',
                fontWeight: 600,
                color: '#FFFFFF',
                background: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(8px)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.background = theme.accentSoft }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
            />
          </div>

          <button
            disabled={!nameInput.trim() || isJoining}
            onClick={onJoin}
            className="w-full flex items-center justify-center gap-3 rounded-2xl font-black text-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentStrong})`,
              color: theme.accentText,
              padding: '1.1rem',
              boxShadow: nameInput.trim() ? `0 6px 24px ${theme.accentRing}` : 'none',
            }}
          >
            {isJoining ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.30)', borderTopColor: '#FFFFFF' }} />Joining...</span>
            ) : (
              <>Join Session <ArrowRight className="w-5 h-5" /></>
            )}
          </button>

          <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>
            No account needed - Join as a guest
          </p>
        </motion.div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-center gap-2 py-4 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: '#650cd9' }}>
          <Zap className="w-2.5 h-2.5 text-white" />
        </div>
        <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Powered by LiveZapp
        </span>
      </div>
    </motion.div>
  )
}

// â”€â”€â”€ Wait screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function WaitScreen({ name, sessionTitle, participantCount, brandLogoUrl, brandName, theme }: {
  name: string
  sessionTitle: string
  participantCount: number
  brandLogoUrl?: string
  brandName?: string
  theme: ParticipantTheme
}) {
  const [messageIndex, setMessageIndex] = useState((name.length + sessionTitle.length) % WAITING_MESSAGES.length)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % WAITING_MESSAGES.length)
    }, 3600)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 text-center"
      style={{ background: 'linear-gradient(160deg, #0D1117 0%, #0A1628 60%, #0F1A1A 100%)' }}
    >
      {/* Animated rings */}
      <div className="relative flex items-center justify-center mb-10">
        {[1, 2, 3].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 60 + i * 44,
              height: 60 + i * 44,
              border: `1.5px solid ${theme.accentBorder}`,
            }}
            animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
        {brandLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brandLogoUrl}
            alt={brandName || sessionTitle}
            className="h-20 w-20 rounded-[1.6rem] object-contain z-10 shadow-2xl"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center z-10"
            style={{ background: theme.accentSoft, border: `1.5px solid ${theme.accentBorder}` }}
          >
            <Zap className="w-8 h-8" style={{ color: theme.accent }} />
          </div>
        )}
      </div>

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-3 mb-8"
      >
        <p style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
          Hey {name}!
        </p>
        <p className="text-base font-medium" style={{ color: 'rgba(255,255,255,0.50)' }}>
          You are all set for
        </p>
        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: theme.accent }}>
          {sessionTitle}
        </p>
        <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.42)' }}>
          Presented by {brandName || 'LiveZapp'}
        </p>
      </motion.div>

      {/* Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-5 w-full max-w-xl mx-auto"
      >
        <div
          className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{ background: theme.accentSoft, border: `1px solid ${theme.accentBorder}` }}
        >
          <motion.div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: theme.accent }}
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Waiting for the presenter to start the Zapp...</span>
        </div>

        <motion.div
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1.6rem] px-6 py-5"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04))',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.84)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.20)',
          }}
        >
          <p className="text-lg font-semibold leading-relaxed">
            {WAITING_MESSAGES[messageIndex]}
          </p>
        </motion.div>

        {participantCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-2"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            <Users className="w-4 h-4" />
            <span className="text-sm">
              {participantCount} participant{participantCount !== 1 ? 's' : ''} joined
            </span>
          </motion.div>
        )}

        {/* Animated dots */}
        <div className="flex gap-2 justify-center pt-2">
          {[0, 1, 2, 3].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: theme.accent }}
              animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// â”€â”€â”€ Main participant page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ParticipantPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const participantId = useRef(getParticipantId())

  const [session,          setSession]          = useState<LiveSessionData | null>(null)
  const [isLoading,        setIsLoading]         = useState(true)
  const [error,            setError]             = useState('')
  const [answered,         setAnswered]          = useState<Record<string, boolean>>({})
  const [submittedAnswers, setSubmittedAnswers]  = useState<Record<string, string | string[] | number>>({})
  const [submissionError,  setSubmissionError]   = useState('')
  const [wordCloudSubmittedCount, setWordCloudSubmittedCount] = useState<Record<string, number>>({})
  const [campaignVote, setCampaignVote] = useState<'up' | 'down' | null>(null)
  const [campaignVoteSaving, setCampaignVoteSaving] = useState(false)
  const [participantCount, setParticipantCount]  = useState(0)
  const [presentationAccentColor, setPresentationAccentColor] = useState<string | null>(null)
  const [timerNow, setTimerNow] = useState(() => Date.now())

  // Name / join state
  const [participantName, setParticipantName] = useState<string | null>(null)
  const [nameInput,       setNameInput]       = useState('')
  const [isJoining,       setIsJoining]       = useState(false)
  const [hasJoined,       setHasJoined]       = useState(false)

  const prevIndexRef = useRef<number>(-1)

  // Load saved name on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('lz_participant_name')
    if (saved) { setParticipantName(saved); setNameInput(saved) }
  }, [])

  // Subscribe to session (always â€” to get title before name entry)
  useEffect(() => {
    const unsub = LiveSessionService.subscribeToSession(code, data => {
      if (!data) { setError('Session not found.'); setIsLoading(false); return }
      if (data.currentQuestionIndex !== prevIndexRef.current) {
        prevIndexRef.current = data.currentQuestionIndex
        setSubmissionError('')
      }
      setSession(data)
      setIsLoading(false)
    })
    const unsubP = LiveSessionService.subscribeToParticipants(code, setParticipantCount)
    return () => { unsub(); unsubP() }
  }, [code])

  useEffect(() => {
    if (!session?.presentationId || session.brandAccentColor) {
      setPresentationAccentColor(session?.brandAccentColor ?? null)
      return
    }
    get(ref(rtdb, `presentations/${session.presentationId}/brandAccentColor`))
      .then(snap => setPresentationAccentColor(snap.exists() ? snap.val() : null))
      .catch(() => setPresentationAccentColor(null))
  }, [session?.presentationId, session?.brandAccentColor])

  // Auto-rejoin when session loads and name is already known
  useEffect(() => {
    if (!session || !participantName || hasJoined) return
    LiveSessionService.joinAsParticipant(code, participantId.current, participantName).catch(() => {})
    setHasJoined(true)
  }, [session, participantName, hasJoined, code])

  const handleJoin = async () => {
    const name = nameInput.trim()
    if (!name || !session) return
    setIsJoining(true)
    sessionStorage.setItem('lz_participant_name', name)
    setParticipantName(name)
    try {
      await LiveSessionService.joinAsParticipant(code, participantId.current, name)
      setHasJoined(true)
    } catch {
      // non-fatal
    } finally {
      setIsJoining(false)
    }
  }

  const questions: Question[] = session?.questions ?? []
  const currentQ = session ? questions[session.currentQuestionIndex] : undefined
  const isAnswered = currentQ ? !!answered[currentQ.id] : false
  const KindIcon = currentQ ? (KIND_ICON[currentQ.kind] ?? Sparkles) : Sparkles
  const theme = buildParticipantTheme(session?.brandAccentColor || presentationAccentColor)
  const submittedAnswer = currentQ ? submittedAnswers[currentQ.id] : undefined
  const quizPhaseMatchesCurrent = currentQ?.kind === 'quiz' ? (!session?.activeQuestionId || session.activeQuestionId === currentQ.id) : false
  const quizAnswerDeadlineAt = currentQ?.kind === 'quiz' && quizPhaseMatchesCurrent ? session?.answerDeadlineAt ?? null : null
  const quizRevealCorrectAnswer = currentQ?.kind === 'quiz' && quizPhaseMatchesCurrent ? !!session?.quizRevealCorrectAnswer : false
  const quizAnswersOpen = currentQ?.kind === 'quiz' && quizPhaseMatchesCurrent ? (session?.quizAnswersOpen ?? !quizRevealCorrectAnswer) : false
  const quizTimeRemainingMs = quizAnswerDeadlineAt ? Math.max(0, new Date(quizAnswerDeadlineAt).getTime() - timerNow) : 0
  const quizAnswerLocked = currentQ?.kind === 'quiz'
    ? quizRevealCorrectAnswer || !quizAnswersOpen || (quizAnswerDeadlineAt ? quizTimeRemainingMs <= 0 : false)
    : false
  const isThankYouStage = session?.stage === 'thank_you'

  useEffect(() => {
    if (currentQ?.kind !== 'quiz' || !quizAnswersOpen || !quizAnswerDeadlineAt) {
      setTimerNow(Date.now())
      return
    }

    const tick = () => setTimerNow(Date.now())
    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [currentQ?.kind, quizAnswersOpen, quizAnswerDeadlineAt])

  const handleSubmit = async (question: Question, answer: string | string[] | number) => {
    if (!session) return

    setSubmissionError('')

    if (question.kind === 'quiz' && quizAnswerLocked) {
      setSubmissionError('The answer window has already closed for this quiz question.')
      return
    }

    let finalAnswer: string | string[] | number = answer
    if (question.kind === 'word_cloud') {
      const prev = Array.isArray(submittedAnswers[question.id]) ? (submittedAnswers[question.id] as string[]) : []
      const incoming = Array.isArray(answer) ? answer : [String(answer)]
      const maxWords = (question as WordCloudQuestion).maxWordsPerResponse
      const merged = [...prev, ...incoming].slice(0, maxWords)
      finalAnswer = merged
    }

    const response: ParticipantResponse = { answer: finalAnswer, submittedAt: new Date().toISOString() }

    try {
      await LiveSessionService.submitResponse(code, question.id, participantId.current, response)
      if (question.kind === 'word_cloud') {
        const total = Array.isArray(finalAnswer) ? finalAnswer.length : 0
        const maxWords = (question as WordCloudQuestion).maxWordsPerResponse
        setWordCloudSubmittedCount((prev) => ({ ...prev, [question.id]: total }))
        setAnswered(prev => ({ ...prev, [question.id]: total >= maxWords }))
      } else {
        setAnswered(prev => ({ ...prev, [question.id]: true }))
      }
      setSubmittedAnswers(prev => ({ ...prev, [question.id]: finalAnswer }))
    } catch (err: any) {
      setSubmissionError(err?.message ?? 'Failed to submit your response. Please try again.')
    }
  }

  // â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1117' }}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 animate-spin mx-auto" style={{ borderColor: 'rgba(101,12,217,0.20)', borderTopColor: '#650cd9' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Connecting...</p>
        </div>
      </div>
    )
  }

  // â”€â”€ Error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F5F7FA' }}>
        <div className="text-center space-y-4">
          <p style={{ color: '#6B7280' }}>{error || 'Session not found.'}</p>
          <button onClick={() => router.push('/join')} className="btn-primary">Try another code</button>
        </div>
      </div>
    )
  }

  // â”€â”€ Paused â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (session.isPaused) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFFFFF' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-5 px-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(101,12,217,0.10)', border: '1.5px solid rgba(101,12,217,0.20)' }}>
              <span style={{ fontSize: '2.5rem' }}>| |</span>
            </div>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1A1A2E' }}>Session paused</h2>
          <p className="text-base" style={{ color: '#6B7280' }}>The presenter will resume shortly. Please stand by.</p>
          <div className="flex gap-1.5 justify-center mt-4">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: '#650cd9' }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }} />
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  if (isThankYouStage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 text-center" style={{ background: mix(theme.accent, '#FFFFFF', 0.95) }}>
        <div className="w-full max-w-md rounded-3xl p-6" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }}>
          <h2 className="text-3xl font-black leading-tight" style={{ color: '#1A1A2E' }}>Thank you.</h2>
          <p className="text-sm mt-2" style={{ color: '#6B7280' }}>We loved your participation. Rate this interaction.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              disabled={campaignVoteSaving || campaignVote !== null}
              onClick={async () => {
                if (campaignVoteSaving || campaignVote) return
                setCampaignVoteSaving(true)
                try {
                  await LiveSessionService.submitCampaignRating(code, participantId.current, 'up', participantName ?? undefined)
                  setCampaignVote('up')
                } finally {
                  setCampaignVoteSaving(false)
                }
              }}
              className="rounded-2xl px-4 py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: campaignVote === 'up' ? 'rgba(34,197,94,0.14)' : 'rgba(34,197,94,0.08)', color: '#15803d', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <ThumbsUp className="w-5 h-5" /> Liked it
            </button>
            <button
              disabled={campaignVoteSaving || campaignVote !== null}
              onClick={async () => {
                if (campaignVoteSaving || campaignVote) return
                setCampaignVoteSaving(true)
                try {
                  await LiveSessionService.submitCampaignRating(code, participantId.current, 'down', participantName ?? undefined)
                  setCampaignVote('down')
                } finally {
                  setCampaignVoteSaving(false)
                }
              }}
              className="rounded-2xl px-4 py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: campaignVote === 'down' ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)', color: '#B91C1C', border: '1px solid rgba(239,68,68,0.22)' }}
            >
              <ThumbsDown className="w-5 h-5" /> Needs work
            </button>
          </div>
          {campaignVote && <p className="text-xs mt-4 font-semibold" style={{ color: '#6B7280' }}>Thanks for your feedback.</p>}
        </div>
      </div>
    )
  }

  // â”€â”€ Session ended â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!session.isActive) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#F5F7FA' }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#FFFFFF' }}>
          <BrandLockup href="/" size="sm" theme="light" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-md mx-auto w-full">
          {/* Session ended confirmation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4 w-full"
          >
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.20)' }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: '#16A34A' }} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1A1A2E' }}>Session ended</h2>
            <p className="text-base" style={{ color: '#6B7280' }}>
              Thanks for joining <strong style={{ color: '#1A1A2E' }}>{session.title}</strong>
              {participantName && <>. Great job, <strong style={{ color: '#1A1A2E' }}>{participantName}</strong>!</>}
            </p>
            <button
              onClick={() => router.push('/join')}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
              style={{ background: 'rgba(101,12,217,0.10)', color: '#650cd9', border: '1px solid rgba(101,12,217,0.20)' }}
            >
              Join another session
            </button>
          </motion.div>

          {/* Promo panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0A0E1A 0%, #0F1F2E 100%)',
              border: '1px solid rgba(101,12,217,0.20)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          >
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#650cd9' }}>
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: '#650cd9' }}>Enjoyed the experience?</span>
              </div>

              <h3 className="font-black text-white leading-tight mb-2" style={{ fontSize: '1.2rem' }}>
                Create your own live sessions - free
              </h3>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Register now and get <span className="font-bold" style={{ color: '#53d8d1' }}>Basic plan free for 3 months</span>. No credit card needed.
              </p>

              <a
                href="https://live-zapp.com/register?promo=8PNJX48R"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-black text-base transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #650cd9, #4c1d95)',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 20px rgba(101,12,217,0.35)',
                  textDecoration: 'none',
                }}
              >
                Register Free <ArrowRight className="w-4 h-4" />
              </a>

              <p className="text-center text-[11px] mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Offer auto-applied - No card required - Cancel anytime
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // â”€â”€ Name entry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!participantName || !hasJoined) {
    return (
      <AnimatePresence mode="wait">
        <NameEntryScreen
          key="name-entry"
          sessionTitle={session.title}
          participantCount={participantCount}
          nameInput={nameInput}
          setNameInput={setNameInput}
          onJoin={handleJoin}
          isJoining={isJoining}
          brandLogoUrl={session.brandLogoUrl}
          brandName={session.brandName}
          theme={theme}
        />
      </AnimatePresence>
    )
  }

  // â”€â”€ Waiting for presenter to start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!session.hasStarted) {
    return (
      <AnimatePresence mode="wait">
        <WaitScreen
          key="wait"
          name={participantName}
          sessionTitle={session.title}
          participantCount={participantCount}
          brandLogoUrl={session.brandLogoUrl}
          brandName={session.brandName}
          theme={theme}
        />
      </AnimatePresence>
    )
  }

  if (!currentQ) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: mix(theme.accent, '#FFFFFF', 0.965) }}>
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 animate-spin mx-auto" style={{ borderColor: theme.accentRing, borderTopColor: theme.accent }} />
          <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>Loading the next question...</p>
        </div>
      </div>
    )
  }

  // â”€â”€ Active session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="min-h-screen flex flex-col" style={{ background: mix(theme.accent, '#FFFFFF', 0.965) }}>

      {/* Compact top bar */}
      <div
        className="w-full shrink-0"
        style={{ background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid rgba(0,0,0,0.06)', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-xl mx-auto w-full flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <BrandLockup href="/" size="sm" theme="light" />
            <p className="text-sm font-semibold truncate max-w-[180px]" style={{ color: '#1A1A2E' }}>{session.title}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {participantName && (
              <span className="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: theme.accentSoft, color: theme.accentStrong }}>
                {participantName}
              </span>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: theme.accent }}>
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: theme.accentText }}>Live</span>
            </div>
            {currentQ?.kind === 'quiz' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: quizRevealCorrectAnswer ? 'rgba(34,197,94,0.14)' : quizAnswerLocked ? 'rgba(251,191,36,0.16)' : theme.accentSoft, color: quizRevealCorrectAnswer ? '#15803d' : quizAnswerLocked ? '#92400e' : theme.accentStrong }}>
                <span className="text-[9px] font-black uppercase tracking-widest">
                  {quizRevealCorrectAnswer ? 'Answer revealed' : quizAnswerLocked ? 'Closed' : formatCountdown(quizTimeRemainingMs)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress strip */}
      {questions.length > 0 && (
        <div className="flex gap-0.5 shrink-0">
          {questions.map((_, i) => (
            <div key={i} className="flex-1 h-1 transition-all duration-500" style={{ background: i < session.currentQuestionIndex ? theme.accent : i === session.currentQuestionIndex ? theme.accentRing : '#E5E7EB' }} />
          ))}
        </div>
      )}

      {/* Question content */}
      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full min-h-0 overflow-hidden px-4 sm:px-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={`q-${currentQ.id}-${session.currentQuestionIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.28 }}
            className="flex-1 flex flex-col min-h-0"
            onAnimationComplete={() => {
              if (typeof document !== 'undefined') {
                const header = document.querySelector('[data-question-header]')
                header?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            }}
          >
            {/* Question header â€” full-width brand color band */}
            <div className="px-5 pt-7 pb-8 shrink-0" data-question-header style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentGradientTo})` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.16)' }}>
                  <KindIcon className="w-3.5 h-3.5" style={{ color: theme.accentText }} />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.accentText }}>{currentQ.kind.replace('_', ' ')}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: theme.accentText, opacity: 0.7 }}>
                  {session.currentQuestionIndex + 1} / {questions.length}
                </span>
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: theme.accentText, lineHeight: 1.3, letterSpacing: '-0.02em' }}>
                {currentQ.prompt || <span style={{ opacity: 0.55, fontStyle: 'italic' }}>Waiting for question...</span>}
              </h2>
            </div>

            {/* Response area */}
            <div className="flex-1 overflow-y-auto px-5 pt-6 pb-8">
              {isAnswered && currentQ.kind !== 'quiz' ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-14 text-center">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)', border: '1.5px solid rgba(34,197,94,0.25)' }}>
                    <CheckCircle2 className="w-10 h-10" style={{ color: '#16A34A' }} />
                  </div>
                  <p className="text-lg font-bold" style={{ color: '#374151' }}>Answer submitted!</p>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>Waiting for next question...</p>
                </motion.div>
              ) : (
                <>
                  {currentQ.kind === 'quiz'       && <QuizView      question={currentQ as QuizQuestion}      onSubmit={a => handleSubmit(currentQ, a)} submitted={isAnswered} submittedAnswer={typeof submittedAnswer === 'string' ? submittedAnswer : null} locked={quizAnswerLocked} revealCorrectAnswer={quizRevealCorrectAnswer} timeRemainingMs={quizTimeRemainingMs} theme={theme} errorMessage={submissionError} />}
                  {currentQ.kind === 'poll'       && <PollView      question={currentQ as PollQuestion}      onSubmit={a => handleSubmit(currentQ, a)} submitted={isAnswered} theme={theme} />}
                  {currentQ.kind === 'word_cloud' && <WordCloudView question={currentQ as WordCloudQuestion} onSubmit={a => handleSubmit(currentQ, a)} submittedCount={wordCloudSubmittedCount[currentQ.id] ?? 0} theme={theme} />}
                  {currentQ.kind === 'qa'         && <QAView        question={currentQ as QAQuestion}        onSubmit={a => handleSubmit(currentQ, a)} submitted={isAnswered} theme={theme} />}
                  {currentQ.kind === 'feedback'   && <FeedbackView  question={currentQ as FeedbackQuestion}  onSubmit={a => handleSubmit(currentQ, a)} submitted={isAnswered} theme={theme} />}
                  {currentQ.kind !== 'quiz' && submissionError && (
                    <div className="rounded-2xl px-4 py-3 text-sm font-semibold mt-4" style={{ background: 'rgba(239,68,68,0.10)', color: '#B91C1C', border: '1px solid rgba(239,68,68,0.18)' }}>
                      {submissionError}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}


