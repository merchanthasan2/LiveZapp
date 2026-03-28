'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Layout, Sparkles, Send, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { PresentationService } from '@/lib/services/PresentationService'
import { PresentationType } from '@/types/domain'

const TYPES = [
  {
    id:    'quiz' as PresentationType,
    label: 'Interactive Quiz',
    desc:  'Test knowledge with timed questions & leaderboards.',
    icon:  Sparkles,
    iconBg:    'rgba(84,120,255,0.14)',
    iconColor: '#5478FF',
    activeBorder: 'rgba(84,120,255,0.55)',
    activeBg:     'rgba(84,120,255,0.08)',
    activeRing:   '0 0 0 1px rgba(84,120,255,0.45)',
  },
  {
    id:    'qa' as PresentationType,
    label: 'Live Q&A',
    desc:  'Let your audience ask questions and upvote favourites.',
    icon:  MessageSquare,
    iconBg:    'rgba(83,203,243,0.14)',
    iconColor: '#53CBF3',
    activeBorder: 'rgba(83,203,243,0.55)',
    activeBg:     'rgba(83,203,243,0.06)',
    activeRing:   '0 0 0 1px rgba(83,203,243,0.35)',
  },
  {
    id:    'feedback' as PresentationType,
    label: 'Quick Feedback',
    desc:  'Gather ratings and short-text responses instantly.',
    icon:  Send,
    iconBg:    'rgba(34,197,94,0.14)',
    iconColor: '#22C55E',
    activeBorder: 'rgba(34,197,94,0.55)',
    activeBg:     'rgba(34,197,94,0.06)',
    activeRing:   '0 0 0 1px rgba(34,197,94,0.35)',
  },
]

const inputBase: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border:     '1px solid rgba(84,120,255,0.18)',
  borderRadius: 12,
  color: '#fff',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

function useInputFocus() {
  return {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = 'rgba(84,120,255,0.50)'
      e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(84,120,255,0.12)'
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.currentTarget.style.borderColor = 'rgba(84,120,255,0.18)'
      e.currentTarget.style.boxShadow   = 'none'
    },
  }
}

export default function CreatePresentationPage() {
  const { user }  = useAuth()
  const router    = useRouter()
  const inputFocus = useInputFocus()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError,  setSubmitError]  = useState('')
  const [formData, setFormData] = useState({
    title:       '',
    description: '',
    type:        'quiz' as PresentationType,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !formData.title.trim()) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const id = await PresentationService.createPresentation(user.id, {
        title:       formData.title.trim(),
        description: formData.description.trim(),
        type:        formData.type,
      })
      router.push(`/app/create/${id}`)
    } catch (err: any) {
      console.error('Error creating presentation:', err)
      const msg: string = err?.message ?? ''
      if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
        setSubmitError('Database permission denied. Check your Firebase Realtime Database rules allow authenticated writes.')
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setSubmitError('Network error — check your internet connection and try again.')
      } else {
        setSubmitError(msg || 'Something went wrong. Please try again.')
      }
      setIsSubmitting(false)
    }
  }

  const containerVars = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }
  const itemVars = {
    hidden:  { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { ease: 'easeOut', duration: 0.35 } },
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVars}
      className="max-w-2xl mx-auto pb-16"
    >
      {/* Back link */}
      <motion.div variants={itemVars}>
        <Link
          href="/app/dashboard"
          className="inline-flex items-center gap-2 text-sm text-white/35 hover:text-white/70 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVars} className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/22 mb-2">
          New presentation
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          <span className="text-white/80">Create </span>
          <span className="gradient-text">New Presentation</span>
        </h1>
        <p className="text-white/35 text-sm mt-2">
          Give it a title, pick an interaction type, then build your questions.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Main card */}
        <motion.div variants={itemVars} className="glass-card p-7 space-y-7">

          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Presentation title <span style={{ color: '#5478FF' }}>*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Weekly Team Trivia or Product Roadmap Q&A"
              style={{ ...inputBase, padding: '12px 16px', fontSize: 14 }}
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              {...inputFocus}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Description <span className="text-white/20 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Give your audience some context…"
              style={{ ...inputBase, padding: '12px 16px', fontSize: 14, resize: 'none' } as React.CSSProperties}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              {...inputFocus}
            />
          </div>

          {/* Type selector */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Interaction type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TYPES.map(t => {
                const Icon      = t.icon
                const isSelected = formData.type === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: t.id })}
                    className="flex flex-col items-start p-5 rounded-2xl text-left transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      background:  isSelected ? t.activeBg   : 'rgba(255,255,255,0.03)',
                      border:      `1px solid ${isSelected ? t.activeBorder : 'rgba(255,255,255,0.08)'}`,
                      boxShadow:   isSelected ? t.activeRing : 'none',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: t.iconBg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: t.iconColor }} />
                    </div>
                    <span
                      className="text-sm font-bold mb-1 leading-tight"
                      style={{ color: isSelected ? t.iconColor : 'rgba(255,255,255,0.85)' }}
                    >
                      {t.label}
                    </span>
                    <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {t.desc}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Error banner */}
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.25)', color: '#FB7185' }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {submitError}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div variants={itemVars} className="flex justify-end gap-3 pt-1">
          <Link href="/app/dashboard" className="btn-ghost">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !formData.title.trim()}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                Continue to Builder
                <Layout className="w-4 h-4" />
              </>
            )}
          </button>
        </motion.div>
      </form>
    </motion.div>
  )
}
