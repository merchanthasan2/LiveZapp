/**
 * types/index.ts — barrel re-export
 *
 * Import from here for convenience, or import directly from the
 * domain-specific file when you need only that slice:
 *   import type { Plan } from '@/types/plans'
 *   import type { User } from '@/types/auth'
 */

// Domain (Presentation, Question, QuestionSet, etc.)
export * from './domain'

// Auth (User, Role, AdminUser, RegularUser)
export * from './auth'

// Plans (Plan, PlanId, PlanLimits, PlanFeatureFlags, PLANS)
export * from './plans'

// Join / Live Sessions (JoinConfig, LiveSession, QRSettings, generateJoinCode)
export * from './join'

// ─── UI-only / non-domain types ──────────────────────────────────────────────
// These are thin display-layer types that don't belong in the domain model.

export interface TrafficMetric {
  date: string               // 'YYYY-MM-DD'
  visitsLiveZapp: number
  visitsQuantumStep: number
}

export interface Testimonial {
  id: string
  quote: string
  author: string
  role: string
  company: string
}

export interface NavLink {
  label: string
  href: string
  isExternal?: boolean
}

export interface UsageStats {
  presentationsUsed: number
  presentationsLimit: number | 'unlimited'
  questionsUsed: number
  questionsLimit: number
  audienceReached: number
  audienceLimit: number
}

export interface StatCard {
  label: string
  value: string | number
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  color?: 'primary' | 'secondary' | 'accent' | 'default'
}

/**
 * Lightweight display-only row for dashboard tables.
 * Distinct from the full domain `Presentation` to avoid requiring
 * joinCode / ownerUserId on every list render.
 */
export interface DashboardPresentation {
  id: string
  title: string
  questionsCount: number
  lastActivity: string       // ISO date string
  status: import('./domain').PresentationStatus
  audienceSize?: number
}
