import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: 'hourly', priority: 1 },
    { url: `${siteUrl}/calendar`, changeFrequency: 'daily', priority: 0.8 },
  ]
}
