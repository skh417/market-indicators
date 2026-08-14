import { CALENDAR_COMPANIES, type CalendarCompany } from '@/constants/companies'
import type { EventKind, EventMarket, EventStatus, MarketEvent } from './types'

const DAY = 86_400_000
const HOUR = 3_600_000
const ALPHA_DOCS = 'https://www.alphavantage.co/documentation/'
// bls.gov 등 Akamai 뒤 사이트는 UA 없는 요청을 데이터센터에서 차단할 수 있다
const BROWSER_HEADERS = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' }

function fulfilled<T>(label: string, result: PromiseSettledResult<T[]>): T[] {
  if (result.status === 'fulfilled') return result.value
  console.warn(`[calendar] ${label} 수집 실패:`, result.reason instanceof Error ? result.reason.message : result.reason)
  return []
}

function isoDate(value: string): string | null {
  const m = value.match(/(\d{4})(\d{2})(\d{2})/)
  if (!m) return null
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toISOString()
}

function escapeCsvRow(row: string): string[] {
  const out: string[] = []
  let value = ''
  let quoted = false
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (ch === '"') {
      if (quoted && row[i + 1] === '"') {
        value += '"'
        i++
      } else quoted = !quoted
    } else if (ch === ',' && !quoted) {
      out.push(value.trim())
      value = ''
    } else value += ch
  }
  out.push(value.trim())
  return out
}

export function parseAlphaEarningsCalendar(csv: string): MarketEvent[] {
  const rows = csv.trim().split(/\r?\n/)
  if (rows.length < 2) return []
  const header = escapeCsvRow(rows[0]).map((v) => v.toLowerCase())
  const index = (names: string[]) => header.findIndex((h) => names.includes(h))
  const symbolAt = index(['symbol'])
  const dateAt = index(['reportdate', 'date'])
  const fiscalAt = index(['fiscaldateending', 'fiscal date ending'])
  const estimateAt = index(['estimate'])
  if (symbolAt < 0 || dateAt < 0) return []

  const companies = new Map(CALENDAR_COMPANIES.flatMap((company) => company.symbols.map((symbol) => [symbol.toUpperCase(), company])))
  const out: MarketEvent[] = []
  for (const row of rows.slice(1)) {
    const cols = escapeCsvRow(row)
    const company = companies.get((cols[symbolAt] ?? '').toUpperCase())
    const date = cols[dateAt] ? isoDate(cols[dateAt].replaceAll('-', '')) : null
    if (!company || !date) continue
    const estimate = estimateAt >= 0 ? cols[estimateAt] : ''
    out.push({
      id: `alpha:${company.market}:${cols[symbolAt]}:${date.slice(0, 10)}`,
      kind: 'earnings',
      market: company.market,
      scheduledAt: date,
      title: `${company.name} 실적 발표`,
      company: company.name,
      fiscalQuarter: fiscalAt >= 0 ? cols[fiscalAt] || undefined : undefined,
      status: 'estimated',
      source: 'Alpha Vantage',
      sourceUrl: ALPHA_DOCS,
      ...(estimate ? { previous: `예상 EPS ${estimate}` } : {}),
    })
  }
  return out
}

// bls.gov는 데이터센터 IP를 403으로 차단해서(2026-08 확인) 이미 프로덕션에서 검증된
// FRED 인증 API의 릴리스 일정으로 같은 발표 날짜를 가져온다.
const FRED_RELEASES = [
  { id: 10, title: '미국 소비자물가(CPI)' },
  { id: 46, title: '미국 생산자물가(PPI)' },
  { id: 50, title: '미국 고용보고서' },
] as const

export function parseFredReleaseDates(json: { release_dates?: Array<{ date?: string }> }, release: { id: number; title: string }): MarketEvent[] {
  return (json.release_dates ?? []).flatMap((item) => {
    const scheduledAt = item.date ? isoDate(item.date.replaceAll('-', '')) : null
    if (!scheduledAt) return []
    return [{
      id: `bls:${item.date}:${release.title}`,
      kind: 'macro' as EventKind,
      market: 'US' as EventMarket,
      scheduledAt,
      title: release.title,
      status: 'confirmed' as EventStatus,
      source: 'U.S. Bureau of Labor Statistics · FRED',
      sourceUrl: `https://fred.stlouisfed.org/release?rid=${release.id}`,
    }]
  })
}

