import { useState } from 'react'
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom'
import { CheckCircle2, FileSignature, Download, Receipt, AlertCircle } from 'lucide-react'
import { PageHeader, Card, CardHeader, Button, DescList, Callout, Modal, Mono, DataTable, FormField, Input, Progress } from '@/components/ui'
import { idr, num, date } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { vendorProfiles, invoiceTotals } from '@/data/portal'
import { usePortal, wib } from '../store'
import { PStatus, ProjectRef } from '../bits'

export default function OrderDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { pos, invoices, acknowledge, vendorId } = usePortal()
  const po = pos.find((p) => p.id === id)
  const [open, setOpen] = useState(false)
  const [agree, setAgree] = useState(false)
  const [start, setStart] = useState('2028-03-11')

  if (!po) return <Navigate to="/portal/orders" replace />
  const related = invoices.filter((i) => i.poId === po.id)
  const paidPct = po.milestones.filter((m) => m.status === 'Paid').reduce((s, m) => s + m.pct, 0)
  const term = vendorProfiles[vendorId].paymentTermDays

  function doAck() {
    acknowledge(po!.id)
    setOpen(false)
    toast(`${po!.id} acknowledged — Petrolog procurement notified`, 'success')
  }

  return (
    <div>
      <PageHeader
        module="Vendor Portal · purchase order"
        crumbs={[{ label: 'Home', to: '/portal' }, { label: 'Purchase orders', to: '/portal/orders' }, { label: po.id }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {po.id} <PStatus s={po.status} />
          </span>
        }
        subtitle={po.description}
        actions={
          <>
            <Button icon={<Download size={15} />} onClick={() => toast(`${po.id}.pdf downloaded (digitally signed)`, 'info')}>
              PO PDF
            </Button>
            {po.status === 'Awaiting acknowledgement' ? (
              <Button variant="primary" icon={<FileSignature size={15} />} onClick={() => setOpen(true)}>
                Acknowledge PO
              </Button>
            ) : (
              <Button variant="primary" icon={<Receipt size={15} />} disabled={!po.receipts.some((r) => !r.invoiced)} onClick={() => nav(`/portal/invoices/new?po=${po.id}`)}>
                Submit invoice
              </Button>
            )}
          </>
        }
      />

      {po.status === 'Awaiting acknowledgement' && (
        <div className="mb-4">
          <Callout tone="amber" icon={<AlertCircle size={18} />} title="Please acknowledge this purchase order">
            Acknowledgement confirms you accept the price, scope and terms. Work should not start and receipts cannot be recorded against an unacknowledged PO.
          </Callout>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <DescList
              items={[
                { label: 'PO date', value: date(po.date) },
                { label: 'Amount (excl. PPN)', value: idr(po.amount) },
                { label: 'Project ref', value: <ProjectRef code={po.projectCode} /> },
                { label: 'Buyer', value: po.buyer },
                { label: 'Deliver to', value: po.deliverTo },
                { label: 'Payment term', value: `${term} days from Loket Invoice receipt` },
                { label: 'From RFQ', value: po.rfqId ? <Link className="text-brand-700 hover:underline" to={`/portal/rfq/${po.rfqId}`}>{po.rfqId}</Link> : 'Direct' },
                { label: 'Acknowledged', value: po.acknowledgedAt ? wib(po.acknowledgedAt) : '—' },
              ]}
            />
          </Card>

          <Card padded={false}>
            <div className="p-4 pb-0">
              <CardHeader title="Line items" />
            </div>
            <DataTable
              rows={po.lines}
              rowKey={(l) => l.description}
              columns={[
                { key: 'd', header: 'Description', render: (l) => <span className="min-w-[240px] block">{l.description}</span> },
                { key: 'q', header: 'Qty', align: 'right', render: (l) => `${num(l.qty)} ${l.uom}` },
                { key: 'u', header: 'Unit price', align: 'right', render: (l) => idr(l.unitPrice) },
                { key: 't', header: 'Total', align: 'right', render: (l) => idr(l.qty * l.unitPrice) },
              ]}
            />
          </Card>

          <Card padded={false}>
            <div className="p-4 pb-0">
              <CardHeader title="Payment milestones" subtitle="PROC-20 · each milestone is released by evidence of completion" actions={<div className="w-40"><Progress value={paidPct} tone="green" /><div className="mt-0.5 text-right text-[11px] text-slate-500">{paidPct}% paid</div></div>} />
            </div>
            <DataTable
              rows={po.milestones}
              rowKey={(m) => m.name}
              columns={[
                { key: 'n', header: 'Milestone', render: (m) => <span className="font-medium text-slate-800">{m.name}</span> },
                { key: 'p', header: '%', align: 'right', render: (m) => `${m.pct}%` },
                { key: 'a', header: 'Amount', align: 'right', render: (m) => idr((po.amount * m.pct) / 100) },
                { key: 't', header: 'Evidence / trigger', render: (m) => <span className="text-xs text-slate-600">{m.trigger}</span> },
                { key: 's', header: 'Status', render: (m) => <PStatus s={m.status} /> },
              ]}
            />
          </Card>

          <Card padded={false}>
            <div className="p-4 pb-0">
              <CardHeader title="Goods / service receipts" subtitle="Confirmed by Petrolog site — the basis for your invoice" />
            </div>
            <DataTable
              rows={po.receipts}
              rowKey={(r) => r.id}
              empty="No receipts recorded yet."
              columns={[
                { key: 'id', header: 'Receipt', render: (r) => <Mono className="font-medium">{r.id}</Mono> },
                { key: 'd', header: 'Date', render: (r) => date(r.date) },
                { key: 'x', header: 'Description', render: (r) => <span className="min-w-[200px] block">{r.description}</span> },
                { key: 'a', header: 'Value', align: 'right', render: (r) => idr(r.amount) },
                {
                  key: 's',
                  header: '',
                  render: (r) =>
                    r.invoiced ? (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <CheckCircle2 size={13} className="text-emerald-600" /> Invoiced
                      </span>
                    ) : (
                      <Button size="sm" variant="primary" onClick={() => nav(`/portal/invoices/new?po=${po.id}&gr=${r.id}`)}>
                        Invoice
                      </Button>
                    ),
                },
              ]}
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Invoices on this PO" />
            {related.length === 0 && <div className="py-4 text-center text-sm text-slate-400">No invoices yet.</div>}
            <div className="space-y-2">
              {related.map((i) => (
                <Link key={i.id} to={`/portal/invoices/${i.id}`} className="block rounded-lg border border-slate-200 p-3 hover:border-brand-300 hover:bg-brand-50/30">
                  <div className="flex items-center justify-between gap-2">
                    <Mono className="font-medium">{i.vendorInvNo}</Mono>
                    <PStatus s={i.status} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>{i.loketNo}</span>
                    <span className="num font-medium text-slate-700">{idr(invoiceTotals(i).gross)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Terms" />
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li>• Petrolog General Terms of Purchase, rev. 2027</li>
              <li>• Prices exclude PPN 11 %; PPh 23 withheld on services where applicable</li>
              <li>• Invoice must quote the PO and receipt numbers and carry a valid e-Faktur</li>
              <li>• HSE: contractor personnel follow site SMK3 rules and daily P2H</li>
            </ul>
          </Card>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Acknowledge ${po.id}`}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={!agree} icon={<FileSignature size={14} />} onClick={doAck}>
              Acknowledge
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-slate-700">
          <p>
            {po.description} — <b>{idr(po.amount)}</b> excl. PPN.
          </p>
          <FormField label="Planned start of work / delivery">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </FormField>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-500" />
            <span>We accept the price, scope, payment milestones and the Petrolog General Terms of Purchase for this order.</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}
