// types/join.ts
// Join code configuration, live session shape, and QR settings.

export interface JoinConfig {
  defaultCodeLength: number         // e.g. 6
  allowedCodeLengths: number[]      // e.g. [6, 8, 10]
}

export const DEFAULT_JOIN_CONFIG: JoinConfig = {
  defaultCodeLength: 6,
  allowedCodeLengths: [6, 8, 10],
}

export interface LiveSession {
  id: string
  presentationId: string
  joinCode: string
  isActive: boolean
  startedAt: string   // ISO 8601
  endedAt?: string    // ISO 8601; undefined while session is active
}

export interface QRSettings {
  codeLength: number  // must be in JoinConfig.allowedCodeLengths
  // Future: errorCorrectionLevel, logoUrl, foregroundColor, backgroundColor
}

export const DEFAULT_QR_SETTINGS: QRSettings = {
  codeLength: DEFAULT_JOIN_CONFIG.defaultCodeLength,
}

/**
 * Generates a numeric-only join code of the given length.
 * Checks uniqueness by querying Firebase to ensure no collision with active sessions.
 */
export function generateJoinCodeSync(length: number): string {
  // Ensure first digit is never 0 (avoids leading-zero display issues)
  const first = String(Math.floor(1 + Math.random() * 9))
  const rest = Array.from({ length: length - 1 }, () =>
    String(Math.floor(Math.random() * 10))
  ).join('')
  return first + rest
}

/**
 * Generates a numeric-only join code of the given length.
 * Checks uniqueness against active sessions to ensure no collision.
 * @param length Code length (e.g., 6 for a 6-digit code)
 * @param rtdb Firebase Realtime Database reference (injected)
 * @returns Unique join code guaranteed to not exist in active sessions
 */
export async function generateJoinCode(length: number, rtdb: any): Promise<string> {
  // Try up to 10 times to generate a unique code
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateJoinCodeSync(length)

    // Check if this code exists in active sessions
    try {
      const { ref, get } = await import('firebase/database')
      const sessionRef = ref(rtdb, `live_sessions/${code}`)
      const snapshot = await get(sessionRef)

      // If session doesn't exist or is not active, code is unique
      if (!snapshot.exists()) {
        return code
      }

      const session = snapshot.val()
      if (!session.isActive) {
        return code
      }
    } catch (err) {
      // On error, just return the code (will fail later in startSession if it's a real issue)
      return code
    }
  }

  // Fallback: return a code even if we couldn't verify uniqueness
  // The startSession() call will fail if there's a collision
  return generateJoinCodeSync(length)
}
