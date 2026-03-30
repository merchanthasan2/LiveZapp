'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import HeroSection from '@/components/home/HeroSection'
import FeaturesSection from '@/components/home/FeaturesSection'
import HowItWorks from '@/components/home/HowItWorks'
import PricingPreview from '@/components/home/PricingPreview'
import QuantumStepSection from '@/components/home/QuantumStepSection'
import Testimonials from '@/components/home/Testimonials'

export default function HomePage() {
  const router = useRouter()
  const { user, isAdmin, isLoading } = useAuth()

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (isLoading) return // Wait for auth to load
    if (user) {
      // Redirect to appropriate dashboard based on role
      router.replace(isAdmin ? '/admin' : '/app/dashboard')
    }
  }, [user, isAdmin, isLoading, router])

  // Show loading state or home page
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(0,166,166,0.20)', borderTopColor: '#00A6A6' }} />
      </div>
    )
  }

  // If user is authenticated, show nothing (will redirect)
  if (user) {
    return null
  }

  // Not authenticated - show home page
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
