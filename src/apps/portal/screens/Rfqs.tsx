import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { PageHeader, Card, Tabs, DataTable, Mono, SearchInput, useFilter } from '@/components/ui'
import { date } from '@/lib/format'
import { usePortal, wib } from '../store'
import { PStatus, ProjectRef, Countdown } from '../bits'

type TabKey = 'Open' | 'Under evaluation' | 'Awarded' | 'all'

export default function Rfqs() {
  const nav = useNavigate()
  const { rfqs } = usePortal()
  const [tab, setTab] = useState<TabKey>('Open')
  const base = tab === 'all' ? rfqs : rfqs.filter((r) => r.status === tab)
  const { q, setQ, filtered } = useFilter(base, (r) => `${r.id} ${r.title} ${r.projectCode}`)

  return (
    <div>
      <PageHeader module="Vendor Portal · PROC-10" title="Requests for quotation" subtitle="RFQs you have been invited to. Submit per line item; you may revise until the closing time — the last version counts." crumbs={[{ label: 'Home', to: '/portal' }, { label: 'RFQs' }]} />
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
          <Tabs
            className="mb-0 border-0"
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'Open', label: 'Open', count: rfqs.filter((r) => r.status === 'Open').length },
              { key: 'Under evaluation', label: 'Under evaluation', count: rfqs.filter((r) => r.status === 'Under evaluation').length },
              { key: 'Awarded', label: 'Awarded', count: rfqs.filter((r) => r.status === 'Awarded').length },
              { key: 'all', label: 'All', count: rfqs.length },
            ]}
          />
          <SearchInput value={q} onChange={setQ} placeholder="Search RFQ…" className="w-full sm:w-64" />
        </div>
        <div className="mt-3 border-t border-slate-200">
          <DataTable
            rows={filtered}
            rowKey={(r) => r.id}
            onRowClick={(r) => nav(`/portal/rfq/${r.id}`)}
            empty="No RFQs in this view."
            columns={[
              { key: 'id', header: 'RFQ', render: (r) => <Mono className="font-medium">{r.id}</Mono> },
              { key: 't', header: 'Title', render: (r) => <div className="min-w-[240px]"><div className="font-medium text-slate-800">{r.title}</div><div className="text-xs text-slate-500">{r.lines.length} line items · issued {date(r.issued)}</div></div> },
              { key: 'p', header: 'Project ref', render: (r) => <ProjectRef code={r.projectCode} /> },
              { key: 'c', header: 'Closing', render: (r) => <span className="text-xs whitespace-nowrap">{wib(r.closing)}</span> },
              { key: 'cd', header: 'Time left', render: (r) => (r.status === 'Open' ? <Countdown closing={r.closing} compact /> : <span className="text-xs text-slate-400">—</span>) },
              {
                key: 'q',
                header: 'Your quotation',
                render: (r) =>
                  r.quote || r.submitted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-emerald-700">
                      <Lock size={12} /> v{r.quote?.version ?? r.submitted?.version} · {wib(r.quote?.at ?? r.submitted!.at)}
                    </span>
                  ) : r.status === 'Open' ? (
                    <span className="text-xs font-medium text-amber-700">Not yet submitted</span>
                  ) : (
                    <span className="text-xs text-slate-400">No quotation</span>
                  ),
              },
              { key: 's', header: 'Status', render: (r) => <PStatus s={r.status} /> },
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
