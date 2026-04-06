import { ref, get, set } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import {
  JoinConfig,
  QRSettings,
  DEFAULT_JOIN_CONFIG,
  DEFAULT_QR_SETTINGS,
} from '@/types/join'

export interface AdminConfig {
  joinConfig: JoinConfig
  qrSettings: QRSettings
  checkoutPolicy: {
    requireAddressConfirmationOnPurchase: boolean
  }
}

const DEFAULT_CONFIG: AdminConfig = {
  joinConfig: DEFAULT_JOIN_CONFIG,
  qrSettings: DEFAULT_QR_SETTINGS,
  checkoutPolicy: {
    requireAddressConfirmationOnPurchase: false,
  },
}

/**
 * Reads and writes the global admin config at /admin/config in RTDB.
 */
export const AdminConfigService = {
  async getConfig(): Promise<AdminConfig> {
    const snapshot = await get(ref(rtdb, 'admin/config'))
    if (!snapshot.exists()) return DEFAULT_CONFIG
    // Merge with defaults so new fields added in future don't break existing data
    const stored = snapshot.val() as Partial<AdminConfig>
    return {
      joinConfig: { ...DEFAULT_JOIN_CONFIG, ...(stored.joinConfig ?? {}) },
      qrSettings: { ...DEFAULT_QR_SETTINGS, ...(stored.qrSettings ?? {}) },
      checkoutPolicy: {
        ...DEFAULT_CONFIG.checkoutPolicy,
        ...(stored.checkoutPolicy ?? {}),
      },
    }
  },

  async saveConfig(config: AdminConfig): Promise<void> {
    await set(ref(rtdb, 'admin/config'), config)
  },
}
