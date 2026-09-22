import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { TriangleAlert, FilePlus2, CircleCheck, Scale, ArrowRight } from 'lucide-react'
import { getCustomer } from '@/data/core'
import { billingDocs, docAmount } from '@/data/finance'
import { PageHeader, Card, CardHeader, Grid, Stat, DataTable, Button, ProjectCodeChip, Mono, SearchInput, Select, Callout, Badge, cx, type Column } from '@/components/ui'
import { SERIES, GRID, axisProps, ChartTooltip } from '@/lib/chart'
import { useToast } from '@/lib/app-state'
import { ageDays, date, idr, idrShort, num } from '@/lib/format'
import { DocLink } from './components'

type RecStatus = 'Matched' | 'Not invoiced' | 'Value variance'

interface RecRow {
  skNo: string
  skDate: string
  customerId: string
  projectCode: string
  contractId: string
  title: string
  skValue: number
  invoiceNo?: string
  invoiceDate?: string
  invoiceValue?: number
  status: RecStatus
}

const build = (): RecRow[] =>
  billingDocs
    .filter((d) => d.skNo)
    .map((d): RecRow => {
      const v = docAmount(d)
      const inv = d.invoiceNo ? (d.invoiceAmount ?? v) : undefined
      return {
        skNo: d.skNo!, skDate: d.skDate!, customerId: d.customerId, projectCode: d.projectCode, contractId: d.contractId, title: d.title, skValue: v,
        invoiceNo: d.invoiceNo, invoiceDate: d.invoiceDate, invoiceValue: inv,
        status: !d.invoiceNo ? 'Not invoiced' : inv !== v ? 'Value variance' : 'Matched',
      }
    })
    .concat([
      { skNo: 'SK-2028-02-0011', skDate: '2028-02-08', customerId: 'CUS-003', projectCode: 'HL-2027-021', contractId: 'CTR-2027-016', title: 'Crane 200T hours — January (188 h)', skValue: 911_800_000, invoiceNo: 'INV-2028-02-0009', invoiceDate: '2028-02-10', invoiceValue: 911_800_000, status: 'Matched' },
      { skNo: 'SK-2028-02-0006', skDate: '2028-02-03', customerId: 'CUS-002', projectCode: 'PS-2028-003', contractId: 'CTR-2027-019', title: 'Catalyst change-out — milestone 1 (40%)', skValue: 3_840_000_000, invoiceNo: 'INV-2028-02-0004', invoiceDate: '2028-02-05', invoiceValue: 3_840_000_000, status: 'Matched' },
      { skNo: 'SK-2028-01-0015', skDate: '2028-01-30', customerId: 'CUS-001', projectCode: 'HL-2027-014.01', contractId: 'CTR-2027-011', title: 'Coal hauling — January (70,350 t)', skValue: 3_412_000_000, invoiceNo: 'INV-2028-01-0007', invoiceDate: '2028-01-31', invoiceValue: 3_412_000_000, status: 'Matched' },
      { skNo: 'SK-2028-01-0009', skDate: '2028-01-20', customerId: 'CUS-006', projectCode: 'GS-2027-008', contractId: 'CTR-2027-014', title: 'Engineering & design milestone (100%)', skValue: 2_140_000_000, invoiceNo: 'INV-2028-01-0003', invoiceDate: '2028-01-22', invoiceValue: 2_140_000_000, status: 'Matched' },
    ])
    .sort((a, b) => b.skDate.localeCompare(a.skDate))

