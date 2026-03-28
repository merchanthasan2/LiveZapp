'use client'

import { motion } from 'framer-motion'
import { PenSquare, Share2, TrendingUp } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: PenSquare,
    title: 'Create',
    description:
      'Build your interactive presentation. Add quizzes, polls, and word cloud slides in minutes.',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
    accentGradient: 'from-primary/20 to-primary/5',
  },
  {
    number: '02',
    icon: Share2,
    title: 'Share',
    description:
      'Participants join via a session code or shareable link — on any device, no sign-up needed.',
    colorClass: 'text-secondary',
    bgClass: 'bg-secondary/10',
    accentGradient: 'from-secondary/20 to-secondary/5',
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Engage',
    description:
      'Watch responses appear in real time. Reveal results, animate leaderboards, and spark conversation.',
    colorClass: 'text-accent',
    bgClass: 'bg-accent/10',
    accentGradient: 'from-accent/20 to-accent/5',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

      <div className="section-container relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary">Simple process</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mt-3 mb-4">
            Up and running in{' '}
            <span className="gradient-text">three steps</span>
          </h2>
          <p className="text-text-secondary max-w-lg mx-auto text-base">
            No training required. Most hosts launch their first live session within ten minutes.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="absolute top-14 left-[16.67%] right-[16.67%] h-0.5 hidden lg:block">
            <div className="h-full bg-gradient-to-r from-primary/30 via-secondary/30 to-accent/30 rounded-full" />
            {/* Dots */}
            <div className="absolute left-1/3 -translate-x-1/2 -top-1.5 w-3.5 h-3.5 rounded-full bg-secondary/40 border-2 border-bg-base" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="group relative"
                >
                  <div className={`glass-card p-8 text-center bg-gradient-to-br ${step.accentGradient} hover:shadow-glass-hover transition-all duration-300 hover:-translate-y-1`}>
                    {/* Step icon */}
                    <div className={`w-16 h-16 rounded-3xl ${step.bgClass} flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-7 h-7 ${step.colorClass}`} />
                    </div>

                    {/* Number */}
                    <div className={`text-xs font-bold uppercase tracking-widest ${step.colorClass} mb-2`}>
                      Step {step.number}
                    </div>

                    <h3 className="text-2xl font-bold text-text-primary mb-3">{step.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
                  </div>

                  {/* Mobile connector */}
                  {i < steps.length - 1 && (
                    <div className="lg:hidden flex justify-center mt-4 mb-2">
                      <div className="w-0.5 h-8 bg-gradient-to-b from-primary/30 to-transparent rounded-full" />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
