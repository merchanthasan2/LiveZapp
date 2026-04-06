import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const FALLBACK_RATES = {
  GBP: 0.79,
  INR: 84,
}

export async function GET() {
  try {
    const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=GBP,INR', {
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      throw new Error(`Frankfurter responded ${response.status}`)
    }

    const payload = await response.json() as {
      rates?: { GBP?: number; INR?: number }
      date?: string
    }

    const gbp = Number(payload?.rates?.GBP)
    const inr = Number(payload?.rates?.INR)

    if (!Number.isFinite(gbp) || !Number.isFinite(inr)) {
      throw new Error('Frankfurter payload missing GBP/INR rates')
    }

    return NextResponse.json({
      success: true,
      source: 'Frankfurter (ECB reference rates)',
      method: 'frankfurter',
      fetchedAt: new Date().toISOString(),
      quotedDate: payload.date ?? null,
      rates: { GBP: gbp, INR: inr },
    })
  } catch (error) {
    console.error('[api/admin/pricing-rates] fallback used:', error)
    return NextResponse.json({
      success: true,
      source: 'Fallback (local default)',
      method: 'fallback',
      fetchedAt: new Date().toISOString(),
      rates: FALLBACK_RATES,
      warning: 'Live rate feed unavailable; fallback rates returned.',
    })
  }
}
