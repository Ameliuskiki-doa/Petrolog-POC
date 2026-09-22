import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { businessLines, getEmployee, type BusinessLine } from '@/data/core'
import { Avatar, Badge, cx, type Tone } from '@/components/ui'
import { idrShort, pct } from '@/lib/format'
import { NEUTRAL_LIGHT, SERIES } from '@/lib/chart'
import type { FppStatus, LateCostStatus, SourceType } from '@/data/projects'

export const MODULE = 'M7 · Project Costing'

export const ACTUAL_COLOR = SERIES[0]
export const COMMITTED_COLOR = SERIES[3]
export const RAB_COLOR = NEUTRAL_LIGHT
export const REVENUE_COLOR = SERIES[0]
export const COST_COLOR = SERIES[1]

export function BLTag({ bl, short = true }: { bl: BusinessLine; short?: boolean }) {
  const b = businessLines[bl]
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-slate-700">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: b.color }} />
      {short ? (bl === 'CORP' ? 'Corporate' : bl) : b.name}
    </span>
  )
}

export function PersonCell({ id, sub }: { id: string; sub?: boolean }) {
  const e = getEmployee(id)
  if (!e) return <span className="text-slate-400">—</span>
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={e.name} size={22} />
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-slate-800">{e.name}</span>
        {sub && <span className="block truncate text-[11px] text-slate-500">{e.position}</span>}
      </span>
    </span>
  )
}

export const marginTone = (m: number) => (m < 10 ? 'text-red-600' : m < 15 ? 'text-amber-600' : 'text-emerald-600')

export function MarginCell({ value, revenue }: { value: number; revenue: number }) {
  if (!revenue) return <span className="text-slate-400">—</span>
  return <span className={cx('font-medium', marginTone(value))}>{pct(value)}</span>
}

export function Money({ v, muted, strong, signed }: { v: number; muted?: boolean; strong?: boolean; signed?: boolean }) {
  return (
    <span className={cx('num whitespace-nowrap', muted && 'text-slate-500', strong && 'font-semibold text-slate-900', signed && v < 0 && 'text-red-600')}>
      {v === 0 && muted ? '—' : idrShort(v)}
    </span>
  )
}

/** Stacked budget bar: actual (solid) + committed (amber) against RAB; overflow marked red */
export function BudgetBar({ rab, actual, committed, className }: { rab: number; actual: number; committed: number; className?: string }) {
  const total = Math.max(rab, actual + committed, 1)
  const a = (actual / total) * 100
  const c = (committed / total) * 100
  const r = (rab / total) * 100
  const over = actual + committed > rab
  return (
    <div className={cx('relative h-2 w-full overflow-hidden rounded-full bg-slate-100', className)} title={`Actual ${idrShort(actual)} · Committed ${idrShort(committed)} · RAB ${idrShort(rab)}`}>
      <div className="absolute inset-y-0 left-0 rounded-l-full" style={{ width: `${a}%`, background: over ? '#dc2626' : ACTUAL_COLOR }} />
      <div className="absolute inset-y-0" style={{ left: `${a}%`, width: `${c}%`, background: COMMITTED_COLOR }} />
      {over && <div className="absolute inset-y-0 w-0.5 bg-slate-900" style={{ left: `calc(${r}% - 1px)` }} />}
    </div>
  )
}

export function ProgressCell({ value }: { value: number }) {
  return (
    <div className="flex min-w-[90px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${value}%` }} />
      </div>
      <span className="num w-8 text-right text-xs text-slate-600">{value}%</span>
    </div>
  )
}

const sourceTone: Record<SourceType, Tone> = {
  Timesheet: 'blue',
  'Fuel log': 'amber',
  'Fuel actualisation': 'orange',
  'PO/GR': 'sky',
  'AP invoice': 'violet',
  Depreciation: 'slate',
  'GEN allocation': 'slate',
  'Prepaid amortisation': 'slate',
  'Late cost': 'red',
  'AR invoice': 'green',
}
export const SourceBadge = ({ source }: { source: SourceType }) => <Badge tone={sourceTone[source]}>{source === 'Late cost' ? 'Late cost (controlled reopening)' : source}</Badge>

const fppTone: Record<FppStatus, Tone> = {
  Draft: 'slate',
  'Pending approval': 'amber',
  Approved: 'green',
  Committed: 'sky',
  'Partially realised': 'blue',
  Realised: 'violet',
  Closed: 'slate',
}
export const FppBadge = ({ status }: { status: FppStatus }) => (
  <Badge tone={fppTone[status]} dot>
    {status}
  </Badge>
)

const lateTone: Record<LateCostStatus, Tone> = { 'Pending approval': 'amber', Charged: 'green', Rejected: 'red' }
export const LateBadge = ({ status }: { status: LateCostStatus }) => (
  <Badge tone={lateTone[status]} dot>
    {status}
  </Badge>
)

export function DocLink({ to, children }: { to?: string; children: ReactNode }) {
  if (!to) return <span className="font-mono text-[12px] text-slate-600">{children}</span>
  return (
    <Link to={to} onClick={(e) => e.stopPropagation()} className="font-mono text-[12px] text-sky-700 hover:underline">
      {children}
    </Link>
  )
}

/** Small segmented control */
export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: ReactNode }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cx('rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition', value === o.key ? 'bg-ink-900 text-white' : 'text-slate-600 hover:bg-slate-100')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const journalLink = (id: string) => `/finance/gl/${id}`
