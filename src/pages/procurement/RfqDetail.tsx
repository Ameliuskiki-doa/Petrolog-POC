import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Award, Ban, CheckCircle2, FastForward, Lock, MailCheck, Send, Trophy } from 'lucide-react'
import { Badge, Button, Callout, Card, CardHeader, DataTable, DescList, EmptyState, PageHeader, ProjectCodeChip, StatusBadge, Tabs, cx } from '@/components/ui'
import { allVendors, findVendor, isSealed, latestQuotes, quoteTotal, rfqEligibility, type Quotation, type RFQ } from '@/data/procurement'
import { getEmployee } from '@/data/core'
import { date, dateTime, daysUntil, idr, idrShort, num, TODAY_ISO } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { MODULE_PROC, Person, TextLink, VendorLink } from './shared'
import { rfqStore, useRFQs } from './store'

type TabKey = 'tab' | 'inv' | 'neg' | 'award'

export default function RfqDetail() {
  const { id } = useParams()
  const rfqs = useRFQs()
  const toast = useToast()
  const r = rfqs.find((x) => x.id === id)
  const [tab, setTab] = useState<TabKey>('tab')
  if (!r) return <Card><EmptyState title="RFQ not found" body={`No RFQ with id ${id}.`} /></Card>

  const update = (fn: (x: RFQ) => RFQ) => rfqStore.set((s) => s.map((x) => (x.id === r.id ? fn(x) : x)))
  const sealed = isSealed(r)
  const quotes = latestQuotes(r)
  const received = new Set(r.quotations.map((q) => q.vendorId))

  const publish = () => {
    if (r.invited.length < 2) {
      toast('Invite at least two qualified vendors before publishing', 'error')
      setTab('inv')
      return
    }
    update((x) => ({ ...x, status: 'Open', invited: x.invited.map((i) => ({ ...i, invitedAt: `${TODAY_ISO}T10:30` })) }))
    toast(`${r.id} published to ${r.invited.length} vendors on the portal — closing ${dateTime(r.closing)}`, 'success')
  }

  const fastForward = () => {
    update((x) => ({ ...x, status: 'Evaluation', closing: `${TODAY_ISO}T08:59`, invited: x.invited.map((i) => ({ ...i, responded: received.has(i.vendorId) })) }))
    toast(`Closing reached — ${r.quotations.length} quotations unsealed; non-responding vendors recorded for scoring`, 'info')
    setTab('tab')
  }

  return (
    <>
      <PageHeader
        module={MODULE_PROC}
        crumbs={[{ label: 'RFQ & bid tabulation', to: '/procurement/rfq' }, { label: r.id }]}
        title={r.title}
        subtitle={<span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs">{r.id}</span><StatusBadge status={r.status} />{sealed && <Badge tone="slate"><Lock size={11} />Sealed</Badge>}</span>}
        actions={
          <>
            {r.status === 'Draft' && <Button variant="primary" icon={<Send size={15} />} onClick={publish}>Publish invitation</Button>}
            {sealed && <Button variant="ghost" icon={<FastForward size={15} />} onClick={fastForward}>Demo: advance to closing</Button>}
            {(r.status === 'Evaluation' || r.status === 'Negotiation') && <Button variant="primary" icon={<Award size={15} />} onClick={() => setTab('award')}>Award</Button>}
          </>
        }
      />

      <Card className="mb-4">
        <DescList
          cols={4}
          items={[
            { label: 'Source requisition', value: <TextLink to={`/procurement/requisitions/${r.prId}`}>{r.prId}</TextLink> },
            { label: 'Project code', value: <ProjectCodeChip code={r.projectCode} showName /> },
            { label: 'Buyer', value: <Person id={r.buyerId} /> },
            { label: 'Closing deadline', value: <span>{dateTime(r.closing)}{r.status === 'Open' && <span className="ml-1 text-xs text-amber-700">({Math.max(0, daysUntil(r.closing.slice(0, 10)))} d)</span>}</span> },
            { label: 'Vendors invited', value: `${r.invited.length} (${r.excluded.length} excluded)` },
            { label: 'Quotations', value: sealed ? `${received.size} received — sealed` : `${quotes.length} vendors · ${r.quotations.length} versions` },
            { label: 'Line items', value: r.lines.length },
            { label: 'Awarded to', value: r.award ? <VendorLink id={r.award.vendorId} /> : '—' },
          ]}
        />
      </Card>

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'tab', label: 'Bid tabulation' },
          { key: 'inv', label: 'Invitations', count: r.invited.length },
          { key: 'neg', label: 'Negotiation history', count: r.quotations.length },
          { key: 'award', label: 'Award' },
        ]}
      />

      {tab === 'tab' && (sealed ? <SealedCard r={r} /> : r.status === 'Draft' ? <Card><EmptyState title="Not published yet" body="Invite vendors and publish the RFQ to receive quotations." /></Card> : <Tabulation r={r} />)}
      {tab === 'inv' && <Invitations r={r} update={update} />}
      {tab === 'neg' && (sealed ? <SealedCard r={r} /> : <Negotiation r={r} />)}
      {tab === 'award' && (sealed ? <SealedCard r={r} /> : <AwardPanel r={r} update={update} />)}
    </>
  )
}

