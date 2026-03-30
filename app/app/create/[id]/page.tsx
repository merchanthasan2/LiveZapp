'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Save, Play, Plus, Trash2, Layout, Clock,
  CheckCircle2, AlertCircle, HelpCircle, BarChart3,
  MessageSquare, Sparkles, Eye, X, Star, Cloud,
  ToggleLeft, ChevronRight, RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { PresentationService } from '@/lib/services/PresentationService'
import { QuestionService } from '@/lib/services/QuestionService'
import { PLANS } from '@/types/plans'
import { QuestionEditor } from '@/components/question-editor/QuestionEditor'
import { makeQuestion } from '@/components/question-editor/makeQuestion'
import { Q_TYPES, kindMeta, PREVIEW_META } from '@/components/question-editor/qtypes'
import type { QuestionKind } from '@/components/question-editor/qtypes'
import type {
  Presentation, Question,
  QuizQuestion, QAQuestion, FeedbackQuestion,
  PollQuestion, WordCloudQuestion,
} from '@/types/domain'

// ─── Type picker modal ────────────────────────────────────────────────────

function TypePickerModal({ onPick, onClose }: {
  onPick: (kind: QuestionKind) => void
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="glass-card p-6 w-full max-w-lg space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold" style={{ color: '#1A1A2E' }}>Add a question</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Choose the interaction type</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-all"
            style={{ color: '#9CA3AF' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Q_TYPES.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.kind}
                onClick={() => onPick(t.kind)}
                className="flex items-start gap-3 p-4 rounded-2xl text-left transition-all hover:-translate-y-0.5"
                style={{ background: '#F5F7FA', border: '1px solid #E5E7EB' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = t.bg
                  e.currentTarget.style.borderColor = t.border.replace('0.22', '0.45').replace('0.28', '0.45').replace('0.26', '0.45')
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#F5F7FA'
                  e.currentTarget.style.borderColor = '#E5E7EB'
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: t.bg }}>
                  <Icon className="w-4 h-4" style={{ color: t.color }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#1A1A2E' }}>{t.label}</p>
                  <p className="text-[11px] leading-snug mt-0.5" style={{ color: '#6B7280' }}>{t.sub}</p>
                </div>
              </button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Participant preview (intentionally dark — simulates participant screen) ─

function QuestionPreview({ question }: { question: Question }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [multiSelected, setMultiSelected] = useState<string[]>([])
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')

  useEffect(() => {
    setSelected(null); setMultiSelected([]); setRating(0); setText('')
  }, [question.id])

  const meta = kindMeta(question.kind as QuestionKind)
  const pm   = PREVIEW_META[question.kind] ?? PREVIEW_META.quiz
  const mockWords = ['Innovative', 'Engaging', 'Fun', 'Clear', 'Inspiring', 'Creative', 'Useful', 'Insightful']

  return (
    <div className="flex flex-col h-full rounded-2xl overflow-hidden" style={{ background: '#0D1117' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#22C55E' }}>Live</span>
        </div>
        <span
          className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
          style={{ background: pm.bg, color: pm.color }}
        >
          {meta.label}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-5 py-5 space-y-4 overflow-y-auto scrollbar-hide">
        <p className="text-base font-bold text-white leading-snug">
          {question.prompt || <span className="italic" style={{ color: 'rgba(255,255,255,0.25)' }}>Question text will appear here</span>}
        </p>

        {/* Quiz */}
        {question.kind === 'quiz' && (
          <div className="space-y-2">
            {(question as QuizQuestion).options.map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => setSelected(opt.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all"
                style={{
                  background: selected === opt.id ? pm.bg : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selected === opt.id ? pm.selectedBorder : 'rgba(255,255,255,0.08)'}`,
                  color: selected === opt.id ? '#fff' : 'rgba(255,255,255,0.65)',
                }}
              >
                <span
                  className="w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center flex-shrink-0"
                  style={{
                    background: selected === opt.id ? pm.color : 'rgba(255,255,255,0.08)',
                    color: selected === opt.id ? '#fff' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                {opt.label}
              </button>
            ))}
            <div className="flex items-center justify-between text-[10px] pt-1" style={{ color: 'rgba(255,255,255,0.30)' }}>
              <span><Clock className="w-3 h-3 inline mr-1" />{(question as QuizQuestion).timerSeconds}s</span>
              <span>{(question as QuizQuestion).points} pts</span>
            </div>
          </div>
        )}

        {/* Poll */}
        {question.kind === 'poll' && (
          <div className="space-y-2">
            {(question as PollQuestion).options.map((opt, i) => {
              const isSelected = multiSelected.includes(opt.id)
              const pct = [42, 31, 27][i] ?? 20
              return (
                <button
                  key={opt.id}
                  onClick={() => setMultiSelected(prev => isSelected ? prev.filter(x => x !== opt.id) : [...prev, opt.id])}
                  className="w-full text-left rounded-xl overflow-hidden relative transition-all"
                  style={{ border: `1px solid ${isSelected ? pm.selectedBorder : 'rgba(255,255,255,0.08)'}` }}
                >
                  <div className="absolute inset-0 rounded-xl" style={{ width: `${pct}%`, background: pm.bg }} />
                  <div className="relative flex items-center justify-between px-3 py-2.5">
                    <span className="text-sm font-medium" style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.65)' }}>{opt.label}</span>
                    <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>{pct}%</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Word cloud */}
        {question.kind === 'word_cloud' && (
          <div className="space-y-3">
            <input
              placeholder="Type a word…"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${pm.selectedBorder}`, color: '#fff' }}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {mockWords.map((w, i) => (
                <span
                  key={w}
                  className="px-2.5 py-1 rounded-lg font-bold"
                  style={{
                    fontSize: `${11 + (mockWords.length - i) * 1.5}px`,
                    color: pm.color,
                    opacity: 0.4 + (mockWords.length - i) * 0.07,
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Q&A */}
        {question.kind === 'qa' && (
          <textarea
            rows={3}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Ask your question…"
            className="w-full p-3 rounded-xl text-sm resize-none outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${pm.selectedBorder}`, color: '#fff' }}
          />
        )}

        {/* Feedback — rating */}
        {question.kind === 'feedback' && (question as FeedbackQuestion).feedbackType === 'rating' && (
          <div className="flex items-center justify-center gap-2 py-2">
            {Array.from({ length: (question as FeedbackQuestion).scaleMax ?? 5 }).map((_, i) => (
              <button key={i} onClick={() => setRating(i + 1)}>
                <Star className={`w-7 h-7 transition-all`} style={{ color: i < rating ? '#F49F0A' : 'rgba(255,255,255,0.20)', fill: i < rating ? '#F49F0A' : 'transparent' }} />
              </button>
            ))}
          </div>
        )}

        {/* Feedback — text */}
        {question.kind === 'feedback' && ['short_text', 'long_text'].includes((question as FeedbackQuestion).feedbackType) && (
          <textarea
            rows={(question as FeedbackQuestion).feedbackType === 'long_text' ? 4 : 2}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Your response…"
            className="w-full p-3 rounded-xl text-sm resize-none outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${pm.selectedBorder}`, color: '#fff' }}
          />
        )}

        {/* Submit */}
        <button
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: pm.color, color: question.kind === 'word_cloud' || question.kind === 'feedback' ? '#1A1A2E' : '#FFFFFF' }}
        >
          Submit
        </button>
      </div>

      <div className="px-4 pb-3 text-center">
        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.20)' }}>Participant preview</p>
      </div>
    </div>
  )
}

// ─── (QuestionEditor is imported from @/components/question-editor/QuestionEditor) ───────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _QuestionEditorInline_UNUSED({
  question, questions, setQuestions, markDirty,
}: {
  question: Question
  questions: Question[]
  setQuestions: (q: Question[]) => void
  markDirty: () => void
}) {
  const meta = kindMeta(question.kind as QuestionKind)

  function patch(updates: Partial<Question>) {
    setQuestions(questions.map(q => q.id === question.id ? { ...q, ...updates } as Question : q))
    markDirty()
  }

  const inputStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    color: '#1A1A2E',
    padding: '10px 14px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }
  const focus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = meta.color
    e.currentTarget.style.boxShadow = `0 0 0 3px ${meta.bg}`
  }
  const blur  = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#E5E7EB'
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <div className="flex-1 overflow-y-auto p-7 space-y-7 scrollbar-hide">

      {/* Prompt */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Question prompt</label>
        <textarea
          rows={2}
          placeholder="Type your question here…"
          value={question.prompt}
          onChange={e => patch({ prompt: e.target.value })}
          className="w-full text-xl font-bold bg-transparent border-none focus:ring-0 resize-none outline-none"
          style={{ color: '#1A1A2E' }}
        />
        <div className="h-px" style={{ background: `linear-gradient(90deg, ${meta.color}50, transparent)` }} />
      </div>

      {/* ── Quiz ─── */}
      {question.kind === 'quiz' && (
        <div className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Answer options</label>
          <div className="space-y-2">
            {(question as QuizQuestion).options.map((opt, i) => {
              const isCorrect = (question as QuizQuestion).correctOptionId === opt.id
              return (
                <div key={opt.id} className="flex items-center gap-2">
                  <button
                    title={isCorrect ? 'Correct' : 'Mark correct'}
                    onClick={() => patch({ correctOptionId: opt.id } as Partial<QuizQuestion>)}
                    className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center transition-all"
                    style={{ background: isCorrect ? '#22C55E' : 'rgba(0,0,0,0.06)', color: isCorrect ? '#fff' : '#9CA3AF' }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                  <input
                    style={inputStyle}
                    value={opt.label}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    onFocus={focus} onBlur={blur}
                    onChange={e => {
                      const q = { ...(question as QuizQuestion) }
                      q.options = q.options.map(o => o.id === opt.id ? { ...o, label: e.target.value } : o)
                      patch(q as Partial<Question>)
                    }}
                  />
                  {(question as QuizQuestion).options.length > 2 && (
                    <button
                      onClick={() => {
                        const q = { ...(question as QuizQuestion) }
                        q.options = q.options.filter(o => o.id !== opt.id)
                        if (q.correctOptionId === opt.id) q.correctOptionId = q.options[0]?.id ?? ''
                        patch(q as Partial<Question>)
                      }}
                      className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                      style={{ color: '#D1D5DB' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {(question as QuizQuestion).options.length < 6 && (
            <button
              onClick={() => {
                const q = { ...(question as QuizQuestion) }
                const newId = `opt_${Math.random().toString(36).substring(2, 6)}`
                q.options = [...q.options, { id: newId, label: `Option ${String.fromCharCode(65 + q.options.length)}` }]
                patch(q as Partial<Question>)
              }}
              className="text-xs font-bold px-4 py-2 rounded-xl transition-all"
              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
            >
              + Add option
            </button>
          )}
          {/* Timer + Points */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Timer</label>
              <select
                value={(question as QuizQuestion).timerSeconds}
                onChange={e => patch({ timerSeconds: +e.target.value } as Partial<QuizQuestion>)}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold outline-none"
                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1A1A2E' }}
              >
                {[10,15,20,30,45,60,90,120].map(s => <option key={s} value={s}>{s}s</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Points</label>
              <select
                value={(question as QuizQuestion).points}
                onChange={e => patch({ points: +e.target.value } as Partial<QuizQuestion>)}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold outline-none"
                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', color: '#1A1A2E' }}
              >
                {[50,100,200,500,1000].map(p => <option key={p} value={p}>{p} pts</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Poll ─── */}
      {question.kind === 'poll' && (
        <div className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Poll options</label>
          <div className="space-y-2">
            {(question as PollQuestion).options.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-2">
                <span className="text-[10px] font-black w-5 text-center flex-shrink-0" style={{ color: '#9CA3AF' }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <input
                  style={inputStyle}
                  value={opt.label}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  onFocus={focus} onBlur={blur}
                  onChange={e => {
                    const q = { ...(question as PollQuestion) }
                    q.options = q.options.map(o => o.id === opt.id ? { ...o, label: e.target.value } : o)
                    patch(q as Partial<Question>)
                  }}
                />
                {(question as PollQuestion).options.length > 2 && (
                  <button
                    onClick={() => {
                      const q = { ...(question as PollQuestion) }
                      q.options = q.options.filter(o => o.id !== opt.id)
                      patch(q as Partial<Question>)
                    }}
                    className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                    style={{ color: '#D1D5DB' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {(question as PollQuestion).options.length < 8 && (
            <button
              onClick={() => {
                const q = { ...(question as PollQuestion) }
                q.options = [...q.options, { id: `p_${Math.random().toString(36).substring(2,6)}`, label: `Option ${String.fromCharCode(65 + q.options.length)}` }]
                patch(q as Partial<Question>)
              }}
              className="text-xs font-bold px-4 py-2 rounded-xl transition-all"
              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
            >
              + Add option
            </button>
          )}
          {/* Multi-select toggle */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: '#F5F7FA', border: '1px solid #E5E7EB' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: '#374151' }}>Allow multiple selections</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>Participants can choose more than one option</p>
            </div>
            <button
              onClick={() => patch({ allowMultipleSelections: !(question as PollQuestion).allowMultipleSelections } as Partial<PollQuestion>)}
              className="relative rounded-full transition-all flex-shrink-0"
              style={{
                background: (question as PollQuestion).allowMultipleSelections ? '#F08700' : 'rgba(0,0,0,0.12)',
                minWidth: 40, height: 22,
              }}
            >
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: (question as PollQuestion).allowMultipleSelections ? '20px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
            </button>
          </div>
        </div>
      )}

      {/* ── Word Cloud ─── */}
      {question.kind === 'word_cloud' && (
        <div className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Settings</label>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" style={{ color: '#6B7280' }}>Max words per participant</label>
            <div className="flex gap-2">
              {[1, 2, 3, 5].map(n => (
                <button
                  key={n}
                  onClick={() => patch({ maxWordsPerResponse: n } as Partial<WordCloudQuestion>)}
                  className="w-10 h-10 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: (question as WordCloudQuestion).maxWordsPerResponse === n ? 'rgba(239,202,8,0.18)' : '#F5F7FA',
                    border: `1px solid ${(question as WordCloudQuestion).maxWordsPerResponse === n ? 'rgba(239,202,8,0.50)' : '#E5E7EB'}`,
                    color: (question as WordCloudQuestion).maxWordsPerResponse === n ? '#8A7000' : '#6B7280',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div
            className="p-4 rounded-xl text-xs leading-relaxed"
            style={{ background: 'rgba(239,202,8,0.06)', border: '1px solid rgba(239,202,8,0.20)', color: '#6B7280' }}
          >
            Participants type words or short phrases. The most common responses appear largest in the live word cloud.
          </div>
        </div>
      )}

      {/* ── Q&A ─── */}
      {question.kind === 'qa' && (
        <div className="space-y-4">
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: '#F5F7FA', border: '1px solid #E5E7EB' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: '#374151' }}>Allow multiple questions</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>Each participant can submit more than one question</p>
            </div>
            <button
              onClick={() => patch({ allowMultipleSubmissions: !(question as QAQuestion).allowMultipleSubmissions } as Partial<QAQuestion>)}
              style={{ background: (question as QAQuestion).allowMultipleSubmissions ? '#00A6A6' : 'rgba(0,0,0,0.12)', minWidth: 40, height: 22 }}
              className="relative rounded-full transition-all flex-shrink-0"
            >
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: (question as QAQuestion).allowMultipleSubmissions ? '20px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
            </button>
          </div>
        </div>
      )}

      {/* ── Feedback ─── */}
      {question.kind === 'feedback' && (
        <div className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Response type</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'rating',          label: '⭐ Rating scale' },
              { id: 'short_text',      label: '✏️ Short text' },
              { id: 'long_text',       label: '📝 Long text' },
              { id: 'multiple_choice', label: '🔘 Multiple choice' },
            ] as const).map(({ id: ft, label }) => (
              <button
                key={ft}
                onClick={() => patch({ feedbackType: ft } as Partial<FeedbackQuestion>)}
                className="p-3 rounded-xl text-xs font-bold text-left transition-all"
                style={{
                  background: (question as FeedbackQuestion).feedbackType === ft ? 'rgba(244,159,10,0.12)' : '#F5F7FA',
                  border: `1px solid ${(question as FeedbackQuestion).feedbackType === ft ? 'rgba(244,159,10,0.40)' : '#E5E7EB'}`,
                  color: (question as FeedbackQuestion).feedbackType === ft ? '#C07800' : '#6B7280',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {(question as FeedbackQuestion).feedbackType === 'rating' && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: '#F5F7FA', border: '1px solid #E5E7EB' }}
            >
              <span className="text-xs font-semibold flex-1" style={{ color: '#6B7280' }}>Scale max</span>
              <div className="flex gap-2">
                {[5, 7, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => patch({ scaleMax: n } as Partial<FeedbackQuestion>)}
                    className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: (question as FeedbackQuestion).scaleMax === n ? 'rgba(244,159,10,0.12)' : '#FFFFFF',
                      color: (question as FeedbackQuestion).scaleMax === n ? '#C07800' : '#6B7280',
                      border: `1px solid ${(question as FeedbackQuestion).scaleMax === n ? 'rgba(244,159,10,0.40)' : '#E5E7EB'}`,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function PresentationBuilderPage() {
  const params = useParams()
  const { user } = useAuth()
  const id = params.id as string

  const [presentation,       setPresentation]       = useState<Presentation | null>(null)
  const [questions,          setQuestions]          = useState<Question[]>([])
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [isLoading,          setIsLoading]          = useState(true)
  const [isSaving,           setIsSaving]           = useState(false)
  const [saveSuccess,        setSaveSuccess]        = useState(false)
  const [error,              setError]              = useState<string | null>(null)
  const [showPreview,        setShowPreview]        = useState(false)
  const [showTypePicker,     setShowTypePicker]     = useState(false)

  const currentPlan  = PLANS.find(p => p.id === user?.planId) ?? PLANS[0]
  const currentLimit = currentPlan.limits.maxQuestionsPerPresentation
  const isDirtyRef   = useRef(false)

  useEffect(() => {
    if (!id || !user) return
    ;(async () => {
      try {
        const pres = await PresentationService.getPresentation(id)
        if (!pres) { setError('Presentation not found'); return }
        setPresentation(pres)
        const qs = await QuestionService.getQuestionSet(id)
        if (qs?.questions?.length) {
          setQuestions(qs.questions)
          setSelectedQuestionId(qs.questions[0].id)
        }
      } catch { setError('Failed to load presentation') }
      finally   { setIsLoading(false) }
    })()
  }, [id, user])

  function handlePickType(kind: QuestionKind) {
    setShowTypePicker(false)
    if (questions.length >= currentLimit) {
      alert(`Your ${currentPlan.name} plan supports up to ${currentLimit} questions. Upgrade to add more.`)
      return
    }
    const q = makeQuestion(kind, questions.length)
    setQuestions(prev => [...prev, q])
    setSelectedQuestionId(q.id)
    isDirtyRef.current = true
  }

  function handleDelete(qId: string) {
    const updated = questions.filter(q => q.id !== qId).map((q, i) => ({ ...q, orderIndex: i }))
    setQuestions(updated as Question[])
    if (selectedQuestionId === qId) setSelectedQuestionId(updated[0]?.id ?? null)
    isDirtyRef.current = true
  }

  const handleSave = useCallback(async () => {
    if (!presentation || !user) return
    setIsSaving(true)
    try {
      await QuestionService.saveQuestionSet(id, questions, presentation.type, presentation.title)
      isDirtyRef.current = false
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (e) { console.error(e) }
    finally { setIsSaving(false) }
  }, [presentation, user, id, questions])

  if (isLoading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(0,166,166,0.20)', borderTopColor: '#00A6A6' }} />
      <p className="text-sm" style={{ color: '#9CA3AF' }}>Loading builder…</p>
    </div>
  )

  if (error || !presentation) return (
    <div className="glass-card p-12 text-center space-y-4 max-w-lg mx-auto mt-12">
      <AlertCircle className="w-10 h-10 mx-auto" style={{ color: '#F08700' }} />
      <h2 className="text-xl font-bold" style={{ color: '#1A1A2E' }}>{error ?? 'Something went wrong'}</h2>
      <Link href="/app/dashboard" className="btn-primary inline-flex">Back to Dashboard</Link>
    </div>
  )

  const selectedQuestion = questions.find(q => q.id === selectedQuestionId)

  return (
    <div className="flex flex-col h-[calc(100vh-90px)] -mt-4">

      {/* Save toast */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
            style={{ background: '#22C55E', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(34,197,94,0.35)' }}
          >
            <CheckCircle2 className="w-4 h-4" /> Saved
          </motion.div>
        )}
      </AnimatePresence>

      {/* Type picker modal */}
      <AnimatePresence>
        {showTypePicker && (
          <TypePickerModal onPick={handlePickType} onClose={() => setShowTypePicker(false)} />
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/app/dashboard"
            className="p-2 rounded-xl transition-all"
            style={{ color: '#9CA3AF' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-px h-7" style={{ background: '#E5E7EB' }} />
          <div>
            <h1 className="text-base font-bold flex items-center gap-2" style={{ color: '#1A1A2E' }}>
              {presentation.title}
              <span
                className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(0,166,166,0.10)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.22)' }}
              >
                {presentation.type}
              </span>
            </h1>
            <p className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>
              {questions.length}/{currentLimit} questions
              {isDirtyRef.current && <span className="ml-2" style={{ color: '#F08700' }}>· Unsaved changes</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(p => !p)}
            className="btn-ghost text-sm"
            style={showPreview ? { background: 'rgba(0,166,166,0.10)', borderColor: 'rgba(0,166,166,0.25)', color: '#00A6A6' } : {}}
          >
            {showPreview ? <X className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">{showPreview ? 'Close preview' : 'Preview'}</span>
          </button>
          <button onClick={handleSave} disabled={isSaving} className="btn-secondary text-sm disabled:opacity-40">
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">Save</span>
          </button>
          <Link href={`/app/present/${id}`} className="btn-live text-sm">
            <Play className="w-4 h-4" />
            Go Live
          </Link>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex gap-5 overflow-hidden min-h-0">

        {/* Left sidebar: question list */}
        <div className="w-56 flex-shrink-0 flex flex-col gap-3">
          <div
            className="flex-1 flex flex-col rounded-2xl overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
          >
            {/* List header */}
            <div
              className="px-4 py-3 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: '1px solid #F0F0F0' }}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Questions</span>
              <span
                className="text-[10px] font-bold tabular-nums"
                style={{ color: questions.length >= currentLimit ? '#F08700' : '#9CA3AF' }}
              >
                {questions.length}/{currentLimit}
              </span>
            </div>

            {/* List items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
              <AnimatePresence mode="popLayout">
                {questions.map((q, idx) => {
                  const qMeta = kindMeta(q.kind as QuestionKind)
                  const isActive = selectedQuestionId === q.id
                  const Icon = qMeta.icon
                  return (
                    <motion.div
                      key={q.id}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      onClick={() => setSelectedQuestionId(q.id)}
                      className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                      style={{
                        background: isActive ? qMeta.bg : 'transparent',
                        border: `1px solid ${isActive ? qMeta.border : 'transparent'}`,
                      }}
                    >
                      <span className="text-[9px] font-black w-4 flex-shrink-0 text-center" style={{ color: '#9CA3AF' }}>{idx + 1}</span>
                      <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: qMeta.bg }}>
                        <Icon className="w-2.5 h-2.5" style={{ color: qMeta.color }} />
                      </div>
                      <p className="text-xs font-medium flex-1 truncate" style={{ color: isActive ? '#1A1A2E' : '#6B7280' }}>
                        {q.prompt || 'Untitled'}
                      </p>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(q.id) }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all"
                        style={{ color: '#D1D5DB' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {questions.length === 0 && (
                <div className="py-10 text-center">
                  <HelpCircle className="w-7 h-7 mx-auto mb-2" style={{ color: '#D1D5DB' }} />
                  <p className="text-[10px] px-3" style={{ color: '#9CA3AF' }}>No questions yet — add your first below</p>
                </div>
              )}
            </div>

            {/* Add button */}
            <div className="p-2.5 flex-shrink-0" style={{ borderTop: '1px solid #F0F0F0' }}>
              <button
                onClick={() => setShowTypePicker(true)}
                disabled={questions.length >= currentLimit}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                style={{ background: '#00A6A6', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,166,166,0.30)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add question
              </button>
            </div>
          </div>
        </div>

        {/* Centre: editor */}
        <div
          className={`flex-1 flex flex-col rounded-2xl overflow-hidden min-w-0 transition-all ${showPreview ? 'hidden lg:flex' : 'flex'}`}
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
        >
          <AnimatePresence mode="wait">
            {selectedQuestion ? (
              <motion.div
                key={selectedQuestion.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                {/* Editor header */}
                {(() => {
                  const m = kindMeta(selectedQuestion.kind as QuestionKind)
                  const Icon = m.icon
                  return (
                    <div
                      className="px-7 py-4 flex items-center gap-3 flex-shrink-0"
                      style={{ borderBottom: '1px solid #F0F0F0' }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: m.bg }}>
                        <Icon className="w-4 h-4" style={{ color: m.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#1A1A2E' }}>{m.label}</p>
                        <p className="text-[10px] uppercase tracking-widest" style={{ color: '#9CA3AF' }}>{m.sub}</p>
                      </div>
                    </div>
                  )
                })()}
                <QuestionEditor
                  question={selectedQuestion}
                  questions={questions}
                  setQuestions={q => setQuestions(q as Question[])}
                  markDirty={() => { isDirtyRef.current = true }}
                />
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ opacity: 0.35 }}>
                <div
                  className="w-14 h-14 rounded-3xl flex items-center justify-center"
                  style={{ background: 'rgba(0,166,166,0.10)', border: '1px solid rgba(0,166,166,0.20)' }}
                >
                  <Layout className="w-7 h-7" style={{ color: '#00A6A6' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>Select a question or add one to start editing</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: preview */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, x: 30, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 300 }}
              exit={{ opacity: 0, x: 30, width: 0 }}
              className="flex-shrink-0 overflow-hidden"
            >
              <div className="w-[300px] h-full flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: '#9CA3AF' }}>
                    <Eye className="w-3 h-3" /> Preview
                  </span>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: '#9CA3AF' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div
                  className="flex-1 rounded-2xl overflow-hidden"
                  style={{ border: '1px solid #E5E7EB' }}
                >
                  {selectedQuestion
                    ? <QuestionPreview question={selectedQuestion} />
                    : (
                      <div className="h-full flex items-center justify-center" style={{ background: '#0D1117' }}>
                        <p className="text-xs text-center px-6" style={{ color: 'rgba(255,255,255,0.20)' }}>Select a question to preview it</p>
                      </div>
                    )
                  }
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
