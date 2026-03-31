'use client'

/**
 * lib/hooks/useCurrency.ts
 *
 * Detects the user's locale and returns pricing helpers.
 * Per-currency prices are loaded from Firebase admin/pricing/{currency}/{planId}
 * and take precedence over approximate exchange-rate conversions.
 *
 * Supported currencies: USD, INR, GBP
 */

import { useState, useEffect, useMemo } from 'react'
import { ref, get } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import type { PlanId } from '@/types/plans'

export type SupportedCurrency = 'USD' | 'INR' | 'GBP'

/** Shape stored in Firebase: admin/pricing/{currency}/{planId} */
export interface CurrencyPlanPrice {
  monthly: number
  annual: number
}

export type PricingConfig = Partial<Record<SupportedCurrency, Partial<Record<PlanId, CurrencyPlanPrice>>>>

// Approximate fallback rates (display only)
const RATES: Record<SupportedCurrency, number> = { USD: 1, INR: 84, GBP: 0.79 }

const SYMBOLS: Record<SupportedCurrency, string> = { USD: '$', INR: '₹', GBP: '£' }

const NAMES: Record<SupportedCurrency, string> = { USD: 'USD', INR: 'INR', GBP: 'GBP' }

/** Cached Firebase pricing config */
let cachedPricing: PricingConfig | null = null
let pricingLoadedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000

export async function fetchPricingConfig(): Promise<PricingConfig> {
  try {
    const now = Date.now()
    if (cachedPricing && now - pricingLoadedAt < CACHE_TTL_MS) return cachedPricing

    const snap = await get(ref(rtdb, 'admin/pricing'))
    if (!snap.exists()) { cachedPricing = {}; pricingLoadedAt = now; return {} }
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
  /** Converts a USD price to local currency and formats it (falls back to rate conversion). */
  formatPrice: (usdPrice: number) => string
  /** Raw converted amount. */
  convertPrice: (usdPrice: number) => number
  /**
   * Returns the configured price for a plan in this currency.
   * Falls back to rate-converted USD price if no Firebase config exists.
   */
  getPlanPrice: (planId: PlanId, billing: 'monthly' | 'annual', usdMonthly: number, usdAnnual: number) => number
  /** True while Firebase prices are loading */
  pricesLoading: boolean
}

export function useCurrency(): CurrencyState {
  const [pricing, setPricing] = useState<PricingConfig>({})
  const [pricesLoading, setPricesLoading] = useState(true)

  useEffect(() => {
    fetchPricingConfig().then(p => { setPricing(p); setPricesLoading(false) })
  }, [])

  return useMemo(() => {
    const currency = detectCurrency()
    const rate = RATES[currency]
    const symbol = SYMBOLS[currency]

    const convertPrice = (usdPrice: number): number => Math.round(usdPrice * rate)

    const formatPrice = (usdPrice: number): string => {
      if (usdPrice === 0) return 'Free'
      return `${symbol}${convertPrice(usdPrice).toLocaleString()}`
    }

    const getPlanPrice = (
      planId: PlanId,
      billing: 'monthly' | 'annual',
      usdMonthly: number,
      usdAnnual: number,
    ): number => {
      const configured = pricing[currency]?.[planId]
      if (configured) return billing === 'annual' ? configured.annual : configured.monthly
      // Fallback: rate-convert the USD price
      const usdAmount = billing === 'annual' ? usdAnnual : usdMonthly
      return convertPrice(usdAmount)
    }

    return { currency, symbol, name: NAMES[currency], formatPrice, convertPrice, getPlanPrice, pricesLoading }
  }, [pricing, pricesLoading])
}
