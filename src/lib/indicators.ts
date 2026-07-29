import type { Indicator, IndicatorKey, Point } from './types'
import { classify } from '../constants/zones'
import seed from '../data/vkospi-seed'

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
// FRED는 브라우저 UA(Mozilla)를 거부하므로 평범한 토큰 UA를 보낸다.
const PLAIN_UA = 'market-indicators/1.0'

const HOUR = 3600
const DAY = 86400

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
  })
  return Promise.race([p.finally(() => clearTimeout(timer)), timeout])
}

type FetchOpts = { ua?: string; accept?: string; referer?: string; authKey?: string; revalidate: number }

async function httpText(url: string, opts: FetchOpts): Promise<string> {
  const headers: Record<string, string> = {}
  if (opts.ua) headers['User-Agent'] = opts.ua
  if (opts.accept) headers['Accept'] = opts.accept
  if (opts.referer) headers['Referer'] = opts.referer
  if (opts.authKey) headers['AUTH_KEY'] = opts.authKey
  const res = await withTimeout(
    fetch(url, { headers, next: { revalidate: opts.revalidate } }),
    12_000,
  )
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return withTimeout(res.text(), 12_000)
}

function round(v: number, p = 2): number {
  const f = 10 ** p
  return Math.round(v * f) / f
}

function errItem(key: IndicatorKey, e: unknown): Indicator {
  return {
    key,
    value: null,
    asOf: '',
    zone: null,
    history: [],
    error: e instanceof Error ? e.message : String(e),
  }
}

function quarterLabel(t: number): string {
  const d = new Date(t)
  const q = Math.floor(d.getUTCMonth() / 3) + 1
  return `${d.getUTCFullYear()} Q${q} 기준`
}

function monthLabel(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')} 기준`
}

function dateLabel(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} 기준`
}

// ── Buffett ────────────────────────────────────────────────────────────
// FRED 무키 CSV. 헤더: `observation_date,SERIES` / 행: `2026-01-01,69511628`. 결측치 = "."
export function parseFredCsv(text: string): Point[] {
  const out: Point[] = []
  const lines = text.trim().split(/\r?\n/)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 2) continue
    const v = parseFloat(cols[1])
    if (!Number.isFinite(v)) continue // "." 결측치 → NaN → skip
    const t = Date.parse(cols[0])
    if (Number.isNaN(t)) continue
    out.push({ t, v })
  }
  return out
}

// 시가총액(백만$)과 GDP(십억$)를 분기 날짜로 조인 → 버핏 지수(%)
export function computeBuffettSeries(equitiesMillions: Point[], gdpBillions: Point[]): Point[] {
  const gdpByT = new Map(gdpBillions.map((p) => [p.t, p.v]))
  const out: Point[] = []
  for (const e of equitiesMillions) {
    const gdp = gdpByT.get(e.t)
    if (gdp == null || gdp === 0) continue
    out.push({ t: e.t, v: (e.v / 1000 / gdp) * 100 })
  }
  return out
}

async function getBuffett(): Promise<Indicator> {
  try {
    const [eq, gdp] = await Promise.all([
      httpText('https://fred.stlouisfed.org/graph/fredgraph.csv?id=NCBEILQ027S', {
        ua: PLAIN_UA,
        revalidate: DAY,
      }),
      httpText('https://fred.stlouisfed.org/graph/fredgraph.csv?id=GDP', {
        ua: PLAIN_UA,
        revalidate: DAY,
      }),
    ])
    const series = computeBuffettSeries(parseFredCsv(eq), parseFredCsv(gdp))
    if (series.length === 0) throw new Error('buffett: empty series')
    const last = series[series.length - 1]
    return {
      key: 'buffett',
      value: round(last.v, 1),
      asOf: quarterLabel(last.t),
      zone: classify('buffett', last.v),
      history: series.map((p) => ({ t: p.t, v: round(p.v, 1) })),
    }
  } catch (e) {
    return errItem('buffett', e)
  }
}

// ── Shiller CAPE ───────────────────────────────────────────────────────
// meta 태그: "Current Shiller PE Ratio is 41.77, ..."
export function parseCapeCurrent(html: string): number | null {
  const m = html.match(/Current Shiller PE Ratio is ([\d.]+)/i)
  return m ? parseFloat(m[1]) : null
}

// multpl by-month 테이블. 값 셀은 `<td>\n&#x2002;\n41.77\n</td>` 형태 —
// &#x2002; 안의 "2002"를 피하려고 소수점(\d+\.\d+)을 요구한다. 오름차순 정렬.
export function parseCapeTable(html: string): Point[] {
  const out: Point[] = []
  const re =
    /<td>\s*([A-Z][a-z]{2}\s+\d{1,2},\s*\d{4})\s*<\/td>\s*<td>[\s\S]*?(\d+\.\d+)\s*<\/td>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const t = Date.parse(m[1])
    const v = parseFloat(m[2])
    if (!Number.isNaN(t) && Number.isFinite(v)) out.push({ t, v })
  }
  return out.sort((a, b) => a.t - b.t)
}

