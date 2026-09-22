import { Lock, Timer } from 'lucide-react'
import { Badge, cx, type Tone } from '@/components/ui'
import { getVendor } from '@/data/core'
import { useDemoNow, countdown } from './store'

export const vendorName = (id: string) => getVendor(id)?.name ?? id

const tones: Record<string, Tone> = {
  // PO
  'Awaiting acknowledgement': 'amber',
  Acknowledged: 'blue',
  'Partially received': 'sky',
  Received: 'green',
  Closed: 'slate',
  // Invoice
  'Document check': 'sky',
  Matching: 'violet',
  Exception: 'orange',
  'Approved for payment': 'green',
  Paid: 'green',
  // RFQ
  Open: 'blue',
  'Under evaluation': 'violet',
  Awarded: 'green',
  'Not awarded': 'slate',
  // milestones
  Invoiced: 'violet',
  'Ready to invoice': 'amber',
  'Not yet due': 'slate',
  // docs
  Valid: 'green',
  'Expiring soon': 'amber',
  Expired: 'red',
  'No expiry': 'slate',
  'Under review': 'violet',
}

export function PStatus({ s, className }: { s: string; className?: string }) {
  return (
    <Badge tone={tones[s] ?? (s === 'Received' ? 'blue' : 'slate')} dot className={className}>
      {s}
    </Badge>
  )
}

/** Project reference as the vendor sees it — plain text, no link into the back office */
export function ProjectRef({ code }: { code: string }) {
  return <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700 ring-1 ring-slate-200 ring-inset">{code}</span>
}

export function Countdown({ closing, compact }: { closing: string; compact?: boolean }) {
  const now = useDemoNow()
  const ms = new Date(closing).getTime() - now
  const urgent = ms > 0 && ms < 36 * 3600_000
  if (compact)
    return (
      <span className={cx('num inline-flex items-center gap-1 font-mono text-xs font-medium', ms <= 0 ? 'text-slate-400' : urgent ? 'text-red-600' : 'text-slate-700')}>
        <Timer size={13} /> {countdown(ms)}
      </span>
    )
  return (
    <div className={cx('rounded-xl px-4 py-3 text-center ring-1 ring-inset', ms <= 0 ? 'bg-slate-50 ring-slate-200' : urgent ? 'bg-red-50 ring-red-200' : 'bg-ink-900 ring-ink-900')}>
      <div className={cx('text-[11px] font-semibold tracking-wider uppercase', ms <= 0 ? 'text-slate-500' : urgent ? 'text-red-700' : 'text-slate-400')}>{ms <= 0 ? 'Bidding closed' : 'Closes in'}</div>
      <div className={cx('num mt-0.5 font-mono text-2xl font-semibold', ms <= 0 ? 'text-slate-500' : urgent ? 'text-red-700' : 'text-white')}>{countdown(ms)}</div>
    </div>
  )
}

export function SealNote({ className }: { className?: string }) {
  return (
    <div className={cx('flex items-start gap-2.5 rounded-lg bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200 ring-inset', className)}>
      <Lock size={17} className="mt-0.5 shrink-0" />
      <div>
        <div className="font-semibold">Your quotation is sealed</div>
        <div className="text-[13px] opacity-90">Petrolog cannot view prices before the closing time. Envelopes of all invited vendors are opened together, and the bid tabulation compares each line item.</div>
      </div>
    </div>
  )
}

export function FileChip({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toUpperCase() ?? ''
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
      <span className={cx('rounded px-1 text-[9px] font-bold text-white', ext === 'PDF' ? 'bg-red-500' : ext === 'XLSX' ? 'bg-emerald-600' : 'bg-slate-500')}>{ext}</span>
      <span className="truncate">{name}</span>
    </span>
  )
}
