import type { Indicator, Point } from './types'
import { LABELS } from '../constants/labels'
import { zoneThresholds } from '../constants/zones'

const YEAR_MS = 365 * 864e5

// 히스토리 전체 대신 프롬프트용 압축 통계만 추출
function stats(history: Point[]) {
  if (history.length === 0) return null
  const last = history[history.length - 1]
  const yearAgo = history.find((p) => p.t >= last.t - YEAR_MS)
  const vs = history.map((p) => p.v)
  return {
    최근값: last.v,
    '1년전값': yearAgo?.v ?? null,
    '기간최고(5년)': Math.max(...vs),
    '기간최저(5년)': Math.min(...vs),
  }
}

function summarize(indicators: Indicator[]) {
  return indicators.map((ind) => {
    const L = LABELS[ind.key]
    return {
      지표: `${L.ko} (${L.en})`,
      현재값: ind.value != null ? `${ind.value}${L.unit}` : '데이터 없음',
      기준일: ind.asOf,
      상태: ind.zone ? `${ind.zone.ko} (${ind.zone.en})` : '분류 불가',
      구간임계값: zoneThresholds(ind.key),
      설명: L.blurbKo,
      히스토리: stats(ind.history),
    }
  })
}

const SYSTEM = `당신은 시장 밸류에이션 대시보드의 분석 요약을 작성하는 금융 시장 분석가입니다.
사용자가 전달하는 JSON은 미국·한국 증시의 밸류에이션/심리 지표 현황입니다.

작성 규칙:
- 3~5개 섹션으로 구성. 각 섹션은 간결한 한국어 소제목(title, 15자 이내)과 본문(body)으로.
- 첫 섹션은 전체 시장 상황 종합 요약.
- 지표 간 상충 신호(예: 밸류에이션 vs 심리)가 있으면 별도 섹션으로 짚어줄 것.
- 마지막 섹션은 제목 '유의사항'으로, 정보 제공 목적이며 투자 조언이 아님을 한두 문장으로 명시.
- 본문은 한국어 평문. 마크다운 문법(#, *, - 등) 금지.
- 수치는 전달된 데이터만 인용하고 새로 만들어내지 말 것.
- 전체 길이는 공백 포함 1,500자 이내.`

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
