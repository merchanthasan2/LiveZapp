import { NextRequest, NextResponse } from 'next/server'
import { isAdminRole } from '@/types/auth'
import { adminDb } from '@/lib/server/firebaseAdmin'
import { resolveTrustedRoleForUser } from '@/lib/server/trustedRoles'
import { verifyBearerToken } from '@/lib/server/verifyBearerUid'

type BootstrapResponse = {
  success: boolean
  error?: string
  user?: {
    id: string
    email: string
    name: string
    role: 'user' | 'admin' | 'superadmin'
    planId: string
    planExpiresAt?: string | null
    billingCycle?: 'monthly' | 'annual' | null
    planCancelledAt?: string | null
  }
}

function normalizeName(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim().slice(0, 120)
  return trimmed || fallback
}

function normalizePlanId(value: unknown) {
  if (value === 'free' || value === 'basic' || value === 'regular' || value === 'pro') {
    return value
  }

  return 'free'
}

export async function POST(request: NextRequest): Promise<NextResponse<BootstrapResponse>> {
  try {
    const decoded = await verifyBearerToken(request)
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const now = new Date().toISOString()
    const userRef = adminDb().ref(`users/${decoded.uid}`)
    const existingSnap = await userRef.get()
    const existing = existingSnap.exists() ? (existingSnap.val() as Record<string, unknown>) : {}

    const trustedRole = await resolveTrustedRoleForUser({
      uid: decoded.uid,
      email: decoded.email,
      tokenRole: decoded.role,
    })

    const fallbackName =
      (typeof existing.name === 'string' && existing.name.trim()) ||
      decoded.name ||
      'New User'

    const profileName = normalizeName((body as { name?: unknown }).name, fallbackName)
    const planId = isAdminRole(trustedRole)
      ? 'pro'
      : normalizePlanId(existing.planId)

    const updates: Record<string, unknown> = {
      id: decoded.uid,
      email: decoded.email ?? '',
      name: profileName,
      role: trustedRole,
      planId,
      lastLoginAt: now,
      updatedAt: now,
    }

    if (!existingSnap.exists()) {
      updates.createdAt = now
    } else if (typeof existing.createdAt !== 'string' || !existing.createdAt) {
      updates.createdAt = now
    }

    if (isAdminRole(trustedRole)) {
      updates.planId = 'pro'
      updates.planExpiresAt = null
      updates.planCancelledAt = null
      updates.billingCycle = null
    }

    await userRef.update(updates)

    return NextResponse.json({
      success: true,
      user: {
        id: decoded.uid,
        email: String(updates.email),
        name: String(updates.name),
        role: trustedRole,
        planId: String(updates.planId),
        planExpiresAt: typeof existing.planExpiresAt === 'string' ? existing.planExpiresAt : null,
        billingCycle:
          existing.billingCycle === 'monthly' || existing.billingCycle === 'annual'
            ? existing.billingCycle
            : null,
        planCancelledAt: typeof existing.planCancelledAt === 'string' ? existing.planCancelledAt : null,
      },
    })
  } catch (error) {
    console.error('[api/auth/bootstrap] error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to synchronize your account profile' },
      { status: 500 },
    )
  }
}
