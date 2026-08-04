import { ImageResponse } from 'next/og'
import { getAllIndicators } from '@/lib/indicators'
import { LABELS } from '@/constants/labels'
import type { IndicatorKey } from '@/lib/types'

export const revalidate = 3600
export const alt = '시장 밸류에이션 대시보드 · 주요 지표 요약'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Satori는 CSS 변수·color-mix를 지원하지 않음 — 토큰 값을 하드코딩
const BG = '#070b14'
const FG = '#e8eef7'
const MUTED = '#9aa8bd'
const FAINT = '#64748b'
const ZONE_GRADIENT = 'linear-gradient(90deg, #22c55e, #2dd4bf, #38bdf8, #eab308, #f97316, #ef4444)'

// 시안 2b 하단 지표 스트립: 짧은 라벨 + 값
const OG_ITEMS: { key: IndicatorKey; short: string }[] = [
  { key: 'buffett', short: '버핏' },
  { key: 'cape', short: 'CAPE' },
  { key: 'vix', short: 'VIX' },
  { key: 'feargreed', short: '공포·탐욕' },
]

// 폰트 서브셋: OG에 등장할 수 있는 모든 글자 (한글 음절 + 라틴/숫자/기호)
const FONT_TEXT = [
  ...new Set(
    '지금 시장은 얼마나 비싼가 밸류에이션 대시보드 버핏 공포·탐욕' +
      'CAPE VIX Market Valuation Dashboard' +
      '0123456789.%—-()/ ',
  ),
].join('')

async function loadFont(weight: number): Promise<ArrayBuffer> {
  // 구형 UA로 요청하면 Google Fonts가 (satori가 읽을 수 있는) TTF URL을 반환
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(FONT_TEXT)}`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:11.0) Gecko/20100101 Firefox/11.0' } },
  ).then((r) => r.text())
  const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1]
  if (!url) throw new Error('og: font url not found')
  return fetch(url).then((r) => r.arrayBuffer())
}

export default async function Image() {
  const [indicators, w500, w700, w800] = await Promise.all([
    getAllIndicators(),
    loadFont(500),
    loadFont(700),
    loadFont(800),
  ])
  const items = OG_ITEMS.map(({ key, short }) => {
    const ind = indicators.find((i) => i.key === key)
    const L = LABELS[key]
    return {
      text: `${short} ${ind?.value != null ? `${ind.value.toFixed(L.decimals)}${L.unit}` : '—'}`,
      color: ind?.zone?.color ?? FAINT,
    }
  })

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 36,
          padding: '0 88px',
          backgroundColor: BG,
          backgroundImage: 'radial-gradient(circle at 80% 0%, rgba(56,189,248,0.10) 0%, rgba(7,11,20,0) 55%)',
          color: FG,
          fontFamily: 'NotoSansKR',
        }}
      >
        <div style={{ width: 220, height: 8, borderRadius: 999, backgroundImage: ZONE_GRADIENT }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 76,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.12,
            }}
          >
            <div>지금 시장은</div>
            <div>얼마나 비싼가</div>
          </div>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 500, color: MUTED }}>
            시장 밸류에이션 대시보드
            <span style={{ color: FAINT, marginLeft: 8 }}>· Market Valuation Dashboard</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, fontSize: 22, color: FAINT }}>
          {items.map((it, i) => (
            <div key={it.text} style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              {i > 0 && <span>·</span>}
              <span style={{ color: it.color, fontWeight: 700 }}>{it.text}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'NotoSansKR', data: w500, weight: 500, style: 'normal' },
        { name: 'NotoSansKR', data: w700, weight: 700, style: 'normal' },
        { name: 'NotoSansKR', data: w800, weight: 800, style: 'normal' },
      ],
    },
  )
}
