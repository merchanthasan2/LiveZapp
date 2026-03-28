'use client'

/**
 * components/PlanCheckoutButton.tsx
 *
 * CTA button on each plan card. Redirects to the full /checkout page
 * (pre-populated with plan + billing cycle) rather than using an inline modal.
 *
 * States:
 *   - Free plan          → link to /register
 *   - Not logged in      → /login?redirect=/checkout?plan=X&billing=Y
 *   - Current plan       → "Current Plan" badge + "Manage" link
 *   - Other paid plan    → navigate to /checkout?plan=X&billing=Y
 */

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import type { PlanId } from '@/types/plans'

interface Props {
  planId: PlanId
  planName: string
  pricePerMonth: number
  pricePerYear: number
  billingCycle: 'monthly' | 'annual'
  isRecommended?: boolean
}

function isExpired(date?: string): boolean {
  if (!date) return false
  return new Date(date) < new Date()
}

export function PlanCheckoutButton({
  planId,
  planName,
  pricePerMonth,
  billingCycle,
  isRecommended,
}: Props) {
  const router = useRouter()
  const { user } = useAuth()

  // Free plan
  if (pricePerMonth === 0) {
    return (
      <Link href="/register" className="btn-ghost text-sm text-center mt-auto block">
        Start for free
      </Link>
    )
  }

  const checkoutUrl = `/checkout?plan=${planId}&billing=${billingCycle}`

  const isCurrentActive =
    user?.planId === planId && !isExpired(user?.planExpiresAt) && !user?.planCancelledAt

  const isCancelled =
    user?.planId === planId && !!user?.planCancelledAt && !isExpired(user?.planExpiresAt)

  if (isCurrentActive) {
    return (
      <div className="flex flex-col gap-2 mt-auto">
        <div
          className="text-sm text-center py-2.5 px-5 rounded-lg font-semibold"
          style={{
            background: 'rgba(34,197,94,0.10)',
            border: '1px solid rgba(34,197,94,0.25)',
            color: '#4ade80',
          }}
        >
          ✓ Current Plan
        </div>
        <Link
          href="/app/settings"
          className="text-xs text-center text-white/30 hover:text-white/60 transition-colors"
        >
          Manage subscription →
        </Link>
      </div>
    )
  }

  if (isCancelled) {
    return (
      <div className="flex flex-col gap-2 mt-auto">
        <div
          className="text-xs text-center py-2 px-4 rounded-lg"
          style={{ background: 'rgba(251,113,133,0.10)', border: '1px solid rgba(251,113,133,0.20)', color: '#fb7185' }}
        >
          Cancelled — access until expiry
        </div>
        <button
          onClick={() => router.push(checkoutUrl)}
          className="btn-ghost text-sm text-center"
        >
          Renew {planName}
        </button>
      </div>
    )
  }

  const handleClick = () => {
    if (!user) {
      // Not logged in — send to login with redirect back to checkout
      router.push(`/login?redirect=${encodeURIComponent(checkoutUrl)}`)
      return
    }
    router.push(checkoutUrl)
  }

  // Determine button label
  const currentPlanIndex = ['free', 'basic', 'regular', 'pro'].indexOf(user?.planId ?? 'free')
  const thisPlanIndex = ['free', 'basic', 'regular', 'pro'].indexOf(planId)
  const isUpgrade = !user || thisPlanIndex > currentPlanIndex
  const label = isUpgrade ? `Upgrade to ${planName}` : `Switch to ${planName}`

  return (
    <button
      onClick={handleClick}
      className={`text-sm text-center mt-auto ${isRecommended ? 'btn-primary' : 'btn-ghost'}`}
    >
      {label}
    </button>
  )
}
