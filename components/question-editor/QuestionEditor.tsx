'use client'

// components/question-editor/QuestionEditor.tsx
// Reusable question editor panel — used by both the creation wizard and the edit page.

import { useEffect, useState } from 'react'
import { CheckCircle2, X, ArrowRight, Plus } from 'lucide-react'
import { kindMeta } from './qtypes'
import type { QuestionKind } from './qtypes'
import type {
  Question, QuizQuestion, PollQuestion,
  WordCloudQuestion, QAQuestion, FeedbackQuestion,
} from '@/types/domain'

/** Centered primary action — avoids a full-bleed bar that feels disconnected from the form. */
function NextQuestionAction({
  onClick,
  disabled,
  label,
  buttonStyle,
}: {
  onClick: () => void
  disabled: boolean
  label: string
  buttonStyle: React.CSSProperties
}) {
  return (
    <div
      className="mt-8 flex justify-center border-t pt-6"
      style={{ borderColor: 'rgba(122, 58, 240, 0.12)' }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="inline-flex min-h-[48px] w-full max-w-xs items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold transition-all disabled:opacity-50 sm:w-auto sm:min-w-[220px]"
        style={buttonStyle}
      >
        {disabled ? (
          'Question limit reached'
        ) : (
          <>
            {label}
            <ArrowRight className="w-4 h-4 shrink-0" aria-hidden />
          </>
        )}
      </button>
    </div>
  )
}

interface Props {
  question: Question
  questions: Question[]
  setQuestions: (q: Question[]) => void
  markDirty?: () => void
  onAddNextQuestion?: () => void
  disableAddNextQuestion?: boolean
  addNextQuestionLabel?: string
}

export function QuestionEditor({
  question,
  questions,
  setQuestions,
  markDirty,
  onAddNextQuestion,
  disableAddNextQuestion = false,
  addNextQuestionLabel = 'Next question',
}: Props) {
  const meta = kindMeta(question.kind as QuestionKind)
  const [seedCleared, setSeedCleared] = useState<Record<string, boolean>>({})

  const nextQuestionBtnStyle: React.CSSProperties = disableAddNextQuestion
    ? { background: '#E5E7EB', color: '#9CA3AF' }
    : {
        background: 'linear-gradient(135deg, #650cd9 0%, #7a3af0 100%)',
        color: '#ffffff',
        boxShadow: '0 8px 24px rgba(101, 12, 217, 0.28)',
      }

  function patch(updates: Partial<Question>) {
    setQuestions(questions.map(q => q.id === question.id ? { ...q, ...updates } as Question : q))
    markDirty?.()
  }

  useEffect(() => {
    setSeedCleared({})
  }, [question.id])

  const optionSeedLabel = (index: number) => `Option ${String.fromCharCode(65 + index)}`
  const isSeedLabel = (label: string, index: number) =>
    label.trim().toLowerCase() === optionSeedLabel(index).toLowerCase()
  const seedKey = (optionId: string) => `${question.id}:${optionId}`
  const markSeedHandled = (optionId: string) => {
    const key = seedKey(optionId)
    setSeedCleared(prev => (prev[key] ? prev : { ...prev, [key]: true }))
  }

  const inputStyle: React.CSSProperties = {
    background: '#FAF9FF',
    border: '1px solid rgba(122, 58, 240, 0.12)',
    borderRadius: 14,
    color: '#1A1A2E',
    padding: '12px 16px',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }
  const focus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = meta.color
    e.currentTarget.style.boxShadow = `0 0 0 3px ${meta.bg}`
    e.currentTarget.style.background = '#FFFFFF'
  }
  const blur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'rgba(122, 58, 240, 0.12)'
    e.currentTarget.style.boxShadow = 'none'
    e.currentTarget.style.background = '#FAF9FF'
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
      <div className="mx-auto w-full max-w-2xl space-y-8 px-6 sm:px-8 pb-12 pt-6 sm:pt-7">

      {/* Prompt */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Question prompt</label>
        <textarea
          rows={2}
          placeholder="Type your question here…"
          value={question.prompt}
          onChange={e => patch({ prompt: e.target.value })}
          className="w-full text-xl sm:text-2xl font-bold bg-transparent border-none focus:ring-0 resize-none outline-none leading-snug"
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
                    placeholder={optionSeedLabel(i)}
                    onFocus={e => {
                      focus(e)
                      const key = seedKey(opt.id)
                      if (!seedCleared[key] && isSeedLabel(opt.label, i)) {
                        const q = { ...(question as QuizQuestion) }
                        q.options = q.options.map(o => o.id === opt.id ? { ...o, label: '' } : o)
                        patch(q as Partial<Question>)
                        markSeedHandled(opt.id)
                      }
                    }}
                    onBlur={blur}
                    onChange={e => {
                      const q = { ...(question as QuizQuestion) }
                      q.options = q.options.map(o => o.id === opt.id ? { ...o, label: e.target.value } : o)
                      patch(q as Partial<Question>)
                      markSeedHandled(opt.id)
                    }}
                  />
                  {(question as QuizQuestion).options.length > 1 && (
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
              type="button"
              onClick={() => {
                const q = { ...(question as QuizQuestion) }
                const newId = `opt_${Math.random().toString(36).substring(2, 6)}`
                q.options = [...q.options, { id: newId, label: `Option ${String.fromCharCode(65 + q.options.length)}` }]
                patch(q as Partial<Question>)
              }}
              className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full transition-all"
              style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} /> Add option
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
                {[10, 15, 20, 30, 45, 60, 90, 120].map(s => <option key={s} value={s}>{s}s</option>)}
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
                {[50, 100, 200, 500, 1000].map(p => <option key={p} value={p}>{p} pts</option>)}
              </select>
            </div>
          </div>
          {onAddNextQuestion && (
            <NextQuestionAction
              onClick={onAddNextQuestion}
              disabled={disableAddNextQuestion}
              label={addNextQuestionLabel}
              buttonStyle={nextQuestionBtnStyle}
            />
          )}
        </div>
      )}

      {/* ── Poll ─── */}
      {question.kind === 'poll' && (
        <div className="space-y-4">
          <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Poll options</label>
          <div className="space-y-2">
            {(question as PollQuestion).options.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-3">
                <span
                  className="text-[11px] font-black w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(251, 146, 60, 0.14)', color: '#c2410c', border: '1px solid rgba(251, 146, 60, 0.25)' }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <input
                  style={inputStyle}
                  value={opt.label}
                  placeholder={optionSeedLabel(i)}
                  onFocus={e => {
                    focus(e)
                    const key = seedKey(opt.id)
                    if (!seedCleared[key] && isSeedLabel(opt.label, i)) {
                      const q = { ...(question as PollQuestion) }
                      q.options = q.options.map(o => o.id === opt.id ? { ...o, label: '' } : o)
                      patch(q as Partial<Question>)
                      markSeedHandled(opt.id)
                    }
                  }}
                  onBlur={blur}
                  onChange={e => {
                    const q = { ...(question as PollQuestion) }
                    q.options = q.options.map(o => o.id === opt.id ? { ...o, label: e.target.value } : o)
                    patch(q as Partial<Question>)
                    markSeedHandled(opt.id)
                  }}
                />
                {(question as PollQuestion).options.length > 1 && (
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
              type="button"
              onClick={() => {
                const q = { ...(question as PollQuestion) }
                q.options = [...q.options, { id: `p_${Math.random().toString(36).substring(2, 6)}`, label: `Option ${String.fromCharCode(65 + q.options.length)}` }]
                patch(q as Partial<Question>)
              }}
              className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full transition-all"
              style={{
                background: 'rgba(251, 146, 60, 0.12)',
                color: '#c2410c',
                border: '1px solid rgba(251, 146, 60, 0.28)',
              }}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} /> Add option
            </button>
          )}
          {/* Multi-select toggle */}
          <div
            className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl"
            style={{ background: '#FAF9FF', border: '1px solid rgba(122, 58, 240, 0.1)' }}
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
          {onAddNextQuestion && (
            <NextQuestionAction
              onClick={onAddNextQuestion}
              disabled={disableAddNextQuestion}
              label={addNextQuestionLabel}
              buttonStyle={nextQuestionBtnStyle}
            />
          )}
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
          {onAddNextQuestion && (
            <NextQuestionAction
              onClick={onAddNextQuestion}
              disabled={disableAddNextQuestion}
              label={addNextQuestionLabel}
              buttonStyle={nextQuestionBtnStyle}
            />
          )}
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
          {onAddNextQuestion && (
            <NextQuestionAction
              onClick={onAddNextQuestion}
              disabled={disableAddNextQuestion}
              label={addNextQuestionLabel}
              buttonStyle={nextQuestionBtnStyle}
            />
          )}
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
          {onAddNextQuestion && (
            <NextQuestionAction
              onClick={onAddNextQuestion}
              disabled={disableAddNextQuestion}
              label={addNextQuestionLabel}
              buttonStyle={nextQuestionBtnStyle}
            />
          )}
        </div>
      )}
      </div>
    </div>
  )
}
