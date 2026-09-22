import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Banknote, Clock, Mail, Phone, ArrowRight } from 'lucide-react'
import { customers, getCustomer, getContract } from '@/data/core'
import { arInvoices, arGross, arOutstanding, arRetention, retentions, type ArInvoice } from '@/data/finance'
import { PageHeader, Card, CardHeader, Grid, Stat, Tabs, DataTable, Button, ProjectCodeChip, Mono, Drawer, DescList, Timeline, Select, SearchInput, Badge, Callout, Input, cx, type Column } from '@/components/ui'
import { SERIES, NEUTRAL, GRID, axisProps, ChartTooltip, Legend } from '@/lib/chart'
import { useToast } from '@/lib/app-state'
import { date, daysUntil, idr, idrShort, num } from '@/lib/format'
import { ArchiveNote, DocLink, empName } from './components'

type Tab = 'invoices' | 'ageing' | 'retention' | 'collections'
const BUCKETS = ['Current', '1–30', '31–60', '61–90', '> 90'] as const
const BUCKET_COLORS = [NEUTRAL, SERIES[3], SERIES[1], SERIES[7], '#7f1d1d']

const bucketOf = (i: ArInvoice) => {
  const d = -daysUntil(i.dueDate)
  if (d <= 0) return 'Current'
  if (d <= 30) return '1–30'
  if (d <= 60) return '31–60'
  if (d <= 90) return '61–90'
  return '> 90'
}
const statusOf = (i: ArInvoice) => (arOutstanding(i) === 0 ? 'Paid' : i.received > 0 ? 'Partially paid' : daysUntil(i.dueDate) < 0 ? 'Overdue' : 'Open')

