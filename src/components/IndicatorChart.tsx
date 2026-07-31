'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { Point } from '@/lib/types'

type Series = { name: string; points: Point[] }

type Props = {
  data: Point[]
  color: string
  thresholds?: number[]
  unit?: string
  decimals?: number
  height?: number
  series?: Series[] // 전달 시 탭으로 대상을 골라 하나씩 표시 (data와 같은 날짜 그리드여야 함)
}

// 시리즈 고정 색 (외국인/기관/개인 순서). dataviz 검증: 카드 서피스 #0f1626에서 CVD ΔE 9.4·대비 3:1↑ 전 항목 PASS.
const SERIES_COLORS = ['#3987e5', '#d95926', '#199e70']

// UTC 고정: 로컬 시간대 게터를 쓰면 서버(UTC)와 브라우저(KST)가 다른 라벨을 만들어 하이드레이션 불일치(#418)
const p2 = (n: number) => String(n).padStart(2, '0')
const fmtMonth = (t: number) => {
  const d = new Date(t)
  return `${d.getUTCFullYear()}.${p2(d.getUTCMonth() + 1)}`
}
const fmtDay = (t: number) => {
  const d = new Date(t)
  return `${p2(d.getUTCMonth() + 1)}.${p2(d.getUTCDate())}`
}
const fmtDate = (t: number) => {
  const d = new Date(t)
  return `${d.getUTCFullYear()}.${p2(d.getUTCMonth() + 1)}.${p2(d.getUTCDate())}`
}
const DAILY_SPAN = 180 * 864e5 // 창이 이보다 짧으면 일 단위 라벨

const Y_W = 44
const PAD_T = 8
const PAD_R = 8
const X_H = 22
const TABS_H = 34
const YEAR = 31557600000

const RANGES = [
  { key: '1m', ko: '1개월', en: '1M', years: 1 / 12 },
  { key: '3m', ko: '3개월', en: '3M', years: 0.25 },
  { key: '6m', ko: '6개월', en: '6M', years: 0.5 },
  { key: '1y', ko: '1년', en: '1Y', years: 1 },
  { key: '3y', ko: '3년', en: '3Y', years: 3 },
  { key: '5y', ko: '5년', en: '5Y', years: 5 },
  { key: 'all', ko: '전체', en: 'All', years: null },
] as const

type RangeKey = (typeof RANGES)[number]['key']

type TabOpt = { key: string; ko: string; en: string }

function PillTabs({ value, onChange, color, options }: { value: string; onChange: (k: string) => void; color: string; options: readonly TabOpt[] }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-8)', justifyContent: 'flex-end' }}>
      {options.map((r) => {
        const on = r.key === value
        return (
          <button
            key={r.key}
            role="tab"
            aria-selected={on}
            aria-label={r.ko === r.en ? r.ko : `${r.ko} · ${r.en}`}
            onClick={() => onChange(r.key)}
            style={{
              font: 'inherit',
              cursor: 'pointer',
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              fontSize: 'var(--fs-scale)',
              fontWeight: on ? 'var(--fw-semibold)' : 'var(--fw-medium)',
              fontVariantNumeric: 'var(--numeric-metric)',
              lineHeight: 'var(--lh-badge)',
              color: on ? color : 'var(--faint)',
              border: `var(--border-width) solid ${on ? 'currentColor' : 'var(--border)'}`,
              background: on ? 'color-mix(in srgb, currentColor var(--badge-tint), transparent)' : 'transparent',
            }}
          >
            {r.ko}
          </button>
        )
      })}
    </div>
  )
}

