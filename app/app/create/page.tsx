'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, BarChart3, MessageSquare, Cloud, Smile,
  ArrowRight, ArrowLeft, AlertCircle, Plus, Trash2,
  CheckCircle2, ChevronRight, Edit2, Upload,
  RefreshCw, Palette, Lock, Image as ImageIcon,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePlanLimits } from '@/lib/hooks/usePlanLimits'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { deleteLogoFile, uploadLogoFile } from '@/lib/logoUpload'
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
  { type: 'quiz'       as PresentationType, name: 'Quiz',        icon: Sparkles,     color: '#650cd9', bg: 'rgba(101,12,217,0.12)',   description: 'Test knowledge with scored questions and a live leaderboard' },
  { type: 'poll'       as PresentationType, name: 'Live Poll',   icon: BarChart3,    color: '#006b5f', bg: 'rgba(0,107,95,0.12)',    description: 'Collect real-time votes shown as an animated bar chart' },
  { type: 'qa'         as PresentationType, name: 'Q&A Session', icon: MessageSquare,color: '#912f03', bg: 'rgba(145,47,3,0.12)',    description: 'Let your audience submit and upvote questions live' },
  { type: 'word_cloud' as PresentationType, name: 'Word Cloud',  icon: Cloud,        color: '#00a6a6', bg: 'rgba(0,166,166,0.10)',   description: 'Gather words from the crowd and watch them grow' },
  { type: 'feedback'   as PresentationType, name: 'Vibe Check',  icon: Smile,        color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', description: 'Capture quick ratings, emoji reactions and honest feedback' },
]

type WizardStep = 'name' | 'branding' | 'type' | 'sections' | 'questions' | 'scoring' | 'review'

// ─── Progress bar ──────────────────────────────────────────────────────────

function ProgressBar({ step, isQuiz, isDark }: { step: WizardStep; isQuiz: boolean; isDark: boolean }) {
  const quizSteps: WizardStep[] = ['name', 'branding', 'type', 'sections', 'questions', 'scoring', 'review']
  const otherSteps: WizardStep[] = ['name', 'branding', 'type', 'questions', 'review']
  const steps = isQuiz ? quizSteps : otherSteps
  const labels: Record<WizardStep, string> = {
    name: 'Name', branding: 'Brand', type: 'Type', sections: 'Sections',
    questions: 'Questions', scoring: 'Scoring', review: 'Review',
  }
  const currentIdx = steps.indexOf(step)
  const idleBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(123,116,135,0.16)'
  const idleText = isDark ? 'rgba(255,255,255,0.38)' : '#8b8498'
  const activeBg = isDark ? 'rgba(101,12,217,0.16)' : 'rgba(101,12,217,0.12)'

  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: i < currentIdx ? '#650cd9' : i === currentIdx ? activeBg : idleBg,
                color: i < currentIdx ? '#ffffff' : i === currentIdx ? '#650cd9' : idleText,
                border: i === currentIdx ? '2px solid rgba(101,12,217,0.20)' : 'none',
              }}
            >
              {i < currentIdx ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: i === currentIdx ? '#650cd9' : idleText }}>
              {labels[s]}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-8 h-0.5 mb-4 rounded-full" style={{ background: i < currentIdx ? '#650cd9' : idleBg }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Question type picker overlay ─────────────────────────────────────────

function QuestionTypePicker({
  onSelect, onClose, defaultKind, isDark, remainingSlots, maxQuestionsAllowed,
}: {
  onSelect: (kind: QuestionKind) => void
  onClose: () => void
  defaultKind?: QuestionKind
  isDark: boolean
  remainingSlots: number
  maxQuestionsAllowed: number
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
        style={{ background: isDark ? '#191b27' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(123,116,135,0.16)'}`, boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.60)' : '0 24px 64px rgba(61,39,109,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-lg font-black" style={{ color: isDark ? '#FFFFFF' : '#1c1b1b' }}>Choose question type</h3>
          <p className="text-sm mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.50)' : '#645d71' }}>Each question in your Zapp can be a different type</p>
          <p className="text-xs mt-3 font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.44)' : '#7a7188' }}>
            {remainingSlots} of {maxQuestionsAllowed} question slots remaining on your current plan
          </p>
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
                  background: isDefault ? qt.bg : isDark ? 'rgba(255,255,255,0.04)' : '#f5f1f8',
                  border: `1.5px solid ${isDefault ? qt.border : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(123,116,135,0.16)'}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = qt.bg; e.currentTarget.style.borderColor = qt.border }}
                onMouseLeave={e => { e.currentTarget.style.background = isDefault ? qt.bg : isDark ? 'rgba(255,255,255,0.04)' : '#f5f1f8'; e.currentTarget.style.borderColor = isDefault ? qt.border : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(123,116,135,0.16)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${qt.color}22` }}>
                  <Icon className="w-5 h-5" style={{ color: qt.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: isDark ? '#FFFFFF' : '#1c1b1b' }}>{qt.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.50)' : '#645d71' }}>{qt.sub}</p>
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
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : '#f2edf6', color: isDark ? 'rgba(255,255,255,0.65)' : '#5b5469' }}>
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  )
}

