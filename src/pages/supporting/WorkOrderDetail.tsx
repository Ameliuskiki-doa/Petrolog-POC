import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Circle, PackageMinus, Play, Gauge, CheckCheck, FileText } from 'lucide-react'
import {
  Badge, Button, Callout, Card, CardHeader, DataTable, DescList, EmptyState, Input, Mono, PageHeader, ProjectCodeChip, StatusBadge, Stepper, Tabs, Timeline,
} from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, dateTime, idr, num } from '@/lib/format'
import { getEmployee, getUnit, getVendor } from '@/data/core'
import { getItem, getWorkOrder, meterReadings, workOrders, woTotalCost, type WorkOrder } from '@/data/supporting'
import { Person, RefLink, UnitLink } from './shared'
import { WoCostCard } from './WorkOrders'

type TabKey = 'tasks' | 'parts' | 'labour' | 'meter' | 'history'

export default function WorkOrderDetail() {
  const { id } = useParams()
  const seed = getWorkOrder(id)
  if (!seed) {
    return (
      <>
        <PageHeader title="Work order not found" crumbs={[{ label: 'Work Orders', to: '/maintenance/work-orders' }, { label: id ?? '' }]} />
        <Card><EmptyState title={`No work order ${id}`} body="It may have been archived or the link is incorrect." /></Card>
      </>
    )
  }
  return <Detail key={seed.id} seed={seed} />
}