export default function IndicatorChart({ data, color, thresholds = [], unit = '', decimals = 1, height = 220, series }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  const [hover, setHover] = useState<Point | null>(null)
  const [range, setRange] = useState<RangeKey>('1m')
  const [sel, setSel] = useState(0)
  const gid = 'g' + useId().replace(/[^a-zA-Z0-9]/g, '')

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, e.contentRect.width)))
    ro.observe(el)
    setW(Math.max(240, el.getBoundingClientRect().width || 640))
    return () => ro.disconnect()
  }, [])

  if (!data || data.length === 0) {
    return <div style={{ height, display: 'grid', placeItems: 'center', color: 'var(--chart-empty)', fontSize: 13 }}>차트 데이터 없음 · No chart data</div>
  }

  const multi = series && series.length > 1 ? series : null
  const selIdx = multi ? Math.min(sel, multi.length - 1) : 0
  const src = multi ? multi[selIdx].points : data
  const effColor = multi ? SERIES_COLORS[selIdx] : color

  // 데이터 스팬보다 긴 범위 탭과, 포인트가 너무 적어 무의미한 짧은 탭(분기·월간 데이터의 3개월 등)은 숨긴다
  const span = src[src.length - 1].t - src[0].t
  const lastT = src[src.length - 1].t
  const options = RANGES.filter(
    (r) => r.years == null || (span > r.years * YEAR && src.filter((d) => d.t >= lastT - r.years * YEAR).length >= 4),
  )
  const showTabs = options.length > 1
  const showBottom = showTabs || !!multi
  const active = options.some((r) => r.key === range) ? range : options[0].key
  const years = options.find((r) => r.key === active)?.years
  const view = years == null ? src : src.filter((d) => d.t >= lastT - years * YEAR)
  const svgH = height - (showBottom ? TABS_H : 0)

  const plotH = svgH - PAD_T - X_H
  const plotW = Math.max(40, w - Y_W - PAD_R)
  const vs = view.map((d) => d.v)
  const t0 = view[0].t
  const t1 = view[view.length - 1].t
  const lo = Math.min(...vs)
  const hi = Math.max(...vs)
  const pad = (hi - lo) * 0.12 || 1
  const vMin = lo - pad
  const vMax = hi + pad
  const X = (t: number) => Y_W + ((t - t0) / (t1 - t0 || 1)) * plotW
  const Y = (v: number) => PAD_T + (1 - (v - vMin) / (vMax - vMin || 1)) * plotH

  const line = view.map((d, i) => `${i ? 'L' : 'M'}${X(d.t).toFixed(1)},${Y(d.v).toFixed(1)}`).join(' ')
  const area = `${line} L${X(t1).toFixed(1)},${(PAD_T + plotH).toFixed(1)} L${X(t0).toFixed(1)},${(PAD_T + plotH).toFixed(1)} Z`

  const fmtTick = t1 - t0 < DAILY_SPAN ? fmtDay : fmtMonth
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => vMin + f * (vMax - vMin))
  const xTickCount = Math.max(2, Math.min(6, Math.floor(plotW / 110)))
  const xTicks = Array.from({ length: xTickCount }, (_, i) => t0 + (i / (xTickCount - 1)) * (t1 - t0))
  const nice = (v: number) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10)

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    if (px < Y_W) return setHover(null)
    const t = t0 + ((px - Y_W) / plotW) * (t1 - t0)
    let best = view[0]
    for (const d of view) if (Math.abs(d.t - t) < Math.abs(best.t - t)) best = d
    setHover(best)
  }

  return (
    <div ref={wrap} style={{ position: 'relative', width: '100%', minWidth: 0 }}>
      <svg width="100%" height={svgH} viewBox={`0 0 ${w} ${svgH}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={effColor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={effColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        {yTicks.map((v) => (
          <g key={`y${v}`}>
            <line x1={Y_W} x2={w - PAD_R} y1={Y(v)} y2={Y(v)} stroke="var(--chart-grid)" strokeDasharray="3 3" />
            <text x={Y_W - 8} y={Y(v) + 4} textAnchor="end" fill="var(--chart-axis)" fontSize="var(--fs-chart-tick)">
              {nice(v)}
            </text>
          </g>
        ))}
        {thresholds.filter((th) => th > vMin && th < vMax).map((th) => (
          <line key={`t${th}`} x1={Y_W} x2={w - PAD_R} y1={Y(th)} y2={Y(th)} stroke="var(--chart-ref)" strokeDasharray="4 4" />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={effColor} strokeWidth={2} />
        {xTicks.map((t, i) => (
          <text
            key={`x${i}`}
            x={Math.min(w - PAD_R, Math.max(Y_W, X(t)))}
            y={PAD_T + plotH + 18}
            textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
            fill="var(--chart-axis)"
            fontSize="var(--fs-chart-tick)"
          >
            {fmtTick(t)}
          </text>
        ))}
        {hover && (
          <g>
            <line x1={X(hover.t)} x2={X(hover.t)} y1={PAD_T} y2={PAD_T + plotH} stroke="var(--chart-ref)" />
            <circle cx={X(hover.t)} cy={Y(hover.v)} r={3.5} fill={effColor} stroke="var(--card)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {showBottom && (
        <div style={{ display: 'flex', justifyContent: multi ? 'space-between' : 'flex-end', alignItems: 'center', flexWrap: 'wrap', columnGap: 'var(--space-8)' }}>
          {multi && (
            <PillTabs
              value={String(selIdx)}
              onChange={(k) => {
                setSel(Number(k))
                setHover(null)
              }}
              color={effColor}
              options={multi.map((s, i) => ({ key: String(i), ko: s.name, en: s.name }))}
            />
          )}
          {showTabs && <PillTabs value={active} onChange={(k) => setRange(k as RangeKey)} color={color} options={options} />}
        </div>
      )}
      {hover && (
        <div style={{ position: 'absolute', left: Math.min(w - 130, Math.max(0, X(hover.t) - 60)), top: Math.max(0, Y(hover.v) - 52), pointerEvents: 'none', background: 'var(--chart-tooltip-bg)', border: 'var(--border-width) solid var(--chart-tooltip-border)', borderRadius: 'var(--radius-tooltip)', color: 'var(--chart-tooltip-fg)', fontSize: 'var(--fs-chart-tooltip)', padding: '6px 10px', fontVariantNumeric: 'var(--numeric-metric)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 11 }}>{t1 - t0 < DAILY_SPAN ? fmtDate(hover.t) : fmtMonth(hover.t)}</div>
          {hover.v.toFixed(decimals)}
          {unit}
        </div>
      )}
    </div>
  )
}