async function fetchFredReleaseSchedule(): Promise<MarketEvent[]> {
  const key = process.env.FRED_API_KEY
  if (!key) return []
  const start = new Date(Date.now() - 14 * DAY).toISOString().slice(0, 10)
  const results = await Promise.allSettled(FRED_RELEASES.map(async (release) => {
    const url = new URL('https://api.stlouisfed.org/fred/release/dates')
    url.searchParams.set('release_id', String(release.id))
    url.searchParams.set('realtime_start', start)
    url.searchParams.set('realtime_end', '9999-12-31')
    url.searchParams.set('include_release_dates_with_no_data', 'true')
    url.searchParams.set('file_type', 'json')
    url.searchParams.set('api_key', key)
    const res = await fetch(url, { next: { revalidate: DAY } })
    if (!res.ok) throw new Error(`FRED HTTP ${res.status}`)
    return parseFredReleaseDates((await res.json()) as { release_dates?: Array<{ date?: string }> }, release)
  }))
  return results.flatMap((result, i) => fulfilled(`FRED ${FRED_RELEASES[i].title}`, result))
}

const FOMC_MONTHS: Record<string, number> = { January: 0, February: 1, March: 2, April: 3, May: 4, June: 5, July: 6, August: 7, September: 8, October: 9, November: 10, December: 11 }

export function parseFomcCalendar(html: string, year: number): MarketEvent[] {
  const section = html.match(new RegExp(`${year} FOMC Meetings([\\s\\S]*?)(?:${year - 1} FOMC Meetings|${year + 1} FOMC Meetings|$)`, 'i'))?.[1] ?? ''
  // Fed 페이지는 월(fomc-meeting__month)과 일(fomc-meeting__date)을 별도 div로 렌더링한다.
  // 텍스트만 훑으면 의사록 공개일("Released February 18, 2026")까지 잡혀서 div 쌍으로 파싱한다.
  const re = /fomc-meeting__month[^>]*>\s*(?:<strong>)?\s*([A-Za-z]+(?:\/[A-Za-z]+)?)[\s\S]*?fomc-meeting__date[^>]*>\s*(\d{1,2})(?:\s*-\s*(\d{1,2}))?/g
  const out: MarketEvent[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(section))) {
    // "January/February"처럼 월을 걸치는 회의는 마지막 날이 속한 월을 쓴다
    const month = FOMC_MONTHS[match[1].split('/').pop() ?? '']
    if (month === undefined) continue
    const day = Number(match[3] ?? match[2])
    const scheduledAt = new Date(Date.UTC(year, month, day)).toISOString()
    out.push({
      id: `fomc:${scheduledAt.slice(0, 10)}`,
      kind: 'macro',
      market: 'US',
      scheduledAt,
      title: 'FOMC 금리 결정',
      status: 'confirmed',
      source: 'Federal Reserve',
      sourceUrl: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
    })
  }
  return out
}

// ponytail: 한국은행은 미래 회의 일정을 파싱 가능한 페이지로 제공하지 않는다(영문 일정은 2025년에서
// 멈췄고 국문 페이지는 지난 회의 자료만 나열). 연 1회(10월 말) 발표되는 확정 일정을 시드로 관리하고,
// 차년도 일정 보도자료가 나오면 여기에 추가할 것.
const BOK_RATE_DECISIONS: Record<number, string[]> = {
  2026: ['2026-01-15', '2026-02-26', '2026-04-10', '2026-05-28', '2026-07-16', '2026-08-27', '2026-10-22', '2026-11-26'],
}

export function bokRateDecisionEvents(year = new Date().getUTCFullYear()): MarketEvent[] {
  return [...(BOK_RATE_DECISIONS[year] ?? []), ...(BOK_RATE_DECISIONS[year + 1] ?? [])].map((day) => ({
    id: `bok:${day}`,
    kind: 'macro',
    market: 'KR',
    scheduledAt: `${day}T00:00:00.000Z`,
    title: '한국은행 금통위 기준금리 결정',
    status: 'confirmed',
    source: 'Bank of Korea',
    sourceUrl: 'https://www.bok.or.kr/portal/singl/crncyPolicyDrcMtg/listYear.do?mtgSe=A&menuNo=200755',
  }))
}

function cleanDartTitle(value: string): string {
  return value.replace(/^\[[^\]]+\]\s*/, '').replace(/\s*\([^)]*\)$/, '').trim()
}

export type DartList = { list?: Array<{ report_nm?: string; rcept_dt?: string; rcept_no?: string }> }

export function parseDartList(json: DartList, company: CalendarCompany): MarketEvent[] {
  return (json.list ?? []).flatMap((item) => {
    const scheduledAt = item.rcept_dt ? isoDate(item.rcept_dt) : null
    const title = item.report_nm ?? ''
    if (!scheduledAt || !/(잠정|매출액또는손익구조|영업\(잠정\))/i.test(title)) return []
    return [{
      id: `dart:${item.rcept_no ?? `${company.name}:${scheduledAt}`}`,
      kind: 'earnings' as EventKind,
      market: 'KR' as EventMarket,
      scheduledAt,
      title: `${company.name} ${cleanDartTitle(title)}`,
      company: company.name,
      status: 'released' as EventStatus,
      source: 'OpenDART',
      sourceUrl: item.rcept_no ? `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}` : company.irUrl,
    }]
  })
}

