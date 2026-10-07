// 네이버 증권 투자자별 매매동향 API에서 코스피 개인/외국인/기관 순매수 ~3.3년치를 받아 src/data/kospiflow-seed.ts 생성.
// 실행: node --import tsx scripts/backfill-kospiflow.mjs  (tsx로 src/lib/indicators.ts의 parseInvestorTrend를 재사용)
// 재실행하면 시드가 최신으로 덮어써진다. 호출량 ≈ 5페이지(200행/페이지), 200ms 간격 순차 — 네이버에 부담 없는 수준.
import { writeFileSync } from 'node:fs'
import { parseInvestorTrend } from '../src/lib/indicators.ts'

const DAY = 864e5
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
const cutoff = Date.now() - 3.3 * 365 * DAY // 3년 탭이 뜨도록 여유 있게

const byT = new Map()

for (let page = 0; page < 30; page++) {
  // startIdx는 0부터 시작하는 페이지 번호(행 오프셋 아님), pageSize 최대 200
  const res = await fetch(
    `https://stock.naver.com/api/domestic/market/trend/daily?tradeType=KRX&marketType=KOSPI&startIdx=${page}&pageSize=200`,
    { headers: { 'User-Agent': UA, Accept: 'application/json', Referer: 'https://stock.naver.com/market/stock/kr/trend/trader' } },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status} @ page ${page}`)
  const rows = parseInvestorTrend(await res.text()) // 오름차순, rows[0]이 최고(最古)일
  if (rows.length === 0) break
  for (const r of rows) byT.set(r.t, r)
  console.log(`${page + 1}페이지, ${byT.size}포인트, 최고일 ${new Date(rows[0].t).toISOString().slice(0, 10)}`)
  if (rows[0].t < cutoff) break
  await new Promise((r) => setTimeout(r, 200))
}

const out = [...byT.values()].sort((a, b) => a.t - b.t)
if (out.length === 0) {
  console.error('데이터를 하나도 받지 못했습니다. 네이버 응답·파서를 확인하세요.')
  process.exit(1)
}

writeFileSync(
  new URL('../src/data/kospiflow-seed.ts', import.meta.url),
  `// scripts/backfill-kospiflow.mjs가 생성 — 직접 수정하지 말 것. 비어 있으면 백필 미실행 상태. 단위: 억원.\nconst seed: { t: number; personal: number; foreign: number; institution: number }[] = ${JSON.stringify(out)}\nexport default seed\n`,
)
console.log(
  `${out.length}개 포인트 저장 → src/data/kospiflow-seed.ts (${new Date(out[0].t).toISOString().slice(0, 10)} ~ ${new Date(out[out.length - 1].t).toISOString().slice(0, 10)})`,
)
