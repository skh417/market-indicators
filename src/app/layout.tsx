import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { SITE } from '@/constants/labels'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${SITE.titleKo} · ${SITE.titleEn}`,
  description: `${SITE.descKo} / ${SITE.descEn}`,
  keywords: ['버핏 지수', 'Buffett Indicator', 'CAPE', 'Shiller PE', 'VIX', 'Fear and Greed', 'VKOSPI', '코스피 변동성지수', '시장 밸류에이션'],
  openGraph: {
    title: `${SITE.titleKo} · ${SITE.titleEn}`,
    description: SITE.descKo,
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.titleKo} · ${SITE.titleEn}`,
    description: SITE.descEn,
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
