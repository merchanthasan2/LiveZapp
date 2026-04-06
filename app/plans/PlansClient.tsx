'use client'

import { useEffect, useState } from 'react'
import { Check, X, Star, Zap, Users, FileStack, RefreshCw, Shield, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { PLANS } from '@/types/plans'
import type { Plan, PlanFeatureFlags, PlanLimits, PlanId } from '@/types/plans'
import { useCurrency } from '@/lib/hooks/useCurrency'
import { PlanCheckoutButton } from '@/components/PlanCheckoutButton'
import { onValue, ref } from 'firebase/database'
import { rtdb } from '@/lib/firebase'

const FEATURE_ROWS: Array<{ label: string; key: keyof typeof PLANS[0]['features'] }> = [
  { label: 'Live quizzes', key: 'canUseQuiz' },
  { label: 'Q&A sessions', key: 'canUseQA' },
  { label: 'Feedback forms', key: 'canUseFeedback' },
  { label: 'Export results', key: 'canExportResults' },
  { label: 'Custom branding', key: 'canUseBranding' },
]

export function PlansClient() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [plans, setPlans] = useState<Plan[]>(PLANS)
  const { formatAmount, getPlanPrice, currency } = useCurrency()
  const textStrong = '#1c1b1b'
  const textMuted = '#645d71'
  const textSoft = '#9CA3AF'

  useEffect(() => {
    const unsub = onValue(ref(rtdb, 'admin/planConfig'), snap => {
      if (!snap.exists()) {
        setPlans(PLANS)
        return
      }
      const raw = snap.val() as Record<string, { limits?: Partial<PlanLimits>; features?: Partial<PlanFeatureFlags> }>
      const merged = PLANS.map(plan => {
        const planOverride = raw[plan.id as PlanId]
        return {
          ...plan,
          limits: {
            ...plan.limits,
            ...(planOverride?.limits ?? {}),
          },
          features: {
            ...plan.features,
            ...(planOverride?.features ?? {}),
            exportFormats: planOverride?.features?.exportFormats ?? plan.features.exportFormats,
          },
        }
      })
      setPlans(merged)
    })
    return () => unsub()
  }, [])

  const resolvePlanPrices = (plan: Plan) => ({
    monthly: getPlanPrice(plan.id, 'monthly', plan.pricePerMonth, plan.pricePerYear),
    annual: getPlanPrice(plan.id, 'annual', plan.pricePerMonth, plan.pricePerYear),
  })

  const displayedSavingPercent = (plan: Plan) => {
    const { monthly, annual } = resolvePlanPrices(plan)
    if (monthly === 0) return 0
    const twelveMonths = monthly * 12
    return Math.max(0, Math.round(((twelveMonths - annual) / twelveMonths) * 100))
  }

  const maxAnnualSavings = Math.max(
    ...plans.filter(plan => plan.pricePerMonth > 0).map(plan => {
      const { monthly, annual } = resolvePlanPrices(plan)
      return Math.max(0, monthly * 12 - annual)
    }),
    0,
  )

  const maxSavingsPercent = Math.max(...plans.filter(plan => plan.pricePerMonth > 0).map(displayedSavingPercent), 0)

  return (
    <div className="plans-surface py-24">
      <div className="section-container">
        <div className="mb-14 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Pricing</span>
          <h1 className="mt-3 mb-5 text-4xl font-bold sm:text-5xl" style={{ color: textStrong }}>
            Plans & <span className="gradient-text">Pricing</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg" style={{ color: textMuted }}>
            Start free and scale as your sessions grow. Every plan includes the core LiveZapp
            experience. Choose yours based on how big your audience is.
          </p>
          {currency !== 'USD' && (
            <p className="mt-3 text-xs" style={{ color: textSoft }}>
              Prices shown in {currency} from the shared pricing catalogue. Checkout is processed via PayPal.
            </p>
          )}
        </div>

        <div
          className="mx-auto mb-12 inline-flex items-center gap-4 rounded-2xl px-5 py-3"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <button
            onClick={() => setBilling('monthly')}
            className="text-sm font-semibold transition-colors"
            style={{ color: billing === 'monthly' ? '#650cd9' : '#9CA3AF' }}
          >
            Monthly
          </button>

          <button
            onClick={() => setBilling(b => (b === 'monthly' ? 'annual' : 'monthly'))}
            className="relative h-6 w-12 flex-shrink-0 rounded-full transition-colors"
            style={{
              background: billing === 'annual'
                ? 'linear-gradient(90deg,#650cd9,#bda6ff)'
                : '#D1D5DB',
            }}
            aria-label="Toggle billing cycle"
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ left: billing === 'annual' ? '26px' : '2px' }}
            />
          </button>

          <button
            onClick={() => setBilling('annual')}
            className="flex items-center gap-2 text-sm font-semibold transition-colors"
            style={{ color: billing === 'annual' ? '#650cd9' : '#9CA3AF' }}
          >
            Annual
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
              style={{
                background: billing === 'annual' ? '#650cd9' : '#F3F4F6',
                color: billing === 'annual' ? '#FFFFFF' : '#6B7280',
              }}
            >
              Save up to {maxSavingsPercent}%
            </span>
          </button>
        </div>

        {billing === 'annual' && (
          <div
            className="mx-auto mb-10 flex max-w-lg items-center justify-center gap-3 rounded-2xl px-6 py-3.5"
            style={{ background: 'rgba(255,177,159,0.18)', border: '1px solid rgba(255,177,159,0.38)' }}
          >
            <TrendingUp className="h-4 w-4 shrink-0" style={{ color: '#912f03' }} />
            <p className="text-sm font-medium" style={{ color: '#6a2610' }}>
              <strong>Annual billing saves you up to {formatAmount(maxAnnualSavings)}</strong> compared to monthly. Pay once, stay covered for 12 months.
            </p>
          </div>
        )}

        <div className="mb-24 grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map(plan => {
            const { monthly, annual } = resolvePlanPrices(plan)
            const displayPrice = billing === 'annual' ? annual : monthly
            const monthlyEquivalent = billing === 'annual' && monthly > 0 ? Math.round(annual / 12) : null
            const savingsPercent = displayedSavingPercent(plan)

            return (
              <div
                key={plan.id}
                className="relative flex flex-col p-8 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: '#FFFFFF',
                  border: plan.isRecommended ? '2px solid rgba(101,12,217,0.36)' : '1px solid #E5E7EB',
                  borderRadius: '1.5rem',
                  boxShadow: plan.isRecommended ? '0 16px 40px rgba(101,12,217,0.12)' : '0 6px 20px rgba(0,0,0,0.06)',
                }}
              >
                {plan.isRecommended && (
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                    <div className="flex items-center gap-1.5 rounded-full px-4 py-1.5 shadow-btn-primary" style={{ background: 'linear-gradient(135deg, #650cd9, #8f63ff)' }}>
                      <Star className="h-3 w-3 fill-white text-white" />
                      <span className="text-xs font-bold text-white">Most popular</span>
                    </div>
                  </div>
                )}

                {billing === 'annual' && monthly > 0 && (
                  <div className="absolute right-4 top-4">
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase"
                      style={{ background: 'rgba(255,177,159,0.18)', color: '#912f03', border: '1px solid rgba(255,177,159,0.38)' }}
                    >
                      Save {savingsPercent}%
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h2 className={`text-xl font-bold ${plan.isRecommended ? 'gradient-text' : ''}`} style={{ color: plan.isRecommended ? undefined : textStrong }}>{plan.name}</h2>
                  <p className="mt-1 text-xs" style={{ color: textMuted }}>{plan.tagline}</p>
                </div>

                <div className="mb-1">
                  {displayPrice === 0 ? (
                    <span className="text-4xl font-bold" style={{ color: textStrong }}>Free</span>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold" style={{ color: textStrong }}>{formatAmount(displayPrice)}</span>
                        <span className="text-sm" style={{ color: textMuted }}>{billing === 'annual' ? '/yr' : '/mo'}</span>
                      </div>
                      {billing === 'annual' && monthlyEquivalent !== null && (
                        <p className="mt-1 text-xs" style={{ color: textSoft }}>
                          {formatAmount(monthlyEquivalent)}/mo equivalent. <span className="line-through">{formatAmount(monthly * 12)}</span>
                        </p>
                      )}
                      {billing === 'monthly' && monthly > 0 && (
                        <p className="mt-1 text-xs" style={{ color: textSoft }}>
                          or {formatAmount(annual)}/yr. Save {savingsPercent}%
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <dl className="mt-5 mb-6 flex-1 space-y-3">
                  {[
                    { icon: FileStack, label: <span>Sessions <span style={{ color: '#9CA3AF' }}>(monthly)</span></span>, value: plan.limits.maxPresentations === 'unlimited' ? '8' : plan.limits.maxPresentations },
                    { icon: Users, label: 'Max participants', value: plan.limits.maxParticipantsPerSession.toLocaleString() },
                    { icon: Zap, label: 'Questions / session', value: plan.limits.maxQuestionsPerPresentation },
                    { icon: RefreshCw, label: 'Live at once', value: plan.limits.maxActiveSessions },
                  ].map(({ icon: Icon, label, value }, i, arr) => (
                    <div
                      key={i}
                      className="flex items-center justify-between pb-2"
                      style={i < arr.length - 1 ? { borderBottom: '1px solid #E5E7EB' } : undefined}
                    >
                      <dt className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
                        <Icon className="h-3 w-3" /> {label}
                      </dt>
                      <dd className="text-sm font-bold" style={{ color: '#111111' }}>{value}</dd>
                    </div>
                  ))}
                </dl>

                {plan.features.exportFormats && plan.features.exportFormats.length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-1.5">
                    {plan.features.exportFormats.map(fmt => (
                      <span
                        key={fmt}
                        className="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: 'rgba(101,12,217,0.10)', color: '#650cd9' }}
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

        <div className="glass-card mb-12 overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}>
          <div className="border-b px-8 py-6" style={{ borderColor: '#E5E7EB' }}>
            <h2 className="text-xl font-bold text-text-primary">Feature comparison</h2>
            <p className="mt-1 text-sm text-text-secondary">Everything included in each plan</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Plan feature comparison">
              <thead>
                <tr className="border-b" style={{ borderColor: '#E5E7EB' }}>
                  <th className="w-2/5 px-8 py-4 text-left text-sm font-semibold text-text-secondary">Feature</th>
                  {plans.map(plan => (
                    <th key={plan.id} scope="col" className="px-4 py-4 text-center">
                      <span className={`text-sm font-bold ${plan.isRecommended ? 'gradient-text' : 'text-text-primary'}`}>{plan.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-gray-50" style={{ borderColor: '#E5E7EB' }}>
                  <td className="px-8 py-4 text-sm font-medium text-text-primary">
                    Total sessions <span className="text-xs font-normal" style={{ color: '#9CA3AF' }}>(monthly)</span>
                  </td>
                  {plans.map(plan => (
                    <td key={plan.id} className="px-4 py-4 text-center text-sm font-bold text-text-primary">
                      {plan.limits.maxPresentations === 'unlimited' ? '8' : plan.limits.maxPresentations}
                    </td>
                  ))}
                </tr>
                <tr className="border-b" style={{ borderColor: '#E5E7EB' }}>
                  <td className="px-8 py-4 text-sm font-medium text-text-primary">Max participants / session</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="px-4 py-4 text-center text-sm font-bold text-text-primary">
                      {plan.limits.maxParticipantsPerSession.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr className="border-b bg-gray-50" style={{ borderColor: '#E5E7EB' }}>
                  <td className="px-8 py-4 text-sm font-medium text-text-primary">Questions per session</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="px-4 py-4 text-center text-sm font-bold text-text-primary">
                      {plan.limits.maxQuestionsPerPresentation}
                    </td>
                  ))}
                </tr>
                <tr className="border-b" style={{ borderColor: '#E5E7EB' }}>
                  <td className="px-8 py-4 text-sm font-medium text-text-primary">Live sessions at once</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="px-4 py-4 text-center text-sm font-bold text-text-primary">
                      {plan.limits.maxActiveSessions}
                    </td>
                  ))}
                </tr>
                <tr className="border-b bg-gray-50" style={{ borderColor: '#E5E7EB' }}>
                  <td className="px-8 py-4 text-sm font-medium text-text-primary">{billing === 'annual' ? 'Annual price' : 'Monthly price'}</td>
                  {plans.map(plan => {
                    const { monthly, annual } = resolvePlanPrices(plan)
                    return (
                      <td key={plan.id} className="px-4 py-4 text-center">
                        <span className="text-sm font-bold text-text-primary">
                          {monthly === 0 ? 'Free' : billing === 'annual' ? `${formatAmount(annual)}/yr` : `${formatAmount(monthly)}/mo`}
                        </span>
                        {billing === 'annual' && monthly > 0 && (
                          <p className="mt-0.5 text-[10px]" style={{ color: '#650cd9' }}>
                            Save {displayedSavingPercent(plan)}%
                          </p>
                        )}
                      </td>
                    )
                  })}
                </tr>
                {FEATURE_ROWS.map(({ label, key }, i) => (
                  <tr key={key} className={`border-b ${i % 2 !== 0 ? 'bg-gray-50' : ''}`} style={{ borderColor: '#E5E7EB' }}>
                    <td className="px-8 py-4 text-sm font-medium text-text-primary">{label}</td>
                    {plans.map(plan => (
                      <td key={plan.id} className="px-4 py-4 text-center">
                        {plan.features[key] ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full" style={{ background: 'rgba(101,12,217,0.10)' }} aria-label="Included">
                            <Check className="h-3.5 w-3.5" style={{ color: '#650cd9' }} />
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full" style={{ background: '#F3F4F6' }} aria-label="Not included">
                            <X className="h-3 w-3" style={{ color: '#D1D5DB' }} />
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="px-8 py-4 text-sm font-medium text-text-primary">Export formats</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="px-4 py-4 text-center">
                      {plan.features.exportFormats && plan.features.exportFormats.length > 0 ? (
                        <span className="text-xs font-semibold" style={{ color: '#650cd9' }}>
                          {plan.features.exportFormats.join(', ').toUpperCase()}
                        </span>
                      ) : (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full" style={{ background: '#F3F4F6' }} aria-label="Not available">
                          <X className="h-3 w-3" style={{ color: '#D1D5DB' }} />
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div
          className="mb-12 flex flex-col items-center justify-center gap-6 rounded-2xl px-6 py-5 sm:flex-row"
          style={{ background: '#f3eefb', border: '1px solid rgba(101,12,217,0.14)' }}
        >
          <div className="flex items-center gap-2.5 text-sm font-medium" style={{ color: '#4c1d95' }}>
            <Shield className="h-4 w-4" style={{ color: '#650cd9' }} />
            Payments secured by PayPal
          </div>
          <div className="hidden h-4 w-px sm:block" style={{ background: 'rgba(101,12,217,0.16)' }} />
          <div className="text-sm font-medium" style={{ color: '#6B7280' }}>Cancel anytime</div>
          <div className="hidden h-4 w-px sm:block" style={{ background: 'rgba(101,12,217,0.16)' }} />
          <div className="text-sm font-medium" style={{ color: '#6B7280' }}>No hidden fees</div>
          <div className="hidden h-4 w-px sm:block" style={{ background: 'rgba(101,12,217,0.16)' }} />
          <div className="text-sm font-medium capitalize" style={{ color: '#6B7280' }}>Billed {billing}</div>
        </div>

        <div className="text-center">
          <p className="text-sm text-text-secondary">
            Need a custom enterprise plan?{' '}
            <Link href="/contact" className="font-semibold hover:underline" style={{ color: '#650cd9' }}>
              Contact us
            </Link>
          </p>
        </div>
      </div>
      <style jsx>{`
        .plans-surface {
          background:
            radial-gradient(circle at 10% 8%, rgba(101, 12, 217, 0.08), transparent 26%),
            radial-gradient(circle at 90% 10%, rgba(167, 139, 250, 0.10), transparent 28%),
            #fcf9f8;
        }
        .plans-surface :global(.text-text-primary) {
          color: #1c1b1b !important;
        }
        .plans-surface :global(.text-text-secondary) {
          color: #645d71 !important;
        }
        .plans-surface :global(.text-primary) {
          color: #650cd9 !important;
        }
        .plans-surface :global(.gradient-text) {
          background: linear-gradient(135deg, #650cd9 0%, #8f63ff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
      `}</style>
    </div>
  )
}

