'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, BarChart3, MessageSquare, Cloud, Smile,
  ArrowRight, AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePlanLimits } from '@/lib/hooks/usePlanLimits'
import { PresentationService } from '@/lib/services/PresentationService'
import type { PresentationType } from '@/types/domain'

// ─── Color palettes for Pro users ──────────────────────────────────────

const COLOR_PALETTES = [
  { name: 'Teal Classic', primary: '#00A6A6', accent: '#F08700', bg: '#F5F7FA' },
  { name: 'Ocean', primary: '#0369A1', accent: '#06B6D4', bg: '#F0F9FF' },
  { name: 'Sunset', primary: '#DC2626', accent: '#F59E0B', bg: '#FEF2F2' },
  { name: 'Midnight', primary: '#1E293B', accent: '#6366F1', bg: '#0F172A' },
  { name: 'Forest', primary: '#15803D', accent: '#84CC16', bg: '#F0FDF4' },
  { name: 'Berry', primary: '#9333EA', accent: '#EC4899', bg: '#FAF5FF' },
  { name: 'Coral', primary: '#EA580C', accent: '#F97316', bg: '#FEF3F2' },
  { name: 'Slate', primary: '#475569', accent: '#64748B', bg: '#F8FAFC' },
  { name: 'Gold', primary: '#B45309', accent: '#FBBF24', bg: '#FFFBEB' },
  { name: 'Monochrome', primary: '#111111', accent: '#6B7280', bg: '#FFFFFF' },
]

// ─── Zapp types ────────────────────────────────────────────────────────

const ZAPP_TYPES = [
  {
    type: 'quiz' as PresentationType,
    name: 'Quiz',
    icon: Sparkles,
    color: '#00A6A6',
    bg: 'rgba(0,166,166,0.10)',
    description: 'Test knowledge with scored questions and a live leaderboard',
  },
  {
    type: 'poll' as PresentationType,
    name: 'Live Poll',
    icon: BarChart3,
    color: '#F08700',
    bg: 'rgba(240,135,0,0.10)',
    description: 'Collect real-time votes shown as an animated bar chart',
  },
  {
    type: 'qa' as PresentationType,
    name: 'Q&A Session',
    icon: MessageSquare,
    color: '#EFCA08',
    bg: 'rgba(239,202,8,0.14)',
    description: 'Let your audience submit and upvote questions live',
  },
  {
    type: 'word_cloud' as PresentationType,
    name: 'Word Cloud',
    icon: Cloud,
    color: '#F49F0A',
    bg: 'rgba(244,159,10,0.12)',
    description: 'Gather words from the crowd and watch them grow',
  },
  {
    type: 'feedback' as PresentationType,
    name: 'Vibe Check',
    icon: Smile,
    color: '#BBDEF0',
    bg: 'rgba(187,222,240,0.15)',
    description: 'Capture quick ratings, emoji reactions and honest feedback',
  },
]

// ─── Main component ────────────────────────────────────────────────────

