import type { Indicator, IndicatorKey, Point } from './types'
import { LABELS } from '../constants/labels'
import { zoneBandsKo } from '../constants/zones'

const MONTH_MS = 30 * 864e5
const r2 = (v: number) => Math.round(v * 100) / 100

// 창 길이의 2배보다 오래된 기준점이면 null (분기 데이터의 1개월변화 방지)
function delta(history: Point[], last: Point, windowMs: number): number | null {
  let ref: Point | null = null
  for (const p of history) {
    if (p.t > last.t - windowMs) break
    ref = p
  }
  return ref && ref.t >= last.t - 2 * windowMs ? r2(last.v - ref.v) : null
}

// 히스토리 전체 대신 프롬프트용 압축 통계만 추출
export function stats(history: Point[]) {
  if (history.length === 0) return null
  const last = history[history.length - 1]
  const vs = history.map((p) => p.v)
  const y = history.filter((p) => p.t >= last.t - 365 * 864e5).map((p) => p.v)
  const d0 = new Date(history[0].t)
  return {
    최근값: last.v,
    '1개월변화': delta(history, last, MONTH_MS),
    '3개월변화': delta(history, last, 3 * MONTH_MS),
    '1년변화': delta(history, last, 12 * MONTH_MS),
    역대백분위: Math.round((vs.filter((v) => v <= last.v).length / vs.length) * 100),
    '52주최고': Math.max(...y),
    '52주최저': Math.min(...y),
    역대최고: Math.max(...vs),
    역대최저: Math.min(...vs),
    데이터시작: `${d0.getFullYear()}.${String(d0.getMonth() + 1).padStart(2, '0')}`,
  }
}

// kospiflow 전용: series(외국인/기관/개인)에서 당일·누적·연속일 추출. 단위: 조원
export function flowStats(series: { name: string; points: Point[] }[]) {
  const sum = (pts: Point[], ms: number) => {
    const last = pts[pts.length - 1]
    return r2(pts.filter((p) => p.t >= last.t - ms).reduce((a, p) => a + p.v, 0))
  }
  const streak = (pts: Point[]) => {
    let n = 0
    for (let i = pts.length - 1; i >= 0 && pts[i].v !== 0 && Math.sign(pts[i].v) === Math.sign(pts[pts.length - 1].v); i--) n++
    return n ? `${n}거래일 연속 ${pts[pts.length - 1].v > 0 ? '순매수' : '순매도'}` : '보합'
  }
  return Object.fromEntries(
    series.map((s) => [
      s.name,
      s.points.length === 0
        ? null
        : {
            당일: s.points[s.points.length - 1].v,
            '1개월누적': sum(s.points, MONTH_MS),
            '3개월누적': sum(s.points, 3 * MONTH_MS),
            연속: streak(s.points),
          },
    ]),
  )
}

const CADENCE: Record<IndicatorKey, string> = {
  buffett: '분기',
  cape: '월간',
  vix: '일간',
  feargreed: '일간',
  vkospi: '일간(거래일)',
  kospiflow: '일간(거래일)',
  usdwkrw: '일간(거래일)',
}

function summarize(indicators: Indicator[]) {
  return indicators.map((ind) => {
    const L = LABELS[ind.key]
    const last = ind.history[ind.history.length - 1]
    return {
      지표: `${L.ko} (${L.en})`,
      현재값: ind.value != null ? `${ind.value}${L.unit}` : '데이터 없음',
      기준일: ind.asOf,
      주기: CADENCE[ind.key],
      경과일: last ? Math.floor((Date.now() - last.t) / 864e5) : null,
      상태: ind.zone ? `${ind.zone.ko} (${ind.zone.en})` : '분류 불가',
      구간기준: zoneBandsKo(ind.key),
      설명: L.blurbKo,
      ...(ind.error ? { 오류: ind.error } : {}),
      ...(ind.series ? { 수급상세: flowStats(ind.series) } : {}),
      히스토리: stats(ind.history),
    }
  })
}

