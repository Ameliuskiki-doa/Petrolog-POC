import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, FileSearch, Lock, Timer, Users } from 'lucide-react'
import { Card, DataTable, Grid, PageHeader, ProjectCodeChip, SearchInput, Stat, StatusBadge, Tabs, cx } from '@/components/ui'
import { isSealed, latestQuotes, quoteTotal, type RFQ } from '@/data/procurement'
import { date, dateTime, daysUntil, idrShort } from '@/lib/format'
import { MODULE_PROC, TextLink, VendorLink } from './shared'
import { useRFQs } from './store'

type TabKey = 'all' | 'open' | 'eval' | 'awarded'

export default function RfqList() {
  const rfqs = useRFQs()
  const nav = useNavigate()
  const [tab, setTab] = useState<TabKey>('all')
  const [q, setQ] = useState('')

  const rows = rfqs.filter(
    (r) =>
      (tab === 'all' || (tab === 'open' && (r.status === 'Open' || r.status === 'Draft')) || (tab === 'eval' && (r.status === 'Evaluation' || r.status === 'Negotiation')) || (tab === 'awarded' && r.status === 'Awarded')) &&
      (!q || `${r.id} ${r.title} ${r.prId}`.toLowerCase().includes(q.toLowerCase())),
  )
  const open = rfqs.filter((r) => r.status === 'Open')
  const closingWeek = open.filter((r) => daysUntil(r.closing.slice(0, 10)) <= 7)
  const awaiting = rfqs.filter((r) => r.status === 'Evaluation' || r.status === 'Negotiation')
  const avgInvited = rfqs.length ? rfqs.reduce((s, r) => s + r.invited.length, 0) / rfqs.length : 0

  return (
    <>
      <PageHeader module={MODULE_PROC} title="RFQ & bid tabulation" subtitle="RFQs are raised from approved requisitions and sent to qualified vendors through the portal. Quotations stay sealed until the closing deadline." />
      <Grid cols={4} className="mb-4">
        <Stat label="Open RFQs" value={open.length} sub={`${open.reduce((s, r) => s + r.quotations.length, 0)} sealed quotations received`} icon={<FileSearch size={16} />} />
        <Stat label="Closing within 7 days" value={closingWeek.length} tone={closingWeek.length ? 'warn' : undefined} icon={<Timer size={16} />} />
        <Stat label="Awaiting award" value={awaiting.length} sub="Evaluation or negotiation" icon={<Award size={16} />} />
        <Stat label="Average vendors invited" value={avgInvited.toFixed(1)} sub="Non-qualified vendors excluded automatically" icon={<Users size={16} />} />
      </Grid>
      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'all', label: 'All', count: rfqs.length },
          { key: 'open', label: 'Open / draft', count: rfqs.filter((r) => r.status === 'Open' || r.status === 'Draft').length },
          { key: 'eval', label: 'Evaluation & negotiation', count: awaiting.length },
          { key: 'awarded', label: 'Awarded', count: rfqs.filter((r) => r.status === 'Awarded').length },
        ]}
      />
      <Card padded={false}>
        <div className="border-b border-slate-200 p-3"><SearchInput value={q} onChange={setQ} placeholder="Search RFQ, title or PR…" className="w-full sm:w-72" /></div>
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={(r) => nav(`/procurement/rfq/${r.id}`)}
          columns={[
            { key: 'id', header: 'RFQ', render: (r) => <div className="min-w-[220px]"><div className="font-mono text-[11px] text-slate-500">{r.id}</div><div className="font-medium text-slate-800">{r.title}</div></div> },
            { key: 'pr', header: 'From PR', render: (r) => <TextLink to={`/procurement/requisitions/${r.prId}`}>{r.prId}</TextLink> },
            { key: 'pc', header: 'Project code', render: (r) => <ProjectCodeChip code={r.projectCode} /> },
            { key: 'l', header: 'Lines', align: 'right', render: (r) => r.lines.length },
            { key: 'cl', header: 'Closing', render: (r) => <Closing r={r} /> },
            { key: 'v', header: 'Invited · responded', render: (r) => <span className="text-sm">{r.invited.length} · {r.invited.filter((i) => i.responded).length}{r.excluded.length > 0 && <span className="ml-1 text-[11px] text-red-600">({r.excluded.length} excluded)</span>}</span> },
            { key: 'best', header: 'Lowest total', align: 'right', render: (r) => <BestCell r={r} /> },
            { key: 's', header: 'Status', render: (r) => <span className="flex items-center gap-1.5"><StatusBadge status={r.status} />{isSealed(r) && <Lock size={13} className="text-slate-500" />}</span> },
            { key: 'aw', header: 'Awarded to', render: (r) => (r.award ? <VendorLink id={r.award.vendorId} /> : <span className="text-xs text-slate-400">—</span>) },
          ]}
        />
      </Card>
    </>
  )
}

function Closing({ r }: { r: RFQ }) {
  const d = daysUntil(r.closing.slice(0, 10))
  return (
    <div className="whitespace-nowrap">
      <div className="text-sm">{dateTime(r.closing)}</div>
      {r.status === 'Open' && <div className={cx('text-[11px]', d <= 3 ? 'font-medium text-amber-700' : 'text-slate-500')}>{d > 0 ? `in ${d} days` : 'today'}</div>}
      {r.status !== 'Open' && <div className="text-[11px] text-slate-500">created {date(r.created)}</div>}
    </div>
  )
}

function BestCell({ r }: { r: RFQ }) {
  if (isSealed(r)) return <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Lock size={12} />sealed</span>
  const qs = latestQuotes(r)
  if (!qs.length) return <span className="text-xs text-slate-400">—</span>
  return <span className="font-medium">{idrShort(Math.min(...qs.map((q) => quoteTotal(r, q))))}</span>
}
