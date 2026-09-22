import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Receipt, FileText, Send, Stamp, CircleCheck, ArrowRight, TriangleAlert, Plus } from 'lucide-react'
import { jobs, getJob, getContract, getCustomer } from '@/data/core'
import { billableItems, billableAmount, billingDocs as seed, billingStages, docAmount, lineAmount, rateOnDate, type BillingDoc, type BillingStage, type BillableItem } from '@/data/finance'
import { PageHeader, Card, Grid, Stat, Tabs, DataTable, Button, ProjectCodeChip, Mono, Drawer, Callout, Stepper, DescList, Badge, Select, type Column } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, dateTime, idr, idrShort, num } from '@/lib/format'
import { DocLink, empName } from './components'

type Tab = 'work' | 'docs'

const stageTone: Record<BillingStage, 'slate' | 'amber' | 'sky' | 'violet' | 'green'> = {
  'Proforma draft': 'slate',
  'Awaiting client approval': 'amber',
  'Client approved': 'sky',
  'Surat Konversi issued': 'violet',
  Invoiced: 'green',
}

export default function Billing() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('work')
  const [docs, setDocs] = useState<BillingDoc[]>(seed)
  const [items, setItems] = useState<BillableItem[]>(billableItems)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [stage, setStage] = useState<BillingStage | ''>('')
  const [openNo, setOpenNo] = useState<string | null>(null)
  const selected = docs.find((d) => d.proformaNo === openNo)

  const awaitingVerification = jobs.filter((j) => j.status === 'Completed')
  const workValue = items.reduce((s, i) => s + billableAmount(i).amount, 0)
  const skOpen = docs.filter((d) => d.stage === 'Surat Konversi issued')
  const shown = useMemo(() => docs.filter((d) => !stage || d.stage === stage), [docs, stage])

  const createProforma = () => {
    const chosen = items.filter((i) => picked.has(i.id))
    if (!chosen.length) return toast('Select verified work to include', 'info')
    const contracts = new Set(chosen.map((c) => c.contractId))
    if (contracts.size > 1) return toast('A proforma covers one contract — select items from a single contract', 'error')
    const c = getContract(chosen[0].contractId)!
    const no = `PF-2028-03-00${11 + docs.length - seed.length}`
    const doc: BillingDoc = {
      proformaNo: no, customerId: c.customerId, contractId: c.id, projectCode: chosen[0].projectCode, title: chosen.length === 1 ? chosen[0].description : `${chosen.length} verified items — ${c.title}`,
      stage: 'Proforma draft', proformaDate: '2028-03-10', preparedBy: 'EMP-0022',
      lines: chosen.map((i) => {
        const r = rateOnDate(i.contractId, i.rateItem, i.workDate)
        return { description: i.description, rateItem: i.rateItem, workDate: i.workDate, qty: i.qty, basis: r?.basis ?? 'lump sum', rate: r?.rate ?? 0, rateEffective: r?.effectiveFrom ?? i.workDate, sourceRef: i.ref }
      }),
    }
    setDocs((d) => [doc, ...d])
    setItems((is) => is.filter((i) => !picked.has(i.id)))
    setPicked(new Set())
    setTab('docs')
    setOpenNo(no)
    toast(`${no} created from ${chosen.length} verified item(s) — rates from rate card effective on each work date`, 'success')
  }

  const advance = (d: BillingDoc) => {
    const next: Partial<BillingDoc> =
      d.stage === 'Proforma draft' ? { stage: 'Awaiting client approval' }
      : d.stage === 'Awaiting client approval' ? { stage: 'Client approved', clientApprovedAt: '2028-03-10T11:00', clientApprover: 'Client representative (portal e-approval)' }
      : d.stage === 'Client approved' ? { stage: 'Surat Konversi issued', skNo: `SK-2028-03-00${10 + docs.filter((x) => x.skNo?.startsWith('SK-2028-03')).length}`, skDate: '2028-03-10' }
      : { stage: 'Invoiced', invoiceNo: `INV-2028-03-00${10 + docs.filter((x) => x.invoiceNo?.startsWith('INV-2028-03')).length}`, invoiceDate: '2028-03-10' }
    setDocs((ds) => ds.map((x) => (x.proformaNo === d.proformaNo ? { ...x, ...next } : x)))
    const msg =
      d.stage === 'Proforma draft' ? 'Proforma sent to client for approval'
      : d.stage === 'Awaiting client approval' ? 'Client approval recorded'
      : d.stage === 'Client approved' ? `Surat Konversi ${next.skNo} issued — unbilled revenue recognised`
      : `AR invoice ${next.invoiceNo} posted · e-Faktur queued for Coretax`
    toast(msg, 'success')
  }

  const workCols: Column<BillableItem>[] = [
    {
      key: 'sel', header: '',
      render: (i) => <input type="checkbox" checked={picked.has(i.id)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(i.id)) n.delete(i.id); else n.add(i.id); return n })} onClick={(e) => e.stopPropagation()} />,
    },
    { key: 'ref', header: 'Source', render: (i) => (i.kind === 'Job' && getJob(i.ref) ? <DocLink to={`/ops/jobs/${i.ref}`}>{i.ref}</DocLink> : <DocLink to="/timesheets">{i.ref}</DocLink>) },
    { key: 'kind', header: 'Type', render: (i) => <Badge tone={i.kind === 'Job' ? 'blue' : 'violet'}>{i.kind}</Badge> },
    { key: 'd', header: 'Work', render: (i) => <div className="min-w-[220px]"><div className="text-slate-800">{i.description}</div><div className="text-[11px] text-slate-500">{getCustomer(i.customerId)?.name} · <Link className="hover:underline" to={`/contracts/${i.contractId}`}>{i.contractId}</Link></div></div> },
    { key: 'pc', header: 'Project', render: (i) => <ProjectCodeChip code={i.projectCode} /> },
    { key: 'wd', header: 'Work date', render: (i) => <span className="whitespace-nowrap">{date(i.workDate)}</span> },
    { key: 'q', header: 'Qty', align: 'right', render: (i) => `${num(i.qty)} ${billableAmount(i).basis.replace('per ', '')}` },
    {
      key: 'r', header: 'Rate (effective)', align: 'right',
      render: (i) => {
        const b = billableAmount(i)
        return <div className="whitespace-nowrap">{idr(b.rate)}<div className="text-[11px] text-slate-500">from {date(b.effectiveFrom)}</div></div>
      },
    },
    { key: 'a', header: 'Amount', align: 'right', render: (i) => <b>{idr(billableAmount(i).amount)}</b> },
    { key: 'v', header: 'Verified', render: (i) => <span className="text-xs whitespace-nowrap text-slate-500">{empName(i.verifiedBy)}<br />{dateTime(i.verifiedAt)}</span> },
  ]

  const docCols: Column<BillingDoc>[] = [
    { key: 'pf', header: 'Proforma', render: (d) => <Mono className="font-medium">{d.proformaNo}</Mono> },
    { key: 't', header: 'Description', render: (d) => <div className="min-w-[220px]"><div>{d.title}</div><div className="text-[11px] text-slate-500">{getCustomer(d.customerId)?.name}</div></div> },
    { key: 'pc', header: 'Project', render: (d) => <ProjectCodeChip code={d.projectCode} /> },
    { key: 'amt', header: 'Value', align: 'right', render: (d) => idr(docAmount(d)) },
    { key: 'sk', header: 'Surat Konversi', render: (d) => (d.skNo ? <Mono>{d.skNo}</Mono> : <span className="text-slate-300">—</span>) },
    { key: 'inv', header: 'AR invoice', render: (d) => (d.invoiceNo ? <DocLink to={`/finance/ar?open=${d.invoiceNo}`}>{d.invoiceNo}</DocLink> : <span className="text-slate-300">—</span>) },
    { key: 'st', header: 'Stage', render: (d) => <Badge tone={stageTone[d.stage]} dot>{d.stage}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        module="M10 · Accounts Receivable & Billing"
        title="Billing & Surat Konversi"
        subtitle="Only verified work is billable. Proformas aggregate verified jobs and timesheets (FAT-20); the Surat Konversi converts client-approved work into a billing basis (FAT-15); the AR invoice uses the contract rate effective on the work date (FAT-14)."
        crumbs={[{ label: 'Finance' }, { label: 'Billing' }]}
        actions={
          <>
            <Link to="/finance/billing/reconciliation"><Button icon={<ArrowRight size={15} />}>Konversi vs invoice</Button></Link>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => { setTab('work'); createProforma() }}>Create proforma{picked.size ? ` (${picked.size})` : ''}</Button>
          </>
        }
      />

      <Card className="mb-4">
        <div className="scrollbar-thin flex items-center gap-2 overflow-x-auto text-sm">
          {['Verified work', ...billingStages].map((s, i, arr) => (
            <div key={s} className="flex items-center gap-2 whitespace-nowrap">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {s}{' '}
                <span className="num ml-1 text-slate-500">{s === 'Verified work' ? items.length : docs.filter((d) => d.stage === s).length}</span>
              </span>
              {i < arr.length - 1 && <ArrowRight size={14} className="text-slate-300" />}
            </div>
          ))}
        </div>
      </Card>

      <Grid cols={4} className="mb-4">
        <Stat label="Verified, not yet on proforma" value={idrShort(workValue)} sub={`${items.length} items ready to bill`} icon={<Receipt size={16} />} />
        <Stat label="Awaiting client approval" value={idrShort(docs.filter((d) => d.stage === 'Awaiting client approval').reduce((s, d) => s + docAmount(d), 0))} sub={`${docs.filter((d) => d.stage === 'Awaiting client approval').length} proforma(s)`} tone="warn" />
        <Stat label="Surat Konversi not invoiced" value={idrShort(skOpen.reduce((s, d) => s + docAmount(d), 0))} sub={`${skOpen.length} SK — revenue leakage watch`} tone="bad" to="/finance/billing/reconciliation" icon={<TriangleAlert size={16} />} />
        <Stat label="Invoiced · Mar 2028" value={idrShort(docs.filter((d) => d.invoiceDate?.startsWith('2028-03')).reduce((s, d) => s + docAmount(d), 0))} sub="Excl. PPN" to="/finance/ar" />
      </Grid>

      {awaitingVerification.length > 0 && (
        <div className="mb-4">
          <Callout tone="amber" title={`${awaitingVerification.length} completed jobs awaiting verification — not billable yet`}>
            Drivers have declared completion ({awaitingVerification.map((j) => j.id).join(', ')}); operations admin must verify POD before they enter the billing pipeline.{' '}
            <Link to="/ops/jobs" className="underline">Open job orders</Link>
          </Callout>
        </div>
      )}

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ key: 'work', label: 'Billable verified work', count: items.length }, { key: 'docs', label: 'Proforma → SK → invoice', count: docs.length }]} />

      {tab === 'work' && (
        <Card padded={false}>
          <DataTable columns={workCols} rows={items} rowKey={(i) => i.id} empty="All verified work is on a proforma" onRowClick={(i) => setPicked((p) => { const n = new Set(p); if (n.has(i.id)) n.delete(i.id); else n.add(i.id); return n })} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
            <span className="text-xs text-slate-500">Select items from one contract, then create a proforma for client approval.</span>
            <Button variant="primary" icon={<FileText size={15} />} onClick={createProforma} disabled={!picked.size}>Create proforma ({picked.size})</Button>
          </div>
        </Card>
      )}

      {tab === 'docs' && (
        <Card padded={false}>
          <div className="flex flex-wrap gap-2 px-4 pt-4 pb-3">
            <Select value={stage} onChange={(e) => setStage(e.target.value as BillingStage | '')}>
              <option value="">All stages</option>
              {billingStages.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <DataTable columns={docCols} rows={shown} rowKey={(d) => d.proformaNo} onRowClick={(d) => setOpenNo(d.proformaNo)} />
        </Card>
      )}

      {selected && (
        <Drawer
          open
          onClose={() => setOpenNo(null)}
          width="max-w-3xl"
          title={<span className="flex items-center gap-2"><span className="font-mono">{selected.proformaNo}</span><Badge tone={stageTone[selected.stage]} dot>{selected.stage}</Badge></span>}
          footer={
            selected.stage === 'Invoiced' ? (
              <Link to={`/finance/ar?open=${selected.invoiceNo}`}><Button variant="primary" icon={<ArrowRight size={15} />}>Open AR invoice</Button></Link>
            ) : (
              <Button variant="primary" icon={selected.stage === 'Proforma draft' ? <Send size={15} /> : selected.stage === 'Client approved' ? <Stamp size={15} /> : <CircleCheck size={15} />} onClick={() => advance(selected)}>
                {selected.stage === 'Proforma draft' ? 'Send to client' : selected.stage === 'Awaiting client approval' ? 'Record client approval' : selected.stage === 'Client approved' ? 'Issue Surat Konversi' : 'Create AR invoice'}
              </Button>
            )
          }
        >
          <div className="space-y-5">
            <Stepper steps={billingStages} current={selected.stage} />
            <DescList
              cols={3}
              items={[
                { label: 'Customer', value: getCustomer(selected.customerId)?.name },
                { label: 'Contract', value: <Link className="hover:underline" to={`/contracts/${selected.contractId}`}>{selected.contractId}</Link> },
                { label: 'Project', value: <ProjectCodeChip code={selected.projectCode} /> },
                { label: 'Proforma date', value: date(selected.proformaDate) },
                { label: 'Client approval', value: selected.clientApprovedAt ? `${dateTime(selected.clientApprovedAt)}` : '—' },
                { label: 'Approved by (client)', value: selected.clientApprover ?? '—' },
                { label: 'Surat Konversi', value: selected.skNo ? `${selected.skNo} · ${date(selected.skDate!)}` : '—' },
                { label: 'AR invoice', value: selected.invoiceNo ? <DocLink to={`/finance/ar?open=${selected.invoiceNo}`}>{selected.invoiceNo}</DocLink> : '—' },
                { label: 'Prepared by', value: empName(selected.preparedBy) },
              ]}
            />
            <div className="scrollbar-thin overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase">
                  <tr><th className="px-3 py-2 text-left">Line</th><th className="px-3 text-left">Work date</th><th className="px-3 text-right">Qty</th><th className="px-3 text-right">Rate</th><th className="px-3 text-left">Rate card from</th><th className="px-3 text-right">Amount</th></tr>
                </thead>
                <tbody>
                  {selected.lines.map((l, i) => {
                    const current = getContract(selected.contractId)?.rateCard.filter((r) => r.item === l.rateItem).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
                    const older = current && current.effectiveFrom > l.workDate
                    return (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2"><div>{l.description}</div><div className="font-mono text-[11px] text-slate-500">{l.sourceRef}</div></td>
                        <td className="px-3 whitespace-nowrap">{date(l.workDate)}</td>
                        <td className="num px-3 text-right">{num(l.qty, l.qty % 1 ? 1 : 0)}</td>
                        <td className="num px-3 text-right">{idr(l.rate)}</td>
                        <td className="px-3 text-xs whitespace-nowrap">{date(l.rateEffective)} {older && <Badge tone="sky">prior rate</Badge>}</td>
                        <td className="num px-3 text-right font-medium">{idr(lineAmount(l))}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                  <tr><td colSpan={5} className="px-3 py-2 text-right">DPP</td><td className="num px-3 text-right">{idr(docAmount(selected))}</td></tr>
                  <tr><td colSpan={5} className="px-3 py-1 text-right font-normal text-slate-500">PPN 11% (on invoice)</td><td className="num px-3 text-right font-normal text-slate-500">{idr(Math.round(docAmount(selected) * 0.11))}</td></tr>
                </tfoot>
              </table>
            </div>
            {selected.lines.some((l) => { const c = getContract(selected.contractId)?.rateCard.filter((r) => r.item === l.rateItem).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]; return c && c.effectiveFrom > l.workDate }) && (
              <Callout tone="sky" title="Rate card effective on the work date (FAT-14)">
                Work performed before the current rate took effect is billed at the rate in force on the work date — here IDR 46,000/t (from 01 Jul 2027) rather than today's IDR 48,500/t (from 01 Jan 2028).
              </Callout>
            )}
            {selected.invoiceAmount && selected.invoiceAmount !== docAmount(selected) && (
              <Callout tone="orange" title="Invoice differs from Surat Konversi">Invoice value {idr(selected.invoiceAmount)} vs SK {idr(docAmount(selected))}. See reconciliation.</Callout>
            )}
          </div>
        </Drawer>
      )}
    </div>
  )
}

