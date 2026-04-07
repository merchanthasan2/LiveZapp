const requestHits = new Map<string, number[]>()

function pruneHits(key: string, windowMs: number, now: number) {
  const hits = (requestHits.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs)
  requestHits.set(key, hits)
  return hits
}

export function hitRateLimit(key: string, maxHits: number, windowMs: number) {
  const now = Date.now()
  const hits = pruneHits(key, windowMs, now)
  if (hits.length >= maxHits) {
    return true
  }

  hits.push(now)
  requestHits.set(key, hits)
  return false
}

export function getRequestIp(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  return 'unknown'
}
