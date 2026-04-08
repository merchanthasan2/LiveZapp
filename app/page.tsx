'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  BarChart2,
  Bolt,
  CheckCircle2,
  Code2,
  Cpu,
  Globe,
  Globe2,
  Layers,
  LocateFixed,
  Mail,
  PenSquare,
  Play,
  Quote,
  Share2,
  Smartphone,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useCurrency } from '@/lib/hooks/useCurrency'
import { PLANS } from '@/types/plans'
import { TESTIMONIALS } from '@/lib/data/mockData'
import BrandLockup from '@/components/BrandLockup'

function TopNav() {
  const [activeSection, setActiveSection] = useState<'features' | 'pricing' | 'contact'>('features')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const updateActiveSection = () => {
      const scrollAnchor = window.scrollY + 140
      const sections: Array<'features' | 'pricing' | 'contact'> = ['features', 'pricing', 'contact']
      let nextActive: 'features' | 'pricing' | 'contact' = 'features'

      sections.forEach(sectionId => {
        const section = document.getElementById(sectionId)
        if (section && scrollAnchor >= section.offsetTop) {
          nextActive = sectionId
        }
      })

      setActiveSection(nextActive)
    }

    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    return () => window.removeEventListener('scroll', updateActiveSection)
  }, [])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  const navLinkStyle = (section: 'features' | 'pricing' | 'contact') => ({
    color: activeSection === section ? '#650cd9' : '#4a4455',
    borderColor: activeSection === section ? '#650cd9' : 'transparent',
  })

  const mobileNavLinks: Array<{ id: 'features' | 'pricing' | 'contact'; label: string }> = [
    { id: 'features', label: 'Features' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'contact', label: 'Help' },
  ]

  return (
    <nav
      className="fixed top-0 z-50 w-full border-b"
      style={{
        background: 'rgba(252, 249, 248, 0.86)',
        borderColor: 'rgba(123, 116, 135, 0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <div className="sm:hidden">
            <BrandLockup href="/" size="sm" theme="light" />
          </div>
          <div className="hidden sm:block">
            <BrandLockup href="/" size="md" theme="light" />
          </div>
        </div>

        <div className="hidden items-center space-x-8 md:flex">
          <a
            href="#features"
            className="border-b-2 pb-1 font-bold transition-colors"
            style={navLinkStyle('features')}
            onClick={() => setActiveSection('features')}
          >
            Features
          </a>
          <a
            href="#pricing"
            className="border-b-2 pb-1 font-bold transition-colors"
            style={navLinkStyle('pricing')}
            onClick={() => setActiveSection('pricing')}
          >
            Pricing
          </a>
          <a
            href="#contact"
            className="border-b-2 pb-1 font-bold transition-colors"
            style={navLinkStyle('contact')}
            onClick={() => setActiveSection('contact')}
          >
            Help
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(v => !v)}
            className="touch-target inline-flex items-center justify-center rounded-xl p-2 md:hidden"
            style={{ color: '#4a4455' }}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
            )}
          </button>
          <Link href="/login" className="touch-target inline-flex items-center whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold leading-none transition-all sm:px-4 sm:text-sm" style={{ color: '#4a4455' }}>
            Log In
          </Link>
          <Link href="/join" className="touch-target inline-flex items-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold text-white shadow-md transition-all sm:px-6" style={{ background: '#650cd9' }}>
            Join Now
          </Link>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="md:hidden border-t"
          style={{ background: 'rgba(252, 249, 248, 0.98)', borderColor: 'rgba(123, 116, 135, 0.12)' }}
        >
          <div className="flex flex-col px-6 py-4 space-y-1">
            {mobileNavLinks.map(link => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center rounded-xl px-4 py-3 text-base font-bold transition-colors"
                style={{
                  color: activeSection === link.id ? '#650cd9' : '#4a4455',
                  background: activeSection === link.id ? 'rgba(101,12,217,0.08)' : 'transparent',
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}

function HeroSection() {
  const [code, setCode] = useState('')

  function handleJoin() {
    if (!code.trim()) return
    window.location.href = `/join/${encodeURIComponent(code.trim().toUpperCase())}`
  }

  return (
    <section className="relative mx-auto max-w-7xl px-6 pb-12">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div
            className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold"
            style={{ background: '#6df5e1', color: '#006f64' }}
          >
            <Bolt className="mr-2 h-4 w-4" />
            New: Live Word Clouds 2.0 Released
          </div>

          <h1 className="text-[2.75rem] font-bold leading-[1.06] tracking-tight md:text-5xl lg:text-[4.25rem] lg:font-extrabold" style={{ color: '#1c1b1b' }}>
            Turn every session into a <span style={{ color: '#650cd9', fontStyle: 'italic' }}>live, interactive</span> experience
          </h1>

          <p className="max-w-xl text-[1.1rem] leading-relaxed" style={{ color: '#4a4455' }}>
            Build multi-question sessions in minutes. Audiences join from any phone or laptop and you see live responses instantly.
          </p>

          <div
            className="max-w-md rounded-3xl p-1 shadow-2xl"
            style={{ background: 'linear-gradient(90deg, #650cd9 0%, #006b5f 100%)' }}
          >
            <div className="flex flex-col space-y-3 rounded-[calc(1.5rem-4px)] bg-white p-5">
              <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#4a4455' }}>
                Enter Zapp Code
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
                  placeholder="000 000"
                  className="flex-1 rounded-xl border-none py-3.5 text-center text-2xl font-bold tracking-[0.4em] outline-none"
                  style={{ background: '#f0edec', color: '#1c1b1b' }}
                />
                <button
                  type="button"
                  onClick={handleJoin}
                  className="flex items-center gap-2 justify-center rounded-xl px-5 min-w-[110px] text-white transition-opacity hover:opacity-90"
                  style={{ background: '#650cd9' }}
                  aria-label="Join session with code"
                >
                  <Play className="h-5 w-5" />
                  <span className="text-sm font-semibold">Join</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative h-[430px] lg:col-span-5">
          <div className="absolute right-0 top-0 z-20 h-72 w-60 rotate-6 overflow-hidden rounded-3xl shadow-2xl transition-transform duration-500 hover:rotate-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDT4acpSKC42xqWcErY_UIdpA90l3Zotz_J0efdPF7T1hCMxLPcg_1eo4vyubHTMLpmEaFkvSBraXAevosfwidX-2ainIhSk-aM18dabQz11hvkoUpus-06aOrQkTLiIiNUnXYUt5pdNLYtIPFdnVzymIU4MtuAvXz8dPKBskR0QCTz0G9zv9QIvBXa4diRvzGky6jk1jDdUaxZaGIVI8CLa420FVJeuL90WLoxOcp079_t8Y57DqjPjDHdWfoiJLVwWVuQCcKG9QCZ"
              alt="Students using a smartphone"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute left-0 top-16 z-10 h-80 w-64 -rotate-12 overflow-hidden rounded-3xl shadow-xl transition-transform duration-500 hover:rotate-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA592lS2Iwe30qFbcYVVZCbqQpfxHnrHmnsDY4HM7eN3e970ZLYaRXTEwgK5xEI_9dRW8XRAj0xo73ZSHJZCbVMB-0JhH57TkQxGfNVAD1Ph8a66PBgIk_9yhZ0oiFByVHSfprdjCsOk7XDHsgYqEt3kl6U8Q3hQ_fueLeFM1MSyud6KZyuKPY7KnWoxXLqS36OYsj3l6ParHPh48Mf9ehQYh4G6emw1h2b9ilh5XCD1bQP1yN8zbA0AeaS0NwbcHC7EaQAbaXeRn5f"
              alt="Team around a tablet"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-4 right-10 z-30 h-56 w-44 rotate-3 overflow-hidden rounded-3xl shadow-lg transition-transform duration-500 hover:rotate-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBw3tNajdmvHTjcX3a5a8rkUId-Bu_4imNCBeeFypBeCaRyAiVm9oCGUyu3t4DVVi6Fg7oNsO-3eimQfsyAlPJPhSZvuWVuurh1Vr4MICU0gbRS-qJMHoq-AxtrhV3UiwKWLKfAEQL7N9ps1R1m16Us9e_OQZvrEqmE4A7u_HqqGUIohO8zYdRp12d-CbwrBQ9JpzaUmI4NtQ9DtVz-dU6VPFsefhOmM6f22YyCCitywT2V5yGAalTMSFdCyI3psvlEY44zho1-WhY5"
              alt="Participant at a live event"
              className="h-full w-full object-cover"
            />
          </div>
          <div
            className="absolute left-1/2 top-1/2 -z-10 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: 'rgba(101,12,217,0.08)' }}
          />
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  const features = [
    {
      title: 'Multi-question presentations',
      text: 'Build complete interactive decks with quizzes, polls, word clouds, and open Q&A - all in one place.',
      icon: Layers,
      color: '#650cd9',
    },
    {
      title: 'Mobile-first participation',
      text: 'Audience members join from any phone or laptop via a code or link. No downloads, no friction.',
      icon: Smartphone,
      color: '#006b5f',
    },
    {
      title: 'Real-time results & leaderboards',
      text: 'Watch responses roll in live. Animate leaderboards after quizzes to celebrate top scorers.',
      icon: BarChart2,
      color: '#912f03',
    },
    {
      title: 'Scales from classrooms to conferences',
      text: "Whether it's 10 students or 1,000 delegates, LiveZapp handles the audience and you handle the content.",
      icon: Globe2,
      color: '#650cd9',
    },
  ]

  return (
    <section id="features" className="scroll-mt-28 bg-[#f6f3f2] px-6 py-16 md:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="mb-3 text-3xl font-bold md:text-4xl md:font-extrabold" style={{ color: '#1c1b1b' }}>
            Everything you need to captivate any audience
          </h2>
          <p className="text-base" style={{ color: '#4a4455' }}>
            From single polls to full interactive presentations, LiveZapp gives you the tools to make every session memorable.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map(feature => (
            <article key={feature.title} className="group rounded-3xl bg-white p-7 shadow-sm transition-shadow hover:shadow-xl">
              <div
                className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                style={{ background: `${feature.color}1A`, color: feature.color }}
              >
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="mb-3 text-[1.75rem] font-semibold leading-[1.08] md:text-[1.9rem] md:font-bold" style={{ color: '#1c1b1b' }}>
                {feature.title}
              </h3>
              <p className="text-[1rem] leading-relaxed" style={{ color: '#4a4455' }}>
                {feature.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      icon: PenSquare,
      title: 'Create',
      text: 'Build your interactive presentation. Add quizzes, polls, and word cloud slides in minutes.',
    },
    {
      number: '02',
      icon: Share2,
      title: 'Share',
      text: 'Participants join via a session code or shareable link on any device, no sign-up needed.',
    },
    {
      number: '03',
      icon: TrendingUp,
      title: 'Engage',
      text: 'Watch responses appear in real time. Reveal results, animate leaderboards, and spark conversation.',
    },
  ]

  return (
    <section id="how-it-works" className="bg-[#fcf9f8] px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl md:font-extrabold" style={{ color: '#1c1b1b' }}>
            Up and running in three steps
          </h2>
          <p className="text-lg" style={{ color: '#4a4455' }}>
            No training required. Most hosts launch their first live session within ten minutes.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map(step => (
            <article key={step.number} className="rounded-3xl bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'rgba(101,12,217,0.12)', color: '#650cd9' }}>
                <step.icon className="h-5 w-5" />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: '#650cd9' }}>
                Step {step.number}
              </p>
              <h3 className="mb-3 text-2xl font-semibold md:font-bold" style={{ color: '#1c1b1b' }}>{step.title}</h3>
              <p style={{ color: '#4a4455' }}>{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  const { currency, formatAmount, getPlanPrice } = useCurrency()

  return (
    <section id="pricing" className="scroll-mt-28 bg-[#fcf9f8] px-6 py-20 md:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold md:text-4xl md:font-extrabold" style={{ color: '#1c1b1b' }}>
            Precision Pricing
          </h2>
          <p className="mt-4" style={{ color: '#4a4455' }}>
            Transparent plans for solo educators to enterprise conductors.
          </p>
          {currency !== 'USD' && (
            <p className="mt-3 text-xs" style={{ color: '#8b8498' }}>
              Prices shown in {currency} from the same admin pricing catalogue used across the app.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map(plan => {
            const monthlyPrice = getPlanPrice(plan.id, 'monthly', plan.pricePerMonth, plan.pricePerYear)
            return (
            <div
              key={plan.id}
              className={`relative flex h-full flex-col rounded-3xl border p-8 ${plan.isRecommended ? 'shadow-2xl' : ''}`}
              style={{ background: '#ffffff', borderColor: plan.isRecommended ? 'rgba(101,12,217,0.30)' : 'rgba(123,116,135,0.12)' }}
            >
              {plan.isRecommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest text-white" style={{ background: '#912f03' }}>
                  Most Popular
                </div>
              )}
              <span className="text-sm font-bold uppercase tracking-widest" style={{ color: '#4a4455' }}>{plan.name}</span>
              <p className="mt-1 text-xs" style={{ color: '#4a4455' }}>{plan.tagline}</p>
              <div className="my-6">
                <span className="text-5xl font-extrabold" style={{ color: '#1c1b1b' }}>{formatAmount(monthlyPrice)}</span>
                <span style={{ color: '#4a4455' }}>/mo</span>
              </div>
              <ul className="mb-8 flex-grow space-y-3" style={{ color: '#4a4455' }}>
                <li className="flex items-center"><CheckCircle2 className="mr-3 h-4 w-4" style={{ color: '#650cd9' }} />{plan.limits.maxParticipantsPerSession.toLocaleString()} max participants</li>
                <li className="flex items-center"><CheckCircle2 className="mr-3 h-4 w-4" style={{ color: '#650cd9' }} />{plan.limits.maxQuestionsPerPresentation} questions per session</li>
                <li className="flex items-center"><CheckCircle2 className="mr-3 h-4 w-4" style={{ color: '#650cd9' }} />{plan.features.canUseBranding ? 'Branding included' : 'No branding'}</li>
                <li className="flex items-center"><CheckCircle2 className="mr-3 h-4 w-4" style={{ color: '#650cd9' }} />{plan.features.canExportResults ? 'Result exports' : 'No result export'}</li>
              </ul>
              <Link
                href={plan.id === 'free' ? '/register' : '/plans'}
                className="w-full rounded-full py-4 text-center font-bold"
                style={plan.isRecommended ? { background: '#650cd9', color: '#ffffff' } : { color: '#650cd9', border: '2px solid rgba(101,12,217,0.22)' }}
              >
                {plan.id === 'free' ? 'Start Free' : `Choose ${plan.name}`}
              </Link>
            </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  return (
    <section className="bg-[#f6f3f2] px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold md:text-4xl md:font-extrabold" style={{ color: '#1c1b1b' }}>
            What our users are saying
          </h2>
        </div>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {TESTIMONIALS.map(t => (
            <blockquote key={t.id} className="rounded-3xl bg-white p-8 shadow-sm">
              <Quote className="mb-4 h-8 w-8" style={{ color: 'rgba(101,12,217,0.28)' }} />
              <p className="mb-5 text-sm leading-relaxed" style={{ color: '#1c1b1b' }}>
                "{t.quote}"
              </p>
              <footer>
                <p className="text-sm font-bold" style={{ color: '#1c1b1b' }}>{t.author}</p>
                <p className="text-xs" style={{ color: '#4a4455' }}>{t.role} · {t.company}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}

function QuantumStepSection() {
  const tools = [
    { icon: Cpu, name: 'LiveZapp', desc: 'Live audience engagement & interactive presentations', href: '/' },
    { icon: Globe, name: 'QuantumSites', desc: 'AI-designed, high-performance marketing websites', href: 'https://quantumstep.in' },
    { icon: Code2, name: 'DevForge', desc: 'Custom web app development & API integration', href: 'https://quantumstep.in' },
  ]

  return (
    <section id="tools" className="bg-[#fcf9f8] px-6 py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 lg:grid-cols-2">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold" style={{ background: 'rgba(101,12,217,0.10)', color: '#650cd9' }}>
            <Sparkles className="h-3.5 w-3.5" />
            Built by QuantumStep
          </p>
          <h2 className="mb-4 text-3xl font-bold md:text-4xl md:font-extrabold" style={{ color: '#1c1b1b' }}>
            Modern products built for the AI era
          </h2>
          <p className="text-lg" style={{ color: '#4a4455' }}>
            QuantumStep is a modern web development studio specialising in AI-oriented apps, precision-crafted websites,
            and scalable digital tools. LiveZapp is one of a growing suite of products designed to make complex technology feel effortless.
          </p>
        </div>
        <div className="space-y-4">
          {tools.map(tool => (
            <a
              key={tool.name}
              href={tool.href}
              className="flex items-center gap-4 rounded-2xl border bg-white p-5 transition-all hover:shadow-md"
              style={{ borderColor: 'rgba(123,116,135,0.14)' }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: 'rgba(101,12,217,0.10)', color: '#650cd9' }}>
                <tool.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: '#1c1b1b' }}>{tool.name}</p>
                <p className="text-xs" style={{ color: '#4a4455' }}>{tool.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4" style={{ color: '#650cd9' }} />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-28 overflow-hidden bg-[#f6f3f2] px-6 py-20 md:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-start gap-20 lg:grid-cols-2">
          <div className="space-y-10">
            <div>
              <h2 className="mb-6 text-3xl font-bold md:text-4xl md:font-extrabold" style={{ color: '#1c1b1b' }}>
                Need a Conductor&apos;s Hand?
              </h2>
              <p className="text-lg" style={{ color: '#4a4455' }}>
                Whether it&apos;s a technical query or a demo request, our team is standing by to help you orchestrate your next big event.
              </p>
            </div>

            <div className="space-y-6">
              <div className="group flex items-center gap-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl transition-colors" style={{ background: '#e5e2e1', color: '#650cd9' }}>
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest" style={{ color: '#4a4455' }}>Email Us</p>
                  <p className="text-lg font-semibold" style={{ color: '#1c1b1b' }}>hello@live-zapp.com</p>
                </div>
              </div>

              <div className="group flex items-center gap-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl transition-colors" style={{ background: '#e5e2e1', color: '#650cd9' }}>
                  <LocateFixed className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest" style={{ color: '#4a4455' }}>Headquarters</p>
                  <p className="text-lg font-semibold" style={{ color: '#1c1b1b' }}>Mumbai, India</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Link
                href="/contact"
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all"
                style={{ background: '#e5e2e1', color: '#4a4455' }}
              >
                <Mail className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-10 shadow-xl text-center">
            <h3 className="text-2xl font-bold mb-3" style={{ color: '#1c1b1b' }}>Get in Touch</h3>
            <p className="text-base mb-8" style={{ color: '#4a4455' }}>
              Have a question, want a demo, or need support? Our team is ready to help.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-4 font-bold text-white transition-shadow hover:shadow-lg"
              style={{ background: '#650cd9' }}
            >
              <Mail className="h-5 w-5" />
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function HomeFooter() {
  return (
    <footer className="border-t px-6 py-12 text-center" style={{ background: '#ebe7e7', borderColor: 'rgba(123,116,135,0.18)', color: '#4a4455' }}>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
        <BrandLockup href="/" size="sm" theme="light" />
        <p className="text-sm">© 2026 LiveZapp Inc. All rights reserved. The kinetic conductor of interactions.</p>
        <div className="flex gap-8 text-sm font-semibold">
          <Link href="/terms" className="hover:opacity-80">Terms</Link>
          <Link href="/privacy" className="hover:opacity-80">Privacy</Link>
          <Link href="/contact" className="hover:opacity-80">Contact</Link>
        </div>
      </div>
    </footer>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (user) {
      router.replace('/app/dashboard')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#fcf9f8' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-4" style={{ borderColor: 'rgba(101,12,217,0.15)', borderTopColor: '#650cd9' }} />
      </div>
    )
  }

  return (
    <div style={{ background: '#fcf9f8', color: '#1c1b1b' }}>
      <TopNav />
      <main className="overflow-x-hidden pt-28 md:pt-32">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <QuantumStepSection />
        <ContactSection />
      </main>
      <HomeFooter />
    </div>
  )
}
