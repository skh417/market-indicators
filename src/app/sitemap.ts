import type { MetadataRoute } from 'next'
import { SITE_URL as siteUrl } from '@/lib/site-url'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: 'hourly', priority: 1 },
    { url: `${siteUrl}/calendar`, changeFrequency: 'daily', priority: 0.8 },
  ]
}
