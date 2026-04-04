'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, BarChart3, MessageSquare, Cloud, Smile,
  ArrowRight, ArrowLeft, AlertCircle, Plus, Trash2,
  CheckCircle2, ChevronRight, Edit2,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { PresentationService } from '@/lib/services/PresentationService'
import { QuestionService } from '@/lib/services/QuestionService'
import { QuestionEditor } from '@/components/question-editor/QuestionEditor'
import { makeQuestion } from '@/components/question-editor/makeQuestion'
import { Q_TYPES } from '@/components/question-editor/qtypes'
import type { PresentationType, Question, Section, ScoringConfig } from '@/types/domain'
import type { QuestionKind } from '@/components/question-editor/qtypes'

// ─── Zapp type display info ────────────────────────────────────────────────

const ZAPP_TYPES = [
  { type: 'quiz'       as PresentationType, name: 'Quiz',        icon: Sparkles,     color: '#650cd9', bg: 'rgba(101,12,217,0.10)' },
  { type: 'poll'       as PresentationType, name: 'Live Poll',   icon: BarChart3,    color: '#006b5f', bg: 'rgba(0,107,95,0.10)' },
  { type: 'qa'         as PresentationType, name: 'Q&A Session', icon: MessageSquare,color: '#912f03', bg: 'rgba(145,47,3,0.14)' },
  { type: 'word_cloud' as PresentationType, name: 'Word Cloud',  icon: Cloud,        color: '#00a6a6', bg: 'rgba(0,166,166,0.12)' },
  { type: 'feedback'   as PresentationType, name: 'Vibe Check',  icon: Smile,        color: '#BBDEF0', bg: 'rgba(187,222,240,0.15)' },
]

type EditStep = 'name' | 'sections' | 'questions' | 'scoring' | 'review'

// ─── Progress bar ──────────────────────────────────────────────────────────

function ProgressBar({ step, isQuiz }: { step: EditStep; isQuiz: boolean }) {
  const steps: EditStep[] = isQuiz
    ? ['name', 'sections', 'questions', 'scoring', 'review']
    : ['name', 'questions', 'review']
  const labels: Record<EditStep, string> = {
    name: 'Name', sections: 'Sections', questions: 'Questions', scoring: 'Scoring', review: 'Review',
  }
  const currentIdx = steps.indexOf(step)

  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: i < currentIdx ? '#00A6A6' : i === currentIdx ? '#1A1A2E' : '#E5E7EB',
                color: i <= currentIdx ? '#fff' : '#9CA3AF',
              }}
            >
              {i < currentIdx ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: i === currentIdx ? '#1A1A2E' : '#9CA3AF' }}>
              {labels[s]}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-8 h-0.5 mb-4 rounded-full" style={{ background: i < currentIdx ? '#00A6A6' : '#E5E7EB' }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Question type picker overlay ─────────────────────────────────────────

