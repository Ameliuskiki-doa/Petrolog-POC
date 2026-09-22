import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Card, Tabs, DataTable, Mono, SearchInput, useFilter, Progress } from '@/components/ui'
import { idr, date } from '@/lib/format'
import { usePortal } from '../store'
import { PStatus, ProjectRef } from '../bits'

type TabKey = 'open' | 'ack' | 'closed' | 'all'

export default function Orders() {
  const nav = useNavigate()
  const { pos } = usePortal()
  const [tab, setTab] = useState<TabKey>('open')
  const base = pos.filter((p) => (tab === 'all' ? true : tab === 'ack' ? p.status === 'Awaiting acknowledgement' : tab === 'closed' ? p.status === 'Closed' : p.status !== 'Closed'))
  const { q, setQ, filtered } = useFilter(base, (p) => `${p.id} ${p.description} ${p.projectCode}`)

  return (
    <div>
      <PageHeader module="Vendor Portal · PROC-14 · PROC-20" title="Purchase orders" subtitle="Acknowledge new POs, follow receipts and payment milestones." crumbs={[{ label: 'Home', to: '/portal' }, { label: 'Purchase orders' }]} />
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
          <Tabs
            className="mb-0 border-0"
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'open', label: 'Open', count: pos.filter((p) => p.status !== 'Closed').length },
              { key: 'ack', label: 'To acknowledge', count: pos.filter((p) => p.status === 'Awaiting acknowledgement').length },
              { key: 'closed', label: 'Closed', count: pos.filter((p) => p.status === 'Closed').length },
              { key: 'all', label: 'All', count: pos.length },
            ]}
          />
          <SearchInput value={q} onChange={setQ} placeholder="Search PO…" className="w-full sm:w-64" />
        </div>
        <div className="mt-3 border-t border-slate-200">
          <DataTable
            rows={filtered}
            rowKey={(p) => p.id}
            onRowClick={(p) => nav(`/portal/orders/${p.id}`)}
            empty="No purchase orders in this view."
            columns={[
              { key: 'id', header: 'PO', render: (p) => <Mono className="font-medium">{p.id}</Mono> },
              { key: 'dt', header: 'Date', render: (p) => <span className="whitespace-nowrap">{date(p.date)}</span> },
              { key: 'd', header: 'Description', render: (p) => <span className="line-clamp-1 min-w-[220px]">{p.description}</span> },
              { key: 'p', header: 'Project ref', render: (p) => <ProjectRef code={p.projectCode} /> },
              { key: 'a', header: 'Amount', align: 'right', render: (p) => idr(p.amount) },
              {
                key: 'm',
                header: 'Paid',
                render: (p) => {
                  const paid = p.milestones.filter((m) => m.status === 'Paid').reduce((s, m) => s + m.pct, 0)
                  return (
                    <div className="w-28">
                      <Progress value={paid} tone="green" />
                      <div className="mt-0.5 text-[11px] text-slate-500">{paid}% of value</div>
                    </div>
                  )
                },
              },
              { key: 's', header: 'Status', render: (p) => <PStatus s={p.status} /> },
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
