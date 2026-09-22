import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, FileInput, FolderKanban, History, Lock, ShieldCheck, XCircle } from 'lucide-react'
import { getEmployee, getProject } from '@/data/core'
import { categoryMeta, lateCosts, type LateCost, type LateCostStatus } from '@/data/projects'
import { Button, Callout, Card, CardHeader, DataTable, DescList, Grid, Modal, PageHeader, ProjectCodeChip, Select, Stat, cx, type Column } from '@/components/ui'
import { date, idr, idrShort, period } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { DocLink, LateBadge, MODULE, journalLink } from './shared'

const CURRENT = '2028-03'
let nextJv = 21

export default function LateCosts() {
  const toast = useToast()
  const [items, setItems] = useState<LateCost[]>(lateCosts)
  const [status, setStatus] = useState<LateCostStatus | ''>('')
  const [sel, setSel] = useState<LateCost | null>(null)
  const [rejecting, setRejecting] = useState<LateCost | null>(null)

  const rows = items.filter((l) => !status || l.status === status)
  const pending = items.filter((l) => l.status === 'Pending approval')
  const charged = items.filter((l) => l.status === 'Charged')

  const charge = (l: LateCost) => {
    const jv = `JV-2028-03-00${nextJv++}`
    setItems((xs) => xs.map((x) => (x.id === l.id ? { ...x, status: 'Charged', journalId: jv, postedOn: '2028-03-10', approvedBy: 'EMP-0028' } : x)))
    setSel(null)
    toast(`${l.id} posted to Mar 2028 (${jv}) and attributed to ${l.projectCode} · ${period(l.originalPeriod)}`, 'success')
  }
  const reject = (l: LateCost) => {
    setItems((xs) => xs.map((x) => (x.id === l.id ? { ...x, status: 'Rejected' } : x)))
    setRejecting(null)
    toast(`${l.id} rejected and returned to Loket Invoice`, 'warning')
  }

  const cols: Column<LateCost>[] = [
    {
      key: 'id',
      header: 'Late cost',
      render: (l) => (
        <div>
          <span className="font-mono text-[12px] font-medium">{l.id}</span>
          <div className="text-[11px] text-slate-500">
            Loket <DocLink to="/finance/loket">{l.loketNo}</DocLink>
          </div>
        </div>
      ),
    },
    {
      key: 'p',
      header: 'Attribution',
      render: (l) => (
        <div>
          <ProjectCodeChip code={l.projectCode} />
          <div className="mt-0.5 text-[11px] text-slate-500">{getProject(l.projectCode)?.status === 'Closed' ? 'Project closed' : getProject(l.projectCode)?.status}</div>
        </div>
      ),
    },
    {
      key: 'd',
      header: 'Description',
      render: (l) => (
        <div className="max-w-[300px]">
          <div className="truncate text-xs text-slate-800" title={l.description}>
            {l.description}
          </div>
          <div className="truncate text-[11px] text-slate-500">
            {l.vendorId ? (
              <Link to={`/vendors/${l.vendorId}`} onClick={(e) => e.stopPropagation()} className="text-sky-700 hover:underline">
                {l.vendorName}
              </Link>
            ) : (
              l.vendorName
            )}{' '}
            · {l.invoiceNo}
          </div>
        </div>
      ),
    },
    { key: 'c', header: 'Category', render: (l) => <span className="text-xs">{l.category}</span> },
    {
      key: 'op',
      header: 'Original period',
      render: (l) => (
        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
          <Lock size={11} /> {period(l.originalPeriod)}
        </span>
      ),
    },
    {
      key: 'pp',
      header: 'Posting period',
      render: (l) =>
        l.status === 'Rejected' ? (
          <span className="text-xs text-slate-400">—</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
            <CalendarCheck size={11} /> {period(CURRENT)}
          </span>
        ),
    },
    { key: 'r', header: 'Received', render: (l) => <span className="text-xs whitespace-nowrap">{date(l.receivedOn)}</span> },
    { key: 'a', header: 'Amount', align: 'right', render: (l) => <span className="font-medium">{idrShort(l.amount)}</span> },
    { key: 's', header: 'Status', render: (l) => <LateBadge status={l.status} /> },
    {
      key: 'j',
      header: 'Journal / action',
      render: (l) =>
        l.status === 'Charged' && l.journalId ? (
          <DocLink to={journalLink(l.journalId)}>{l.journalId}</DocLink>
        ) : l.status === 'Pending approval' ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation()
                setSel(l)
              }}
            >
              Charge to originating project
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                setRejecting(l)
              }}
              aria-label="Reject"
            >
              <XCircle size={14} />
            </Button>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">Returned to Loket</span>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        module={MODULE}
        title="Late costs — controlled reopening"
        subtitle="Costs that arrive after a period is closed are still charged to the right project code, without unlocking the closed period (FAT-19)."
      />

      <Grid cols={4} className="mb-5">
        <Stat label="Awaiting approval" value={pending.length} sub={idrShort(pending.reduce((a, l) => a + l.amount, 0))} tone={pending.length ? 'warn' : 'good'} />
        <Stat label="Charged in Mar 2028" value={charged.length} sub={idrShort(charged.reduce((a, l) => a + l.amount, 0))} />
        <Stat label="Projects affected" value={new Set(items.filter((l) => l.status !== 'Rejected').map((l) => l.projectCode)).size} sub="incl. closed PS-2027-017" />
        <Stat label="Closed periods reopened" value="0" sub="Periods stay locked" tone="good" />
      </Grid>

      <Card className="mb-4">
        <CardHeader title="How controlled reopening works" subtitle="Accounting principle and project truth, both preserved" />
        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1.3fr]">
          <FlowBox tone="slate" icon={<Lock size={18} />} title="Closed period stays locked" body="Dec 2027 · Jan 2028 · Feb 2028 cannot receive postings. Nothing is unlocked." />
          <Arrow />
          <FlowBox tone="violet" icon={<FileInput size={18} />} title="Invoice arrives late" body="Registered at Loket Invoice with receipt number & date; flagged because its service period is closed." />
          <Arrow />
          <div className="grid grid-cols-1 gap-2">
            <FlowBox tone="green" icon={<CalendarCheck size={18} />} title="Journal → current period" body="Posts to Mar 2028 (open), in line with accounting principle." />
            <FlowBox tone="amber" icon={<FolderKanban size={18} />} title="Cost → originating project" body="Carries the original project code and service period, so project P/L stays accurate." />
          </div>
        </div>
      </Card>

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <Select value={status} onChange={(e) => setStatus(e.target.value as LateCostStatus | '')}>
            <option value="">All statuses</option>
            <option>Pending approval</option>
            <option>Charged</option>
            <option>Rejected</option>
          </Select>
          <span className="ml-auto text-xs text-slate-500">Approval: Accounting Manager (Sri Mulyani Putri)</span>
        </div>
        <DataTable columns={cols} rows={rows} rowKey={(l) => l.id} onRowClick={(l) => l.status === 'Pending approval' && setSel(l)} rowClassName={(l) => (l.status === 'Rejected' ? 'opacity-60' : undefined)} />
      </Card>

      <Modal
        open={!!sel}
        onClose={() => setSel(null)}
        title="Charge to originating project"
        footer={
          <>
            <Button onClick={() => setSel(null)}>Cancel</Button>
            <Button variant="primary" icon={<ShieldCheck size={15} />} onClick={() => sel && charge(sel)}>
              Approve & post
            </Button>
          </>
        }
      >
        {sel && (
          <div className="space-y-4">
            <DescList
              cols={2}
              items={[
                { label: 'Late cost', value: sel.id },
                { label: 'Amount', value: idr(sel.amount) },
                { label: 'Originating project', value: <ProjectCodeChip code={sel.projectCode} showName /> },
                { label: 'Category', value: `${sel.category} (${categoryMeta[sel.category].gl})` },
                { label: 'Service period', value: `${period(sel.originalPeriod)} — locked` },
                { label: 'Posting period', value: `${period(CURRENT)} — open` },
                { label: 'Vendor / invoice', value: `${sel.vendorName} · ${sel.invoiceNo}` },
                { label: 'Requested by', value: getEmployee(sel.requestedBy)?.name ?? '—' },
              ]}
            />
            <div className="rounded-lg bg-slate-50 p-3 font-mono text-[11px] ring-1 ring-slate-200">
              <div className="mb-1 font-sans text-xs font-semibold text-slate-600">Journal preview · period Mar 2028</div>
              <div className="flex justify-between">
                <span>
                  Dr {categoryMeta[sel.category].gl} {categoryMeta[sel.category].glName} · {sel.projectCode} · attr. {period(sel.originalPeriod)}
                </span>
                <span>{idr(sel.amount)}</span>
              </div>
              <div className="flex justify-between pl-4">
                <span>Cr 2110 Accounts payable · {sel.vendorId ?? 'one-off vendor'}</span>
                <span>{idr(sel.amount)}</span>
              </div>
            </div>
            <Callout tone="amber" icon={<History size={16} />}>
              {period(sel.originalPeriod)} stays locked. The {sel.projectCode} P/L will show this line under {sel.category} with source “Late cost”.
            </Callout>
            <p className="text-xs text-slate-500">Reason: {sel.reason}</p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={`Reject ${rejecting?.id ?? ''}`}
        footer={
          <>
            <Button onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => rejecting && reject(rejecting)}>
              Reject
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">The invoice is returned to Loket Invoice with the reason recorded in the audit trail. No journal is created.</p>
      </Modal>
    </>
  )
}

function FlowBox({ tone, icon, title, body }: { tone: 'slate' | 'violet' | 'green' | 'amber'; icon: ReactNode; title: string; body: string }) {
  const c = { slate: 'bg-slate-50 ring-slate-200 text-slate-700', violet: 'bg-violet-50 ring-violet-200 text-violet-800', green: 'bg-emerald-50 ring-emerald-200 text-emerald-800', amber: 'bg-amber-50 ring-amber-200 text-amber-900' }[tone]
  return (
    <div className={cx('flex gap-3 rounded-lg p-3 ring-1 ring-inset', c)}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-xs opacity-80">{body}</div>
      </div>
    </div>
  )
}

const Arrow = () => (
  <div className="flex items-center justify-center text-slate-400">
    <ArrowRight size={20} className="rotate-90 md:rotate-0" />
  </div>
)
