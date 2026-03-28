import Link from 'next/link'
import Image from 'next/image'
import { Twitter, Linkedin, Github, Mail } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Home', href: '/' },
    { label: 'Plans', href: '/plans' },
    { label: 'How it works', href: '/#how-it-works' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Tools', href: '/#tools' },
    { label: 'Contact', href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
}

const socialLinks = [
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
  { icon: Github, label: 'GitHub', href: '#' },
  { icon: Mail, label: 'Email', href: '/contact' },
]

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative mt-24" aria-label="Site footer">
      {/* Top gradient divider */}
      <div className="gradient-divider" />

      <div style={{ background: 'rgba(0,18,30,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(247,127,0,0.10)' }}>
        <div className="section-container py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link href="/" className="inline-block mb-4" aria-label="LiveZapp home">
                <Image
                  src="/LiveZapp Logo w_text.png"
                  alt="LiveZapp"
                  width={180}
                  height={56}
                  className="h-14 w-auto object-contain"
                />
              </Link>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#4E6878' }}>
                Turn any session into a live, interactive experience. Real-time quizzes, polls, and
                Q&A that audiences join from any device.
              </p>
              <p className="text-xs mt-4" style={{ color: '#4E6878' }}>
                Part of the{' '}
                <a
                  href="https://quantumstep.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
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
                    className="w-9 h-9 rounded-xl glass-card flex items-center justify-center text-text-secondary hover:text-primary hover:shadow-glass transition-all duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#F77F00' }}>
                  {category}
                </h3>
                <ul className="space-y-2.5" role="list">
                  {links.map(link => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm transition-colors duration-200 hover:text-primary"
                        style={{ color: '#4E6878' }}
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
          <div className="gradient-divider mt-12 mb-6" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ color: '#334D5E' }}>
            <p>© {currentYear} QuantumStep. All rights reserved. LiveZapp is a QuantumStep product.</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