async function fetchDartReleased(): Promise<MarketEvent[]> {
  const key = process.env.DART_API_KEY
  if (!key) return []
  const end = new Date()
  const start = new Date(end.getTime() - 45 * DAY)
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replaceAll('-', '')
  // 전체 공시는 45일에 수만 건이라 최근 100건만 봐서는 추적 기업이 걸리지 않는다.
  // 기업별 고유번호(corp_code)로 나눠 조회한다.
  const companies = CALENDAR_COMPANIES.filter((company) => company.dartCode)
  const results = await Promise.allSettled(companies.map(async (company) => {
    const url = new URL('https://opendart.fss.or.kr/api/list.json')
    url.searchParams.set('crtfc_key', key)
    url.searchParams.set('corp_code', company.dartCode as string)
    url.searchParams.set('bgn_de', ymd(start))
    url.searchParams.set('end_de', ymd(end))
    url.searchParams.set('page_count', '100')
    const res = await fetch(url, { next: { revalidate: 6 * HOUR } })
    if (!res.ok) throw new Error(`DART HTTP ${res.status}`)
    return parseDartList((await res.json()) as DartList, company)
  }))
  return results.flatMap((result, i) => fulfilled(`DART ${companies[i].name}`, result))
}

async function fetchAlphaEarnings(): Promise<MarketEvent[]> {
  const key = process.env.ALPHA_VANTAGE_API_KEY
  if (!key) return []
  const url = new URL('https://www.alphavantage.co/query')
  url.searchParams.set('function', 'EARNINGS_CALENDAR')
  url.searchParams.set('horizon', '3month')
  url.searchParams.set('apikey', key)
  const res = await fetch(url, { next: { revalidate: 6 * HOUR } })
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`)
  const text = await res.text()
  // 호출 한도 초과 시 CSV 대신 JSON 안내문이 200으로 온다 — 성공으로 캐시되지 않게 실패 처리
  if (text.trimStart().startsWith('{')) throw new Error(`Alpha Vantage 비정상 응답: ${text.slice(0, 120)}`)
  return parseAlphaEarningsCalendar(text)
}

async function fetchUsMacroEvents(): Promise<MarketEvent[]> {
  const year = new Date().getUTCFullYear()
  const [bls, fomc] = await Promise.allSettled([
    fetchFredReleaseSchedule(),
    fetch('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', { headers: BROWSER_HEADERS, next: { revalidate: DAY } }).then(async (res) => {
      if (!res.ok) throw new Error(`Fed HTTP ${res.status}`)
      return parseFomcCalendar(await res.text(), year)
    }),
  ])
  return [...fulfilled('BLS 일정(FRED)', bls), ...fulfilled('FOMC', fomc)]
}

const STATUS_WEIGHT: Record<EventStatus, number> = { released: 3, confirmed: 2, estimated: 1 }
const KIND_WEIGHT: Record<EventKind, number> = { macro: 2, earnings: 1 }

export function normalizeEvents(events: MarketEvent[], now = Date.now()): MarketEvent[] {
  const byKey = new Map<string, MarketEvent>()
  for (const event of events) {
    const key = `${event.kind}:${event.market}:${event.company ?? event.title}:${event.scheduledAt.slice(0, 10)}`
    const current = byKey.get(key)
    if (!current || STATUS_WEIGHT[event.status] > STATUS_WEIGHT[current.status]) byKey.set(key, event)
  }
  return [...byKey.values()]
    .filter((event) => Date.parse(event.scheduledAt) >= now - 14 * DAY)
    .sort((a, b) => {
      const aFuture = Date.parse(a.scheduledAt) >= now ? 0 : 1
      const bFuture = Date.parse(b.scheduledAt) >= now ? 0 : 1
      return aFuture - bFuture || Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt) || KIND_WEIGHT[b.kind] - KIND_WEIGHT[a.kind]
    })
}

export async function getMarketEvents(now = Date.now()): Promise<MarketEvent[]> {
  const [usMacro, earnings, dart] = await Promise.allSettled([fetchUsMacroEvents(), fetchAlphaEarnings(), fetchDartReleased()])
  return normalizeEvents([
    ...fulfilled('미국 거시', usMacro),
    ...bokRateDecisionEvents(),
    ...fulfilled('Alpha Vantage 실적', earnings),
    ...fulfilled('DART', dart),
  ], now)
}

export async function getCalendarData(): Promise<{ events: MarketEvent[]; now: number }> {
  const now = Date.now()
  return { events: await getMarketEvents(now), now }
}

export function getUpcomingEvents(events: MarketEvent[], limit = 5, now = Date.now()): MarketEvent[] {
  return events.filter((event) => Date.parse(event.scheduledAt) >= now).slice(0, limit)
}
