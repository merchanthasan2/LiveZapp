// types/auth.ts
// User roles and user model — single source of truth for auth shapes.

import type { PlanId } from './plans'

/**
 * Role hierarchy (highest → lowest):
 *   superadmin → full platform access, can manage admins
 *   admin      → full admin panel access, can create/present Zapps
 *   user       → create/present Zapps only, no admin panel
 */
export type Role = 'superadmin' | 'admin' | 'user'

export interface BaseUser {
  id: string
  name: string
  email: string
  role: Role
  planId: PlanId
  /** ISO 8601 — when the current paid plan expires. Absent = free (never expires). */
  planExpiresAt?: string
  /** 'monthly' | 'annual' — billing cycle of the active paid plan. */
  billingCycle?: 'monthly' | 'annual'
  /**
   * Set when a user requests cancellation. Access continues until planExpiresAt;
   * after that the plan falls back to free automatically.
   */
  planCancelledAt?: string
  /**
   * Lifetime count of presentations ever created — never decrements on delete.
   * Checked against plan.limits.maxPresentations.
   */
  lifetimePresentationsCreated?: number
}

export interface SuperAdminUser extends BaseUser {
  role: 'superadmin'
}

export interface AdminUser extends BaseUser {
  role: 'admin'
}

export interface RegularUser extends BaseUser {
  role: 'user'
}

/** Discriminated union — use `user.role` to narrow. */
export type User = SuperAdminUser | AdminUser | RegularUser

/** True for both superadmin and admin roles */
export function isAdminRole(role: Role): boolean {
  return role === 'admin' || role === 'superadmin'
}
