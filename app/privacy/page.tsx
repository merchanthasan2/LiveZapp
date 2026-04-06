import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How LiveZapp and QuantumStep collect, use, and protect your information when you use our interactive presentation platform.',
}

const lastUpdated = 'April 7, 2026'

export default function PrivacyPage() {
  return (
    <div className="py-24">
      <div className="section-container max-w-3xl">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary">Legal</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mt-3 mb-4">Privacy Policy</h1>
          <p className="text-sm text-text-secondary">Last updated: {lastUpdated}</p>
        </div>

        <div className="space-y-10 text-text-secondary leading-relaxed">
          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">1. Who we are</h2>
            <p>
              LiveZapp is operated by{' '}
              <a
                href="https://quantumstep.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                QuantumStep
              </a>
              . This policy explains how we handle personal data when you use our website and services.
            </p>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">2. What we collect</h2>
            <p>Depending on how you use LiveZapp, we may process:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-text-primary">Account data</strong> — name, email address, and profile details you
                provide when you register or sign in (including via third-party identity providers where enabled).
              </li>
              <li>
                <strong className="text-text-primary">Content you create</strong> — presentations, questions, branding
                assets, and related metadata stored to provide the service.
              </li>
              <li>
                <strong className="text-text-primary">Usage and technical data</strong> — approximate location derived
                from IP for analytics, device/browser type, and pages viewed, where our product analytics are enabled.
              </li>
              <li>
                <strong className="text-text-primary">Support messages</strong> — information you send through contact
                forms or email.
              </li>
            </ul>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">3. How we use data</h2>
            <p>We use personal data to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, secure, and improve LiveZapp (including real-time sessions and billing where applicable).</li>
              <li>Authenticate users and enforce plan limits and admin access.</li>
              <li>Respond to support requests and legal obligations.</li>
              <li>Analyze aggregated usage to improve the product (not to sell personal data).</li>
            </ul>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">4. Service providers</h2>
            <p>
              We use trusted infrastructure providers (for example, Firebase / Google Cloud for authentication and
              database storage, and payment processors such as PayPal when you purchase a plan). Their processing is
              governed by their terms and, where applicable, standard contractual clauses. We only share what is
              needed to run the service.
            </p>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">5. Retention</h2>
            <p>
              We keep data for as long as your account is active or as needed to provide the service, comply with law,
              resolve disputes, and enforce our agreements. You may request deletion of your account subject to
              legitimate retention requirements.
            </p>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">6. Your rights</h2>
            <p>
              Depending on your region, you may have rights to access, correct, delete, or export your personal data, or
              to object to certain processing. Contact us at{' '}
              <a href="mailto:hello@quantumstep.in" className="text-primary font-semibold hover:underline">
                hello@quantumstep.in
              </a>{' '}
              and we will respond within a reasonable time.
            </p>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">7. Cookies</h2>
            <p>
              We use cookies and similar technologies as needed for authentication, preferences, and security. You can
              control cookies through your browser settings; disabling some cookies may limit functionality.
            </p>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">8. Changes</h2>
            <p>
              We may update this policy from time to time. We will post the revised date at the top of this page.
              Continued use of LiveZapp after changes indicates acceptance of the updated policy.
            </p>
          </section>

          <p className="text-center pt-4">
            <Link href="/contact" className="btn-primary inline-flex">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
