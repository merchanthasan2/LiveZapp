/**
 * True if the pixel is a flat light background (typical white / off-white JPEG box).
 * Uses minimum channel so light grays (#f0f0f0) still qualify when tolerance is set accordingly.
 */
function isNearWhiteBackground(r: number, g: number, b: number, minChannel: number): boolean {
  return r >= minChannel && g >= minChannel && b >= minChannel
}

export type ProcessLogoOptions = {
  maxWidth?: number
  /** Used only when removeBackground is false (WebP output). */
  quality?: number
  removeBackground?: boolean
  /**
   * Pixels with R, G, and B all >= this value (0–255) become transparent when removeBackground is on.
   * Default targets white and common “off-white” box backgrounds; lower = more aggressive.
   */
  whiteTolerance?: number
}

/**
 * Resizes client-side, optionally knocks out near-white pixels, then encodes for upload.
 * When removeBackground is true, output is **PNG** so alpha is preserved reliably (WebP from canvas
 * can drop or flatten transparency in some cases). When false, output is **WebP** for smaller size.
 * Only this blob is uploaded — the original file is never sent to the server.
 */
export async function processLogoImage(file: File, options: ProcessLogoOptions = {}): Promise<Blob> {
  const {
    maxWidth = 640,
    quality = 0.82,
    removeBackground = false,
    whiteTolerance = 236,
  } = options

  const minChannel = Math.max(0, Math.min(255, Math.round(whiteTolerance)))
  const outMime = removeBackground ? 'image/png' : 'image/webp'

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
      const ctx = canvas.getContext('2d', removeBackground ? { willReadFrequently: true } : undefined)
      if (!ctx) {
        reject(new Error('Could not process image'))
        return
      }

      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      if (removeBackground) {
        const imageData = ctx.getImageData(0, 0, width, height)
        const pixels = imageData.data
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i]!
          const g = pixels[i + 1]!
          const b = pixels[i + 2]!
          if (isNearWhiteBackground(r, g, b, minChannel)) {
            pixels[i + 3] = 0
          }
        }
        ctx.putImageData(imageData, 0, 0)
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression failed'))
            return
          }
          // Some browsers omit type on canvas blobs; normalize so the API routes MIME correctly.
          if (blob.type === outMime) {
            resolve(blob)
          } else {
            resolve(new Blob([blob], { type: outMime }))
          }
        },
        outMime,
        removeBackground ? undefined : quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Invalid image'))
    }

    img.src = objectUrl
  })
}
