import { Link, useParams } from 'react-router-dom'
import { AlertOctagon, Check, ExternalLink, GitCompare, Send } from 'lucide-react'
import { Badge, Button, Callout, Card, CardHeader, DataTable, DescList, EmptyState, PageHeader, ProjectCodeChip, StatusBadge, Timeline, cx } from '@/components/ui'
import { getProject } from '@/data/core'
import { allPurchaseOrders, findVendor, poDetails, poTiers, receiptValue, tierFor } from '@/data/procurement'
import { date, idr, idrShort, num, TODAY_ISO } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { MODULE_PROC, TextLink, VendorLink, receivedByLine, receivedValue } from './shared'
import { poStore, usePOState, usePRs, useReceipts, useRFQs } from './store'

export default function OrderDetail() {
  const { id } = useParams()
  const st = usePOState()
  const rc = useReceipts()
  const prs = usePRs()
  const rfqs = useRFQs()
  const toast = useToast()
  const base = allPurchaseOrders.find((p) => p.id === id)
  if (!base) return <Card><EmptyState title="Purchase order not found" body={`No PO with id ${id}.`} /></Card>

  const s = st[base.id] ?? { status: base.status }
  const po = { ...base, status: s.status }
  const d = poDetails[po.id]
  const vendor = findVendor(po.vendorId)
  const pr = prs.find((p) => p.id === po.prId)
  const rfq = rfqs.find((r) => r.award?.poId === po.id) ?? rfqs.find((r) => r.prId === po.prId)
  const tier = tierFor(po.amount)
  const pm = getProject(po.projectCode)?.pmId
  const myReceipts = rc.filter((r) => r.poId === po.id)
  const recvd = receivedValue(po.id, rc)
  const recvByLine = receivedByLine(po.id, rc)
  const invoiced = (d?.invoices ?? []).reduce((a, i) => a + i.amount, 0)

  // Approval progress: approved statuses have all steps done; Pending Approval has the first step (Procurement Manager) done
  const approvedSteps = po.status === 'Draft' ? 0 : po.status === 'Pending Approval' ? s.approvedSteps ?? 1 : tier.approvers.length
  const approverName = (role: string) => ({ 'Procurement Manager': 'Rudi Hartono', 'Project Manager': pm === 'EMP-0004' ? 'Dewi Kartika' : pm === 'EMP-0005' ? 'Agus Salim' : pm === 'EMP-0002' ? 'Ratna Sari Dewi' : 'Bambang Prasetyo', 'Finance Director': 'Ratna Sari Dewi', CEO: 'Hendra Wijaya' })[role] ?? role

  const approve = () => {
    const next = approvedSteps + 1
    const done = next >= tier.approvers.length
    poStore.set((x) => ({ ...x, [po.id]: { status: done ? 'Approved' : 'Pending Approval', approvedSteps: next } }))
    toast(done ? `${po.id} fully approved (Tier ${tier.tier}) — sent to ${vendor?.name} via the portal; commitment recorded on ${po.projectCode}` : `${tier.approvers[approvedSteps]} approved — next: ${tier.approvers[next]}`, 'success')
  }
  const submit = () => {
    poStore.set((x) => ({ ...x, [po.id]: { status: 'Pending Approval', approvedSteps: 0 } }))
    toast(`${po.id} submitted for Tier ${tier.tier} approval`, 'success')
  }

  return (
    <>
      <PageHeader
        module={MODULE_PROC}
        crumbs={[{ label: 'Purchase orders', to: '/procurement/orders' }, { label: po.id }]}
        title={po.description}
        subtitle={<span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs">{po.id}</span><StatusBadge status={po.status} /><Badge tone="violet">Tier {tier.tier} · {tier.label}</Badge></span>}
        actions={
          <>
            {po.status === 'Draft' && <Button variant="primary" icon={<Send size={15} />} onClick={submit}>Submit for approval</Button>}
            {po.status === 'Pending Approval' && <Button variant="success" icon={<Check size={15} />} onClick={approve}>Approve as {tier.approvers[approvedSteps]}</Button>}
          </>
        }
      />

      {pr?.escalated && (
        <div className="mb-4">
          <Callout tone="amber" icon={<AlertOctagon size={18} />} title={`Source requisition ${pr.id} exceeded remaining RAB`}>
            The budget escalation was approved by the Finance Director before this PO was raised. See the <TextLink to={`/procurement/requisitions/${pr.id}`} mono={false}>budget check snapshot</TextLink>.
          </Callout>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <DescList
              cols={3}
              items={[
                { label: 'Vendor', value: <VendorLink id={po.vendorId} sub /> },
                { label: 'Project code', value: <ProjectCodeChip code={po.projectCode} showName /> },
                { label: 'PO date', value: date(po.date) },
                { label: 'Amount', value: idr(po.amount) },
                { label: 'Cost category', value: po.costCategory },
                { label: 'Payment terms', value: d?.paymentTerms ?? '—' },
                { label: 'Source PR', value: <TextLink to={`/procurement/requisitions/${po.prId}`}>{po.prId}</TextLink> },
                { label: 'RFQ', value: rfq ? <TextLink to={`/procurement/rfq/${rfq.id}`}>{rfq.id}</TextLink> : 'Frame agreement call-off' },
                { label: 'Deliver to', value: d?.deliveryTo ?? '—' },
              ]}
            />
          </Card>

          <Card>
            <CardHeader title="Commitment → actual cost" subtitle="Approved PO value is a commitment on the project code; each receipt converts its value into actual cost (FAT-02)." />
            <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
              <div className="bg-slate-600" style={{ width: `${(recvd / po.amount) * 100}%` }} title="Actual (received)" />
              <div className="bg-slate-300" style={{ width: `${((po.amount - recvd) / po.amount) * 100}%` }} title="Open commitment" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><div className="text-xs text-slate-500">PO value</div><div className="num font-semibold">{idrShort(po.amount)}</div></div>
              <div><div className="flex items-center gap-1 text-xs text-slate-500"><span className="h-2 w-2 rounded-sm bg-slate-600" />Actual (received)</div><div className="num font-semibold">{idrShort(recvd)}</div></div>
              <div><div className="flex items-center gap-1 text-xs text-slate-500"><span className="h-2 w-2 rounded-sm bg-slate-300" />Open commitment</div><div className="num font-semibold">{idrShort(po.amount - recvd)}</div></div>
              <div><div className="text-xs text-slate-500">Invoiced (Loket)</div><div className="num font-semibold">{idrShort(invoiced)}</div></div>
            </div>
          </Card>

          <Card padded={false}>
            <div className="p-4 pb-2"><CardHeader title="Lines" subtitle="Project code on every line" /></div>
            <DataTable
              rows={(d?.lines ?? []).map((l, i) => ({ ...l, i }))}
              rowKey={(l) => String(l.i)}
              columns={[
                { key: 'n', header: '#', render: (l) => l.i + 1 },
                { key: 'd', header: 'Description', render: (l) => <span className="font-medium text-slate-800">{l.desc}</span> },
                { key: 'pc', header: 'Project code', render: (l) => <ProjectCodeChip code={l.projectCode} /> },
                { key: 'q', header: 'Ordered', align: 'right', render: (l) => `${num(l.qty)} ${l.uom}` },
                { key: 'r', header: 'Received', align: 'right', render: (l) => <span className={cx(recvByLine[l.i] >= l.qty ? 'text-emerald-700' : recvByLine[l.i] > 0 ? 'text-sky-700' : 'text-slate-400')}>{num(recvByLine[l.i])}</span> },
                { key: 'o', header: 'Outstanding', align: 'right', render: (l) => num(l.qty - recvByLine[l.i]) },
                { key: 'p', header: 'Unit price', align: 'right', render: (l) => idr(l.price) },
                { key: 'a', header: 'Amount', align: 'right', render: (l) => <span className="font-medium">{idr(l.qty * l.price)}</span> },
              ]}
              footer={<tr><td colSpan={7} className="px-3 py-2 text-right">Total</td><td className="num px-3 py-2 text-right">{idr(po.amount)}</td></tr>}
            />
          </Card>

          {d?.milestones && (
            <Card padded={false}>
              <div className="p-4 pb-2"><CardHeader title="Payment milestones" subtitle="Term tracking on long-running POs; each milestone is linked to evidence of work completion (PROC-20)." /></div>
              <DataTable
                rows={d.milestones}
                rowKey={(m) => m.name}
                columns={[
                  { key: 'n', header: 'Milestone', render: (m) => <span className="font-medium text-slate-800">{m.name}</span> },
                  { key: 'p', header: '%', align: 'right', render: (m) => `${m.pct}%` },
                  { key: 'a', header: 'Amount', align: 'right', render: (m) => idrShort((po.amount * m.pct) / 100) },
                  { key: 'd', header: 'Due', render: (m) => date(m.due) },
                  { key: 'e', header: 'Evidence', render: (m) => (m.evidence ? <span className="text-xs text-slate-600">{m.evidence}</span> : <span className="text-xs text-slate-400">Awaiting completion</span>) },
                  { key: 's', header: 'Status', render: (m) => <StatusBadge status={m.status} /> },
                ]}
              />
            </Card>
          )}

          <Card padded={false}>
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-2">
              <CardHeader className="mb-0" title="AP invoices & three-way match" subtitle="Invoices arrive via Loket Invoice (receipt number and date) and are matched PO / GR / invoice within tolerance." />
              <Link to="/finance/ap/match" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"><GitCompare size={13} />Open three-way match<ExternalLink size={11} /></Link>
            </div>
            {(d?.invoices.length ?? 0) === 0 ? (
              <div className="px-4 pb-4 text-sm text-slate-400">No vendor invoice received yet.</div>
            ) : (
              <DataTable
                rows={d!.invoices}
                rowKey={(i) => i.id}
                columns={[
                  { key: 'i', header: 'Vendor invoice', render: (i) => <span className="font-mono text-[12px]">{i.id}</span> },
                  { key: 'l', header: 'Loket no.', render: (i) => <span className="font-mono text-[12px]">{i.loketNo}</span> },
                  { key: 'd', header: 'Received', render: (i) => date(i.received) },
                  { key: 'a', header: 'Amount', align: 'right', render: (i) => idr(i.amount) },
                  { key: 'c', header: 'PO · GR · Inv', render: (i) => <span className="flex gap-1"><Badge tone="green">PO</Badge><Badge tone={i.match === 'Awaiting GR' ? 'amber' : 'green'}>GR</Badge><Badge tone={i.match === 'Exception' ? 'red' : i.match === 'Matched' ? 'green' : 'amber'}>INV</Badge></span> },
                  { key: 'm', header: 'Match', render: (i) => <Badge tone={i.match === 'Matched' ? 'green' : i.match === 'Exception' ? 'red' : 'amber'} dot>{i.match}{i.match === 'Exception' ? ' · price +1.7% > 1% tolerance' : ''}</Badge> },
                ]}
              />
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Tiered approval by value" subtitle="Authorisation limits are configurable (PROC-14)" />
            <div className="space-y-1.5">
              {poTiers.map((t) => (
                <div key={t.tier} className={cx('flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs', t.tier === tier.tier ? 'bg-ink-900 font-medium text-white' : 'bg-slate-50 text-slate-500')}>
                  <span>Tier {t.tier} · {t.label}</span>
                  <span>{t.approvers.length} approver{t.approvers.length > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Timeline
                items={tier.approvers.map((a, i) => ({
                  time: i < approvedSteps ? (po.status === 'Pending Approval' && s.approvedSteps && i >= 1 ? date(TODAY_ISO) : date(po.date)) : i === approvedSteps && po.status === 'Pending Approval' ? 'Awaiting' : '—',
                  title: a,
                  body: approverName(a),
                  tone: i < approvedSteps ? 'green' : i === approvedSteps && po.status === 'Pending Approval' ? 'amber' : 'slate',
                }))}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Receipts" subtitle={`${myReceipts.length} GR/SR posted`} actions={<Link to="/procurement/receipts" className="text-xs font-medium text-brand-700 hover:underline">All receipts →</Link>} />
            {myReceipts.length === 0 ? (
              <div className="text-sm text-slate-400">Nothing received yet.</div>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {myReceipts.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                    <span><span className="font-mono text-[12px] font-medium">{r.id}</span><span className="block text-[11px] text-slate-500">{date(r.date)} · {r.location}</span></span>
                    <span className="num font-medium">{idrShort(receiptValue(r))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {vendor && (
            <Card>
              <CardHeader title="Vendor" />
              <VendorLink id={vendor.id} sub />
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <StatusBadge status={vendor.status} />
                <Badge tone={vendor.score >= 80 ? 'green' : vendor.score >= 60 ? 'amber' : 'red'}>Score {vendor.score}</Badge>
                <Badge>{vendor.pkp ? 'PKP' : 'Non-PKP'}</Badge>
              </div>
              <div className="mt-2 text-xs text-slate-500">{vendor.category} · {vendor.city}</div>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
