'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, BarChart3, MessageSquare, Cloud, Smile,
  ArrowRight, ArrowLeft, AlertCircle, Plus, Trash2,
  CheckCircle2, ChevronRight, Edit2,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePlanLimits } from '@/lib/hooks/usePlanLimits'
import { PresentationService } from '@/lib/services/PresentationService'
import { QuestionService } from '@/lib/services/QuestionService'
import { QuestionEditor } from '@/components/question-editor/QuestionEditor'
import { makeQuestion } from '@/components/question-editor/makeQuestion'
import { Q_TYPES } from '@/components/question-editor/qtypes'
import type { PresentationType, Question, Section, ScoringConfig } from '@/types/domain'
import type { QuestionKind } from '@/components/question-editor/qtypes'

// ─── Color palettes (Pro) ─────────────────────────────────────────────────

const COLOR_PALETTES = [
  { name: 'Teal Classic', primary: '#00A6A6', accent: '#F08700' },
  { name: 'Ocean',        primary: '#0369A1', accent: '#06B6D4' },
  { name: 'Sunset',       primary: '#DC2626', accent: '#F59E0B' },
  { name: 'Midnight',     primary: '#1E293B', accent: '#6366F1' },
  { name: 'Forest',       primary: '#15803D', accent: '#84CC16' },
  { name: 'Berry',        primary: '#9333EA', accent: '#EC4899' },
  { name: 'Coral',        primary: '#EA580C', accent: '#F97316' },
  { name: 'Slate',        primary: '#475569', accent: '#64748B' },
  { name: 'Gold',         primary: '#B45309', accent: '#FBBF24' },
  { name: 'Monochrome',   primary: '#111111', accent: '#6B7280' },
]

// ─── Zapp type cards ───────────────────────────────────────────────────────

const ZAPP_TYPES = [
  { type: 'quiz'       as PresentationType, name: 'Quiz',        icon: Sparkles,     color: '#00A6A6', bg: 'rgba(0,166,166,0.10)',   description: 'Test knowledge with scored questions and a live leaderboard' },
  { type: 'poll'       as PresentationType, name: 'Live Poll',   icon: BarChart3,    color: '#F08700', bg: 'rgba(240,135,0,0.10)',   description: 'Collect real-time votes shown as an animated bar chart' },
  { type: 'qa'         as PresentationType, name: 'Q&A Session', icon: MessageSquare,color: '#EFCA08', bg: 'rgba(239,202,8,0.14)',   description: 'Let your audience submit and upvote questions live' },
  { type: 'word_cloud' as PresentationType, name: 'Word Cloud',  icon: Cloud,        color: '#F49F0A', bg: 'rgba(244,159,10,0.12)',  description: 'Gather words from the crowd and watch them grow' },
  { type: 'feedback'   as PresentationType, name: 'Vibe Check',  icon: Smile,        color: '#BBDEF0', bg: 'rgba(187,222,240,0.15)', description: 'Capture quick ratings, emoji reactions and honest feedback' },
]

type WizardStep = 'name' | 'type' | 'sections' | 'questions' | 'scoring' | 'review'

// ─── Progress bar ──────────────────────────────────────────────────────────

