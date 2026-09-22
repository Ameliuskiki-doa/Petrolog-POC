import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertOctagon, ClipboardCheck, Hourglass, Plus, ShoppingCart } from 'lucide-react'
import { Button, Callout, Card, DataTable, Grid, PageHeader, ProjectCodeChip, SearchInput, Select, Stat, Tabs } from '@/components/ui'
import { chargeableProjects, prAmount, type PurchaseRequisition } from '@/data/procurement'
import { date, idrShort } from '@/lib/format'
import { BudgetResult, MODULE_PROC, PRStatusBadge, Person, TextLink } from './shared'
import { usePRs } from './store'
import NewPRDrawer from './NewPRDrawer'

type TabKey = 'all' | 'pending' | 'escalated' | 'sourcing' | 'po' | 'closed'

export default function Requisitions() {
  const prs = usePRs()
  const nav = useNavigate()
  const [tab, setTab] = useState<TabKey>('all')
  const [q, setQ] = useState('')
  const [proj, setProj] = useState('')
  const [open, setOpen] = useState(false)

  const inTab = (p: PurchaseRequisition) =>
    tab === 'all' ||
    (tab === 'pending' && p.status === 'Pending Approval') ||
    (tab === 'escalated' && p.escalated) ||
    (tab === 'sourcing' && (p.status === 'Approved' || p.status === 'RFQ')) ||
    (tab === 'po' && p.status === 'PO Issued') ||
    (tab === 'closed' && (p.status === 'Draft' || p.status === 'Rejected'))

  const codes = (p: PurchaseRequisition) => [...new Set(p.lines.map((l) => l.projectCode).filter(Boolean))]
  const rows = prs.filter((p) => inTab(p) && (!proj || codes(p).some((c) => c === proj || c.startsWith(proj + '.'))) && (!q || `${p.id} ${p.title}`.toLowerCase().includes(q.toLowerCase())))

  const pending = prs.filter((p) => p.status === 'Pending Approval')
  const escalatedOpen = prs.filter((p) => p.escalated && p.status === 'Pending Approval')
  const mtd = prs.filter((p) => p.date >= '2028-03-01' && p.status !== 'Rejected')

  return (
    <>
      <PageHeader
        module={MODULE_PROC}
        title="Purchase requisitions"
        subtitle="Every line carries a project code. Each PR is checked against the remaining RAB before it can become a commitment — the earliest control in the procurement chain."
        actions={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setOpen(true)}>New PR</Button>}
      />
      <Grid cols={4} className="mb-4">
        <Stat label="PRs this month" value={mtd.length} sub={idrShort(mtd.reduce((s, p) => s + prAmount(p), 0)) + ' requested'} icon={<ShoppingCart size={16} />} />
        <Stat label="Awaiting approval" value={pending.length} sub={idrShort(pending.reduce((s, p) => s + prAmount(p), 0))} tone="warn" icon={<Hourglass size={16} />} />
        <Stat label="Budget escalations open" value={escalatedOpen.length} sub={`${prs.filter((p) => p.escalated).length} escalated this quarter`} tone={escalatedOpen.length ? 'bad' : 'good'} icon={<AlertOctagon size={16} />} />
        <Stat label="Lines without project code" value={0} sub="Rejected at entry — enforced by the database" tone="good" icon={<ClipboardCheck size={16} />} />
      </Grid>

      {escalatedOpen.length > 0 && (
        <div className="mb-4">
          <Callout tone="red" icon={<AlertOctagon size={18} />} title={`${escalatedOpen.length} requisition(s) exceed remaining RAB and wait for Finance Director`}>
            {escalatedOpen.map((p) => (
              <span key={p.id} className="mr-3"><TextLink to={`/procurement/requisitions/${p.id}`}>{p.id}</TextLink> {p.title} ({idrShort(prAmount(p))})</span>
            ))}
          </Callout>
        </div>
      )}

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'all', label: 'All', count: prs.length },
          { key: 'pending', label: 'Pending approval', count: pending.length },
          { key: 'escalated', label: 'Escalated', count: prs.filter((p) => p.escalated).length },
          { key: 'sourcing', label: 'Approved / RFQ', count: prs.filter((p) => p.status === 'Approved' || p.status === 'RFQ').length },
          { key: 'po', label: 'PO issued', count: prs.filter((p) => p.status === 'PO Issued').length },
          { key: 'closed', label: 'Draft / rejected', count: prs.filter((p) => p.status === 'Draft' || p.status === 'Rejected').length },
        ]}
      />
      <Card padded={false}>
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search PR number or title…" className="w-full sm:w-64" />
          <Select value={proj} onChange={(e) => setProj(e.target.value)}>
            <option value="">All project codes</option>
            {chargeableProjects.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
          </Select>
        </div>
        <DataTable
          rows={rows}
          rowKey={(p) => p.id}
          onRowClick={(p) => nav(`/procurement/requisitions/${p.id}`)}
          columns={[
            { key: 'id', header: 'PR', render: (p) => <div className="min-w-[220px]"><div className="font-mono text-[11px] text-slate-500">{p.id} · {date(p.date)}</div><div className="font-medium text-slate-800">{p.title}</div></div> },
            { key: 'pc', header: 'Project code', render: (p) => <div className="flex flex-col items-start gap-1">{codes(p).map((c) => <ProjectCodeChip key={c} code={c} />)}</div> },
            { key: 'req', header: 'Requester', render: (p) => <Person id={p.requesterId} /> },
            { key: 'l', header: 'Lines', align: 'right', render: (p) => p.lines.length },
            { key: 'amt', header: 'Amount', align: 'right', render: (p) => <span className="font-medium">{idrShort(prAmount(p))}</span> },
            { key: 'bc', header: 'Budget check', render: (p) => <BudgetResult rows={p.snapshot} /> },
            { key: 'st', header: 'Status', render: (p) => <PRStatusBadge status={p.status} escalated={p.escalated} /> },
            { key: 'next', header: 'RFQ / PO', render: (p) => <div className="flex flex-col gap-0.5">{p.rfqId && <TextLink to={`/procurement/rfq/${p.rfqId}`}>{p.rfqId}</TextLink>}{p.poId && <TextLink to={`/procurement/orders/${p.poId}`}>{p.poId}</TextLink>}{!p.rfqId && !p.poId && <span className="text-xs text-slate-400">—</span>}</div> },
          ]}
        />
      </Card>
      <NewPRDrawer open={open} onClose={() => setOpen(false)} onCreated={(id) => nav(`/procurement/requisitions/${id}`)} />
    </>
  )
}
