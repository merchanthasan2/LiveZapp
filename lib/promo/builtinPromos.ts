export interface BuiltinPromo {
  code: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  maxRedemptions: number | null
  currentRedemptions: number
  validFrom: string
  validUntil: string | null
  applicablePlanIds: string[]
  isActive: boolean
  createdAt: string
  createdBy: string
  durationMonths: number | null
  postExpiryPlanId: string | null
  targetPlanId: string | null
}

/** Participant post-session offer: 3 months Basic at no charge (alias for marketing URL). */
const PARTICIPANT_TRIAL_PROMO: Omit<BuiltinPromo, 'code'> = {
  discountType: 'percent',
  discountValue: 100,
  maxRedemptions: null,
  currentRedemptions: 0,
  validFrom: '2026-04-04T00:00:00.000Z',
  validUntil: null,
  applicablePlanIds: ['basic'],
  isActive: true,
  createdAt: '2026-04-04T00:00:00.000Z',
  createdBy: 'system',
  durationMonths: 3,
  postExpiryPlanId: 'free',
  targetPlanId: 'basic',
}

const BUILTIN_PROMOS: Record<string, BuiltinPromo> = {
  PARTICIPANT3M: { ...PARTICIPANT_TRIAL_PROMO, code: 'PARTICIPANT3M' },
  /** Same benefits as PARTICIPANT3M; used in participant post-session CTA URLs. */
  '8PNJX48R': { ...PARTICIPANT_TRIAL_PROMO, code: '8PNJX48R' },
}

export function getBuiltinPromo(code: string): BuiltinPromo | null {
  const normalized = code.trim().toUpperCase()
  return BUILTIN_PROMOS[normalized] ?? null
}