export default function CreatePage() {
  const { user } = useAuth()
  const { planLimits } = usePlanLimits()
  const router = useRouter()

  const [step, setStep] = useState<'name' | 'type'>('name')
  const [name, setName] = useState('')
  const [selectedPalette, setSelectedPalette] = useState(0)
  const [isCreating, setIsCreating] = useState<PresentationType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isPro = planLimits.plan?.id === 'pro' || planLimits.plan?.id === 'enterprise'
  const plan = planLimits.plan
  const maxPres = plan?.limits?.maxPresentations === 'unlimited' ? 999 : (plan?.limits?.maxPresentations ?? 0)
  const currentCount = planLimits.presentationsCount ?? 0
  const canCreate = currentCount < maxPres

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length === 0) return
    setStep('type')
  }

  const handleTypeSelect = async (type: PresentationType) => {
    if (!user || !canCreate) return
    setIsCreating(type)
    setError(null)

    try {
      const presentationId = await PresentationService.createPresentation(user.id, {
        title: name || 'Untitled Zapp',
        description: '',
        type,
      })
      router.push(`/app/create/${presentationId}?seed=${type}`)
    } catch (e: any) {
      if (e.message?.includes('PLAN_LIMIT')) {
        setError(`You've reached the limit for your plan. Upgrade to create more.`)
      } else {
        setError(e.message || 'Failed to create Zapp')
      }
      setIsCreating(null)
    }
  }

  // ── Screen 1: Name Your Zapp ──────────────────────────────────────────

  if (step === 'name') {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div
            className="rounded-2xl p-8 shadow-lg"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
            }}
          >
            {/* Header */}
            <div className="mb-8">
              <h1
                className="text-3xl font-black mb-2"
                style={{ color: '#1A1A2E' }}
              >
                Create a Zapp
              </h1>
              <p style={{ color: '#6B7280' }}>
                First, give your interactive session a name
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleNameSubmit} className="space-y-6">
              {/* Title Input */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-semibold mb-2"
                  style={{ color: '#1A1A2E' }}
                >
                  Zapp Name
                </label>
                <input
                  id="title"
                  type="text"
                  autoFocus
                  placeholder="e.g. Team Quiz Night"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border-2 transition-all"
                  style={{
                    borderColor: name ? '#00A6A6' : '#E5E7EB',
                    background: '#F5F7FA',
                    color: '#1A1A2E',
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = '#00A6A6')
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = name ? '#00A6A6' : '#E5E7EB')
                  }
                />
              </div>

              {/* Branding Section (Pro only) */}
              {isPro && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pt-4 border-t border-[#E5E7EB]"
                >
                  <h3 className="text-sm font-semibold mb-4" style={{ color: '#1A1A2E' }}>
                    Branding (Optional)
                  </h3>

                  {/* Color Palette */}
                  <div className="mb-6">
                    <label className="block text-xs font-semibold mb-3 text-[#6B7280] uppercase tracking-wide">
                      Brand Colour
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {COLOR_PALETTES.map((palette, i) => (
                        <motion.button
                          key={palette.name}
                          type="button"
                          onClick={() => setSelectedPalette(i)}
                          whileHover={{ scale: 1.05 }}
                          className="h-12 rounded-lg border-2 transition-all"
                          style={{
                            background: palette.primary,
                            borderColor: selectedPalette === i ? '#1A1A2E' : 'transparent',
                            borderWidth: selectedPalette === i ? '3px' : '2px',
                          }}
                          title={palette.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Logo Upload Placeholder */}
                  <div>
                    <label className="block text-xs font-semibold mb-2 text-[#6B7280] uppercase tracking-wide">
                      Logo (Coming Soon)
                    </label>
                    <div
                      className="h-24 rounded-lg border-2 border-dashed flex items-center justify-center"
                      style={{ borderColor: '#E5E7EB', background: '#F5F7FA' }}
                    >
                      <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
                        Logo upload available in next update
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full py-2.5 px-4 rounded-lg font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: name.trim() ? '#00A6A6' : '#BBDEF0',
                  cursor: name.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-sm mt-6" style={{ color: '#9CA3AF' }}>
            You can edit the name anytime in the editor
          </p>
        </motion.div>
      </div>
    )
  }

  // ── Screen 2: Choose Zapp Type ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-12 px-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black mb-3" style={{ color: '#1A1A2E' }}>
            What kind of Zapp?
          </h1>
          <p className="text-lg" style={{ color: '#6B7280' }}>
            <strong>"{name}"</strong> will use the type you choose for all questions
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-lg border-l-4 flex items-start gap-3"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              borderColor: '#EF4444',
            }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
            <div style={{ color: '#7F1D1D' }}>{error}</div>
          </motion.div>
        )}

        {/* Type Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {ZAPP_TYPES.map((zapp, i) => {
            const Icon = zapp.icon
            const isLoading = isCreating === zapp.type
            const isDisabled = isCreating !== null || !canCreate

            return (
              <motion.button
                key={zapp.type}
                onClick={() => handleTypeSelect(zapp.type)}
                disabled={isDisabled}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={!isDisabled ? { y: -4 } : {}}
                className="p-6 rounded-lg border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: '#FFFFFF',
                  borderColor: isLoading ? zapp.color : '#E5E7EB',
                  borderWidth: isLoading ? '2px' : '1px',
                }}
              >
                {/* Icon circle */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all"
                  style={{ background: zapp.bg }}
                >
                  {isLoading ? (
                    <div
                      className="w-6 h-6 border-2 border-current/30 border-t-current rounded-full animate-spin"
                      style={{ borderColor: zapp.color }}
                    />
                  ) : (
                    <Icon className="w-7 h-7" style={{ color: zapp.color }} />
                  )}
                </div>

                {/* Content */}
                <h3
                  className="font-black text-lg mb-1"
                  style={{ color: zapp.color }}
                >
                  {zapp.name}
                </h3>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {zapp.description}
                </p>
              </motion.button>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm" style={{ color: '#9CA3AF' }}>
          The type you choose applies to all questions in this Zapp
        </p>

        {/* Plan limit warning */}
        {!canCreate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-lg border-l-4 text-center"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              borderColor: '#EF4444',
              color: '#7F1D1D',
            }}
          >
            <p className="font-bold mb-1">Plan limit reached</p>
            <p className="text-sm">
              You've created {currentCount} of {maxPres} Zapps allowed on your plan. Upgrade to create more.
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
