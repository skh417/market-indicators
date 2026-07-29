import type { IndicatorKey, Zone } from '../lib/types'

const C = {
  green: '#22c55e',
  teal: '#2dd4bf',
  blue: '#38bdf8',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
} as const

type Band = { max: number; zone: Zone }

// ponytail: 고정 임계값 휴리스틱. 역사적 평균/표준편차는 시간에 따라 이동하므로,
// 정밀도가 필요하면 rolling mean±std 밴드로 교체. 지금은 조정 가능한 상수로 충분.
const BANDS: Record<IndicatorKey, Band[]> = {
  // 버핏 지수(시가총액/GDP, %)
  buffett: [
    { max: 90, zone: { ko: '저평가', en: 'Undervalued', color: C.green } },
    { max: 120, zone: { ko: '적정', en: 'Fair value', color: C.blue } },
    { max: 150, zone: { ko: '다소 고평가', en: 'Modestly overvalued', color: C.yellow } },
    { max: 190, zone: { ko: '고평가', en: 'Overvalued', color: C.orange } },
    { max: Infinity, zone: { ko: '심각한 고평가', en: 'Significantly overvalued', color: C.red } },
  ],
  // Shiller CAPE (역사적 평균 ~17)
  cape: [
    { max: 15, zone: { ko: '저평가', en: 'Undervalued', color: C.green } },
    { max: 22, zone: { ko: '적정', en: 'Fair value', color: C.blue } },
    { max: 28, zone: { ko: '다소 고평가', en: 'Modestly overvalued', color: C.yellow } },
    { max: 35, zone: { ko: '고평가', en: 'Overvalued', color: C.orange } },
    { max: Infinity, zone: { ko: '심각한 고평가', en: 'Significantly overvalued', color: C.red } },
  ],
  // VIX (낮을수록 안정, 높을수록 공포)
  vix: [
    { max: 15, zone: { ko: '매우 안정', en: 'Very calm', color: C.green } },
    { max: 20, zone: { ko: '안정', en: 'Calm', color: C.teal } },
    { max: 30, zone: { ko: '경계', en: 'Elevated', color: C.yellow } },
    { max: 40, zone: { ko: '공포', en: 'High fear', color: C.orange } },
    { max: Infinity, zone: { ko: '극심한 공포', en: 'Extreme fear', color: C.red } },
  ],
  // VKOSPI (코스피200 변동성지수). ponytail: VIX 밴드를 한국 시장 스케일로 낮춘 휴리스틱 — 필요시 조정.
  vkospi: [
    { max: 13, zone: { ko: '매우 안정', en: 'Very calm', color: C.green } },
    { max: 18, zone: { ko: '안정', en: 'Calm', color: C.teal } },
    { max: 25, zone: { ko: '경계', en: 'Elevated', color: C.yellow } },
    { max: 35, zone: { ko: '공포', en: 'High fear', color: C.orange } },
    { max: Infinity, zone: { ko: '극심한 공포', en: 'Extreme fear', color: C.red } },
  ],
  // CNN 공포·탐욕 지수. 색상은 CNN 시각 관례(공포=적/주황, 탐욕=녹)를 따름 — 매수/매도 신호 아님.
  feargreed: [
    { max: 25, zone: { ko: '극심한 공포', en: 'Extreme Fear', color: C.red } },
    { max: 45, zone: { ko: '공포', en: 'Fear', color: C.orange } },
    { max: 55, zone: { ko: '중립', en: 'Neutral', color: C.yellow } },
    { max: 75, zone: { ko: '탐욕', en: 'Greed', color: C.teal } },
    { max: Infinity, zone: { ko: '극심한 탐욕', en: 'Extreme Greed', color: C.green } },
  ],
}

export function classify(key: IndicatorKey, value: number | null): Zone | null {
  if (value == null || Number.isNaN(value)) return null
  const bands = BANDS[key]
  const band = bands.find((b) => value < b.max) ?? bands[bands.length - 1]
  return band.zone
}

// 차트 기준선용: 유한한 임계값 목록
export function zoneThresholds(key: IndicatorKey): number[] {
  return BANDS[key].map((b) => b.max).filter((m) => Number.isFinite(m))
}
