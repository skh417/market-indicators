import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeEvents, parseAlphaEarningsCalendar, parseBlsCalendar, parseBokMeetingCalendar, parseFomcCalendar } from './calendar'
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

test('parseBlsCalendar: keeps high-impact release types', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'DTSTART:20260812T083000',
    'SUMMARY:Consumer Price Index',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'DTSTART:20260820T100000',
    'SUMMARY:Productivity and Costs',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n')
  const events = parseBlsCalendar(ics)
  assert.equal(events.length, 1)
  assert.equal(events[0].title, '미국 소비자물가(CPI)')
  assert.equal(events[0].status, 'confirmed')
})

test('parseFomcCalendar: uses the final meeting day', () => {
  const html = '2026 FOMC Meetings January 27-28 March 16-17 2025 FOMC Meetings'
  const events = parseFomcCalendar(html, 2026)
  assert.deepEqual(events.map((event) => event.scheduledAt.slice(0, 10)), ['2026-01-28', '2026-03-17'])
})

test('parseBokMeetingCalendar: reads meeting dates from the selected year', () => {
  const html = '<h3>2026</h3><table><tr><td>Jan.16 (Thu)</td><td>Feb.25 (Tue)</td></tr></table><h3>2025</h3>'
  const events = parseBokMeetingCalendar(html, 2026)
  assert.deepEqual(events.map((event) => event.scheduledAt.slice(0, 10)), ['2026-01-16', '2026-02-25'])
  assert.ok(events.every((event) => event.market === 'KR'))
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
