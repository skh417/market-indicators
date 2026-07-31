import type { IndicatorKey } from '../lib/types'

export type Label = {
  ko: string
  en: string
  blurbKo: string
  blurbEn: string
  unit: string
  decimals: number
  source: string
}

export const LABELS: Record<IndicatorKey, Label> = {
  buffett: {
    ko: '버핏 지수',
    en: 'Buffett Indicator',
    blurbKo: '미국 전체 주식 시가총액을 GDP로 나눈 값. 높을수록 시장이 고평가입니다.',
    blurbEn: 'Total US market cap ÷ GDP. Higher means the market is more richly valued.',
    unit: '%',
    decimals: 1,
    source: 'FRED (NCBEILQ027S ÷ GDP)',
  },
  cape: {
    ko: 'CAPE · 실러 PER',
    en: 'Shiller PE / CAPE',
    blurbKo: '10년 평균 실질이익 기준 경기조정 주가수익비율. 장기 밸류에이션 지표입니다.',
    blurbEn: 'Price ÷ 10-year inflation-adjusted earnings. A long-term valuation gauge.',
    unit: '',
    decimals: 2,
    source: 'multpl.com',
  },
  vix: {
    ko: '변동성 지수',
    en: 'VIX Volatility Index',
    blurbKo: 'S&P 500 옵션 기반 30일 기대 변동성. 높을수록 시장 공포가 큽니다.',
    blurbEn: '30-day expected S&P 500 volatility. Higher means more fear.',
    unit: '',
    decimals: 2,
    source: 'Cboe · Yahoo Finance',
  },
  vkospi: {
    ko: '코스피 변동성지수',
    en: 'VKOSPI',
    blurbKo: '코스피200 옵션 기반 30일 기대 변동성. 높을수록 국내 증시 불안이 큽니다.',
    blurbEn: '30-day expected KOSPI 200 volatility. Higher means more fear in Korean equities.',
    unit: '',
    decimals: 2,
    source: 'KRX Open API',
  },
  kospiflow: {
    ko: '코스피 투자자별 수급',
    en: 'KOSPI Investor Flows',
    blurbKo: '코스피 외국인·기관·개인의 일별 순매수 금액. 대표값과 배지는 외국인 기준입니다.',
    blurbEn: 'Daily net purchases by foreign, institutional, and retail investors on KOSPI. Value and badge track foreigners.',
    unit: '조원',
    decimals: 2,
    source: '네이버 금융',
  },
  feargreed: {
    ko: '공포·탐욕 지수',
    en: 'CNN Fear & Greed',
    blurbKo: 'CNN이 7개 지표로 산출하는 시장 심리(0=극공포, 100=극탐욕).',
    blurbEn: "CNN's market sentiment from 7 inputs (0 = extreme fear, 100 = extreme greed).",
    unit: '',
    decimals: 0,
    source: 'CNN Business',
  },
}

export const SITE = {
  titleKo: '시장 밸류에이션 대시보드',
  titleEn: 'Market Valuation Dashboard',
  descKo: '버핏 지수·CAPE·VIX·공포탐욕지수·VKOSPI·코스피 투자자별 수급으로 보는 증시 밸류에이션과 심리',
  descEn: 'Market valuation & sentiment: Buffett Indicator, Shiller CAPE, VIX, CNN Fear & Greed, VKOSPI, and KOSPI investor flows.',
}
