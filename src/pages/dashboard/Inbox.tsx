import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ExternalLink, X, Clock } from 'lucide-react'
import { Badge, Button, Card, DataTable, Modal, PageHeader, ProjectCodeChip, Select, Stat, Grid, Tabs, FormField, cx } from '@/components/ui'
import { useRole, useToast } from '@/lib/app-state'
import { dateTime, idrShort, TODAY } from '@/lib/format'
import { roles } from '@/data/core'
import { approvals, type Approval } from '@/data/dashboard'

type Decision = 'Approved' | 'Rejected'

export default function Inbox() {
  const { role } = useRole()
  const toast = useToast()
  const [tab, setTab] = useState<'pending' | 'done'>('pending')
  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const [type, setType] = useState('')
  const [decided, setDecided] = useState<Record<string, Decision>>({})
  const [rejecting, setRejecting] = useState<Approval | null>(null)
  const [reason, setReason] = useState('')

  const base = scope === 'mine' ? approvals.filter((a) => a.roles.includes(role)) : approvals
  const pending = base.filter((a) => !decided[a.id])
  const rows = (tab === 'pending' ? pending : base.filter((a) => decided[a.id])).filter((a) => !type || a.type === type)
  const overdue = pending.filter((a) => new Date(a.due) < TODAY)

  function decide(a: Approval, d: Decision) {
    setDecided((s) => ({ ...s, [a.id]: d }))
    toast(`${a.ref} ${d.toLowerCase()} — ${d === 'Approved' ? 'routed to the next step' : 'returned to ' + a.requester}`, d === 'Approved' ? 'success' : 'warning')
  }

  return (
    <>
      <PageHeader
        module="Workflow & Approval Engine"
        title="My Approvals"
        subtitle={`Signed in as ${roles[role].label}. Authorisation limits by value and transaction type, delegation, SLA escalation and parallel approval are configuration, not code.`}
        actions={
          <Select value={scope} onChange={(e) => setScope(e.target.value as 'mine' | 'all')}>
            <option value="mine">Assigned to me</option>
            <option value="all">All roles (demo)</option>
          </Select>
        }
      />
      <Grid cols={4} className="mb-4">
        <Stat label="Waiting for decision" value={pending.length} />
        <Stat label="Past SLA" value={overdue.length} tone={overdue.length ? 'bad' : undefined} sub={overdue.length ? 'Auto-escalates to the next level' : 'All within SLA'} />
        <Stat label="Value awaiting approval" value={idrShort(pending.reduce((s, a) => s + (a.amount ?? 0), 0))} />
        <Stat label="Decided this session" value={Object.keys(decided).length} />
      </Grid>
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
          <Tabs
            className="mb-0 border-0"
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'pending', label: 'Pending', count: pending.length },
              { key: 'done', label: 'Decided', count: base.filter((a) => decided[a.id]).length },
            ]}
          />
          <Select value={type} onChange={(e) => setType(e.target.value)} className="mb-4">
            <option value="">All types</option>
            {[...new Set(approvals.map((a) => a.type))].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </div>
        <DataTable
          rows={rows}
          rowKey={(a) => a.id}
          empty="Nothing here — you are all caught up"
          columns={[
            {
              key: 'item',
              header: 'Item',
              render: (a) => (
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-600">{a.type}</span>
                    <span className="font-mono">{a.ref}</span>
                    {a.flag && <Badge tone={a.flag === 'Overdue' ? 'red' : 'amber'}>{a.flag}</Badge>}
                  </div>
                  <Link to={a.to} className="block max-w-[420px] truncate text-[13px] font-medium text-slate-800 hover:underline">
                    {a.title}
                  </Link>
                </div>
              ),
            },
            { key: 'pc', header: 'Project', render: (a) => (a.projectCode ? <ProjectCodeChip code={a.projectCode} /> : <span className="text-slate-400">—</span>) },
            { key: 'amt', header: 'Amount', align: 'right', render: (a) => (a.amount !== undefined ? idrShort(a.amount) : '—') },
            { key: 'req', header: 'Requested by', render: (a) => <div className="text-xs"><div className="text-slate-700">{a.requester}</div><div className="text-slate-400">{dateTime(a.submitted)}</div></div> },
            {
              key: 'due',
              header: 'SLA',
              render: (a) => {
                const late = new Date(a.due) < TODAY
                return (
                  <span className={cx('flex items-center gap-1 text-xs', late ? 'font-medium text-red-600' : 'text-slate-600')}>
                    <Clock size={12} /> {dateTime(a.due)}
                  </span>
                )
              },
            },
            {
              key: 'act',
              header: '',
              align: 'right',
              render: (a) =>
                decided[a.id] ? (
                  <Badge tone={decided[a.id] === 'Approved' ? 'green' : 'red'} dot>
                    {decided[a.id]}
                  </Badge>
                ) : (
                  <div className="flex justify-end gap-1.5">
                    <Link to={a.to}>
                      <Button size="sm" variant="ghost" icon={<ExternalLink size={13} />}>
                        Open
                      </Button>
                    </Link>
                    <Button size="sm" variant="secondary" icon={<X size={13} />} onClick={() => { setRejecting(a); setReason('') }}>
                      Reject
                    </Button>
                    <Button size="sm" variant="success" icon={<Check size={13} />} onClick={() => decide(a, 'Approved')}>
                      Approve
                    </Button>
                  </div>
                ),
            },
          ]}
        />
      </Card>

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Reject ${rejecting?.ref}`}
        footer={
          <>
            <Button onClick={() => setRejecting(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={reason.trim().length < 5}
              onClick={() => {
                if (rejecting) decide(rejecting, 'Rejected')
                setRejecting(null)
              }}
            >
              Reject with reason
            </Button>
          </>
        }
      >
        <FormField label="Reason (recorded in the decision history)" hint="Minimum 5 characters">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
        </FormField>
      </Modal>
    </>
  )

}