async function getCape(): Promise<Indicator> {
  try {
    const html = await httpText('https://www.multpl.com/shiller-pe/table/by-month', {
      ua: BROWSER_UA,
      revalidate: 6 * HOUR,
    })
    const history = parseCapeTable(html)
    let value: number | null = history.length ? history[history.length - 1].v : null
    let asOf = history.length ? monthLabel(history[history.length - 1].t) : '최근'
    if (value == null) {
      const meta = await httpText('https://www.multpl.com/shiller-pe', {
        ua: BROWSER_UA,
        revalidate: 6 * HOUR,
      })
      value = parseCapeCurrent(meta)
      asOf = '최근'
    }
    if (value == null) throw new Error('cape: no value')
    return {
      key: 'cape',
      value: round(value, 2),
      asOf,
      zone: classify('cape', value),
      history,
    }
  } catch (e) {
    return errItem('cape', e)
  }
}

// ── VIX ────────────────────────────────────────────────────────────────
type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; regularMarketTime?: number }
      timestamp?: number[]
      indicators?: { quote?: Array<{ close?: Array<number | null> }> }
    }>
  }
}

async function getVix(): Promise<Indicator> {
  try {
    const text = await httpText(
      'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?range=5y&interval=1d',
      { ua: BROWSER_UA, revalidate: HOUR },
    )
    const json = JSON.parse(text) as YahooChart
    const r = json.chart?.result?.[0]
    const price = r?.meta?.regularMarketPrice
    if (price == null) throw new Error('vix: no price')
    const ts = r?.timestamp ?? []
    const closes = r?.indicators?.quote?.[0]?.close ?? []
    const history: Point[] = []
    for (let i = 0; i < ts.length; i++) {
      const c = closes[i]
      if (c != null && Number.isFinite(c)) history.push({ t: ts[i] * 1000, v: round(c, 2) })
    }
    return {
      key: 'vix',
      value: round(price, 2),
      asOf: r?.meta?.regularMarketTime ? dateLabel(r.meta.regularMarketTime * 1000) : '실시간',
      zone: classify('vix', price),
      history,
    }
  } catch (e) {
    // 백업: Cboe CDN(현재값만)
    try {
      const text = await httpText(
        'https://cdn.cboe.com/api/global/delayed_quotes/quotes/_VIX.json',
        { ua: PLAIN_UA, revalidate: HOUR },
      )
      const j = JSON.parse(text) as { data?: { current_price?: number } }
      const price = j.data?.current_price
      if (price == null) throw new Error('cboe: no price')
      return {
        key: 'vix',
        value: round(price, 2),
        asOf: '지연 시세 · delayed',
        zone: classify('vix', price),
        history: [],
      }
    } catch {
      return errItem('vix', e)
    }
  }
}

// ── CNN Fear & Greed ───────────────────────────────────────────────────
type CnnFG = {
  fear_and_greed?: { score?: number; rating?: string; timestamp?: string }
  fear_and_greed_historical?: { data?: Array<{ x?: number; y?: number }> }
}

