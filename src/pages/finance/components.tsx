import { Archive } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { businessLines, getEmployee, getVendor, getCustomer, type BusinessLine } from '@/data/core'
import { getCostCentre, SAP_ARCHIVE_NOTE } from '@/data/finance'
import { cx, Badge } from '@/components/ui'

/** Subtle reference to the SAP B1 archive wherever history is relevant */
export function ArchiveNote({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500', className)}>
      <Archive size={12} className="text-slate-400" />
      <span>{SAP_ARCHIVE_NOTE}</span>
      {children && <span className="text-slate-400">· {children}</span>}
    </div>
  )
}

export function BLTag({ bl }: { bl: BusinessLine }) {
  const b = businessLines[bl]
  return (
    <span className="inline-flex items-center gap-1 text-[11px] whitespace-nowrap text-slate-600" title={b.name}>
      <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
      {bl}
    </span>
  )
}

export function CostCentreTag({ code }: { code: string }) {
  const c = getCostCentre(code)
  return (
    <span className="font-mono text-[11px] text-slate-600" title={c?.name}>
      {code}
    </span>
  )
}

export const empName = (id?: string) => (id === 'SYSTEM' ? 'System (scheduled)' : (getEmployee(id)?.name ?? id ?? '—'))

export function VendorLink({ id, className }: { id: string; className?: string }) {
  const v = getVendor(id)
  return (
    <Link to={`/vendors/${id}`} onClick={(e) => e.stopPropagation()} className={cx('text-slate-800 hover:text-brand-700 hover:underline', className)}>
      {v?.name ?? id}
    </Link>
  )
}

export function CustomerName({ id }: { id: string }) {
  return <span>{getCustomer(id)?.name ?? id}</span>
}

export function DocLink({ to, children }: { to?: string; children: ReactNode }) {
  if (!to) return <span className="font-mono text-[12px] text-slate-700">{children}</span>
  return (
    <Link to={to} onClick={(e) => e.stopPropagation()} className="font-mono text-[12px] text-sky-700 hover:underline">
      {children}
    </Link>
  )
}

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'blue' | 'amber' | 'green' | 'red' | 'violet' | 'sky' | 'orange' }) {
  return <Badge tone={tone}>{children}</Badge>
}

/** Small key/value line used in side panels */
export function KV({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-slate-500">{k}</span>
      <span className="num text-right font-medium text-slate-800">{v}</span>
    </div>
  )
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-end gap-2 border-b border-slate-100 px-4 pt-4 pb-3">{children}</div>
}