export default function KonversiReconciliation() {
  const toast = useToast()
  const [params] = useSearchParams()
  const [rows, setRows] = useState<RecRow[]>(build)
  const [q, setQ] = useState(params.get('q') ?? '')
  const [status, setStatus] = useState<RecStatus | ''>('')
  const [overdueOnly, setOverdueOnly] = useState(false)

  const unmatched = rows.filter((r) => r.status === 'Not invoiced')
  const variance = rows.filter((r) => r.status === 'Value variance')
  const over14 = unmatched.filter((r) => ageDays(r.skDate) > 14)
  const atRisk = unmatched.reduce((s, r) => s + r.skValue, 0) + variance.reduce((s, r) => s + (r.skValue - (r.invoiceValue ?? 0)), 0)
  const issued90 = rows.reduce((s, r) => s + r.skValue, 0)

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (status && r.status !== status) return false
        if (overdueOnly && !(r.status === 'Not invoiced' && ageDays(r.skDate) > 14)) return false
        const t = `${r.skNo} ${r.invoiceNo ?? ''} ${r.title} ${getCustomer(r.customerId)?.name} ${r.projectCode}`.toLowerCase()
        return !q || t.includes(q.toLowerCase())
      }),
    [rows, q, status, overdueOnly],
  )

  const byCustomer = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of unmatched) m.set(r.customerId, (m.get(r.customerId) ?? 0) + r.skValue)
    return [...m.entries()].map(([id, value]) => ({ name: (getCustomer(id)?.name ?? id).replace(/\s*\(.*\)/, ''), value })).sort((a, b) => b.value - a.value)
  }, [unmatched])

  const createInvoice = (r: RecRow) => {
    const no = `INV-2028-03-00${String(10 + rows.filter((x) => x.invoiceNo?.startsWith('INV-2028-03')).length).padStart(2, '0')}`
    setRows((rs) => rs.map((x) => (x.skNo === r.skNo ? { ...x, invoiceNo: no, invoiceDate: '2028-03-10', invoiceValue: x.skValue, status: 'Matched' } : x)))
    toast(`${no} created from ${r.skNo} for ${idr(r.skValue)} + PPN — e-Faktur queued`, 'success')
  }

  const cols: Column<RecRow>[] = [
    { key: 'sk', header: 'Surat Konversi', render: (r) => <div className="whitespace-nowrap"><Mono className="font-medium">{r.skNo}</Mono><div className="text-[11px] text-slate-500">{date(r.skDate)}</div></div> },
    { key: 'c', header: 'Customer / work', render: (r) => <div className="min-w-[220px]"><div>{r.title}</div><div className="text-[11px] text-slate-500">{getCustomer(r.customerId)?.name} · <Link to={`/contracts/${r.contractId}`} className="hover:underline">{r.contractId}</Link></div></div> },
    { key: 'pc', header: 'Project', render: (r) => <ProjectCodeChip code={r.projectCode} /> },
    { key: 'sv', header: 'SK value', align: 'right', render: (r) => idr(r.skValue) },
    { key: 'inv', header: 'AR invoice', render: (r) => (r.invoiceNo ? <div className="whitespace-nowrap"><DocLink to={`/finance/ar?open=${r.invoiceNo}`}>{r.invoiceNo}</DocLink><div className="text-[11px] text-slate-500">{date(r.invoiceDate!)}</div></div> : <span className="text-xs text-red-600">No invoice</span>) },
    { key: 'iv', header: 'Invoice value', align: 'right', render: (r) => (r.invoiceValue !== undefined ? idr(r.invoiceValue) : '—') },
    { key: 'var', header: 'Variance', align: 'right', render: (r) => { const v = (r.invoiceValue ?? 0) - r.skValue; return <span className={cx(v < 0 && 'font-semibold text-red-600')}>{r.invoiceValue === undefined ? idr(-r.skValue) : v ? idr(v) : '0'}</span> } },
    {
      key: 'age', header: 'Document age', align: 'right',
      render: (r) => {
        if (r.status === 'Matched') return <span className="text-slate-400">—</span>
        const a = ageDays(r.skDate)
        return <span className={cx('whitespace-nowrap', a > 14 ? 'font-semibold text-red-600' : 'text-amber-700')}>{a} days</span>
      },
    },
    { key: 'st', header: 'Status', render: (r) => <Badge tone={r.status === 'Matched' ? 'green' : r.status === 'Value variance' ? 'orange' : 'red'} dot>{r.status}</Badge> },
    {
      key: 'act', header: '',
      render: (r) =>
        r.status === 'Not invoiced' ? (
          <Button size="sm" variant="primary" icon={<FilePlus2 size={13} />} onClick={() => createInvoice(r)}>Create invoice</Button>
        ) : r.status === 'Value variance' ? (
          <Button size="sm" onClick={() => { setRows((rs) => rs.map((x) => (x.skNo === r.skNo ? { ...x, invoiceValue: x.skValue, status: 'Matched' } : x))); toast(`Supplementary invoice for ${idr(r.skValue - (r.invoiceValue ?? 0))} raised against ${r.invoiceNo}`, 'success') }}>Invoice difference</Button>
        ) : (
          <CircleCheck size={15} className="text-emerald-600" />
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        module="M10 · Accounts Receivable & Billing"
        title="Surat Konversi vs AR invoice"
        subtitle="Billing variance report: conversion notes without a matching invoice, with document age and value at risk. Closes revenue leakage directly and measurably (FAT-16)."
        crumbs={[{ label: 'Finance' }, { label: 'Billing', to: '/finance/billing' }, { label: 'Konversi vs invoice' }]}
        actions={<Link to="/finance/billing"><Button icon={<ArrowRight size={15} />}>Billing pipeline</Button></Link>}
      />

      <Grid cols={4} className="mb-4">
        <Card className="border-red-200">
          <div className="text-xs font-medium text-slate-500">Revenue leakage — value at risk</div>
          <div className="num mt-1.5 text-2xl font-semibold text-red-700">{idrShort(atRisk)}</div>
          <div className="mt-1 text-xs text-slate-500">{pct1((atRisk / issued90) * 100)} of SK value issued (last 90 days)</div>
        </Card>
        <Stat label="SK without invoice" value={num(unmatched.length)} sub={idrShort(unmatched.reduce((s, r) => s + r.skValue, 0))} tone="bad" icon={<TriangleAlert size={16} />} />
        <Stat label="Unmatched > 14 days" value={num(over14.length)} sub="Escalated to Finance Director" tone={over14.length ? 'bad' : 'good'} />
        <Stat label="Value variances" value={num(variance.length)} sub="Invoice ≠ Surat Konversi" tone="warn" icon={<Scale size={16} />} />
      </Grid>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Uninvoiced Surat Konversi by customer" subtitle="IDR, excl. PPN" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCustomer} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" {...axisProps} interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis {...axisProps} tickFormatter={(v: number) => idrShort(v).replace('IDR ', '')} width={60} />
              <Tooltip content={<ChartTooltip format={idrShort} />} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="value" name="Uninvoiced SK" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Callout tone="orange" icon={<TriangleAlert size={16} />} title="Why this matters">
          Before the platform, Surat Konversi were issued from spreadsheets and some never reached invoicing. Every SK now carries its document age from issue; any SK older than 14 days without an invoice is escalated, and the month cannot close until each is invoiced or accrued as unbilled revenue (close task C-07).
        </Callout>
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-3">
          <SearchInput value={q} onChange={setQ} placeholder="SK, invoice, customer, project…" className="w-full sm:w-72" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as RecStatus | '')}>
            <option value="">All statuses</option>
            {(['Not invoiced', 'Value variance', 'Matched'] as RecStatus[]).map((s) => <option key={s}>{s}</option>)}
          </Select>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} /> Unmatched &gt; 14 days only</label>
        </div>
        <DataTable columns={cols} rows={filtered} rowKey={(r) => r.skNo} rowClassName={(r) => (r.status === 'Not invoiced' && ageDays(r.skDate) > 14 ? 'bg-red-50/40' : undefined)} />
      </Card>
    </div>
  )
}

const pct1 = (n: number) => `${n.toFixed(1)}%`
