import { ref, push } from 'firebase/database'
import { rtdb } from '@/lib/firebase'

export interface AuditLog {
  id:            string
  timestamp:     string
  adminUid:      string
  adminEmail:    string
  action:        string
  targetUid:     string | null
  targetEmail:   string | null
  previousValue: any
  newValue:      any
  ipAddress:     string | null
}

export async function writeAdminLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
  await push(ref(rtdb, 'adminLogs'), {
    ...log,
    timestamp: new Date().toISOString(),
  })
}
