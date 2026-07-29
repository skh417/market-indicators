'use client'

import { useEffect, useState } from 'react'
import type { Section } from '@/lib/report'

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; sections: Section[]; generatedAt: number }
  | { phase: 'error'; message: string }

const CHARS_PER_TICK = 3
const TICK_MS = 16 // ≈190자/초

export default function ReportSection() {
  const [state, setState] = useState<State>({ phase: 'idle' })
  const [visible, setVisible] = useState(0) // 타자기 효과: 표시할 누적 글자 수

  const total =
    state.phase === 'done' ? state.sections.reduce((n, s) => n + s.title.length + s.body.length, 0) : 0

  useEffect(() => {
    if (state.phase !== 'done' || visible >= total) return
    const id = setInterval(() => setVisible((v) => Math.min(v + CHARS_PER_TICK, total)), TICK_MS)
    return () => clearInterval(id)
  }, [state.phase, visible, total])

  const generate = async () => {
    setState({ phase: 'loading' })
    setVisible(0)
    try {
      const res = await fetch('/api/report', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setState({ phase: 'done', sections: json.sections, generatedAt: json.generatedAt })
    } catch (e) {
      setState({ phase: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }

  // 섹션별 표시 구간 계산: 제목이 먼저, 이어서 본문이 점진 표시
  let offset = 0
  const rendered =
    state.phase === 'done'
      ? state.sections.map((s) => {
          const titleStart = offset
          const bodyStart = titleStart + s.title.length
          offset = bodyStart + s.body.length
          const titleShown = visible > titleStart
          const bodyChars = Math.max(0, Math.min(visible - bodyStart, s.body.length))
          const isTyping = visible < offset && visible >= titleStart
          return { ...s, titleShown, bodyText: s.body.slice(0, bodyChars), isTyping }
        })
      : []
  const animating = state.phase === 'done' && visible < total

  return (
    <section style={{ padding: 'var(--card-pad)', background: 'var(--surface-card)', border: 'var(--border-width) solid var(--border)', borderRadius: 'var(--radius-card)', display: 'flex', flexDirection: 'column', gap: 'var(--stack-card)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px 12px' }}>
        <h3 style={{ fontSize: 'var(--fs-card-title)', fontWeight: 'var(--fw-bold)', color: 'var(--fg)' }}>
          AI 분석 보고서
          <span style={{ fontWeight: 'var(--fw-medium)', color: 'var(--muted)', fontSize: 'var(--fs-card-title-en)' }}> · AI Analysis</span>
        </h3>
        <button
          onClick={generate}
          disabled={state.phase === 'loading' || animating}
          style={{
            font: 'inherit',
            cursor: state.phase === 'loading' || animating ? 'wait' : 'pointer',
            padding: '6px 16px',
            borderRadius: 'var(--radius-pill)',
            fontSize: 'var(--fs-badge)',
            fontWeight: 'var(--fw-semibold)',
            color: state.phase === 'loading' || animating ? 'var(--faint)' : 'var(--accent)',
            border: 'var(--border-width) solid currentColor',
            background: 'color-mix(in srgb, currentColor var(--badge-tint), transparent)',
          }}
        >
          {state.phase === 'loading' ? '분석 중…' : state.phase === 'done' ? '다시 생성' : '보고서 생성'}
        </button>
      </header>

      {state.phase === 'idle' && (
        <p style={{ fontSize: 'var(--fs-blurb)', color: 'var(--faint)' }}>
          버튼을 누르면 현재 5개 지표를 AI가 분석한 한국어 요약이 생성됩니다. 보고서는 1시간 단위로 캐시됩니다.
        </p>
      )}
      {state.phase === 'error' && (
        <p style={{ fontSize: 'var(--fs-blurb)', color: 'var(--muted)' }}>일시적으로 생성할 수 없습니다: {state.message}</p>
      )}
      {state.phase === 'done' && (
        <>
          {rendered.map(
            (s, i) =>
              s.titleShown && (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <h4 style={{ fontSize: 'var(--fs-blurb)', fontWeight: 'var(--fw-bold)', color: 'var(--accent)' }}>{s.title}</h4>
                  <p style={{ fontSize: 'var(--fs-blurb)', lineHeight: 'var(--lh-blurb)', color: 'var(--fg)', whiteSpace: 'pre-line' }}>
                    {s.bodyText}
                    {s.isTyping && <span style={{ color: 'var(--accent)' }}>▍</span>}
                  </p>
                </div>
              ),
          )}
          {!animating && (
            <footer style={{ fontSize: 'var(--fs-source)', color: 'var(--faint)' }}>
              생성: {new Date(state.generatedAt).toLocaleString('ko-KR')} · Gemini 3.6 Flash · 투자 조언이 아닙니다
            </footer>
          )}
        </>
      )}
    </section>
  )
}
