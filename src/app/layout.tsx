import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { SITE } from '@/constants/labels'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

// metadataBase는 지정하지 않는다 — Next가 Vercel env(VERCEL_PROJECT_PRODUCTION_URL 등)로
// 환경별 올바른 절대 URL을 자동 생성한다. 명시하면 그 폴백이 막힌다.
export const metadata: Metadata = {
  title: `${SITE.titleKo} · ${SITE.titleEn}`,
  description: `${SITE.descKo} / ${SITE.descEn}`,
  keywords: ['버핏 지수', 'Buffett Indicator', 'CAPE', 'Shiller PE', 'VIX', 'Fear and Greed', 'VKOSPI', '코스피 변동성지수', '시장 밸류에이션', '실적 캘린더', '경제 일정'],
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
