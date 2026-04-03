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

  // Redirect authenticated users only if coming from login/register
  useEffect(() => {
    if (isLoading) return // Wait for auth to load
    if (user && typeof window !== 'undefined') {
      // Check if user came directly from login/register page
      const fromAuth = document.referrer.includes('/login') || document.referrer.includes('/register')
      if (fromAuth) {
        // Redirect to appropriate dashboard based on role
        router.replace(isAdmin ? '/admin' : '/app/dashboard')
      }
      // Otherwise allow viewing home page if intentionally navigated here
    }
  }, [user, isAdmin, isLoading, router])

  // Show loading state while auth loads
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000814' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(255,195,0,0.15)', borderTopColor: '#ffc300' }} />
      </div>
    )
  }

  // Show home page (both authenticated and unauthenticated users)
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
