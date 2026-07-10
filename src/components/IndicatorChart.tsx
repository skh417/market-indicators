'use client'

import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
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

export default function IndicatorChart({
  data,
  color,
  thresholds = [],
  unit = '',
  decimals = 1,
  height = 220,
}: Props) {
  if (!data || data.length === 0) {
    return <div style={{ height, display: 'grid', placeItems: 'center', color: '#475569', fontSize: 13 }}>차트 데이터 없음 · No chart data</div>
  }

  const fmtVal = (v: number) => `${v.toFixed(decimals)}${unit}`
  const gradId = `grad-${color.replace('#', '')}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
        <Brush
          dataKey="t"
          height={22}
          stroke={color}
          travellerWidth={8}
          tickFormatter={(t) => fmtMonth(Number(t))}
          fill="#0b1220"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
