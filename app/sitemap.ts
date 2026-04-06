import type { MetadataRoute } from 'next'
import { toAbsoluteUrl } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    { url: toAbsoluteUrl('/'), priority: 1, changeFrequency: 'weekly', lastModified },
    { url: toAbsoluteUrl('/plans'), priority: 0.9, changeFrequency: 'weekly', lastModified },
    { url: toAbsoluteUrl('/about'), priority: 0.7, changeFrequency: 'monthly', lastModified },
    { url: toAbsoluteUrl('/contact'), priority: 0.7, changeFrequency: 'monthly', lastModified },
  ]
}
