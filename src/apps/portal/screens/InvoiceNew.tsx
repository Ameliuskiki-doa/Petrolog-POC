import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Paperclip, CheckCircle2, Circle, Send, Stamp, AlertTriangle, Printer } from 'lucide-react'
import { PageHeader, Card, CardHeader, Button, Input, Select, FormField, Callout, Modal, Mono, cx } from '@/components/ui'
import { idr, date } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { vendorProfiles, invoiceTotals, type PortalInvoice } from '@/data/portal'
import { getVendor } from '@/data/core'
import { usePortal, wib, slaDue } from '../store'
import { FileChip, ProjectRef } from '../bits'

const DOCS = [
  { key: 'invoice', label: 'Commercial invoice (signed & stamped)', required: true, sample: 'Invoice_signed.pdf' },
  { key: 'faktur', label: 'Faktur pajak (e-Faktur PDF)', required: true, sample: 'eFaktur.pdf' },
  { key: 'dn', label: 'Delivery note / BAST signed by Petrolog site', required: true, sample: 'BAST_signed.pdf' },
  { key: 'other', label: 'Supporting documents (weighbridge, timesheets)', required: false, sample: 'Supporting.xlsx' },
] as const

export default function InvoiceNew() {
  const nav = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const { pos, vendorId, submitInvoice } = usePortal()
  const vendor = getVendor(vendorId)!
  const profile = vendorProfiles[vendorId]
  const eligible = pos.filter((p) => p.status !== 'Awaiting acknowledgement' && p.receipts.some((r) => !r.invoiced))
  const [poId, setPoId] = useState(() => (eligible.some((p) => p.id === params.get('po')) ? params.get('po')! : (eligible[0]?.id ?? '')))
  const po = pos.find((p) => p.id === poId)
  const open = po?.receipts.filter((r) => !r.invoiced) ?? []
  const [grs, setGrs] = useState<string[]>(() => {
    const g = params.get('gr')
    return g ? [g] : open.map((r) => r.id).slice(0, 1)
  })
  const grTotal = open.filter((r) => grs.includes(r.id)).reduce((s, r) => s + r.amount, 0)
  const [amount, setAmount] = useState<string>('')
  const dpp = amount === '' ? grTotal : parseInt(amount.replace(/\D/g, ''), 10) || 0
  const [invNo, setInvNo] = useState(vendorId === 'VND-00112' ? 'BTM/INV/2028/03/' : 'AMT/INV/2028/03/')
  const [invDate, setInvDate] = useState('2028-03-10')
  const [faktur, setFaktur] = useState('010.000-28.')
  const [files, setFiles] = useState<Record<string, string>>({})
  const [agree, setAgree] = useState(false)
  const [tried, setTried] = useState(false)
  const [receipt, setReceipt] = useState<PortalInvoice>()

  const totals = invoiceTotals({ dpp, ppnPct: vendor.pkp ? 11 : 0, pph23Pct: profile.pph23Pct })
  const variance = grTotal ? (dpp - grTotal) / grTotal : 0
  const fakturOk = !vendor.pkp || /^\d{3}\.\d{3}-\d{2}\.\d{8}$/.test(faktur.trim())
  const invNoOk = /\/\d{3,}$/.test(invNo.trim())
  const docsOk = DOCS.filter((d) => d.required).every((d) => files[d.key])
  const checks = useMemo(
    () => [
      { ok: !!po && grs.length > 0, label: 'PO and at least one confirmed receipt selected' },
      { ok: invNoOk, label: 'Your invoice number' },
      { ok: fakturOk, label: 'Faktur pajak serial number (NSFP format 010.000-28.00000000)' },
      { ok: docsOk, label: 'Required documents attached (invoice, faktur pajak, BAST)' },
      { ok: agree, label: 'Declaration confirmed' },
    ],
    [po, grs, invNoOk, fakturOk, docsOk, agree],
  )
  const ready = checks.every((c) => c.ok)

  function submit() {
    setTried(true)
    if (!ready || !po) {
      toast('Complete the checklist before submitting', 'warning')
      return
    }
    const inv = submitInvoice({
      vendorId,
      vendorInvNo: invNo.trim(),
      poId: po.id,
      grIds: grs,
      fakturNo: faktur.trim(),
      invoiceDate: invDate,
      dpp,
      ppnPct: vendor.pkp ? 11 : 0,
      pph23Pct: profile.pph23Pct,
      attachments: Object.values(files),
    })
    setReceipt(inv)
  }

  if (eligible.length === 0 && !receipt) {
    return (
      <div>
        <PageHeader module="Vendor Portal · FAT-12" title="Submit invoice" crumbs={[{ label: 'Home', to: '/portal' }, { label: 'Invoices', to: '/portal/invoices' }, { label: 'New' }]} />
        <Callout tone="blue" title="Nothing to invoice right now">
          Invoices are submitted against a receipt confirmed by Petrolog site. When a delivery or service period is receipted, it appears here automatically.
        </Callout>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        module="Vendor Portal · FAT-12 · FAT-13"
        title="Submit invoice"
        subtitle="Replaces delivery of hard copies and email attachments. You receive a Loket Invoice receipt immediately."
        crumbs={[{ label: 'Home', to: '/portal' }, { label: 'Invoices', to: '/portal/invoices' }, { label: 'New' }]}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="1 · Purchase order & receipt" subtitle="Only acknowledged POs with confirmed, un-invoiced receipts are shown" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Purchase order">
                <Select
                  className="w-full"
                  value={poId}
                  onChange={(e) => {
                    setPoId(e.target.value)
                    const p = pos.find((x) => x.id === e.target.value)
                    setGrs(p?.receipts.filter((r) => !r.invoiced).map((r) => r.id).slice(0, 1) ?? [])
                    setAmount('')
                  }}
                >
                  {eligible.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.description}
                    </option>
                  ))}
                </Select>
              </FormField>
              {po && (
                <div className="text-sm">
                  <div className="text-xs text-slate-500">Project ref · PO value</div>
                  <div className="mt-1 flex items-center gap-2">
                    <ProjectRef code={po.projectCode} /> <span className="num font-medium">{idr(po.amount)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {open.map((r) => (
                <label key={r.id} className={cx('flex cursor-pointer items-start gap-3 rounded-lg border p-3', grs.includes(r.id) ? 'border-brand-400 bg-brand-50/50' : 'border-slate-200 hover:bg-slate-50')}>
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-amber-500"
                    checked={grs.includes(r.id)}
                    onChange={(e) => {
                      setGrs((g) => (e.target.checked ? [...g, r.id] : g.filter((x) => x !== r.id)))
                      setAmount('')
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <Mono className="font-medium">{r.id}</Mono>
                      <span className="num text-sm font-semibold">{idr(r.amount)}</span>
                    </span>
                    <span className="block text-xs text-slate-500">
                      {date(r.date)} · {r.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="2 · Invoice details" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Your invoice number">
                <Input value={invNo} onChange={(e) => setInvNo(e.target.value.toUpperCase())} className={cx('font-mono', tried && !invNoOk && 'border-red-400')} placeholder="BTM/INV/2028/03/007" />
              </FormField>
              <FormField label="Invoice date">
                <Input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} max="2028-03-10" />
              </FormField>
              <FormField label="Invoice amount — DPP (excl. PPN)" hint={`Receipt value ${idr(grTotal)}`}>
                <Input inputMode="numeric" value={dpp ? dpp.toLocaleString('en-US') : ''} onChange={(e) => setAmount(e.target.value)} className="num" />
              </FormField>
              <FormField label="Faktur pajak serial (NSFP)" hint={vendor.pkp ? 'From e-Faktur / Coretax' : 'Not PKP — not required'}>
                <Input value={faktur} onChange={(e) => setFaktur(e.target.value)} disabled={!vendor.pkp} className={cx('font-mono', tried && !fakturOk && 'border-red-400')} placeholder="010.000-28.41127799" />
              </FormField>
            </div>
            {Math.abs(variance) > 0.005 && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800 ring-1 ring-orange-200 ring-inset">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                Amount differs from the confirmed receipt by {(variance * 100).toFixed(2)} % (tolerance 0.5 %). You can still submit — it will be routed to the exception queue for clarification.
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="3 · Documents" subtitle="Document completeness is checked before the invoice enters matching (FAT-13)" />
            <div className="divide-y divide-slate-100">
              {DOCS.map((d) => (
                <div key={d.key} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    {files[d.key] ? <CheckCircle2 size={17} className="text-emerald-600" /> : <Circle size={17} className={tried && d.required ? 'text-red-500' : 'text-slate-300'} />}
                    <span className="text-slate-800">{d.label}</span>
                    {!d.required && <span className="text-xs text-slate-400">optional</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {files[d.key] && <FileChip name={files[d.key]} />}
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      <Paperclip size={13} /> {files[d.key] ? 'Replace' : 'Attach'}
                      <input type="file" accept=".pdf,.jpg,.png,.xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && setFiles((f) => ({ ...f, [d.key]: e.target.files![0].name }))} />
                    </label>
                    {!files[d.key] && (
                      <button className="text-xs text-slate-500 underline hover:text-slate-800" onClick={() => setFiles((f) => ({ ...f, [d.key]: `${d.sample.replace('.', `_${invNo.split('/').pop() || 'draft'}.`)}` }))}>
                        use sample
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-500" />
              We declare this invoice has not been submitted before by email or in hard copy, and the faktur pajak has been uploaded to e-Faktur / Coretax.
            </label>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="lg:sticky lg:top-32">
            <CardHeader title="Summary" />
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">DPP</dt>
                <dd className="num">{idr(dpp)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">PPN {vendor.pkp ? '11 %' : '(not PKP)'}</dt>
                <dd className="num">{idr(totals.ppn)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold">
                <dt>Invoice total</dt>
                <dd className="num">{idr(totals.gross)}</dd>
              </div>
              <div className="flex justify-between text-slate-500">
                <dt>PPh 23 withheld on payment {profile.pph23Pct ? `(${profile.pph23Pct} %)` : ''}</dt>
                <dd className="num">{profile.pph23Pct ? `− ${idr(totals.pph)}` : 'n/a (goods)'}</dd>
              </div>
              <div className="flex justify-between font-semibold text-emerald-700">
                <dt>Expected transfer</dt>
                <dd className="num">{idr(totals.net)}</dd>
              </div>
            </dl>
            <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
              {checks.map((c) => (
                <div key={c.label} className={cx('flex items-start gap-2 text-xs', c.ok ? 'text-emerald-700' : tried ? 'text-red-600' : 'text-slate-500')}>
                  {c.ok ? <CheckCircle2 size={14} className="mt-px shrink-0" /> : <Circle size={14} className="mt-px shrink-0" />}
                  {c.label}
                </div>
              ))}
            </div>
            <Button variant="primary" className="mt-4 w-full" icon={<Send size={15} />} onClick={submit}>
              Submit to Loket Invoice
            </Button>
            <p className="mt-2 text-center text-[11px] text-slate-500">Payment term {profile.paymentTermDays} days, counted from the receipt date.</p>
          </Card>
        </div>
      </div>

      <Modal
        open={!!receipt}
        onClose={() => nav(`/portal/invoices/${receipt!.id}`)}
        title="Invoice received"
        footer={
          <>
            <Button icon={<Printer size={14} />} onClick={() => toast(`Receipt ${receipt?.loketNo}.pdf downloaded`, 'info')}>
              Download receipt
            </Button>
            <Button variant="primary" onClick={() => nav(`/portal/invoices/${receipt!.id}`)}>
              Track status
            </Button>
          </>
        }
      >
        {receipt && (
          <div className="text-center">
            <Stamp size={40} className="mx-auto text-emerald-600" />
            <div className="mt-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">Loket Invoice receipt</div>
            <div className="mt-1 font-mono text-3xl font-semibold text-slate-900">{receipt.loketNo}</div>
            <div className="mt-1 text-sm text-slate-600">Received {wib(receipt.receivedAt)}</div>
            <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2 text-left text-sm">
              <div className="rounded-lg bg-slate-50 p-2.5">
                <div className="text-[11px] text-slate-500">Your invoice</div>
                <div className="font-mono text-xs font-medium">{receipt.vendorInvNo}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <div className="text-[11px] text-slate-500">Total</div>
                <div className="num font-medium">{idr(invoiceTotals(receipt).gross)}</div>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200 ring-inset">
              Payment SLA clock started. Due by <b>{date(slaDue(receipt, profile.paymentTermDays).iso)}</b> ({profile.paymentTermDays} days from receipt).
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Next: document check → three-way match (PO · receipt · invoice) → approval → payment. Follow it under <Link className="underline" to="/portal/invoices">Invoices</Link>.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
