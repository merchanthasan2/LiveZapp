import type { Metadata } from 'next'
import { PlansClient } from './PlansClient'

export const metadata: Metadata = {
  title: 'Plans & Pricing',
  description:
    'Choose the LiveZapp plan that fits your audience. From a free tier to unlimited Pro access — transparent pricing, no hidden fees.',
}

export default function PlansPage() {
  return <PlansClient />
}
