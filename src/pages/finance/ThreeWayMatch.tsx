import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GitCompare, TriangleAlert, CircleCheck, Send, SlidersHorizontal, HandCoins, MessageSquare, ArrowRight } from 'lucide-react'
import { getPO, getVendor } from '@/data/core'
import { loketInvoices, matchCases, tolerances as seedTol, evaluateMatch, invTotal, poOf, type LoketInvoice, type Tolerance, type MatchCase } from '@/data/finance'
import { PageHeader, Card, CardHeader, Grid, Stat, Tabs, DataTable, Button, StatusBadge, ProjectCodeChip, Mono, Drawer, Callout, Input, Badge, cx, type Column } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { ageDays, dateTime, idr, idrShort, num, pct } from '@/lib/format'
import { DocLink, VendorLink } from './components'

type Tab = 'queue' | 'exceptions' | 'approved' | 'tolerance'

export default function ThreeWayMatch() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'queue')
  const [rows, setRows] = useState<LoketInvoice[]>(loketInvoices.filter((i) => ['Matching', 'Exception', 'Approved for payment'].includes(i.status)))
  const [cases, setCases] = useState<MatchCase[]>(matchCases)
  const [tol, setTol] = useState<Tolerance[]>(seedTol)
  const openId = params.get('open')
  const selected = rows.find((r) => r.receiptNo === openId)

  const open = (id: string | null) => {
    if (id) params.set('open', id)
    else params.delete('open')
    setParams(params, { replace: true })
  }
  const update = (id: string, patch: Partial<LoketInvoice>) => setRows((rs) => rs.map((r) => (r.receiptNo === id ? { ...r, ...patch } : r)))

  const queue = rows.filter((r) => r.status === 'Matching')
  const exceptions = rows.filter((r) => r.status === 'Exception')
  const approved = rows.filter((r) => r.status === 'Approved for payment')

  const baseCols: Column<LoketInvoice>[] = [
    { key: 'r', header: 'Receipt', render: (r) => <Mono className="font-medium">{r.receiptNo}</Mono> },
    { key: 'v', header: 'Vendor', render: (r) => <div className="min-w-[180px]"><VendorLink id={r.vendorId} /><div className="text-[11px] text-slate-500">{r.description}</div></div> },
    { key: 'po', header: 'PO', render: (r) => (r.poId ? <DocLink to={`/procurement/orders/${r.poId}`}>{r.poId}</DocLink> : <DocLink>{poOf(r) ?? 'Non-PO'}</DocLink>) },
    { key: 'cat', header: 'Category', render: (r) => cases.find((c) => c.receiptNo === r.receiptNo)?.category ?? getPO(r.poId)?.costCategory ?? '—' },
    { key: 'pc', header: 'Project', render: (r) => <ProjectCodeChip code={r.projectCode} /> },
    { key: 'amt', header: 'Invoice', align: 'right', render: (r) => idr(invTotal(r)) },
  ]

  const queueCols: Column<LoketInvoice>[] = [
    ...baseCols,
    {
      key: 'res', header: 'Match result',
      render: (r) => {
        const mc = cases.find((c) => c.receiptNo === r.receiptNo)
        if (!mc) return <Badge tone="slate">No GR yet</Badge>
        const ev = evaluateMatch(mc, tol)
        return ev.ok ? <Badge tone="green">Within tolerance</Badge> : <Badge tone="orange">Out of tolerance</Badge>
      },
    },
  ]

  const excCols: Column<LoketInvoice>[] = [
    ...baseCols.slice(0, 3),
    { key: 'why', header: 'Exception', render: (r) => <span className="text-xs text-orange-700">{r.exception}</span> },
    { key: 'age', header: 'Age', align: 'right', render: (r) => `${ageDays(r.receivedAt)} d` },
    {
      key: 'loop', header: 'Vendor loop',
      render: (r) => {
        const th = cases.find((c) => c.receiptNo === r.receiptNo)?.clarification ?? []
        const last = th[th.length - 1]
        return last ? <span className="flex items-center gap-1 text-xs whitespace-nowrap text-slate-600"><MessageSquare size={12} />{th.length} · last {last.from === 'Vendor' ? 'from vendor' : 'from us'}</span> : <span className="text-xs text-slate-400">Not started</span>
      },
    },
    baseCols[5],
  ]

  const apprCols: Column<LoketInvoice>[] = [
    ...baseCols,
    { key: 'jv', header: 'AP journal', render: (r) => (r.journalId ? <DocLink to={`/finance/gl/${r.journalId}`}>{r.journalId}</DocLink> : <span className="text-xs text-slate-400">On posting</span>) },
    {
      key: 'run', header: 'Payment run',
      render: (r) =>
        r.paymentRun ? (
          <DocLink to="/finance/ap/payments">{r.paymentRun}</DocLink>
        ) : (
          <Button size="sm" onClick={(e) => { e.stopPropagation(); update(r.receiptNo, { paymentRun: 'PAY-2028-03-02' }); toast(`${r.receiptNo} added to payment run PAY-2028-03-02`, 'success') }}>Add to run</Button>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        module="M9 · Accounts Payable"
        title="Three-way match"
        subtitle="Purchase order, goods/service receipt and vendor invoice reconciled before payment approval, with tolerances configured per purchasing category (PROC-18)."
        crumbs={[{ label: 'Finance' }, { label: 'Loket Invoice', to: '/finance/loket' }, { label: 'Three-way match' }]}
        actions={<Button icon={<SlidersHorizontal size={15} />} onClick={() => setTab('tolerance')}>Tolerances</Button>}
      />

      <Grid cols={4} className="mb-4">
        <Stat label="Ready to match" value={num(queue.length)} sub={idrShort(queue.reduce((s, r) => s + invTotal(r), 0))} icon={<GitCompare size={16} />} />
        <Stat label="Exception queue" value={num(exceptions.length)} sub="PROC-19 · clarification through vendor portal" tone="warn" icon={<TriangleAlert size={16} />} />
        <Stat label="Approved for payment" value={num(approved.length)} sub={idrShort(approved.reduce((s, r) => s + invTotal(r), 0))} icon={<HandCoins size={16} />} to="/finance/ap/payments" />
        <Stat label="First-pass match rate · Feb" value={pct(86.4)} sub="74 of 86 invoices matched without exception" tone="good" />
      </Grid>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'queue', label: 'Match queue', count: queue.length },
          { key: 'exceptions', label: 'Exceptions', count: exceptions.length },
          { key: 'approved', label: 'Payment approval queue', count: approved.length },
          { key: 'tolerance', label: 'Tolerance configuration' },
        ]}
      />

      {tab === 'queue' && <Card padded={false}><DataTable columns={queueCols} rows={queue} rowKey={(r) => r.receiptNo} onRowClick={(r) => open(r.receiptNo)} empty="Match queue is empty" /></Card>}
      {tab === 'exceptions' && <Card padded={false}><DataTable columns={excCols} rows={exceptions} rowKey={(r) => r.receiptNo} onRowClick={(r) => open(r.receiptNo)} empty="No exceptions" /></Card>}
      {tab === 'approved' && (
        <Card padded={false}>
          <DataTable columns={apprCols} rows={approved} rowKey={(r) => r.receiptNo} onRowClick={(r) => open(r.receiptNo)} />
          <div className="flex justify-end border-t border-slate-100 px-4 py-3"><Link to="/finance/ap/payments"><Button variant="primary" icon={<ArrowRight size={15} />}>Go to payment runs</Button></Link></div>
        </Card>
      )}
      {tab === 'tolerance' && (
        <Card>
          <CardHeader title="Tolerance per purchasing category" subtitle="An invoice line passes if both quantity and price variance are within % limits, or the absolute amount variance is within the IDR limit. Changes are versioned and need Finance Director approval." actions={<Button variant="primary" size="sm" onClick={() => toast('Tolerance change submitted for approval — effective on approval', 'success')}>Save changes</Button>} />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] text-slate-500 uppercase"><th className="py-2">Category</th><th>Qty %</th><th>Price %</th><th>Abs. IDR</th><th>Rationale</th></tr>
              </thead>
              <tbody>
                {tol.map((t, i) => (
                  <tr key={t.category} className="border-b border-slate-100">
                    <td className="py-2 font-medium">{t.category}</td>
                    {(['qtyPct', 'pricePct', 'absIdr'] as const).map((k) => (
                      <td key={k} className="pr-2">
                        <Input value={String(t[k])} onChange={(e) => setTol((ts) => ts.map((x, j) => (j === i ? { ...x, [k]: Number(e.target.value) || 0 } : x)))} className={cx('h-8', k === 'absIdr' ? 'w-32' : 'w-20')} inputMode="decimal" />
                      </td>
                    ))}
                    <td className="text-xs text-slate-500">{t.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selected && (
        <MatchDrawer
          inv={selected}
          mc={cases.find((c) => c.receiptNo === selected.receiptNo)}
          tol={tol}
          onClose={() => open(null)}
          onUpdate={(p) => update(selected.receiptNo, p)}
          onMessage={(text) =>
            setCases((cs) => {
              const msg = { at: '2028-03-10T' + new Date().toTimeString().slice(0, 5), from: 'Petrolog' as const, name: 'Maya Anggraini', text }
              const found = cs.find((c) => c.receiptNo === selected.receiptNo)
              if (found) return cs.map((c) => (c.receiptNo === selected.receiptNo ? { ...c, clarification: [...(c.clarification ?? []), msg] } : c))
              return [...cs, { receiptNo: selected.receiptNo, category: 'Subcontract', grRefs: [], lines: [], clarification: [msg] }]
            })
          }
        />
      )}
    </div>
  )
}

function MatchDrawer({ inv, mc, tol, onClose, onUpdate, onMessage }: { inv: LoketInvoice; mc?: MatchCase; tol: Tolerance[]; onClose: () => void; onUpdate: (p: Partial<LoketInvoice>) => void; onMessage: (t: string) => void }) {
  const toast = useToast()
  const [msg, setMsg] = useState('')
  const ev = mc && mc.lines.length ? evaluateMatch(mc, tol) : undefined
  const po = getPO(inv.poId)
  const vendor = getVendor(inv.vendorId)

  const approve = () => {
    if (ev && !ev.ok) return toast('Out of tolerance — resolve the exception before approval', 'error')
    if (po && po.status === 'Pending Approval') return toast('PO not yet approved — cannot approve invoice', 'error')
    onUpdate({ status: 'Approved for payment', exception: undefined })
    toast(`${inv.receiptNo} matched — AP journal posted, GR/IR cleared, queued for payment approval`, 'success')
    onClose()
  }

  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-3xl"
      title={<span className="flex items-center gap-2"><span className="font-mono">{inv.receiptNo}</span><StatusBadge status={inv.status} /></span>}
      footer={
        inv.status === 'Approved for payment' ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <>
            {inv.status === 'Matching' && <Button onClick={() => { onUpdate({ status: 'Exception', exception: 'Raised manually by AP officer' }); toast('Moved to exception queue', 'warning') }}>Raise exception</Button>}
            {inv.status === 'Exception' && <Button onClick={() => { onUpdate({ status: 'Approved for payment', exception: undefined }); toast('Variance accepted with PO amendment reference — approved for payment', 'success'); onClose() }}>Accept variance</Button>}
            <Button variant="success" icon={<CircleCheck size={15} />} onClick={approve}>Approve for payment</Button>
          </>
        )
      }
    >
      <div className="space-y-5">
        {inv.exception && <Callout tone="orange" icon={<TriangleAlert size={16} />} title="Exception">{inv.exception}</Callout>}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="bg-slate-50">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Purchase order</div>
            <div className="mt-1 font-mono text-sm">{po ? <DocLink to={`/procurement/orders/${po.id}`}>{po.id}</DocLink> : (poOf(inv) ?? 'Non-PO')}</div>
            <div className="mt-1 text-xs text-slate-500">{po ? `${po.status} · ${idr(po.amount)}` : 'Historical / non-PO'}</div>
          </Card>
          <Card className="bg-slate-50">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Receipt (GR / BAST)</div>
            <div className="mt-1 font-mono text-sm">{mc?.grRefs.length ? mc.grRefs.join(', ') : '—'}</div>
            <div className="mt-1 text-xs text-slate-500">{mc?.grRefs.length ? <Link className="underline" to="/procurement/receipts">Open receipts</Link> : 'No receipt recorded'}</div>
          </Card>
          <Card className="bg-slate-50">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Vendor invoice</div>
            <div className="mt-1 font-mono text-sm">{inv.vendorInvoiceNo}</div>
            <div className="mt-1 text-xs text-slate-500">{vendor?.name} · {idr(invTotal(inv))}</div>
          </Card>
        </div>

        {ev ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold">Line comparison · {mc!.category}</h4>
              <span className="text-xs text-slate-500">Tolerance: qty ±{ev.tolerance.qtyPct}% · price ±{ev.tolerance.pricePct}% · or ≤ {idr(ev.tolerance.absIdr)}</span>
            </div>
            <div className="scrollbar-thin overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase">
                  <tr><th className="px-2 py-2 text-left">Item</th><th className="px-2 text-right">PO qty</th><th className="px-2 text-right">GR qty</th><th className="px-2 text-right">Inv qty</th><th className="px-2 text-right">PO price</th><th className="px-2 text-right">Inv price</th><th className="px-2 text-right">Variance</th><th className="px-2" /></tr>
                </thead>
                <tbody>
                  {ev.lines.map((l) => (
                    <tr key={l.item} className={cx('border-t border-slate-100', !l.ok && 'bg-orange-50/50')}>
                      <td className="px-2 py-2">{l.item} <span className="text-xs text-slate-400">({l.uom})</span></td>
                      <td className="num px-2 text-right">{num(l.poQty, l.poQty % 1 ? 1 : 0)}</td>
                      <td className="num px-2 text-right">{num(l.grQty, l.grQty % 1 ? 1 : 0)}</td>
                      <td className={cx('num px-2 text-right', l.invQty !== l.grQty && 'font-semibold text-orange-700')}>{num(l.invQty, l.invQty % 1 ? 1 : 0)}</td>
                      <td className="num px-2 text-right">{num(l.poPrice)}</td>
                      <td className={cx('num px-2 text-right', l.invPrice !== l.poPrice && 'font-semibold text-orange-700')}>{num(l.invPrice)}</td>
                      <td className="num px-2 text-right">{l.amtVar ? idr(l.amtVar) : '—'}</td>
                      <td className="px-2">{l.ok ? <CircleCheck size={15} className="text-emerald-600" /> : <TriangleAlert size={15} className="text-orange-600" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-sm">{ev.ok ? <span className="text-emerald-700">All lines within tolerance — ready for approval.</span> : <span className="text-orange-700">One or more lines out of tolerance.</span>}</div>
          </div>
        ) : (
          <Callout tone="slate">No line-level receipt data for this invoice (non-PO or pass-through). Matched against supporting documents in the Loket checklist.</Callout>
        )}

        <div>
          <h4 className="mb-2 text-sm font-semibold">Vendor clarification loop <span className="font-normal text-slate-500">— visible to the vendor in the portal</span></h4>
          <div className="space-y-2">
            {(mc?.clarification ?? []).map((m, i) => (
              <div key={i} className={cx('rounded-lg px-3 py-2 text-sm', m.from === 'Vendor' ? 'mr-8 bg-slate-100' : 'ml-8 bg-sky-50')}>
                <div className="mb-0.5 text-[11px] text-slate-500">{m.name} · {dateTime(m.at)}</div>
                {m.text}
              </div>
            ))}
            {!(mc?.clarification ?? []).length && <div className="text-sm text-slate-400">No messages yet.</div>}
          </div>
          <div className="mt-2 flex gap-2">
            <Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ask the vendor to clarify or issue a credit note…" />
            <Button icon={<Send size={14} />} onClick={() => { if (!msg.trim()) return; onMessage(msg.trim()); setMsg(''); toast('Message posted to vendor portal — vendor notified by e-mail', 'success') }}>Send</Button>
          </div>
        </div>
      </div>
    </Drawer>
  )
}
