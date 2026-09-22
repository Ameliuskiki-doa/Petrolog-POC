import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wrench, Plus, Timer, AlertOctagon, Gauge, Truck } from 'lucide-react'
import {
  Badge, Button, Callout, Card, CardHeader, DataTable, Drawer, FormField, Grid, Input, Mono, PageHeader, ProjectCodeChip, SearchInput, Select, Stat, StatusBadge, Tabs,
  type Column,
} from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, idrShort, num } from '@/lib/format'
import { getUnit, units } from '@/data/core'
import { workOrders, woTotalCost, type WOType, type WorkOrder } from '@/data/supporting'
import { Person, UnitLink } from './shared'

const typeTone: Record<WOType, 'blue' | 'orange' | 'red' | 'violet'> = { Preventive: 'blue', Corrective: 'orange', Breakdown: 'red', Inspection: 'violet' }
const prioTone = { Critical: 'red', High: 'orange', Medium: 'amber', Low: 'slate' } as const

type TabKey = 'open' | 'closed' | 'availability'

export default function WorkOrders() {
  const nav = useNavigate()
  const toast = useToast()
  const [list, setList] = useState<WorkOrder[]>(workOrders)
  const [tab, setTab] = useState<TabKey>('open')
  const [q, setQ] = useState('')
  const [type, setType] = useState('All')
  const [creating, setCreating] = useState(false)

  const open = list.filter((w) => w.status !== 'Closed' && w.status !== 'Completed')
  const closed = list.filter((w) => w.status === 'Closed' || w.status === 'Completed')
  const rows = (tab === 'open' ? open : closed).filter(
    (w) => (type === 'All' || w.type === type) && (!q || `${w.id} ${w.unitId} ${w.title}`.toLowerCase().includes(q.toLowerCase())),
  )
  const downtimeMTD = list.reduce((a, w) => a + (w.opened >= '2028-03-01' || w.status !== 'Closed' ? w.downtimeHrs : 0), 0)
  const unavailable = units.filter((u) => u.status === 'Maintenance' || u.status === 'Breakdown' || open.some((w) => w.unitId === u.id && w.type === 'Inspection' && u.status === 'Idle'))
  const availability = ((units.length - unavailable.length) / units.length) * 100

  const cols: Column<WorkOrder>[] = [
    { key: 'id', header: 'Work order', render: (w) => <div><Mono className="font-medium text-brand-700">{w.id}</Mono><div className="text-xs text-slate-500">Opened {date(w.opened)}</div></div> },
    { key: 'unit', header: 'Unit', render: (w) => <UnitLink id={w.unitId} showType /> },
    { key: 'title', header: 'Description', render: (w) => <div className="max-w-[320px] min-w-[220px] text-sm text-slate-800">{w.title}</div> },
    { key: 'type', header: 'Type', render: (w) => <Badge tone={typeTone[w.type]}>{w.type}</Badge> },
    { key: 'prio', header: 'Priority', render: (w) => <Badge tone={prioTone[w.priority]}>{w.priority}</Badge> },
    { key: 'asg', header: 'Assigned', render: (w) => <Person id={w.assigneeId} /> },
    { key: 'due', header: tab === 'open' ? 'Due' : 'Closed', render: (w) => <span className={tab === 'open' && w.due < '2028-03-10' ? 'text-red-600' : ''}>{date(tab === 'open' ? w.due : w.closed ?? w.due)}</span> },
    { key: 'dt', header: 'Downtime', align: 'right', render: (w) => (w.downtimeHrs ? `${w.downtimeHrs} h` : '—') },
    { key: 'cost', header: 'Cost', align: 'right', render: (w) => idrShort(woTotalCost(w)) },
    { key: 'pc', header: 'Charged to', render: (w) => <ProjectCodeChip code={w.projectCode} /> },
    { key: 'st', header: 'Status', render: (w) => <StatusBadge status={w.status} /> },
  ]

  return (
    <>
      <PageHeader
        module="M15 · Maintenance / EAM · Stage 1A"
        title="Work Orders"
        subtitle="Preventive and corrective maintenance, breakdowns and statutory inspections. Units under an open work order are withdrawn from the planning board automatically (OPS-04)."
        actions={<Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreating(true)}>New work order</Button>}
      />
      <Grid cols={4} className="mb-5">
        <Stat label="Open work orders" value={open.length} sub={`${open.filter((w) => w.type === 'Breakdown').length} breakdown · ${open.filter((w) => w.status.startsWith('Awaiting')).length} awaiting approval / parts`} icon={<Wrench size={16} />} />
        <Stat label="Fleet availability (today)" value={`${availability.toFixed(1)}%`} sub={`${unavailable.length} of ${units.length} units unavailable`} tone={availability < 85 ? 'warn' : 'good'} icon={<Truck size={16} />} />
        <Stat label="Downtime MTD" value={`${num(downtimeMTD)} h`} sub="Breakdown share 38% · target < 25%" tone="warn" icon={<Timer size={16} />} />
        <Stat label="PM compliance (Feb)" value="92.3%" sub="12 of 13 PMs done within tolerance" tone="good" icon={<Gauge size={16} />} to="/maintenance/schedule" />
      </Grid>

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'open', label: 'Open', count: open.length },
          { key: 'closed', label: 'History', count: closed.length },
          { key: 'availability', label: 'Unit availability', count: units.length },
        ]}
      />

      {tab !== 'availability' ? (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search WO, unit, description…" className="w-full sm:w-72" />
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {['All', 'Preventive', 'Corrective', 'Breakdown', 'Inspection'].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </div>
          <Card padded={false}>
            <DataTable columns={cols} rows={rows} rowKey={(w) => w.id} onRowClick={(w) => nav(`/maintenance/work-orders/${w.id}`)} />
          </Card>
        </>
      ) : (
        <>
          <div className="mb-3">
            <Callout tone="blue" title="Feeds the planning board">Availability is published on the outbox as <Mono>unit.availability.changed</Mono>. The planning board (M3) reads it and hides units that are in maintenance, broken down, or blocked by an expired certificate.</Callout>
          </div>
          <Card padded={false}>
            <DataTable
              rows={units}
              rowKey={(u) => u.id}
              dense
              columns={[
                { key: 'u', header: 'Unit', render: (u) => <UnitLink id={u.id} showType /> },
                { key: 'loc', header: 'Location', render: (u) => u.location },
                { key: 'm', header: 'Meter', align: 'right', render: (u) => `${num(u.meter)} ${u.meterUnit}` },
                { key: 'op', header: 'Operating MTD', align: 'right', render: (u) => `${u.hoursMTD.operating} h` },
                { key: 'mt', header: 'Maintenance MTD', align: 'right', render: (u) => `${u.hoursMTD.maintenance} h` },
                { key: 'wo', header: 'Open WO', render: (u) => {
                  const w = open.find((x) => x.unitId === u.id)
                  return w ? <Mono className="text-brand-700">{w.id}</Mono> : <span className="text-slate-300">—</span>
                } },
                { key: 'st', header: 'Status', render: (u) => <StatusBadge status={u.status} /> },
                { key: 'pb', header: 'Planning board', render: (u) => {
                  const certBlocked = u.cert.expiry < '2028-03-10'
                  if (certBlocked) return <Badge tone="red" dot>Blocked — cert expired</Badge>
                  if (u.status === 'Maintenance' || u.status === 'Breakdown') return <Badge tone="amber" dot>Unavailable</Badge>
                  return <Badge tone="green" dot>Available</Badge>
                } },
              ]}
            />
          </Card>
        </>
      )}

      <NewWoDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={(w) => {
          setList((l) => [w, ...l])
          setCreating(false)
          setTab('open')
          toast(`${w.id} created — ${w.unitId} removed from planning board availability`, 'success')
        }}
        nextId={`WO-2028-0${152 + list.length - workOrders.length}`}
      />
    </>
  )
}

