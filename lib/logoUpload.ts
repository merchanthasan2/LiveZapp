import { auth } from '@/lib/firebase'

const DEFAULT_UPLOAD_TIMEOUT_MS = 20000

export type LogoUploadSlot = 'branding' | 'wizard-draft'

async function bearerHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser
  if (!user) throw new Error('You must be signed in to upload a logo.')
  const token = await user.getIdToken()
  return { Authorization: `Bearer ${token}` }
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = DEFAULT_UPLOAD_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function compressLogoFile(file: File, maxWidth = 640, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const scale = Math.min(1, maxWidth / img.width)
      const width = Math.round(img.width * scale)
      const height = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Could not process image'))
        return
      }

      context.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/webp',
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Invalid image'))
    }

    img.src = objectUrl
  })
}

export async function uploadLogoFile({
  file,
  userId,
  slot,
  fileName,
}: {
  file: Blob
  userId: string
  slot: LogoUploadSlot
  fileName?: string
}) {
  const resolvedFileName = fileName || (file.type === 'image/svg+xml' ? 'logo.svg' : 'logo.webp')
  const body = new FormData()

  body.append('userId', userId)
  body.append('slot', slot)
  body.append('file', file, resolvedFileName)

  let response: Response
  try {
    response = await fetchWithTimeout('/api/upload/logo', {
      method: 'POST',
      headers: await bearerHeaders(),
      body,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Upload timed out. Please try again.')
    }
    throw error
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.url) {
    throw new Error(payload?.error || 'Upload failed')
  }

  return payload.url as string
}

export async function deleteLogoFile({
  userId,
  slot,
}: {
  userId: string
  slot: LogoUploadSlot
}) {
  let response: Response
  try {
    response = await fetchWithTimeout(
      `/api/upload/logo?userId=${encodeURIComponent(userId)}&slot=${encodeURIComponent(slot)}`,
      { method: 'DELETE', headers: await bearerHeaders() },
    )
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Delete timed out. Please try again.')
    }
    throw error
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.error || 'Delete failed')
  }
}
