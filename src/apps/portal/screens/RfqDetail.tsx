import { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Lock, Send, Paperclip, Trophy, Hourglass, ShieldCheck, History } from 'lucide-react'
import { PageHeader, Card, CardHeader, Button, Input, FormField, DescList, Callout, Modal, Mono, Timeline } from '@/components/ui'
import { idr, num, date } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { usePortal, useDemoNow, wib } from '../store'
import { PStatus, ProjectRef, Countdown, SealNote, FileChip } from '../bits'

export default function RfqDetail() {
  const { id = '' } = useParams()
  const toast = useToast()
  const { rfqs, submitQuote } = usePortal()
  const rfq = rfqs.find((r) => r.id === id)
  const now = useDemoNow(5000)
  const last = rfq?.quote ?? (rfq?.submitted ? { ...rfq.submitted, leadTimeDays: 7, validityDays: 60, remarks: '' } : undefined)
  const [prices, setPrices] = useState<string[]>(() => rfq?.lines.map((_, i) => (last?.prices[i] ? String(last.prices[i]) : '')) ?? [])
  const [lead, setLead] = useState(String(last?.leadTimeDays ?? 7))
  const [validity, setValidity] = useState(String(last?.validityDays ?? 60))
  const [remarks, setRemarks] = useState(last?.remarks ?? '')
  const [files, setFiles] = useState<string[]>([])
  const [confirm, setConfirm] = useState(false)
  const [tried, setTried] = useState(false)

  if (!rfq) return <Navigate to="/portal/rfq" replace />
  const closed = rfq.status !== 'Open' || new Date(rfq.closing).getTime() <= now
  const parsed = prices.map((p) => parseInt(p.replace(/\D/g, ''), 10) || 0)
  const total = rfq.lines.reduce((s, l, i) => s + l.qty * parsed[i], 0)
  const valid = parsed.every((p) => p > 0) && Number(lead) > 0 && Number(validity) >= 30
  const nextVersion = (last?.version ?? 0) + 1

  function submit() {
    const q = submitQuote(rfq!.id, { prices: parsed, leadTimeDays: Number(lead), validityDays: Number(validity), remarks })
    setConfirm(false)
    toast(`Quotation v${q.version} sealed for ${rfq!.id} — receipt ${q.hash}`, 'success')
  }

  const versions = [
    ...(rfq.submitted ? [{ v: rfq.submitted.version, at: rfq.submitted.at, hash: rfq.submitted.hash }] : []),
    ...(rfq.quote ? [{ v: rfq.quote.version, at: rfq.quote.at, hash: rfq.quote.hash }] : []),
  ]

  return (
    <div>
      <PageHeader
        module="Vendor Portal · PROC-10 · sealed quotation"
        crumbs={[{ label: 'Home', to: '/portal' }, { label: 'RFQs', to: '/portal/rfq' }, { label: rfq.id }]}
        title={rfq.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Mono>{rfq.id}</Mono> <PStatus s={rfq.status} /> <ProjectRef code={rfq.projectCode} />
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {rfq.status === 'Awarded' && rfq.awardedPo && (
            <Callout tone="green" icon={<Trophy size={18} />} title="Awarded to you">
              Purchase order <Link to={`/portal/orders/${rfq.awardedPo}`} className="font-semibold underline">{rfq.awardedPo}</Link> has been issued against this RFQ.
            </Callout>
          )}
          {rfq.status === 'Under evaluation' && (
            <Callout tone="violet" icon={<Hourglass size={18} />} title="Envelopes opened — evaluation in progress">
              All quotations were opened together at {wib(rfq.closing)}. Petrolog compares offers per line item; the result is published here.
            </Callout>
          )}

          <Card padded={false}>
            <div className="p-4 pb-2">
              <CardHeader title="Line items" subtitle={closed ? 'Your submitted prices (visible only to you until closing)' : 'Enter a unit price for every line. Prices exclude PPN.'} />
            </div>
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 w-44 text-right">Unit price (IDR)</th>
                    <th className="px-3 py-2 text-right">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {rfq.lines.map((l, i) => (
                    <tr key={l.no} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-2.5 text-slate-500">{l.no}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-800">{l.description}</div>
                        <div className="text-xs text-slate-500">{l.spec}</div>
                      </td>
                      <td className="num px-3 py-2.5 text-right whitespace-nowrap">
                        {num(l.qty)} {l.uom}
                      </td>
                      <td className="px-3 py-2">
                        {closed ? (
                          <div className="num py-1 text-right">{parsed[i] ? num(parsed[i]) : '—'}</div>
                        ) : (
                          <Input
                            inputMode="numeric"
                            value={parsed[i] ? num(parsed[i]) : prices[i]}
                            onChange={(e) => setPrices((p) => p.map((x, k) => (k === i ? e.target.value : x)))}
                            placeholder="0"
                            className={`num text-right ${tried && !parsed[i] ? 'border-red-400' : ''}`}
                          />
                        )}
                      </td>
                      <td className="num px-3 py-2.5 text-right font-medium">{parsed[i] ? idr(parsed[i] * l.qty) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                    <td colSpan={4} className="px-3 py-2.5 text-right">
                      Quotation total (excl. PPN)
                    </td>
                    <td className="num px-3 py-2.5 text-right">{idr(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {!closed && (
            <Card>
              <CardHeader title="Commercial terms & attachments" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Mobilisation / lead time (days)">
                  <Input inputMode="numeric" value={lead} onChange={(e) => setLead(e.target.value.replace(/\D/g, ''))} />
                </FormField>
                <FormField label="Offer validity (days)" hint="Minimum 30 days">
                  <Input inputMode="numeric" value={validity} onChange={(e) => setValidity(e.target.value.replace(/\D/g, ''))} />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Remarks / deviations">
                    <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" placeholder="e.g. Price includes fuel at Pertamina industrial HSD index Mar 2028; adjustment clause ±5 %." />
                  </FormField>
                </div>
                <div className="sm:col-span-2">
                  <FormField label="Technical proposal & supporting documents">
                    <div className="flex flex-wrap items-center gap-2">
                      {files.map((f) => (
                        <FileChip key={f} name={f} />
                      ))}
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                        <Paperclip size={14} /> Attach file
                        <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && setFiles((f) => [...f, e.target.files![0].name])} />
                      </label>
                    </div>
                  </FormField>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-500">{last ? `You submitted v${last.version}. Submitting again replaces it — the last version before closing counts.` : 'You can revise until the closing time.'}</span>
                <Button
                  variant="primary"
                  icon={<Send size={15} />}
                  onClick={() => {
                    setTried(true)
                    if (valid) setConfirm(true)
                    else toast('Enter a unit price for every line and a validity of at least 30 days', 'warning')
                  }}
                >
                  {last ? `Submit revision v${nextVersion}` : 'Submit sealed quotation'}
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Countdown closing={rfq.closing} />
          {(rfq.quote || rfq.submitted) && rfq.status !== 'Awarded' && <SealNote />}
          {!rfq.quote && !rfq.submitted && !closed && (
            <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3.5 py-3 text-[13px] text-slate-600 ring-1 ring-slate-200 ring-inset">
              <Lock size={16} className="mt-0.5 shrink-0" /> Once submitted, your quotation is sealed: Petrolog cannot view prices before closing.
            </div>
          )}
          <Card>
            <CardHeader title="RFQ details" />
            <DescList
              cols={2}
              items={[
                { label: 'Closing', value: wib(rfq.closing) },
                { label: 'Issued', value: date(rfq.issued) },
                { label: 'Buyer', value: rfq.buyer },
                { label: 'Invited vendors', value: `${rfq.invitedCount} (names hidden)` },
                { label: 'Delivery', value: rfq.delivery },
                { label: 'Payment terms', value: rfq.paymentTerms },
              ]}
            />
          </Card>
          {versions.length > 0 && (
            <Card>
              <CardHeader title="Submission receipts" subtitle="Time-stamped by the portal" actions={<History size={16} className="text-slate-400" />} />
              <Timeline
                items={[...versions].reverse().map((v) => ({
                  time: wib(v.at),
                  title: `Quotation v${v.v} sealed`,
                  body: (
                    <span className="flex items-center gap-1 font-mono">
                      <ShieldCheck size={12} /> receipt {v.hash}
                    </span>
                  ),
                  tone: 'green' as const,
                }))}
              />
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Submit sealed quotation v${nextVersion}`}
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="primary" icon={<Lock size={14} />} onClick={submit}>
              Seal & submit
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            <b>{rfq.id}</b> — total <b>{idr(total)}</b> excl. PPN across {rfq.lines.length} line items, lead time {lead} days, valid {validity} days.
          </p>
          <SealNote />
          <p className="text-xs text-slate-500">You will receive a time-stamped receipt. Revisions are allowed until {wib(rfq.closing)}.</p>
        </div>
      </Modal>
    </div>
  )
}
