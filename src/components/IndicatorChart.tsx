'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { Point } from '@/lib/types'

type Props = {
  data: Point[]
  color: string
  thresholds?: number[]
  unit?: string
  decimals?: number
  height?: number
}

const fmtMonth = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

const Y_W = 44
const PAD_T = 8
const PAD_R = 8
const X_H = 22
const TABS_H = 34
const YEAR = 31557600000

const RANGES = [
  { key: '1y', ko: '1년', en: '1Y', years: 1 },
  { key: '3y', ko: '3년', en: '3Y', years: 3 },
  { key: '5y', ko: '5년', en: '5Y', years: 5 },
  { key: 'all', ko: '전체', en: 'All', years: null },
] as const

type RangeKey = (typeof RANGES)[number]['key']

function RangeTabs({ value, onChange, color, options }: { value: RangeKey; onChange: (k: RangeKey) => void; color: string; options: readonly (typeof RANGES)[number][] }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-8)', justifyContent: 'flex-end' }}>
      {options.map((r) => {
        const on = r.key === value
        return (
          <button
            key={r.key}
            role="tab"
            aria-selected={on}
            aria-label={`${r.ko} · ${r.en}`}
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

export default function IndicatorChart({ data, color, thresholds = [], unit = '', decimals = 1, height = 220 }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  const [hover, setHover] = useState<Point | null>(null)
  const [range, setRange] = useState<RangeKey>('all')
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

  // 데이터 스팬보다 긴 범위 탭은 숨긴다
  const span = data[data.length - 1].t - data[0].t
  const options = RANGES.filter((r) => r.years == null || span > r.years * YEAR)
  const showTabs = options.length > 1
  const active = options.some((r) => r.key === range) ? range : 'all'
  const years = options.find((r) => r.key === active)?.years
  const view = years == null ? data : data.filter((d) => d.t >= data[data.length - 1].t - years * YEAR)
  const svgH = height - (showTabs ? TABS_H : 0)

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
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
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
        <path d={line} fill="none" stroke={color} strokeWidth={2} />
        {xTicks.map((t, i) => (
          <text
            key={`x${i}`}
            x={Math.min(w - PAD_R, Math.max(Y_W, X(t)))}
            y={PAD_T + plotH + 18}
            textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
            fill="var(--chart-axis)"
            fontSize="var(--fs-chart-tick)"
          >
            {fmtMonth(t)}
          </text>
        ))}
        {hover && (
          <g>
            <line x1={X(hover.t)} x2={X(hover.t)} y1={PAD_T} y2={PAD_T + plotH} stroke="var(--chart-ref)" />
            <circle cx={X(hover.t)} cy={Y(hover.v)} r={3.5} fill={color} stroke="var(--card)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {showTabs && <RangeTabs value={active} onChange={setRange} color={color} options={options} />}
      {hover && (
        <div style={{ position: 'absolute', left: Math.min(w - 130, Math.max(0, X(hover.t) - 60)), top: Math.max(0, Y(hover.v) - 52), pointerEvents: 'none', background: 'var(--chart-tooltip-bg)', border: 'var(--border-width) solid var(--chart-tooltip-border)', borderRadius: 'var(--radius-tooltip)', color: 'var(--chart-tooltip-fg)', fontSize: 'var(--fs-chart-tooltip)', padding: '6px 10px', fontVariantNumeric: 'var(--numeric-metric)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 11 }}>{fmtMonth(hover.t)}</div>
          {hover.v.toFixed(decimals)}
          {unit}
        </div>
      )}
    </div>
  )
}
