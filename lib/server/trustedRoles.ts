import type { Role } from '@/types/auth'
import { isAdminRole } from '@/types/auth'
import { adminDb } from '@/lib/server/firebaseAdmin'

const DEFAULT_SUPERADMIN_EMAILS = ['happy143@gmail.com']

function parseEmailList(raw: string | undefined, fallback: string[] = []) {
  const values = raw
    ?.split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  return new Set(values && values.length > 0 ? values : fallback)
}

const superAdminEmails = parseEmailList(process.env.SUPERADMIN_EMAILS, DEFAULT_SUPERADMIN_EMAILS)
const adminEmails = parseEmailList(process.env.ADMIN_EMAILS)

function sanitizeRole(value: unknown): Role {
  if (value === 'superadmin' || value === 'admin' || value === 'user') {
    return value
  }

  return 'user'
}

export function resolveAllowlistedRole(email?: string | null): Role {
  const normalizedEmail = email?.trim().toLowerCase()
  if (!normalizedEmail) return 'user'
  if (superAdminEmails.has(normalizedEmail)) return 'superadmin'
  if (adminEmails.has(normalizedEmail)) return 'admin'
  return 'user'
}

export async function resolveTrustedRoleForUser(input: {
  uid: string
  email?: string | null
  tokenRole?: unknown
}): Promise<Role> {
  const tokenRole = sanitizeRole(input.tokenRole)
  if (isAdminRole(tokenRole)) {
    return tokenRole
  }

  const allowlistedRole = resolveAllowlistedRole(input.email)
  if (isAdminRole(allowlistedRole)) {
    return allowlistedRole
  }

  const storedRoleSnap = await adminDb().ref(`users/${input.uid}/role`).get()
  return sanitizeRole(storedRoleSnap.val())
}

export function isPrivilegedRole(role: string) {
  return role === 'admin' || role === 'superadmin'
}