function Detail({ seed }: { seed: WorkOrder }) {
  const toast = useToast()
  const [w, setW] = useState<WorkOrder>(seed)
  const [tab, setTab] = useState<TabKey>('tasks')
  const [meter, setMeter] = useState('')
  const unit = getUnit(w.unitId)!
  const history = workOrders.filter((x) => x.unitId === w.unitId && x.id !== w.id)
  const readings = meterReadings.filter((r) => r.unitId === w.unitId).sort((a, b) => b.time.localeCompare(a.time))
  const steps = ['Open', 'Planned', 'In Progress', 'Completed', 'Closed']
  const current = w.status === 'Awaiting Parts' ? 'In Progress' : w.status === 'Awaiting Approval' ? 'Open' : w.status
  const log = (text: string, tone: 'blue' | 'green' | 'amber' | 'slate' = 'blue') => ({ time: '2028-03-10T09:30', text, tone })

  const toggle = (i: number) => setW((x) => ({ ...x, tasks: x.tasks.map((t, j) => (j === i ? { ...t, done: !t.done } : t)) }))
  const allDone = w.tasks.every((t) => t.done)

  const act = (status: WorkOrder['status'], msg: string) => {
    if (status === 'Completed' && !allDone) {
      toast('Cannot complete: all checklist tasks must be ticked off first', 'error')
      return
    }
    setW((x) => ({ ...x, status, closed: status === 'Completed' ? '2028-03-10' : x.closed, log: [...x.log, log(msg, status === 'Completed' ? 'green' : 'blue')] }))
    toast(msg, 'success')
  }

  const issuePart = (idx: number) => {
    setW((x) => ({ ...x, parts: x.parts.map((p, j) => (j === idx ? { ...p, status: 'Issued', issueRef: 'MV-28-03-0450' } : p)) }))
    toast(`Issued ${getItem(w.parts[idx].itemId)?.name} — cost charged to ${w.projectCode}`, 'success')
  }

  const addReading = () => {
    const v = Number(meter)
    if (!v || v < unit.meter) return toast(`Reading must be ≥ last reading (${num(unit.meter)} ${unit.meterUnit})`, 'error')
    toast(`Meter reading ${num(v)} ${unit.meterUnit} recorded — PM plans recalculated`, 'success')
    setMeter('')
  }

  return (
    <>
      <PageHeader
        module="M15 · Maintenance / EAM"
        crumbs={[{ label: 'Work Orders', to: '/maintenance/work-orders' }, { label: w.id }]}
        title={<span className="flex flex-wrap items-center gap-2">{w.id} <StatusBadge status={w.status} /></span>}
        subtitle={w.title}
        actions={
          <>
            {w.status === 'Awaiting Approval' && <Button variant="success" icon={<CheckCheck size={15} />} onClick={() => act('Planned', `Estimate ${idr(woTotalCost(w))} approved — PR released to procurement, parts on order`)}>Approve estimate</Button>}
            {(w.status === 'Open' || w.status === 'Planned') && <Button variant="primary" icon={<Play size={15} />} onClick={() => act('In Progress', 'Work started — downtime clock running')}>Start work</Button>}
            {(w.status === 'In Progress' || w.status === 'Awaiting Parts') && <Button variant="success" icon={<CheckCheck size={15} />} onClick={() => act('Completed', 'Work order completed — unit returned to available on the planning board')}>Complete</Button>}
            {w.status === 'Completed' && <Button variant="primary" onClick={() => act('Closed', 'Work order closed and costs locked')}>Close WO</Button>}
          </>
        }
      />

      <Card className="mb-4">
        <Stepper steps={steps} current={current} />
        <div className="mt-4">
          <DescList
            cols={4}
            items={[
              { label: 'Unit', value: <span className="flex items-center gap-2"><UnitLink id={w.unitId} /> <span className="text-slate-500">{unit.type}</span></span> },
              { label: 'Type / priority', value: <span className="flex gap-1.5"><Badge tone="blue">{w.type}</Badge><Badge tone={w.priority === 'Critical' ? 'red' : w.priority === 'High' ? 'orange' : 'amber'}>{w.priority}</Badge></span> },
              { label: 'Assigned to', value: <Person id={w.assigneeId} /> },
              { label: 'Charged to', value: <ProjectCodeChip code={w.projectCode} showName /> },
              { label: 'Opened / due', value: `${date(w.opened)} → ${date(w.due)}` },
              { label: 'Meter at open', value: `${num(w.meterAtOpen)} ${unit.meterUnit}` },
              { label: 'Downtime', value: w.downtimeStart ? `${w.downtimeHrs} h since ${dateTime(w.downtimeStart)}` : 'No downtime (scheduled outside shift)' },
              { label: 'PM plan', value: w.pmPlan ? <Mono>{w.pmPlan}</Mono> : '—' },
            ]}
          />
        </div>
      </Card>

      {w.status === 'Awaiting Approval' && <div className="mb-4"><Callout tone="amber" title={`Awaiting approval — estimate ${idr(woTotalCost(w))}`}>Work orders above the IDR 100 m workshop limit need Maintenance Superintendent and Finance Director approval (approval limits are configuration — see Configuration). Cost is charged to <ProjectCodeChip code={w.projectCode} /> because the unit is not committed to a project.</Callout></div>}
      {w.status === 'Awaiting Parts' && <div className="mb-4"><Callout tone="amber" title="Awaiting parts">{w.external?.desc ?? 'Parts on order.'} Unit remains unavailable on the planning board.</Callout></div>}
      {unit.cert.expiry < '2028-03-10' && <div className="mb-4"><Callout tone="red" title="Unit certificate expired">{unit.cert.number} expired {date(unit.cert.expiry)}. The unit is blocked from job assignment until the renewal is uploaded — see <Link className="underline" to="/maintenance/certifications">Certifications</Link>.</Callout></div>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {(w.symptom || w.cause) && (
            <Card className="mb-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {w.symptom && <div><div className="text-xs font-medium text-slate-500">Symptom / reason</div><p className="mt-1 text-sm text-slate-700">{w.symptom}</p></div>}
                {w.cause && <div><div className="text-xs font-medium text-slate-500">Cause found</div><p className="mt-1 text-sm text-slate-700">{w.cause}</p></div>}
              </div>
            </Card>
          )}
          <Tabs<TabKey>
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'tasks', label: 'Checklist', count: w.tasks.length },
              { key: 'parts', label: 'Spare parts', count: w.parts.length },
              { key: 'labour', label: 'Labour & services', count: w.labour.length + (w.external ? 1 : 0) },
              { key: 'meter', label: 'Meter readings', count: readings.length },
              { key: 'history', label: 'Unit history', count: history.length },
            ]}
          />
          {tab === 'tasks' && (
            <Card>
              {w.tasks.length === 0 ? <EmptyState title="No checklist yet" body="Tasks are copied from the PM plan or added by the mechanic on mobile." /> : (
                <ul className="divide-y divide-slate-100">
                  {w.tasks.map((t, i) => (
                    <li key={i}>
                      <button className="flex w-full items-center gap-3 py-2.5 text-left text-sm" onClick={() => toggle(i)}>
                        {t.done ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Circle size={18} className="text-slate-300" />}
                        <span className={t.done ? 'text-slate-500 line-through' : 'text-slate-800'}>{t.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 text-xs text-slate-500">{w.tasks.filter((t) => t.done).length} of {w.tasks.length} done</div>
            </Card>
          )}
          {tab === 'parts' && (
            <Card padded={false}>
              <DataTable
                rows={w.parts.map((p, i) => ({ ...p, i }))}
                rowKey={(p) => p.itemId}
                empty="No spare parts on this work order"
                columns={[
                  { key: 'i', header: 'Item', render: (p) => <div className="min-w-[200px]">{getItem(p.itemId)?.name}<div className="text-xs text-slate-500"><Mono>{p.itemId}</Mono> · {getItem(p.itemId)?.partNo}</div></div> },
                  { key: 'q', header: 'Qty', align: 'right', render: (p) => `${p.qty} ${getItem(p.itemId)?.uom}` },
                  { key: 'c', header: 'Moving avg', align: 'right', render: (p) => idr(p.unitCost) },
                  { key: 't', header: 'Amount', align: 'right', render: (p) => idr(p.qty * p.unitCost) },
                  { key: 's', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
                  { key: 'r', header: 'Issue', render: (p) => p.issueRef ? <Link to="/inventory" className="font-mono text-[12px] text-brand-700 hover:underline">{p.issueRef}</Link> : (
                    <Button size="sm" icon={<PackageMinus size={13} />} onClick={() => issuePart(p.i)}>Issue from store</Button>
                  ) },
                ]}
              />
              <p className="p-3 text-xs text-slate-500">Parts are issued from M14 inventory at moving-average cost; the issue carries the work order's project code.</p>
            </Card>
          )}
          {tab === 'labour' && (
            <Card padded={false}>
              <DataTable
                rows={w.labour}
                rowKey={(l) => l.empId}
                empty="No labour booked"
                columns={[
                  { key: 'e', header: 'Technician', render: (l) => <Person id={l.empId} sub /> },
                  { key: 'h', header: 'Hours', align: 'right', render: (l) => l.hrs },
                  { key: 'r', header: 'Internal rate', align: 'right', render: (l) => idr(l.rate) },
                  { key: 'a', header: 'Amount', align: 'right', render: (l) => idr(l.hrs * l.rate) },
                ]}
              />
              {w.external && (
                <div className="border-t border-slate-100 p-3 text-sm">
                  <div className="text-xs text-slate-500">External service</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Link className="text-brand-700 hover:underline" to={`/vendors/${w.external.vendorId}`}>{getVendor(w.external.vendorId)?.name}</Link>
                    <RefLink refId={w.external.po} />
                    <span className="text-slate-600">{w.external.desc}</span>
                    {w.external.amount > 0 && <span className="num ml-auto font-medium">{idr(w.external.amount)}</span>}
                  </div>
                </div>
              )}
              <p className="p-3 text-xs text-slate-500">Hours come from mechanic timesheets (working hour category: Maintenance) captured in the mobile app.</p>
            </Card>
          )}
          {tab === 'meter' && (
            <Card>
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <div className="w-48"><Input type="number" placeholder={`New reading (${unit.meterUnit})`} value={meter} onChange={(e) => setMeter(e.target.value)} /></div>
                <Button icon={<Gauge size={15} />} onClick={addReading}>Record reading</Button>
                <span className="text-xs text-slate-500">Last: {num(unit.meter)} {unit.meterUnit}</span>
              </div>
              <DataTable
                dense
                rows={readings}
                rowKey={(r) => r.time}
                empty="No readings"
                columns={[
                  { key: 't', header: 'Time', render: (r) => dateTime(r.time) },
                  { key: 'v', header: 'Reading', align: 'right', render: (r) => `${num(r.value)} ${unit.meterUnit}` },
                  { key: 's', header: 'Source', render: (r) => <Badge tone={r.source.startsWith('Tele') ? 'sky' : 'slate'}>{r.source}</Badge> },
                ]}
              />
            </Card>
          )}
          {tab === 'history' && (
            <Card padded={false}>
              <DataTable
                rows={history}
                rowKey={(h) => h.id}
                empty="No other work orders for this unit in the last 12 months"
                columns={[
                  { key: 'id', header: 'WO', render: (h) => <RefLink refId={h.id} /> },
                  { key: 't', header: 'Description', render: (h) => h.title },
                  { key: 'ty', header: 'Type', render: (h) => h.type },
                  { key: 'd', header: 'Opened', render: (h) => date(h.opened) },
                  { key: 's', header: 'Status', render: (h) => <StatusBadge status={h.status} /> },
                ]}
              />
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <WoCostCard w={w} />
          <Card>
            <CardHeader title="Activity" />
            <Timeline items={[...w.log].reverse().map((l) => ({ time: dateTime(l.time), title: l.text, tone: l.tone }))} />
          </Card>
          <Card>
            <CardHeader title="Documents" />
            <ul className="space-y-2 text-sm">
              {['Job card (signed).pdf', 'Photos — before/after (6)', w.type === 'Inspection' ? 'Inspection report.pdf' : 'Diagnostic scan.pdf'].map((d) => (
                <li key={d} className="flex items-center gap-2 text-slate-700"><FileText size={14} className="text-slate-400" />{d}</li>
              ))}
            </ul>
            <div className="mt-3 text-xs text-slate-500">Supervisor: {getEmployee('EMP-0012')?.name}</div>
          </Card>
        </div>
      </div>
    </>
  )
}
