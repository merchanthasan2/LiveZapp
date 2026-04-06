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
  validUntil?: string | null
  maxRedemptions?: number | null
  currentRedemptions?: number
  discountType?: 'percent' | 'fixed'
  discountValue?: number
  durationMonths?: number | null
  postExpiryPlanId?: string | null
  targetPlanId?: string | null
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

    if (!promo) {
      if (builtinPromo) {
        await adminDb().ref(`users/${userId}/promoRedemptions/${codeUpper}`).set({
          code: builtinPromo.code,
          redeemedAt: new Date().toISOString(),
          discountType: builtinPromo.discountType,
          discountValue: builtinPromo.discountValue,
          durationMonths: builtinPromo.durationMonths,
          postExpiryPlanId: builtinPromo.postExpiryPlanId,
          targetPlanId: builtinPromo.targetPlanId,
          source: 'builtin',
        })

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

    if (promo.validUntil && new Date(promo.validUntil) < new Date()) {
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

    const newCount = (promo.currentRedemptions ?? 0) + 1
    await adminDb().ref(`promoCodes/${codeUpper}/currentRedemptions`).set(newCount)

    await adminDb().ref(`users/${userId}/promoRedemptions/${codeUpper}`).set({
      code: promo.code ?? codeUpper,
      redeemedAt: new Date().toISOString(),
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      durationMonths: promo.durationMonths,
      postExpiryPlanId: promo.postExpiryPlanId,
      targetPlanId: promo.targetPlanId,
    })

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
