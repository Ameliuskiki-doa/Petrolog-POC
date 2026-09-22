import { useNavigate, useParams } from 'react-router-dom'
import { AlertOctagon, Check, FileSearch, Send, X } from 'lucide-react'
import { Button, Callout, Card, CardHeader, DataTable, DescList, EmptyState, PageHeader, ProjectCodeChip, Stepper, Timeline } from '@/components/ui'
import { getEmployee } from '@/data/core'
import { budgetCheck, prAmount, snapExceeds, type PurchaseRequisition, type RFQ } from '@/data/procurement'
import { date, dateTime, idr, idrShort, num, TODAY_ISO } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { BudgetCheckRows, BudgetResult, MODULE_PROC, PRStatusBadge, Person, TextLink } from './shared'
import { prStore, rfqStore, usePRs } from './store'

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function RequisitionDetail() {
  const { id } = useParams()
  const prs = usePRs()
  const nav = useNavigate()
  const toast = useToast()
  const pr = prs.find((p) => p.id === id)
  if (!pr) return <Card><EmptyState title="Requisition not found" body={`No PR with id ${id}.`} /></Card>

  const update = (fn: (p: PurchaseRequisition) => PurchaseRequisition) => prStore.set((s) => s.map((x) => (x.id === pr.id ? fn(x) : x)))
  const pendingStep = pr.approvals.find((a) => a.status === 'Pending')

  const approve = () => {
    if (!pendingStep) return
    const idx = pr.approvals.indexOf(pendingStep)
    const last = idx === pr.approvals.length - 1
    update((p) => ({
      ...p,
      status: last ? 'Approved' : p.status,
      approvals: p.approvals.map((a, i) => (i === idx ? { ...a, status: 'Approved', at: `${TODAY_ISO}T10:05`, comment: a.step.startsWith('Finance') ? 'Approved as exception — RAB revision to follow' : undefined } : i === idx + 1 ? { ...a, status: 'Pending' } : a)),
    }))
    toast(last ? `${pr.id} approved — ready for RFQ` : `${pendingStep.step} approved; forwarded to ${pr.approvals[idx + 1].step}`, 'success')
  }

  const reject = () => {
    update((p) => ({ ...p, status: 'Rejected', approvals: p.approvals.map((a) => (a === pendingStep ? { ...a, status: 'Rejected', at: `${TODAY_ISO}T10:05`, comment: 'Rejected — resubmit after RAB revision' } : a)) }))
    toast(`${pr.id} rejected — requester notified`, 'warning')
  }

  const submitDraft = () => {
    if (pr.lines.some((l) => !l.projectCode)) {
      toast('Cannot submit: project code missing on a line (PROC-06)', 'error')
      return
    }
    const snapshot = budgetCheck(pr.lines)
    const escalated = snapshot.some(snapExceeds)
    update((p) => ({
      ...p,
      status: 'Pending Approval',
      snapshot,
      escalated,
      snapshotAt: `${TODAY_ISO}T10:00`,
      approvals: [
        { step: 'Submitted — budget check run', approverId: p.requesterId, status: 'Approved', at: `${TODAY_ISO}T10:00`, comment: escalated ? 'Budget check: exceeds remaining RAB → escalation' : 'Budget check: within remaining RAB' },
        { step: 'Project Manager', approverId: 'EMP-0003', status: 'Pending' },
        ...(escalated ? [{ step: 'Finance Director (budget escalation)', approverId: 'EMP-0002', status: 'Waiting' as const }] : []),
        { step: 'Procurement acceptance', approverId: 'EMP-0008', status: 'Waiting' },
      ],
    }))
    toast(`${pr.id} submitted — budget check ${escalated ? 'failed, escalated' : 'passed'}`, escalated ? 'warning' : 'success')
  }

  const createRFQ = () => {
    const all = rfqStore.get()
    const n = Math.max(...all.map((r) => Number(r.id.slice(-4)))) + 1
    const rid = `RFQ-2028-${String(n).padStart(4, '0')}`
    const rfq: RFQ = {
      id: rid, prId: pr.id, title: pr.title, projectCode: pr.lines[0].projectCode, created: TODAY_ISO, closing: `${addDays(TODAY_ISO, 7)}T17:00`, status: 'Draft', buyerId: 'EMP-0008',
      lines: pr.lines.map((l) => ({ desc: l.desc, qty: l.qty, uom: l.uom })), invited: [], excluded: [], quotations: [],
    }
    rfqStore.set((s) => [rfq, ...s])
    update((p) => ({ ...p, status: 'RFQ', rfqId: rid }))
    toast(`${rid} created from ${pr.id} — select vendors to invite`, 'success')
    nav(`/procurement/rfq/${rid}`)
  }

  const stepIdx = { Draft: 'Draft', 'Pending Approval': 'Approval', Approved: 'Approval', RFQ: 'RFQ', 'PO Issued': 'PO', Rejected: 'Approval' }[pr.status]
  const over = pr.snapshot.filter(snapExceeds)

  return (
    <>
      <PageHeader
        module={MODULE_PROC}
        crumbs={[{ label: 'Purchase requisitions', to: '/procurement/requisitions' }, { label: pr.id }]}
        title={pr.title}
        subtitle={<span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs">{pr.id}</span><PRStatusBadge status={pr.status} escalated={pr.escalated} /></span>}
        actions={
          <>
            {pr.status === 'Draft' && <Button variant="primary" icon={<Send size={15} />} onClick={submitDraft}>Submit & run budget check</Button>}
            {pr.status === 'Pending Approval' && pendingStep && (
              <>
                <Button variant="danger" icon={<X size={15} />} onClick={reject}>Reject</Button>
                <Button variant="success" icon={<Check size={15} />} onClick={approve}>Approve as {pendingStep.step.split(' (')[0]}</Button>
              </>
            )}
            {pr.status === 'Approved' && <Button variant="primary" icon={<FileSearch size={15} />} onClick={createRFQ}>Create RFQ</Button>}
          </>
        }
      />

      <Card className="mb-4">
        <Stepper steps={['Draft', 'Budget check', 'Approval', 'RFQ', 'PO', 'Received']} current={stepIdx} />
        <div className="mt-4">
          <DescList
            cols={4}
            items={[
              { label: 'Requester', value: <Person id={pr.requesterId} /> },
              { label: 'Requested / needed by', value: `${date(pr.date)} → ${date(pr.neededBy)}` },
              { label: 'Amount', value: idr(prAmount(pr)) },
              { label: 'Budget check', value: <BudgetResult rows={pr.snapshot} /> },
              { label: 'Justification', value: pr.justification || '—' },
              { label: 'RFQ', value: pr.rfqId ? <TextLink to={`/procurement/rfq/${pr.rfqId}`}>{pr.rfqId}</TextLink> : '—' },
              { label: 'Purchase order', value: pr.poId ? <TextLink to={`/procurement/orders/${pr.poId}`}>{pr.poId}</TextLink> : '—' },
              { label: 'Lines', value: pr.lines.length },
            ]}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader
              title="Budget check snapshot"
              subtitle={pr.status === 'Draft' ? 'Preview — the snapshot is frozen at submission.' : `Frozen at submission ${dateTime(pr.snapshotAt)} · remaining = RAB − actuals − commitments (PROC-07)`}
            />
            {over.length > 0 && (
              <div className="mb-3">
                <Callout tone="red" icon={<AlertOctagon size={18} />} title="Exceeds remaining RAB — approval escalated">
                  The request is {idrShort(over.reduce((s, r) => s + r.request - (r.rab - r.actual - r.committed), 0))} above what is left on the RAB line. The workflow added the Finance Director to the approval chain automatically; the PR could not proceed to RFQ until that approval was given.
                </Callout>
              </div>
            )}
            <BudgetCheckRows rows={pr.status === 'Draft' ? budgetCheck(pr.lines) : pr.snapshot} />
          </Card>

          <Card padded={false}>
            <div className="p-4 pb-2"><CardHeader title="Requisition lines" subtitle="Project code is mandatory on every line (PROC-06)" /></div>
            <DataTable
              rows={pr.lines.map((l, i) => ({ ...l, i }))}
              rowKey={(l) => String(l.i)}
              columns={[
                { key: 'n', header: '#', render: (l) => l.i + 1 },
                { key: 'd', header: 'Description', render: (l) => <span className="font-medium text-slate-800">{l.desc}</span> },
                { key: 'pc', header: 'Project code', render: (l) => <ProjectCodeChip code={l.projectCode} /> },
                { key: 'c', header: 'Cost category', render: (l) => l.category },
                { key: 'q', header: 'Qty', align: 'right', render: (l) => `${num(l.qty)} ${l.uom}` },
                { key: 'p', header: 'Est. unit price', align: 'right', render: (l) => idr(l.price) },
                { key: 'a', header: 'Amount', align: 'right', render: (l) => <span className="font-medium">{idr(l.qty * l.price)}</span> },
              ]}
              footer={<tr><td colSpan={6} className="px-3 py-2 text-right">Total</td><td className="num px-3 py-2 text-right">{idr(prAmount(pr))}</td></tr>}
            />
          </Card>
        </div>

        <Card>
          <CardHeader title="Approval trail" subtitle={pr.escalated ? 'Route extended by budget escalation' : 'Standard route'} />
          {pr.approvals.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">Not yet submitted</div>
          ) : (
            <Timeline
              items={pr.approvals.map((a) => ({
                time: a.at ? dateTime(a.at) : a.status === 'Pending' ? 'Awaiting action' : 'Waiting',
                title: a.step,
                body: (
                  <span>
                    {getEmployee(a.approverId)?.name} · <b>{a.status}</b>
                    {a.comment && <span className="mt-0.5 block text-slate-600 italic">"{a.comment}"</span>}
                  </span>
                ),
                tone: a.status === 'Approved' ? 'green' : a.status === 'Pending' ? 'amber' : a.status === 'Rejected' ? 'red' : 'slate',
              }))}
            />
          )}
        </Card>
      </div>
    </>
  )
}
