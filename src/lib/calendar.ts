import { CALENDAR_COMPANIES } from '@/constants/companies'
import type { EventKind, EventMarket, EventStatus, MarketEvent } from './types'

const DAY = 86_400_000
const HOUR = 3_600_000
const ALPHA_DOCS = 'https://www.alphavantage.co/documentation/'

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

export function parseBlsCalendar(ics: string): MarketEvent[] {
  const unfolded = ics.replace(/\r?\n[ \t]/g, '')
  const events = unfolded.split('BEGIN:VEVENT').slice(1)
  const targets = [/consumer price index/i, /employment situation/i, /producer price index/i]
  return events.flatMap((block) => {
    const summary = block.match(/\nSUMMARY:(.+)/)?.[1]?.trim()
    const date = block.match(/\nDTSTART[^:]*:(\d{8})/)?.[1]
    const scheduledAt = date ? isoDate(date) : null
    if (!summary || !scheduledAt || !targets.some((target) => target.test(summary))) return []
    const title = /consumer price/i.test(summary) ? '미국 소비자물가(CPI)' : /employment/i.test(summary) ? '미국 고용보고서' : '미국 생산자물가(PPI)'
    return [{
      id: `bls:${date}:${title}`,
      kind: 'macro' as EventKind,
      market: 'US' as EventMarket,
      scheduledAt,
      title,
      status: 'confirmed' as EventStatus,
      source: 'U.S. Bureau of Labor Statistics',
      sourceUrl: 'https://www.bls.gov/schedule/news_release/bls.ics',
    }]
  })
}

export function parseFomcCalendar(html: string, year: number): MarketEvent[] {
  const section = html.match(new RegExp(`${year} FOMC Meetings([\\s\\S]*?)(?:${year - 1} FOMC Meetings|${year + 1} FOMC Meetings|$)`, 'i'))?.[1] ?? ''
  const monthMap: Record<string, number> = { January: 0, March: 2, April: 3, June: 5, July: 6, September: 8, October: 9, December: 11 }
  const re = /\b(January|March|April|June|July|September|October|December)\s+(\d{1,2})(?:\s*-\s*(\d{1,2}))?/g
  const out: MarketEvent[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(section))) {
    const day = Number(match[3] ?? match[2])
    const scheduledAt = new Date(Date.UTC(year, monthMap[match[1]], day)).toISOString()
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

export function parseBokMeetingCalendar(html: string, year: number): MarketEvent[] {
  const section = html.match(new RegExp(`>${year}<([\\s\\S]*?)(?:>${year - 1}<|$)`, 'i'))?.[1] ?? ''
  const text = section.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  const monthMap: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
  const re = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s*(\d{1,2})\b/g
  const out: MarketEvent[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    const scheduledAt = new Date(Date.UTC(year, monthMap[match[1]], Number(match[2]))).toISOString()
    out.push({
      id: `bok:${scheduledAt.slice(0, 10)}`,
      kind: 'macro',
      market: 'KR',
      scheduledAt,
      title: '한국은행 금통위 기준금리 결정',
      status: 'confirmed',
      source: 'Bank of Korea',
      sourceUrl: 'https://www.bok.or.kr/eng/main/contents.do?menuNo=400020',
    })
  }
  return out
}

function cleanDartTitle(value: string): string {
  return value.replace(/^\[[^\]]+\]\s*/, '').replace(/\s*\([^)]*\)$/, '').trim()
}

async function fetchDartReleased(): Promise<MarketEvent[]> {
  const key = process.env.DART_API_KEY
  if (!key) return []
  const end = new Date()
  const start = new Date(end.getTime() - 45 * DAY)
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replaceAll('-', '')
  const url = new URL('https://opendart.fss.or.kr/api/list.json')
  url.searchParams.set('crtfc_key', key)
  url.searchParams.set('bgn_de', ymd(start))
  url.searchParams.set('end_de', ymd(end))
  url.searchParams.set('page_count', '100')
  const res = await fetch(url, { next: { revalidate: 6 * HOUR } })
  if (!res.ok) throw new Error(`DART HTTP ${res.status}`)
  const json = (await res.json()) as { list?: Array<{ corp_name?: string; report_nm?: string; rcept_dt?: string; rcept_no?: string }> }
  const companies = new Map(CALENDAR_COMPANIES.filter((company) => company.market === 'KR').map((company) => [company.name, company]))
  return (json.list ?? []).flatMap((item) => {
    const company = item.corp_name ? companies.get(item.corp_name) : undefined
    const scheduledAt = item.rcept_dt ? isoDate(item.rcept_dt) : null
    const title = item.report_nm ?? ''
    if (!company || !scheduledAt || !/(잠정|매출액또는손익구조|영업\(잠정\))/i.test(title)) return []
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

async function fetchAlphaEarnings(): Promise<MarketEvent[]> {
  const key = process.env.ALPHA_VANTAGE_API_KEY
  if (!key) return []
  const url = new URL('https://www.alphavantage.co/query')
  url.searchParams.set('function', 'EARNINGS_CALENDAR')
  url.searchParams.set('horizon', '3month')
  url.searchParams.set('apikey', key)
  const res = await fetch(url, { next: { revalidate: 6 * HOUR } })
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`)
  return parseAlphaEarningsCalendar(await res.text())
}

async function fetchUsMacroEvents(): Promise<MarketEvent[]> {
  const year = new Date().getUTCFullYear()
  const [bls, fomc] = await Promise.allSettled([
    fetch('https://www.bls.gov/schedule/news_release/bls.ics', { next: { revalidate: DAY } }).then(async (res) => {
      if (!res.ok) throw new Error(`BLS HTTP ${res.status}`)
      return parseBlsCalendar(await res.text())
    }),
    fetch('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', { next: { revalidate: DAY } }).then(async (res) => {
      if (!res.ok) throw new Error(`Fed HTTP ${res.status}`)
      return parseFomcCalendar(await res.text(), year)
    }),
  ])
  return [
    ...(bls.status === 'fulfilled' ? bls.value : []),
    ...(fomc.status === 'fulfilled' ? fomc.value : []),
  ]
}

async function fetchKoreaMacroEvents(): Promise<MarketEvent[]> {
  const year = new Date().getUTCFullYear()
  const res = await fetch('https://www.bok.or.kr/eng/main/contents.do?menuNo=400020', { next: { revalidate: DAY } })
  if (!res.ok) throw new Error(`Bank of Korea HTTP ${res.status}`)
  return parseBokMeetingCalendar(await res.text(), year)
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
  const [usMacro, krMacro, earnings, dart] = await Promise.allSettled([fetchUsMacroEvents(), fetchKoreaMacroEvents(), fetchAlphaEarnings(), fetchDartReleased()])
  return normalizeEvents([
    ...(usMacro.status === 'fulfilled' ? usMacro.value : []),
    ...(krMacro.status === 'fulfilled' ? krMacro.value : []),
    ...(earnings.status === 'fulfilled' ? earnings.value : []),
    ...(dart.status === 'fulfilled' ? dart.value : []),
  ], now)
}

export async function getCalendarData(): Promise<{ events: MarketEvent[]; now: number }> {
  const now = Date.now()
  return { events: await getMarketEvents(now), now }
}

export function getUpcomingEvents(events: MarketEvent[], limit = 5, now = Date.now()): MarketEvent[] {
  return events.filter((event) => Date.parse(event.scheduledAt) >= now).slice(0, limit)
}
