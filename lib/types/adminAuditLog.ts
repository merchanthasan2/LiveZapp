export interface AdminAuditLog {
  id: string
  timestamp: string
  adminUid: string
  adminEmail: string | null
  action: string
  targetUid: string | null
  targetEmail: string | null
  targetLabel: string | null
  previousValue: unknown
  newValue: unknown
  ipAddress: string | null
}
