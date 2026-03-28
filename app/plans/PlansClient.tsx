'use client'

import { useState } from 'react'
import { Check, X, Star, Zap, Users, FileStack, RefreshCw, Shield, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { PLANS, annualSavingPercent } from '@/types/plans'
import { useCurrency } from '@/lib/hooks/useCurrency'
import { PlanCheckoutButton } from '@/components/PlanCheckoutButton'

// Feature labels for the comparison table
const FEATURE_ROWS: Array<{ label: string; key: keyof typeof PLANS[0]['features'] }> = [
  { label: 'Live quizzes', key: 'canUseQuiz' },
  { label: 'Q&A sessions', key: 'canUseQA' },
  { label: 'Feedback forms', key: 'canUseFeedback' },
  { label: 'Export results', key: 'canExportResults' },
  { label: 'Custom branding', key: 'canUseBranding' },
]

export function PlansClient() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const { formatPrice, currency } = useCurrency()

  const savePct = 25 // 25% off for all paid plans

  return (
    <div className="py-24">
      <div className="section-container">

        {/* ── Header ── */}
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Pricing</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mt-3 mb-5">
            Plans & <span className="gradient-text">Pricing</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto">
            Start free and scale as your sessions grow. Every plan includes the core LiveZapp
            experience — choose yours based on how big your audience is.
          </p>

          {/* Currency note */}
          {currency !== 'USD' && (
            <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>
              Prices shown in approximate {currency} · Charged in USD at checkout via PayPal
            </p>
          )}
        </div>

        {/* ── Billing toggle ── */}
        <div
          className="inline-flex items-center gap-4 mx-auto mb-12 px-5 py-3 rounded-2xl"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <button
            onClick={() => setBilling('monthly')}
            className="text-sm font-semibold transition-colors"
            style={{ color: billing === 'monthly' ? '#5478FF' : '#9CA3AF' }}
          >
            Monthly
          </button>

          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
            className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
            style={{
              background: billing === 'annual'
                ? 'linear-gradient(90deg,#5478FF,#53CBF3)'
                : '#D1D5DB',
            }}
            aria-label="Toggle billing cycle"
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ left: billing === 'annual' ? '26px' : '2px' }}
            />
          </button>

          <button
            onClick={() => setBilling('annual')}
            className="flex items-center gap-2 text-sm font-semibold transition-colors"
            style={{ color: billing === 'annual' ? '#5478FF' : '#9CA3AF' }}
          >
            Annual
            <span
              className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
              style={{
                background: billing === 'annual' ? '#5478FF' : '#F3F4F6',
                color: billing === 'annual' ? '#FFFFFF' : '#6B7280',
              }}
            >
              Save {savePct}%
            </span>
          </button>
        </div>

        {/* ── Annual savings callout ── */}
        {billing === 'annual' && (
          <div
            className="flex items-center justify-center gap-3 mb-10 py-3.5 px-6 rounded-2xl mx-auto max-w-lg"
            style={{
              background: '#FEF3C7',
              border: '1px solid #F59E0B',
            }}
          >
            <TrendingUp className="w-4 h-4 shrink-0" style={{ color: '#B45309' }} />
            <p className="text-sm font-medium" style={{ color: '#92400E' }}>
              <strong>Annual billing saves you up to {formatPrice(237)}</strong> compared to monthly — paid once, valid 12 months.
            </p>
          </div>
        )}

        {/* ── Plan cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2 mb-24">
          {PLANS.map(plan => {
            const displayPrice =
              plan.pricePerMonth === 0
                ? 0
                : billing === 'annual'
                ? plan.pricePerYear
                : plan.pricePerMonth

            const monthlyEquiv =
              billing === 'annual' && plan.pricePerMonth > 0
                ? Math.round(plan.pricePerYear / 12)
                : null

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col glass-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-hover
                  ${plan.isRecommended ? 'ring-2 ring-primary/60 shadow-glass-lg' : ''}`}
              >
                {plan.isRecommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 gradient-primary rounded-full shadow-btn-primary">
                      <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                      <span className="text-xs font-bold text-white">Most popular</span>
                    </div>
                  </div>
                )}

                {/* Annual savings badge */}
                {billing === 'annual' && plan.pricePerMonth > 0 && (
                  <div className="absolute top-4 right-4">
                    <span
                      className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
                      style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B' }}
                    >
                      Save {annualSavingPercent(plan)}%
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h2 className={`text-xl font-bold ${plan.isRecommended ? 'gradient-text' : 'text-text-primary'}`}>
                    {plan.name}
                  </h2>
                  <p className="text-xs text-text-secondary mt-1">{plan.tagline}</p>
                </div>

                {/* Price */}
                <div className="mb-1">
                  {displayPrice === 0 ? (
                    <span className="text-4xl font-bold text-text-primary">Free</span>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-text-primary">
                          {formatPrice(displayPrice)}
                        </span>
                        <span className="text-sm text-text-secondary">
                          {billing === 'annual' ? '/yr' : '/mo'}
                        </span>
                      </div>
                      {billing === 'annual' && monthlyEquiv !== null && (
                        <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                          {formatPrice(monthlyEquiv)}/mo equivalent ·{' '}
                          <span className="line-through">{formatPrice(plan.pricePerMonth * 12)}</span>
                        </p>
                      )}
                      {billing === 'monthly' && (
                        <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                          or {formatPrice(plan.pricePerYear)}/yr — save {savePct}%
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Limits */}
                <dl className="space-y-3 mb-6 flex-1 mt-5">
                  {[
                    { icon: FileStack, label: <span>Sessions <span style={{ color: '#9CA3AF' }}>(lifetime)</span></span>, value: plan.limits.maxPresentations === 'unlimited' ? '∞' : plan.limits.maxPresentations },
                    { icon: Users,     label: 'Max participants', value: plan.limits.maxParticipantsPerSession.toLocaleString() },
                    { icon: Zap,       label: 'Questions / session', value: plan.limits.maxQuestionsPerPresentation },
                    { icon: RefreshCw, label: 'Live at once',     value: plan.limits.maxActiveSessions },
                  ].map(({ icon: Icon, label, value }, i, arr) => (
                    <div
                      key={i}
                      className="flex justify-between items-center pb-2"
                      style={i < arr.length - 1 ? { borderBottom: '1px solid #E5E7EB' } : undefined}
                    >
                      <dt className="text-xs flex items-center gap-1.5" style={{ color: '#6B7280' }}>
                        <Icon className="w-3 h-3" /> {label}
                      </dt>
                      <dd className="text-sm font-bold" style={{ color: '#111111' }}>{value}</dd>
                    </div>
                  ))}
                </dl>

                {/* Export format badges */}
                {plan.features.exportFormats && plan.features.exportFormats.length > 0 && (
                  <div className="mb-5 flex gap-1.5 flex-wrap">
                    {plan.features.exportFormats.map(fmt => (
                      <span
                        key={fmt}
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg"
                        style={{ background: 'rgba(0,166,166,0.10)', color: '#007A7A' }}
                      >
                        {fmt}
                      </span>
                    ))}
                  </div>
                )}

                <PlanCheckoutButton
                  planId={plan.id}
                  planName={plan.name}
                  pricePerMonth={plan.pricePerMonth}
                  pricePerYear={plan.pricePerYear}
                  billingCycle={billing}
                  isRecommended={plan.isRecommended}
                />
              </div>
            )
          })}
        </div>

        {/* ── Feature comparison table ── */}
        <div className="glass-card overflow-hidden mb-12">
          <div className="px-8 py-6 border-b" style={{ borderColor: '#E5E7EB' }}>
            <h2 className="text-xl font-bold text-text-primary">Feature comparison</h2>
            <p className="text-sm text-text-secondary mt-1">Everything that's included in each plan</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Plan feature comparison">
              <thead>
                <tr className="border-b" style={{ borderColor: '#E5E7EB' }}>
                  <th className="text-left px-8 py-4 text-sm font-semibold text-text-secondary w-2/5">
                    Feature
                  </th>
                  {PLANS.map(plan => (
                    <th key={plan.id} scope="col" className="text-center px-4 py-4">
                      <span className={`text-sm font-bold ${plan.isRecommended ? 'gradient-text' : 'text-text-primary'}`}>
                        {plan.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Limit rows */}
                <tr className="border-b bg-gray-50" style={{ borderColor: '#E5E7EB' }}>
                  <td className="px-8 py-4 text-sm text-text-primary font-medium">
                    Total sessions <span className="font-normal text-xs" style={{ color: '#9CA3AF' }}>(lifetime)</span>
                  </td>
                  {PLANS.map(plan => (
                    <td key={plan.id} className="text-center px-4 py-4 text-sm font-bold text-text-primary">
                      {plan.limits.maxPresentations === 'unlimited' ? '∞' : plan.limits.maxPresentations}
                    </td>
                  ))}
                </tr>
                <tr className="border-b" style={{ borderColor: '#E5E7EB' }}>
                  <td className="px-8 py-4 text-sm text-text-primary font-medium">
                    Max participants / session
                  </td>
                  {PLANS.map(plan => (
                    <td key={plan.id} className="text-center px-4 py-4 text-sm font-bold text-text-primary">
                      {plan.limits.maxParticipantsPerSession.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="border-b bg-gray-50" style={{ borderColor: '#E5E7EB' }}>
                  <td className="px-8 py-4 text-sm text-text-primary font-medium">
                    Questions per session
                  </td>
                  {PLANS.map(plan => (
                    <td key={plan.id} className="text-center px-4 py-4 text-sm font-bold text-text-primary">
                      {plan.limits.maxQuestionsPerPresentation}
                    </td>
                  ))}
                </tr>
                <tr className="border-b" style={{ borderColor: '#E5E7EB' }}>
                  <td className="px-8 py-4 text-sm text-text-primary font-medium">
                    Live sessions at once
                  </td>
                  {PLANS.map(plan => (
                    <td key={plan.id} className="text-center px-4 py-4 text-sm font-bold text-text-primary">
                      {plan.limits.maxActiveSessions}
                    </td>
                  ))}
                </tr>

                {/* Pricing row for selected billing */}
                <tr className="border-b bg-gray-50" style={{ borderColor: '#E5E7EB' }}>
                  <td className="px-8 py-4 text-sm text-text-primary font-medium">
                    {billing === 'annual' ? 'Annual price' : 'Monthly price'}
                  </td>
                  {PLANS.map(plan => (
                    <td key={plan.id} className="text-center px-4 py-4">
                      <span className="text-sm font-bold text-text-primary">
                        {plan.pricePerMonth === 0
                          ? 'Free'
                          : billing === 'annual'
                          ? `${formatPrice(plan.pricePerYear)}/yr`
                          : `${formatPrice(plan.pricePerMonth)}/mo`}
                      </span>
                      {billing === 'annual' && plan.pricePerMonth > 0 && (
                        <p className="text-[10px] mt-0.5" style={{ color: '#007A7A' }}>
                          Save {annualSavingPercent(plan)}%
                        </p>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Feature flag rows */}
                {FEATURE_ROWS.map(({ label, key }, i) => (
                  <tr
                    key={key}
                    className={`border-b ${i % 2 !== 0 ? 'bg-gray-50' : ''}`} style={{ borderColor: '#E5E7EB' }}
                  >
                    <td className="px-8 py-4 text-sm text-text-primary font-medium">{label}</td>
                    {PLANS.map(plan => (
                      <td key={plan.id} className="text-center px-4 py-4">
                        {plan.features[key] ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary/10" aria-label="Included">
                            <Check className="w-3.5 h-3.5 text-secondary" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full " style={{ background: '#F3F4F6' }} aria-label="Not included">
                            <X className="w-3 h-3" style={{ color: '#D1D5DB' }} />
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Export formats row */}
                <tr>
                  <td className="px-8 py-4 text-sm text-text-primary font-medium">Export formats</td>
                  {PLANS.map(plan => (
                    <td key={plan.id} className="text-center px-4 py-4">
                      {plan.features.exportFormats && plan.features.exportFormats.length > 0 ? (
                        <span className="text-xs font-semibold" style={{ color: '#007A7A' }}>
                          {plan.features.exportFormats.join(', ').toUpperCase()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full " style={{ background: '#F3F4F6' }} aria-label="Not available">
                          <X className="w-3 h-3" style={{ color: '#D1D5DB' }} />
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Trust strip ── */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12 px-6 py-5 rounded-2xl"
          style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}
        >
          <div className="flex items-center gap-2.5 text-sm font-medium" style={{ color: '#4338CA' }}>
            <Shield className="w-4 h-4" style={{ color: '#6366F1' }} />
            Payments secured by PayPal
          </div>
          <div className="hidden sm:block w-px h-4" style={{ background: '#C7D2FE' }} />
          <div className="text-sm font-medium" style={{ color: '#6B7280' }}>Cancel anytime</div>
          <div className="hidden sm:block w-px h-4" style={{ background: '#C7D2FE' }} />
          <div className="text-sm font-medium" style={{ color: '#6B7280' }}>No hidden fees</div>
          <div className="hidden sm:block w-px h-4" style={{ background: '#C7D2FE' }} />
          <div className="text-sm font-medium capitalize" style={{ color: '#6B7280' }}>Billed {billing}</div>
        </div>

        {/* ── FAQ nudge ── */}
        <div className="text-center">
          <p className="text-text-secondary text-sm">
            Need a custom enterprise plan?{' '}
            <Link href="/contact" className="text-primary font-semibold hover:underline">
              Contact us
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
