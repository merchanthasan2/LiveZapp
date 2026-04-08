'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Send, CheckCircle2, MapPin, Mail, Clock } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
})

type FormValues = z.infer<typeof schema>

const contactInfo = [
  { icon: Mail, label: 'Email', value: 'hello@live-zapp.com' },
  { icon: MapPin, label: 'Location', value: 'India 🇮🇳' },
  { icon: Clock, label: 'Response time', value: 'Within 24–48 hours' },
]

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(json?.error || 'Failed to send message.')
      }
      setSubmitted(true)
    } catch (e: any) {
      setError(e?.message || 'Failed to send message.')
    }
  }

  return (
    <div className="py-24">
      <div className="section-container">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary">Say hello</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mt-3 mb-5">
            Get in <span className="gradient-text">touch</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-lg mx-auto">
            Have a question about LiveZapp, want to collaborate with QuantumStep, or need a custom
            enterprise plan? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 max-w-5xl mx-auto">
          {/* Info column */}
          <div className="space-y-6">
            {contactInfo.map(({ icon: Icon, label, value }) => (
              <div key={label} className="glass-card p-6 flex items-start gap-4">
                <div className="icon-bg-primary w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-text-primary">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="lg:col-span-2 glass-card p-8">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-secondary" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">Message sent!</h2>
                <p className="text-text-secondary text-sm max-w-xs">
                  Thanks for reaching out. We'll get back to you within 24–48 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="btn-ghost text-sm mt-4"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                {error && (
                  <div className="p-4 rounded-xl border border-red-300 bg-red-50/50 text-red-700">
                    <p className="text-sm font-semibold">Could not send your message</p>
                    <p className="text-xs mt-1">{error}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-text-primary mb-1.5">
                      Name <span className="text-primary">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Your name"
                      {...register('name')}
                      className={`w-full px-4 py-3 rounded-2xl bg-white/70 border text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/60 ${
                        errors.name ? 'border-red-300 bg-red-50/50' : 'border-white/60'
                      }`}
                    />
                    {errors.name && (
                      <p className="mt-1.5 text-xs text-red-500" role="alert">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-text-primary mb-1.5">
                      Email <span className="text-primary">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...register('email')}
                      className={`w-full px-4 py-3 rounded-2xl bg-white/70 border text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/60 ${
                        errors.email ? 'border-red-300 bg-red-50/50' : 'border-white/60'
                      }`}
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-red-500" role="alert">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-text-primary mb-1.5">
                    Message <span className="text-primary">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    placeholder="Tell us about your project, question, or feedback..."
                    {...register('message')}
                    className={`w-full px-4 py-3 rounded-2xl bg-white/70 border text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/60 resize-none ${
                      errors.message ? 'border-red-300 bg-red-50/50' : 'border-white/60'
                    }`}
                  />
                  {errors.message && (
                    <p className="mt-1.5 text-xs text-red-500" role="alert">{errors.message.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
