import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/server/firebaseAdmin'
import { isPrivilegedRole, resolveTrustedRoleForUser } from '@/lib/server/trustedRoles'
import { verifyBearerToken } from '@/lib/server/verifyBearerUid'

type ManageAction =
  | 'set_role'
  | 'set_plan'
  | 'set_address_confirmation_requirement'
  | 'suspend_account'
  | 'restore_account'
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
  reason?: string
  required?: boolean
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
  return { uid: decoded.uid, role }
}

function sanitizeRole(role: string) {
  if (role === 'user' || role === 'admin' || role === 'superadmin') return role
  return 'user'
}

function sanitizePlan(planId: string) {
  if (planId === 'free' || planId === 'basic' || planId === 'regular' || planId === 'pro') return planId
  return 'free'
}

function sanitizeReason(reason: string) {
  return reason.trim().slice(0, 500)
}

async function sendFirebaseEmailAction(email: string, requestType: 'PASSWORD_RESET' | 'VERIFY_EMAIL') {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) {
    throw new Error('Firebase email actions are not configured')
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requestType,
      email,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to send Firebase email action: ${await response.text()}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uid: adminUid, role: adminRole } = await ensureAdmin(request)
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

    const dbRef = adminDb().ref(`users/${targetUid}`)
    const dbSnap = await dbRef.get()
    const targetRole = String(dbSnap.val()?.role ?? 'user')

    const isProtectedMutation =
      action === 'set_role' ||
      action === 'set_plan' ||
      action === 'set_address_confirmation_requirement' ||
      action === 'suspend_account' ||
      action === 'restore_account' ||
      action === 'set_password' ||
      action === 'delete_account'

    if (action === 'set_role' && targetUid === adminUid) {
      throw new Error('You cannot change your own role')
    }

    if (action === 'delete_account' && targetUid === adminUid) {
      throw new Error('You cannot delete your own account')
    }

    if (action === 'set_role' && adminRole !== 'superadmin') {
      throw new Error('Only superadmins can change user roles')
    }

    if (isProtectedMutation && adminRole !== 'superadmin' && isPrivilegedRole(targetRole)) {
      throw new Error('Only superadmins can manage admin or superadmin accounts')
    }

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

    if (action === 'set_address_confirmation_requirement') {
      if (typeof payload.required !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'required must be a boolean' },
          { status: 400 },
        )
      }

      await dbRef.update({
        requireAddressConfirmationOnPurchase: payload.required,
        updatedAt: new Date().toISOString(),
        updatedBy: adminUid,
      })

      return NextResponse.json({
        success: true,
        message: payload.required
          ? 'Address confirmation enabled'
          : 'Address confirmation disabled',
      })
    }

    if (action === 'suspend_account') {
      const reason = sanitizeReason(String(payload.reason ?? ''))
      if (!reason) {
        return NextResponse.json({ success: false, error: 'Suspension reason is required' }, { status: 400 })
      }

      await dbRef.update({
        suspended: true,
        suspendedReason: reason,
        suspendedAt: new Date().toISOString(),
        suspendedBy: adminUid,
        updatedAt: new Date().toISOString(),
        updatedBy: adminUid,
      })
      return NextResponse.json({ success: true, message: 'Account suspended' })
    }

    if (action === 'restore_account') {
      await dbRef.update({
        suspended: false,
        suspendedReason: null,
        suspendedAt: null,
        restoredAt: new Date().toISOString(),
        restoredBy: adminUid,
        updatedAt: new Date().toISOString(),
        updatedBy: adminUid,
      })
      return NextResponse.json({ success: true, message: 'Account restored' })
    }

    if (action === 'set_password') {
      const userRecord = await adminAuth().getUser(targetUid)
      const password = String(payload.password ?? '')
      if (password.length < 8) {
        return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      await adminAuth().updateUser(targetUid, { password })
      await dbRef.update({ passwordUpdatedAt: new Date().toISOString(), passwordUpdatedBy: adminUid })
      return NextResponse.json({ success: true, message: 'Password updated' })
    }

    if (action === 'send_password_reset') {
      const userRecord = await adminAuth().getUser(targetUid)
      if (!userRecord.email) {
        return NextResponse.json({ success: false, error: 'Target user has no email' }, { status: 400 })
      }
      await sendFirebaseEmailAction(userRecord.email, 'PASSWORD_RESET')
      await dbRef.update({ resetLinkGeneratedAt: new Date().toISOString(), resetLinkGeneratedBy: adminUid })
      return NextResponse.json({ success: true, message: 'Password reset email sent' })
    }

    if (action === 'resend_verification') {
      const userRecord = await adminAuth().getUser(targetUid)
      if (!userRecord.email) {
        return NextResponse.json({ success: false, error: 'Target user has no email' }, { status: 400 })
      }
      await sendFirebaseEmailAction(userRecord.email, 'VERIFY_EMAIL')
      await dbRef.update({ verificationLinkGeneratedAt: new Date().toISOString(), verificationLinkGeneratedBy: adminUid })
      return NextResponse.json({ success: true, message: 'Verification email sent' })
    }

    if (action === 'delete_account') {
      await adminAuth().getUser(targetUid)
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
