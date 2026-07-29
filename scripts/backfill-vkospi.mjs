// KRX Open API에서 VKOSPI(코스피 200 변동성지수) 5년치를 받아 src/data/vkospi-seed.ts 생성.
// 실행: node scripts/backfill-vkospi.mjs  (KRX_API_KEY는 환경변수 또는 .env.local에서 읽음)
// 재실행하면 시드가 최신으로 덮어써진다. 호출량 ≈ 영업일 수(~1,300회) — KRX 한도(10,000/일) 내.
import { readFileSync, writeFileSync } from 'node:fs'

let key = process.env.KRX_API_KEY
if (!key) {
  try {
    key = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/^KRX_API_KEY=(.+)$/m)?.[1]?.trim()
  } catch {}
}
if (!key) {
  console.error('KRX_API_KEY가 없습니다. .env.local에 KRX_API_KEY=... 를 추가하거나 환경변수로 넘겨주세요.')
  process.exit(1)
}

const DAY = 864e5
const ymdList = []
for (let t = Date.now() - 5 * 365 * DAY; t <= Date.now(); t += DAY) {
  const d = new Date(t)
  const wd = d.getUTCDay()
  if (wd === 0 || wd === 6) continue // 주말 제외 (공휴일은 응답이 비어서 자연 스킵)
  ymdList.push(d.toISOString().slice(0, 10).replace(/-/g, ''))
}

let done = 0
async function fetchDay(ymd) {
  const res = await fetch(`https://data-dbg.krx.co.kr/svc/apis/idx/drvprod_dd_trd?basDd=${ymd}`, {
    headers: { AUTH_KEY: key },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${ymd}`)
  const rows = (await res.json()).OutBlock_1 ?? []
  const r = rows.find((r) => r.IDX_NM === '코스피 200 변동성지수')
  done++
  if (done % 100 === 0) console.log(`${done}/${ymdList.length}...`)
  const v = r ? parseFloat(String(r.CLSPRC_IDX).replace(/,/g, '')) : NaN
  if (!Number.isFinite(v)) return null
  return { t: Date.parse(`${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`), v }
}

const out = []
for (let i = 0; i < ymdList.length; i += 8) {
  const part = await Promise.all(
    ymdList.slice(i, i + 8).map((d) => fetchDay(d).catch((e) => (console.warn(String(e)), null))),
  )
  out.push(...part.filter(Boolean))
}
out.sort((a, b) => a.t - b.t)

if (out.length === 0) {
  console.error('데이터를 하나도 받지 못했습니다. 키·이용신청 상태를 확인하세요.')
  process.exit(1)
}

writeFileSync(
  new URL('../src/data/vkospi-seed.ts', import.meta.url),
  `// scripts/backfill-vkospi.mjs가 생성 — 직접 수정하지 말 것. 비어 있으면 백필 미실행 상태.\nconst seed: { t: number; v: number }[] = ${JSON.stringify(out)}\nexport default seed\n`,
)
console.log(`${out.length}개 포인트 저장 → src/data/vkospi-seed.ts (${ymdList[0]} ~ ${ymdList[ymdList.length - 1]})`)
