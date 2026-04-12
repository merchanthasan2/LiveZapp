'use client'

import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PageViewTracker from '@/components/PageViewTracker'

function shouldUseMarketingChrome(pathname: string) {
  if (pathname === '/') return false
  if (pathname === '/login' || pathname === '/register' || pathname === '/checkout') return false
  if (pathname.startsWith('/join')) return false
  if (pathname.startsWith('/app')) return false
  if (pathname.startsWith('/admin')) return false
  return true
}

export default function RouteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const useMarketingChrome = shouldUseMarketingChrome(pathname)

  return (
    <>
      <PageViewTracker />
      {useMarketingChrome ? <Navbar /> : null}
      <main className={useMarketingChrome ? 'pt-20' : ''}>{children}</main>
      {useMarketingChrome ? <Footer /> : null}
    </>
  )
}
