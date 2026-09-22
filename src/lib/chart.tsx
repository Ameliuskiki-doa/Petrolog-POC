/**
 * Chart conventions (validated with the dataviz palette checker):
 * - Categorical slots are assigned in fixed order, never cycled. Business lines always use
 *   HL = slot orange, PS = slot blue, GS = slot aqua (see businessLines in data/core.ts).
 * - GS aqua is < 3:1 on white → always show a legend / direct labels or a table next to it.
 * - One y-axis per chart. Thin marks, 2px lines, rounded bar ends, recessive grid.
 * - Status colours (good / warn / bad) are reserved for meaning, never for "series 4".
 */
import type { ReactNode } from 'react'

export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'] as const
export const NEUTRAL = '#94a3b8'
export const NEUTRAL_LIGHT = '#cbd5e1'
export const STATUS = { good: '#059669', warn: '#d97706', bad: '#dc2626' } as const

export const GRID = '#e2e8f0'
export const AXIS = { fontSize: 11, fill: '#64748b' }

/** Spread onto <XAxis>/<YAxis>: recessive axis styling */
export const axisProps = { tick: AXIS, tickLine: false, axisLine: { stroke: GRID } } as const

/** Recharts custom tooltip content */
export function ChartTooltip({
  active,
  payload,
  label,
  format = (v: number) => String(v),
  labelFormat,
}: {
  active?: boolean
  payload?: { name?: string; value?: number | string; color?: string; dataKey?: string | number }[]
  label?: ReactNode
  format?: (v: number) => string
  labelFormat?: (l: ReactNode) => ReactNode
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <div className="mb-1 font-semibold text-slate-800">{labelFormat ? labelFormat(label) : label}</div>}
      {payload.map((p) => (
        <div key={String(p.dataKey ?? p.name)} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}</span>
          <span className="num ml-auto pl-3 font-medium text-slate-900">{typeof p.value === 'number' ? format(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

/** Small legend row rendered above a chart (text stays in ink, the swatch carries identity) */
export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={i.dashed ? { border: `1.5px dashed ${i.color}` } : { background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}
