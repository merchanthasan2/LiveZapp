import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { join, extname } from 'path'

const UPLOAD_DIR  = join(process.cwd(), 'public', 'uploads', 'logos')
const MAX_BYTES   = 2 * 1024 * 1024  // 2 MB
const ALLOWED_MIME: Record<string, string> = {
  'image/png':     '.png',
  'image/jpeg':    '.jpg',
  'image/webp':    '.webp',
  'image/svg+xml': '.svg',
}

function ensureDir() {
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })
}

/** Remove any previous logo files for this user (different extension). */
async function removeOldLogos(userId: string, keepExt: string) {
  for (const ext of ['.png', '.jpg', '.webp', '.svg']) {
    if (ext === keepExt) continue
    const old = join(UPLOAD_DIR, `${userId}-logo${ext}`)
    if (existsSync(old)) await unlink(old).catch(() => {})
  }
}

// ── POST /api/upload/logo ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file   = formData.get('file')   as File   | null
  const userId = formData.get('userId') as string | null

  if (!file || !userId) {
    return NextResponse.json({ error: 'Missing file or userId' }, { status: 400 })
  }

  // Validate user ID format (alphanumeric + hyphens/underscores only)
  if (!/^[\w\-]{4,128}$/.test(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
  }

  // Validate size
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 2 MB limit' }, { status: 413 })
  }

  // Validate MIME type
  const ext = ALLOWED_MIME[file.type]
  if (!ext) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use PNG, JPG, WebP, or SVG.' },
      { status: 415 },
    )
  }

  ensureDir()

  const filename = `${userId}-logo${ext}`
  const filepath = join(UPLOAD_DIR, filename)

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)
    await removeOldLogos(userId, ext)
  } catch (err) {
    console.error('[upload/logo] write error', err)
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 })
  }

  return NextResponse.json(
    { url: `/uploads/logos/${filename}` },
    { status: 201 },
  )
}

// ── DELETE /api/upload/logo?userId=xxx ───────────────────────────────────
export async function DELETE(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')

  if (!userId || !/^[\w\-]{4,128}$/.test(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
  }

  ensureDir()

  let deleted = false
  for (const ext of ['.png', '.jpg', '.webp', '.svg']) {
    const fp = join(UPLOAD_DIR, `${userId}-logo${ext}`)
    if (existsSync(fp)) {
      await unlink(fp).catch(() => {})
      deleted = true
    }
  }

  return NextResponse.json({ deleted })
}