function NewWoDrawer({ open, onClose, onCreate, nextId }: { open: boolean; onClose: () => void; onCreate: (w: WorkOrder) => void; nextId: string }) {
  const toast = useToast()
  const [unitId, setUnitId] = useState('DT-06')
  const [type, setType] = useState<WOType>('Corrective')
  const [title, setTitle] = useState('')
  const [prio, setPrio] = useState<WorkOrder['priority']>('Medium')
  const [due, setDue] = useState('2028-03-12')
  const u = getUnit(unitId)
  if (!open) return null
  const submit = () => {
    if (title.trim().length < 5) return toast('Describe the work to be done', 'error')
    onCreate({
      id: nextId, unitId, type, title, status: 'Open', priority: prio, opened: '2028-03-10', due, meterAtOpen: u?.meter ?? 0, assigneeId: 'EMP-0012',
      projectCode: u?.projectCode ?? 'GEN-BPN', downtimeHrs: 0, tasks: [], parts: [], labour: [],
      log: [{ time: '2028-03-10T09:00', text: 'Work order created from web', tone: 'blue' }],
    })
  }
  return (
    <Drawer open onClose={onClose} title="New work order" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Create work order</Button></>}>
      <div className="space-y-4">
        <FormField label="Unit">
          <Select className="w-full" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            {units.map((x) => <option key={x.id} value={x.id}>{x.id} — {x.type} ({x.status})</option>)}
          </Select>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Type">
            <Select className="w-full" value={type} onChange={(e) => setType(e.target.value as WOType)}>
              {['Preventive', 'Corrective', 'Breakdown', 'Inspection'].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </FormField>
          <FormField label="Priority">
            <Select className="w-full" value={prio} onChange={(e) => setPrio(e.target.value as WorkOrder['priority'])}>
              {['Critical', 'High', 'Medium', 'Low'].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Description"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hydraulic leak at boom cylinder" /></FormField>
        <FormField label="Due date"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></FormField>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="text-xs text-slate-500">Meter at open (latest reading)</div>
          <div className="font-medium">{num(u?.meter ?? 0)} {u?.meterUnit}</div>
          <div className="mt-2 text-xs text-slate-500">Cost charged to</div>
          <div className="mt-0.5"><ProjectCodeChip code={u?.projectCode ?? 'GEN-BPN'} showName /></div>
          <p className="mt-2 text-xs text-slate-500">Units committed to a project charge maintenance to that project; idle units charge the workshop overhead code GEN-BPN.</p>
        </div>
      </div>
    </Drawer>
  )
}

export function WoCostCard({ w }: { w: WorkOrder }) {
  return (
    <Card>
      <CardHeader title="Cost summary" />
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Parts</span><span className="num">{idrShort(w.parts.reduce((a, p) => a + p.qty * p.unitCost, 0))}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Labour</span><span className="num">{idrShort(w.labour.reduce((a, l) => a + l.hrs * l.rate, 0))}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">External services</span><span className="num">{idrShort(w.external?.amount ?? 0)}</span></div>
        <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold"><span>Total</span><span className="num">{idrShort(woTotalCost(w))}</span></div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><AlertOctagon size={13} /> Posted to <ProjectCodeChip code={w.projectCode} /></div>
    </Card>
  )
}
