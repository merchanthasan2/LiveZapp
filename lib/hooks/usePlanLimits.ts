'use client'

/**
 * lib/hooks/usePlanLimits.ts
 *
 * Exposes the current user's plan limits and live usage counters.
 * Limits are read from Firebase admin/planConfig first; falls back to
 * the hardcoded defaults in types/plans.ts.
 */

import { useState, useEffect, useMemo } from 'react'
import { ref, get } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import { useAuth } from '@/lib/hooks/useAuth'
import { PLANS } from '@/types/plans'
import type { Plan, PlanLimits, PlanId } from '@/types/plans'

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

/** Cached plan config overrides from Firebase (shared across hook instances) */
let cachedOverrides: Partial<Record<PlanId, Partial<PlanLimits>>> | null = null
let cacheLoadedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/** Fetch plan limit overrides from Firebase (returns empty object on any error) */
async function fetchPlanOverrides(): Promise<Partial<Record<PlanId, Partial<PlanLimits>>>> {
  try {
    const now = Date.now()
    if (cachedOverrides && now - cacheLoadedAt < CACHE_TTL_MS) return cachedOverrides

    const snap = await get(ref(rtdb, 'admin/planConfig'))
    if (!snap.exists()) { cachedOverrides = {}; cacheLoadedAt = now; return {} }

    const raw = snap.val() as Record<string, { limits?: Partial<PlanLimits> }>
    const overrides: Partial<Record<PlanId, Partial<PlanLimits>>> = {}
    for (const [planId, cfg] of Object.entries(raw)) {
      if (cfg.limits) overrides[planId as PlanId] = cfg.limits
    }
    cachedOverrides = overrides
    cacheLoadedAt = now
    return overrides
  } catch {
    return {}
  }
}

/** Merge Firebase overrides onto a plan's default limits */
function mergedLimits(plan: Plan, overrides: Partial<PlanLimits>): PlanLimits {
  return {
    maxPresentations:         overrides.maxPresentations         ?? plan.limits.maxPresentations,
    maxQuestionsPerPresentation: overrides.maxQuestionsPerPresentation ?? plan.limits.maxQuestionsPerPresentation,
    maxParticipantsPerSession: overrides.maxParticipantsPerSession  ?? plan.limits.maxParticipantsPerSession,
    maxActiveSessions:        overrides.maxActiveSessions         ?? plan.limits.maxActiveSessions,
  }
}

/** Invalidate the cache so next hook instance re-fetches from Firebase */
export function invalidatePlanLimitsCache() {
  cachedOverrides = null
  cacheLoadedAt = 0
}

export function usePlanLimits(): PlanLimitsState {
  const { user } = useAuth()
  const [overrides, setOverrides] = useState<Partial<Record<PlanId, Partial<PlanLimits>>>>({})

  useEffect(() => {
    fetchPlanOverrides().then(setOverrides)
  }, [])

  return useMemo(() => {
    const planId = user?.planId ?? 'free'
    const plan = PLANS.find(p => p.id === planId) ?? PLANS[0]
    const limits = mergedLimits(plan, overrides[planId as PlanId] ?? {})

    const lifetimeCount = user?.lifetimePresentationsCreated ?? 0
    const maxPresentations = limits.maxPresentations

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
      maxParticipantsPerSession: limits.maxParticipantsPerSession,
      maxQuestionsPerPresentation: limits.maxQuestionsPerPresentation,
      maxActiveSessions: limits.maxActiveSessions,
      isPlanExpired,
    }
  }, [user, overrides])
}
