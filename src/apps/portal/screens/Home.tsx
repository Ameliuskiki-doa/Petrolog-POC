import { Link, useNavigate } from 'react-router-dom'
import { FileSearch, FileCheck2, Receipt, Wallet, AlertTriangle, ArrowRight, Lock, Clock, MailX } from 'lucide-react'
import { PageHeader, Card, CardHeader, Grid, Stat, Button, Callout, DataTable, Mono } from '@/components/ui'
import { idr, idrShort, date } from '@/lib/format'
import { invoiceTotals } from '@/data/portal'
import { usePortal, docState, wib } from '../store'
import { PStatus, ProjectRef, Countdown, vendorName } from '../bits'

export default function Home() {
  const nav = useNavigate()
  const { vendorId, rfqs, pos, invoices, docs } = usePortal()
  const openRfqs = rfqs.filter((r) => r.status === 'Open')
  const toAck = pos.filter((p) => p.status === 'Awaiting acknowledgement')
  const inProcess = invoices.filter((i) => i.status !== 'Paid')
  const paidYtd = invoices.filter((i) => i.status === 'Paid' && (i.paidAt ?? '') >= '2028-01-01').reduce((s, i) => s + invoiceTotals(i).net, 0)
  const docWarnings = docs
    .map((d) => ({ d, st: docState(d.renewal?.expiry ?? d.expiry, !!d.renewal) }))
    .filter((x) => x.st.label === 'Expired' || x.st.label === 'Expiring soon')
  const readyGr = pos.flatMap((p) => p.receipts.filter((r) => !r.invoiced).map((r) => ({ po: p, r })))

  const statusCounts = ['Received', 'Document check', 'Matching', 'Exception', 'Approved for payment', 'Paid'].map((s) => ({ s, n: invoices.filter((i) => i.status === s).length }))

  return (
    <div>
      <PageHeader
        module="Vendor Portal · §2.8.1"
        title={`Welcome, ${vendorName(vendorId)}`}
        subtitle="Quotations, purchase orders, invoices and qualification documents in one place. Every submission is time-stamped and receipted."
        actions={
          <>
            <Button icon={<Receipt size={15} />} variant="primary" onClick={() => nav('/portal/invoices/new')}>
              Submit invoice
            </Button>
          </>
        }
      />

      {docWarnings.length > 0 && (
        <div className="mb-4">
          <Callout tone={docWarnings.some((x) => x.st.label === 'Expired') ? 'red' : 'amber'} icon={<AlertTriangle size={18} />} title={`${docWarnings.length} qualification document${docWarnings.length > 1 ? 's' : ''} need attention`}>
            <ul className="mt-1 space-y-0.5">
              {docWarnings.map(({ d, st }) => (
                <li key={d.id}>
                  {d.name} — {st.label === 'Expired' ? `expired ${date(d.expiry!)}` : `expires ${date(d.expiry!)} (${st.days} days)`}
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link to="/portal/documents" className="font-semibold underline">
                Renew documents
              </Link>
              <span className="text-xs">Vendors with expired documents are automatically excluded from new RFQ invitations.</span>
            </div>
          </Callout>
        </div>
      )}

      <Grid cols={4} className="mb-5">
        <Stat label="Open RFQs" value={openRfqs.length} sub={`${openRfqs.filter((r) => !r.quote && !r.submitted).length} awaiting your quotation`} icon={<FileSearch size={18} />} to="/portal/rfq" />
        <Stat label="POs to acknowledge" value={toAck.length} sub={toAck.length ? 'Acknowledge before work starts' : 'All acknowledged'} tone={toAck.length ? 'warn' : 'good'} icon={<FileCheck2 size={18} />} to="/portal/orders" />
        <Stat label="Invoices in process" value={inProcess.length} sub={`${idrShort(inProcess.reduce((s, i) => s + invoiceTotals(i).gross, 0))} gross`} icon={<Receipt size={18} />} to="/portal/invoices" />
        <Stat label="Paid year-to-date" value={idrShort(paidYtd)} sub="Net of PPh 23 withheld" tone="good" icon={<Wallet size={18} />} to="/portal/invoices" />
      </Grid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" padded={false}>
          <div className="p-4 pb-0">
            <CardHeader
              title="Open RFQs"
              subtitle="Quotations stay sealed until closing"
              actions={
                <Link to="/portal/rfq" className="text-xs font-medium text-brand-700 hover:underline">
                  All RFQs
                </Link>
              }
            />
          </div>
          <DataTable
            rows={openRfqs}
            rowKey={(r) => r.id}
            onRowClick={(r) => nav(`/portal/rfq/${r.id}`)}
            empty="No open RFQs for your categories right now."
            columns={[
              { key: 'id', header: 'RFQ', render: (r) => <Mono className="font-medium">{r.id}</Mono> },
              { key: 't', header: 'Title', render: (r) => <span className="line-clamp-1 min-w-[220px]">{r.title}</span> },
              { key: 'c', header: 'Closes', render: (r) => <span className="text-xs whitespace-nowrap text-slate-600">{wib(r.closing)}</span> },
              { key: 'cd', header: 'Time left', render: (r) => <Countdown closing={r.closing} compact /> },
              {
                key: 's',
                header: 'Your quotation',
                render: (r) =>
                  r.quote || r.submitted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <Lock size={12} /> Sealed v{r.quote?.version ?? r.submitted?.version}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-amber-700">Not submitted</span>
                  ),
              },
            ]}
          />
        </Card>

        <Card>
          <CardHeader title="Invoice status" subtitle="Across all your submissions" />
          <div className="space-y-2">
            {statusCounts.map(({ s, n }) => (
              <Link key={s} to={`/portal/invoices?status=${encodeURIComponent(s)}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <PStatus s={s} />
                <span className="num text-sm font-semibold text-slate-800">{n}</span>
              </Link>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <Clock size={14} className="mt-0.5 shrink-0" />
            The payment clock starts on the Loket Invoice receipt date — not on the date someone opens an email.
          </div>
        </Card>

        <Card className="lg:col-span-2" padded={false}>
          <div className="p-4 pb-0">
            <CardHeader title="Purchase orders" actions={<Link to="/portal/orders" className="text-xs font-medium text-brand-700 hover:underline">All POs</Link>} />
          </div>
          <DataTable
            rows={pos.filter((p) => p.status !== 'Closed')}
            rowKey={(p) => p.id}
            onRowClick={(p) => nav(`/portal/orders/${p.id}`)}
            columns={[
              { key: 'id', header: 'PO', render: (p) => <Mono className="font-medium">{p.id}</Mono> },
              { key: 'd', header: 'Description', render: (p) => <span className="line-clamp-1 min-w-[200px]">{p.description}</span> },
              { key: 'p', header: 'Project ref', render: (p) => <ProjectRef code={p.projectCode} /> },
              { key: 'a', header: 'Amount', align: 'right', render: (p) => idr(p.amount) },
              { key: 's', header: 'Status', render: (p) => <PStatus s={p.status} /> },
            ]}
          />
        </Card>

        <Card>
          <CardHeader title="Ready to invoice" subtitle="Receipts confirmed by Petrolog, not yet invoiced" />
          {readyGr.length === 0 && <div className="py-6 text-center text-sm text-slate-400">Nothing waiting.</div>}
          <div className="space-y-2">
            {readyGr.map(({ po, r }) => (
              <div key={r.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Mono className="font-medium">{r.id}</Mono>
                  <span className="num text-sm font-semibold">{idrShort(r.amount)}</span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {po.id} · {r.description}
                </div>
                <Button size="sm" variant="secondary" className="mt-2" icon={<ArrowRight size={13} />} onClick={() => nav(`/portal/invoices/new?po=${po.id}&gr=${r.id}`)}>
                  Invoice this receipt
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-5 flex items-start gap-2 text-xs text-slate-500">
        <MailX size={14} className="mt-0.5 shrink-0" />
        Quotations and invoices sent by email are no longer processed; the portal gives you a receipt number and live status instead.
      </div>
    </div>
  )
}
