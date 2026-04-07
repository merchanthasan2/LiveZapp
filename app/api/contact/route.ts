import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/server/firebaseAdmin'
import { getRequestIp, hitRateLimit } from '@/lib/server/rateLimit'

const CONTACT_WINDOW_MS = 60 * 60 * 1000
const CONTACT_MAX_PER_WINDOW = 10

export async function POST(req: NextRequest) {
  try {
    const ip = getRequestIp(req.headers)
    if (hitRateLimit(`contact:${ip}`, CONTACT_MAX_PER_WINDOW, CONTACT_WINDOW_MS)) {
      return NextResponse.json({ ok: false, error: 'Too many submissions. Try again later.' }, { status: 429 })
    }

    const body = (await req.json()) as {
      name?: unknown
      email?: unknown
      message?: unknown
    }

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (name.length < 2) {
      return NextResponse.json({ ok: false, error: 'Name must be at least 2 characters.' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'Please provide a valid email address.' }, { status: 400 })
    }
    if (message.length < 20) {
      return NextResponse.json({ ok: false, error: 'Message must be at least 20 characters.' }, { status: 400 })
    }

    const record = {
      ts: Date.now(),
      name,
      email,
      message,
      ip,
      userAgent: req.headers.get('user-agent') ?? null,
      referrer: req.headers.get('referer') ?? null,
    }

    await adminDb().ref('contact/messages').push(record)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/contact] error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

