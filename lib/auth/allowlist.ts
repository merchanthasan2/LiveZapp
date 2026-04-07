/**
 * Deprecated client-facing allowlists.
 *
 * Trusted admin bootstrap now happens on the server via `lib/server/trustedRoles.ts`
 * so privileged identities are not exposed in the client bundle.
 */
export const SUPERADMIN_EMAILS = new Set<string>()
export const ADMIN_EMAILS = new Set<string>()
