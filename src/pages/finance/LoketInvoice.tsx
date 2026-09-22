import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Inbox, Plus, Timer, TriangleAlert, Receipt, ArrowRight, CircleCheck, Undo2, Stamp } from 'lucide-react'
import { vendors, purchaseOrders, getVendor, getPO } from '@/data/core'
import {
  loketInvoices, loketStatuses, docChecklist, invTotal, poOf, ageingBucket, ageingBuckets,
  type LoketInvoice, type LoketStatus, type Channel, type DocKey,
} from '@/data/finance'
import { PageHeader, Card, CardHeader, Grid, Stat, DataTable, Select, SearchInput, Button, StatusBadge, ProjectCodeChip, Mono, Drawer, FormField, Input, Callout, Stepper, DescList, Badge, cx, type Column } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { ageDays, date, dateTime, daysUntil, idr, idrShort, num } from '@/lib/format'
import { DocLink, FilterBar, VendorLink, empName } from './components'

const addDays = (iso: string, n: number) => {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const dueOf = (i: LoketInvoice) => addDays(i.receivedAt, i.termDays)
const docsApplicable = (i: LoketInvoice) => docChecklist.filter((d) => !i.na?.includes(d.key))
const docsDone = (i: LoketInvoice) => docsApplicable(i).filter((d) => i.docs[d.key]).length

export default function LoketInvoice() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [rows, setRows] = useState<LoketInvoice[]>(loketInvoices)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<LoketStatus | ''>('')
  const [channel, setChannel] = useState<Channel | ''>('')
  const [bucket, setBucket] = useState('')
  const [showPaid, setShowPaid] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const openId = params.get('open')
  const selected = rows.find((r) => r.receiptNo === openId)

  const queue = rows.filter((r) => r.status !== 'Paid')
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (!showPaid && !status && r.status === 'Paid') return false
        if (status && r.status !== status) return false
        if (channel && r.channel !== channel) return false
        if (bucket && ageingBucket(ageDays(r.receivedAt)) !== bucket) return false
        const v = getVendor(r.vendorId)
        const t = `${r.receiptNo} ${r.vendorInvoiceNo} ${v?.name} ${poOf(r) ?? ''} ${r.projectCode} ${r.description}`.toLowerCase()
        return !q || t.includes(q.toLowerCase())
      }),
    [rows, q, status, channel, bucket, showPaid],
  )

  const update = (id: string, patch: Partial<LoketInvoice>) => setRows((rs) => rs.map((r) => (r.receiptNo === id ? { ...r, ...patch } : r)))
  const open = (id: string | null) => {
    if (id) params.set('open', id)
    else params.delete('open')
    setParams(params, { replace: true })
  }

  const atRisk = queue.filter((r) => daysUntil(dueOf(r)) <= 7).length

  const cols: Column<LoketInvoice>[] = [
    {
      key: 'rcpt', header: 'Receipt no.',
      render: (r) => (
        <div className="whitespace-nowrap">
          <Mono className="font-medium text-slate-900">{r.receiptNo}</Mono>
          <div className="text-[11px] text-slate-500">{dateTime(r.receivedAt)} · {r.channel}</div>
        </div>
      ),
    },
    {
      key: 'vendor', header: 'Vendor / invoice',
      render: (r) => (
        <div className="min-w-[200px]">
          <VendorLink id={r.vendorId} />
          <div className="text-[11px] text-slate-500"><span className="font-mono">{r.vendorInvoiceNo}</span> · {r.description}</div>
        </div>
      ),
    },
    { key: 'po', header: 'PO', render: (r) => (r.poId ? <DocLink to={`/procurement/orders/${r.poId}`}>{r.poId}</DocLink> : r.poRef ? <DocLink>{r.poRef}</DocLink> : <span className="text-xs text-slate-400">Non-PO</span>) },
    { key: 'pc', header: 'Project', render: (r) => <ProjectCodeChip code={r.projectCode} /> },
    { key: 'amt', header: 'Amount incl. PPN', align: 'right', render: (r) => <span className="whitespace-nowrap">{idr(invTotal(r))}</span> },
    {
      key: 'age', header: 'Doc age', align: 'right',
      render: (r) => {
        const a = ageDays(r.receivedAt)
        return <span className={cx('whitespace-nowrap', r.status !== 'Paid' && a > 14 ? 'font-semibold text-red-600' : r.status !== 'Paid' && a > 7 ? 'text-amber-700' : '')}>{a} d</span>
      },
    },
    {
      key: 'sla', header: 'SLA due',
      render: (r) => {
        const d = daysUntil(dueOf(r))
        return (
          <div className="whitespace-nowrap">
            <div>{date(dueOf(r))}</div>
            {r.status !== 'Paid' && <div className={cx('text-[11px]', d < 0 ? 'text-red-600' : d <= 7 ? 'text-amber-700' : 'text-slate-500')}>{d < 0 ? `${-d} d overdue` : `${d} d left`}</div>}
          </div>
        )
      },
    },
    {
      key: 'docs', header: 'Docs',
      render: (r) => {
        const n = docsApplicable(r).length
        const d = docsDone(r)
        return <Badge tone={d === n ? 'green' : 'amber'}>{d}/{n}</Badge>
      },
    },
    { key: 'st', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ]

  return (
    <div>
      <PageHeader
        module="M9 · Accounts Payable"
        title="Loket Invoice"
        subtitle="Vendor invoice intake. The receipt number and date start the payment SLA clock and give vendors certainty of their submission date (FAT-12)."
        crumbs={[{ label: 'Finance' }, { label: 'Loket Invoice' }]}
        actions={
          <>
            <Link to="/finance/ap/match"><Button icon={<ArrowRight size={15} />}>Three-way match</Button></Link>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setRegisterOpen(true)}>Register invoice</Button>
          </>
        }
      />

      <Grid cols={4} className="mb-4">
        <Stat label="Invoices in queue" value={num(queue.length)} sub={`${idrShort(queue.reduce((s, r) => s + invTotal(r), 0))} awaiting payment`} icon={<Inbox size={16} />} />
        <Stat label="Received today" value={num(rows.filter((r) => r.receivedAt.startsWith('2028-03-10')).length)} sub={`${rows.filter((r) => r.channel === 'Vendor portal').length} of ${rows.length} via vendor portal`} icon={<Receipt size={16} />} />
        <Stat label="Exceptions" value={num(rows.filter((r) => r.status === 'Exception').length)} sub="Vendor clarification via portal" tone="warn" icon={<TriangleAlert size={16} />} to="/finance/ap/match" />
        <Stat label="SLA due within 7 days" value={num(atRisk)} sub="Payment term counted from receipt date" tone={atRisk ? 'bad' : 'good'} icon={<Timer size={16} />} />
      </Grid>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Queue by status" subtitle="Click to filter" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {loketStatuses.map((s) => {
              const list = rows.filter((r) => r.status === s)
              return (
                <button
                  key={s}
                  onClick={() => setStatus(status === s ? '' : s)}
                  className={cx('rounded-lg border px-3 py-2 text-left transition', status === s ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:bg-slate-50')}
                >
                  <div className="text-[11px] text-slate-500">{s}</div>
                  <div className="num text-lg font-semibold text-slate-900">{list.length}</div>
                  <div className="num text-[11px] text-slate-500">{idrShort(list.reduce((x, r) => x + invTotal(r), 0))}</div>
                </button>
              )
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="Document age (open invoices)" subtitle="Since receipt number was issued" />
          <div className="space-y-2">
            {ageingBuckets.map((b) => {
              const list = queue.filter((r) => ageingBucket(ageDays(r.receivedAt)) === b)
              const max = Math.max(1, ...ageingBuckets.map((x) => queue.filter((r) => ageingBucket(ageDays(r.receivedAt)) === x).length))
              return (
                <button key={b} onClick={() => setBucket(bucket === b ? '' : b)} className={cx('flex w-full items-center gap-3 rounded-md px-1 py-0.5 text-left text-sm', bucket === b && 'bg-brand-50')}>
                  <span className="w-20 shrink-0 text-xs text-slate-600">{b}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span className={cx('block h-full rounded-full', b === '> 30 days' ? 'bg-red-500' : b === '15–30 days' ? 'bg-amber-500' : 'bg-slate-500')} style={{ width: `${(list.length / max) * 100}%` }} />
                  </span>
                  <span className="num w-6 text-right text-xs font-medium">{list.length}</span>
                </button>
              )
            })}
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Receipt, vendor, invoice no., PO…" className="w-full sm:w-72" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as LoketStatus | '')}>
            <option value="">All open statuses</option>
            {loketStatuses.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select value={channel} onChange={(e) => setChannel(e.target.value as Channel | '')}>
            <option value="">All channels</option>
            {(['Vendor portal', 'Counter', 'Email'] as Channel[]).map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select value={bucket} onChange={(e) => setBucket(e.target.value)}>
            <option value="">Any age</option>
            {ageingBuckets.map((b) => <option key={b}>{b}</option>)}
          </Select>
          <label className="flex h-9 items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showPaid} onChange={(e) => setShowPaid(e.target.checked)} /> Include paid
          </label>
        </FilterBar>
        <DataTable columns={cols} rows={filtered} rowKey={(r) => r.receiptNo} onRowClick={(r) => open(r.receiptNo)} empty="No invoices in this view" />
      </Card>

      {selected && <InvoiceDrawer inv={selected} onClose={() => open(null)} onUpdate={(p) => update(selected.receiptNo, p)} />}

      <RegisterDrawer
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        existing={rows}
        nextNo={`LKT-2028-03-0${152 + rows.length - loketInvoices.length}`}
        onRegister={(inv) => {
          setRows((rs) => [inv, ...rs])
          setRegisterOpen(false)
          toast(`Receipt ${inv.receiptNo} issued · SLA clock started ${dateTime(inv.receivedAt)} · due ${date(dueOf(inv))}`, 'success')
          open(inv.receiptNo)
        }}
      />
    </div>
  )
}

function InvoiceDrawer({ inv, onClose, onUpdate }: { inv: LoketInvoice; onClose: () => void; onUpdate: (p: Partial<LoketInvoice>) => void }) {
  const toast = useToast()
  const po = getPO(inv.poId)
  const applicable = docsApplicable(inv)
  const complete = docsDone(inv) === applicable.length
  const steps = ['Received', 'Document check', 'Matching', 'Approved for payment', 'Paid']
  const current = inv.status === 'Exception' ? 'Matching' : inv.status

  const toggleDoc = (k: DocKey) => onUpdate({ docs: { ...inv.docs, [k]: !inv.docs[k] } })

  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-2xl"
      title={<span className="flex items-center gap-2"><span className="font-mono">{inv.receiptNo}</span> <StatusBadge status={inv.status} /></span>}
      footer={
        <>
          {(inv.status === 'Received' || inv.status === 'Document check') && (
            <>
              <Button icon={<Undo2 size={15} />} onClick={() => { toast(`Return notice sent to ${getVendor(inv.vendorId)?.name} via vendor portal`, 'info') }}>Return to vendor</Button>
              {inv.status === 'Received' ? (
                <Button variant="primary" onClick={() => { onUpdate({ status: 'Document check' }); toast('Moved to document check', 'success') }}>Start document check</Button>
              ) : (
                <Button
                  variant="primary"
                  icon={<CircleCheck size={15} />}
                  onClick={() => {
                    if (!complete) return toast('Document checklist incomplete — invoice cannot enter matching (FAT-13)', 'error')
                    onUpdate({ status: 'Matching' })
                    toast(`${inv.receiptNo} released to three-way match`, 'success')
                  }}
                >
                  Release to matching
                </Button>
              )}
            </>
          )}
          {(inv.status === 'Matching' || inv.status === 'Exception') && <Link to={`/finance/ap/match?open=${inv.receiptNo}`}><Button variant="primary" icon={<ArrowRight size={15} />}>Open in three-way match</Button></Link>}
          {inv.status === 'Approved for payment' && <Link to="/finance/ap/payments"><Button variant="primary" icon={<ArrowRight size={15} />}>Payment runs</Button></Link>}
          {inv.status === 'Paid' && <Button onClick={onClose}>Close</Button>}
        </>
      }
    >
      <div className="space-y-5">
        <Stepper steps={steps} current={current} />
        {inv.exception && <Callout tone="orange" icon={<TriangleAlert size={16} />} title="Exception">{inv.exception}</Callout>}
        {inv.note && <Callout tone="slate">{inv.note}</Callout>}

        <Card className="bg-slate-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Stamp size={20} className="text-slate-500" />
              <div>
                <div className="text-xs text-slate-500">Receipt issued · SLA clock start</div>
                <div className="font-semibold text-slate-900">{dateTime(inv.receivedAt)} · {inv.channel}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Payment due (term {inv.termDays} d)</div>
              <div className="font-semibold text-slate-900">{date(dueOf(inv))}</div>
            </div>
          </div>
        </Card>

        <DescList
          cols={2}
          items={[
            { label: 'Vendor', value: <VendorLink id={inv.vendorId} /> },
            { label: 'Vendor invoice no.', value: <Mono>{inv.vendorInvoiceNo}</Mono> },
            { label: 'Purchase order', value: po ? <DocLink to={`/procurement/orders/${po.id}`}>{po.id}</DocLink> : (inv.poRef ?? 'Non-PO') },
            { label: 'Project code', value: <ProjectCodeChip code={inv.projectCode} showName /> },
            { label: 'Faktur Pajak', value: inv.fakturNo ? <Mono>{inv.fakturNo}</Mono> : getVendor(inv.vendorId)?.pkp ? <span className="text-amber-700">Missing</span> : 'Not applicable (non-PKP)' },
            { label: 'Handler', value: empName(inv.handler) },
            { label: 'DPP', value: idr(inv.dpp) },
            { label: 'PPN', value: idr(inv.ppn) },
            { label: 'Total', value: <b>{idr(invTotal(inv))}</b> },
            { label: 'Document age', value: `${ageDays(inv.receivedAt)} days` },
            ...(inv.journalId ? [{ label: 'AP journal', value: <DocLink to={`/finance/gl/${inv.journalId}`}>{inv.journalId}</DocLink> }] : []),
            ...(inv.paymentRun ? [{ label: 'Payment run', value: <DocLink to="/finance/ap/payments">{inv.paymentRun}</DocLink> }] : []),
          ]}
        />
        {po && <div className="text-xs text-slate-500">PO value {idr(po.amount)} · {po.description} · category {po.costCategory}</div>}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">Document completeness (FAT-13)</h4>
            <Badge tone={complete ? 'green' : 'amber'}>{docsDone(inv)}/{applicable.length} complete</Badge>
          </div>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {docChecklist.map((d) => {
              const na = inv.na?.includes(d.key)
              const editable = inv.status === 'Received' || inv.status === 'Document check'
              return (
                <li key={d.key} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <label className={cx('flex items-center gap-2', na && 'text-slate-400')}>
                    <input type="checkbox" disabled={na || !editable} checked={!!inv.docs[d.key]} onChange={() => toggleDoc(d.key)} />
                    {d.label}
                  </label>
                  {na ? <span className="text-[11px] text-slate-400">N/A</span> : inv.docs[d.key] ? <CircleCheck size={15} className="text-emerald-600" /> : <span className="text-[11px] text-amber-700">Missing</span>}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </Drawer>
  )
}

function RegisterDrawer({ open, onClose, onRegister, existing, nextNo }: { open: boolean; onClose: () => void; onRegister: (i: LoketInvoice) => void; existing: LoketInvoice[]; nextNo: string }) {
  const toast = useToast()
  const [vendorId, setVendorId] = useState('')
  const [poId, setPoId] = useState('')
  const [invNo, setInvNo] = useState('')
  const [faktur, setFaktur] = useState('')
  const [dpp, setDpp] = useState('')
  const [channel, setChannel] = useState<Channel>('Counter')
  const [error, setError] = useState('')
  const v = getVendor(vendorId)
  const vendorPOs = purchaseOrders.filter((p) => p.vendorId === vendorId)
  const po = getPO(poId)
  const dppN = Number(dpp.replace(/[^\d]/g, '') || 0)
  const ppn = v?.pkp ? Math.round(dppN * 0.11) : 0

  const submit = () => {
    let e = ''
    if (!v) e = 'Select a vendor.'
    else if (v.status === 'Blocked') e = `${v.name} is blocked — invoice cannot be registered. Refer to procurement.`
    else if (!invNo.trim()) e = 'Vendor invoice number is required.'
    else if (existing.some((x) => x.vendorId === vendorId && x.vendorInvoiceNo.toLowerCase() === invNo.trim().toLowerCase())) e = `Duplicate — ${invNo} from this vendor is already registered.`
    else if (!dppN) e = 'Enter the invoice amount (DPP).'
    else if (v.pkp && !faktur.trim()) e = 'PKP vendor: Faktur Pajak number required, or register and flag as missing in document check.'
    setError(e)
    if (e) return toast('Registration blocked', 'error')
    onRegister({
      receiptNo: nextNo, receivedAt: '2028-03-10T' + new Date().toTimeString().slice(0, 5), channel, vendorId, vendorInvoiceNo: invNo.trim(), fakturNo: faktur || undefined,
      poId: po?.id, projectCode: po?.projectCode ?? 'GEN-HO', description: po?.description ?? 'Non-PO invoice', dpp: dppN, ppn, termDays: 30, status: 'Received',
      docs: { invoice: true, faktur: !!faktur, po: !!po }, na: po ? undefined : ['po', 'receipt'], handler: 'EMP-0009',
    })
    setVendorId(''); setPoId(''); setInvNo(''); setFaktur(''); setDpp(''); setError('')
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Register vendor invoice"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<Stamp size={15} />} onClick={submit}>Issue receipt number</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Callout tone="sky">Receipt number <b className="font-mono">{nextNo}</b> will be issued on save. Its timestamp is the vendor's proof of submission and starts the payment SLA clock.</Callout>
        <FormField label="Channel">
          <Select value={channel} onChange={(e) => setChannel(e.target.value as Channel)} className="w-full">
            {(['Counter', 'Email', 'Vendor portal'] as Channel[]).map((c) => <option key={c}>{c}</option>)}
          </Select>
        </FormField>
        <FormField label="Vendor" hint={v ? `${v.status} · ${v.pkp ? 'PKP — PPN 11% applies' : 'Non-PKP — no PPN'} · NPWP ${v.npwp}` : undefined}>
          <Select value={vendorId} onChange={(e) => { setVendorId(e.target.value); setPoId('') }} className="w-full">
            <option value="">Select vendor…</option>
            {vendors.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.status})</option>)}
          </Select>
        </FormField>
        <FormField label="Purchase order" hint={po ? `${po.description} · ${idr(po.amount)} · ${po.projectCode}` : 'Leave empty for non-PO invoices (utilities, service agreements)'}>
          <Select value={poId} onChange={(e) => setPoId(e.target.value)} className="w-full" disabled={!vendorId}>
            <option value="">— Non-PO —</option>
            {vendorPOs.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.status}</option>)}
          </Select>
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Vendor invoice no."><Input value={invNo} onChange={(e) => setInvNo(e.target.value)} placeholder="e.g. BTM/INV/III/2028/021" /></FormField>
          <FormField label="Faktur Pajak no."><Input value={faktur} onChange={(e) => setFaktur(e.target.value)} placeholder="010.xxx-28.xxxxxxxx" disabled={!!v && !v.pkp} /></FormField>
          <FormField label="DPP (IDR)"><Input value={dpp} onChange={(e) => setDpp(e.target.value)} inputMode="numeric" placeholder="0" /></FormField>
          <FormField label="PPN (auto)"><Input value={idr(ppn)} readOnly className="bg-slate-50" /></FormField>
        </div>
        <div className="text-right text-sm">Total <b>{idr(dppN + ppn)}</b></div>
        {error && <Callout tone="red">{error}</Callout>}
      </div>
    </Drawer>
  )
}
