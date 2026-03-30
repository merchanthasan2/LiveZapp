import { NextRequest, NextResponse } from 'next/server'

const DATABASE_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL

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

/**
 * POST /api/promo/validate
 * Validates a promo code and returns its details
 * Uses Firebase REST API
 */
export async function POST(request: NextRequest): Promise<NextResponse<PromoValidationResponse>> {
  try {
    const body = await request.json() as PromoValidationRequest
    const { code } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Promo code is required' },
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

    return NextResponse.json({
      success: true,
      promo: {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        durationMonths: promo.durationMonths,
        postExpiryPlanId: promo.postExpiryPlanId,
        targetPlanId: promo.targetPlanId,
      },
    })
  } catch (error) {
    console.error('[api/promo/validate] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to validate promo code' },
      { status: 500 }
    )
  }
}
