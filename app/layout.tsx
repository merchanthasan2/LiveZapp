import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: {
    default: 'LiveZapp – Live Interactive Presentations',
    template: '%s | LiveZapp',
  },
  description:
    'Turn any session into a live, interactive experience. Create real-time quizzes, polls, and audience Q&A that participants join from any device.',
  keywords: ['interactive presentations', 'live polls', 'audience engagement', 'quizzes', 'LiveZapp', 'QuantumStep'],
  authors: [{ name: 'QuantumStep', url: 'https://quantumstep.in' }],
  creator: 'QuantumStep',
  metadataBase: new URL('https://live-zapp.com'),
  openGraph: {
    title: 'LiveZapp – Live Interactive Presentations',
    description: 'Create real-time quizzes, polls, and audience Q&A. Built by QuantumStep.',
    url: 'https://live-zapp.com',
    siteName: 'LiveZapp',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LiveZapp – Live Interactive Presentations',
    description: 'Create real-time quizzes, polls, and audience Q&A. Built by QuantumStep.',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/LiveZapp Logo only.png',
    shortcut: '/LiveZapp Logo only.png',
    apple: '/LiveZapp Logo only.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          <Navbar />
          <main className="pt-20">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
