import { NextRequest, NextResponse } from 'next/server'

// Note: Auth verification happens client-side by passing the ID token
// The token is verified by Firebase rules on the database side

interface PromoCreateRequest {
  code: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  maxRedemptions: number | null
  validFrom: string
  validUntil: string | null
  applicablePlanIds: string[]
  isActive: boolean
  durationMonths: number | null
  postExpiryPlanId: string | null
  targetPlanId: string | null
}

interface PromoCreateResponse {
  success: boolean
  error?: string
  code?: string
}

/**
 * POST /api/promo/create
 * This is a request validation endpoint.
 * Actual creation still happens client-side through Firebase, but this validates the input.
 */
export async function POST(request: NextRequest): Promise<NextResponse<PromoCreateResponse>> {
  try {
    const body = await request.json() as PromoCreateRequest

    // Validate input before sending to Firebase
    if (!body.code || typeof body.code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Code is required' },
        { status: 400 }
      )
    }

    if (!body.discountValue || body.discountValue <= 0) {
      return NextResponse.json(
        { success: false, error: 'Discount value must be greater than 0' },
        { status: 400 }
      )
    }

    if (body.discountType === 'percent' && body.discountValue > 100) {
      return NextResponse.json(
        { success: false, error: 'Percent discount cannot exceed 100%' },
        { status: 400 }
      )
    }

    const codeUpper = body.code.trim().toUpperCase()

    // Validation passed - return success
    // The actual Firebase write will happen client-side with proper auth
    return NextResponse.json({
      success: true,
      code: codeUpper,
    })
  } catch (error) {
    console.error('[api/promo/create] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to validate promo code data' },
      { status: 500 }
    )
  }
}
