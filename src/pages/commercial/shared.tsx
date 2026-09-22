import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { businessLines, getCustomer, getEmployee, type BusinessLine } from '@/data/core'
import { Avatar } from '@/components/ui'

export const MODULE_CRM = 'M1 · Business Development & CRM'
export const MODULE_CTR = 'M2 · Contract Management'

export function BLTag({ bl }: { bl: BusinessLine }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-slate-600">
      <span className="h-2 w-2 rounded-full" style={{ background: businessLines[bl].color }} />
      {businessLines[bl].short}
    </span>
  )
}

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

export const customerName = (id?: string) => getCustomer(id)?.name ?? '—'

export function TextLink({ to, children, mono = true }: { to: string; children: ReactNode; mono?: boolean }) {
  return (
    <Link to={to} onClick={(e) => e.stopPropagation()} className={`${mono ? 'font-mono text-[12px]' : ''} font-medium text-brand-700 hover:underline`}>
      {children}
    </Link>
  )
}
