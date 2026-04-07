import { NextRequest, NextResponse } from 'next/server'
import { getBuiltinPromo } from '@/lib/promo/builtinPromos'
import { adminDb } from '@/lib/server/firebaseAdmin'
import { verifyBearerUid } from '@/lib/server/verifyBearerUid'

interface PromoRedeemRequest {
  code: string
  userId: string
}

interface PromoRedeemResponse {
  success: boolean
  error?: string
  promo?: {
    code: string
    targetPlanId: string | null
    durationMonths: number | null
    postExpiryPlanId: string | null
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

type PromoPayload = {
  code: string
  discountType?: 'percent' | 'fixed'
  discountValue?: number
  durationMonths?: number | null
  postExpiryPlanId?: string | null
  targetPlanId?: string | null
}

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

function addMonthsFromNow(months: number) {
  const expiry = new Date()
  expiry.setMonth(expiry.getMonth() + months)
  return expiry.toISOString()
}

async function applyPromoToUser(userId: string, promo: PromoPayload, source: 'builtin' | 'campaign') {
  const redeemedAt = new Date().toISOString()
  const userRef = adminDb().ref(`users/${userId}`)
  const userSnap = await userRef.get()
  const existingUser = userSnap.exists() ? (userSnap.val() as Record<string, unknown>) : {}

  const updates: Record<string, unknown> = {
    id: userId,
    updatedAt: redeemedAt,
    onboardingOfferCode: promo.code,
    onboardingOfferPlanId: promo.targetPlanId ?? null,
    onboardingOfferDurationMonths: promo.durationMonths ?? null,
    onboardingOfferGrantedAt: redeemedAt,
    planCancelledAt: null,
  }

  if (!userSnap.exists()) {
    updates.createdAt = redeemedAt
    updates.name = typeof existingUser.name === 'string' ? existingUser.name : 'New User'
    updates.email = typeof existingUser.email === 'string' ? existingUser.email : ''
    updates.role = typeof existingUser.role === 'string' ? existingUser.role : 'user'
    updates.planId = typeof existingUser.planId === 'string' ? existingUser.planId : 'free'
  }

  if (promo.targetPlanId) {
    updates.planId = promo.targetPlanId
  }

  if (promo.durationMonths) {
    updates.planExpiresAt = addMonthsFromNow(promo.durationMonths)
  }

  await userRef.update(updates)
  await adminDb().ref(`users/${userId}/promoRedemptions/${promo.code}`).set({
    code: promo.code,
    redeemedAt,
    discountType: promo.discountType ?? 'percent',
    discountValue: promo.discountValue ?? 0,
    durationMonths: promo.durationMonths ?? null,
    postExpiryPlanId: promo.postExpiryPlanId ?? null,
    targetPlanId: promo.targetPlanId ?? null,
    source,
  })
}

/**
 * POST /api/promo/redeem
 * Redeems a promo for the authenticated user (Bearer token uid must match body userId).
 */
export async function POST(request: NextRequest): Promise<NextResponse<PromoRedeemResponse>> {
  try {
    let tokenUid: string | null
    try {
      tokenUid = await verifyBearerUid(request)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Server authentication is not configured.' },
        { status: 503 },
      )
    }
    if (!tokenUid) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as PromoRedeemRequest
    const { code, userId } = body

    if (!code || !userId) {
      return NextResponse.json(
        { success: false, error: 'Code and user ID are required' },
        { status: 400 },
      )
    }

    if (userId !== tokenUid) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const codeUpper = code.toUpperCase().trim()
    const builtinPromo = getBuiltinPromo(codeUpper)

    const snap = await adminDb().ref(`promoCodes/${codeUpper}`).get()
    const promo = snap.val() as RtdbPromo | null

    const existingRedemptionSnap = await adminDb().ref(`users/${userId}/promoRedemptions/${codeUpper}`).get()

    if (!promo) {
      if (builtinPromo) {
        if (!existingRedemptionSnap.exists()) {
          await applyPromoToUser(userId, builtinPromo, 'builtin')
        }

        return NextResponse.json({
          success: true,
          promo: {
            code: builtinPromo.code,
            targetPlanId: builtinPromo.targetPlanId,
            durationMonths: builtinPromo.durationMonths,
            postExpiryPlanId: builtinPromo.postExpiryPlanId,
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

    if (!existingRedemptionSnap.exists()) {
      const redemptionCountRef = adminDb().ref(`promoCodes/${codeUpper}/currentRedemptions`)
      const transactionResult = await redemptionCountRef.transaction((currentCount) => {
        const numericCount = Number(currentCount ?? 0)
        if (promo.maxRedemptions != null && numericCount >= promo.maxRedemptions) {
          return
        }

        return numericCount + 1
      })

      if (!transactionResult.committed) {
        return NextResponse.json(
          { success: false, error: 'This promo code has reached its redemption limit' },
          { status: 400 },
        )
      }

      await applyPromoToUser(userId, {
        code: promo.code ?? codeUpper,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        durationMonths: promo.durationMonths,
        postExpiryPlanId: promo.postExpiryPlanId,
        targetPlanId: promo.targetPlanId,
      }, 'campaign')
    }

    return NextResponse.json({
      success: true,
      promo: {
        code: promo.code ?? codeUpper,
        targetPlanId: promo.targetPlanId ?? null,
        durationMonths: promo.durationMonths ?? null,
        postExpiryPlanId: promo.postExpiryPlanId ?? null,
      },
    })
  } catch (error) {
    console.error('[api/promo/redeem] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to redeem promo code' },
      { status: 500 },
    )
  }
}
