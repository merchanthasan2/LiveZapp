'use client'

/**
 * lib/hooks/usePlanLimits.ts
 *
 * Exposes the current user's plan limits and live usage counters.
 * Use this anywhere in the app to gate feature access or show usage indicators.
 */

import { useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { PLANS } from '@/types/plans'
import type { Plan } from '@/types/plans'

export interface PlanLimitsState {
  plan: Plan
  /** How many sessions the user has ever created (including deleted). */
  lifetimePresentationsCreated: number
  /** Whether the user can create one more presentation right now. */
  canCreatePresentation: boolean
  /**
   * Sessions remaining toward the lifetime cap.
   * Returns Infinity for unlimited plans.
   */
  presentationsRemaining: number
  /** Max participants allowed per session on this plan. */
  maxParticipantsPerSession: number
  /** Max questions allowed per presentation on this plan. */
  maxQuestionsPerPresentation: number
  /** Max concurrent live sessions allowed on this plan. */
  maxActiveSessions: number
  /** Whether the current paid plan has expired. Always false for free plan. */
  isPlanExpired: boolean
}

export function usePlanLimits(): PlanLimitsState {
  const { user } = useAuth()

  return useMemo(() => {
    const planId = user?.planId ?? 'free'
    const plan = PLANS.find(p => p.id === planId) ?? PLANS[0]

    const lifetimeCount = user?.lifetimePresentationsCreated ?? 0
    const maxPresentations = plan.limits.maxPresentations

    const canCreate =
      maxPresentations === 'unlimited' || lifetimeCount < (maxPresentations as number)

    const remaining =
      maxPresentations === 'unlimited'
        ? Infinity
        : Math.max(0, (maxPresentations as number) - lifetimeCount)

    const isPlanExpired =
      plan.pricePerMonth > 0 &&
      !!user?.planExpiresAt &&
      new Date(user.planExpiresAt) < new Date()

    return {
      plan,
      lifetimePresentationsCreated: lifetimeCount,
      canCreatePresentation: canCreate && !isPlanExpired,
      presentationsRemaining: remaining,
      maxParticipantsPerSession: plan.limits.maxParticipantsPerSession,
      maxQuestionsPerPresentation: plan.limits.maxQuestionsPerPresentation,
      maxActiveSessions: plan.limits.maxActiveSessions,
      isPlanExpired,
    }
  }, [user])
}