export default function Receivables() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('invoices')
  const [rows, setRows] = useState<ArInvoice[]>(arInvoices)
  const [q, setQ] = useState('')
  const [cust, setCust] = useState('')
  const [st, setSt] = useState('')
  const [note, setNote] = useState('')
  const openId = params.get('open')
  const selected = rows.find((r) => r.id === openId)
  const open = (id: string | null) => {
    if (id) params.set('open', id)
    else params.delete('open')
    setParams(params, { replace: true })
  }

  const openItems = rows.filter((r) => arOutstanding(r) > 0)
  const outstanding = openItems.reduce((s, r) => s + arOutstanding(r), 0)
  const overdue = openItems.filter((r) => daysUntil(r.dueDate) < 0)
  const retentionTotal = retentions.reduce((s, r) => s + r.retained - r.released, 0)

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (cust && r.customerId !== cust) return false
        if (st && statusOf(r) !== st) return false
        const t = `${r.id} ${r.description} ${getCustomer(r.customerId)?.name} ${r.projectCode} ${r.skNo ?? ''}`.toLowerCase()
        return !q || t.includes(q.toLowerCase())
      }),
    [rows, q, cust, st],
  )

  const ageing = useMemo(
    () =>
      customers
        .map((c) => {
          const mine = openItems.filter((r) => r.customerId === c.id)
          const row: Record<string, number | string> = { name: c.name.replace(/\s*\(.*\)/, ''), id: c.id, total: 0 }
          for (const b of BUCKETS) row[b] = mine.filter((r) => bucketOf(r) === b).reduce((s, r) => s + arOutstanding(r), 0)
          row.total = mine.reduce((s, r) => s + arOutstanding(r), 0)
          return row
        })
        .filter((r) => (r.total as number) > 0),
    [openItems],
  )

  const cols: Column<ArInvoice>[] = [
    { key: 'id', header: 'Invoice', render: (r) => <div className="whitespace-nowrap"><Mono className="font-medium">{r.id}</Mono>{r.migrated && <div className="text-[10px] text-slate-400">Migrated · CUT-01</div>}</div> },
    { key: 'c', header: 'Customer', render: (r) => <div className="min-w-[200px]"><div>{getCustomer(r.customerId)?.name}</div><div className="text-[11px] text-slate-500">{r.description}</div></div> },
    { key: 'pc', header: 'Project', render: (r) => <ProjectCodeChip code={r.projectCode} /> },
    { key: 'd', header: 'Date / due', render: (r) => <div className="text-xs whitespace-nowrap">{date(r.date)}<br /><span className={cx(daysUntil(r.dueDate) < 0 && arOutstanding(r) > 0 ? 'text-red-600' : 'text-slate-500')}>due {date(r.dueDate)}</span></div> },
    { key: 'g', header: 'Gross (incl. PPN)', align: 'right', render: (r) => idr(arGross(r)) },
    { key: 'ret', header: 'Retention', align: 'right', render: (r) => (arRetention(r) ? idr(arRetention(r)) : '—') },
    { key: 'o', header: 'Outstanding', align: 'right', render: (r) => <b>{idr(arOutstanding(r))}</b> },
    { key: 'b', header: 'Ageing', render: (r) => (arOutstanding(r) ? <span className="text-xs whitespace-nowrap">{bucketOf(r)}{bucketOf(r) !== 'Current' ? ' days' : ''}</span> : '') },
    { key: 's', header: 'Status', render: (r) => { const s = statusOf(r); return <Badge dot tone={s === 'Paid' ? 'green' : s === 'Overdue' ? 'red' : s === 'Partially paid' ? 'amber' : 'blue'}>{s}</Badge> } },
  ]

  return (
    <div>
      <PageHeader
        module="M10 · Accounts Receivable & Billing"
        title="Receivables"
        subtitle="AR invoices, ageing by customer, retention receivable and collections."
        crumbs={[{ label: 'Finance' }, { label: 'Receivables' }]}
        actions={<Link to="/finance/billing"><Button icon={<ArrowRight size={15} />}>Billing pipeline</Button></Link>}
      />

      <Grid cols={4} className="mb-4">
        <Stat label="Outstanding receivables" value={idrShort(outstanding)} sub={`${openItems.length} open invoices`} icon={<Banknote size={16} />} />
        <Stat label="Overdue" value={idrShort(overdue.reduce((s, r) => s + arOutstanding(r), 0))} sub={`${overdue.length} invoices past due`} tone="bad" icon={<Clock size={16} />} />
        <Stat label="DSO (rolling 90 days)" value="52 days" sub="Target 45 · weighted payment terms 38" tone="warn" />
        <Stat label="Retention receivable" value={idrShort(retentionTotal)} sub="Released on contract milestones" />
      </Grid>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'invoices', label: 'Invoices', count: rows.length },
          { key: 'ageing', label: 'Ageing by customer' },
          { key: 'retention', label: 'Retention', count: retentions.length },
          { key: 'collections', label: 'Collections', count: rows.filter((r) => r.collection?.length).length },
        ]}
      />

      {tab === 'invoices' && (
        <Card padded={false}>
          <div className="flex flex-wrap gap-2 px-4 pt-4 pb-3">
            <SearchInput value={q} onChange={setQ} placeholder="Invoice, customer, SK, project…" className="w-full sm:w-72" />
            <Select value={cust} onChange={(e) => setCust(e.target.value)}>
              <option value="">All customers</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={st} onChange={(e) => setSt(e.target.value)}>
              <option value="">Any status</option>
              {['Open', 'Overdue', 'Partially paid', 'Paid'].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <DataTable columns={cols} rows={filtered} rowKey={(r) => r.id} onRowClick={(r) => open(r.id)} />
          <div className="border-t border-slate-100 px-4 py-2.5"><ArchiveNote>open items at 31 Dec 2027 migrated at document level (CUT-01)</ArchiveNote></div>
        </Card>
      )}

      {tab === 'ageing' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Outstanding by customer and age" subtitle="Days past due date, IDR incl. PPN, net of retention" />
            <Legend items={BUCKETS.map((b, i) => ({ label: b === 'Current' ? 'Not yet due' : `${b} days`, color: BUCKET_COLORS[i] }))} />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ageing} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" {...axisProps} interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis {...axisProps} tickFormatter={(v: number) => idrShort(v).replace('IDR ', '')} width={60} />
                <Tooltip content={<ChartTooltip format={idrShort} />} cursor={{ fill: '#f1f5f9' }} />
                {BUCKETS.map((b, i) => (
                  <Bar key={b} dataKey={b} name={b === 'Current' ? 'Not yet due' : `${b} days`} stackId="a" fill={BUCKET_COLORS[i]} radius={i === BUCKETS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} maxBarSize={56} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card padded={false}>
            <DataTable
              rows={ageing}
              rowKey={(r) => String(r.id)}
              onRowClick={(r) => { setCust(String(r.id)); setTab('invoices') }}
              columns={[
                { key: 'n', header: 'Customer', render: (r) => <span className="font-medium">{String(r.name)}</span> },
                ...BUCKETS.map((b) => ({ key: b, header: b === 'Current' ? 'Not due' : b, align: 'right' as const, render: (r: Record<string, number | string>) => ((r[b] as number) ? idr(r[b] as number) : '—') })),
                { key: 't', header: 'Total', align: 'right', render: (r) => <b>{idr(r.total as number)}</b> },
              ]}
            />
          </Card>
        </div>
      )}

      {tab === 'retention' && (
        <Card padded={false}>
          <DataTable
            rows={retentions}
            rowKey={(r) => r.contractId}
            columns={[
              { key: 'c', header: 'Contract', render: (r) => <Link to={`/contracts/${r.contractId}`} className="hover:underline"><Mono>{r.contractId}</Mono><div className="text-xs text-slate-500">{getContract(r.contractId)?.title}</div></Link> },
              { key: 'cu', header: 'Customer', render: (r) => getCustomer(getContract(r.contractId)?.customerId)?.name },
              { key: 'p', header: 'Project', render: (r) => { const c = getContract(r.contractId); return c ? <ProjectCodeChip code={c.projectCode} /> : '—' } },
              { key: 'pct', header: 'Rate', align: 'right', render: (r) => `${getContract(r.contractId)?.retentionPct}%` },
              { key: 'b', header: 'Billed to date', align: 'right', render: (r) => idr(r.billed) },
              { key: 'r', header: 'Retained', align: 'right', render: (r) => idr(r.retained) },
              { key: 'rel', header: 'Released', align: 'right', render: (r) => idr(r.released) },
              { key: 'cond', header: 'Release condition', render: (r) => <span className="text-xs">{r.releaseCondition}</span> },
              { key: 'd', header: 'Expected release', render: (r) => <span className="whitespace-nowrap">{date(r.releaseDate)}</span> },
            ]}
            footer={<tr><td colSpan={5} className="px-3 py-2 text-right">Total retention receivable</td><td className="num px-3 py-2 text-right">{idr(retentionTotal)}</td><td colSpan={3} /></tr>}
          />
        </Card>
      )}

      {tab === 'collections' && (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.filter((r) => r.collection?.length).map((r) => (
            <Card key={r.id}>
              <CardHeader
                title={<button className="font-mono hover:underline" onClick={() => open(r.id)}>{r.id}</button>}
                subtitle={`${getCustomer(r.customerId)?.name} · outstanding ${idr(arOutstanding(r))}`}
                actions={<Badge tone={daysUntil(r.dueDate) < 0 ? 'red' : 'blue'}>{daysUntil(r.dueDate) < 0 ? `${-daysUntil(r.dueDate)} d overdue` : `due in ${daysUntil(r.dueDate)} d`}</Badge>}
              />
              <Timeline items={r.collection!.map((c) => ({ time: `${date(c.at)} · ${empName(c.by)}`, title: c.action, tone: 'blue' as const }))} />
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <Drawer
          open
          onClose={() => open(null)}
          width="max-w-2xl"
          title={<span className="flex items-center gap-2"><span className="font-mono">{selected.id}</span><Badge dot tone={statusOf(selected) === 'Overdue' ? 'red' : statusOf(selected) === 'Paid' ? 'green' : 'blue'}>{statusOf(selected)}</Badge></span>}
          footer={
            arOutstanding(selected) > 0 ? (
              <>
                <Button icon={<Mail size={15} />} onClick={() => { toast(`Reminder with invoice copy & e-Faktur sent to ${getCustomer(selected.customerId)?.name}`, 'success') }}>Send reminder</Button>
                <Button variant="primary" icon={<Phone size={15} />} onClick={() => {
                  if (!note.trim()) return toast('Describe the collection activity first', 'info')
                  setRows((rs) => rs.map((x) => (x.id === selected.id ? { ...x, collection: [...(x.collection ?? []), { at: '2028-03-10', by: 'EMP-0022', action: note.trim() }] } : x)))
                  setNote('')
                  toast('Collection activity logged', 'success')
                }}>Log activity</Button>
              </>
            ) : undefined
          }
        >
          <div className="space-y-5">
            {selected.migrated && <Callout tone="slate">Open item migrated at document level from SAP B1 (CUT-01). <ArchiveNote className="mt-1" /></Callout>}
            <DescList
              cols={2}
              items={[
                { label: 'Customer', value: getCustomer(selected.customerId)?.name },
                { label: 'Contract', value: <Link to={`/contracts/${selected.contractId}`} className="hover:underline">{selected.contractId}</Link> },
                { label: 'Project', value: <ProjectCodeChip code={selected.projectCode} showName /> },
                { label: 'Surat Konversi', value: selected.skNo ? <DocLink to={`/finance/billing/reconciliation?q=${selected.skNo}`}>{selected.skNo}</DocLink> : '—' },
                { label: 'Invoice date', value: date(selected.date) },
                { label: 'Due date', value: `${date(selected.dueDate)} (${getCustomer(selected.customerId)?.paymentTermDays} days)` },
                { label: 'e-Faktur', value: <DocLink to="/finance/tax">{selected.fakturNo}</DocLink> },
                { label: 'Description', value: selected.description },
              ]}
            />
            <div className="rounded-lg border border-slate-200">
              {[
                ['DPP', selected.dpp],
                ['PPN 11%', selected.ppn],
                ['Gross invoice', arGross(selected)],
                [`Retention ${selected.retentionPct}% (to 1103.02)`, -arRetention(selected)],
                ['Received (cash + PPh 23 withheld)', -selected.received],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between border-b border-slate-100 px-3 py-2 text-sm last:border-0"><span className="text-slate-600">{k}</span><span className="num">{idr(v as number)}</span></div>
              ))}
              <div className="flex justify-between bg-slate-50 px-3 py-2 text-sm font-semibold"><span>Outstanding</span><span className="num">{idr(arOutstanding(selected))}</span></div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold">Collection log</h4>
              {selected.collection?.length ? <Timeline items={selected.collection.map((c) => ({ time: `${date(c.at)} · ${empName(c.by)}`, title: c.action, tone: 'blue' as const }))} /> : <p className="text-sm text-slate-400">No activity yet.</p>}
              {arOutstanding(selected) > 0 && <Input className="mt-3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Called AP — payment scheduled 15 Mar" />}
            </div>
            <p className="text-xs text-slate-500">Total open with this customer: {num(openItems.filter((r) => r.customerId === selected.customerId).length)} invoice(s), {idr(openItems.filter((r) => r.customerId === selected.customerId).reduce((s, r) => s + arOutstanding(r), 0))}</p>
          </div>
        </Drawer>
      )}
    </div>
  )
}
