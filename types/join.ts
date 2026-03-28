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
 * TODO: replace stub with a server-side call (Firestore transaction) to
 * ensure uniqueness across concurrent active sessions.
 */
export function generateJoinCode(length: number): string {
  // Ensure first digit is never 0 (avoids leading-zero display issues)
  const first = String(Math.floor(1 + Math.random() * 9))
  const rest = Array.from({ length: length - 1 }, () =>
    String(Math.floor(Math.random() * 10))
  ).join('')
  return first + rest
}
