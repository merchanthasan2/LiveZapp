import type { Metadata } from 'next'
import HeroSection from '@/components/home/HeroSection'
import FeaturesSection from '@/components/home/FeaturesSection'
import HowItWorks from '@/components/home/HowItWorks'
import PricingPreview from '@/components/home/PricingPreview'
import QuantumStepSection from '@/components/home/QuantumStepSection'
import Testimonials from '@/components/home/Testimonials'

export const metadata: Metadata = {
  title: 'LiveZapp – Live Interactive Presentations & Audience Engagement',
  description:
    'Create real-time quizzes, live polls, and audience Q&A that participants join from any device. No downloads required. Start free today.',
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <div className="gradient-divider" />
      <FeaturesSection />
      <div className="gradient-divider" />
      <HowItWorks />
      <div className="gradient-divider" />
      <PricingPreview />
      <div className="gradient-divider" />
      <QuantumStepSection />
      <div className="gradient-divider" />
      <Testimonials />
    </>
  )
}
