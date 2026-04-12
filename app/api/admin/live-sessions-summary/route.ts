import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/server/firebaseAdmin'
import { isPrivilegedRole, resolveTrustedRoleForUser } from '@/lib/server/trustedRoles'
import { verifyBearerToken } from '@/lib/server/verifyBearerUid'

export type LiveSessionSummaryRow = {
  joinCode: string
  presentationId: string
  title: string
  hostId: string
  participantCount: number
  isPaused: boolean
}

type ResponseBody = {
  success: boolean
  activeSessionCount?: number
  totalLiveParticipants?: number
  sessions?: LiveSessionSummaryRow[]
  error?: string
}

async function ensureAdmin(request: NextRequest) {
  const decoded = await verifyBearerToken(request)
  if (!decoded) throw new Error('Missing auth token')
  const role = await resolveTrustedRoleForUser({
    uid: decoded.uid,
    email: decoded.email,
    tokenRole: decoded.role,
  })
  if (!isPrivilegedRole(role)) throw new Error('Admin privileges required')
}

export async function GET(request: NextRequest): Promise<NextResponse<ResponseBody>> {
  try {
    await ensureAdmin(request)

    const snap = await adminDb().ref('live_sessions').get()
    if (!snap.exists()) {
      return NextResponse.json({
        success: true,
        activeSessionCount: 0,
        totalLiveParticipants: 0,
        sessions: [],
      })
    }

    const raw = snap.val() as Record<string, Record<string, unknown>>
    const sessions: LiveSessionSummaryRow[] = []
    let totalLiveParticipants = 0

    for (const [joinCode, sess] of Object.entries(raw)) {
      if (!sess || sess.isActive !== true) continue
      const parts = sess.participants as Record<string, unknown> | undefined
      const participantCount =
        parts && typeof parts === 'object' ? Object.keys(parts).length : 0
      totalLiveParticipants += participantCount
      sessions.push({
        joinCode,
        presentationId: String(sess.presentationId ?? ''),
        title: String(sess.title ?? 'Untitled'),
        hostId: String(sess.hostId ?? ''),
        participantCount,
        isPaused: Boolean(sess.isPaused),
      })
    }

    sessions.sort((a, b) => b.participantCount - a.participantCount)

    return NextResponse.json({
      success: true,
      activeSessionCount: sessions.length,
      totalLiveParticipants,
      sessions,
    })
  } catch (error: unknown) {
    const message = String((error as Error)?.message ?? 'Failed to load live sessions')
    const status =
      message.includes('Missing auth token') || message.includes('Admin privileges required') ? 403 : 500
    console.error('[api/admin/live-sessions-summary]', error)
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
