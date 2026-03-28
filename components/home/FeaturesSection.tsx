'use client'

import { motion } from 'framer-motion'
import { Layers, Smartphone, BarChart2, Globe2 } from 'lucide-react'

const features = [
  {
    icon: Layers,
    title: 'Multi-question presentations',
    description:
      'Build complete interactive decks with quizzes, polls, word clouds, and open Q&A — all in one place.',
    colorClass: 'icon-bg-primary',
    gradient: 'from-primary/5 to-primary/10',
    border: 'border-primary/20',
  },
  {
    icon: Smartphone,
    title: 'Mobile-first participation',
    description:
      'Audience members join from any phone or laptop via a code or link. No downloads, no friction.',
    colorClass: 'icon-bg-secondary',
    gradient: 'from-secondary/5 to-secondary/10',
    border: 'border-secondary/20',
  },
  {
    icon: BarChart2,
    title: 'Real-time results & leaderboards',
    description:
      'Watch responses roll in live. Animate leaderboards after quizzes to celebrate top scorers.',
    colorClass: 'icon-bg-accent',
    gradient: 'from-accent/5 to-accent/10',
    border: 'border-accent/20',
  },
  {
    icon: Globe2,
    title: 'Scales from classrooms to conferences',
    description:
      'Whether it\'s 10 students or 1,000 delegates, LiveZapp handles the audience — you handle the content.',
    colorClass: 'icon-bg-secondary',
    gradient: 'from-secondary/5 to-secondary/10',
    border: 'border-secondary/20',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative">
      {/* Section header */}
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">What you get</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mt-3 mb-4">
            Everything you need to{' '}
            <span className="gradient-text">captivate any audience</span>
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto text-base">
            From single polls to full interactive presentations — LiveZapp gives you the tools to
            make every session memorable.
          </p>
        </motion.div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, i) => {
            const Icon = feat.icon
            return (
              <motion.article
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`group glass-card-hover p-7 bg-gradient-to-br ${feat.gradient} border ${feat.border}`}
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-5 ${feat.colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-text-primary mb-2 leading-snug">
                  {feat.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {feat.description}
                </p>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
