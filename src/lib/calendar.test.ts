import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bokRateDecisionEvents, normalizeEvents, parseAlphaEarningsCalendar, parseDartList, parseFomcCalendar, parseFredReleaseDates } from './calendar'
import { CALENDAR_COMPANIES } from '@/constants/companies'
import type { MarketEvent } from './types'

test('parseAlphaEarningsCalendar: keeps only the tracked companies', () => {
  const csv = [
    'symbol,name,reportDate,fiscalDateEnding,estimate,currency',
    'AAPL,Apple Inc,2026-08-06,2026-06-30,1.25,USD',
    'ZZZZ,Other Corp,2026-08-06,2026-06-30,1.25,USD',
  ].join('\n')
  const events = parseAlphaEarningsCalendar(csv)
  assert.equal(events.length, 1)
  assert.equal(events[0].company, 'Apple')
  assert.equal(events[0].status, 'estimated')
  assert.equal(events[0].previous, '예상 EPS 1.25')
})

test('parseFredReleaseDates: maps release dates to confirmed macro events', () => {
  const events = parseFredReleaseDates(
    { release_dates: [{ date: '2026-09-11' }, { date: undefined }] },
    { id: 10, title: '미국 소비자물가(CPI)' },
  )
  assert.equal(events.length, 1)
  assert.equal(events[0].scheduledAt.slice(0, 10), '2026-09-11')
  assert.equal(events[0].title, '미국 소비자물가(CPI)')
  assert.equal(events[0].status, 'confirmed')
  assert.ok(events[0].sourceUrl.includes('rid=10'))
})

test('parseFomcCalendar: reads month/date div pairs and skips minutes-release dates', () => {
  const html = [
    '<h4>2026 FOMC Meetings</h4>',
    '<div class="fomc-meeting__month col-md-2"><strong>January</strong></div>',
    '<div class="fomc-meeting__date col-lg-1">27-28</div>',
    '<div>Minutes: <a href="#">PDF</a> (Released February 18, 2026)</div>',
    '<div class="fomc-meeting__month col-md-2"><strong>January/February</strong></div>',
    '<div class="fomc-meeting__date col-lg-1">31-1</div>',
    '<h4>2025 FOMC Meetings</h4>',
  ].join('\n')
  const events = parseFomcCalendar(html, 2026)
  assert.deepEqual(events.map((event) => event.scheduledAt.slice(0, 10)), ['2026-01-28', '2026-02-01'])
})

test('bokRateDecisionEvents: returns the seeded rate-decision dates for the year', () => {
  const events = bokRateDecisionEvents(2026)
  assert.equal(events.length, 8)
  assert.equal(events[0].scheduledAt.slice(0, 10), '2026-01-15')
  assert.ok(events.every((event) => event.market === 'KR' && event.status === 'confirmed'))
})

test('parseDartList: keeps only preliminary-earnings disclosures', () => {
  const samsung = CALENDAR_COMPANIES.find((company) => company.name === '삼성전자')!
  const events = parseDartList({
    list: [
      { report_nm: '연결재무제표기준영업(잠정)실적(공정공시)', rcept_dt: '20260708', rcept_no: '20260708000123' },
      { report_nm: '주요사항보고서(자기주식취득결정)', rcept_dt: '20260710', rcept_no: '20260710000456' },
    ],
  }, samsung)
  assert.equal(events.length, 1)
  assert.equal(events[0].company, '삼성전자')
  assert.equal(events[0].status, 'released')
  assert.ok(events[0].sourceUrl.includes('20260708000123'))
})

test('normalizeEvents: keeps the most authoritative duplicate and future events first', () => {
  const base: Omit<MarketEvent, 'id' | 'status' | 'scheduledAt'> = {
    kind: 'earnings', market: 'US', title: 'Apple 실적 발표', company: 'Apple', source: 'test', sourceUrl: 'https://example.com',
  }
  const now = Date.parse('2026-08-01')
  const events = normalizeEvents([
    { ...base, id: 'estimated', status: 'estimated', scheduledAt: '2026-08-06T00:00:00.000Z' },
    { ...base, id: 'confirmed', status: 'confirmed', scheduledAt: '2026-08-06T00:00:00.000Z' },
    { ...base, id: 'past', status: 'released', scheduledAt: '2026-07-25T00:00:00.000Z' },
  ], now)
  assert.equal(events.length, 2)
  assert.equal(events[0].id, 'confirmed')
})
