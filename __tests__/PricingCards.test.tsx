import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import PricingPreview from '@/components/home/PricingPreview'
import { PLANS } from '@/types/plans'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
    article: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => <article {...rest}>{children}</article>,
    blockquote: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => <blockquote {...rest}>{children}</blockquote>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('PricingPreview', () => {
  it('renders all four plan names', () => {
    render(<PricingPreview />)
    PLANS.forEach(plan => {
      expect(screen.getAllByText(plan.name).length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders exactly one "Most popular" badge', () => {
    render(<PricingPreview />)
    const badges = screen.getAllByText(/most popular/i)
    expect(badges).toHaveLength(1)
  })

  it('marks the Regular plan as recommended', () => {
    const recommendedPlan = PLANS.find(p => p.isRecommended)
    expect(recommendedPlan).toBeDefined()
    expect(recommendedPlan?.name).toBe('Regular')
  })

  it('renders the "View full comparison table" link', () => {
    render(<PricingPreview />)
    expect(screen.getByRole('link', { name: /view full comparison/i })).toBeInTheDocument()
  })

  it('each plan has a CTA button', () => {
    render(<PricingPreview />)
    // Free plan: "Get started free", paid plans: "Start Basic" / "Start Regular" / "Start Pro"
    const buttons = screen.getAllByRole('link', { name: /get started|start basic|start regular|start pro/i })
    expect(buttons.length).toBe(PLANS.length)
  })
})
