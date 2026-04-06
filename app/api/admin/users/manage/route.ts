import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/server/firebaseAdmin'

type ManageAction =
  | 'set_role'
  | 'set_plan'
  | 'set_password'
  | 'send_password_reset'
  | 'resend_verification'
  | 'delete_account'
  | 'sync_missing_profiles'

interface ManagePayload {
  action: ManageAction
  targetUid?: string
  role?: string
  planId?: string
  password?: string
}

async function ensureAdmin(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) {
    throw new Error('Missing auth token')
  }

  const token = authorization.slice(7)
  const decoded = await adminAuth().verifyIdToken(token)
  const roleSnap = await adminDb().ref(`users/${decoded.uid}/role`).get()
  const role = String(roleSnap.val() ?? 'user')
  if (role !== 'admin' && role !== 'superadmin') {
    throw new Error('Admin privileges required')
  }
  return decoded.uid
}

function sanitizeRole(role: string) {
  if (role === 'user' || role === 'admin' || role === 'superadmin') return role
  return 'user'
}

function sanitizePlan(planId: string) {
  if (planId === 'free' || planId === 'basic' || planId === 'regular' || planId === 'pro') return planId
  return 'free'
}

export async function POST(request: NextRequest) {
  try {
    const adminUid = await ensureAdmin(request)
    const payload = (await request.json()) as ManagePayload
    const action = payload.action

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action' }, { status: 400 })
    }

    if (action === 'sync_missing_profiles') {
      let nextPageToken: string | undefined
      let synced = 0
      do {
        const batch = await adminAuth().listUsers(1000, nextPageToken)
        for (const user of batch.users) {
          const rowRef = adminDb().ref(`users/${user.uid}`)
          const rowSnap = await rowRef.get()
          if (rowSnap.exists()) continue

          await rowRef.set({
            id: user.uid,
            name: user.displayName || 'User',
            email: user.email || '',
            role: 'user',
            planId: 'free',
            createdAt: user.metadata.creationTime || new Date().toISOString(),
            lastLoginAt: user.metadata.lastSignInTime || null,
            syncSource: 'firebase-auth-admin-sync',
            syncedAt: new Date().toISOString(),
          })
          synced += 1
        }
        nextPageToken = batch.pageToken
      } while (nextPageToken)

      return NextResponse.json({ success: true, message: `Synced ${synced} auth user(s)`, synced })
    }

    const targetUid = payload.targetUid
    if (!targetUid) {
      return NextResponse.json({ success: false, error: 'Missing targetUid' }, { status: 400 })
    }

    const userRecord = await adminAuth().getUser(targetUid)
    const dbRef = adminDb().ref(`users/${targetUid}`)

    if (action === 'set_role') {
      const role = sanitizeRole(String(payload.role ?? 'user'))
      await dbRef.update({ role, updatedAt: new Date().toISOString(), updatedBy: adminUid })
      return NextResponse.json({ success: true, message: `Role updated to ${role}` })
    }

    if (action === 'set_plan') {
      const planId = sanitizePlan(String(payload.planId ?? 'free'))
      await dbRef.update({ planId, updatedAt: new Date().toISOString(), updatedBy: adminUid })
      return NextResponse.json({ success: true, message: `Plan updated to ${planId}` })
    }

    if (action === 'set_password') {
      const password = String(payload.password ?? '')
      if (password.length < 8) {
        return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      await adminAuth().updateUser(targetUid, { password })
      await dbRef.update({ passwordUpdatedAt: new Date().toISOString(), passwordUpdatedBy: adminUid })
      return NextResponse.json({ success: true, message: 'Password updated' })
    }

    if (action === 'send_password_reset') {
      if (!userRecord.email) {
        return NextResponse.json({ success: false, error: 'Target user has no email' }, { status: 400 })
      }
      const link = await adminAuth().generatePasswordResetLink(userRecord.email)
      await dbRef.update({ resetLinkGeneratedAt: new Date().toISOString(), resetLinkGeneratedBy: adminUid })
      return NextResponse.json({ success: true, message: 'Password reset link generated', link })
    }

    if (action === 'resend_verification') {
      if (!userRecord.email) {
        return NextResponse.json({ success: false, error: 'Target user has no email' }, { status: 400 })
      }
      const link = await adminAuth().generateEmailVerificationLink(userRecord.email)
      await dbRef.update({ verificationLinkGeneratedAt: new Date().toISOString(), verificationLinkGeneratedBy: adminUid })
      return NextResponse.json({ success: true, message: 'Verification link generated', link })
    }

    if (action === 'delete_account') {
      await adminAuth().deleteUser(targetUid)
      await dbRef.remove()
      return NextResponse.json({ success: true, message: 'Account deleted from Auth and RTDB' })
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 })
  } catch (error: any) {
    const message = String(error?.message ?? 'Admin action failed')
    const status = message.includes('Missing auth token') || message.includes('Admin privileges required') ? 403 : 500
    console.error('[api/admin/users/manage]', error)
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
