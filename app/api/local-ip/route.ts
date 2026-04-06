import { NextResponse } from 'next/server'
import os from 'os'

/**
 * Returns the server's local network IP address.
 * Used in dev so presenters can share a scannable URL on the same LAN.
 * Disabled in production to avoid exposing host network details.
 */
export function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ip: null, disabled: true }, { status: 404 })
  }
  const interfaces = os.networkInterfaces()
  let localIp: string | null = null

  for (const iface of Object.values(interfaces)) {
    if (!iface) continue
    for (const entry of iface) {
      // Skip loopback and IPv6
      if (entry.family === 'IPv4' && !entry.internal) {
        localIp = entry.address
        break
      }
    }
    if (localIp) break
  }

  return NextResponse.json({ ip: localIp })
}
