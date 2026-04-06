'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Check, X, ArrowRight, Star } from 'lucide-react'
import { PLANS } from '@/types/plans'
import type { Plan } from '@/types/plans'

function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const features = [
    { name: 'Live quizzes', included: plan.features.canUseQuiz },
    { name: 'Q&A sessions', included: plan.features.canUseQA },
    { name: 'Feedback forms', included: plan.features.canUseFeedback },
    { name: 'Export results', included: plan.features.canExportResults },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`relative flex flex-col glass-card p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-hover
        ${plan.isRecommended ? 'ring-2 ring-primary/60 shadow-glass-lg' : ''}`}
    >
      {/* Recommended badge */}
      {plan.isRecommended && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1.5 px-4 py-1.5 gradient-primary rounded-full shadow-btn-primary">
            <Star className="w-3 h-3 text-primary fill-primary" />
            <span className="text-xs font-bold text-white">Most popular</span>
          </div>
        </div>
      )}

      <div className="mb-5">
        <h3 className={`text-xl font-bold mb-1 ${plan.isRecommended ? 'gradient-text' : 'text-text-primary'}`}>
          {plan.name}
        </h3>
        <p className="text-xs text-text-secondary">{plan.tagline}</p>
      </div>

      {/* Price */}
      <div className="mb-6">
        {plan.pricePerMonth === 0 ? (
          <span className="text-3xl font-bold text-text-primary">Free</span>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-text-primary">${plan.pricePerMonth}</span>
            <span className="text-sm text-text-secondary">/mo</span>
          </div>
        )}
      </div>

      {/* Limits */}
      <dl className="space-y-2.5 mb-6 flex-1">
        {[
          {
            label: 'Monthly Zapps',
            value: plan.limits.maxPresentations === 'unlimited' ? '∞ Unlimited' : String(plan.limits.maxPresentations),
          },
          { label: 'Questions/session', value: String(plan.limits.maxQuestionsPerPresentation) },
          { label: 'Max participants', value: plan.limits.maxParticipantsPerSession.toLocaleString() },
          { label: 'Active sessions', value: String(plan.limits.maxActiveSessions) },
        ].map(item => (
          <div key={item.label} className="flex justify-between items-center">
            <dt className="text-xs text-text-secondary">{item.label}</dt>
            <dd className="text-xs font-semibold text-text-primary">{item.value}</dd>
          </div>
        ))}
      </dl>

      {/* Features */}
      <ul className="space-y-2 mb-7" aria-label={`${plan.name} features`}>
        {features.map(feat => (
          <li key={feat.name} className="flex items-center gap-2 text-xs">
            {feat.included ? (
              <Check className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-text-secondary/40 flex-shrink-0" />
            )}
            <span className={feat.included ? 'text-text-primary' : 'text-text-secondary/50'}>
              {feat.name}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href="/register"
        className={plan.isRecommended ? 'btn-primary text-sm text-center' : 'btn-ghost text-sm text-center'}
      >
        {plan.pricePerMonth === 0 ? 'Get started free' : `Start ${plan.name}`}
      </Link>
    </motion.div>
  )
}

export default function PricingPreview() {
  return (
    <section id="pricing" className="py-24">
      <div className="section-container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Pricing</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mt-3 mb-4">
            Simple pricing,{' '}
            <span className="gradient-text">no surprises</span>
          </h2>
          <p className="text-text-secondary max-w-lg mx-auto text-base">
            Start free and scale up when your audience grows. Every plan includes the core LiveZapp experience.
          </p>
        </motion.div>

        {/* Plan cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          {PLANS.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} index={i} />
          ))}
        </div>

        {/* Full plans link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <Link href="/plans" className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all duration-200">
            View full comparison table
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
