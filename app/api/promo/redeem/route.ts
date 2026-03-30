import { NextRequest, NextResponse } from 'next/server'

const DATABASE_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL

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

/**
 * POST /api/promo/redeem
 * Redeems a promo code for a user (increments redemption count)
 * Client verifies auth and passes userId; server increments counter
 */
export async function POST(request: NextRequest): Promise<NextResponse<PromoRedeemResponse>> {
  try {
    const body = await request.json() as PromoRedeemRequest
    const { code, userId } = body

    if (!code || !userId) {
      return NextResponse.json(
        { success: false, error: 'Code and user ID are required' },
        { status: 400 }
      )
    }

    const codeUpper = code.toUpperCase().trim()

    // Fetch promo code using Firebase REST API
    const url = `${DATABASE_URL}/promoCodes/${codeUpper}.json`
    const response = await fetch(url)

    if (!response.ok || response.status === 404) {
      return NextResponse.json(
        { success: false, error: `Promo code "${code}" not found` },
        { status: 404 }
      )
    }

    const promo = await response.json()

    if (!promo) {
      return NextResponse.json(
        { success: false, error: `Promo code "${code}" not found` },
        { status: 404 }
      )
    }

    // Check if promo is active
    if (!promo.isActive) {
      return NextResponse.json(
        { success: false, error: 'This promo code is no longer active' },
        { status: 400 }
      )
    }

    // Check if promo has expired
    if (promo.validUntil && new Date(promo.validUntil) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This promo code has expired' },
        { status: 400 }
      )
    }

    // Check redemption limit
    if (promo.maxRedemptions && promo.currentRedemptions >= promo.maxRedemptions) {
      return NextResponse.json(
        { success: false, error: 'This promo code has reached its redemption limit' },
        { status: 400 }
      )
    }

    // Increment redemption count (note: this is not atomic due to REST API limitations)
    // In production, use Cloud Functions for atomic operations
    const newCount = (promo.currentRedemptions || 0) + 1
    const updateUrl = `${DATABASE_URL}/promoCodes/${codeUpper}/currentRedemptions.json`
    await fetch(updateUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCount),
    })

    // Record the redemption for the user
    const redemptionUrl = `${DATABASE_URL}/users/${userId}/promoRedemptions/${codeUpper}.json`
    await fetch(redemptionUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: promo.code,
        redeemedAt: new Date().toISOString(),
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        durationMonths: promo.durationMonths,
        postExpiryPlanId: promo.postExpiryPlanId,
        targetPlanId: promo.targetPlanId,
      }),
    })

    return NextResponse.json({
      success: true,
      promo: {
        code: promo.code,
        targetPlanId: promo.targetPlanId,
        durationMonths: promo.durationMonths,
        postExpiryPlanId: promo.postExpiryPlanId,
      },
    })
  } catch (error) {
    console.error('[api/promo/redeem] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to redeem promo code' },
      { status: 500 }
    )
  }
}
