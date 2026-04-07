import { NextRequest, NextResponse } from 'next/server'
import { getBuiltinPromo } from '@/lib/promo/builtinPromos'
import { adminDb } from '@/lib/server/firebaseAdmin'
import { getRequestIp, hitRateLimit } from '@/lib/server/rateLimit'

interface PromoValidationRequest {
  code: string
  userId?: string
}

interface PromoValidationResponse {
  success: boolean
  error?: string
  promo?: {
    code: string
    discountType: 'percent' | 'fixed'
    discountValue: number
    durationMonths: number | null
    postExpiryPlanId: string | null
    targetPlanId: string | null
  }
}

type RtdbPromo = {
  code?: string
  isActive?: boolean
  validFrom?: string | null
  validUntil?: string | null
  maxRedemptions?: number | null
  currentRedemptions?: number
  discountType?: 'percent' | 'fixed'
  discountValue?: number
  durationMonths?: number | null
  postExpiryPlanId?: string | null
  targetPlanId?: string | null
}

const PROMO_VALIDATE_WINDOW_MS = 60 * 1000
const PROMO_VALIDATE_MAX_PER_WINDOW = 20

function resolvePromoValidUntil(value?: string | null): Date | null {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  if (/T00:00:00(?:\.000)?Z$/.test(value)) {
    const endOfDay = new Date(parsed)
    endOfDay.setUTCHours(23, 59, 59, 999)
    return endOfDay
  }

  return parsed
}

/**
 * POST /api/promo/validate
 * Validates a promo code (reads RTDB via Firebase Admin).
 */
export async function POST(request: NextRequest): Promise<NextResponse<PromoValidationResponse>> {
  try {
    const ip = getRequestIp(request.headers)
    if (hitRateLimit(`promo-validate:${ip}`, PROMO_VALIDATE_MAX_PER_WINDOW, PROMO_VALIDATE_WINDOW_MS)) {
      return NextResponse.json(
        { success: false, error: 'Too many promo validation requests. Try again shortly.' },
        { status: 429 },
      )
    }

    const body = (await request.json()) as PromoValidationRequest
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, error: 'Promo code is required' }, { status: 400 })
    }

    const codeUpper = code.toUpperCase().trim()
    const builtinPromo = getBuiltinPromo(codeUpper)

    const snap = await adminDb().ref(`promoCodes/${codeUpper}`).get()
    const promo = snap.val() as RtdbPromo | null

    if (!promo) {
      if (builtinPromo) {
        return NextResponse.json({
          success: true,
          promo: {
            code: builtinPromo.code,
            discountType: builtinPromo.discountType,
            discountValue: builtinPromo.discountValue,
            durationMonths: builtinPromo.durationMonths,
            postExpiryPlanId: builtinPromo.postExpiryPlanId,
            targetPlanId: builtinPromo.targetPlanId,
          },
        })
      }
      return NextResponse.json(
        { success: false, error: `Promo code "${code}" not found` },
        { status: 404 },
      )
    }

    if (!promo.isActive) {
      return NextResponse.json(
        { success: false, error: 'This promo code is no longer active' },
        { status: 400 },
      )
    }

    if (promo.validFrom && new Date(promo.validFrom) > new Date()) {
      return NextResponse.json(
        { success: false, error: 'This promo code is not active yet' },
        { status: 400 },
      )
    }

    const validUntil = resolvePromoValidUntil(promo.validUntil)
    if (validUntil && validUntil < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This promo code has expired' },
        { status: 400 },
      )
    }

    if (promo.maxRedemptions != null && (promo.currentRedemptions ?? 0) >= promo.maxRedemptions) {
      return NextResponse.json(
        { success: false, error: 'This promo code has reached its redemption limit' },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      promo: {
        code: promo.code ?? codeUpper,
        discountType: promo.discountType ?? 'percent',
        discountValue: promo.discountValue ?? 0,
        durationMonths: promo.durationMonths ?? null,
        postExpiryPlanId: promo.postExpiryPlanId ?? null,
        targetPlanId: promo.targetPlanId ?? null,
      },
    })
  } catch (error) {
    console.error('[api/promo/validate] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to validate promo code' },
      { status: 500 },
    )
  }
}
