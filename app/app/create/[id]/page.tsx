'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, BarChart3, MessageSquare, Cloud, Smile,
  ArrowRight, ArrowLeft, AlertCircle, Plus, Trash2,
  CheckCircle2, ChevronRight, Edit2, Upload, RefreshCw, Image as ImageIcon, Palette,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { PresentationService } from '@/lib/services/PresentationService'
import { QuestionService } from '@/lib/services/QuestionService'
import { deleteLogoFile, uploadLogoFile } from '@/lib/logoUpload'
import { processLogoImage } from '@/lib/logoImageProcessing'
import { QuestionEditor } from '@/components/question-editor/QuestionEditor'
import { makeQuestion, convertQuestionKind } from '@/components/question-editor/makeQuestion'
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

type EditStep = 'name' | 'branding' | 'sections' | 'questions' | 'scoring' | 'review'

const COLOR_PALETTES = [
  { name: 'Teal Classic', primary: '#00A6A6' },
  { name: 'Ocean', primary: '#0369A1' },
  { name: 'Sunset', primary: '#DC2626' },
  { name: 'Midnight', primary: '#1E293B' },
  { name: 'Forest', primary: '#15803D' },
  { name: 'Berry', primary: '#9333EA' },
  { name: 'Coral', primary: '#EA580C' },
  { name: 'Slate', primary: '#475569' },
  { name: 'Gold', primary: '#B45309' },
  { name: 'Monochrome', primary: '#111111' },
]

// ─── Progress bar ──────────────────────────────────────────────────────────

