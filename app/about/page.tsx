import type { Metadata } from 'next'
import { Sparkles, Target, Users, Zap } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about LiveZapp and QuantumStep — the modern AI-oriented web development studio behind the platform.',
}

const values = [
  {
    icon: Sparkles,
    title: 'AI-first thinking',
    desc: 'We embed intelligence into every product — from smarter interfaces to AI-assisted content suggestions.',
    color: 'icon-bg-primary',
  },
  {
    icon: Target,
    title: 'Precision craft',
    desc: 'We obsess over details: every animation, every spacing decision, every API response time matters.',
    color: 'icon-bg-secondary',
  },
  {
    icon: Users,
    title: 'Human-centred design',
    desc: 'Technology is only powerful when it feels effortless. We design for the person in the room, not for the screen.',
    color: 'icon-bg-accent',
  },
  {
    icon: Zap,
    title: 'Built to scale',
    desc: 'From a solo trainer to a 1,000-person conference — our architecture grows with you from day one.',
    color: 'bg-purple-50 text-purple-600',
  },
]

export default function AboutPage() {
  return (
    <div className="py-24">
      <div className="section-container">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-24">
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary">Our story</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mt-3 mb-6">
            Built by <span className="gradient-text">QuantumStep</span>
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            QuantumStep is a modern web development studio that designs, builds, and scales
            AI-oriented digital products. We believe great software should feel like a natural
            extension of how you already think and work.
          </p>
        </div>

        {/* LiveZapp origin story */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold text-text-primary">
              Why we built <span className="gradient-text">LiveZapp</span>
            </h2>
            <p className="text-text-secondary leading-relaxed">
              We noticed a gap: the tools that make presentations interactive were either too
              complex, too expensive, or required hefty app downloads that killed momentum right
              before a session started.
            </p>
            <p className="text-text-secondary leading-relaxed">
              LiveZapp is our answer — a clean, fast, browser-native platform that lets anyone
              create a live quiz or poll in minutes and share it with a room of 10 or a stadium of
              1,000. No friction. No installs. Just engagement.
            </p>
            <Link href="/register" className="btn-primary inline-flex">
              Try it free today
            </Link>
          </div>
          <div className="glass-card p-10 space-y-6">
            {[
              { label: 'Founded', value: '2024' },
              { label: 'Products shipped', value: '3+' },
              { label: 'Countries represented', value: '12+' },
              { label: 'Based in', value: 'India 🇮🇳' },
            ].map(stat => (
              <div key={stat.label} className="flex justify-between items-center border-b border-white/40 pb-4 last:border-0 last:pb-0">
                <span className="text-sm text-text-secondary">{stat.label}</span>
                <span className="text-lg font-bold gradient-text">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-12">
            What we stand for
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(v => {
              const Icon = v.icon
              return (
                <div key={v.title} className="glass-card p-7">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${v.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-text-primary mb-2">{v.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{v.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-text-secondary mb-4">
            Want to collaborate or just say hello?
          </p>
          <Link href="/contact" className="btn-primary">
            Get in touch
          </Link>
        </div>
      </div>
    </div>
  )
}
