import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/server/firebaseAdmin'
import { isPrivilegedRole, resolveTrustedRoleForUser } from '@/lib/server/trustedRoles'
import { verifyBearerToken } from '@/lib/server/verifyBearerUid'

const MAX_ROWS = 5000

type PageViewRow = {
  ts: number
  path: string | null
  referrer: string | null
  ip: string
  country: string
  countryCode: string
  city: string
  region: string
  lat: number | null
  lon: number | null
  isp: string
  device: 'mobile' | 'tablet' | 'desktop'
  os: string
  browser: string
  screenW: number | null
  screenH: number | null
  userId: string | null
  isRegistered: boolean
  sessionId: string | null
}

type ResponseBody = {
  success: boolean
  pageviews?: PageViewRow[]
  totalInDatabase?: number
  capped?: boolean
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

    const snap = await adminDb().ref('analytics/pageviews').get()
    if (!snap.exists()) {
      return NextResponse.json({ success: true, pageviews: [], totalInDatabase: 0, capped: false })
    }

    const raw = snap.val() as Record<string, PageViewRow>
    const all = Object.values(raw).filter(v => v && typeof v.ts === 'number')
    const totalInDatabase = all.length
    const sorted = all.sort((a, b) => b.ts - a.ts)
    const capped = sorted.length > MAX_ROWS
    const pageviews = capped ? sorted.slice(0, MAX_ROWS) : sorted

    return NextResponse.json({
      success: true,
      pageviews,
      totalInDatabase,
      capped,
    })
  } catch (error: unknown) {
    const message = String((error as Error)?.message ?? 'Failed to load pageviews')
    const status =
      message.includes('Missing auth token') || message.includes('Admin privileges required') ? 403 : 500
    console.error('[api/admin/pageviews]', error)
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
