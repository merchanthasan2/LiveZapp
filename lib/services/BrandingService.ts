import { ref, get, set } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import { BrandingConfig, DEFAULT_BRANDING } from '@/types/domain'

/**
 * Reads and writes a user's branding config at /users/{uid}/branding in RTDB.
 */
export const BrandingService = {
  async getBranding(userId: string): Promise<BrandingConfig> {
    const snapshot = await get(ref(rtdb, `users/${userId}/branding`))
    if (!snapshot.exists()) return { ...DEFAULT_BRANDING }
    return { ...DEFAULT_BRANDING, ...(snapshot.val() as Partial<BrandingConfig>) }
  },

  async saveBranding(userId: string, config: BrandingConfig): Promise<void> {
    await set(ref(rtdb, `users/${userId}/branding`), config)
  },
}
