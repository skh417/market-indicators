export type IndicatorKey =
  | 'buffett'
  | 'cape'
  | 'vix'
  | 'feargreed'
  | 'vkospi'
  | 'kospiflow'
  | 'hyspread'
  | 'nfci'
  | 'usdwkrw'
  | 'exports'

// t: unix milliseconds, v: value
export type Point = { t: number; v: number }

export type Zone = {
  ko: string
  en: string
  color: string // hex
}

export type Indicator = {
  key: IndicatorKey
  value: number | null
  asOf: string
  zone: Zone | null
  history: Point[]
  series?: { name: string; points: Point[] }[] // 멀티 시리즈 차트용 (수급: 외국인/기관/개인 순서 고정)
  note?: string // 카드 서브텍스트 (예: 투자자별 수급의 개인/기관 값)
  error?: string
}

export type EventMarket = 'US' | 'KR'
export type EventKind = 'macro' | 'earnings'
export type EventStatus = 'confirmed' | 'estimated' | 'released'

export type MarketEvent = {
  id: string
  kind: EventKind
  market: EventMarket
  scheduledAt: string
  title: string
  company?: string
  fiscalQuarter?: string
  status: EventStatus
  source: string
  sourceUrl: string
  actual?: string
  previous?: string
}
