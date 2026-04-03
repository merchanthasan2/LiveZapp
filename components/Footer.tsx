import Link from 'next/link'
import { Twitter, Linkedin, Github, Mail, Zap } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Home',         href: '/' },
    { label: 'Plans',        href: '/plans' },
    { label: 'How it works', href: '/#how-it-works' },
  ],
  Company: [
    { label: 'About',   href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy Policy',  href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
}

const socialLinks = [
  { icon: Twitter,  label: 'Twitter',  href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
  { icon: Github,   label: 'GitHub',   href: '#' },
  { icon: Mail,     label: 'Email',    href: '/contact' },
]

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer
      className="relative mt-24"
      aria-label="Site footer"
      style={{ background: '#001d3d', borderTop: '1px solid rgba(255,195,0,0.10)' }}
    >
      <div className="section-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5" aria-label="LiveZapp home">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #ffc300, #ffd60a)', boxShadow: '0 2px 10px rgba(255,195,0,0.35)' }}
              >
                <Zap className="w-5 h-5" style={{ color: '#000814' }} />
              </div>
              <span className="text-xl font-black" style={{ color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                Live<span style={{ color: '#ffc300' }}>Zapp</span>
              </span>
            </Link>

            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Turn any session into a live, interactive experience. Real-time quizzes, polls, and
              Q&amp;A that audiences join from any device.
            </p>
            <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.30)' }}>
              Part of the{' '}
              <a
                href="https://quantumstep.in"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-yellow"
                style={{ color: 'rgba(255,195,0,0.60)' }}
              >
                QuantumStep
              </a>{' '}
              family of modern AI-oriented web products.
            </p>

            {/* Social */}
            <div className="flex items-center gap-3 mt-6" aria-label="Social media links">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,195,0,0.15)'; e.currentTarget.style.color = '#ffc300'; e.currentTarget.style.borderColor = 'rgba(255,195,0,0.30)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                >
                  <Icon className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: '#ffc300' }}>
                {category}
              </h3>
              <ul className="space-y-2.5" role="list">
                {links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors duration-200"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.28)' }}>
          <p>© {currentYear} QuantumStep. All rights reserved. LiveZapp is a QuantumStep product.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.28)' }}>Privacy</Link>
            <Link href="/terms"   className="transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.28)' }}>Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
