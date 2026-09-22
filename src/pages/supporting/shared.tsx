import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { getEmployee, getUnit } from '@/data/core'
import { certTier, tierTone, type CertTier } from '@/data/supporting'
import { Avatar, Badge, Mono } from '@/components/ui'
import { daysUntil } from '@/lib/format'

export function UnitLink({ id, showType = false }: { id: string; showType?: boolean }) {
  const u = getUnit(id)
  return (
    <span className="inline-flex min-w-0 flex-col">
      <Link to={`/fleet/units/${id}`} onClick={(e) => e.stopPropagation()} className="font-mono text-[12px] font-medium text-brand-700 hover:underline">
        {id}
      </Link>
      {showType && u && <span className="truncate text-xs text-slate-500">{u.type}</span>}
    </span>
  )
}

export function DocLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} onClick={(e) => e.stopPropagation()} className="font-mono text-[12px] text-brand-700 hover:underline">
      {children}
    </Link>
  )
}

/** Picks a route for a reference string (PO / WO / job / journal) */
export function RefLink({ refId }: { refId: string }) {
  if (refId.startsWith('PO-')) return <DocLink to={`/procurement/orders/${refId}`}>{refId}</DocLink>
  if (refId.startsWith('WO-')) return <DocLink to={`/maintenance/work-orders/${refId}`}>{refId}</DocLink>
  if (refId.startsWith('JO-')) return <DocLink to={`/ops/jobs/${refId}`}>{refId}</DocLink>
  if (refId.startsWith('JV-')) return <DocLink to={`/finance/gl/${refId}`}>{refId}</DocLink>
  if (refId.startsWith('INC-')) return <DocLink to={`/hse/incidents/${refId}`}>{refId}</DocLink>
  return <Mono className="text-slate-600">{refId}</Mono>
}

export function Person({ id, sub }: { id: string; sub?: boolean }) {
  const e = getEmployee(id)
  if (!e) return <span className="text-slate-400">—</span>
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={e.name} size={24} />
      <span className="min-w-0">
        <span className="block truncate text-sm text-slate-800">{e.name}</span>
        {sub && <span className="block truncate text-xs text-slate-500">{e.position}</span>}
      </span>
    </span>
  )
}

export function TierBadge({ expiry, tier }: { expiry?: string; tier?: CertTier }) {
  const t = tier ?? certTier(expiry!)
  return (
    <Badge tone={tierTone[t]} dot>
      {t === 'Valid' ? 'Valid' : t === 'Expired' ? 'Expired' : `Expiring ${t}`}
    </Badge>
  )
}

export function DaysLeft({ expiry }: { expiry: string }) {
  const d = daysUntil(expiry)
  const cls = d < 0 ? 'text-red-600' : d <= 30 ? 'text-orange-600' : d <= 90 ? 'text-amber-600' : 'text-slate-500'
  return <span className={`num text-xs font-medium ${cls}`}>{d < 0 ? `${-d} d overdue` : `${d} d`}</span>
}
