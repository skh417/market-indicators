import { unstable_cache } from 'next/cache'
import { getAllIndicators } from '@/lib/indicators'
import { generateReport } from '@/lib/report'

// 지표 수집(외부 API 5곳) + 생성까지의 여유
export const maxDuration = 60

// ponytail: 공개 버튼의 비용 상한 — 보고서를 1시간 캐시(지표 갱신 주기와 동일).
// 같은 시간대의 재클릭·타 사용자 클릭은 캐시 반환이라 API 호출이 시간당 1회로 묶인다.
const cachedReport = unstable_cache(
  async () => {
    const indicators = await getAllIndicators()
    const sections = await generateReport(indicators)
    return { sections, generatedAt: Date.now() }
  },
  ['ai-report-v2'],
  { revalidate: 3600 },
)

export async function POST() {
  try {
    return Response.json(await cachedReport())
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json(
      { error: msg.includes('GEMINI_API_KEY') ? 'API 키가 설정되지 않았습니다 (.env.local의 GEMINI_API_KEY)' : msg },
      { status: 503 },
    )
  }
}