const SYSTEM = `당신은 시장 밸류에이션 대시보드의 AI 분석 리포트를 작성하는 금융 시장 분석가입니다.
입력 JSON은 미국·한국 증시 지표 7종의 현재값과 압축 통계입니다.

필드 안내:
- 역대백분위: 현재값이 데이터시작 이후 전체 히스토리에서 낮은 쪽 기준 몇 %에 위치하는지 (100에 가까울수록 역사적 고점권). 지표마다 데이터시작이 크게 다르므로 역대최고·최저를 인용할 때는 기간을 함께 밝힐 것.
- 1개월변화/3개월변화/1년변화: 현재값에서 해당 시점 값을 뺀 것. null이면 데이터 주기상 계산 불가.
- 52주최고/최저: 최근 1년 범위. 역대최고/최저: 데이터시작 이후 전체 범위.
- 구간기준: 값을 해석하는 구간별 기준.
- 주기·경과일: 갱신 주기와 마지막 데이터 이후 경과일. 경과일이 주기에 비해 길면(예: 분기 지표의 수개월 경과) 본문에서 오래된 데이터임을 밝힐 것.
- 오류: 이 필드가 있으면 해당 지표는 수집 실패 상태. 수치를 추정하거나 지어내지 말고 확인 불가라고만 언급.
- 수급상세: 코스피 투자자별(외국인·기관·개인) 당일·1개월/3개월 누적 순매수(조원)와 연속 매매일.

분석 원칙:
1. 지표를 세 축으로 묶어 교차 해석할 것: 밸류에이션(버핏 지수·CAPE), 심리(VIX·VKOSPI·공포탐욕), 한국 수급·환율(코스피 투자자별 수급·원/달러 환율).
2. 모든 판단에 근거 수치를 붙일 것. 현재 위치는 역대백분위와 구간기준으로, 최근 흐름은 1개월/3개월 변화와 수급 누적·연속일로 말할 것.
3. 축 사이 방향이 어긋나면(예: 밸류에이션은 고평가인데 심리는 안정, 지수 부진에도 외국인 순매수) 그 괴리를 명시적으로 짚고 가능한 해석을 한두 가지 제시할 것.
4. 단순 수치 나열이나 차트 묘사 금지. "무엇이, 어느 수준에서, 언제부터, 어느 방향으로"가 드러나는 문장으로 쓸 것.

섹션 구성 (정확히 이 순서로 6개):
1. '종합 진단' — 세 축을 관통하는 현재 시장 상황 요약.
2. '밸류에이션' — 버핏 지수·CAPE의 역사적 위치와 최근 변화.
3. '심리' — 미국·한국 변동성과 공포탐욕 지수의 흐름.
4. '한국 수급과 환율' — 외국인·기관·개인 수급과 원/달러 환율 수준의 흐름.
5. '주목할 포인트' — 상충 신호, 구간 경계에 근접한 지표(현재값이 어느 기준선에 가까운지), 앞으로 확인할 변화.
6. '유의사항' — 정보 제공 목적이며 투자 조언이 아님을 한두 문장으로.

형식:
- 각 섹션은 title(15자 이내)과 body(한국어 평문, 마크다운 문법 금지).
- 수치는 전달된 데이터만 인용하고 새로 만들지 말 것.
- 전체 길이는 공백 포함 2,200자 이내.`

export type Section = { title: string; body: string }

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> }
    finishReason?: string
  }>
  promptFeedback?: { blockReason?: string }
  error?: { message?: string }
}

export async function generateReport(indicators: Indicator[]): Promise<Section[]> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY 미설정')

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(summarize(indicators), null, 1) }] }],
        generationConfig: {
          // thinking 토큰이 출력 한도에 합산되므로 여유 있게
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              sections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { title: { type: 'string' }, body: { type: 'string' } },
                  required: ['title', 'body'],
                },
              },
            },
            required: ['sections'],
          },
        },
      }),
    },
  )
  const json = (await res.json()) as GeminiResponse
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${json.error?.message ?? '알 수 없는 오류'}`)
  if (json.promptFeedback?.blockReason || json.candidates?.[0]?.finishReason === 'SAFETY') {
    throw new Error('분석 생성이 거부되었습니다. 잠시 후 다시 시도해 주세요.')
  }
  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('')
    .trim()
  if (!text) throw new Error('빈 응답')

  const { sections } = JSON.parse(text) as { sections?: Section[] }
  if (!sections?.length) throw new Error('섹션 없는 응답')
  return sections
}
