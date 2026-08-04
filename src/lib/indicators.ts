import type { Indicator, IndicatorKey, Point } from './types'
import { classify } from '../constants/zones'
import seed from '../data/vkospi-seed'
import kospiflowSeed from '../data/kospiflow-seed'

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

type FetchOpts = { ua?: string; accept?: string; referer?: string; authKey?: string; encoding?: string; revalidate: number }

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
  // EUC-KR 등 비UTF-8 응답은 바이트로 받아 직접 디코드
  if (opts.encoding) return new TextDecoder(opts.encoding).decode(await withTimeout(res.arrayBuffer(), 12_000))
  return withTimeout(res.text(), 12_000)
}

function round(v: number, p = 2): number {
  const f = 10 ** p
  return Math.round(v * f) / f
}

function recentPoints(points: Point[], years = 5): Point[] {
  const last = points[points.length - 1]
  if (!last) return []
  return points.filter((point) => point.t >= last.t - years * 365.25 * 864e5)
}

function errItem(key: IndicatorKey, e: unknown): Indicator {
  console.error(`[indicators] ${key} failed:`, e instanceof Error ? e.message : e)
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

// FRED 공식 API(JSON). 결측치는 value "."
export function parseFredJson(text: string): Point[] {
  const obs = (JSON.parse(text).observations ?? []) as { date: string; value: string }[]
  const out: Point[] = []
  for (const o of obs) {
    const v = parseFloat(o.value)
    if (!Number.isFinite(v)) continue
    const t = Date.parse(o.date)
    if (Number.isNaN(t)) continue
    out.push({ t, v })
  }
  return out
}

// fredgraph.csv(무키)는 Akamai WAF가 데이터센터 IP·비브라우저 지문을 차단해 Vercel에서 간헐 실패.
// FRED_API_KEY가 있으면 공식 API를 쓰고, 없으면 CSV 폴백(로컬 개발용).
async function fredSeries(id: string): Promise<Point[]> {
  const key = process.env.FRED_API_KEY
  if (key) {
    const json = await httpText(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${key}&file_type=json`,
      { revalidate: DAY },
    )
    return parseFredJson(json)
  }
  const csv = await httpText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, {
    ua: PLAIN_UA,
    revalidate: DAY,
  })
  return parseFredCsv(csv)
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
    const [eq, gdp] = await Promise.all([fredSeries('NCBEILQ027S'), fredSeries('GDP')])
    const series = computeBuffettSeries(eq, gdp)
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

// ── Free macro extensions ──────────────────────────────────────────────
// FRED는 이미 버핏 지수에 사용 중인 공식 데이터 경로라, 추가 지표도 같은 캐시·폴백 정책을 따른다.
export function rollingPercentChange(points: Point[], periods: number): Point[] {
  const out: Point[] = []
  for (let i = periods; i < points.length; i++) {
    const prev = points[i - periods].v
    if (prev === 0) continue
    out.push({ t: points[i].t, v: ((points[i].v / prev) - 1) * 100 })
  }
  return out
}

async function getHySpread(): Promise<Indicator> {
  try {
    const history = recentPoints(await fredSeries('BAMLH0A0HYM2'))
    if (history.length === 0) throw new Error('hyspread: empty series')
    const last = history[history.length - 1]
    return {
      key: 'hyspread',
      value: round(last.v, 2),
      asOf: dateLabel(last.t),
      zone: classify('hyspread', last.v),
      history: history.map((p) => ({ t: p.t, v: round(p.v, 2) })),
    }
  } catch (e) {
    return errItem('hyspread', e)
  }
}

async function getNfci(): Promise<Indicator> {
  try {
    const history = recentPoints(await fredSeries('NFCI'))
    if (history.length === 0) throw new Error('nfci: empty series')
    const last = history[history.length - 1]
    return {
      key: 'nfci',
      value: round(last.v, 2),
      asOf: dateLabel(last.t),
      zone: classify('nfci', last.v),
      history: history.map((p) => ({ t: p.t, v: round(p.v, 2) })),
    }
  } catch (e) {
    return errItem('nfci', e)
  }
}

async function getUsdKrw(): Promise<Indicator> {
  try {
    const history = recentPoints(rollingPercentChange(await fredSeries('DEXKOUS'), 20))
    if (history.length === 0) throw new Error('usdwkrw: insufficient series')
    const last = history[history.length - 1]
    return {
      key: 'usdwkrw',
      value: round(last.v, 2),
      asOf: dateLabel(last.t),
      zone: classify('usdwkrw', last.v),
      history: history.map((p) => ({ t: p.t, v: round(p.v, 2) })),
      note: '20거래일 기준',
    }
  } catch (e) {
    return errItem('usdwkrw', e)
  }
}

async function getExports(): Promise<Indicator> {
  try {
    // OECD의 한국 상품 수출 전년동월비. ponytail: 관세청 잠정치보다 시차는 있으나 장기 월간 시계열이 안정적이다.
    const history = recentPoints(await fredSeries('XTEXVA01KRM659S'), 10)
    if (history.length === 0) throw new Error('exports: empty series')
    const last = history[history.length - 1]
    return {
      key: 'exports',
      value: round(last.v, 1),
      asOf: monthLabel(last.t),
      zone: classify('exports', last.v),
      history: history.map((p) => ({ t: p.t, v: round(p.v, 1) })),
    }
  } catch (e) {
    return errItem('exports', e)
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

// ── 코스피 투자자별 수급 (네이버 금융) ─────────────────────────────────
// finance.naver.com 일별 투자자별 매매동향 iframe(EUC-KR HTML, 10거래일/페이지).
// 행: <td class="date2">YY.MM.DD</td> 뒤로 개인·외국인·기관계 순의 숫자 셀(억원).
export type FlowRow = { t: number; personal: number; foreign: number; institution: number }

export function parseInvestorTable(html: string): FlowRow[] {
  const N = '<td[^>]*>\\s*(-?[\\d,]+)\\s*<\\/td>'
  const re = new RegExp(`<td class="date2">(\\d{2})\\.(\\d{2})\\.(\\d{2})<\\/td>\\s*${N}\\s*${N}\\s*${N}`, 'g')
  const num = (s: string) => parseInt(s.replace(/,/g, ''), 10)
  const out: FlowRow[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const t = Date.parse(`20${m[1]}-${m[2]}-${m[3]}`)
    const [personal, foreign, institution] = [num(m[4]), num(m[5]), num(m[6])]
    if (!Number.isNaN(t) && [personal, foreign, institution].every(Number.isFinite))
      out.push({ t, personal, foreign, institution })
  }
  return out.sort((a, b) => a.t - b.t)
}

async function getKospiFlow(): Promise<Indicator> {
  try {
    // 과거분은 시드(scripts/backfill-kospiflow.mjs 생성)에서 읽고 최근 2페이지(~20거래일)만 API로 병합.
    // 원천(시드·네이버)은 억원 단위 — 표시는 조원이라 마지막에 ÷10,000.
    // ponytail: 시드 종료 후 20거래일 넘게 지나면 공백 — 백필 재실행으로 해결.
    const byT = new Map<number, FlowRow>(kospiflowSeed.map((r) => [r.t, r]))
    let latest: FlowRow | null = null
    // 서버는 UTC — KST(+9h)로 보정한 오늘 날짜에서 시작해 과거로 페이지네이션
    let biz = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10).replace(/-/g, '')
    try {
      for (let i = 0; i < 2; i++) {
        const html = await httpText(
          `https://finance.naver.com/sise/investorDealTrendDay.naver?bizdate=${biz}&sosok=01`,
          { ua: BROWSER_UA, referer: 'https://finance.naver.com/sise/', encoding: 'euc-kr', revalidate: HOUR },
        )
        const page = parseInvestorTable(html)
        if (page.length === 0) break
        for (const r of page) byT.set(r.t, r)
        const pageLast = page[page.length - 1]
        if (!latest || pageLast.t > latest.t) latest = pageLast
        biz = new Date(page[0].t - DAY * 1000).toISOString().slice(0, 10).replace(/-/g, '') // 최고(最古)일 하루 전
      }
    } catch (e) {
      // 실시간 조회 실패해도 시드만으로 렌더 (개인/기관 note만 생략됨)
      console.error('[indicators] kospiflow live fetch failed:', e instanceof Error ? e.message : e)
    }
    const rows = [...byT.values()].sort((a, b) => a.t - b.t)
    const last = rows[rows.length - 1]
    if (!last) throw new Error('kospiflow: no data (백필 미실행 + 최근 조회 실패)')
    const eokToJo = (v: number) => round(v / 10_000, 2)
    const fmt = (v: number) => (v > 0 ? '+' : '') + eokToJo(v).toFixed(2)
    const pick = (f: (r: FlowRow) => number): Point[] => rows.map((r) => ({ t: r.t, v: eokToJo(f(r)) }))
    const foreign = pick((r) => r.foreign)
    return {
      key: 'kospiflow',
      value: eokToJo(last.foreign),
      asOf: dateLabel(last.t),
      zone: classify('kospiflow', eokToJo(last.foreign)),
      history: foreign,
      // 순서 고정 — IndicatorChart의 시리즈 색 슬롯(외국인/기관/개인)과 매칭
      series: [
        { name: '외국인', points: foreign },
        { name: '기관', points: pick((r) => r.institution) },
        { name: '개인', points: pick((r) => r.personal) },
      ],
      // 개인/기관 값은 실시간 조회의 최신일이 화면의 최신일과 일치할 때만 표기
      ...(latest && latest.t === last.t
        ? { note: `개인 ${fmt(latest.personal)}조 · 기관 ${fmt(latest.institution)}조` }
        : {}),
    }
  } catch (e) {
    return errItem('kospiflow', e)
  }
}

// 10개 지표를 병렬로 수집. 개별 실패는 errItem으로 격리되어 페이지 전체를 죽이지 않는다.
export async function getAllIndicators(): Promise<Indicator[]> {
  const keys: IndicatorKey[] = ['buffett', 'cape', 'vix', 'feargreed', 'vkospi', 'kospiflow', 'hyspread', 'nfci', 'usdwkrw', 'exports']
  const settled = await Promise.allSettled([
    getBuffett(),
    getCape(),
    getVix(),
    getFearGreed(),
    getVkospi(),
    getKospiFlow(),
    getHySpread(),
    getNfci(),
    getUsdKrw(),
    getExports(),
  ])
  return settled.map((s, i) => (s.status === 'fulfilled' ? s.value : errItem(keys[i], s.reason)))
}