async function getFearGreed(): Promise<Indicator> {
  try {
    // 시작일 경로를 붙이면 해당 시점부터의 히스토리를 반환 (기본은 ~1년)
    const start = new Date(Date.now() - 5 * 365 * 864e5).toISOString().slice(0, 10)
    const text = await httpText(`https://production.dataviz.cnn.io/index/fearandgreed/graphdata/${start}`, {
      ua: BROWSER_UA,
      accept: 'application/json',
      referer: 'https://www.cnn.com/',
      revalidate: HOUR,
    })
    const json = JSON.parse(text) as CnnFG
    const score = json.fear_and_greed?.score
    if (score == null) throw new Error('fng: no score')
    const history: Point[] = (json.fear_and_greed_historical?.data ?? [])
      .filter((d): d is { x: number; y: number } => d.x != null && d.y != null)
      .map((d) => ({ t: d.x, v: round(d.y, 1) }))
    const ts = json.fear_and_greed?.timestamp
    return {
      key: 'feargreed',
      value: round(score, 0),
      asOf: ts ? dateLabel(Date.parse(ts)) : '장중 · intraday',
      zone: classify('feargreed', score),
      history,
    }
  } catch (e) {
    return errItem('feargreed', e)
  }
}

// ── VKOSPI (KRX Open API) ──────────────────────────────────────────────
// data-dbg.krx.co.kr는 일자별(basDd) 단건 조회만 지원한다. 과거분은
// scripts/backfill-vkospi.mjs가 만든 시드(src/data/vkospi-seed.ts)에서 읽고,
// 최근 10일치만 API로 받아 병합한다.
// ponytail: 시드 종료 후 10일 넘게 지난 구간은 공백 — 백필 재실행으로 해결.
type KrxDrvRow = { BAS_DD?: string; IDX_NM?: string; CLSPRC_IDX?: string }

async function getVkospi(): Promise<Indicator> {
  try {
    const key = process.env.KRX_API_KEY
    if (!key) throw new Error('vkospi: KRX_API_KEY 미설정')

    const recent = await Promise.all(
      Array.from({ length: 10 }, (_, i) => {
        const d = new Date(Date.now() - i * DAY * 1000)
        const ymd = d.toISOString().slice(0, 10).replace(/-/g, '')
        return httpText(`https://data-dbg.krx.co.kr/svc/apis/idx/drvprod_dd_trd?basDd=${ymd}`, {
          accept: 'application/json',
          authKey: key,
          revalidate: HOUR,
        })
          .then((text): Point | null => {
            const rows = (JSON.parse(text) as { OutBlock_1?: KrxDrvRow[] }).OutBlock_1 ?? []
            // '최소변동성지수' 등 유사명이 많아 정확 일치로 찾는다
            const r = rows.find((row) => row.IDX_NM === '코스피 200 변동성지수')
            const v = r ? parseFloat(String(r.CLSPRC_IDX).replace(/,/g, '')) : NaN
            if (!Number.isFinite(v)) return null // 휴장일
            const t = Date.parse(`${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`)
            return { t, v: round(v, 2) }
          })
          .catch(() => null)
      }),
    )

    const byT = new Map(seed.map((p) => [p.t, p.v]))
    for (const p of recent) if (p) byT.set(p.t, p.v)
    const history: Point[] = [...byT.entries()].map(([t, v]) => ({ t, v })).sort((a, b) => a.t - b.t)

    const last = history[history.length - 1]
    if (!last) throw new Error('vkospi: no data (백필 미실행 + 최근 조회 실패)')
    return {
      key: 'vkospi',
      value: last.v,
      asOf: dateLabel(last.t),
      zone: classify('vkospi', last.v),
      history,
    }
  } catch (e) {
    return errItem('vkospi', e)
  }
}

// 5개 지표를 병렬로 수집. 개별 실패는 errItem으로 격리되어 페이지 전체를 죽이지 않는다.
export async function getAllIndicators(): Promise<Indicator[]> {
  const keys: IndicatorKey[] = ['buffett', 'cape', 'vix', 'feargreed', 'vkospi']
  const settled = await Promise.allSettled([getBuffett(), getCape(), getVix(), getFearGreed(), getVkospi()])
  return settled.map((s, i) => (s.status === 'fulfilled' ? s.value : errItem(keys[i], s.reason)))
}
