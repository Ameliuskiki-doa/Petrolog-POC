import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getContract, getProject, type Contract, type Job } from '@/data/core'
import { getPerson } from '@/data/operations'
import { Avatar, cx } from '@/components/ui'
import { idrShort } from '@/lib/format'

export const OPS_MODULE = 'M3 · Job & Planning Management'
export const FLEET_MODULE = 'M4 · Fleet, Fuel & Driver Monitoring'
export const TS_MODULE = 'M5 · Timesheet & Field Execution'

export const jobValue = (j: Pick<Job, 'qty' | 'rate'>) => j.qty * j.rate
export const jobValueLabel = (j: Pick<Job, 'qty' | 'rate' | 'basis'>) => (j.rate ? idrShort(jobValue(j)) : 'Milestone')

export function contractFor(projectCode: string): Contract | undefined {
  const p = getProject(projectCode)
  return getContract(p?.contractId ?? getProject(p?.parent)?.contractId)
}

/** Rate card lines effective at a date — the latest effectiveFrom per item wins (OPS-01) */
export function effectiveRates(c: Contract | undefined, date: string) {
  if (!c) return []
  const byItem = new Map<string, Contract['rateCard'][number]>()
  for (const l of c.rateCard) {
    if (l.effectiveFrom > date) continue
    const cur = byItem.get(l.item)
    if (!cur || cur.effectiveFrom < l.effectiveFrom) byItem.set(l.item, l)
  }
  return [...byItem.values()]
}

export function UnitLink({ id, className }: { id: string; className?: string }) {
  return (
    <Link to={`/fleet/units/${id}`} onClick={(e) => e.stopPropagation()} className={cx('font-mono text-[12px] text-slate-700 hover:text-brand-700 hover:underline', className)}>
      {id}
    </Link>
  )
}

export function JobLink({ id }: { id: string }) {
  return (
    <Link to={`/ops/jobs/${id}`} onClick={(e) => e.stopPropagation()} className="font-mono text-[12px] text-slate-700 hover:text-brand-700 hover:underline">
      {id}
    </Link>
  )
}

export function Person({ id, sub, size = 24 }: { id: string; sub?: ReactNode; size?: number }) {
  const p = getPerson(id)
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={p?.name ?? id} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-sm text-slate-800">{p?.name ?? id}</span>
        {(sub ?? p?.position) && <span className="block truncate text-[11px] text-slate-500">{sub ?? p?.position}</span>}
      </span>
    </span>
  )
}

/** Filter chip with count */
export function Chip({ active, onClick, children, count, tone }: { active: boolean; onClick: () => void; children: ReactNode; count?: number; tone?: 'amber' }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition',
        active ? 'border-ink-900 bg-ink-900 text-white' : tone === 'amber' ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
      )}
    >
      {children}
      {count !== undefined && <span className={cx('rounded-full px-1.5 text-[10px]', active ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>{count}</span>}
    </button>
  )
}

/** Three-category stacked hour bar (operating / idle / maintenance — OPS-19) */
export const UTIL_COLORS = { operating: '#2a78d6', idle: '#94a3b8', maintenance: '#eda100' }
export function UtilBar({ h }: { h: { operating: number; idle: number; maintenance: number } }) {
  const t = h.operating + h.idle + h.maintenance || 1
  return (
    <div className="flex h-2 w-full min-w-24 overflow-hidden rounded-full bg-slate-100" title={`Operating ${h.operating} h · Idle ${h.idle} h · Maintenance ${h.maintenance} h`}>
      <div style={{ width: `${(h.operating / t) * 100}%`, background: UTIL_COLORS.operating }} />
      <div style={{ width: `${(h.idle / t) * 100}%`, background: UTIL_COLORS.idle }} />
      <div style={{ width: `${(h.maintenance / t) * 100}%`, background: UTIL_COLORS.maintenance }} />
    </div>
  )
}
