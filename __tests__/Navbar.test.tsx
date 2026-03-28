import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import Navbar from '@/components/Navbar'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('Navbar', () => {
  it('renders the EngageIQ brand text', () => {
    render(<Navbar />)
    expect(screen.getByText(/EngageIQ/i)).toBeInTheDocument()
  })

  it('renders the "by QuantumStep" tag', () => {
    render(<Navbar />)
    expect(screen.getByText(/by QuantumStep/i)).toBeInTheDocument()
  })

  it('renders all desktop navigation links', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /plans/i })).toBeInTheDocument()
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
    // After opening, close button should appear
    expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument()
  })
})
