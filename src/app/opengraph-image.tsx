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
const CARD = '#0f1626'
const BORDER = '#1e293b'
const FG = '#e8eef7'
const MUTED = '#9aa8bd'
const FAINT = '#64748b'

const OG_KEYS: IndicatorKey[] = ['buffett', 'cape', 'vix', 'feargreed']

// 폰트 서브셋: OG에 등장할 수 있는 모든 글자 (한글 음절 + 라틴/숫자/기호)
const FONT_TEXT = [
  ...new Set(
    '지금 미국 시장은 얼마나 비싼가 밸류에이션 대시보드 버핏 지수 실러 변동성 공포·탐욕' +
      '저평가 적정 다소 고평가 심각한 매우 안정 경계 극심한 탐욕 중립 데이터 없음' +
      '매시간 업데이트 투자 조언이 아닙니다' +
      'CAPE PER VIX Market Valuation Dashboard Updated hourly Not investment advice' +
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

const tint = (hex: string, a: number) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r},${g},${b},${a})`
}

export default async function Image() {
  const [indicators, w500, w700, w800] = await Promise.all([
    getAllIndicators(),
    loadFont(500),
    loadFont(700),
    loadFont(800),
  ])
  const cards = OG_KEYS.map((key) => {
    const ind = indicators.find((i) => i.key === key)
    const L = LABELS[key]
    return {
      label: key === 'vix' ? '변동성 지수 VIX' : L.ko,
      value: ind?.value != null ? `${ind.value.toFixed(L.decimals)}${L.unit}` : '—',
      zone: ind?.zone?.ko ?? '데이터 없음',
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
          justifyContent: 'space-between',
          padding: '60px 72px 52px',
          backgroundColor: BG,
          backgroundImage: 'radial-gradient(circle at 80% 0%, rgba(56,189,248,0.10) 0%, rgba(7,11,20,0) 55%)',
          color: FG,
          fontFamily: 'NotoSansKR',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            지금 미국 시장은 얼마나 비싼가
          </div>
          <div style={{ display: 'flex', fontSize: 24, fontWeight: 500, color: MUTED }}>
            시장 밸류에이션 대시보드
            <span style={{ color: FAINT, marginLeft: 8 }}>· Market Valuation Dashboard</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 18 }}>
          {cards.map((c) => (
            <div
              key={c.label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                backgroundColor: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div style={{ fontSize: 17, color: MUTED }}>{c.label}</div>
              <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, color: c.color }}>
                {c.value}
              </div>
              <div
                style={{
                  alignSelf: 'flex-start',
                  border: `1px solid ${c.color}`,
                  backgroundColor: tint(c.color, 0.14),
                  color: c.color,
                  borderRadius: 999,
                  padding: '4px 12px',
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                {c.zone}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, color: FAINT }}>
          <div>매시간 업데이트 · Updated hourly</div>
          <div>투자 조언이 아닙니다. · Not investment advice.</div>
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
