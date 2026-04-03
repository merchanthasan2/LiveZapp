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
  { type: 'quiz'       as PresentationType, name: 'Quiz',        icon: Sparkles,     color: '#ffc300', bg: 'rgba(255,195,0,0.12)',   description: 'Test knowledge with scored questions and a live leaderboard' },
  { type: 'poll'       as PresentationType, name: 'Live Poll',   icon: BarChart3,    color: '#1e96fc', bg: 'rgba(30,150,252,0.12)',  description: 'Collect real-time votes shown as an animated bar chart' },
  { type: 'qa'         as PresentationType, name: 'Q&A Session', icon: MessageSquare,color: '#ffd60a', bg: 'rgba(255,214,10,0.12)',  description: 'Let your audience submit and upvote questions live' },
  { type: 'word_cloud' as PresentationType, name: 'Word Cloud',  icon: Cloud,        color: '#1e96fc', bg: 'rgba(30,150,252,0.10)',  description: 'Gather words from the crowd and watch them grow' },
  { type: 'feedback'   as PresentationType, name: 'Vibe Check',  icon: Smile,        color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', description: 'Capture quick ratings, emoji reactions and honest feedback' },
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
                background: i < currentIdx ? '#ffc300' : i === currentIdx ? 'rgba(255,195,0,0.15)' : 'rgba(255,255,255,0.10)',
                color: i < currentIdx ? '#000814' : i === currentIdx ? '#ffc300' : 'rgba(255,255,255,0.38)',
                border: i === currentIdx ? '2px solid #ffc300' : 'none',
              }}
            >
              {i < currentIdx ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: i === currentIdx ? '#ffc300' : 'rgba(255,255,255,0.38)' }}>
              {labels[s]}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-8 h-0.5 mb-4 rounded-full" style={{ background: i < currentIdx ? '#ffc300' : 'rgba(255,255,255,0.10)' }} />
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
        style={{ background: '#001d3d', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 24px 64px rgba(0,0,0,0.60)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-lg font-black" style={{ color: '#FFFFFF' }}>Choose question type</h3>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>Each question in your Zapp can be a different type</p>
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
                  background: isDefault ? qt.bg : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${isDefault ? qt.border : 'rgba(255,255,255,0.08)'}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = qt.bg; e.currentTarget.style.borderColor = qt.border }}
                onMouseLeave={e => { e.currentTarget.style.background = isDefault ? qt.bg : 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = isDefault ? qt.border : 'rgba(255,255,255,0.08)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${qt.color}22` }}>
                  <Icon className="w-5 h-5" style={{ color: qt.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: '#FFFFFF' }}>{qt.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>{qt.sub}</p>
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
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)' }}>
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
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#000814' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="rounded-2xl p-8" style={{ background: '#001d3d', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px rgba(0,0,0,0.50)' }}>
            <div className="mb-8">
              <h1 className="text-3xl font-black mb-2" style={{ color: '#FFFFFF' }}>Create a Zapp</h1>
              <p style={{ color: 'rgba(255,255,255,0.50)' }}>First, give your interactive session a name</p>
            </div>

            {/* Plan limit — shown immediately before user starts */}
            {!canCreate && (
              <div className="mb-6 p-4 rounded-xl border-l-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.10)', borderColor: '#EF4444' }}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                <div>
                  <p className="font-bold text-sm" style={{ color: '#FB7185' }}>Plan limit reached</p>
                  <p className="text-sm mt-0.5" style={{ color: '#FB7185' }}>You've used all Zapps allowed on your plan. Upgrade to create more.</p>
                </div>
              </div>
            )}

            <form onSubmit={e => { e.preventDefault(); if (name.trim() && canCreate) nextStep() }} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
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
                  style={{ borderColor: name ? '#ffc300' : 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#FFFFFF' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#ffc300')}
                  onBlur={e => (e.currentTarget.style.borderColor = name ? '#ffc300' : 'rgba(255,255,255,0.12)')}
                />
              </div>

              {/* Pro branding */}
              {isPro && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.75)' }}>Brand Colour (Optional)</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_PALETTES.map((palette, i) => (
                      <button
                        key={palette.name}
                        type="button"
                        onClick={() => setSelectedPalette(i)}
                        className="h-12 rounded-lg border-2 transition-all"
                        style={{
                          background: palette.primary,
                          borderColor: selectedPalette === i ? '#FFFFFF' : 'transparent',
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
                className="btn-primary w-full justify-center disabled:opacity-50"
                style={{ cursor: (name.trim() && canCreate) ? 'pointer' : 'not-allowed' }}
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
          <p className="text-center text-sm mt-6" style={{ color: 'rgba(255,255,255,0.35)' }}>You can edit the name anytime later</p>
        </motion.div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── STEP 2: Type ─────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  if (step === 'type') {
    return (
      <div className="min-h-screen py-12 px-6" style={{ background: '#000814' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto">
          <ProgressBar step="type" isQuiz={false} />

          <div className="mb-10 text-center">
            <h1 className="text-4xl font-black mb-3" style={{ color: '#FFFFFF' }}>What kind of Zapp?</h1>
            <p className="text-lg" style={{ color: 'rgba(255,255,255,0.55)' }}><strong>"{name}"</strong> will use the type you choose for all questions</p>
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
                  style={{ background: '#001d3d', borderColor: 'rgba(255,255,255,0.08)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = zapp.color; e.currentTarget.style.background = zapp.bg }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#001d3d' }}
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: zapp.bg }}>
                    <Icon className="w-7 h-7" style={{ color: zapp.color }} />
                  </div>
                  <h3 className="font-black text-lg mb-1" style={{ color: zapp.color }}>{zapp.name}</h3>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>{zapp.description}</p>
                </motion.button>
              )
            })}
          </div>

          <div className="flex justify-start">
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all" style={{ color: 'rgba(255,255,255,0.55)' }}>
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
      <div className="min-h-screen py-12 px-6" style={{ background: '#000814' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto">
          <ProgressBar step="sections" isQuiz={true} />

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black mb-2" style={{ color: '#FFFFFF' }}>Does your Quiz have sections?</h1>
            <p style={{ color: 'rgba(255,255,255,0.50)' }}>Sections group questions by topic — e.g. Sports, Music, Economics</p>
          </div>

          {/* Choice cards */}
          {!useSections ? (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => { setUseSections(false); nextStep() }}
                className="p-6 rounded-xl border-2 text-center transition-all"
                style={{ background: '#001d3d', borderColor: 'rgba(255,255,255,0.08)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ffc300' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
              >
                <div className="text-3xl mb-3">📋</div>
                <p className="font-black text-base" style={{ color: '#FFFFFF' }}>One section</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.50)' }}>All questions in a single list</p>
              </button>
              <button
                onClick={() => setUseSections(true)}
                className="p-6 rounded-xl border-2 text-center transition-all"
                style={{ background: '#001d3d', borderColor: 'rgba(255,255,255,0.08)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ffc300' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
              >
                <div className="text-3xl mb-3">🗂️</div>
                <p className="font-black text-base" style={{ color: '#FFFFFF' }}>Multiple sections</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.50)' }}>Group questions by topic</p>
              </button>
            </div>
          ) : (
            <div className="rounded-xl p-6 mb-6 space-y-4" style={{ background: '#001d3d', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Section name (e.g. Sports)"
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSection()}
                  className="flex-1 px-3 py-2.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: 'rgba(255,255,255,0.12)', color: '#FFFFFF', background: 'rgba(255,255,255,0.05)' }}
                  autoFocus
                />
                <button
                  onClick={addSection}
                  disabled={!newSectionName.trim()}
                  className="btn-primary px-4 disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {sections.map((sec, i) => (
                  <div
                    key={sec.id}
                    className="flex items-center justify-between px-4 py-3 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#ffc300', color: '#000814' }}>{i + 1}</span>
                      <span className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>{sec.name}</span>
                    </div>
                    {sections.length > 1 && (
                      <button onClick={() => removeSection(sec.id)} className="p-1 rounded transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {sections.length < 2 && (
                <p className="text-xs" style={{ color: '#ffd60a' }}>Add at least 2 sections, or go back and choose "One section"</p>
              )}
            </div>
          )}

          {/* Nav */}
          <div className="flex items-center justify-between">
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {useSections && (
              <button
                onClick={nextStep}
                disabled={sections.length < 2}
                className="btn-primary disabled:opacity-50"
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
      <div className="min-h-screen flex flex-col" style={{ background: '#000814' }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4" style={{ background: '#001d3d', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <button onClick={prevStep} className="p-2 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.50)' }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.38)' }}>Step 4 — Questions</p>
              <h1 className="text-lg font-black" style={{ color: '#FFFFFF' }}>{name}</h1>
            </div>
          </div>
          <button
            onClick={nextStep}
            disabled={questions.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          <div className="w-60 flex flex-col overflow-hidden flex-shrink-0" style={{ background: '#001d3d', borderRight: '1px solid rgba(255,255,255,0.08)' }}>

            {/* Section tabs (quiz with sections only) */}
            {isQuiz && useSections && (
              <div className="p-3 space-y-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {sections.map(sec => (
                  <button
                    key={sec.id}
                    onClick={() => { setActiveSectionId(sec.id); const first = questions.find(q => q.sectionId === sec.id); if (first) setSelectedQId(first.id) }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: activeSectionId === sec.id ? 'rgba(255,195,0,0.12)' : 'transparent',
                      color: activeSectionId === sec.id ? '#ffc300' : 'rgba(255,255,255,0.55)',
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
                <p className="text-xs text-center py-6" style={{ color: 'rgba(255,255,255,0.35)' }}>No questions yet</p>
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
                        background: selectedQId === q.id ? 'rgba(255,195,0,0.12)' : 'transparent',
                        color: selectedQId === q.id ? '#ffc300' : 'rgba(255,255,255,0.65)',
                        border: selectedQId === q.id ? '1px solid rgba(255,195,0,0.25)' : '1px solid transparent',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>{i + 1}.</span>
                        <QIcon className="w-3 h-3 shrink-0" style={{ color: qMeta?.color ?? '#ffc300' }} />
                        <span className="truncate">{q.prompt || <span style={{ color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>Untitled</span>}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-all flex-shrink-0"
                      style={{ color: 'rgba(255,255,255,0.25)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Add question */}
            <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => addQuestion()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all"
                style={{ background: 'rgba(255,195,0,0.10)', color: '#ffc300', border: '1px solid rgba(255,195,0,0.22)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
              <p className="text-[9px] text-center mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>{questions.length} question{questions.length !== 1 ? 's' : ''} total</p>
            </div>
          </div>

          {/* Main editor area */}
          <div className="flex-1 overflow-y-auto" style={{ background: '#000814' }}>
            {!selectedQuestion ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,195,0,0.12)' }}>
                  <Plus className="w-7 h-7" style={{ color: '#ffc300' }} />
                </div>
                <p className="font-bold text-lg" style={{ color: '#FFFFFF' }}>Add your first question</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.50)' }}>Pick a question type to get started — you can mix types freely</p>
                <button
                  onClick={() => addQuestion()}
                  className="btn-primary mt-2 text-base"
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
                <div className="px-7 pb-6 pt-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => addQuestion()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={{ background: 'rgba(255,195,0,0.08)', color: '#ffc300', border: '1px dashed rgba(255,195,0,0.30)' }}
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
      <div className="min-h-screen py-12 px-6" style={{ background: '#000814' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto">
          <ProgressBar step="scoring" isQuiz={true} />

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black mb-2" style={{ color: '#FFFFFF' }}>When to reveal scores?</h1>
            <p style={{ color: 'rgba(255,255,255,0.50)' }}>Choose when participants see their score — you can enable multiple</p>
          </div>

          <div className="rounded-2xl overflow-hidden mb-6" style={{ background: '#001d3d', border: '1px solid rgba(255,255,255,0.08)' }}>
            {toggles.map((t, i) => (
              <div
                key={t.key}
                className="flex items-center justify-between px-6 py-5"
                style={{ borderBottom: i < toggles.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
              >
                <div>
                  <p className="text-sm font-bold" style={{ color: '#FFFFFF' }}>{t.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>{t.desc}</p>
                </div>
                <button
                  onClick={() => setScoring(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                  className="relative rounded-full transition-all flex-shrink-0 ml-4"
                  style={{ background: scoring[t.key] ? '#ffc300' : 'rgba(255,255,255,0.15)', minWidth: 44, height: 24 }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                    style={{ left: scoring[t.key] ? '22px' : '2px', background: scoring[t.key] ? '#000814' : '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={nextStep} className="btn-primary">
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
      <div className="min-h-screen py-12 px-6" style={{ background: '#000814' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
          <ProgressBar step="review" isQuiz={isQuiz} />

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black mb-2" style={{ color: '#FFFFFF' }}>Ready to launch?</h1>
            <p style={{ color: 'rgba(255,255,255,0.50)' }}>Review your Zapp before creating it</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-lg border-l-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.10)', borderColor: '#EF4444' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} />
              <p style={{ color: '#FB7185' }}>{error}</p>
            </div>
          )}

          {/* Summary card */}
          <div className="rounded-2xl p-6 mb-6" style={{ background: '#001d3d', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black" style={{ color: '#FFFFFF' }}>{name || 'Untitled Zapp'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {typeInfo && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: typeInfo.bg, color: typeInfo.color }}>
                      {typeInfo.name}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.50)' }}>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
                  {useSections && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.50)' }}>{sections.length} sections</span>}
                  {isQuiz && scoringLabels.length > 0 && (
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.50)' }}>Scoring: {scoringLabels.join(', ')}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setStep('name')} className="p-2 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.38)' }}>
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Questions grouped */}
          {questions.length === 0 ? (
            <div className="rounded-2xl p-8 text-center mb-6" style={{ background: '#001d3d', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="font-bold" style={{ color: '#FFFFFF' }}>No questions yet</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.50)' }}>You can still create the Zapp and add questions later</p>
              <button onClick={() => setStep('questions')} className="mt-4 text-sm font-bold" style={{ color: '#ffc300' }}>Add questions now</button>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {grouped.map(({ section, qs }) => (
                <div key={section?.id ?? 'all'} className="rounded-2xl overflow-hidden" style={{ background: '#001d3d', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {section && (
                    <div className="px-5 py-3" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#ffc300' }}>{section.name}</p>
                    </div>
                  )}
                  {qs.map((q, i) => {
                    const qtype = Q_TYPES.find(t => t.kind === q.kind)
                    return (
                      <div
                        key={q.id}
                        className="flex items-center justify-between px-5 py-4"
                        style={{ borderBottom: i < qs.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-xs font-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}>{i + 1}</span>
                          <p className="text-sm font-medium truncate" style={{ color: q.prompt ? '#FFFFFF' : 'rgba(255,255,255,0.35)', fontStyle: q.prompt ? 'normal' : 'italic' }}>
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
                              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.38)' }}>{(q as any).timerSeconds}s</span>
                              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.38)' }}>{(q as any).points}pts</span>
                            </>
                          )}
                          <button
                            onClick={() => { setSelectedQId(q.id); setStep('questions') }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded transition-all"
                            style={{ color: '#ffc300', background: 'rgba(255,195,0,0.10)' }}
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
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleCreate}
              disabled={isSaving || !canCreate}
              className="btn-primary text-base disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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
