const FALLBACK_SITE_URL = 'https://www.live-zapp.com'

function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, '').trim()
  if (!trimmed) return FALLBACK_SITE_URL.replace(/\/$/, '')
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    return new URL(withProtocol).origin.replace(/\/$/, '')
  } catch {
    return FALLBACK_SITE_URL.replace(/\/$/, '')
  }
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL || FALLBACK_SITE_URL)
export const SITE_HOST = (() => {
  try {
    return new URL(SITE_URL).host
  } catch {
    return new URL(FALLBACK_SITE_URL).host
  }
})()

export function toAbsoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalizedPath}`
}

export const DEFAULT_ROBOTS_TXT = `User-agent: *
Allow: /
Allow: /plans
Allow: /about
Allow: /contact
Allow: /privacy
Allow: /terms
Disallow: /admin
Disallow: /app
Disallow: /join
Disallow: /checkout
Sitemap: ${toAbsoluteUrl('/sitemap.xml')}`
