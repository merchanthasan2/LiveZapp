'use client'

/**
 * Detects the user's locale and returns pricing helpers.
 * Per-currency prices are loaded from Firebase `admin/pricing/{currency}/{planId}`
 * and take precedence over approximate exchange-rate conversions.
 */

import { useState, useEffect, useMemo } from 'react'
import { ref, get, onValue } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import type { PlanId } from '@/types/plans'

export type SupportedCurrency = 'USD' | 'INR' | 'GBP'

export interface CurrencyPlanPrice {
  monthly: number
  annual: number
}

export type PricingConfig = Partial<Record<SupportedCurrency, Partial<Record<PlanId, CurrencyPlanPrice>>>>

const RATES: Record<SupportedCurrency, number> = { USD: 1, INR: 84, GBP: 0.79 }
const SYMBOLS: Record<SupportedCurrency, string> = { USD: '$', INR: '₹', GBP: '£' }
const NAMES: Record<SupportedCurrency, string> = { USD: 'USD', INR: 'INR', GBP: 'GBP' }

let cachedPricing: PricingConfig | null = null
let pricingLoadedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000

export async function fetchPricingConfig(): Promise<PricingConfig> {
  try {
    const now = Date.now()
    if (cachedPricing && now - pricingLoadedAt < CACHE_TTL_MS) return cachedPricing

    const snap = await get(ref(rtdb, 'admin/pricing'))
    if (!snap.exists()) {
      cachedPricing = {}
      pricingLoadedAt = now
      return {}
    }

    cachedPricing = snap.val() as PricingConfig
    pricingLoadedAt = now
    return cachedPricing
  } catch {
    return {}
  }
}

export function invalidatePricingCache() {
  cachedPricing = null
  pricingLoadedAt = 0
}

function detectCurrency(): SupportedCurrency {
  if (typeof window === 'undefined') return 'USD'

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
  const lang = navigator.language ?? ''

  if (tz === 'Asia/Calcutta' || tz === 'Asia/Kolkata' || lang.startsWith('hi') || lang.endsWith('-IN')) return 'INR'
  if (tz === 'Europe/London' || lang === 'en-GB' || lang.endsWith('-GB')) return 'GBP'
  return 'USD'
}

export interface CurrencyState {
  currency: SupportedCurrency
  symbol: string
  name: string
  formatAmount: (amount: number) => string
  formatPrice: (usdPrice: number) => string
  convertPrice: (usdPrice: number) => number
  getPlanPrice: (planId: PlanId, billing: 'monthly' | 'annual', usdMonthly: number, usdAnnual: number) => number
  pricesLoading: boolean
}

export function useCurrency(): CurrencyState {
  const [pricing, setPricing] = useState<PricingConfig>({})
  const [pricesLoading, setPricesLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    fetchPricingConfig().then(nextPricing => {
      if (!isMounted) return
      setPricing(nextPricing)
      setPricesLoading(false)
    })

    const unsubscribe = onValue(ref(rtdb, 'admin/pricing'), snap => {
      const nextPricing = snap.exists() ? (snap.val() as PricingConfig) : {}
      cachedPricing = nextPricing
      pricingLoadedAt = Date.now()
      if (!isMounted) return
      setPricing(nextPricing)
      setPricesLoading(false)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  return useMemo(() => {
    const currency = detectCurrency()
    const rate = RATES[currency]
    const symbol = SYMBOLS[currency]

    const convertPrice = (usdPrice: number): number => Math.round(usdPrice * rate)

    const formatAmount = (amount: number): string => {
      if (amount === 0) return 'Free'
      const hasDecimals = Math.abs(amount % 1) > 0.0001
      return `${symbol}${amount.toLocaleString(undefined, {
        minimumFractionDigits: hasDecimals ? 2 : 0,
        maximumFractionDigits: 2,
      })}`
    }

    const formatPrice = (usdPrice: number): string => formatAmount(convertPrice(usdPrice))

    const getPlanPrice = (
      planId: PlanId,
      billing: 'monthly' | 'annual',
      usdMonthly: number,
      usdAnnual: number,
    ): number => {
      const configured = pricing[currency]?.[planId]
      if (configured) return billing === 'annual' ? configured.annual : configured.monthly

      const usdAmount = billing === 'annual' ? usdAnnual : usdMonthly
      return convertPrice(usdAmount)
    }

    return {
      currency,
      symbol,
      name: NAMES[currency],
      formatAmount,
      formatPrice,
      convertPrice,
      getPlanPrice,
      pricesLoading,
    }
  }, [pricing, pricesLoading])
}