async function compressToWebP(file: File, maxWidth = 640, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const width = Math.round(img.width * scale)
      const height = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not process image'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/webp',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Invalid image'))
    }
    img.src = url
  })
}

// ─── Main wizard ───────────────────────────────────────────────────────────

export default function CreatePage() {
  const { user } = useAuth()
  const planLimits = usePlanLimits()
  const router = useRouter()
  const { isDark } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Wizard state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>('name')
  const [name, setName] = useState('')
  const [selectedPalette, setSelectedPalette] = useState(5)
  const [brandLogoUrl, setBrandLogoUrl] = useState('')
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
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const canBrand    = !!planLimits.plan?.features.canUseBranding && !planLimits.isPlanExpired
  const canCreate   = planLimits.canCreatePresentation
  const isQuiz      = type === 'quiz'
  const pageBg = isDark
    ? 'radial-gradient(circle at top left, rgba(101,12,217,0.18), transparent 24%), radial-gradient(circle at right center, rgba(0,107,95,0.12), transparent 22%), #0f111a'
    : 'radial-gradient(circle at top left, rgba(101,12,217,0.08), transparent 24%), radial-gradient(circle at right center, rgba(167,139,250,0.10), transparent 24%), #fcf9f8'
  const panelBg = isDark ? '#191b27' : '#ffffff'
  const panelAlt = isDark ? '#11131d' : '#f5f7fa'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(123,116,135,0.16)'
  const textStrong = isDark ? '#ffffff' : '#1c1b1b'
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : '#645d71'
  const textSoft = isDark ? 'rgba(255,255,255,0.35)' : '#938ca0'
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : '#f3eef7'
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(123,116,135,0.16)'
  const accent = '#650cd9'
  const accentSoft = 'rgba(101,12,217,0.10)'
  const accentBorder = 'rgba(101,12,217,0.22)'
  const canvasBg = isDark
    ? 'radial-gradient(circle at 50% 30%, rgba(101,12,217,0.16), transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0)), #12131b'
    : 'radial-gradient(circle at 50% 20%, rgba(101,12,217,0.08), transparent 28%), linear-gradient(180deg, rgba(101,12,217,0.02), rgba(255,255,255,0)), #faf7fb'

  // Derived: questions in the active section (or all if no sections)
  const visibleQuestions = useSections
    ? questions.filter(q => q.sectionId === activeSectionId)
    : questions

  const selectedQuestion = questions.find(q => q.id === selectedQId) ?? null
  const maxQuestionsAllowed = planLimits.maxQuestionsPerPresentation
  const hasReachedQuestionLimit = questions.length >= maxQuestionsAllowed
  const remainingQuestionSlots = Math.max(0, maxQuestionsAllowed - questions.length)

  // ── Navigation helpers ───────────────────────────────────────────────────

  function nextStep() {
    const order: WizardStep[] = isQuiz
      ? ['name', 'branding', 'type', 'sections', 'questions', 'scoring', 'review']
      : ['name', 'branding', 'type', 'questions', 'review']
    const idx = order.indexOf(step)
    if (idx < order.length - 1) setStep(order[idx + 1])
  }

  function prevStep() {
    const order: WizardStep[] = isQuiz
      ? ['name', 'branding', 'type', 'sections', 'questions', 'scoring', 'review']
      : ['name', 'branding', 'type', 'questions', 'review']
    const idx = order.indexOf(step)
    if (idx > 0) setStep(order[idx - 1])
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user || !canBrand) return
    setUploadError('')
    setUploadSuccess(false)
    setUploading(true)
    try {
      const uploadBlob = file.type === 'image/svg+xml'
        ? file
        : await compressToWebP(file)
      const downloadUrl = await uploadLogoFile({
        file: uploadBlob,
        userId: user.id,
        slot: 'wizard-draft',
        fileName: file.type === 'image/svg+xml' ? 'logo.svg' : 'logo.webp',
      })
      setBrandLogoUrl(downloadUrl)
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (err: any) {
      setUploadError(err?.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleLogoRemove() {
    setUploadError('')
    setUploadSuccess(false)

    if (user) {
      try {
        await deleteLogoFile({
          userId: user.id,
          slot: 'wizard-draft',
        })
      } catch (err: any) {
        setUploadError(err?.message ?? 'Could not remove logo')
      }
    }

    setBrandLogoUrl('')
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
    if (hasReachedQuestionLimit) {
      setError(`Your ${planLimits.plan.name} plan allows up to ${maxQuestionsAllowed} questions per Zapp.`)
      setShowTypePicker(false)
      return
    }

    // If no kind given and questions exist, show the type picker
    if (!kind) { setShowTypePicker(true); return }
    const sectionId = useSections ? activeSectionId : undefined
    const q = makeQuestion(kind, questions.length, sectionId)
    setQuestions(prev => [...prev, q])
    setSelectedQId(q.id)
    setError(null)
    setShowTypePicker(false)
  }

  function deleteQuestion(id: string) {
    const updated = questions.filter(q => q.id !== id).map((q, i) => ({ ...q, orderIndex: i }))
    setQuestions(updated as Question[])
    if (selectedQId === id) setSelectedQId(updated[0]?.id ?? null)
  }

  useEffect(() => {
    if (step !== 'questions') return
    if (questions.length > 0) return
    if (showTypePicker) return
    setShowTypePicker(true)
  }, [step, questions.length, showTypePicker])

  // ── Save & create ────────────────────────────────────────────────────────

  async function handleCreate(destination: 'dashboard' | 'present') {
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
      if (canBrand) updates.brandAccentColor = COLOR_PALETTES[selectedPalette].primary
      if (canBrand && brandLogoUrl) updates.brandLogoUrl = brandLogoUrl
      if (Object.keys(updates).length > 0) {
        await PresentationService.updatePresentation(presentationId, updates)
      }

      // Save all questions
      if (questions.length > 0) {
        await QuestionService.saveQuestionSet(presentationId, questions, type, name || 'Untitled Zapp')
      }

      if (destination === 'dashboard') {
        router.push('/app/dashboard')
      } else {
        router.push(`/app/present/${presentationId}`)
      }
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
      <div className="min-h-screen flex items-center justify-center px-4 py-8 md:px-6" style={{ background: pageBg }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[28px] p-7 md:p-9" style={{ background: panelBg, border: `1px solid ${border}`, boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.50)' : '0 24px 64px rgba(61,39,109,0.12)' }}>
              <div className="mb-8">
                <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em]" style={{ background: accentSoft, color: accent }}>
                  Step 1
                </span>
                <h1 className="text-3xl md:text-4xl font-black mt-4 mb-2" style={{ color: textStrong }}>Name your Zapp</h1>
                <p className="max-w-xl" style={{ color: textMuted }}>
                  Every new presentation starts here. Give the session a strong title now, then we&apos;ll style it and build the interaction flow through the wizard.
                </p>
              </div>

              {!canCreate && (
                <div className="mb-6 p-4 rounded-2xl border-l-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.10)', borderColor: '#EF4444' }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#FB7185' }}>Plan limit reached</p>
                    <p className="text-sm mt-0.5" style={{ color: '#FB7185' }}>You&apos;ve used all your Zapps for this month on your plan. Upgrade to create more.</p>
                  </div>
                </div>
              )}

              <form onSubmit={e => { e.preventDefault(); if (name.trim() && canCreate) nextStep() }} className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-semibold mb-2" style={{ color: textMuted }}>
                    Zapp name
                  </label>
                  <input
                    id="title"
                    type="text"
                    autoFocus
                    placeholder="e.g. Innovation Summit Kickoff"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border-2 transition-all text-lg font-semibold"
                    style={{ borderColor: name ? accent : inputBorder, background: inputBg, color: textStrong }}
                    onFocus={e => (e.currentTarget.style.borderColor = accent)}
                    onBlur={e => (e.currentTarget.style.borderColor = name ? accent : inputBorder)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Name', value: 'Required now' },
                    { label: 'Branding', value: 'Logo + theme next' },
                    { label: 'Questions', value: 'Built in a guided loop' },
                  ].map(item => (
                    <div key={item.label} className="rounded-2xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f6f1fa', border: `1px solid ${border}` }}>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: textSoft }}>{item.label}</p>
                      <p className="text-sm font-semibold mt-2" style={{ color: textStrong }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!name.trim() || !canCreate}
                  className="btn-primary w-full justify-center disabled:opacity-50"
                  style={{ cursor: (name.trim() && canCreate) ? 'pointer' : 'not-allowed' }}
                >
                  Continue to branding <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="rounded-[28px] p-6 md:p-7 flex flex-col justify-between" style={{ background: isDark ? 'rgba(18,19,27,0.92)' : 'rgba(255,255,255,0.72)', border: `1px solid ${border}`, boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.40)' : '0 20px 48px rgba(61,39,109,0.10)' }}>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: textSoft }}>Preview</p>
                <div className="mt-5 rounded-[26px] p-5 min-h-[300px]" style={{ background: canvasBg, border: `1px solid ${border}` }}>
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em]" style={{ background: accentSoft, color: accent }}>
                    LiveZapp wizard
                  </div>
                  <h2 className="text-2xl font-black mt-5" style={{ color: textStrong }}>{name.trim() || 'Your next Zapp'}</h2>
                  <p className="mt-2 max-w-sm text-sm" style={{ color: textMuted }}>
                    We&apos;re switching this flow to a proper guided setup so every new Zapp starts with identity first, then moves cleanly into interaction design.
                  </p>
                </div>
              </div>
              <p className="text-sm mt-5" style={{ color: textSoft }}>You can still edit the name later, but setting it now keeps the wizard flow clear and consistent.</p>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  if (step === 'branding') {
    return (
      <div className="min-h-screen py-8 px-4 md:px-6" style={{ background: pageBg }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto">
          <ProgressBar step="branding" isQuiz={isQuiz} isDark={isDark} />

          <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-[28px] p-6 md:p-8" style={{ background: panelBg, border: `1px solid ${border}` }}>
              <div className="mb-7">
                <h1 className="text-3xl font-black mb-2" style={{ color: textStrong }}>Style your Zapp</h1>
                <p style={{ color: textMuted }}>
                  Add the logo and colour theme before you choose the interaction type. This keeps every new Zapp consistent from the very first join screen.
                </p>
              </div>

              {!canBrand && (
                <div className="mb-6 rounded-2xl p-4 flex items-start gap-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f6f1fa', border: `1px solid ${border}` }}>
                  <Lock className="w-4 h-4 mt-0.5" style={{ color: accent }} />
                  <div className="text-sm" style={{ color: textMuted }}>
                    Custom logo and theme are available on Basic and above. You can continue with the default LiveZapp styling, or{' '}
                    <Link href="/plans" style={{ color: accent, fontWeight: 700 }}>upgrade now</Link>.
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="w-4 h-4" style={{ color: accent }} />
                    <p className="text-sm font-bold" style={{ color: textStrong }}>Logo</p>
                  </div>

                  {brandLogoUrl ? (
                    <div className="flex items-center gap-4 rounded-2xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f6f1fa', border: `1px solid ${border}` }}>
                      <img src={brandLogoUrl} alt="Zapp logo" className="h-12 w-auto max-w-[110px] rounded object-contain" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: textStrong }}>Custom logo added</p>
                        <p className="text-xs mt-1" style={{ color: textSoft }}>This will appear on the presenter join screen and participant entry view.</p>
                      </div>
                      <div className="flex gap-2">
                        <label className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer" style={{ background: accentSoft, color: accent, border: `1px solid ${accentBorder}` }}>
                          <RefreshCw className="w-3 h-3" /> Replace
                          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" disabled={!canBrand || uploading} onChange={handleLogoUpload} />
                        </label>
                        <button type="button" onClick={handleLogoRemove} disabled={uploading} className="rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-40" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-3 rounded-[24px] px-6 py-10 cursor-pointer" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#faf6fd', border: `2px dashed ${accentBorder}` }}>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: accentSoft }}>
                        {uploading ? <RefreshCw className="w-5 h-5 animate-spin" style={{ color: accent }} /> : <Upload className="w-5 h-5" style={{ color: accent }} />}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold" style={{ color: textStrong }}>{uploading ? 'Uploading logo…' : 'Upload logo'}</p>
                        <p className="text-xs mt-1" style={{ color: textSoft }}>PNG, JPG, WebP, or SVG</p>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" disabled={!canBrand || uploading} onChange={handleLogoUpload} />
                    </label>
                  )}

                  {uploadError && <p className="text-xs mt-2 text-red-500">{uploadError}</p>}
                  {uploadSuccess && <p className="text-xs mt-2" style={{ color: '#16A34A' }}>Logo uploaded successfully.</p>}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="w-4 h-4" style={{ color: accent }} />
                    <p className="text-sm font-bold" style={{ color: textStrong }}>Colour theme</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {COLOR_PALETTES.map((palette, i) => (
                      <button
                        key={palette.name}
                        type="button"
                        disabled={!canBrand}
                        onClick={() => setSelectedPalette(i)}
                        className="rounded-2xl p-3 text-left transition-all disabled:opacity-45"
                        style={{
                          background: selectedPalette === i ? (isDark ? 'rgba(255,255,255,0.05)' : '#ffffff') : (isDark ? 'rgba(255,255,255,0.03)' : '#faf6fd'),
                          border: `1px solid ${selectedPalette === i ? accentBorder : border}`,
                          boxShadow: selectedPalette === i ? '0 10px 28px rgba(101,12,217,0.16)' : 'none',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-7 h-7 rounded-xl" style={{ background: palette.primary }} />
                          <span className="w-7 h-7 rounded-xl" style={{ background: palette.accent }} />
                        </div>
                        <p className="text-sm font-bold" style={{ color: textStrong }}>{palette.name}</p>
                        <p className="text-[11px] mt-1" style={{ color: textSoft }}>{palette.primary}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-8">
                <button onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ color: textMuted }}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={nextStep} className="btn-primary">
                  Continue to type <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="rounded-[28px] p-6 md:p-7" style={{ background: panelBg, border: `1px solid ${border}` }}>
              <p className="text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: textSoft }}>Live preview</p>
              <div className="mt-5 rounded-[26px] overflow-hidden" style={{ background: canvasBg, border: `1px solid ${border}` }}>
                <div className="p-5 border-b" style={{ borderColor: border }}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {brandLogoUrl ? (
                        <img src={brandLogoUrl} alt="Brand logo preview" className="h-10 max-w-[96px] rounded object-contain" />
                      ) : (
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${COLOR_PALETTES[selectedPalette].primary}22` }}>
                          <Sparkles className="w-4 h-4" style={{ color: COLOR_PALETTES[selectedPalette].primary }} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: textStrong }}>{name || 'Untitled Zapp'}</p>
                        <p className="text-xs truncate" style={{ color: textSoft }}>{COLOR_PALETTES[selectedPalette].name} theme</p>
                      </div>
                    </div>
                    <span className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]" style={{ background: `${COLOR_PALETTES[selectedPalette].primary}20`, color: COLOR_PALETTES[selectedPalette].primary }}>
                      Join live
                    </span>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="rounded-[22px] p-5" style={{ background: isDark ? '#11131b' : '#ffffff', border: `1px solid ${border}` }}>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: COLOR_PALETTES[selectedPalette].primary }}>Game pin</p>
                    <div className="mt-3 rounded-[20px] px-5 py-5 text-center text-3xl font-black tracking-[0.45em]" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f3eef7', color: textStrong }}>
                      000 000
                    </div>
                  </div>
                  <button className="w-full rounded-[18px] py-3.5 text-sm font-black text-white" style={{ background: `linear-gradient(135deg, ${COLOR_PALETTES[selectedPalette].primary}, ${COLOR_PALETTES[selectedPalette].accent})`, boxShadow: '0 14px 34px rgba(101,12,217,0.20)' }}>
                    Join Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── STEP 2: Type ─────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  if (step === 'type') {
    return (
      <div className="min-h-screen py-12 px-6" style={{ background: pageBg }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto">
          <ProgressBar step="type" isQuiz={false} isDark={isDark} />

          <div className="mb-10 text-center">
            <h1 className="text-4xl font-black mb-3" style={{ color: textStrong }}>What kind of Zapp?</h1>
            <p className="text-lg" style={{ color: textMuted }}><strong>"{name}"</strong> will use the type you choose for all questions</p>
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
                  style={{ background: panelBg, borderColor: border }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = zapp.color; e.currentTarget.style.background = zapp.bg }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = panelBg }}
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: zapp.bg }}>
                    <Icon className="w-7 h-7" style={{ color: zapp.color }} />
                  </div>
                  <h3 className="font-black text-lg mb-1" style={{ color: zapp.color }}>{zapp.name}</h3>
                  <p className="text-sm" style={{ color: textMuted }}>{zapp.description}</p>
                </motion.button>
              )
            })}
          </div>

          <div className="flex justify-start">
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all" style={{ color: textMuted }}>
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
      <div className="min-h-screen py-12 px-6" style={{ background: pageBg }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto">
          <ProgressBar step="sections" isQuiz={true} isDark={isDark} />

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black mb-2" style={{ color: textStrong }}>Does your Quiz have sections?</h1>
            <p style={{ color: textMuted }}>Sections group questions by topic — e.g. Sports, Music, Economics</p>
          </div>

          {/* Choice cards */}
          {!useSections ? (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => { setUseSections(false); nextStep() }}
                className="p-6 rounded-xl border-2 text-center transition-all"
                style={{ background: panelBg, borderColor: border }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accent }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = border }}
              >
                <div className="text-3xl mb-3">📋</div>
                <p className="font-black text-base" style={{ color: textStrong }}>One section</p>
                <p className="text-xs mt-1" style={{ color: textMuted }}>All questions in a single list</p>
              </button>
              <button
                onClick={() => setUseSections(true)}
                className="p-6 rounded-xl border-2 text-center transition-all"
                style={{ background: panelBg, borderColor: border }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = accent }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = border }}
              >
                <div className="text-3xl mb-3">🗂️</div>
                <p className="font-black text-base" style={{ color: textStrong }}>Multiple sections</p>
                <p className="text-xs mt-1" style={{ color: textMuted }}>Group questions by topic</p>
              </button>
            </div>
          ) : (
            <div className="rounded-xl p-6 mb-6 space-y-4" style={{ background: panelBg, border: `1px solid ${border}` }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Section name (e.g. Sports)"
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSection()}
                  className="flex-1 px-3 py-2.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: inputBorder, color: textStrong, background: inputBg }}
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
                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f6f1fa', border: `1px solid ${border}` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: accent }}>{i + 1}</span>
                      <span className="text-sm font-semibold" style={{ color: textStrong }}>{sec.name}</span>
                    </div>
                    {sections.length > 1 && (
                      <button onClick={() => removeSection(sec.id)} className="p-1 rounded transition-colors" style={{ color: textSoft }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = textSoft)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {sections.length < 2 && (
                <p className="text-xs" style={{ color: accent }}>Add at least 2 sections, or go back and choose "One section"</p>
              )}
            </div>
          )}

          {/* Nav */}
          <div className="flex items-center justify-between">
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ color: textMuted }}>
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
      <div className="min-h-screen flex flex-col" style={{ background: pageBg }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3.5" style={{ background: panelBg, borderBottom: `1px solid ${border}` }}>
          <div className="flex items-center gap-3">
            <button onClick={prevStep} className="p-2 rounded-lg transition-colors" style={{ color: textMuted }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: textSoft }}>Step {isQuiz ? 5 : 4} — Questions</p>
              <h1 className="text-lg font-black" style={{ color: textStrong }}>{name}</h1>
              <p className="text-xs mt-1" style={{ color: textMuted }}>
                Choose a question type, configure it, then repeat the loop until your Zapp is ready.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em]" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f4eef9', color: textMuted }}>
              <span>{questions.length}</span>
              <span>/</span>
              <span>{maxQuestionsAllowed}</span>
              <span>questions</span>
            </div>
            <button
              onClick={nextStep}
              disabled={questions.length === 0}
              className="btn-primary disabled:opacity-50"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          <div className="w-[min(100%,20rem)] sm:w-[22rem] lg:w-[26rem] xl:w-[28rem] flex flex-col overflow-hidden flex-shrink-0" style={{ background: panelBg, borderRight: `1px solid ${border}` }}>

            {/* Section tabs (quiz with sections only) */}
            {isQuiz && useSections && (
              <div className="p-3 space-y-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {sections.map(sec => (
                  <button
                    key={sec.id}
                    onClick={() => { setActiveSectionId(sec.id); const first = questions.find(q => q.sectionId === sec.id); if (first) setSelectedQId(first.id) }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: activeSectionId === sec.id ? accentSoft : 'transparent',
                      color: activeSectionId === sec.id ? accent : textMuted,
                      border: activeSectionId === sec.id ? `1px solid ${accentBorder}` : '1px solid transparent',
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
                <p className="text-xs text-center py-6" style={{ color: textSoft }}>No questions yet</p>
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
                        background: selectedQId === q.id ? accentSoft : 'transparent',
                        color: selectedQId === q.id ? accent : isDark ? 'rgba(255,255,255,0.65)' : '#5d566b',
                        border: selectedQId === q.id ? `1px solid ${accentBorder}` : '1px solid transparent',
                    }}
                  >
                      <div className="flex items-center gap-2">
                        <span className="font-bold shrink-0" style={{ color: textSoft }}>{i + 1}.</span>
                        <QIcon className="w-3 h-3 shrink-0" style={{ color: qMeta?.color ?? accent }} />
                        <span className="truncate">{q.prompt || <span style={{ color: textSoft, fontStyle: 'italic' }}>Untitled</span>}</span>
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
                disabled={hasReachedQuestionLimit}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all"
                style={{ background: accentSoft, color: accent, border: `1px solid ${accentBorder}`, opacity: hasReachedQuestionLimit ? 0.45 : 1 }}
              >
                <Plus className="w-3.5 h-3.5" /> {hasReachedQuestionLimit ? 'Question limit reached' : 'Add Question'}
              </button>
              <p className="text-[9px] text-center mt-2" style={{ color: textSoft }}>
                {questions.length} of {maxQuestionsAllowed} question{maxQuestionsAllowed !== 1 ? 's' : ''} used
              </p>
            </div>
          </div>

          {/* Main editor area */}
          <div className="flex-1 overflow-y-auto" style={{ background: canvasBg }}>
            {!selectedQuestion ? (
              <div className="min-h-full flex items-center justify-center p-5 md:p-8">
                <div className="w-full max-w-4xl rounded-[30px] p-6 md:p-8" style={{ background: isDark ? 'rgba(16,18,26,0.72)' : 'rgba(255,255,255,0.78)', border: `1px solid ${border}`, boxShadow: isDark ? '0 30px 80px rgba(0,0,0,0.26)' : '0 30px 80px rgba(61,39,109,0.08)' }}>
                  <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div>
                      <div className="w-16 h-16 rounded-[22px] flex items-center justify-center" style={{ background: accentSoft }}>
                        <Plus className="w-7 h-7" style={{ color: accent }} />
                      </div>
                      <p className="font-black text-2xl mt-5" style={{ color: textStrong }}>Add your first question</p>
                      <p className="text-sm mt-2 max-w-md" style={{ color: textMuted }}>
                        The question wizard opens first, lets you choose the prompt type, and then loops again each time you add another question.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-5">
                        {Q_TYPES.slice(0, 5).map(qt => (
                          <button
                            key={qt.kind}
                            type="button"
                            onClick={() => addQuestion(qt.kind as QuestionKind)}
                            className="rounded-full px-3 py-2 text-xs font-bold"
                            style={{ background: qt.bg, color: qt.color, border: `1px solid ${qt.border}` }}
                          >
                            {qt.label}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => addQuestion()}
                        disabled={hasReachedQuestionLimit}
                        className="btn-primary mt-6 text-base"
                      >
                        {hasReachedQuestionLimit ? 'Question limit reached' : '+ Start Question Wizard'}
                      </button>
                    </div>

                    <div className="rounded-[24px] p-5" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8f4fb', border: `1px solid ${border}` }}>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: textSoft }}>Question flow</p>
                      <div className="space-y-3 mt-4">
                        {[
                          'Choose the question type',
                          'Write the prompt and configure the response rules',
                          'Click add another to repeat the loop',
                        ].map((item, idx) => (
                          <div key={item} className="flex items-start gap-3 rounded-2xl p-3.5" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff', border: `1px solid ${border}` }}>
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: accentSoft, color: accent }}>{idx + 1}</span>
                            <p className="text-sm leading-6" style={{ color: textStrong }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <QuestionEditor
                  question={selectedQuestion}
                  questions={questions}
                  setQuestions={setQuestions}
                  onAddNextQuestion={() => addQuestion()}
                  disableAddNextQuestion={hasReachedQuestionLimit}
                  addNextQuestionLabel="Next question"
                />
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
              isDark={isDark}
              remainingSlots={remainingQuestionSlots}
              maxQuestionsAllowed={maxQuestionsAllowed}
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
      <div className="min-h-screen py-12 px-6" style={{ background: pageBg }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto">
          <ProgressBar step="scoring" isQuiz={true} isDark={isDark} />

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black mb-2" style={{ color: textStrong }}>When to reveal scores?</h1>
            <p style={{ color: textMuted }}>Choose when participants see their score — you can enable multiple</p>
          </div>

          <div className="rounded-2xl overflow-hidden mb-6" style={{ background: panelBg, border: `1px solid ${border}` }}>
            {toggles.map((t, i) => (
              <div
                key={t.key}
                className="flex items-center justify-between px-6 py-5"
                style={{ borderBottom: i < toggles.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}
              >
                <div>
                  <p className="text-sm font-bold" style={{ color: textStrong }}>{t.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: textMuted }}>{t.desc}</p>
                </div>
                <button
                  onClick={() => setScoring(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                  className="relative rounded-full transition-all flex-shrink-0 ml-4"
                  style={{ background: scoring[t.key] ? accent : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(123,116,135,0.20)', minWidth: 44, height: 24 }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                    style={{ left: scoring[t.key] ? '22px' : '2px', background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ color: textMuted }}>
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
      <div className="min-h-screen py-12 px-6" style={{ background: pageBg }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
          <ProgressBar step="review" isQuiz={isQuiz} isDark={isDark} />

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black mb-2" style={{ color: textStrong }}>Ready to launch?</h1>
            <p style={{ color: textMuted }}>Review your Zapp before creating it</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-lg border-l-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.10)', borderColor: '#EF4444' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#EF4444' }} />
              <p style={{ color: '#FB7185' }}>{error}</p>
            </div>
          )}

          {/* Summary card */}
          <div className="rounded-2xl p-6 mb-6" style={{ background: panelBg, border: `1px solid ${border}` }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black" style={{ color: textStrong }}>{name || 'Untitled Zapp'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {typeInfo && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: typeInfo.bg, color: typeInfo.color }}>
                      {typeInfo.name}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: textSoft }}>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
                  {useSections && <span className="text-xs" style={{ color: textSoft }}>{sections.length} sections</span>}
                  {isQuiz && scoringLabels.length > 0 && (
                    <span className="text-xs" style={{ color: textSoft }}>Scoring: {scoringLabels.join(', ')}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setStep('name')} className="p-2 rounded-lg transition-colors" style={{ color: textSoft }}>
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Questions grouped */}
          {questions.length === 0 ? (
            <div className="rounded-2xl p-8 text-center mb-6" style={{ background: panelBg, border: `1px solid ${border}` }}>
              <p className="font-bold" style={{ color: textStrong }}>No questions yet</p>
              <p className="text-sm mt-1" style={{ color: textMuted }}>You can still create the Zapp and add questions later</p>
              <button onClick={() => setStep('questions')} className="mt-4 text-sm font-bold" style={{ color: accent }}>Add questions now</button>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {grouped.map(({ section, qs }) => (
                <div key={section?.id ?? 'all'} className="rounded-2xl overflow-hidden" style={{ background: panelBg, border: `1px solid ${border}` }}>
                  {section && (
                    <div className="px-5 py-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f5f1f8', borderBottom: `1px solid ${border}` }}>
                      <p className="text-xs font-black uppercase tracking-wider" style={{ color: accent }}>{section.name}</p>
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
                          <span className="text-xs font-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#f1ebf7', color: textMuted }}>{i + 1}</span>
                          <p className="text-sm font-medium truncate" style={{ color: q.prompt ? textStrong : textSoft, fontStyle: q.prompt ? 'normal' : 'italic' }}>
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
                              <span className="text-[10px]" style={{ color: textSoft }}>{(q as any).timerSeconds}s</span>
                              <span className="text-[10px]" style={{ color: textSoft }}>{(q as any).points}pts</span>
                            </>
                          )}
                          <button
                            onClick={() => { setSelectedQId(q.id); setStep('questions') }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded transition-all"
                            style={{ color: accent, background: accentSoft }}
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button type="button" onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ color: textMuted }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => void handleCreate('dashboard')}
                disabled={isSaving || !canCreate}
                className="px-6 py-3 rounded-xl font-bold text-sm border disabled:opacity-50"
                style={{ borderColor: border, color: textStrong, background: panelAlt }}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => void handleCreate('present')}
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
                    Save &amp; present <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    )
  }

  return null
}
