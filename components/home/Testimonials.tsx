'use client'

import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'
import { TESTIMONIALS } from '@/lib/data/mockData'

export default function Testimonials() {
  return (
    <section className="py-20">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary">Loved by hosts</span>
          <h2 className="text-3xl font-bold text-text-primary mt-3">
            What our users are{' '}
            <span className="gradient-text">saying</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {TESTIMONIALS.map((t, i) => (
            <motion.blockquote
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="glass-card p-8 space-y-5"
            >
              <Quote className="w-8 h-8 text-primary/30" />
              <p className="text-text-primary text-sm leading-relaxed">"{t.quote}"</p>
              <footer className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold">
                  {t.author.charAt(0)}
                </div>
                <div>
                  <cite className="not-italic text-sm font-bold text-text-primary">{t.author}</cite>
                  <p className="text-xs text-text-secondary">{t.role} · {t.company}</p>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}
