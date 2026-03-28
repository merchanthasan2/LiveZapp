import { ref, get, set, remove } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import { generateJoinCode } from '@/types/join'

/**
 * Manages join codes in RTDB under /joinCodes/{code}.
 * Guarantees uniqueness by checking before reserving.
 */
export const JoinCodeService = {
  /**
   * Generates a numeric join code of `length` digits that is unique
   * among currently active codes in /joinCodes. Reserves the slot
   * atomically by writing a placeholder before returning.
   */
  async generateUniqueCode(length: number, maxRetries = 10): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
      const code = generateJoinCode(length)
      const snapshot = await get(ref(rtdb, `joinCodes/${code}`))
      if (!snapshot.exists()) {
        // Reserve immediately — full claim happens when session starts
        await set(ref(rtdb, `joinCodes/${code}`), {
          reservedAt: new Date().toISOString(),
          presentationId: null,
        })
        return code
      }
    }
    throw new Error(
      `Unable to generate a unique ${length}-digit join code after ${maxRetries} attempts.`
    )
  },

  /**
   * Claims an already-reserved code for a specific presentation.
   */
  async claimCode(code: string, presentationId: string): Promise<void> {
    await set(ref(rtdb, `joinCodes/${code}`), {
      presentationId,
      claimedAt: new Date().toISOString(),
    })
  },

  /**
   * Releases a code so it can be reused (called when a presentation is deleted).
   */
  async releaseCode(code: string): Promise<void> {
    await remove(ref(rtdb, `joinCodes/${code}`))
  },

  /**
   * Checks whether a specific code is currently in use.
   */
  async isCodeActive(code: string): Promise<boolean> {
    const snapshot = await get(ref(rtdb, `joinCodes/${code}`))
    return snapshot.exists()
  },
}
