import { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { AlertTriangle, Send, Paperclip, Banknote, CalendarClock, Stamp, FileText, MessageSquare } from 'lucide-react'
import { PageHeader, Card, CardHeader, Button, Stepper, Timeline, Callout, Mono, DescList, cx } from '@/components/ui'
import { idr, date } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { invoiceTotals, invoiceFlow, vendorProfiles } from '@/data/portal'
import { usePortal, wib, slaDue, demoIso } from '../store'
import { PStatus, FileChip, vendorName } from '../bits'

export default function InvoiceDetail() {
  const { id = '' } = useParams()
  const toast = useToast()
  const { invoices, vendorId, reply } = usePortal()
  const inv = invoices.find((i) => i.id === id)
  const [text, setText] = useState('')
  const [file, setFile] = useState<string>()

  if (!inv) return <Navigate to="/portal/invoices" replace />
  const t = invoiceTotals(inv)
  const term = vendorProfiles[vendorId].paymentTermDays
  const sla = slaDue(inv, term)
  const current = inv.status === 'Exception' ? 'Matching' : inv.status
  const profile = vendorProfiles[vendorId]

  function send() {
    if (!text.trim()) return
    reply(inv!.id, { from: 'vendor', name: `${profile.contactName} · ${vendorName(vendorId)}`, at: demoIso(), text: text.trim(), attachment: file })
    setText('')
    setFile(undefined)
    toast('Reply sent — AP officer notified; the exception stays open until AP resolves it', 'success')
  }

  return (
    <div>
      <PageHeader
        module="Vendor Portal · Loket Invoice"
        crumbs={[{ label: 'Home', to: '/portal' }, { label: 'Invoices', to: '/portal/invoices' }, { label: inv.vendorInvNo }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{inv.vendorInvNo}</span> <PStatus s={inv.status} />
          </span>
        }
        subtitle={
          <>
            Against <Link to={`/portal/orders/${inv.poId}`} className="font-medium text-brand-700 hover:underline">{inv.poId}</Link>
            {inv.grIds.length ? ` · receipt ${inv.grIds.join(', ')}` : ' · advance payment'} · faktur <Mono>{inv.fakturNo}</Mono>
          </>
        }
      />

      <Card className="mb-4">
        <Stepper steps={invoiceFlow} current={current} />
        {inv.status === 'Exception' && (
          <div className="mt-3">
            <Callout tone="orange" icon={<AlertTriangle size={18} />} title="Exception — your clarification is needed (PROC-19)">
              {inv.exception}
            </Callout>
          </div>
        )}
        {inv.status === 'Received' && (
          <div className="mt-3">
            <Callout tone="blue" title="Received — queued for document check">
              AP Officer Maya Anggraini checks completeness first; you will see each step here. No need to follow up by email or phone.
            </Callout>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <Stamp size={14} /> Loket Invoice receipt
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold text-slate-900">{inv.loketNo}</div>
              <div className="text-sm text-slate-600">{wib(inv.receivedAt)}</div>
            </Card>
            <Card>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {inv.status === 'Paid' ? <Banknote size={14} /> : <CalendarClock size={14} />} {inv.status === 'Paid' ? 'Paid' : 'Payment SLA'}
              </div>
              {inv.status === 'Paid' ? (
                <>
                  <div className="mt-1 text-2xl font-semibold text-emerald-700">{date(inv.paidAt!)}</div>
                  <div className="text-sm text-slate-600">Net transferred {idr(t.net)}</div>
                </>
              ) : (
                <>
                  <div className={cx('mt-1 text-2xl font-semibold', sla.left < 7 ? 'text-amber-700' : 'text-slate-900')}>{date(inv.scheduledPay ?? sla.iso)}</div>
                  <div className="text-sm text-slate-600">
                    {inv.scheduledPay ? 'Payment scheduled' : `Due ${term} days from receipt`} · {sla.left} days left
                  </div>
                </>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader title="Amounts" />
            <DescList
              cols={3}
              items={[
                { label: 'DPP', value: idr(inv.dpp) },
                { label: `PPN ${inv.ppnPct} %`, value: idr(t.ppn) },
                { label: 'Invoice total', value: idr(t.gross) },
                { label: `PPh 23 withheld ${inv.pph23Pct ? `(${inv.pph23Pct} %)` : ''}`, value: inv.pph23Pct ? idr(t.pph) : 'Not applicable (goods)' },
                { label: inv.status === 'Paid' ? 'Net paid' : 'Expected transfer', value: <span className="text-emerald-700">{idr(t.net)}</span> },
                { label: 'e-Bupot (PPh 23 slip)', value: inv.bupotNo ? <Mono>{inv.bupotNo}</Mono> : inv.pph23Pct ? 'Issued on payment' : '—' },
              ]}
            />
            {inv.status === 'Paid' && (
              <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200 ring-inset">
                Paid on {date(inv.paidAt!)} to {profile.bank.bank} {profile.bank.account}.{inv.pph23Pct ? ` PPh 23 of ${idr(t.pph)} withheld and reported via e-Bupot — the slip is available for your tax credit.` : ''}
              </div>
            )}
          </Card>

          {(inv.thread?.length || inv.status === 'Exception') && (
            <Card>
              <CardHeader title="Clarification thread" subtitle="Replaces email back-and-forth; every message is part of the invoice record" actions={<MessageSquare size={16} className="text-slate-400" />} />
              <div className="space-y-3">
                {inv.thread?.map((m, i) => (
                  <div key={i} className={cx('flex', m.from === 'vendor' ? 'justify-end' : 'justify-start')}>
                    <div className={cx('max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm', m.from === 'vendor' ? 'bg-ink-900 text-white' : 'bg-slate-100 text-slate-800')}>
                      <div className={cx('text-[11px] font-semibold', m.from === 'vendor' ? 'text-slate-300' : 'text-slate-500')}>
                        {m.name} · {wib(m.at)}
                      </div>
                      <div className="mt-0.5">{m.text}</div>
                      {m.attachment && (
                        <div className="mt-1.5">
                          <FileChip name={m.attachment} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {inv.status === 'Exception' && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    placeholder="Reply to AP — e.g. Credit note CN/BTM/2028/03/001 for 75 t attached; please match against 13,955 t."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {file && <FileChip name={file} />}
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        <Paperclip size={13} /> Attach
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0].name)} />
                      </label>
                      {!file && (
                        <button className="text-xs text-slate-500 underline" onClick={() => setFile('Credit_note_CN-BTM-2028-03-001.pdf')}>
                          use sample credit note
                        </button>
                      )}
                    </div>
                    <Button variant="primary" icon={<Send size={14} />} disabled={!text.trim()} onClick={send}>
                      Send reply
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Status history" />
            <Timeline
              items={[...inv.history].reverse().map((h) => ({
                time: wib(h.at),
                title: h.label,
                body: h.by,
                tone: h.label.toLowerCase().includes('exception') ? ('orange' as const) : h.label.startsWith('Paid') ? ('green' as const) : ('blue' as const),
              }))}
            />
          </Card>
          <Card>
            <CardHeader title="Documents submitted" actions={<FileText size={16} className="text-slate-400" />} />
            <div className="flex flex-col items-start gap-1.5">
              {inv.attachments.map((a) => (
                <FileChip key={a} name={a} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
