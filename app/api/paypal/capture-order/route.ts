import { NextRequest, NextResponse } from 'next/server'
import { PLANS } from '@/types/plans'

const PAYPAL_BASE =
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`PayPal token error: ${await res.text()}`)
  const data = await res.json()
  return data.access_token as string
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, planId, billingCycle = 'monthly' } = await req.json()

    if (!orderId || !planId) {
      return NextResponse.json({ error: 'Missing orderId or planId' }, { status: 400 })
    }

    const plan = PLANS.find(p => p.id === planId)
    if (!plan || plan.pricePerMonth === 0) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const expectedAmount =
      billingCycle === 'annual' ? plan.pricePerYear : plan.pricePerMonth

    const token = await getAccessToken()

    // Capture the payment
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!captureRes.ok) {
      throw new Error(`PayPal capture error: ${await captureRes.text()}`)
    }

    const capture = await captureRes.json()

    const captureUnit = capture.purchase_units?.[0]
    const capturedAmount = parseFloat(
      captureUnit?.payments?.captures?.[0]?.amount?.value ?? '0'
    )
    const status: string = capture.status ?? ''

    if (status !== 'COMPLETED') {
      return NextResponse.json(
        { error: `Payment not completed — status: ${status}` },
        { status: 402 }
      )
    }

    if (capturedAmount < expectedAmount) {
      return NextResponse.json(
        { error: `Amount mismatch: expected $${expectedAmount}, received $${capturedAmount}` },
        { status: 402 }
      )
    }

    // Calculate expiry: 30 days for monthly, 365 days for annual
    const daysToAdd = billingCycle === 'annual' ? 365 : 30
    const planExpiresAt = new Date(
      Date.now() + daysToAdd * 24 * 60 * 60 * 1000
    ).toISOString()

    const transactionId: string =
      captureUnit?.payments?.captures?.[0]?.id ?? orderId

    return NextResponse.json({
      success: true,
      planId,
      billingCycle,
      planExpiresAt,
      transactionId,
    })
  } catch (err: any) {
    console.error('[paypal/capture-order]', err)
    return NextResponse.json({ error: err.message || 'Failed to capture order' }, { status: 500 })
  }
}
