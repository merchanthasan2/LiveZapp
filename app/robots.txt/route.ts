import { NextResponse } from 'next/server'
import { DEFAULT_ROBOTS_TXT } from '@/lib/site'

const REVALIDATE_SECONDS = 300

async function loadRobotsTxt() {
  const databaseUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.replace(/\/$/, '')

  if (!databaseUrl) {
    return DEFAULT_ROBOTS_TXT
  }

  try {
    const response = await fetch(`${databaseUrl}/seoConfig/main/robotsTxtContent.json`, {
      next: { revalidate: REVALIDATE_SECONDS },
    })

    if (!response.ok) {
      return DEFAULT_ROBOTS_TXT
    }

    const robotsTxtContent = await response.json()
    return typeof robotsTxtContent === 'string' && robotsTxtContent.trim()
      ? robotsTxtContent
      : DEFAULT_ROBOTS_TXT
  } catch {
    return DEFAULT_ROBOTS_TXT
  }
}

export async function GET() {
  const content = await loadRobotsTxt()

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': `public, s-maxage=${REVALIDATE_SECONDS}, stale-while-revalidate=${REVALIDATE_SECONDS}`,
    },
  })
}
