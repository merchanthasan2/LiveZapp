import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/server/firebaseAdmin'
import { writeAdminAuditLog } from '@/lib/server/adminAuditLog'
import { resolveTrustedRoleForUser } from '@/lib/server/trustedRoles'
import { verifyBearerToken } from '@/lib/server/verifyBearerUid'

type PromoCreateRequest = {
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

type PromoCodeRecord = PromoCreateRequest & {
  currentRedemptions: number
  createdAt: string
  createdBy: string
}

type PromoActionResponse = {
  success: boolean
  error?: string
  code?: string
  promo?: PromoCodeRecord
}

async function ensureAdmin(request: NextRequest): Promise<{ uid: string; email: string | null }> {
  let decoded
  try {
    decoded = await verifyBearerToken(request)
  } catch {
    throw new Error('Server authentication is not configured.')
  }

  if (!decoded) {
    throw new Error('Unauthorized')
  }

  const role = await resolveTrustedRoleForUser({
    uid: decoded.uid,
    email: decoded.email,
    tokenRole: decoded.role,
  })

  if (role !== 'admin' && role !== 'superadmin') {
    throw new Error('Admin privileges required')
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
  }
}

function normalizePayload(body: PromoCreateRequest): PromoCreateRequest {
  return {
    code: body.code.trim().toUpperCase(),
    discountType: body.discountType,
    discountValue: Number(body.discountValue),
    maxRedemptions: body.maxRedemptions == null ? null : Number(body.maxRedemptions),
    validFrom: body.validFrom,
    validUntil: body.validUntil ?? null,
    applicablePlanIds: Array.isArray(body.applicablePlanIds) ? body.applicablePlanIds : [],
    isActive: Boolean(body.isActive),
    durationMonths: body.durationMonths == null ? null : Number(body.durationMonths),
    postExpiryPlanId: body.postExpiryPlanId ?? null,
    targetPlanId: body.targetPlanId ?? null,
  }
}

function validatePayload(body: PromoCreateRequest): string | null {
  if (!body.code) return 'Code is required'
  if (!/^[A-Z0-9_-]{3,32}$/.test(body.code)) return 'Code must be 3-32 characters using A-Z, 0-9, underscore, or hyphen'
  if (body.discountType !== 'percent' && body.discountType !== 'fixed') return 'Discount type is invalid'
  if (!Number.isFinite(body.discountValue) || body.discountValue <= 0) return 'Discount value must be greater than 0'
  if (body.discountType === 'percent' && body.discountValue > 100) return 'Percent discount cannot exceed 100%'
  if (body.maxRedemptions != null && (!Number.isInteger(body.maxRedemptions) || body.maxRedemptions < 1)) {
    return 'Max redemptions must be a positive integer'
  }
  if (!body.validFrom || Number.isNaN(Date.parse(body.validFrom))) return 'Valid from date is invalid'
  if (body.validUntil && Number.isNaN(Date.parse(body.validUntil))) return 'Valid until date is invalid'
  if (body.durationMonths != null && (!Number.isInteger(body.durationMonths) || body.durationMonths < 1 || body.durationMonths > 24)) {
    return 'Duration months must be between 1 and 24'
  }
  return null
}

async function recordAuditLog(
  request: NextRequest,
  payload: Omit<Parameters<typeof writeAdminAuditLog>[0], 'headers'>,
) {
  try {
    await writeAdminAuditLog({
      headers: request.headers,
      ...payload,
    })
  } catch (error) {
    console.error('[api/promo/create] audit log failed:', error)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<PromoActionResponse>> {
  try {
    const { uid: adminUid, email: adminEmail } = await ensureAdmin(request)
    const payload = normalizePayload(await request.json() as PromoCreateRequest)
    const validationError = validatePayload(payload)
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 })
    }

    const existing = await adminDb().ref(`promoCodes/${payload.code}`).get()
    if (existing.exists()) {
      return NextResponse.json({ success: false, error: `Code "${payload.code}" already exists` }, { status: 409 })
    }

    const promo: PromoCodeRecord = {
      ...payload,
      currentRedemptions: 0,
      createdAt: new Date().toISOString(),
      createdBy: adminUid,
    }

    await adminDb().ref(`promoCodes/${payload.code}`).set(promo)
    await recordAuditLog(request, {
      adminUid,
      adminEmail,
      action: 'promo_created',
      targetLabel: payload.code,
      previousValue: null,
      newValue: {
        discountType: payload.discountType,
        discountValue: payload.discountValue,
        isActive: payload.isActive,
        targetPlanId: payload.targetPlanId,
      },
    })

    return NextResponse.json({
      success: true,
      code: payload.code,
      promo,
    })
  } catch (error: any) {
    const message = String(error?.message ?? 'Failed to create promo code')
    const status = message === 'Unauthorized' ? 401
      : message === 'Admin privileges required' ? 403
      : message === 'Server authentication is not configured.' ? 503
      : 500
    console.error('[api/promo/create] error:', error)
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse<PromoActionResponse>> {
  try {
    const { uid: adminUid, email: adminEmail } = await ensureAdmin(request)
    const body = await request.json() as { code?: string; isActive?: boolean }
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    if (!code) {
      return NextResponse.json({ success: false, error: 'Code is required' }, { status: 400 })
    }

    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ success: false, error: 'isActive must be a boolean' }, { status: 400 })
    }

    const promoRef = adminDb().ref(`promoCodes/${code}`)
    const existing = await promoRef.get()
    if (!existing.exists()) {
      return NextResponse.json({ success: false, error: `Code "${code}" not found` }, { status: 404 })
    }

    const existingPromo = existing.val() as PromoCodeRecord
    await promoRef.update({
      isActive: body.isActive,
      updatedAt: new Date().toISOString(),
    })

    await recordAuditLog(request, {
      adminUid,
      adminEmail,
      action: body.isActive ? 'promo_activated' : 'promo_deactivated',
      targetLabel: code,
      previousValue: { isActive: Boolean(existingPromo.isActive) },
      newValue: { isActive: body.isActive },
    })

    return NextResponse.json({ success: true, code })
  } catch (error: any) {
    const message = String(error?.message ?? 'Failed to update promo code')
    const status = message === 'Unauthorized' ? 401
      : message === 'Admin privileges required' ? 403
      : message === 'Server authentication is not configured.' ? 503
      : 500
    console.error('[api/promo/create] patch error:', error)
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
