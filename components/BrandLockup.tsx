'use client'

import Link from 'next/link'
import Image from 'next/image'

type BrandSize = 'sm' | 'md' | 'lg'
type BrandTheme = 'light' | 'dark'
type BrandVariant = 'lockup' | 'wordmark' | 'icon'

const sizeMap: Record<BrandSize, { icon: number; text: string; subtitle: string; gap: string }> = {
  sm: { icon: 28, text: '1.7rem', subtitle: '0.58rem', gap: '0.55rem' },
  md: { icon: 34, text: '2rem', subtitle: '0.64rem', gap: '0.65rem' },
  lg: { icon: 42, text: '2.45rem', subtitle: '0.74rem', gap: '0.8rem' },
}

export default function BrandLockup({
  href = '/',
  size = 'md',
  theme = 'light',
  variant = 'lockup',
  subtitle,
  className = '',
}: {
  href?: string
  size?: BrandSize
  theme?: BrandTheme
  variant?: BrandVariant
  subtitle?: string
  className?: string
}) {
  const sizes = sizeMap[size]
  const textColor = theme === 'dark' ? '#efe7ff' : '#650cd9'
  const subtitleColor = theme === 'dark' ? 'rgba(214,207,237,0.72)' : '#6d667b'

  const content = (
    <span className={`inline-flex flex-col ${className}`.trim()}>
      <span className="inline-flex items-center" style={{ gap: variant === 'wordmark' ? '0' : sizes.gap }}>
        {variant !== 'wordmark' && (
          <Image
            src="/brand/livezapp-logo-only.png"
            alt="LiveZapp"
            width={sizes.icon}
            height={sizes.icon}
            className="shrink-0 object-contain"
            style={{ width: `${sizes.icon}px`, height: `${sizes.icon}px` }}
            priority
          />
        )}
        {variant !== 'icon' && (
          <span
            className="font-black leading-none tracking-[-0.04em]"
            style={{ fontSize: sizes.text, color: textColor }}
          >
            LiveZapp
          </span>
        )}
      </span>
      {subtitle && (
        <span
          className="mt-1 block font-bold uppercase tracking-[0.18em]"
          style={{ fontSize: sizes.subtitle, color: subtitleColor }}
        >
          {subtitle}
        </span>
      )}
    </span>
  )

  return (
    <Link href={href} aria-label="LiveZapp home">
      {content}
    </Link>
  )
}
