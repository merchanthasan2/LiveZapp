// types/plans.ts
// Plan definitions — single source of truth for pricing, limits, and feature flags.

export type PlanId = 'free' | 'basic' | 'regular' | 'pro'

export interface PlanLimits {
  /** Max Zapps per month (plan catalogue; same field used for all tiers including Free). */
  maxPresentations: number | 'unlimited'
  maxQuestionsPerPresentation: number
  maxParticipantsPerSession: number
  maxActiveSessions: number
}

export interface PlanFeatureFlags {
  canUseQuiz: boolean
  canUseQA: boolean
  canUseFeedback: boolean
  canExportResults: boolean
  canUseBranding: boolean
  exportFormats?: ('csv' | 'pdf' | 'api')[]
}

export interface Plan {
  id: PlanId
  name: string
  pricePerMonth: number   // USD; 0 = free
  /** Annual price with 25% discount. 0 for free plan. */
  pricePerYear: number
  tagline: string
  limits: PlanLimits
  features: PlanFeatureFlags
  isRecommended?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the % saved by choosing annual billing. */
export function annualSavingPercent(plan: Plan): number {
  if (plan.pricePerMonth === 0) return 0
  const monthly12 = plan.pricePerMonth * 12
  return Math.round(((monthly12 - plan.pricePerYear) / monthly12) * 100)
}

// ─── Canonical plan data ──────────────────────────────────────────────────────

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    pricePerMonth: 0,
    pricePerYear: 0,
    tagline: 'Try LiveZapp with small groups.',
    limits: {
      maxPresentations: 3,
      maxQuestionsPerPresentation: 10,
      maxParticipantsPerSession: 50,
      maxActiveSessions: 1,
    },
    features: {
      canUseQuiz: true,
      canUseQA: true,
      canUseFeedback: true,
      canExportResults: false,
      canUseBranding: false,
      exportFormats: [],
    },
  },
  {
    id: 'basic',
    name: 'Basic',
    pricePerMonth: 9,
    pricePerYear: 81,   // $9 × 12 × 0.75 — 25% off = $81/yr (saves $27)
    tagline: 'For tutors and small teams.',
    limits: {
      maxPresentations: 10,
      maxQuestionsPerPresentation: 25,
      maxParticipantsPerSession: 150,
      maxActiveSessions: 2,
    },
    features: {
      canUseQuiz: true,
      canUseQA: true,
      canUseFeedback: true,
      canExportResults: true,
      canUseBranding: true,
      exportFormats: ['csv'],
    },
  },
  {
    id: 'regular',
    name: 'Regular',
    pricePerMonth: 29,
    pricePerYear: 261,  // $29 × 12 × 0.75 — 25% off = $261/yr (saves $87)
    tagline: 'Training and growing organizations.',
    limits: {
      maxPresentations: 25,
      maxQuestionsPerPresentation: 50,
      maxParticipantsPerSession: 500,
      maxActiveSessions: 3,
    },
    features: {
      canUseQuiz: true,
      canUseQA: true,
      canUseFeedback: true,
      canExportResults: true,
      canUseBranding: true,
      exportFormats: ['csv', 'pdf'],
    },
    isRecommended: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    pricePerMonth: 79,
    pricePerYear: 711,  // $79 × 12 × 0.75 — 25% off = $711/yr (saves $237)
    tagline: 'Large events and enterprises.',
    limits: {
      maxPresentations: 'unlimited',
      maxQuestionsPerPresentation: 100,
      maxParticipantsPerSession: 2000,
      maxActiveSessions: 5,
    },
    features: {
      canUseQuiz: true,
      canUseQA: true,
      canUseFeedback: true,
      canExportResults: true,
      canUseBranding: true,
      exportFormats: ['csv', 'pdf', 'api'],
    },
  },
]
