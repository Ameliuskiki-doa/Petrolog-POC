import { useMemo, useState } from 'react'
import { ArrowRight, PackageCheck, PackageOpen, Plus, Receipt as ReceiptIcon, Truck } from 'lucide-react'
import { Badge, Button, Callout, Card, DataTable, Drawer, FormField, Grid, Input, PageHeader, ProjectCodeChip, SearchInput, Select, Stat, Tabs } from '@/components/ui'
import { allPurchaseOrders, findVendor, poDetails, receiptValue, type Receipt } from '@/data/procurement'
import { date, idr, idrShort, num, TODAY_ISO } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { MODULE_PROC, Person, TextLink, VendorLink, receivedByLine } from './shared'
import { poStore, receiptStore, usePOState, useReceipts } from './store'

const serviceCats = ['Subcontract', 'Services', 'Permits & Tolls']

export default function Receipts() {
  const rc = useReceipts()
  const st = usePOState()
  const [tab, setTab] = useState<'receipts' | 'awaiting'>('receipts')
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState('')

  const poOf = (id: string) => allPurchaseOrders.find((p) => p.id === id)!
  const pos = allPurchaseOrders.map((p) => ({ ...p, status: st[p.id]?.status ?? p.status }))
  const receivable = pos.filter((p) => p.status === 'Approved' || p.status === 'Partially Received')

  const isPartialAt = (r: Receipt) => {
    // Partial when, after this receipt (chronologically), the PO still has outstanding quantity
    const upto = rc.filter((x) => x.poId === r.poId && x.date <= r.date)
    const got = receivedByLine(r.poId, upto)
    return (poDetails[r.poId]?.lines ?? []).some((l, i) => got[i] < l.qty)
  }

  const rows = rc
    .filter((r) => (!type || r.type === type) && (!q || `${r.id} ${r.poId} ${poOf(r.poId)?.description} ${findVendor(poOf(r.poId)?.vendorId)?.name}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const mtd = rc.filter((r) => r.date >= '2028-03-01')

  return (
    <>
      <PageHeader
        module={MODULE_PROC}
        title="Goods & service receipts"
        subtitle="GR for goods, SR for services. Partial receipts are supported (PROC-15)."
        actions={<Button variant="primary" icon={<Plus size={16} />} onClick={() => { setPreset(''); setOpen(true) }}>Record receipt</Button>}
      />
      <Grid cols={4} className="mb-4">
        <Stat label="Receipts this month" value={mtd.length} sub={`${mtd.filter((r) => r.type === 'GR').length} GR · ${mtd.filter((r) => r.type === 'SR').length} SR`} icon={<PackageCheck size={16} />} />
        <Stat label="Converted to actual cost (MTD)" value={idrShort(mtd.reduce((s, r) => s + receiptValue(r), 0))} sub="Commitment released on the same project codes" tone="good" icon={<ArrowRight size={16} />} />
        <Stat label="POs partially received" value={pos.filter((p) => p.status === 'Partially Received').length} icon={<PackageOpen size={16} />} />
        <Stat label="POs awaiting first receipt" value={receivable.filter((p) => p.status === 'Approved').length} icon={<Truck size={16} />} />
      </Grid>
      <div className="mb-4">
        <Callout tone="blue" icon={<ReceiptIcon size={18} />} title="A receipt turns a commitment into actual cost">
          Posting a GR/SR moves its value from <b>commitments</b> to <b>actuals</b> on the project code of each PO line (FAT-02). Remaining budget (RAB − actuals − commitments) does not change; project P/L shows the cost in the period it was received.
        </Callout>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'receipts', label: 'Posted receipts', count: rc.length }, { key: 'awaiting', label: 'Awaiting receipt', count: receivable.length }]} />

      {tab === 'receipts' ? (
        <Card padded={false}>
          <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
            <SearchInput value={q} onChange={setQ} placeholder="Search receipt, PO, vendor…" className="w-full sm:w-64" />
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">GR & SR</option>
              <option value="GR">Goods receipts (GR)</option>
              <option value="SR">Service receipts (SR)</option>
            </Select>
          </div>
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              { key: 'id', header: 'Receipt', render: (r) => <div><div className="font-mono text-[12px] font-medium">{r.id}</div><Badge tone={r.type === 'GR' ? 'sky' : 'violet'}>{r.type === 'GR' ? 'Goods' : 'Service'}</Badge></div> },
              { key: 'd', header: 'Date', render: (r) => <span className="whitespace-nowrap">{date(r.date)}</span> },
              { key: 'po', header: 'PO', render: (r) => <div className="min-w-[200px]"><TextLink to={`/procurement/orders/${r.poId}`}>{r.poId}</TextLink><div className="text-xs text-slate-500">{poOf(r.poId)?.description}</div></div> },
              { key: 'v', header: 'Vendor', render: (r) => <div className="max-w-[180px]"><VendorLink id={poOf(r.poId)?.vendorId ?? ''} /></div> },
              { key: 'pc', header: 'Project code', render: (r) => <ProjectCodeChip code={poOf(r.poId)?.projectCode ?? ''} /> },
              { key: 'q', header: 'Received', render: (r) => <div className="text-xs text-slate-600">{r.lines.map((l) => { const pl = poDetails[r.poId]?.lines[l.line]; return <div key={l.line}>{num(l.qty)} {pl?.uom} · {pl?.desc.slice(0, 28)}</div> })}</div> },
              { key: 'val', header: 'Value → actual', align: 'right', render: (r) => <span className="font-medium">{idrShort(receiptValue(r))}</span> },
              { key: 'p', header: 'Receipt type', render: (r) => (isPartialAt(r) ? <Badge tone="amber">Partial</Badge> : <Badge tone="green">Completes PO</Badge>) },
              { key: 'by', header: 'Received by', render: (r) => <Person id={r.receivedBy} /> },
            ]}
          />
        </Card>
      ) : (
        <Card padded={false}>
          <DataTable
            rows={receivable}
            rowKey={(p) => p.id}
            columns={[
              { key: 'po', header: 'PO', render: (p) => <div className="min-w-[200px]"><TextLink to={`/procurement/orders/${p.id}`}>{p.id}</TextLink><div className="text-xs text-slate-500">{p.description}</div></div> },
              { key: 'v', header: 'Vendor', render: (p) => <VendorLink id={p.vendorId} /> },
              { key: 'pc', header: 'Project code', render: (p) => <ProjectCodeChip code={p.projectCode} /> },
              { key: 'a', header: 'PO value', align: 'right', render: (p) => idrShort(p.amount) },
              { key: 'o', header: 'Outstanding commitment', align: 'right', render: (p) => { const got = receivedByLine(p.id, rc); const d = poDetails[p.id]; return idrShort((d?.lines ?? []).reduce((s, l, i) => s + (l.qty - got[i]) * l.price, 0)) } },
              { key: 's', header: 'Status', render: (p) => <Badge tone={p.status === 'Approved' ? 'green' : 'sky'} dot>{p.status}</Badge> },
              { key: 'x', header: '', render: (p) => <Button size="sm" onClick={() => { setPreset(p.id); setOpen(true) }}>Receive</Button> },
            ]}
          />
        </Card>
      )}
      <ReceiveDrawer key={preset + String(open)} open={open} onClose={() => setOpen(false)} preset={preset} receivable={receivable.map((p) => p.id)} />
    </>
  )
}

function ReceiveDrawer({ open, onClose, preset, receivable }: { open: boolean; onClose: () => void; preset: string; receivable: string[] }) {
  const rc = useReceipts()
  const toast = useToast()
  const [poId, setPoId] = useState(preset || receivable[0] || '')
  const po = allPurchaseOrders.find((p) => p.id === poId)
  const d = poDetails[poId]
  const got = useMemo(() => receivedByLine(poId, rc), [poId, rc])
  const [qty, setQty] = useState<number[]>(() => (poDetails[poId]?.lines ?? []).map((l, i) => l.qty - (receivedByLine(poId, rc)[i] ?? 0)))
  const [location, setLocation] = useState(d?.deliveryTo ?? '')

  const choose = (id: string) => {
    setPoId(id)
    const g = receivedByLine(id, rc)
    setQty((poDetails[id]?.lines ?? []).map((l, i) => l.qty - g[i]))
    setLocation(poDetails[id]?.deliveryTo ?? '')
  }

  const value = (d?.lines ?? []).reduce((s, l, i) => s + (qty[i] || 0) * l.price, 0)
  const over = (d?.lines ?? []).some((l, i) => (qty[i] || 0) > l.qty - got[i])
  const willComplete = (d?.lines ?? []).every((l, i) => got[i] + (qty[i] || 0) >= l.qty)
  const type: Receipt['type'] = po && serviceCats.includes(po.costCategory) ? 'SR' : 'GR'

  const post = () => {
    if (!po || !d) return
    if (over) return toast('Received quantity cannot exceed the outstanding PO quantity', 'error')
    if (value <= 0) return toast('Enter a quantity on at least one line', 'error')
    const all = receiptStore.get()
    const n = Math.max(...all.filter((r) => r.type === type).map((r) => Number(r.id.slice(-4)))) + 1
    const id = `${type}-2028-${String(n).padStart(4, '0')}`
    const rec: Receipt = { id, type, poId, date: TODAY_ISO, receivedBy: 'EMP-0006', location, lines: qty.map((q, i) => ({ line: i, qty: q })).filter((l) => l.qty > 0) }
    receiptStore.set((s) => [rec, ...s])
    poStore.set((s) => ({ ...s, [poId]: { ...s[poId], status: willComplete ? 'Received' : 'Partially Received' } }))
    toast(`${id} posted — ${idrShort(value)} moved from commitment to actual cost on ${po.projectCode}${willComplete ? '' : ' (partial receipt)'}`, 'success')
    onClose()
  }

  return (
    <Drawer open={open} onClose={onClose} width="max-w-3xl" title="Record goods / service receipt" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={post} disabled={!po}>Post {type}</Button></>}>
      {receivable.length === 0 ? (
        <div className="text-sm text-slate-500">No approved POs awaiting receipt.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Purchase order">
              <Select className="w-full" value={poId} onChange={(e) => choose(e.target.value)}>
                {receivable.map((id) => <option key={id} value={id}>{id} — {allPurchaseOrders.find((p) => p.id === id)?.description}</option>)}
              </Select>
            </FormField>
            <FormField label="Received at"><Input value={location} onChange={(e) => setLocation(e.target.value)} /></FormField>
          </div>
          {po && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <Badge tone={type === 'GR' ? 'sky' : 'violet'}>{type === 'GR' ? 'Goods receipt' : 'Service receipt'}</Badge>
              <span>{findVendor(po.vendorId)?.name}</span>
              <ProjectCodeChip code={po.projectCode} />
            </div>
          )}
          <div className="scrollbar-thin overflow-x-auto rounded-lg ring-1 ring-slate-200">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  <th className="px-3 py-2">Line</th>
                  <th className="px-3 py-2 text-right">Ordered</th>
                  <th className="px-3 py-2 text-right">Received to date</th>
                  <th className="px-3 py-2 text-right">Receive now</th>
                  <th className="px-3 py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {(d?.lines ?? []).map((l, i) => {
                  const bad = (qty[i] || 0) > l.qty - got[i]
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2"><div className="font-medium text-slate-800">{l.desc}</div><ProjectCodeChip code={l.projectCode} /></td>
                      <td className="num px-3 py-2 text-right">{num(l.qty)} {l.uom}</td>
                      <td className="num px-3 py-2 text-right">{num(got[i])}</td>
                      <td className="px-3 py-2 text-right"><Input type="number" min={0} value={qty[i] ?? 0} onChange={(e) => setQty((s) => s.map((x, k) => (k === i ? Number(e.target.value) : x)))} className={`ml-auto h-8 w-28 text-right ${bad ? 'border-red-500' : ''}`} /></td>
                      <td className="num px-3 py-2 text-right font-medium">{idrShort((qty[i] || 0) * l.price)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {over && <Callout tone="red">Quantity exceeds what is outstanding on the PO.</Callout>}
          <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Effect on {po?.projectCode}</div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">Commitments <b className="num text-slate-900">− {idr(value)}</b></span>
              <ArrowRight size={16} className="text-slate-400" />
              <span className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">Actual cost <b className="num text-slate-900">+ {idr(value)}</b></span>
              <Badge tone={willComplete ? 'green' : 'amber'}>{willComplete ? 'Completes the PO' : 'Partial receipt — PO stays open'}</Badge>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}
