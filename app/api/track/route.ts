import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/server/firebaseAdmin'
import { getRequestIp, hitRateLimit } from '@/lib/server/rateLimit'

function parseUA(ua: string): { device: 'mobile' | 'tablet' | 'desktop'; os: string; browser: string } {
  // Device
  let device: 'mobile' | 'tablet' | 'desktop' = 'desktop'
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    device = 'tablet'
  } else if (/mobile|iphone|ipod|android.*mobile|blackberry|iemobile/i.test(ua)) {
    device = 'mobile'
  }

  // OS
  let os = 'Unknown'
  if (/windows nt/i.test(ua)) {
    const verMatch = ua.match(/windows nt ([\d.]+)/i)
    if (verMatch) {
      const ver = parseFloat(verMatch[1])
      if (ver >= 10) os = 'Windows 10/11'
      else os = 'Windows'
    } else {
      os = 'Windows'
    }
  } else if (/mac os x/i.test(ua)) {
    const verMatch = ua.match(/mac os x ([\d_]+)/i)
    if (verMatch) {
      const ver = verMatch[1].replace(/_/g, '.')
      os = `macOS ${ver}`
    } else {
      os = 'macOS'
    }
  } else if (/android/i.test(ua)) {
    const verMatch = ua.match(/android ([\d.]+)/i)
    if (verMatch) {
      os = `Android ${verMatch[1]}`
    } else {
      os = 'Android'
    }
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    const verMatch = ua.match(/os ([\d_]+)/i)
    if (verMatch) {
      const ver = verMatch[1].replace(/_/g, '.')
      os = `iOS ${ver}`
    } else {
      os = 'iOS'
    }
  } else if (/cros/i.test(ua)) {
    os = 'ChromeOS'
  } else if (/linux/i.test(ua)) {
    os = 'Linux'
  }

  // Browser
  let browser = 'Unknown'
  const uaLower = ua.toLowerCase()
  if (/edg\//i.test(ua)) {
    browser = 'Edge'
  } else if (/opr\//i.test(ua)) {
    browser = 'Opera'
  } else if (uaLower.includes('chromium')) {
    browser = 'Chromium'
  } else if (uaLower.includes('chrome/') && !uaLower.includes('chromium')) {
    browser = 'Chrome'
  } else if (/firefox/i.test(ua)) {
    browser = 'Firefox'
  } else if (uaLower.includes('safari/') && !uaLower.includes('chrome')) {
    browser = 'Safari'
  } else if (/msie|trident/i.test(ua)) {
    browser = 'IE'
  }

  return { device, os, browser }
}

const LOCALHOST_IPS = ['127.0.0.1', '::1', 'localhost', '::ffff:127.0.0.1']
const TRACK_WINDOW_MS = 60 * 1000
const TRACK_MAX_PER_WINDOW = 120

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

async function getGeo(ip: string): Promise<{
  country: string
  countryCode: string
  city: string
  region: string
  lat: number | null
  lon: number | null
  isp: string
}> {
  const empty = { country: '', countryCode: '', city: '', region: '', lat: null, lon: null, isp: '' }

  if (LOCALHOST_IPS.includes(ip)) return empty

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'LiveZapp/1.0' },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return empty
    const data = await res.json()
    return {
      country: data.country_name ?? '',
      countryCode: data.country_code ?? '',
      city: data.city ?? '',
      region: data.region ?? '',
      lat: data.latitude ?? null,
      lon: data.longitude ?? null,
      isp: data.org ?? '',
    }
  } catch {
    return empty
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { path, referrer, sessionId, userId, screenW, screenH } = body

    const ip = getRequestIp(req.headers)
    if (hitRateLimit(`track:${ip}`, TRACK_MAX_PER_WINDOW, TRACK_WINDOW_MS)) {
      return NextResponse.json({ ok: false, error: 'Too many tracking requests.' }, { status: 429 })
    }

    const normalizedPath = sanitizeText(path, 300)
    if (normalizedPath && !normalizedPath.startsWith('/')) {
      return NextResponse.json({ ok: false, error: 'Invalid path.' }, { status: 400 })
    }

    // Parse UA
    const ua = req.headers.get('user-agent') ?? ''
    const { device, os, browser } = parseUA(ua)

    // Geolocation
    const geo = await getGeo(ip)

    // Write to RTDB
    const record = {
      ts: Date.now(),
      path: normalizedPath,
      referrer: sanitizeText(referrer, 500),
      ip,
      country: geo.country,
      countryCode: geo.countryCode,
      city: geo.city,
      region: geo.region,
      lat: geo.lat,
      lon: geo.lon,
      isp: geo.isp,
      device,
      os,
      browser,
      screenW: Number.isFinite(screenW) ? Math.max(0, Number(screenW)) : null,
      screenH: Number.isFinite(screenH) ? Math.max(0, Number(screenH)) : null,
      userId: sanitizeText(userId, 128),
      isRegistered: typeof userId === 'string' && userId.trim() !== '',
      sessionId: sanitizeText(sessionId, 128),
    }

    await adminDb().ref('analytics/pageviews').push(record)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[track] error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
