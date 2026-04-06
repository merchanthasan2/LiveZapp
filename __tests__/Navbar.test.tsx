import { render, screen, fireEvent } from '@testing-library/react'
import Navbar from '@/components/Navbar'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: () => '/plans',
}))

jest.mock('@/lib/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    isAdmin: false,
    isSuperAdmin: false,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}))

describe('Navbar', () => {
  it('renders the LiveZapp brand link', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /livezapp home/i })).toBeInTheDocument()
    expect(screen.getAllByText(/livezapp/i).length).toBeGreaterThanOrEqual(1)
  })

  it('renders all desktop navigation links', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /plans/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /how it works/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument()
  })

  it('renders Login and Get started action buttons', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument()
  })

  it('shows hamburger button on mobile (aria-label)', () => {
    render(<Navbar />)
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument()
  })

  it('opens and closes mobile menu on hamburger click', () => {
    render(<Navbar />)
    const burger = screen.getByRole('button', { name: /open menu/i })
    fireEvent.click(burger)
    expect(screen.getAllByRole('button', { name: /close menu/i }).length).toBeGreaterThanOrEqual(1)
    expect(document.getElementById('mobile-menu')).toBeInTheDocument()
  })
})
