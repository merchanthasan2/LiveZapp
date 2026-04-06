import type { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/server/firebaseAdmin'

/** Returns Firebase Auth uid from `Authorization: Bearer <idToken>`, or null if invalid. */
export async function verifyBearerUid(request: NextRequest): Promise<string | null> {
  const header = request.headers.get('authorization') ?? ''
  if (!header.startsWith('Bearer ')) return null
  const token = header.slice(7)
  try {
    const decoded = await adminAuth().verifyIdToken(token)
    return decoded.uid
  } catch {
    return null
  }
}
