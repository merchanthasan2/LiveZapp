'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react'
import { usePathname } from 'next/navigation'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
})

function resolveThemeContext(pathname: string) {
  const immersive = pathname.startsWith('/admin') || pathname.startsWith('/app/present/')
  return {
    defaultTheme: immersive ? 'dark' as Theme : 'light' as Theme,
    storageKey: immersive ? 'lz-theme-immersive' : 'lz-theme-standard',
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/'
  const { defaultTheme, storageKey } = useMemo(() => resolveThemeContext(pathname), [pathname])
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const saved = localStorage.getItem(storageKey) as Theme | null
    const resolved = saved ?? defaultTheme
    setTheme(resolved)
  }, [defaultTheme, mounted, storageKey])

  useEffect(() => {
    if (!mounted) return
    const html = document.documentElement
    html.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(storageKey, theme)
  }, [theme, mounted, storageKey])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
