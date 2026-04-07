import type { DecodedIdToken } from 'firebase-admin/auth'
import type { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/server/firebaseAdmin'

function isRecoverableTokenError(error: unknown) {
  const code = String((error as { code?: unknown })?.code ?? '')
  return code.startsWith('auth/')
}

export async function verifyBearerToken(request: NextRequest): Promise<DecodedIdToken | null> {
  const header = request.headers.get('authorization') ?? ''
  if (!header.startsWith('Bearer ')) return null

  const token = header.slice(7).trim()
  if (!token) return null

  try {
    return await adminAuth().verifyIdToken(token)
  } catch (error) {
    if (isRecoverableTokenError(error)) {
      return null
    }

    throw error
  }
}

/** Returns Firebase Auth uid from `Authorization: Bearer <idToken>`, or null if invalid. */
export async function verifyBearerUid(request: NextRequest): Promise<string | null> {
  const decoded = await verifyBearerToken(request)
  return decoded?.uid ?? null
}