function QuestionTypePicker({
  onSelect, onClose, defaultKind,
}: {
  onSelect: (kind: QuestionKind) => void
  onClose: () => void
  defaultKind?: QuestionKind
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: '#FFFFFF', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <h3 className="text-lg font-black" style={{ color: '#1A1A2E' }}>Choose question type</h3>
          <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>Each question in your Zapp can be a different type</p>
        </div>
        <div className="p-4 space-y-2">
          {Q_TYPES.map(qt => {
            const Icon = qt.icon
            const isDefault = qt.kind === defaultKind
            return (
              <button
                key={qt.kind}
                onClick={() => onSelect(qt.kind as QuestionKind)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.99]"
                style={{
                  background: isDefault ? qt.bg : '#F9FAFB',
                  border: `1.5px solid ${isDefault ? qt.border : '#E5E7EB'}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = qt.bg; e.currentTarget.style.borderColor = qt.border }}
                onMouseLeave={e => { e.currentTarget.style.background = isDefault ? qt.bg : '#F9FAFB'; e.currentTarget.style.borderColor = isDefault ? qt.border : '#E5E7EB' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${qt.color}18` }}>
                  <Icon className="w-5 h-5" style={{ color: qt.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: '#1A1A2E' }}>{qt.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{qt.sub}</p>
                </div>
                {isDefault && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0" style={{ background: qt.bg, color: qt.color }}>
                    Default
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="px-6 pb-5">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all" style={{ background: '#F3F4F6', color: '#6B7280' }}>
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main edit wizard ──────────────────────────────────────────────────────

export default function EditZappPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const { isDark } = useTheme()
  const pageBg = isDark ? '#0f111a' : '#f5f7fa'
  const panelBg = isDark ? '#191b27' : '#ffffff'
  const panelAlt = isDark ? '#11131d' : '#f5f7fa'
  const border = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'
  const textStrong = isDark ? '#ffffff' : '#1A1A2E'
  const textMuted = isDark ? 'rgba(255,255,255,0.60)' : '#6B7280'
  const textSoft = isDark ? 'rgba(255,255,255,0.40)' : '#9CA3AF'
  const accent = '#650cd9'
  const accentSoft = 'rgba(101,12,217,0.10)'

  // ── Loading state ─────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<EditStep>('name')
  const [name, setName] = useState('')
  const [type, setType] = useState<PresentationType | null>(null)
  const [sections, setSections] = useState<Section[]>([{ id: 'main', name: 'Main' }])
  const [newSectionName, setNewSectionName] = useState('')
  const [useSections, setUseSections] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedQId, setSelectedQId] = useState<string | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string>('main')
  const [scoring, setScoring] = useState<ScoringConfig>({
    showAfterEachQuestion: false,
    showAfterEachSection: false,
    showFinalScore: true,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTypePicker, setShowTypePicker] = useState(false)

  const isQuiz = type === 'quiz'

  const visibleQuestions = useSections
    ? questions.filter(q => q.sectionId === activeSectionId)
    : questions

  const selectedQuestion = questions.find(q => q.id === selectedQId) ?? null

  // ── Load existing data ────────────────────────────────────────────────────

  useEffect(() => {
    if (!id || !user) return
    ;(async () => {
      try {
        const pres = await PresentationService.getPresentation(id)
        if (!pres) { setLoadError('Zapp not found'); return }
        setName(pres.title ?? '')
        setType(pres.type)
        if (pres.scoringConfig) setScoring(pres.scoringConfig as ScoringConfig)
        if (pres.sections && pres.sections.length > 0) {
          setSections(pres.sections)
          setUseSections(pres.sections.length > 1 || pres.sections[0]?.id !== 'main')
          setActiveSectionId(pres.sections[0].id)
        }
        const qs = await QuestionService.getQuestionSet(id)
        if (qs?.questions?.length) {
          setQuestions(qs.questions)
          setSelectedQId(qs.questions[0].id)
        }
      } catch {
        setLoadError('Failed to load Zapp')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [id, user])

  // ── Step navigation ───────────────────────────────────────────────────────

  function getStepOrder(): EditStep[] {
    return isQuiz
      ? ['name', 'sections', 'questions', 'scoring', 'review']
      : ['name', 'questions', 'review']
  }

  function nextStep() {
    const order = getStepOrder()
    const idx = order.indexOf(step)
    if (idx < order.length - 1) setStep(order[idx + 1])
  }

  function prevStep() {
    const order = getStepOrder()
    const idx = order.indexOf(step)
    if (idx > 0) setStep(order[idx - 1])
  }

  // ── Sections helpers ──────────────────────────────────────────────────────

  function addSection() {
    if (!newSectionName.trim()) return
    const sid = `sec_${Math.random().toString(36).substring(2, 8)}`
    setSections(prev => [...prev, { id: sid, name: newSectionName.trim() }])
    setNewSectionName('')
  }

  function removeSection(sid: string) {
    if (sections.length <= 1) return
    setSections(prev => prev.filter(s => s.id !== sid))
    const remaining = sections.filter(s => s.id !== sid)
    const fallback = remaining[0]?.id ?? 'main'
    setQuestions(prev => prev.map(q => q.sectionId === sid ? { ...q, sectionId: fallback } : q))
    if (activeSectionId === sid) setActiveSectionId(fallback)
  }

  // ── Questions helpers ─────────────────────────────────────────────────────

  function addQuestion(kind?: QuestionKind) {
    if (!kind) { setShowTypePicker(true); return }
    const sectionId = useSections ? activeSectionId : undefined
    const q = makeQuestion(kind, questions.length, sectionId)
    setQuestions(prev => [...prev, q])
    setSelectedQId(q.id)
    setShowTypePicker(false)
  }

  function deleteQuestion(qid: string) {
    const updated = questions.filter(q => q.id !== qid).map((q, i) => ({ ...q, orderIndex: i }))
    setQuestions(updated as Question[])
    if (selectedQId === qid) setSelectedQId(updated[0]?.id ?? null)
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!user || !type) return
    setIsSaving(true)
    setError(null)
    try {
      // Update presentation metadata
      const updates: Record<string, any> = { title: name || 'Untitled Zapp' }
      if (useSections && sections.length > 0) updates.sections = sections
      if (isQuiz) updates.scoringConfig = scoring
      await PresentationService.updatePresentation(id, updates)

      // Save all questions
      await QuestionService.saveQuestionSet(id, questions, type, name || 'Untitled Zapp')

      router.push(`/app/present/${id}`)
    } catch (e: any) {
      setError(e.message || 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-4" style={{ background: pageBg }}>
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(101,12,217,0.20)', borderTopColor: accent }} />
        <p className="text-sm" style={{ color: textSoft }}>Loading your Zapp…</p>
      </div>
    )
  }

  if (loadError || !type) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: pageBg }}>
        <div className="glass-card p-12 text-center space-y-4 max-w-lg">
          <AlertCircle className="w-10 h-10 mx-auto" style={{ color: '#F08700' }} />
          <h2 className="text-xl font-bold" style={{ color: textStrong }}>{loadError ?? 'Something went wrong'}</h2>
          <button onClick={() => router.push('/app/dashboard')} className="btn-primary inline-flex">Back to Dashboard</button>
        </div>
      </div>
    )
  }

  const typeInfo = ZAPP_TYPES.find(z => z.type === type)
  const TypeIcon = typeInfo?.icon ?? Sparkles

  // ════════════════════════════════════════════════════════════════════════
  // ── STEP 1: Name ────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  if (step === 'name') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: pageBg }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="rounded-2xl p-8 shadow-lg border" style={{ background: panelBg, borderColor: border }}>
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: typeInfo?.bg }}>
                  <TypeIcon className="w-4 h-4" style={{ color: typeInfo?.color }} />
                </div>
                <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ background: typeInfo?.bg, color: typeInfo?.color }}>
                  {typeInfo?.name}
                </span>
              </div>
              <h1 className="text-3xl font-black mb-2" style={{ color: textStrong }}>Edit Zapp</h1>
              <p style={{ color: textMuted }}>Update the name and settings for this Zapp</p>
            </div>

            <form onSubmit={e => { e.preventDefault(); if (name.trim()) nextStep() }} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold mb-2" style={{ color: textStrong }}>
                  Zapp Name
                </label>
                <input
                  id="title"
                  type="text"
                  autoFocus
                  placeholder="e.g. Team Quiz Night"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border-2 transition-all"
                  style={{ borderColor: name ? accent : border, background: panelAlt, color: textStrong }}
                  onFocus={e => (e.currentTarget.style.borderColor = accent)}
                  onBlur={e => (e.currentTarget.style.borderColor = name ? accent : border)}
                />
              </div>

              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full py-2.5 px-4 rounded-lg font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: name.trim() ? 'linear-gradient(135deg, #650cd9, #7a3af0)' : '#cbbbe9', cursor: name.trim() ? 'pointer' : 'not-allowed' }}
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
          <p className="text-center text-sm mt-6" style={{ color: textSoft }}>
            Zapp type: <strong>{typeInfo?.name}</strong> — type cannot be changed after creation
          </p>
        </motion.div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── STEP 2: Sections (Quiz only) ─────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  if (step === 'sections') {
    return (
      <div className="min-h-screen py-12 px-6" style={{ background: pageBg }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto">
          <ProgressBar step="sections" isQuiz={true} />

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black mb-2" style={{ color: textStrong }}>Does your Quiz have sections?</h1>
            <p style={{ color: textMuted }}>Sections group questions by topic — e.g. Sports, Music, Economics</p>
          </div>

          {!useSections ? (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => { setUseSections(false); nextStep() }}
                className="p-6 rounded-xl border-2 text-center transition-all"
                style={{ background: panelBg, borderColor: border }}
              >
                <div className="text-3xl mb-3">📋</div>
                <p className="font-black text-base" style={{ color: textStrong }}>One section</p>
                <p className="text-xs mt-1" style={{ color: textMuted }}>All questions in a single list</p>
              </button>
              <button
                onClick={() => setUseSections(true)}
                className="p-6 rounded-xl border-2 text-center transition-all"
                style={{ background: panelBg, borderColor: border }}
              >
                <div className="text-3xl mb-3">🗂️</div>
                <p className="font-black text-base" style={{ color: textStrong }}>Multiple sections</p>
                <p className="text-xs mt-1" style={{ color: textMuted }}>Group questions by topic</p>
              </button>
            </div>
          ) : (
            <div className="rounded-xl border p-6 mb-6 space-y-4" style={{ background: panelBg, borderColor: border }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Section name (e.g. Sports)"
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSection()}
                  className="flex-1 px-3 py-2.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: border, color: textStrong, background: panelAlt }}
                  autoFocus
                />
                <button
                  onClick={addSection}
                  disabled={!newSectionName.trim()}
                  className="px-4 py-2.5 rounded-lg font-bold text-sm text-white disabled:opacity-50"
                  style={{ background: accent }}
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {sections.map((sec, i) => (
                  <div
                    key={sec.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg"
                    style={{ background: panelAlt, border: `1px solid ${border}` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black w-5 h-5 rounded-full text-white flex items-center justify-center" style={{ background: accent }}>{i + 1}</span>
                      <span className="text-sm font-semibold" style={{ color: textStrong }}>{sec.name}</span>
                    </div>
                    {sections.length > 1 && (
                      <button onClick={() => removeSection(sec.id)} className="p-1 rounded transition-colors" style={{ color: '#D1D5DB' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {sections.length < 2 && (
                <p className="text-xs" style={{ color: '#F59E0B' }}>Add at least 2 sections, or go back and choose "One section"</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ color: textMuted }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {useSections && (
              <button
                onClick={nextStep}
                disabled={sections.length < 2}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white text-sm disabled:opacity-50"
                style={{ background: accent }}
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── STEP 3: Questions ────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  if (step === 'questions') {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <button onClick={prevStep} className="p-2 rounded-lg transition-colors" style={{ color: '#6B7280' }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
                {isQuiz ? 'Step 3' : 'Step 2'} — Questions
              </p>
              <h1 className="text-lg font-black" style={{ color: '#1A1A2E' }}>{name}</h1>
            </div>
          </div>
          <button
            onClick={nextStep}
            disabled={questions.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm text-white disabled:opacity-50 transition-all"
            style={{ background: '#00A6A6' }}
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          <div className="w-60 bg-white border-r border-[#E5E7EB] flex flex-col overflow-hidden flex-shrink-0">

            {/* Section tabs (quiz with sections) */}
            {isQuiz && useSections && (
              <div className="border-b border-[#E5E7EB] p-3 space-y-1">
                {sections.map(sec => (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setActiveSectionId(sec.id)
                      const first = questions.find(q => q.sectionId === sec.id)
                      if (first) setSelectedQId(first.id)
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: activeSectionId === sec.id ? 'rgba(0,166,166,0.10)' : 'transparent',
                      color: activeSectionId === sec.id ? '#00A6A6' : '#6B7280',
                    }}
                  >
                    {sec.name}
                    <span className="ml-1 text-[10px]">({questions.filter(q => q.sectionId === sec.id).length})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Question list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {visibleQuestions.length === 0 && (
                <p className="text-xs text-center py-6" style={{ color: '#9CA3AF' }}>No questions yet</p>
              )}
              {visibleQuestions.map((q, i) => {
                const qMeta = Q_TYPES.find(t => t.kind === q.kind)
                const QIcon = qMeta?.icon ?? Sparkles
                return (
                  <div key={q.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => setSelectedQId(q.id)}
                      className="flex-1 text-left px-3 py-2.5 rounded-lg text-xs transition-all"
                      style={{
                        background: selectedQId === q.id ? 'rgba(0,166,166,0.10)' : 'transparent',
                        color: selectedQId === q.id ? '#00A6A6' : '#374151',
                        border: selectedQId === q.id ? '1px solid rgba(0,166,166,0.25)' : '1px solid transparent',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold shrink-0" style={{ color: '#9CA3AF' }}>{i + 1}.</span>
                        <QIcon className="w-3 h-3 shrink-0" style={{ color: qMeta?.color ?? '#00A6A6' }} />
                        <span className="truncate">{q.prompt || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Untitled</span>}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all flex-shrink-0"
                      style={{ color: '#D1D5DB' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Add question */}
            <div className="p-3 border-t border-[#E5E7EB]">
              <button
                onClick={() => addQuestion()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all"
                style={{ background: 'rgba(0,166,166,0.08)', color: '#00A6A6', border: '1px solid rgba(0,166,166,0.20)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
              <p className="text-[9px] text-center mt-2" style={{ color: '#9CA3AF' }}>
                {questions.length} question{questions.length !== 1 ? 's' : ''} total
              </p>
            </div>
          </div>

          {/* Main editor area */}
          <div className="flex-1 overflow-y-auto">
            {!selectedQuestion ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,166,166,0.10)' }}>
                  <Plus className="w-7 h-7" style={{ color: '#00A6A6' }} />
                </div>
                <p className="font-bold text-lg" style={{ color: '#1A1A2E' }}>Add your first question</p>
                <p className="text-sm" style={{ color: '#6B7280' }}>Pick a question type — you can mix types freely</p>
                <button
                  onClick={() => addQuestion()}
                  className="mt-2 px-8 py-3 rounded-xl font-black text-white text-base"
                  style={{ background: '#00A6A6', boxShadow: '0 4px 16px rgba(0,166,166,0.30)' }}
                >
                  + Add Question
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <QuestionEditor
                  question={selectedQuestion}
                  questions={questions}
                  setQuestions={setQuestions}
                />
                <div className="px-7 pb-6 pt-2 border-t border-[#F0F0F0] flex-shrink-0">
                  <button
                    onClick={() => addQuestion()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={{ background: 'rgba(0,166,166,0.08)', color: '#00A6A6', border: '1px dashed rgba(0,166,166,0.35)' }}
                  >
                    <Plus className="w-4 h-4" /> Add another question
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Question type picker overlay */}
        <AnimatePresence>
          {showTypePicker && (
            <QuestionTypePicker
              onSelect={kind => addQuestion(kind as QuestionKind)}
              onClose={() => setShowTypePicker(false)}
              defaultKind={type as QuestionKind | undefined}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── STEP 4: Scoring (Quiz only) ──────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  if (step === 'scoring') {
    const toggles = [
      { key: 'showAfterEachQuestion' as keyof ScoringConfig, label: 'After each question', desc: 'Shows correct/incorrect immediately after each answer' },
      { key: 'showAfterEachSection'  as keyof ScoringConfig, label: 'After each section',   desc: 'Running total revealed at the end of each section' },
      { key: 'showFinalScore'        as keyof ScoringConfig, label: 'Final score at end',    desc: 'Full leaderboard shown when the Zapp ends' },
    ]

    return (
      <div className="min-h-screen bg-[#F5F7FA] py-12 px-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto">
          <ProgressBar step="scoring" isQuiz={true} />

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black mb-2" style={{ color: '#1A1A2E' }}>When to reveal scores?</h1>
            <p style={{ color: '#6B7280' }}>Choose when participants see their score — you can enable multiple</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden mb-6">
            {toggles.map((t, i) => (
              <div
                key={t.key}
                className={`flex items-center justify-between px-6 py-5 ${i < toggles.length - 1 ? 'border-b border-[#E5E7EB]' : ''}`}
              >
                <div>
                  <p className="text-sm font-bold" style={{ color: '#1A1A2E' }}>{t.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{t.desc}</p>
                </div>
                <button
                  onClick={() => setScoring(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                  className="relative rounded-full transition-all flex-shrink-0 ml-4"
                  style={{ background: scoring[t.key] ? '#00A6A6' : 'rgba(0,0,0,0.12)', minWidth: 44, height: 24 }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                    style={{ left: scoring[t.key] ? '22px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ color: '#6B7280' }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white text-sm"
              style={{ background: '#00A6A6' }}
            >
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── STEP 5: Review ────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  if (step === 'review') {
    const scoringLabels = isQuiz ? [
      scoring.showAfterEachQuestion && 'After each question',
      scoring.showAfterEachSection && 'After each section',
      scoring.showFinalScore && 'Final score',
    ].filter(Boolean) : []

    const grouped = useSections
      ? sections.map(sec => ({ section: sec, qs: questions.filter(q => q.sectionId === sec.id) }))
      : [{ section: null, qs: questions }]

    return (
      <div className="min-h-screen bg-[#F5F7FA] py-12 px-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
          <ProgressBar step="review" isQuiz={isQuiz} />

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black mb-2" style={{ color: '#1A1A2E' }}>Ready to save?</h1>
            <p style={{ color: '#6B7280' }}>Review your changes before saving</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg border-l-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.1)', borderColor: '#EF4444' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} />
              <p style={{ color: '#7F1D1D' }}>{error}</p>
            </div>
          )}

          {/* Summary card */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black" style={{ color: '#1A1A2E' }}>{name || 'Untitled Zapp'}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {typeInfo && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: typeInfo.bg, color: typeInfo.color }}>
                      {typeInfo.name}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: '#6B7280' }}>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
                  {useSections && <span className="text-xs" style={{ color: '#6B7280' }}>{sections.length} sections</span>}
                  {isQuiz && scoringLabels.length > 0 && (
                    <span className="text-xs" style={{ color: '#6B7280' }}>Scoring: {(scoringLabels as string[]).join(', ')}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setStep('name')} className="p-2 rounded-lg transition-colors" style={{ color: '#9CA3AF' }}>
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Questions grouped */}
          {questions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center mb-6">
              <p className="font-bold" style={{ color: '#1A1A2E' }}>No questions yet</p>
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>You can save and add questions later in the editor</p>
              <button onClick={() => setStep('questions')} className="mt-4 text-sm font-bold" style={{ color: '#00A6A6' }}>
                Add questions now
              </button>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {grouped.map(({ section, qs }) => (
                <div key={section?.id ?? 'all'} className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
                  {section && (
                    <div className="px-5 py-3 border-b border-[#E5E7EB]" style={{ background: '#F5F7FA' }}>
                      <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#1A1A2E' }}>{section.name}</p>
                    </div>
                  )}
                  {qs.map((q, i) => {
                    const qtype = Q_TYPES.find(t => t.kind === q.kind)
                    return (
                      <div key={q.id} className="flex items-center justify-between px-5 py-4 border-b border-[#F5F7FA] last:border-0">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-xs font-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F5F7FA', color: '#6B7280' }}>{i + 1}</span>
                          <p className="text-sm font-medium truncate" style={{ color: q.prompt ? '#1A1A2E' : '#9CA3AF', fontStyle: q.prompt ? 'normal' : 'italic' }}>
                            {q.prompt || 'Untitled question'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          {qtype && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: qtype.bg, color: qtype.color }}>
                              {qtype.label}
                            </span>
                          )}
                          {q.kind === 'quiz' && (
                            <>
                              <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{(q as any).timerSeconds}s</span>
                              <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{(q as any).points}pts</span>
                            </>
                          )}
                          <button
                            onClick={() => { setSelectedQId(q.id); setStep('questions') }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded transition-all"
                            style={{ color: '#00A6A6', background: 'rgba(0,166,166,0.08)' }}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ color: '#6B7280' }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-black text-white text-base transition-all disabled:opacity-50"
              style={{ background: '#00A6A6', boxShadow: '0 4px 20px rgba(0,166,166,0.35)' }}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Save Changes <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return null
}