function ProgressBar({ step, isQuiz }: { step: WizardStep; isQuiz: boolean }) {
  const allSteps: WizardStep[]  = ['name', 'type', 'sections', 'questions', 'scoring', 'review']
  const quizSteps: WizardStep[] = ['name', 'type', 'sections', 'questions', 'scoring', 'review']
  const otherSteps: WizardStep[] = ['name', 'type', 'questions', 'review']
  const steps = isQuiz ? quizSteps : otherSteps
  const labels: Record<WizardStep, string> = {
    name: 'Name', type: 'Type', sections: 'Sections',
    questions: 'Questions', scoring: 'Scoring', review: 'Review',
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

// ─── Main wizard ───────────────────────────────────────────────────────────

export default function CreatePage() {
  const { user } = useAuth()
  const planLimits = usePlanLimits()
  const router = useRouter()

  // ── Wizard state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>('name')
  const [name, setName] = useState('')
  const [selectedPalette, setSelectedPalette] = useState(0)
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

  const isPro       = planLimits.plan?.id !== 'free'
  const canCreate   = planLimits.canCreatePresentation
  const isQuiz      = type === 'quiz'

  // Derived: questions in the active section (or all if no sections)
  const visibleQuestions = useSections
    ? questions.filter(q => q.sectionId === activeSectionId)
    : questions

  const selectedQuestion = questions.find(q => q.id === selectedQId) ?? null

  // ── Navigation helpers ───────────────────────────────────────────────────

  function nextStep() {
    const order: WizardStep[] = isQuiz
      ? ['name', 'type', 'sections', 'questions', 'scoring', 'review']
      : ['name', 'type', 'questions', 'review']
    const idx = order.indexOf(step)
    if (idx < order.length - 1) setStep(order[idx + 1])
  }

  function prevStep() {
    const order: WizardStep[] = isQuiz
      ? ['name', 'type', 'sections', 'questions', 'scoring', 'review']
      : ['name', 'type', 'questions', 'review']
    const idx = order.indexOf(step)
    if (idx > 0) setStep(order[idx - 1])
  }

  // ── Sections helpers ─────────────────────────────────────────────────────

  function addSection() {
    if (!newSectionName.trim()) return
    const id = `sec_${Math.random().toString(36).substring(2, 8)}`
    setSections(prev => [...prev, { id, name: newSectionName.trim() }])
    setNewSectionName('')
  }

  function removeSection(id: string) {
    if (sections.length <= 1) return
    setSections(prev => prev.filter(s => s.id !== id))
    // reassign orphaned questions to first remaining section
    const remaining = sections.filter(s => s.id !== id)
    const fallback = remaining[0]?.id ?? 'main'
    setQuestions(prev => prev.map(q => q.sectionId === id ? { ...q, sectionId: fallback } : q))
    if (activeSectionId === id) setActiveSectionId(fallback)
  }

  // ── Questions helpers ────────────────────────────────────────────────────

  function addQuestion(kind?: QuestionKind) {
    // If no kind given and questions exist, show the type picker
    if (!kind) { setShowTypePicker(true); return }
    const sectionId = useSections ? activeSectionId : undefined
    const q = makeQuestion(kind, questions.length, sectionId)
    setQuestions(prev => [...prev, q])
    setSelectedQId(q.id)
    setShowTypePicker(false)
  }

  function deleteQuestion(id: string) {
    const updated = questions.filter(q => q.id !== id).map((q, i) => ({ ...q, orderIndex: i }))
    setQuestions(updated as Question[])
    if (selectedQId === id) setSelectedQId(updated[0]?.id ?? null)
  }

  // ── Save & create ────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!user || !type) return
    setIsSaving(true)
    setError(null)
    try {
      const presentationId = await PresentationService.createPresentation(user.id, {
        title: name || 'Untitled Zapp',
        description: '',
        type,
      })

      // Save sections + scoring config (only include defined values — Firebase rejects undefined)
      const updates: Record<string, any> = {}
      if (useSections && sections.length > 0) updates.sections = sections
      if (isQuiz) updates.scoringConfig = scoring
      if (isPro && selectedPalette > 0) updates.brandAccentColor = COLOR_PALETTES[selectedPalette].primary
      if (Object.keys(updates).length > 0) {
        await PresentationService.updatePresentation(presentationId, updates)
      }

      // Save all questions
      if (questions.length > 0) {
        await QuestionService.saveQuestionSet(presentationId, questions, type, name || 'Untitled Zapp')
      }

      router.push(`/app/present/${presentationId}`)
    } catch (e: any) {
      if (e.message?.includes('PLAN_LIMIT')) {
        setError(`You've reached the limit for your plan. Upgrade to create more.`)
      } else {
        setError(e.message || 'Failed to create Zapp')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── STEP 1: Name ────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  if (step === 'name') {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="rounded-2xl p-8 shadow-lg bg-white border border-[#E5E7EB]">
            <div className="mb-8">
              <h1 className="text-3xl font-black mb-2" style={{ color: '#1A1A2E' }}>Create a Zapp</h1>
              <p style={{ color: '#6B7280' }}>First, give your interactive session a name</p>
            </div>

            {/* Plan limit — shown immediately before user starts */}
            {!canCreate && (
              <div className="mb-6 p-4 rounded-xl border-l-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.08)', borderColor: '#EF4444' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                <div>
                  <p className="font-bold text-sm" style={{ color: '#7F1D1D' }}>Plan limit reached</p>
                  <p className="text-sm mt-0.5" style={{ color: '#7F1D1D' }}>You've used all Zapps allowed on your plan. Upgrade to create more.</p>
                </div>
              </div>
            )}

            <form onSubmit={e => { e.preventDefault(); if (name.trim() && canCreate) nextStep() }} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold mb-2" style={{ color: '#1A1A2E' }}>
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
                  style={{ borderColor: name ? '#00A6A6' : '#E5E7EB', background: '#F5F7FA', color: '#1A1A2E' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#00A6A6')}
                  onBlur={e => (e.currentTarget.style.borderColor = name ? '#00A6A6' : '#E5E7EB')}
                />
              </div>

              {/* Pro branding */}
              {isPro && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 border-t border-[#E5E7EB]">
                  <h3 className="text-sm font-semibold mb-4" style={{ color: '#1A1A2E' }}>Brand Colour (Optional)</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_PALETTES.map((palette, i) => (
                      <button
                        key={palette.name}
                        type="button"
                        onClick={() => setSelectedPalette(i)}
                        className="h-12 rounded-lg border-2 transition-all"
                        style={{
                          background: palette.primary,
                          borderColor: selectedPalette === i ? '#1A1A2E' : 'transparent',
                          borderWidth: selectedPalette === i ? 3 : 2,
                        }}
                        title={palette.name}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={!name.trim() || !canCreate}
                className="w-full py-2.5 px-4 rounded-lg font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: (name.trim() && canCreate) ? '#00A6A6' : '#BBDEF0', cursor: (name.trim() && canCreate) ? 'pointer' : 'not-allowed' }}
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
          <p className="text-center text-sm mt-6" style={{ color: '#9CA3AF' }}>You can edit the name anytime later</p>
        </motion.div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── STEP 2: Type ─────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  if (step === 'type') {
    return (
      <div className="min-h-screen bg-[#F5F7FA] py-12 px-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto">
          <ProgressBar step="type" isQuiz={false} />

          <div className="mb-10 text-center">
            <h1 className="text-4xl font-black mb-3" style={{ color: '#1A1A2E' }}>What kind of Zapp?</h1>
            <p className="text-lg" style={{ color: '#6B7280' }}><strong>"{name}"</strong> will use the type you choose for all questions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {ZAPP_TYPES.map((zapp, i) => {
              const Icon = zapp.icon
              return (
                <motion.button
                  key={zapp.type}
                  onClick={() => { setType(zapp.type); nextStep() }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  whileHover={{ y: -4 }}
                  className="p-6 rounded-xl border-2 transition-all text-left"
                  style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: zapp.bg }}>
                    <Icon className="w-7 h-7" style={{ color: zapp.color }} />
                  </div>
                  <h3 className="font-black text-lg mb-1" style={{ color: zapp.color }}>{zapp.name}</h3>
                  <p className="text-sm" style={{ color: '#6B7280' }}>{zapp.description}</p>
                </motion.button>
              )
            })}
          </div>

          <div className="flex justify-start">
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all" style={{ color: '#6B7280' }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── STEP 3: Sections (Quiz only) ──────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  if (step === 'sections') {
    return (
      <div className="min-h-screen bg-[#F5F7FA] py-12 px-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto">
          <ProgressBar step="sections" isQuiz={true} />

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black mb-2" style={{ color: '#1A1A2E' }}>Does your Quiz have sections?</h1>
            <p style={{ color: '#6B7280' }}>Sections group questions by topic — e.g. Sports, Music, Economics</p>
          </div>

          {/* Choice cards */}
          {!useSections ? (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => { setUseSections(false); nextStep() }}
                className="p-6 rounded-xl border-2 text-center transition-all"
                style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              >
                <div className="text-3xl mb-3">📋</div>
                <p className="font-black text-base" style={{ color: '#1A1A2E' }}>One section</p>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>All questions in a single list</p>
              </button>
              <button
                onClick={() => setUseSections(true)}
                className="p-6 rounded-xl border-2 text-center transition-all"
                style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              >
                <div className="text-3xl mb-3">🗂️</div>
                <p className="font-black text-base" style={{ color: '#1A1A2E' }}>Multiple sections</p>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Group questions by topic</p>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 mb-6 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Section name (e.g. Sports)"
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSection()}
                  className="flex-1 px-3 py-2.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: '#E5E7EB', color: '#1A1A2E', background: '#F5F7FA' }}
                  autoFocus
                />
                <button
                  onClick={addSection}
                  disabled={!newSectionName.trim()}
                  className="px-4 py-2.5 rounded-lg font-bold text-sm text-white disabled:opacity-50"
                  style={{ background: '#00A6A6' }}
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {sections.map((sec, i) => (
                  <div
                    key={sec.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg"
                    style={{ background: '#F5F7FA', border: '1px solid #E5E7EB' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black w-5 h-5 rounded-full bg-[#00A6A6] text-white flex items-center justify-center">{i + 1}</span>
                      <span className="text-sm font-semibold" style={{ color: '#1A1A2E' }}>{sec.name}</span>
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

          {/* Nav */}
          <div className="flex items-center justify-between">
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ color: '#6B7280' }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {useSections && (
              <button
                onClick={nextStep}
                disabled={sections.length < 2}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white text-sm disabled:opacity-50"
                style={{ background: '#00A6A6' }}
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
  // ── STEP 4: Questions ────────────────────────────────────────────────────
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
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Step 4 — Questions</p>
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

            {/* Section tabs (quiz with sections only) */}
            {isQuiz && useSections && (
              <div className="border-b border-[#E5E7EB] p-3 space-y-1">
                {sections.map(sec => (
                  <button
                    key={sec.id}
                    onClick={() => { setActiveSectionId(sec.id); const first = questions.find(q => q.sectionId === sec.id); if (first) setSelectedQId(first.id) }}
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
              <p className="text-[9px] text-center mt-2" style={{ color: '#9CA3AF' }}>{questions.length} question{questions.length !== 1 ? 's' : ''} total</p>
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
                <p className="text-sm" style={{ color: '#6B7280' }}>Pick a question type to get started — you can mix types freely</p>
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
                {/* Add another question — shows type picker */}
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
  // ── STEP 5: Scoring (Quiz only) ──────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  if (step === 'scoring') {
    const toggles = [
      {
        key: 'showAfterEachQuestion' as keyof ScoringConfig,
        label: 'After each question',
        desc: 'Shows correct/incorrect immediately after each answer',
      },
      {
        key: 'showAfterEachSection' as keyof ScoringConfig,
        label: 'After each section',
        desc: 'Running total revealed at the end of each section',
      },
      {
        key: 'showFinalScore' as keyof ScoringConfig,
        label: 'Final score at end',
        desc: 'Full leaderboard shown when the Zapp ends',
      },
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
  // ── STEP 6: Review ───────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  if (step === 'review') {
    const typeInfo = ZAPP_TYPES.find(z => z.type === type)
    const scoringLabels = isQuiz ? [
      scoring.showAfterEachQuestion && 'After each question',
      scoring.showAfterEachSection && 'After each section',
      scoring.showFinalScore && 'Final score',
    ].filter(Boolean) : []

    // Group questions by section for display
    const grouped = useSections
      ? sections.map(sec => ({
          section: sec,
          qs: questions.filter(q => q.sectionId === sec.id),
        }))
      : [{ section: null, qs: questions }]

    return (
      <div className="min-h-screen bg-[#F5F7FA] py-12 px-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
          <ProgressBar step="review" isQuiz={isQuiz} />

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black mb-2" style={{ color: '#1A1A2E' }}>Ready to launch?</h1>
            <p style={{ color: '#6B7280' }}>Review your Zapp before creating it</p>
          </div>

          {/* Error */}
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
                <div className="flex items-center gap-2 mt-1">
                  {typeInfo && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${typeInfo.bg}`, color: typeInfo.color }}>
                      {typeInfo.name}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: '#6B7280' }}>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
                  {useSections && <span className="text-xs" style={{ color: '#6B7280' }}>{sections.length} sections</span>}
                  {isQuiz && scoringLabels.length > 0 && (
                    <span className="text-xs" style={{ color: '#6B7280' }}>Scoring: {scoringLabels.join(', ')}</span>
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
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>You can still create the Zapp and add questions later</p>
              <button onClick={() => setStep('questions')} className="mt-4 text-sm font-bold" style={{ color: '#00A6A6' }}>Add questions now</button>
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
                      <div
                        key={q.id}
                        className="flex items-center justify-between px-5 py-4 border-b border-[#F5F7FA] last:border-0"
                      >
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
              onClick={handleCreate}
              disabled={isSaving || !canCreate}
              className="flex items-center gap-2 px-8 py-3 rounded-xl font-black text-white text-base transition-all disabled:opacity-50"
              style={{ background: '#00A6A6', boxShadow: '0 4px 20px rgba(0,166,166,0.35)' }}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  Create Zapp <ChevronRight className="w-5 h-5" />
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
