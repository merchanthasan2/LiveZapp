import type { PlanId } from '@/types/plans'

export const NEW_USER_OFFER_CODE = 'REGULAR3M_MAY2026'
export const NEW_USER_OFFER_CAMPAIGN_ENDS_AT = '2026-05-30T23:59:59.999Z'

export interface NewUserOffer {
  code: string
  planId: PlanId
  durationMonths: number
  campaignEndsAt: string
  grantedAt: string
  planExpiresAt: string
}

export function getPlanRank(planId: PlanId): number {
  return ['free', 'basic', 'regular', 'pro'].indexOf(planId)
}

export function getNewUserOffer(now = new Date()): NewUserOffer | null {
  const campaignEndsAt = new Date(NEW_USER_OFFER_CAMPAIGN_ENDS_AT)
  if (now.getTime() > campaignEndsAt.getTime()) return null

  const expiry = new Date(now)
  expiry.setMonth(expiry.getMonth() + 3)

  return {
    code: NEW_USER_OFFER_CODE,
    planId: 'regular',
    durationMonths: 3,
    campaignEndsAt: NEW_USER_OFFER_CAMPAIGN_ENDS_AT,
    grantedAt: now.toISOString(),
    planExpiresAt: expiry.toISOString(),
  }
}
