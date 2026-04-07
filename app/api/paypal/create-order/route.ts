import { NextRequest, NextResponse } from 'next/server'
import { PLANS } from '@/types/plans'
import { verifyBearerUid } from '@/lib/server/verifyBearerUid'

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
    let tokenUid: string | null
    try {
      tokenUid = await verifyBearerUid(req)
    } catch {
      return NextResponse.json({ error: 'Server authentication is not configured.' }, { status: 503 })
    }

    if (!tokenUid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planId, billingCycle = 'monthly' } = await req.json()

    const plan = PLANS.find(p => p.id === planId)
    if (!plan || plan.pricePerMonth === 0) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const amount =
      billingCycle === 'annual' ? plan.pricePerYear : plan.pricePerMonth
    const description =
      billingCycle === 'annual'
        ? `LiveZapp ${plan.name} Plan — Annual (25% off)`
        : `LiveZapp ${plan.name} Plan — Monthly`

    const token = await getAccessToken()

    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: amount.toFixed(2),
            },
            description,
            custom_id: `${tokenUid}|${planId}|${billingCycle}`,
          },
        ],
        application_context: {
          brand_name: 'LiveZapp',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
        },
      }),
    })

    if (!res.ok) throw new Error(`PayPal create-order error: ${await res.text()}`)

    const order = await res.json()
    return NextResponse.json({ orderId: order.id })
  } catch (err: any) {
    console.error('[paypal/create-order]', err)
    return NextResponse.json({ error: err.message || 'Failed to create order' }, { status: 500 })
  }
}
