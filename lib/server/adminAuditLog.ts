import { adminDb } from '@/lib/server/firebaseAdmin'
import { getRequestIp } from '@/lib/server/rateLimit'

type AdminAuditPayload = {
  headers: Headers
  adminUid: string
  adminEmail?: string | null
  action: string
  targetUid?: string | null
  targetEmail?: string | null
  targetLabel?: string | null
  previousValue?: unknown
  newValue?: unknown
}

function normalizeAuditValue(value: unknown): unknown {
  if (value === undefined) {
    return null
  }

  if (value === null) {
    return null
  }

  try {
    return JSON.parse(JSON.stringify(value)) as unknown
  } catch {
    return String(value)
  }
}

export async function writeAdminAuditLog(payload: AdminAuditPayload) {
  await adminDb().ref('adminLogs').push({
    timestamp: new Date().toISOString(),
    adminUid: payload.adminUid,
    adminEmail: payload.adminEmail ?? null,
    action: payload.action,
    targetUid: payload.targetUid ?? null,
    targetEmail: payload.targetEmail ?? null,
    targetLabel: payload.targetLabel ?? null,
    previousValue: normalizeAuditValue(payload.previousValue),
    newValue: normalizeAuditValue(payload.newValue),
    ipAddress: getRequestIp(payload.headers) || null,
  })
}
