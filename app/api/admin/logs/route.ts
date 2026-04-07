import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/server/firebaseAdmin'
import { isPrivilegedRole, resolveTrustedRoleForUser } from '@/lib/server/trustedRoles'
import { verifyBearerToken } from '@/lib/server/verifyBearerUid'
import type { AdminAuditLog } from '@/lib/types/adminAuditLog'

type AdminLogsResponse = {
  success: boolean
  logs?: AdminAuditLog[]
  error?: string
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
}

export async function GET(request: NextRequest): Promise<NextResponse<AdminLogsResponse>> {
  try {
    await ensureAdmin(request)

    const snap = await adminDb().ref('adminLogs').get()
    if (!snap.exists()) {
      return NextResponse.json({ success: true, logs: [] })
    }

    const data = snap.val() as Record<string, Omit<AdminAuditLog, 'id'>>
    const logs = Object.entries(data)
      .map(([id, value]) => ({ id, ...value }) as AdminAuditLog)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({ success: true, logs })
  } catch (error: any) {
    const message = String(error?.message ?? 'Failed to load audit logs')
    const status = message.includes('Missing auth token') || message.includes('Admin privileges required') ? 403 : 500
    console.error('[api/admin/logs]', error)
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
