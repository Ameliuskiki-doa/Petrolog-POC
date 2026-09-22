import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertOctagon, CheckCircle2 } from 'lucide-react'
import { getEmployee, getProject, remainingBudget } from '@/data/core'
import { findVendor, poDetails, snapExceeds, snapRemaining, type BudgetSnapshotRow, type PRStatus, type Receipt } from '@/data/procurement'
import { Avatar, Badge, ProjectCodeChip, StatusBadge, cx } from '@/components/ui'
import { idr, idrShort } from '@/lib/format'
import { STATUS } from '@/lib/chart'

export const MODULE_PROC = 'M6 · Procurement & VMS'

export function Person({ id, sub }: { id?: string; sub?: boolean }) {
  const e = getEmployee(id)
  if (!e) return <span className="text-slate-400">—</span>
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar name={e.name} size={22} />
      <span className="min-w-0">
        <span className="block truncate text-sm text-slate-800">{e.name}</span>
        {sub && <span className="block truncate text-[11px] text-slate-500">{e.position}</span>}
      </span>
    </span>
  )
}

export function TextLink({ to, children, mono = true }: { to: string; children: ReactNode; mono?: boolean }) {
  return (
    <Link to={to} onClick={(e) => e.stopPropagation()} className={cx(mono && 'font-mono text-[12px]', 'font-medium text-brand-700 hover:underline')}>
      {children}
    </Link>
  )
}

export function VendorLink({ id, sub }: { id: string; sub?: boolean }) {
  const v = findVendor(id)
  return (
    <span className="min-w-0">
      <Link to={`/vendors/${id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-slate-800 hover:text-brand-700 hover:underline">
        {v?.name ?? id}
      </Link>
      {sub && <span className="block font-mono text-[11px] text-slate-500">{id}</span>}
    </span>
  )
}

export function PRStatusBadge({ status, escalated }: { status: PRStatus; escalated?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <StatusBadge status={status} />
      {escalated && <Badge tone="orange">Escalated</Badge>}
    </span>
  )
}

export function BudgetResult({ rows }: { rows: BudgetSnapshotRow[] }) {
  const over = rows.filter(snapExceeds)
  if (rows.length === 0) return <span className="text-xs text-slate-400">—</span>
  if (over.length === 0) return <Badge tone="green" dot>Within budget</Badge>
  const by = over.reduce((s, r) => s + (r.request - snapRemaining(r)), 0)
  return <Badge tone="red" dot>Exceeds by {idrShort(by)}</Badge>
}

/**
 * The PROC-07 budget check, drawn so a panel member sees it at a glance:
 * remaining = RAB − actuals − commitments, then what this request does to it.
 */
export function BudgetCheckRows({ rows, compact }: { rows: BudgetSnapshotRow[]; compact?: boolean }) {
  return (
    <div className="space-y-4">
      {rows.map((r) => {
        const remaining = snapRemaining(r)
        const after = remaining - r.request
        const exceeds = snapExceeds(r)
        const scale = Math.max(r.rab, r.actual + r.committed + r.request)
        const w = (n: number) => `${Math.max(0, (n / scale) * 100)}%`
        const p = getProject(r.projectCode)
        return (
          <div key={r.projectCode + r.category} className={cx('rounded-lg p-3 ring-1', exceeds ? 'bg-red-50/60 ring-red-200' : 'bg-emerald-50/40 ring-emerald-200')}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <ProjectCodeChip code={r.projectCode} />
                <span className="text-sm font-medium text-slate-700">{r.category}</span>
                <span className="text-xs text-slate-500">{r.rab === 0 ? 'no RAB line for this category' : 'RAB line'}</span>
              </div>
              {exceeds ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700"><AlertOctagon size={14} />Exceeds remaining by {idrShort(-after)}</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} />Within remaining RAB</span>
              )}
            </div>

            <div className="relative h-5 overflow-hidden rounded-md bg-white ring-1 ring-slate-200">
              <div className="absolute inset-y-0 left-0 flex">
                <div style={{ width: w(r.actual), background: '#475569' }} title={`Actuals ${idr(r.actual)}`} />
                <div style={{ width: w(r.committed), background: '#94a3b8' }} title={`Commitments ${idr(r.committed)}`} />
                <div
                  style={{
                    width: w(r.request),
                    background: exceeds ? `repeating-linear-gradient(135deg, ${STATUS.bad}, ${STATUS.bad} 5px, #f87171 5px, #f87171 10px)` : STATUS.good,
                  }}
                  title={`This request ${idr(r.request)}`}
                />
              </div>
              {/* RAB ceiling marker */}
              <div className="absolute inset-y-0 w-0.5 bg-slate-900" style={{ left: `calc(${w(r.rab)} - 1px)` }} title={`RAB ${idr(r.rab)}`} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-600" />Actuals</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-400" />Commitments</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: exceeds ? STATUS.bad : STATUS.good }} />This request</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-0.5 bg-slate-900" />RAB ceiling</span>
            </div>

            <div className={cx('mt-3 grid gap-2 text-xs', compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6')}>
              <Fig label="RAB" value={r.rab} />
              <Fig label="− Actuals" value={r.actual} />
              <Fig label="− Commitments" value={r.committed} />
              <Fig label="= Remaining" value={remaining} strong tone={remaining < 0 ? 'bad' : undefined} />
              <Fig label="This request" value={r.request} strong />
              <Fig label="Remaining after" value={after} strong tone={after < 0 ? 'bad' : 'good'} />
            </div>
            {p && !compact && (
              <div className="mt-2 text-[11px] text-slate-500">
                Project level ({p.code}): RAB {idrShort(p.rab)} − actuals {idrShort(p.actual)} − commitments {idrShort(p.committed)} = <b className="text-slate-700">{idrShort(remainingBudget(p))}</b> remaining
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Fig({ label, value, strong, tone }: { label: string; value: number; strong?: boolean; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-md bg-white px-2 py-1.5 ring-1 ring-slate-200">
      <div className="text-[10px] tracking-wide text-slate-500 uppercase">{label}</div>
      <div className={cx('num', strong ? 'font-semibold' : 'font-medium', tone === 'bad' ? 'text-red-600' : tone === 'good' ? 'text-emerald-700' : 'text-slate-800')}>{idrShort(value)}</div>
    </div>
  )
}

/** Quantity received per PO line from a list of receipts */
export function receivedByLine(poId: string, list: Receipt[]) {
  const n = poDetails[poId]?.lines.length ?? 0
  const out = Array.from({ length: n }, () => 0)
  list.filter((r) => r.poId === poId).forEach((r) => r.lines.forEach((l) => (out[l.line] += l.qty)))
  return out
}

export function receivedValue(poId: string, list: Receipt[]) {
  const d = poDetails[poId]
  if (!d) return 0
  return receivedByLine(poId, list).reduce((s, q, i) => s + q * d.lines[i].price, 0)
}
