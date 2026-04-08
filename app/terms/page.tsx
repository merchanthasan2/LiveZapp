import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms and conditions for using LiveZapp interactive presentations, quizzes, and live audience features.',
}

const lastUpdated = 'April 7, 2026'

export default function TermsPage() {
  return (
    <div className="py-24">
      <div className="section-container max-w-3xl">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary">Legal</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mt-3 mb-4">Terms of Service</h1>
          <p className="text-sm text-text-secondary">Last updated: {lastUpdated}</p>
        </div>

        <div className="space-y-10 text-text-secondary leading-relaxed">
          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">1. Agreement</h2>
            <p>
              By accessing or using LiveZapp (the &quot;Service&quot;), operated by QuantumStep (&quot;we&quot;,
              &quot;us&quot;), you agree to these Terms. If you do not agree, do not use the Service.
            </p>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">2. The Service</h2>
            <p>
              LiveZapp provides tools to create and run interactive presentations, including live polls, quizzes, and
              audience participation. We may change, suspend, or discontinue features with reasonable notice where
              practicable.
            </p>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">3. Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and for activity under
              your account. You must provide accurate registration information. We may suspend or terminate accounts
              that violate these Terms or harm the Service or other users.
            </p>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for unlawful, harmful, or abusive purposes.</li>
              <li>Attempt to gain unauthorized access to systems, data, or other users&apos; accounts.</li>
              <li>Overload or disrupt the Service (including automated scraping or denial-of-service attacks).</li>
              <li>Upload content that infringes intellectual property or privacy rights of others.</li>
            </ul>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">5. Content</h2>
            <p>
              You retain ownership of content you create. You grant us a limited license to host, process, and display
              that content solely to operate the Service. You represent that you have the rights to any content you
              upload.
            </p>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">6. Plans and payment</h2>
            <p>
              Paid plans are billed according to the pricing shown at checkout (for example via PayPal). Fees are
              non-refundable except where required by law or explicitly stated at purchase. Failure to pay may result in
              downgrade or loss of access to paid features.
            </p>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">7. Disclaimers</h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of any kind, express or implied. We do not
              guarantee uninterrupted or error-free operation. To the maximum extent permitted by law, we disclaim
              liability for indirect, incidental, or consequential damages arising from your use of the Service.
            </p>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">8. Limitation of liability</h2>
            <p>
              Our total liability for any claim arising from these Terms or the Service is limited to the greater of
              (a) amounts you paid us in the twelve months before the claim, or (b) one hundred dollars (USD), except
              where liability cannot be limited by applicable law.
            </p>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">9. Governing law</h2>
            <p>
              These Terms are governed by the laws applicable to QuantumStep&apos;s place of business, without regard to
              conflict-of-law rules. Courts in that jurisdiction have exclusive venue, subject to mandatory consumer
              protections in your country of residence where they apply.
            </p>
          </section>

          <section className="glass-card p-8 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold text-text-primary">10. Contact</h2>
            <p>
              Questions about these Terms:{' '}
              <a href="mailto:hello@live-zapp.com" className="text-primary font-semibold hover:underline">
                hello@live-zapp.com
              </a>
              . See also our{' '}
              <Link href="/privacy" className="text-primary font-semibold hover:underline">
                Privacy Policy
              </Link>
              .
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
