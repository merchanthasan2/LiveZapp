'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Sparkles, BarChart3, Cloud,
  MessageSquare, Star, Send, Zap, ArrowRight, Users,
} from 'lucide-react'
import Image from 'next/image'
import { LiveSessionService, LiveSessionData, ParticipantResponse } from '@/lib/services/LiveSessionService'
import type {
  Question, QuizQuestion, PollQuestion,
  FeedbackQuestion, QAQuestion, WordCloudQuestion,
} from '@/types/domain'

// ─── Helpers ──────────────────────────────────────────────────────────────

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

const KIND_META: Record<string, { bg: string; text: string; accent: string }> = {
  quiz:       { bg: '#00A6A6', text: '#FFFFFF', accent: '#00A6A6' },
  poll:       { bg: '#F08700', text: '#FFFFFF', accent: '#F08700' },
  word_cloud: { bg: '#EFCA08', text: '#1A1A2E', accent: '#8A7000' },
  qa:         { bg: '#00A6A6', text: '#FFFFFF', accent: '#00A6A6' },
  feedback:   { bg: '#F49F0A', text: '#1A1A2E', accent: '#C07800' },
}

// ─── Response components ──────────────────────────────────────────────────

function QuizView({ question, onSubmit, submitted }: {
  question: QuizQuestion; onSubmit: (a: string) => void; submitted: boolean
}) {
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      {question.options.map((opt, i) => (
        <button
          key={opt.id}
          disabled={submitted}
          onClick={() => !submitted && setSelected(opt.id)}
          className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
          style={{
            background: selected === opt.id ? 'rgba(0,166,166,0.10)' : '#FFFFFF',
            border: `2px solid ${selected === opt.id ? '#00A6A6' : '#E5E7EB'}`,
            boxShadow: selected === opt.id ? '0 0 0 3px rgba(0,166,166,0.12)' : 'none',
            opacity: submitted ? 0.65 : 1,
          }}
        >
          <span className="w-9 h-9 rounded-xl text-sm font-black flex items-center justify-center shrink-0" style={{ background: selected === opt.id ? '#00A6A6' : '#F5F7FA', color: selected === opt.id ? '#FFFFFF' : '#9CA3AF' }}>
            {String.fromCharCode(65 + i)}
          </span>
          <span className="text-base font-medium" style={{ color: '#1A1A2E' }}>{opt.label}</span>
        </button>
      ))}
      {!submitted && (
        <button disabled={!selected} onClick={() => selected && onSubmit(selected)} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base mt-3 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: '#00A6A6', color: '#FFFFFF' }}>
          Submit answer <Send className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function PollView({ question, onSubmit, submitted }: {
  question: PollQuestion; onSubmit: (a: string[]) => void; submitted: boolean
}) {
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (id: string) => {
    if (!question.allowMultipleSelections) setSelected([id])
    else setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#9CA3AF' }}>
        {question.allowMultipleSelections ? 'Select all that apply' : 'Choose one'}
      </p>
      {question.options.map(opt => {
        const isSelected = selected.includes(opt.id)
        return (
          <button key={opt.id} disabled={submitted} onClick={() => !submitted && toggle(opt.id)} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.98]" style={{ background: isSelected ? 'rgba(240,135,0,0.08)' : '#FFFFFF', border: `2px solid ${isSelected ? '#F08700' : '#E5E7EB'}`, boxShadow: isSelected ? '0 0 0 3px rgba(240,135,0,0.10)' : 'none', opacity: submitted ? 0.65 : 1 }}>
            <span className="w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all" style={{ borderColor: isSelected ? '#F08700' : '#D1D5DB', background: isSelected ? '#F08700' : 'transparent' }}>
              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </span>
            <span className="text-base font-medium" style={{ color: isSelected ? '#F08700' : '#1A1A2E' }}>{opt.label}</span>
          </button>
        )
      })}
      {!submitted && (
        <button disabled={selected.length === 0} onClick={() => onSubmit(selected)} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base mt-3 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: '#F08700', color: '#FFFFFF' }}>
          Submit <Send className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function WordCloudView({ question, onSubmit, submitted }: {
  question: WordCloudQuestion; onSubmit: (a: string[]) => void; submitted: boolean
}) {
  const max = question.maxWordsPerResponse
  const [added, setAdded] = useState<string[]>([])
  const [current, setCurrent] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const atMax = added.length >= max
  const canAdd = current.trim().length > 0 && !atMax
  function addWord() {
    const w = current.trim(); if (!w || atMax) return
    setAdded(prev => [...prev, w]); setCurrent(''); inputRef.current?.focus()
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Add up to {max} word{max > 1 ? 's' : ''}</p>
        <span className="text-sm font-bold" style={{ color: added.length >= max ? '#F08700' : '#9CA3AF' }}>{added.length}/{max}</span>
      </div>
      {added.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {added.map((w, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(239,202,8,0.18)', border: '1.5px solid rgba(239,202,8,0.45)', color: '#8A7000' }}>
              {w}
              {!submitted && <button onClick={() => setAdded(prev => prev.filter((_, idx) => idx !== i))} className="font-bold" style={{ color: '#8A7000' }}>×</button>}
            </span>
          ))}
        </div>
      )}
      {!submitted && !atMax && (
        <div className="flex gap-2">
          <input ref={inputRef} type="text" maxLength={30} placeholder={added.length === 0 ? 'Type a word or phrase…' : 'Add another…'} value={current} autoFocus onChange={e => setCurrent(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addWord() } }} className="flex-1 px-4 py-3.5 rounded-xl text-base outline-none transition-all" style={{ background: '#FFFFFF', border: '2px solid #E5E7EB', color: '#1A1A2E', fontSize: '1rem' }} onFocus={e => { e.currentTarget.style.borderColor = '#EFCA08' }} onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB' }} />
          <button disabled={!canAdd} onClick={addWord} className="px-5 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40" style={{ background: 'rgba(239,202,8,0.18)', color: '#8A7000', border: '2px solid rgba(239,202,8,0.40)' }}>Add</button>
        </div>
      )}
      {!submitted && (
        <button disabled={added.length === 0} onClick={() => onSubmit(added)} className="w-full py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2" style={{ background: '#EFCA08', color: '#1A1A2E' }}>
          Submit {added.length} word{added.length !== 1 ? 's' : ''} <Send className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function QAView({ onSubmit, submitted }: { question: QAQuestion; onSubmit: (a: string) => void; submitted: boolean }) {
  const [text, setText] = useState('')
  return (
    <div className="space-y-3">
      <textarea rows={4} placeholder="Type your response here…" disabled={submitted} value={text} onChange={e => setText(e.target.value)} className="w-full px-4 py-4 rounded-xl text-base outline-none resize-none transition-all" style={{ background: '#FFFFFF', border: '2px solid #E5E7EB', color: '#1A1A2E', fontSize: '1rem', lineHeight: 1.5 }} onFocus={e => { e.currentTarget.style.borderColor = '#00A6A6' }} onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB' }} />
      {!submitted && (
        <button disabled={!text.trim()} onClick={() => onSubmit(text.trim())} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: '#00A6A6', color: '#FFFFFF' }}>
          Submit <Send className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function FeedbackView({ question, onSubmit, submitted }: { question: FeedbackQuestion; onSubmit: (a: string | number) => void; submitted: boolean }) {
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const max = question.scaleMax ?? 5
  if (question.feedbackType === 'rating') {
    return (
      <div className="space-y-6">
        <div className="flex gap-2 justify-center flex-wrap">
          {Array.from({ length: max }, (_, i) => i + 1).map(n => (
            <button key={n} disabled={submitted} onClick={() => setRating(n)} className="w-14 h-14 rounded-2xl font-black text-2xl transition-all active:scale-95" style={{ background: rating >= n ? '#F49F0A' : '#F5F7FA', border: `2px solid ${rating >= n ? '#F49F0A' : '#E5E7EB'}`, boxShadow: rating >= n ? '0 0 0 3px rgba(244,159,10,0.15)' : 'none' }}>★</button>
          ))}
        </div>
        {rating > 0 && !submitted && <p className="text-center text-sm font-bold" style={{ color: '#F49F0A' }}>{rating} / {max} stars selected</p>}
        {!submitted && <button disabled={rating === 0} onClick={() => onSubmit(rating)} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40" style={{ background: '#F49F0A', color: '#1A1A2E' }}>Submit rating <Send className="w-4 h-4" /></button>}
      </div>
    )
  }
  if (question.feedbackType === 'multiple_choice' && question.options) {
    return (
      <div className="space-y-3">
        {question.options.map(opt => (
          <button key={opt.id} disabled={submitted} onClick={() => setSelected(opt.id)} className="w-full px-4 py-4 rounded-2xl text-base font-medium text-left transition-all active:scale-[0.98]" style={{ background: selected === opt.id ? 'rgba(244,159,10,0.10)' : '#FFFFFF', border: `2px solid ${selected === opt.id ? '#F49F0A' : '#E5E7EB'}`, color: selected === opt.id ? '#C07800' : '#1A1A2E' }}>
            {opt.label}
          </button>
        ))}
        {!submitted && <button disabled={!selected} onClick={() => selected && onSubmit(selected)} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base mt-2 transition-all disabled:opacity-40" style={{ background: '#F49F0A', color: '#1A1A2E' }}>Submit <Send className="w-4 h-4" /></button>}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <textarea rows={question.feedbackType === 'long_text' ? 5 : 3} placeholder="Your response…" disabled={submitted} value={text} onChange={e => setText(e.target.value)} className="w-full px-4 py-4 rounded-xl text-base outline-none resize-none" style={{ background: '#FFFFFF', border: '2px solid #E5E7EB', color: '#1A1A2E', fontSize: '1rem' }} onFocus={e => { e.currentTarget.style.borderColor = '#F49F0A' }} onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB' }} />
      {!submitted && <button disabled={!text.trim()} onClick={() => onSubmit(text.trim())} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40" style={{ background: '#F49F0A', color: '#1A1A2E' }}>Submit <Send className="w-4 h-4" /></button>}
    </div>
  )
}

// ─── Name entry screen ────────────────────────────────────────────────────

function NameEntryScreen({
  sessionTitle, participantCount, nameInput, setNameInput, onJoin, isJoining,
  brandLogoUrl, brandName,
}: {
  sessionTitle: string
  participantCount: number
  nameInput: string
  setNameInput: (v: string) => void
  onJoin: () => void
  isJoining: boolean
  brandLogoUrl?: string
  brandName?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #E8F8F8 0%, #F0F9FF 50%, #FFF8EE 100%)' }}
    >
      {/* Top brand strip */}
      <div className="flex items-center justify-between px-5 pt-safe pt-5 pb-3">
        <div className="flex items-center gap-2">
          {brandLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brandLogoUrl} alt={brandName || 'Brand'} className="h-8 w-auto object-contain max-w-[120px]" />
          ) : (
            <>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#00A6A6' }}>
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold" style={{ color: '#1A1A2E' }}>LiveZapp</span>
            </>
          )}
        </div>
        {participantCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(0,166,166,0.10)', color: '#00A6A6' }}>
            <Users className="w-3 h-3" />
            {participantCount} joined
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-10 max-w-md mx-auto w-full">

        {/* Session badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex flex-col items-center text-center gap-3"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-1"
            style={{ background: 'rgba(0,166,166,0.12)', border: '1.5px solid rgba(0,166,166,0.20)' }}
          >
            <Zap className="w-8 h-8" style={{ color: '#00A6A6' }} />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: '#9CA3AF' }}>You&rsquo;re joining</p>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1A1A2E', lineHeight: 1.3 }}>
            {sessionTitle}
          </h2>
        </motion.div>

        {/* Name form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: '#374151' }}>
              What&rsquo;s your name?
            </label>
            <input
              ref={inputRef}
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && nameInput.trim()) onJoin() }}
              placeholder="Enter your name…"
              maxLength={40}
              autoComplete="given-name"
              style={{
                width: '100%',
                padding: '1rem 1.25rem',
                borderRadius: '1rem',
                border: '2px solid #E5E7EB',
                fontSize: '1.1rem',
                fontWeight: 600,
                color: '#1A1A2E',
                background: '#FFFFFF',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#00A6A6' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB' }}
            />
          </div>

          <button
            disabled={!nameInput.trim() || isJoining}
            onClick={onJoin}
            className="w-full flex items-center justify-center gap-3 rounded-2xl font-black text-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#00A6A6', color: '#FFFFFF', padding: '1.1rem', boxShadow: '0 4px 20px rgba(0,166,166,0.30)' }}
          >
            {isJoining ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Joining…
              </span>
            ) : (
              <>Join session <ArrowRight className="w-5 h-5" /></>
            )}
          </button>

          <p className="text-center text-xs" style={{ color: '#9CA3AF' }}>
            No account needed · Join as a guest
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Wait screen ──────────────────────────────────────────────────────────

function WaitScreen({ name, sessionTitle, participantCount }: {
  name: string
  sessionTitle: string
  participantCount: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
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
              border: '1.5px solid rgba(0,166,166,0.20)',
            }}
            animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center z-10"
          style={{ background: 'rgba(0,166,166,0.15)', border: '1.5px solid rgba(0,166,166,0.35)' }}
        >
          <Zap className="w-8 h-8" style={{ color: '#00A6A6' }} />
        </div>
      </div>

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-3 mb-8"
      >
        <p style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
          Hey {name}! 👋
        </p>
        <p className="text-base font-medium" style={{ color: 'rgba(255,255,255,0.50)' }}>
          You&rsquo;re all set for
        </p>
        <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#00A6A6' }}>
          {sessionTitle}
        </p>
      </motion.div>

      {/* Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-5"
      >
        <div
          className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <motion.div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: '#F08700' }}
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Waiting for the presenter to start Zapp-ing…
          </span>
        </div>

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
              style={{ background: '#00A6A6' }}
              animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main participant page ─────────────────────────────────────────────────

export default function ParticipantPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const participantId = useRef(getParticipantId())

  const [session,          setSession]          = useState<LiveSessionData | null>(null)
  const [isLoading,        setIsLoading]         = useState(true)
  const [error,            setError]             = useState('')
  const [answered,         setAnswered]          = useState<Record<string, boolean>>({})
  const [participantCount, setParticipantCount]  = useState(0)

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

  // Subscribe to session (always — to get title before name entry)
  useEffect(() => {
    const unsub = LiveSessionService.subscribeToSession(code, data => {
      if (!data) { setError('Session not found.'); setIsLoading(false); return }
      if (data.currentQuestionIndex !== prevIndexRef.current) {
        prevIndexRef.current = data.currentQuestionIndex
      }
      setSession(data)
      setIsLoading(false)
    })
    const unsubP = LiveSessionService.subscribeToParticipants(code, setParticipantCount)
    return () => { unsub(); unsubP() }
  }, [code])

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

  const handleSubmit = async (questionId: string, answer: string | string[] | number) => {
    const response: ParticipantResponse = { answer, submittedAt: new Date().toISOString() }
    await LiveSessionService.submitResponse(code, questionId, participantId.current, response)
    setAnswered(prev => ({ ...prev, [questionId]: true }))
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1117' }}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 animate-spin mx-auto" style={{ borderColor: 'rgba(0,166,166,0.20)', borderTopColor: '#00A6A6' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Connecting…</p>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────
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

  // ── Paused ────────────────────────────────────────────────────────────
  if (session.isPaused) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFFFFF' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-5 px-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(0,166,166,0.10)', border: '1.5px solid rgba(0,166,166,0.20)' }}>
              <span style={{ fontSize: '2.5rem' }}>⏸</span>
            </div>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1A1A2E' }}>Session paused</h2>
          <p className="text-base" style={{ color: '#6B7280' }}>The presenter will resume shortly. Please stand by.</p>
          <div className="flex gap-1.5 justify-center mt-4">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: '#00A6A6' }} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }} />
            ))}
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Session ended ──────────────────────────────────────────────────────
  if (!session.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F5F7FA' }}>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-5 max-w-sm">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.20)' }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: '#16A34A' }} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1A1A2E' }}>Session ended</h2>
          <p className="text-base" style={{ color: '#6B7280' }}>
            Thanks for participating in <strong style={{ color: '#1A1A2E' }}>{session.title}</strong>!
            {participantName && <> Great job, <strong>{participantName}</strong>!</>}
          </p>
          <button onClick={() => router.push('/join')} className="btn-primary mx-auto">Join another session</button>
        </motion.div>
      </div>
    )
  }

  const questions: Question[] = session.questions ?? []
  const currentQ   = questions[session.currentQuestionIndex]
  const isAnswered = currentQ ? !!answered[currentQ.id] : false
  const KindIcon   = currentQ ? (KIND_ICON[currentQ.kind] ?? Sparkles) : Sparkles
  const kindMeta   = currentQ ? (KIND_META[currentQ.kind] ?? KIND_META.quiz) : KIND_META.quiz

  // ── Name entry ────────────────────────────────────────────────────────
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
        />
      </AnimatePresence>
    )
  }

  // ── Waiting for presenter to start ────────────────────────────────────
  if (!session.hasStarted) {
    return (
      <AnimatePresence mode="wait">
        <WaitScreen
          key="wait"
          name={participantName}
          sessionTitle={session.title}
          participantCount={participantCount}
        />
      </AnimatePresence>
    )
  }

  // ── Active session ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F7FA' }}>

      {/* Compact top bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid rgba(0,0,0,0.06)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: '#00A6A6' }}>
            <Zap className="w-3 h-3 text-white" />
          </div>
          <p className="text-sm font-semibold truncate max-w-[180px]" style={{ color: '#1A1A2E' }}>{session.title}</p>
        </div>
        <div className="flex items-center gap-2">
          {participantName && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,166,166,0.10)', color: '#00A6A6' }}>
              {participantName}
            </span>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: '#F08700' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[9px] font-black text-white uppercase tracking-widest">Live</span>
          </div>
        </div>
      </div>

      {/* Progress strip */}
      {questions.length > 0 && (
        <div className="flex gap-0.5 shrink-0">
          {questions.map((_, i) => (
            <div key={i} className="flex-1 h-1 transition-all duration-500" style={{ background: i < session.currentQuestionIndex ? '#00A6A6' : i === session.currentQuestionIndex ? 'rgba(0,166,166,0.45)' : '#E5E7EB' }} />
          ))}
        </div>
      )}

      {/* Question content */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={`q-${currentQ.id}-${session.currentQuestionIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.28 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Question header — full-width brand color band */}
            <div className="px-5 pt-7 pb-8 shrink-0" style={{ background: kindMeta.bg }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.18)' }}>
                  <KindIcon className="w-3.5 h-3.5" style={{ color: kindMeta.text }} />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: kindMeta.text }}>{currentQ.kind.replace('_', ' ')}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: kindMeta.text, opacity: 0.65 }}>
                  {session.currentQuestionIndex + 1} / {questions.length}
                </span>
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: kindMeta.text, lineHeight: 1.3, letterSpacing: '-0.02em' }}>
                {currentQ.prompt || <span style={{ opacity: 0.55, fontStyle: 'italic' }}>Waiting for question…</span>}
              </h2>
            </div>

            {/* Response area */}
            <div className="flex-1 overflow-y-auto px-5 pt-6 pb-8">
              {isAnswered ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-14 text-center">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)', border: '1.5px solid rgba(34,197,94,0.25)' }}>
                    <CheckCircle2 className="w-10 h-10" style={{ color: '#16A34A' }} />
                  </div>
                  <p className="text-lg font-bold" style={{ color: '#374151' }}>Answer submitted!</p>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>Waiting for next question…</p>
                </motion.div>
              ) : (
                <>
                  {currentQ.kind === 'quiz'       && <QuizView      question={currentQ as QuizQuestion}      onSubmit={a => handleSubmit(currentQ.id, a)} submitted={isAnswered} />}
                  {currentQ.kind === 'poll'       && <PollView      question={currentQ as PollQuestion}      onSubmit={a => handleSubmit(currentQ.id, a)} submitted={isAnswered} />}
                  {currentQ.kind === 'word_cloud' && <WordCloudView question={currentQ as WordCloudQuestion} onSubmit={a => handleSubmit(currentQ.id, a)} submitted={isAnswered} />}
                  {currentQ.kind === 'qa'         && <QAView        question={currentQ as QAQuestion}        onSubmit={a => handleSubmit(currentQ.id, a)} submitted={isAnswered} />}
                  {currentQ.kind === 'feedback'   && <FeedbackView  question={currentQ as FeedbackQuestion}  onSubmit={a => handleSubmit(currentQ.id, a)} submitted={isAnswered} />}
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
