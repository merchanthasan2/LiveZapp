const FALLBACK_SITE_URL = 'https://www.live-zapp.com'

export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || FALLBACK_SITE_URL).replace(/\/$/, '')
export const SITE_HOST = new URL(SITE_URL).host

export function toAbsoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalizedPath}`
}

export const DEFAULT_ROBOTS_TXT = `User-agent: *
Allow: /
Allow: /plans
Allow: /about
Allow: /contact
Disallow: /admin
Disallow: /app
Disallow: /join
Disallow: /checkout
Sitemap: ${toAbsoluteUrl('/sitemap.xml')}`
