/**
 * Server- and client-safe allowlists for bootstrap roles on first sign-up / profile sync.
 * Keep in sync with provisioning logic in lib/hooks/useAuth.ts.
 */
export const SUPERADMIN_EMAILS = new Set<string>(['happy143@gmail.com'])

/** Emails that receive admin panel access (not superadmin). */
export const ADMIN_EMAILS = new Set<string>([])
