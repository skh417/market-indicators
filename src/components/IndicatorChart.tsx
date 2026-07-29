'use client'

import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Point } from '@/lib/types'

const RANGES = [
  { label: '1Y', years: 1 },
  { label: '3Y', years: 3 },
  { label: '5Y', years: 5 },
  { label: '전체', years: null },
] as const

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

export default function IndicatorChart({
  data,
  color,
  thresholds = [],
  unit = '',
  decimals = 1,
  height = 220,
}: Props) {
  const [years, setYears] = useState<number | null>(null)

  if (!data || data.length === 0) {
    return <div style={{ height, display: 'grid', placeItems: 'center', color: '#475569', fontSize: 13 }}>차트 데이터 없음 · No chart data</div>
  }

  // 마지막 데이터 시점 기준으로 기간 필터 (오늘 기준이면 갱신 지연 시 구간이 비어 보임)
  const end = data[data.length - 1].t
  const cut = years == null ? -Infinity : new Date(end).setFullYear(new Date(end).getFullYear() - years)
  const view = data.filter((p) => p.t >= cut)

  const fmtVal = (v: number) => `${v.toFixed(decimals)}${unit}`
  const gradId = `grad-${color.replace('#', '')}`

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginBottom: 6 }}>
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setYears(r.years)}
            style={{
              padding: '2px 10px',
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #334155',
              cursor: 'pointer',
              background: years === r.years ? '#334155' : 'transparent',
              color: years === r.years ? '#e2e8f0' : '#64748b',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={view} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(t) => fmtMonth(Number(t))}
          tick={{ fill: '#64748b', fontSize: 11 }}
          minTickGap={44}
          tickMargin={8}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          width={44}
          domain={['auto', 'auto']}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          contentStyle={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 8,
            color: '#e2e8f0',
            fontSize: 13,
          }}
          labelFormatter={(t) => fmtMonth(Number(t))}
          formatter={(v) => [fmtVal(Number(v)), ''] as [string, string]}
        />
        {thresholds.map((th) => (
          <ReferenceLine key={th} y={th} stroke="#334155" strokeDasharray="4 4" />
        ))}
        <Area
          dataKey="v"
          type="monotone"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradId})`}
          isAnimationActive={false}
        />
      </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