function ProgressBar({ step, isQuiz }: { step: EditStep; isQuiz: boolean }) {
  const steps: EditStep[] = isQuiz
    ? ['name', 'branding', 'sections', 'questions', 'scoring', 'review']
    : ['name', 'branding', 'questions', 'review']
  const labels: Record<EditStep, string> = {
    name: 'Name', branding: 'Brand', sections: 'Sections', questions: 'Questions', scoring: 'Scoring', review: 'Review',
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

function EditZappPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const stepFromUrlApplied = useRef(false)
  const { isDark } = useTheme()
  const pageBg = isDark ? '#0f111a' : '#f8f7ff'
  const panelBg = isDark ? '#191b27' : '#ffffff'
  const panelAlt = isDark ? '#11131d' : '#f3f0ff'
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(122, 58, 240, 0.10)'
  const cardShadow = isDark ? '0 12px 40px rgba(0,0,0,0.35)' : '0 4px 24px rgba(80, 50, 120, 0.07), 0 1px 3px rgba(15, 23, 42, 0.04)'
  const headerShadow = isDark ? 'none' : '0 2px 16px rgba(80, 50, 120, 0.05)'
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
  const [typePickerPurpose, setTypePickerPurpose] = useState<'add' | 'change'>('add')
  const [mobileQuestionsView, setMobileQuestionsView] = useState<'list' | 'editor'>('list')
  const [brandLogoUrl, setBrandLogoUrl] = useState('')
  const [brandAccentColor, setBrandAccentColor] = useState(COLOR_PALETTES[5].primary)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [removeLogoBackground, setRemoveLogoBackground] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        setBrandLogoUrl(pres.brandLogoUrl ?? '')
        setBrandAccentColor(pres.brandAccentColor ?? COLOR_PALETTES[5].primary)
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

  // Deep-link to a step (e.g. ?step=questions from dashboard or presenter)
  useEffect(() => {
    if (stepFromUrlApplied.current) return
    const raw = searchParams.get('step')
    if (!raw) return
    const map: Record<string, EditStep> = {
      name: 'name',
      branding: 'branding',
      sections: 'sections',
      questions: 'questions',
      scoring: 'scoring',
      review: 'review',
    }
    const next = map[raw]
    if (next) {
      setStep(next)
      stepFromUrlApplied.current = true
    }
  }, [searchParams])

  // ── Step navigation ───────────────────────────────────────────────────────

  function getStepOrder(): EditStep[] {
    return isQuiz
      ? ['name', 'branding', 'sections', 'questions', 'scoring', 'review']
      : ['name', 'branding', 'questions', 'review']
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadError('')
    setUploadSuccess(false)
    setUploadingLogo(true)
    try {
      const processed = await processLogoImage(file, { removeBackground: removeLogoBackground })
      const url = await uploadLogoFile({
        file: processed,
        userId: user.id,
        slot: 'branding',
        fileName: 'logo.webp',
      })
      setBrandLogoUrl(url)
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 2500)
    } catch (err: any) {
      setUploadError(err?.message ?? 'Upload failed')
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  async function handleLogoRemove() {
    setUploadError('')
    setUploadSuccess(false)
    if (!user) {
      setBrandLogoUrl('')
      return
    }
    try {
      await deleteLogoFile({ userId: user.id, slot: 'branding' })
    } catch (err: any) {
      setUploadError(err?.message ?? 'Could not remove logo')
    }
    setBrandLogoUrl('')
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
    if (!kind) {
      setTypePickerPurpose('add')
      setShowTypePicker(true)
      return
    }
    const sectionId = useSections ? activeSectionId : undefined
    const q = makeQuestion(kind, questions.length, sectionId)
    setQuestions(prev => [...prev, q])
    setSelectedQId(q.id)
    setMobileQuestionsView('editor')
    setShowTypePicker(false)
  }

  function applyQuestionKind(kind: QuestionKind) {
    if (typePickerPurpose === 'change' && selectedQId) {
      setQuestions(prev =>
        prev.map(q => (q.id === selectedQId ? convertQuestionKind(q, kind) : q)),
      )
      setShowTypePicker(false)
      return
    }
    addQuestion(kind)
  }

  function deleteQuestion(qid: string) {
    const updated = questions.filter(q => q.id !== qid).map((q, i) => ({ ...q, orderIndex: i }))
    setQuestions(updated as Question[])
    if (selectedQId === qid) {
      const fallbackId = updated[0]?.id ?? null
      setSelectedQId(fallbackId)
      if (!fallbackId) {
        setMobileQuestionsView('list')
      }
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function persistChanges() {
    if (!user || !type) return
    const updates: Record<string, unknown> = { title: name || 'Untitled Zapp' }
    if (useSections && sections.length > 0) updates.sections = sections
    if (isQuiz) updates.scoringConfig = scoring
    updates.brandAccentColor = brandAccentColor
    updates.brandLogoUrl = brandLogoUrl
    await PresentationService.updatePresentation(id, updates)
    await QuestionService.saveQuestionSet(id, questions, type, name || 'Untitled Zapp')
  }

  async function saveToDashboard() {
    if (!user || !type) return
    setIsSaving(true)
    setError(null)
    try {
      await persistChanges()
      router.push('/app/dashboard')
    } catch (e: any) {
      setError(e.message || 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  async function saveAndPresent() {
    if (!user || !type) return
    setIsSaving(true)
    setError(null)
    try {
      await persistChanges()
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

  if (step === 'branding') {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6" style={{ background: pageBg }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
          <ProgressBar step="branding" isQuiz={isQuiz} />
          <div className="rounded-2xl p-6 sm:p-8 border" style={{ background: panelBg, borderColor: border, boxShadow: cardShadow }}>
            <h1 className="text-3xl font-black mb-2" style={{ color: textStrong }}>Branding</h1>
            <p className="text-sm mb-6" style={{ color: textMuted }}>Update logo and colour before editing questions.</p>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4" style={{ color: accent }} />
                  <p className="text-sm font-bold" style={{ color: textStrong }}>Logo</p>
                </div>
                {brandLogoUrl ? (
                  <div className="flex items-center gap-4 rounded-2xl p-4" style={{ background: panelAlt, border: `1px solid ${border}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={brandLogoUrl} alt="Brand logo" className="h-12 w-auto max-w-[120px] object-contain" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: textStrong }}>Logo ready</p>
                      <p className="text-xs" style={{ color: textSoft }}>Used on presenter and participant screens.</p>
                    </div>
                    <div className="flex gap-2">
                      <label className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer" style={{ background: accentSoft, color: accent }}>
                        <RefreshCw className="w-3 h-3" /> Replace
                        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingLogo} onChange={handleLogoUpload} />
                      </label>
                      <button type="button" onClick={handleLogoRemove} className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.10)', color: '#DC2626' }}>
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-3 rounded-2xl px-6 py-10 cursor-pointer" style={{ background: panelAlt, border: `2px dashed ${border}` }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: accentSoft }}>
                      {uploadingLogo ? <RefreshCw className="w-5 h-5 animate-spin" style={{ color: accent }} /> : <Upload className="w-5 h-5" style={{ color: accent }} />}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: textStrong }}>{uploadingLogo ? 'Uploading logo…' : 'Upload logo (PNG/JPG/WebP)'}</p>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingLogo} onChange={handleLogoUpload} />
                  </label>
                )}
                <label className="mt-3 flex items-center gap-2 text-xs font-semibold" style={{ color: textMuted }}>
                  <input type="checkbox" checked={removeLogoBackground} onChange={(e) => setRemoveLogoBackground(e.target.checked)} />
                  Remove white background from uploaded logo
                </label>
                {uploadError && <p className="text-xs mt-2 text-red-500">{uploadError}</p>}
                {uploadSuccess && <p className="text-xs mt-2 inline-flex items-center gap-1.5" style={{ color: '#16A34A' }}><CheckCircle2 className="w-3.5 h-3.5" /> Logo uploaded successfully.</p>}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4" style={{ color: accent }} />
                  <p className="text-sm font-bold" style={{ color: textStrong }}>Colour theme</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {COLOR_PALETTES.map((palette) => (
                    <button
                      key={palette.name}
                      type="button"
                      onClick={() => setBrandAccentColor(palette.primary)}
                      className="rounded-2xl p-3 text-left transition-all"
                      style={{
                        background: panelAlt,
                        border: `1px solid ${brandAccentColor === palette.primary ? 'rgba(101,12,217,0.34)' : border}`,
                        boxShadow: brandAccentColor === palette.primary ? '0 10px 20px rgba(101,12,217,0.14)' : 'none',
                      }}
                    >
                      <div className="w-8 h-8 rounded-xl mb-2" style={{ background: palette.primary }} />
                      <p className="text-sm font-bold" style={{ color: textStrong }}>{palette.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8">
              <button onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ color: textMuted }}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={nextStep} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white text-sm" style={{ background: accent }}>
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // ── STEP 2: Sections (Quiz only) ─────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════

  if (step === 'sections') {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6" style={{ background: pageBg }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto">
          <ProgressBar step="sections" isQuiz={true} />

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black mb-2" style={{ color: textStrong }}>Does your Quiz have sections?</h1>
            <p style={{ color: textMuted }}>Sections group questions by topic — e.g. Sports, Music, Economics</p>
          </div>

          {!useSections ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
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
                        aria-label="Remove section"
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
    const selectedIdx = visibleQuestions.findIndex(q => q.id === selectedQId)
    const canPrevQ = selectedIdx > 0
    const canNextQ = selectedIdx >= 0 && selectedIdx < visibleQuestions.length - 1

    const primaryBtn = {
      background: 'linear-gradient(135deg, #650cd9, #7a3af0)',
      boxShadow: isDark ? '0 6px 20px rgba(101,12,217,0.35)' : '0 6px 20px rgba(101, 12, 217, 0.28)',
    } as const

    return (
      <div className="min-h-screen flex flex-col" style={{ background: pageBg }}>
        {/* Top bar */}
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b z-10"
          style={{ background: panelBg, borderColor: border, boxShadow: headerShadow }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={prevStep}
              className="p-2.5 rounded-full transition-colors shrink-0"
              style={{ color: textMuted, background: panelAlt, border: `1px solid ${border}` }}
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: textSoft }}>
                {isQuiz ? 'Step 4' : 'Step 3'} — Questions
              </p>
              <h1 className="text-lg sm:text-xl font-black truncate tracking-tight" style={{ color: textStrong }}>{name}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <div className="md:hidden inline-flex items-center rounded-full p-1" style={{ background: panelAlt, border: `1px solid ${border}` }}>
              <button
                type="button"
                onClick={() => setMobileQuestionsView('list')}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={mobileQuestionsView === 'list' ? { background: accentSoft, color: accent } : { color: textMuted }}
              >
                Questions
              </button>
              <button
                type="button"
                onClick={() => setMobileQuestionsView('editor')}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={mobileQuestionsView === 'editor' ? { background: accentSoft, color: accent } : { color: textMuted }}
              >
                Editor
              </button>
            </div>
            <button
              type="button"
              onClick={() => void saveToDashboard()}
              disabled={isSaving}
              className="px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold border transition-all disabled:opacity-50"
              style={{ borderColor: border, color: textStrong, background: panelBg }}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => void saveAndPresent()}
              disabled={isSaving}
              className="hidden sm:inline-flex px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all disabled:opacity-50"
              style={primaryBtn}
            >
              Save &amp; present
            </button>
            <button
              type="button"
              onClick={nextStep}
              disabled={questions.length === 0}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm text-white disabled:opacity-50 transition-all"
              style={primaryBtn}
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left sidebar */}
          <div
            className={`${mobileQuestionsView === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-[22rem] lg:w-[26rem] xl:w-[28rem] flex-col overflow-hidden flex-shrink-0 border-r`}
            style={{ background: panelBg, borderColor: border, boxShadow: isDark ? 'none' : '4px 0 24px rgba(80, 50, 120, 0.04)' }}
          >

            {/* Section tabs (quiz with sections) */}
            {isQuiz && useSections && (
              <div className="border-b p-3 space-y-1" style={{ borderColor: border }}>
                {sections.map(sec => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setActiveSectionId(sec.id)
                      const first = questions.find(q => q.sectionId === sec.id)
                      if (first) setSelectedQId(first.id)
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: activeSectionId === sec.id ? accentSoft : 'transparent',
                      color: activeSectionId === sec.id ? accent : textMuted,
                      border: activeSectionId === sec.id ? `1px solid rgba(101,12,217,0.2)` : '1px solid transparent',
                    }}
                  >
                    {sec.name}
                    <span className="ml-1 text-[10px]">({questions.filter(q => q.sectionId === sec.id).length})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Question list */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {visibleQuestions.length === 0 && (
                <p className="text-xs text-center py-8 px-2 leading-relaxed" style={{ color: textSoft }}>No questions yet</p>
              )}
              {visibleQuestions.map((q, i) => {
                const qMeta = Q_TYPES.find(t => t.kind === q.kind)
                const QIcon = qMeta?.icon ?? Sparkles
                const active = selectedQId === q.id
                return (
                  <div key={q.id} className="flex items-stretch gap-1.5 group">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedQId(q.id)
                        setMobileQuestionsView('editor')
                      }}
                      className="flex-1 min-w-0 text-left px-3 py-2.5 rounded-xl text-xs transition-all"
                      style={{
                        background: active ? accentSoft : 'transparent',
                        color: active ? accent : textStrong,
                        border: active ? `1px solid rgba(101,12,217,0.22)` : '1px solid transparent',
                        boxShadow: active && !isDark ? '0 2px 12px rgba(101, 12, 217, 0.08)' : undefined,
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className="font-black tabular-nums text-[11px] w-5 shrink-0 text-right leading-5 pt-0.5"
                          style={{ color: active ? accent : textSoft }}
                        >
                          {i + 1}
                        </span>
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md mt-0.5"
                          style={{ background: `${qMeta?.color ?? accent}20` }}
                        >
                          <QIcon className="w-3 h-3" style={{ color: qMeta?.color ?? accent }} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 leading-snug font-semibold break-words line-clamp-3">
                          {q.prompt || <span style={{ color: textSoft, fontStyle: 'italic', fontWeight: 600 }}>Untitled</span>}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteQuestion(q.id)}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 rounded-lg transition-all flex-shrink-0 self-start"
                      style={{ color: textSoft, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(122,58,240,0.06)' }}
                      title="Delete question"
                      aria-label="Delete question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Add question */}
            <div className="p-3 border-t" style={{ borderColor: border }}>
              <button
                type="button"
                onClick={() => addQuestion()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all"
                style={{ background: accentSoft, color: accent, border: `1px solid rgba(101,12,217,0.22)` }}
              >
                <Plus className="w-4 h-4" /> Add question
              </button>
              <p className="text-[9px] text-center mt-2" style={{ color: textSoft }}>
                {questions.length} question{questions.length !== 1 ? 's' : ''} total
              </p>
            </div>
          </div>

          {/* Main editor area */}
          <div className={`${mobileQuestionsView === 'editor' ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-h-0 overflow-hidden`} style={{ background: pageBg }}>
            {!selectedQuestion ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-5 text-center p-8">
                <div
                  className="w-20 h-20 rounded-[1.25rem] flex items-center justify-center"
                  style={{ background: accentSoft, boxShadow: isDark ? undefined : cardShadow }}
                >
                  <Plus className="w-9 h-9" style={{ color: accent }} />
                </div>
                <div>
                  <p className="font-black text-xl tracking-tight" style={{ color: textStrong }}>Add your first question</p>
                  <p className="text-sm mt-2 max-w-sm mx-auto leading-relaxed" style={{ color: textMuted }}>
                    Pick a question type — you can mix poll, quiz, Q&amp;A, and more in one Zapp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addQuestion()}
                  className="mt-1 px-8 py-3.5 rounded-full font-bold text-white text-sm"
                  style={{ background: 'linear-gradient(135deg,#650cd9,#7a3af0)', boxShadow: '0 8px 24px rgba(101, 12, 217, 0.28)' }}
                >
                  + Add question
                </button>
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-6">
                <div
                  className="flex-1 min-h-0 flex flex-col rounded-[1.75rem] border overflow-hidden"
                  style={{
                    background: panelBg,
                    borderColor: border,
                    boxShadow: cardShadow,
                  }}
                >
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 shrink-0 px-5 sm:px-7 py-3.5 border-b"
                    style={{
                      borderColor: border,
                      background: isDark ? 'rgba(255,255,255,0.03)' : '#faf9ff',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <p className="mr-1 hidden sm:block text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: textSoft }}>
                        In this Zapp
                      </p>
                      <button
                        type="button"
                        onClick={() => canPrevQ && setSelectedQId(visibleQuestions[selectedIdx - 1]!.id)}
                        disabled={!canPrevQ}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold disabled:opacity-40 transition-opacity"
                        style={{
                          background: isDark ? panelBg : '#ffffff',
                          color: textStrong,
                          border: `1px solid ${border}`,
                          boxShadow: isDark ? undefined : '0 1px 3px rgba(101, 12, 217, 0.06)',
                        }}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => canNextQ && setSelectedQId(visibleQuestions[selectedIdx + 1]!.id)}
                        disabled={!canNextQ}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold disabled:opacity-40 transition-opacity"
                        style={{
                          background: isDark ? panelBg : '#ffffff',
                          color: textStrong,
                          border: `1px solid ${border}`,
                          boxShadow: isDark ? undefined : '0 1px 3px rgba(101, 12, 217, 0.06)',
                        }}
                      >
                        Next <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTypePickerPurpose('change')
                        setShowTypePicker(true)
                      }}
                      className="text-xs font-bold px-4 py-2 rounded-full"
                      style={{ background: accentSoft, color: accent, border: `1px solid rgba(101,12,217,0.22)` }}
                    >
                      Change type
                    </button>
                  </div>
                  <QuestionEditor
                    question={selectedQuestion}
                    questions={questions}
                    setQuestions={setQuestions}
                    onAddNextQuestion={() => addQuestion()}
                    addNextQuestionLabel="Next question"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Question type picker overlay */}
        <AnimatePresence>
          {showTypePicker && (
            <QuestionTypePicker
              onSelect={kind => applyQuestionKind(kind as QuestionKind)}
              onClose={() => setShowTypePicker(false)}
              defaultKind={
                typePickerPurpose === 'change' && selectedQuestion
                  ? (selectedQuestion.kind as QuestionKind)
                  : (type as QuestionKind | undefined)
              }
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
              <button onClick={() => setStep('name')} className="p-2 rounded-lg transition-colors" style={{ color: '#9CA3AF' }} aria-label="Edit name">
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button type="button" onClick={prevStep} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg" style={{ color: '#6B7280' }}>
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => void saveToDashboard()}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border transition-all disabled:opacity-50"
                style={{ borderColor: '#E5E7EB', color: '#374151', background: '#fff' }}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => void saveAndPresent()}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-black text-white text-base transition-all disabled:opacity-50"
                style={{ background: '#00A6A6', boxShadow: '0 4px 20px rgba(0,166,166,0.35)' }}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
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

export default function EditZappPageWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center gap-3" style={{ background: '#0f111a' }}>
          <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(101,12,217,0.20)', borderTopColor: '#650cd9' }} />
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading editor…</span>
        </div>
      }
    >
      <EditZappPage />
    </Suspense>
  )
}