function SealedCard({ r }: { r: RFQ }) {
  const received = new Set(r.quotations.map((q) => q.vendorId))
  return (
    <Card>
      <div className="flex flex-col items-center py-8 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white"><Lock size={26} /></div>
        <div className="text-base font-semibold text-slate-900">Quotations sealed until {dateTime(r.closing)}</div>
        <p className="mt-1 max-w-lg text-sm text-slate-500">Vendors submit through the portal; prices are encrypted and unreadable to buyers, approvers and administrators until the closing deadline passes (PROC-10). Only receipt is visible.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {r.invited.map((i) => (
            <div key={i.vendorId} className={cx('rounded-lg px-3 py-2 text-left text-xs ring-1', received.has(i.vendorId) ? 'bg-emerald-50 ring-emerald-200' : 'bg-slate-50 ring-slate-200')}>
              <div className="font-medium text-slate-800">{findVendor(i.vendorId)?.name}</div>
              <div className={received.has(i.vendorId) ? 'text-emerald-700' : 'text-slate-500'}>
                {received.has(i.vendorId) ? `Received ${dateTime(r.quotations.find((q) => q.vendorId === i.vendorId)!.submittedAt)} · sealed` : 'No submission yet'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function Tabulation({ r }: { r: RFQ }) {
  const quotes = latestQuotes(r)
  if (!quotes.length) return <Card><EmptyState title="No quotations" /></Card>
  const totals = quotes.map((q) => quoteTotal(r, q))
  const minTotal = Math.min(...totals)
  const minPerLine = r.lines.map((_, i) => Math.min(...quotes.map((q) => q.prices[i])))
  const splitTotal = r.lines.reduce((s, l, i) => s + l.qty * minPerLine[i], 0)
  const th = 'px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase'
  return (
    <div className="space-y-4">
      <Card padded={false}>
        <div className="p-4 pb-2"><CardHeader title="Comparison matrix — per line item" subtitle="Lowest price per line is highlighted; comparison is made line by line, not on total value alone (PROC-11). Latest quotation version per vendor." /></div>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50">
                <th className={th}>Line item</th>
                <th className={cx(th, 'text-right')}>Qty</th>
                {quotes.map((q) => (
                  <th key={q.vendorId} className={cx(th, 'min-w-[170px] text-right normal-case')}>
                    <div className="text-xs font-semibold text-slate-800">{findVendor(q.vendorId)?.name}</div>
                    <div className="font-normal text-slate-500">v{q.version} · {q.round} · score {findVendor(q.vendorId)?.score}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.lines.map((l, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="px-3 py-2.5 font-medium text-slate-800">{l.desc}</td>
                  <td className="num px-3 py-2.5 text-right text-slate-600">{num(l.qty)} {l.uom}</td>
                  {quotes.map((q) => {
                    const low = q.prices[i] === minPerLine[i]
                    return (
                      <td key={q.vendorId} className={cx('num px-3 py-2.5 text-right', low && 'bg-emerald-50')}>
                        <div className={cx('font-medium', low ? 'text-emerald-700' : 'text-slate-800')}>{idr(q.prices[i])}</div>
                        <div className="text-[11px] text-slate-500">{idrShort(q.prices[i] * l.qty)}{low && <span className="ml-1 rounded bg-emerald-600 px-1 text-[10px] font-semibold text-white">LOWEST</span>}</div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              <tr>
                <td className="px-3 py-2.5 font-semibold" colSpan={2}>Total</td>
                {quotes.map((q, k) => (
                  <td key={q.vendorId} className={cx('num px-3 py-2.5 text-right font-semibold', totals[k] === minTotal && 'text-emerald-700')}>
                    {idr(totals[k])}
                    {totals[k] === minTotal && <div className="text-[10px] font-semibold text-emerald-700">LOWEST TOTAL</div>}
                  </td>
                ))}
              </tr>
              <tr className="text-xs text-slate-600">
                <td className="px-3 py-1.5" colSpan={2}>Delivery</td>
                {quotes.map((q) => <td key={q.vendorId} className="px-3 py-1.5 text-right">{q.deliveryDays} days</td>)}
              </tr>
              <tr className="text-xs text-slate-600">
                <td className="px-3 py-1.5" colSpan={2}>Payment terms</td>
                {quotes.map((q) => <td key={q.vendorId} className="px-3 py-1.5 text-right">{q.paymentTerms}</td>)}
              </tr>
              <tr className="text-xs text-slate-600">
                <td className="px-3 py-1.5 pb-3" colSpan={2}>Vendor note</td>
                {quotes.map((q) => <td key={q.vendorId} className="px-3 py-1.5 pb-3 text-right text-[11px]">{q.note ?? '—'}</td>)}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
      {r.lines.length > 1 && (
        <Callout tone="blue" icon={<Trophy size={16} />} title={`Best-of-line (split award) total: ${idr(splitTotal)}`}>
          {splitTotal < minTotal ? `${idrShort(minTotal - splitTotal)} lower than the lowest single-vendor total. An RFQ can be awarded across vendors line by line (PROC-08).` : 'The lowest single-vendor total already equals the best-of-line total.'}
        </Callout>
      )}
    </div>
  )
}

function Invitations({ r, update }: { r: RFQ; update: (fn: (x: RFQ) => RFQ) => void }) {
  const toast = useToast()
  const invitedIds = new Set(r.invited.map((i) => i.vendorId))
  const editable = r.status === 'Draft' || r.status === 'Open'
  const candidates = allVendors.filter((v) => !invitedIds.has(v.id))
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card padded={false}>
        <div className="p-4 pb-2"><CardHeader title="Invited vendors" subtitle="Multi-vendor invitation through the portal with a single closing deadline (PROC-09). Non-responders are recorded for scoring." /></div>
        {r.invited.length === 0 ? (
          <EmptyState title="No vendors invited yet" body="Select qualified vendors from the list." icon={<MailCheck size={30} />} />
        ) : (
          <DataTable
            rows={r.invited}
            rowKey={(i) => i.vendorId}
            columns={[
              { key: 'v', header: 'Vendor', render: (i) => <VendorLink id={i.vendorId} sub /> },
              { key: 'at', header: 'Invited', render: (i) => <span className="text-xs">{r.status === 'Draft' ? 'on publish' : dateTime(i.invitedAt)}</span> },
              {
                key: 'r', header: 'Response', render: (i) => {
                  const got = r.quotations.some((q) => q.vendorId === i.vendorId)
                  if (got) return <Badge tone="green" dot>{isSealed(r) ? 'Received · sealed' : 'Quoted'}</Badge>
                  if (r.status === 'Open' || r.status === 'Draft') return <Badge tone="slate">Awaiting</Badge>
                  return <Badge tone="red">No response · logged for scoring</Badge>
                },
              },
            ]}
          />
        )}
        {r.excluded.length > 0 && (
          <div className="border-t border-slate-200 p-4">
            <div className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Automatically excluded (PROC-04)</div>
            {r.excluded.map((e) => (
              <div key={e.vendorId} className="flex items-center justify-between gap-2 py-1 text-sm">
                <VendorLink id={e.vendorId} />
                <Badge tone="red"><Ban size={11} />{e.reason}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
      {editable && (
        <Card padded={false}>
          <div className="p-4 pb-2"><CardHeader title="Add vendors" subtitle="Only Active vendors with valid legal documents can be invited. Others are shown with the reason they are excluded." /></div>
          <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
            {candidates.map((v) => {
              const el = rfqEligibility(v)
              return (
                <div key={v.id} className="flex items-center justify-between gap-2 px-4 py-2">
                  <div className="min-w-0">
                    <VendorLink id={v.id} />
                    <div className="text-[11px] text-slate-500">{v.category} · docs to {date(v.docsExpiry)}</div>
                  </div>
                  {el.ok ? (
                    <Button size="sm" onClick={() => { update((x) => ({ ...x, invited: [...x.invited, { vendorId: v.id, invitedAt: `${TODAY_ISO}T10:30`, responded: false }] })); toast(`${v.name} added to ${r.id}`, 'success') }}>Invite</Button>
                  ) : (
                    <Badge tone="red"><Ban size={11} />{el.reason}</Badge>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

function Negotiation({ r }: { r: RFQ }) {
  const vendorsWithQuotes = [...new Set(r.quotations.map((q) => q.vendorId))]
  if (!vendorsWithQuotes.length) return <Card><EmptyState title="No quotations yet" /></Card>
  return (
    <div className="space-y-4">
      <Callout tone="violet">Each negotiation round is stored as a new quotation version; earlier versions are never overwritten (PROC-12).</Callout>
      {vendorsWithQuotes.map((vid) => {
        const qs = r.quotations.filter((q) => q.vendorId === vid).sort((a, b) => a.version - b.version)
        return (
          <Card key={vid} padded={false}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><VendorLink id={vid} sub /><span className="text-xs text-slate-500">{qs.length} version(s)</span></div>
            <DataTable<Quotation>
              rows={qs}
              rowKey={(q) => String(q.version)}
              columns={[
                { key: 'v', header: 'Version', render: (q) => <span className="font-medium">v{q.version}</span> },
                { key: 'r', header: 'Round', render: (q) => q.round },
                { key: 'at', header: 'Submitted', render: (q) => dateTime(q.submittedAt) },
                ...r.lines.map((l, i) => ({ key: `l${i}`, header: l.desc.length > 22 ? l.desc.slice(0, 22) + '…' : l.desc, align: 'right' as const, render: (q: Quotation) => idr(q.prices[i]) })),
                { key: 't', header: 'Total', align: 'right', render: (q) => <span className="font-semibold">{idr(quoteTotal(r, q))}</span> },
                {
                  key: 'd', header: 'Δ vs previous', align: 'right', render: (q) => {
                    const prev = qs.find((x) => x.version === q.version - 1)
                    if (!prev) return <span className="text-slate-400">—</span>
                    const d = quoteTotal(r, q) - quoteTotal(r, prev)
                    return <span className={d < 0 ? 'text-emerald-700' : 'text-red-600'}>{d < 0 ? '−' : '+'}{idrShort(Math.abs(d))} ({((d / quoteTotal(r, prev)) * 100).toFixed(1)}%)</span>
                  },
                },
              ]}
            />
          </Card>
        )
      })}
    </div>
  )
}

function AwardPanel({ r, update }: { r: RFQ; update: (fn: (x: RFQ) => RFQ) => void }) {
  const toast = useToast()
  const quotes = latestQuotes(r)
  const lowest = quotes.length ? quotes.reduce((a, b) => (quoteTotal(r, a) <= quoteTotal(r, b) ? a : b)) : undefined
  const [sel, setSel] = useState<string>(r.award?.vendorId ?? lowest?.vendorId ?? '')
  const [just, setJust] = useState('')
  const [tried, setTried] = useState(false)

  if (r.award) {
    const q = quotes.find((x) => x.vendorId === r.award!.vendorId)
    return (
      <Card>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 text-emerald-600" size={22} />
          <div>
            <div className="text-base font-semibold text-slate-900">Awarded to {findVendor(r.award.vendorId)?.name}</div>
            <div className="text-sm text-slate-600">{dateTime(r.award.at)} by {getEmployee(r.award.by)?.name} · {q ? idr(quoteTotal(r, q)) : ''} {lowest?.vendorId === r.award.vendorId ? '· lowest bidder' : '· not the lowest bidder'}</div>
            {r.award.justification && <div className="mt-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900 ring-1 ring-amber-200"><b>Justification:</b> {r.award.justification}</div>}
            {r.award.poId && <div className="mt-2 text-sm">Purchase order: <TextLink to={`/procurement/orders/${r.award.poId}`}>{r.award.poId}</TextLink></div>}
          </div>
        </div>
      </Card>
    )
  }
  if (!quotes.length) return <Card><EmptyState title="Nothing to award yet" /></Card>

  const notLowest = !!lowest && sel !== lowest.vendorId
  const award = () => {
    setTried(true)
    if (!sel) return
    if (notLowest && just.trim().length < 15) {
      toast('Justification is mandatory when the awarded vendor is not the lowest bidder (PROC-13)', 'error')
      return
    }
    update((x) => ({ ...x, status: 'Awarded', award: { vendorId: sel, at: `${TODAY_ISO}T11:00`, by: 'EMP-0008', justification: notLowest ? just.trim() : undefined } }))
    toast(`${r.id} awarded to ${findVendor(sel)?.name} — PO draft generated for tiered approval`, 'success')
  }

  return (
    <Card>
      <CardHeader title="Vendor selection" subtitle="Select the vendor to award. A written justification is required if it is not the lowest bidder." />
      <div className="space-y-2">
        {quotes.map((q) => {
          const t = quoteTotal(r, q)
          const isLow = q.vendorId === lowest?.vendorId
          return (
            <label key={q.vendorId} className={cx('flex cursor-pointer items-center justify-between gap-3 rounded-lg p-3 ring-1', sel === q.vendorId ? 'bg-brand-50 ring-brand-300' : 'ring-slate-200 hover:bg-slate-50')}>
              <span className="flex items-center gap-3">
                <input type="radio" checked={sel === q.vendorId} onChange={() => setSel(q.vendorId)} className="accent-amber-500" />
                <span>
                  <span className="block font-medium text-slate-800">{findVendor(q.vendorId)?.name}</span>
                  <span className="block text-xs text-slate-500">v{q.version} · delivery {q.deliveryDays} d · {q.paymentTerms} · score {findVendor(q.vendorId)?.score}</span>
                </span>
              </span>
              <span className="text-right">
                <span className="num block font-semibold">{idr(t)}</span>
                {isLow ? <Badge tone="green">Lowest</Badge> : lowest && <span className="text-[11px] text-red-600">+{idrShort(t - quoteTotal(r, lowest))} vs lowest</span>}
              </span>
            </label>
          )
        })}
      </div>
      {notLowest && (
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-slate-700">Justification (mandatory — not the lowest bidder)</label>
          <textarea
            value={just}
            onChange={(e) => setJust(e.target.value)}
            rows={3}
            placeholder="e.g. OEM chemistry keeps the membrane warranty valid; lowest bidder did not provide a compatibility letter."
            className={cx('w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200', tried && just.trim().length < 15 ? 'border-red-500' : 'border-slate-300')}
          />
          {tried && just.trim().length < 15 && <div className="mt-1 text-xs text-red-600">Enter at least 15 characters. The justification is stored on the award and shown to PO approvers.</div>}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <Button variant="primary" icon={<Award size={15} />} onClick={award}>Award to {findVendor(sel)?.name ?? '…'}</Button>
      </div>
    </Card>
  )
}
