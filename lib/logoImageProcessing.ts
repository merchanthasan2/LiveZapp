function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function isNearWhite(r: number, g: number, b: number, tolerance: number): boolean {
  return r >= tolerance && g >= tolerance && b >= tolerance
}

export type ProcessLogoOptions = {
  maxWidth?: number
  quality?: number
  removeBackground?: boolean
  whiteTolerance?: number
}

/**
 * Compresses image uploads to webp and can optionally knock out near-white pixels.
 * This gives users an opt-in "remove logo background" flow without forcing it.
 */
export async function processLogoImage(file: File, options: ProcessLogoOptions = {}): Promise<Blob> {
  const {
    maxWidth = 640,
    quality = 0.82,
    removeBackground = false,
    whiteTolerance = 244,
  } = options

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
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not process image'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      if (removeBackground) {
        const imageData = ctx.getImageData(0, 0, width, height)
        const pixels = imageData.data
        const tol = Math.round(clamp01((whiteTolerance - 200) / 55) * 55 + 200)
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]
          if (isNearWhite(r, g, b, tol)) {
            pixels[i + 3] = 0
          }
        }
        ctx.putImageData(imageData, 0, 0)
      }

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
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
