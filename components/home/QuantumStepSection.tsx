'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Cpu, Globe, Code2, Sparkles, ArrowRight } from 'lucide-react'

const tools = [
  {
    icon: Cpu,
    name: 'LiveZapp',
    desc: 'Live audience engagement & interactive presentations',
    href: '/',
    color: 'icon-bg-primary',
  },
  {
    icon: Globe,
    name: 'QuantumSites',
    desc: 'AI-designed, high-performance marketing websites',
    href: '#',
    color: 'icon-bg-secondary',
  },
  {
    icon: Code2,
    name: 'DevForge',
    desc: 'Custom web app development & API integration',
    href: '#',
    color: 'icon-bg-accent',
  },
]

export default function QuantumStepSection() {
  return (
    <section id="tools" className="py-24 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

      <div className="section-container relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-full border border-secondary/20">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              <span className="text-xs font-semibold text-secondary">Built by QuantumStep</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
              Modern products built for{' '}
              <span className="gradient-text">the AI era</span>
            </h2>

            <p className="text-text-secondary leading-relaxed">
              QuantumStep is a modern web development studio specialising in AI-oriented apps,
              precision-crafted websites, and scalable digital tools. LiveZapp is one of a growing
              suite of products designed to make complex technology feel effortless.
            </p>

            <a
              href="https://quantumstep.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all duration-200"
            >
              Visit QuantumStep.in
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>

          {/* Right: tool cards */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary mb-6">
              Explore our tools
            </p>
            {tools.map((tool, i) => {
              const Icon = tool.icon
              const isExternal = tool.href === '#'
              return (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link
                    href={tool.href}
                    className={`group flex items-center gap-5 glass-card p-5 hover:shadow-glass-hover hover:-translate-y-0.5 transition-all duration-300 ${isExternal ? 'opacity-70 hover:opacity-100' : ''}`}
                    aria-label={tool.name}
                  >
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${tool.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-primary">{tool.name}</span>
                        {isExternal && (
                          <span className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent rounded-full font-semibold">
                            Coming soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary truncate">{tool.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-secondary group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
