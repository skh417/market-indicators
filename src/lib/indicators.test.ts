import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseFredCsv, parseFredJson, computeBuffettSeries, parseCapeCurrent, parseCapeTable, parseInvestorTrend } from './indicators'
import { classify } from '../constants/zones'

test('parseFredCsv: skips header + "." missing values', () => {
  const csv = 'observation_date,GDP\n2025-10-01,71863086\n2026-01-01,.\n2026-04-01,69511628\n'
  const pts = parseFredCsv(csv)
  assert.equal(pts.length, 2) // header + "." row dropped
  assert.equal(pts[0].v, 71863086)
  assert.equal(pts[1].v, 69511628)
})

test('parseFredJson: parses observations + "." missing values', () => {
  const json = JSON.stringify({
    observations: [
      { date: '2025-10-01', value: '71863086' },
      { date: '2026-01-01', value: '.' },
      { date: '2026-04-01', value: '69511628' },
    ],
  })
  const pts = parseFredJson(json)
  assert.equal(pts.length, 2)
  assert.equal(pts[0].v, 71863086)
  assert.equal(pts[1].t, Date.parse('2026-04-01'))
})

test('computeBuffettSeries: known inputs → ~218%', () => {
  const t = Date.parse('2026-01-01')
  const series = computeBuffettSeries([{ t, v: 69511628 }], [{ t, v: 31865.721 }])
  assert.equal(series.length, 1)
  assert.ok(Math.abs(series[0].v - 218.13) < 0.1, `got ${series[0].v}`)
})

test('computeBuffettSeries: drops quarters without matching GDP', () => {
  const a = Date.parse('2026-01-01')
  const b = Date.parse('2026-04-01')
  const series = computeBuffettSeries(
    [
      { t: a, v: 69511628 },
      { t: b, v: 70000000 },
    ],
    [{ t: a, v: 31865.721 }],
  )
  assert.equal(series.length, 1)
})

test('parseCapeCurrent: extracts value from meta text', () => {
  const html =
    '<meta name="description" content="Current Shiller PE Ratio is 41.77, a change of -0.20 from previous market close." />'
  assert.equal(parseCapeCurrent(html), 41.77)
})

test('parseCapeTable: parses rows, skips &#x2002; entity, sorts ascending', () => {
  const html =
    '<table id="datatable">\n<tr><th>Date</th><th>Value</th></tr>\n' +
    '<tr class="odd">\n<td>Jul 7, 2026</td>\n<td>\n&#x2002;\n41.77\n</td>\n</tr>\n' +
    '<tr class="even">\n<td>Jun 1, 2026</td>\n<td>\n&#x2002;\n41.32\n</td>\n</tr>'
  const pts = parseCapeTable(html)
  assert.equal(pts.length, 2)
  // ascending by date: Jun before Jul
  assert.equal(pts[0].v, 41.32)
  assert.equal(pts[1].v, 41.77)
  // must NOT have picked up "2002" from &#x2002;
  assert.ok(pts.every((p) => p.v < 100))
})

test('parseInvestorTrend: investorGubun 매핑, 원→억원, 최신일 우선 → 오름차순, 7100·9999 제외', () => {
  const amt = (investorGubun: string, diffValue: string) => ({ investorGubun, diffValue })
  const json = JSON.stringify({
    content: [
      {
        // 시드 2026-07-30 값(개인 -14309, 외국인 13280, 기관 805 억원)으로 합산되게 구성
        bizdate: '20260730',
        netAmounts: [
          amt('8000', '-1430900000000'),
          amt('9000', '1300000000000'),
          amt('9001', '28000000000'),
          amt('1000', '50000000000'),
          amt('2000', '10000000000'),
          amt('3000', '10000000000'),
          amt('3100', '5000000000'),
          amt('4000', '2000000000'),
          amt('5000', '1000000000'),
          amt('6000', '2000000000'),
          amt('7000', '500000000'),
          amt('7100', '99900000000000'), // 기타법인 — 무시
          amt('9999', '1'), // 기관계 — 무시
        ],
      },
      { bizdate: '20260729', netAmounts: [amt('8000', '-1970100000000'), amt('9000', '-1250200000000'), amt('6000', '3176900000000')] },
    ],
    totalElements: '5368',
  })
  const rows = parseInvestorTrend(json)
  assert.equal(rows.length, 2)
  // 오름차순: 07-29가 먼저
  assert.deepEqual(rows[0], { t: Date.parse('2026-07-29'), personal: -19701, foreign: -12502, institution: 31769 })
  assert.deepEqual(rows[1], { t: Date.parse('2026-07-30'), personal: -14309, foreign: 13280, institution: 805 })
})

test('parseInvestorTrend: 비정상 행 스킵, 억원 정수 반올림', () => {
  const json = JSON.stringify({
    content: [
      { bizdate: '20260101', netAmounts: [{ investorGubun: '8000', diffValue: '149999999' }] }, // 1.4999억 → 1
      { bizdate: '20260102' }, // netAmounts 없음
      { bizdate: '20260103', netAmounts: [] },
      { bizdate: '20260105', netAmounts: [{ investorGubun: '9000', diffValue: 'abc' }] }, // NaN
      { bizdate: 'bad', netAmounts: [{ investorGubun: '8000', diffValue: '1' }] },
    ],
  })
  assert.deepEqual(parseInvestorTrend(json), [{ t: Date.parse('2026-01-01'), personal: 1, foreign: 0, institution: 0 }])
  assert.deepEqual(parseInvestorTrend('{}'), [])
})

test('classify: kospiflow bands (조원 단위)', () => {
  assert.equal(classify('kospiflow', -1.5)?.en, 'Heavy foreign selling')
  assert.equal(classify('kospiflow', -0.1)?.ko, '외국인 순매도')
  assert.equal(classify('kospiflow', 0)?.ko, '외국인 순매수') // value < max 규칙상 0은 순매수 밴드
  assert.equal(classify('kospiflow', 0.5)?.en, 'Foreign net buying')
  assert.equal(classify('kospiflow', 2)?.en, 'Heavy foreign buying')
})

test('classify: zone boundaries per indicator', () => {
  assert.equal(classify('buffett', 218.1)?.en, 'Significantly overvalued')
  assert.equal(classify('buffett', 100)?.en, 'Fair value')
  assert.equal(classify('cape', 41.77)?.en, 'Significantly overvalued')
  assert.equal(classify('vix', 16.13)?.ko, '안정')
  assert.equal(classify('feargreed', 43)?.ko, '공포')
  assert.equal(classify('feargreed', 80)?.en, 'Extreme Greed')
  assert.equal(classify('vix', null), null)
})

test('classify: usdwkrw is a single neutral reference band', () => {
  assert.equal(classify('usdwkrw', 1385.2)?.ko, '참고 지표')
  assert.equal(classify('usdwkrw', 900)?.ko, '참고 지표')
  assert.equal(classify('usdwkrw', null), null)
})
