import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/server/firebaseAdmin'
import { writeAdminAuditLog } from '@/lib/server/adminAuditLog'
import { isPrivilegedRole, resolveTrustedRoleForUser } from '@/lib/server/trustedRoles'
import { verifyBearerToken } from '@/lib/server/verifyBearerUid'
import type { AdminConfig } from '@/lib/services/AdminConfigService'
import { DEFAULT_JOIN_CONFIG, DEFAULT_QR_SETTINGS } from '@/types/join'

type AdminConfigResponse = {
  success: boolean
  error?: string
}

const DEFAULT_CONFIG: AdminConfig = {
  joinConfig: DEFAULT_JOIN_CONFIG,
  qrSettings: DEFAULT_QR_SETTINGS,
  checkoutPolicy: {
    requireAddressConfirmationOnPurchase: false,
  },
}

async function ensureAdmin(request: NextRequest) {
  const decoded = await verifyBearerToken(request)
  if (!decoded) {
    throw new Error('Missing auth token')
  }

  const role = await resolveTrustedRoleForUser({
    uid: decoded.uid,
    email: decoded.email,
    tokenRole: decoded.role,
  })

  if (!isPrivilegedRole(role)) {
    throw new Error('Admin privileges required')
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
  }
}

function normalizeConfig(input: Partial<AdminConfig> | null | undefined): AdminConfig {
  const joinConfig = input?.joinConfig ?? {}
  const qrSettings = input?.qrSettings ?? {}
  const checkoutPolicy = input?.checkoutPolicy ?? {}

  return {
    joinConfig: {
      ...DEFAULT_CONFIG.joinConfig,
      ...joinConfig,
    },
    qrSettings: {
      ...DEFAULT_CONFIG.qrSettings,
      ...qrSettings,
    },
    checkoutPolicy: {
      ...DEFAULT_CONFIG.checkoutPolicy,
      ...checkoutPolicy,
    },
  }
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
    console.error('[api/admin/config] audit log failed', error)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<AdminConfigResponse>> {
  try {
    const { uid: adminUid, email: adminEmail } = await ensureAdmin(request)
    const nextConfig = normalizeConfig(await request.json() as Partial<AdminConfig>)
    const configRef = adminDb().ref('admin/config')
    const currentSnap = await configRef.get()
    const previousConfig = normalizeConfig(currentSnap.exists() ? currentSnap.val() as Partial<AdminConfig> : null)

    await configRef.set(nextConfig)
    await recordAuditLog(request, {
      adminUid,
      adminEmail,
      action: 'settings_changed',
      targetLabel: 'Global admin config',
      previousValue: previousConfig,
      newValue: nextConfig,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    const message = String(error?.message ?? 'Failed to save admin config')
    const status = message.includes('Missing auth token') || message.includes('Admin privileges required') ? 403 : 500
    console.error('[api/admin/config]', error)
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
