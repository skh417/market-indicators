import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseFredCsv, parseFredJson, computeBuffettSeries, parseCapeCurrent, parseCapeTable } from './indicators'
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

test('classify: zone boundaries per indicator', () => {
  assert.equal(classify('buffett', 218.1)?.en, 'Significantly overvalued')
  assert.equal(classify('buffett', 100)?.en, 'Fair value')
  assert.equal(classify('cape', 41.77)?.en, 'Significantly overvalued')
  assert.equal(classify('vix', 16.13)?.ko, '안정')
  assert.equal(classify('feargreed', 43)?.ko, '공포')
  assert.equal(classify('feargreed', 80)?.en, 'Extreme Greed')
  assert.equal(classify('vix', null), null)
})
