import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileCheck2, GitCompare, Hourglass, PackageOpen } from 'lucide-react'
import { Badge, Card, DataTable, Grid, PageHeader, Progress, ProjectCodeChip, SearchInput, Select, Stat, StatusBadge, Tabs } from '@/components/ui'
import { allPurchaseOrders, poDetails, tierFor } from '@/data/procurement'
import type { PurchaseOrder } from '@/data/core'
import { date, idrShort } from '@/lib/format'
import { MODULE_PROC, VendorLink, receivedValue } from './shared'
import { usePOState, useReceipts } from './store'

type TabKey = 'all' | 'approval' | 'open' | 'done'

export function matchSummary(poId: string): { label: string; tone: 'green' | 'red' | 'amber' | 'slate' } {
  const inv = poDetails[poId]?.invoices ?? []
  if (!inv.length) return { label: 'No invoice yet', tone: 'slate' }
  if (inv.some((i) => i.match === 'Exception')) return { label: 'Exception', tone: 'red' }
  if (inv.some((i) => i.match === 'In review' || i.match === 'Awaiting GR')) return { label: 'In review', tone: 'amber' }
  return { label: 'Matched', tone: 'green' }
}

export default function Orders() {
  const st = usePOState()
  const rc = useReceipts()
  const nav = useNavigate()
  const [tab, setTab] = useState<TabKey>('all')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')

  const pos = allPurchaseOrders.map((p) => ({ ...p, status: st[p.id]?.status ?? p.status }))
  const inTab = (p: PurchaseOrder) =>
    tab === 'all' ||
    (tab === 'approval' && (p.status === 'Pending Approval' || p.status === 'Draft')) ||
    (tab === 'open' && (p.status === 'Approved' || p.status === 'Partially Received')) ||
    (tab === 'done' && (p.status === 'Received' || p.status === 'Invoiced' || p.status === 'Closed'))
  const rows = pos
    .filter((p) => inTab(p) && (!cat || p.costCategory === cat) && (!q || `${p.id} ${p.description} ${p.projectCode} ${p.vendorId}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.date.localeCompare(a.date))

  const open = pos.filter((p) => p.status === 'Approved' || p.status === 'Partially Received')
  const openCommit = open.reduce((s, p) => s + p.amount - receivedValue(p.id, rc), 0)
  const pend = pos.filter((p) => p.status === 'Pending Approval')
  const exceptions = pos.filter((p) => matchSummary(p.id).label === 'Exception')

  return (
    <>
      <PageHeader module={MODULE_PROC} title="Purchase orders" subtitle="POs are issued from awarded RFQs and approved by value tier. Every line carries its project code; receipts turn the commitment into actual cost." />
      <Grid cols={4} className="mb-4">
        <Stat label="Open commitments" value={idrShort(openCommit)} sub={`${open.length} POs approved, not fully received`} icon={<FileCheck2 size={16} />} />
        <Stat label="Pending approval" value={pend.length} sub={idrShort(pend.reduce((s, p) => s + p.amount, 0))} tone="warn" icon={<Hourglass size={16} />} />
        <Stat label="Partially received" value={pos.filter((p) => p.status === 'Partially Received').length} icon={<PackageOpen size={16} />} to="/procurement/receipts" />
        <Stat label="Three-way match exceptions" value={exceptions.length} sub="Open in Three-way Match" tone={exceptions.length ? 'bad' : 'good'} icon={<GitCompare size={16} />} to="/finance/ap/match" />
      </Grid>
      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'all', label: 'All', count: pos.length },
          { key: 'approval', label: 'Draft / pending approval', count: pos.filter((p) => p.status === 'Pending Approval' || p.status === 'Draft').length },
          { key: 'open', label: 'Open', count: open.length },
          { key: 'done', label: 'Received / invoiced', count: pos.filter((p) => ['Received', 'Invoiced', 'Closed'].includes(p.status)).length },
        ]}
      />
      <Card padded={false}>
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search PO, vendor, project code…" className="w-full sm:w-64" />
          <Select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {[...new Set(pos.map((p) => p.costCategory))].map((c) => <option key={c}>{c}</option>)}
          </Select>
        </div>
        <DataTable
          rows={rows}
          rowKey={(p) => p.id}
          onRowClick={(p) => nav(`/procurement/orders/${p.id}`)}
          columns={[
            { key: 'id', header: 'PO', render: (p) => <div className="min-w-[220px]"><div className="font-mono text-[11px] text-slate-500">{p.id} · {date(p.date)}</div><div className="font-medium text-slate-800">{p.description}</div></div> },
            { key: 'v', header: 'Vendor', render: (p) => <div className="max-w-[200px]"><VendorLink id={p.vendorId} /></div> },
            { key: 'pc', header: 'Project code', render: (p) => <ProjectCodeChip code={p.projectCode} /> },
            { key: 'c', header: 'Category', render: (p) => <span className="text-xs text-slate-600">{p.costCategory}</span> },
            { key: 'a', header: 'Amount', align: 'right', render: (p) => <span className="font-medium">{idrShort(p.amount)}</span> },
            { key: 't', header: 'Approval tier', render: (p) => { const t = tierFor(p.amount); return <Badge tone={t.tier >= 3 ? 'violet' : 'slate'}>Tier {t.tier} · {t.label}</Badge> } },
            { key: 'r', header: 'Received', render: (p) => { const v = receivedValue(p.id, rc); const pc = (v / p.amount) * 100; return <div className="w-24"><Progress value={pc} tone={pc >= 100 ? 'green' : 'blue'} /><div className="mt-0.5 text-[11px] text-slate-500">{Math.round(pc)}%</div></div> } },
            { key: 's', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
            { key: 'm', header: '3-way match', render: (p) => { const m = matchSummary(p.id); return <Badge tone={m.tone}>{m.label}</Badge> } },
          ]}
        />
      </Card>
    </>
  )
}
