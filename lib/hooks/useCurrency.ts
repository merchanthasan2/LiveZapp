'use client'

/**
 * lib/hooks/useCurrency.ts
 *
 * Detects the user's locale from their browser timezone / language and returns
 * the appropriate currency code and a formatting helper.
 *
 * Supported:
 *   INR — India (timezone Asia/Kolkata or language en-IN / hi / etc.)
 *   GBP — United Kingdom (timezone Europe/London or language en-GB)
 *   USD — All other regions (default)
 *
 * Prices are displayed in local currency for UX clarity.
 * PayPal always charges in USD; it will show the equivalent at checkout.
 * Exchange rates are approximate and for display purposes only.
 */

import { useMemo } from 'react'

export type SupportedCurrency = 'USD' | 'INR' | 'GBP'

// Approximate rates (display only — PayPal charges USD)
const RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  INR: 84,
  GBP: 0.79,
}

const SYMBOLS: Record<SupportedCurrency, string> = {
  USD: '$',
  INR: '₹',
  GBP: '£',
}

const NAMES: Record<SupportedCurrency, string> = {
  USD: 'USD',
  INR: 'INR',
  GBP: 'GBP',
}

function detectCurrency(): SupportedCurrency {
  if (typeof window === 'undefined') return 'USD'

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
  const lang = navigator.language ?? ''

  // India
  if (
    tz === 'Asia/Calcutta' ||
    tz === 'Asia/Kolkata' ||
    lang.startsWith('hi') ||
    lang.endsWith('-IN')
  ) {
    return 'INR'
  }

  // UK
  if (tz === 'Europe/London' || lang === 'en-GB' || lang.endsWith('-GB')) {
    return 'GBP'
  }

  return 'USD'
}

export interface CurrencyState {
  currency: SupportedCurrency
  symbol: string
  name: string
  /**
   * Converts a USD price to the detected currency and returns a formatted string.
   * e.g. formatPrice(29) → "₹2,436" for INR or "$29" for USD
   */
  formatPrice: (usdPrice: number) => string
  /** Raw converted amount (unformatted number). */
  convertPrice: (usdPrice: number) => number
}

export function useCurrency(): CurrencyState {
  return useMemo(() => {
    const currency = detectCurrency()
    const rate = RATES[currency]
    const symbol = SYMBOLS[currency]

    const convertPrice = (usdPrice: number): number =>
      Math.round(usdPrice * rate)

    const formatPrice = (usdPrice: number): string => {
      if (usdPrice === 0) return 'Free'
      const converted = convertPrice(usdPrice)
      return `${symbol}${converted.toLocaleString()}`
    }

    return {
      currency,
      symbol,
      name: NAMES[currency],
      formatPrice,
      convertPrice,
    }
  }, [])
}
