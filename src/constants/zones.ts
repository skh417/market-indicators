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
  // 코스피 외국인 일별 순매수(조원). ponytail: ±1조를 '대규모' 경계로 쓰는 휴리스틱 — 필요시 조정.
  kospiflow: [
    { max: -1, zone: { ko: '외국인 대규모 순매도', en: 'Heavy foreign selling', color: C.red } },
    { max: 0, zone: { ko: '외국인 순매도', en: 'Foreign net selling', color: C.orange } },
    { max: 1, zone: { ko: '외국인 순매수', en: 'Foreign net buying', color: C.teal } },
    { max: Infinity, zone: { ko: '외국인 대규모 순매수', en: 'Heavy foreign buying', color: C.green } },
  ],
  // CNN 공포·탐욕 지수. 색상은 CNN 시각 관례(공포=적/주황, 탐욕=녹)를 따름 — 매수/매도 신호 아님.
  feargreed: [
    { max: 25, zone: { ko: '극심한 공포', en: 'Extreme Fear', color: C.red } },
    { max: 45, zone: { ko: '공포', en: 'Fear', color: C.orange } },
    { max: 55, zone: { ko: '중립', en: 'Neutral', color: C.yellow } },
    { max: 75, zone: { ko: '탐욕', en: 'Greed', color: C.teal } },
    { max: Infinity, zone: { ko: '극심한 탐욕', en: 'Extreme Greed', color: C.green } },
  ],
  // ponytail: 장기 평균·위기 구간을 바탕으로 한 고정 휴리스틱. 신용시장 국면별 백분위로 고도화 가능.
  hyspread: [
    { max: 3, zone: { ko: '매우 안정', en: 'Very calm', color: C.green } },
    { max: 5, zone: { ko: '안정', en: 'Calm', color: C.teal } },
    { max: 7, zone: { ko: '경계', en: 'Elevated', color: C.yellow } },
    { max: 10, zone: { ko: '신용 스트레스', en: 'Credit stress', color: C.orange } },
    { max: Infinity, zone: { ko: '심각한 스트레스', en: 'Severe stress', color: C.red } },
  ],
  nfci: [
    { max: -0.5, zone: { ko: '완화적', en: 'Loose', color: C.green } },
    { max: 0, zone: { ko: '평균 이하 긴축', en: 'Below-average tightness', color: C.teal } },
    { max: 0.5, zone: { ko: '중립', en: 'Neutral', color: C.blue } },
    { max: 1, zone: { ko: '긴축적', en: 'Tight', color: C.orange } },
    { max: Infinity, zone: { ko: '강한 긴축', en: 'Very tight', color: C.red } },
  ],
  usdwkrw: [
    { max: -3, zone: { ko: '원화 강세', en: 'Won strengthening', color: C.green } },
    { max: 0, zone: { ko: '완만한 원화 강세', en: 'Mild won strength', color: C.teal } },
    { max: 3, zone: { ko: '안정', en: 'Stable', color: C.blue } },
    { max: 6, zone: { ko: '원화 약세', en: 'Won weakening', color: C.orange } },
    { max: Infinity, zone: { ko: '급격한 원화 약세', en: 'Sharp won weakness', color: C.red } },
  ],
  exports: [
    { max: -10, zone: { ko: '수출 급감', en: 'Sharp contraction', color: C.red } },
    { max: 0, zone: { ko: '수출 감소', en: 'Contraction', color: C.orange } },
    { max: 10, zone: { ko: '완만한 증가', en: 'Moderate growth', color: C.blue } },
    { max: 20, zone: { ko: '강한 증가', en: 'Strong growth', color: C.teal } },
    { max: Infinity, zone: { ko: '급증', en: 'Rapid growth', color: C.green } },
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

// 리포트 프롬프트용: 라벨 붙은 구간 기준 (예: '90 미만: 저평가', '120~150: 다소 고평가')
export function zoneBandsKo(key: IndicatorKey): string[] {
  const bands = BANDS[key]
  return bands.map((b, i) => {
    const lo = i === 0 ? null : bands[i - 1].max
    const range = !Number.isFinite(b.max) ? `${lo} 이상` : lo == null ? `${b.max} 미만` : `${lo}~${b.max}`
    return `${range}: ${b.zone.ko}`
  })
}
