export type IndicatorKey = 'buffett' | 'cape' | 'vix' | 'feargreed' | 'vkospi'

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
  error?: string
}
