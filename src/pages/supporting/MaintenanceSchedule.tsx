import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, List, Wand2, AlertTriangle, CalendarClock, History } from 'lucide-react'
import { Badge, Button, Card, CardHeader, DataTable, Grid, Mono, PageHeader, Progress, Select, Stat, Tabs, cx } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, idrShort, num } from '@/lib/format'
import { getUnit } from '@/data/core'
import { pmDue, pmPlans, workOrders, woTotalCost, type PmPlan } from '@/data/supporting'
import { UnitLink } from './shared'

type TabKey = 'due' | 'calendar' | 'plans' | 'history'

const basisLabel = (p: PmPlan) => (p.basis === 'days' ? `every ${p.interval} days` : `every ${num(p.interval)} ${p.basis}`)

export default function MaintenanceSchedule() {
  const toast = useToast()
  const nav = useNavigate()
  const [tab, setTab] = useState<TabKey>('due')
  const [basis, setBasis] = useState('All')
  const [generated, setGenerated] = useState<string[]>([])

  const rows = pmPlans
    .map((p) => ({ ...p, due: pmDue(p) }))
    .filter((p) => basis === 'All' || p.basis === basis)
    .sort((a, b) => a.due.dueDate.localeCompare(b.due.dueDate))
  const overdue = rows.filter((r) => r.due.status === 'Overdue')
  const soon = rows.filter((r) => r.due.status === 'Due soon')
  const history = workOrders.filter((w) => w.status === 'Closed')

  const generate = (ids: string[]) => {
    setGenerated((g) => [...g, ...ids])
    toast(`${ids.length} preventive work order${ids.length > 1 ? 's' : ''} generated and slotted into planning-board gaps`, 'success')
  }

  // Calendar — March 2028 (1 Mar is a Wednesday)
  const firstDow = new Date('2028-03-01T00:00:00').getDay()
  const offset = (firstDow + 6) % 7
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: 31 }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  const events = (day: number) => {
    const iso = `2028-03-${String(day).padStart(2, '0')}`
    const pm = rows.filter((r) => r.due.dueDate === iso || (r.due.status === 'Overdue' && day === 10))
    const wo = workOrders.filter((w) => w.due === iso && w.status !== 'Closed')
    return { pm, wo }
  }

  return (
    <>
      <PageHeader
        module="M15 · Maintenance / EAM · Stage 1A"
        title="Maintenance Schedule"
        subtitle="Calendar- and meter-based preventive maintenance. Meter readings from telematics and the mobile P2H check drive due dates; work orders are generated at 90% of interval."
        actions={<Button variant="primary" icon={<Wand2 size={15} />} disabled={[...overdue, ...soon].every((r) => generated.includes(r.id))} onClick={() => generate([...overdue, ...soon].filter((r) => !generated.includes(r.id)).map((r) => r.id))}>Generate due work orders</Button>}
      />
      <Grid cols={4} className="mb-5">
        <Stat label="PM plans active" value={pmPlans.length} sub="250 / 500 / 1000 hr · 10k / 15k km · 90 days" icon={<CalendarDays size={16} />} />
        <Stat label="Overdue" value={overdue.length} sub={overdue.map((o) => o.unitId).join(', ') || 'None'} tone={overdue.length ? 'bad' : 'good'} icon={<AlertTriangle size={16} />} />
        <Stat label="Due within 10% of interval" value={soon.length} sub="Next 14 days" tone="warn" icon={<CalendarClock size={16} />} />
        <Stat label="Completed PMs (last 30 d)" value={history.filter((h) => h.type === 'Preventive').length + 9} sub="MTBF fleet 212 h · MTTR 7.4 h" icon={<History size={16} />} />
      </Grid>

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'due', label: 'Due & overdue', count: overdue.length + soon.length },
          { key: 'calendar', label: <span className="flex items-center gap-1"><CalendarDays size={14} /> Calendar</span> },
          { key: 'plans', label: <span className="flex items-center gap-1"><List size={14} /> All PM plans</span>, count: pmPlans.length },
          { key: 'history', label: 'Maintenance history', count: history.length },
        ]}
      />

      {(tab === 'due' || tab === 'plans') && (
        <>
          <div className="mb-3">
            <Select value={basis} onChange={(e) => setBasis(e.target.value)}>
              <option value="All">All bases</option>
              <option value="hrs">Hour meter</option>
              <option value="km">Odometer</option>
              <option value="days">Calendar</option>
            </Select>
          </div>
          <Card padded={false}>
            <DataTable
              rows={tab === 'due' ? [...overdue, ...soon] : rows}
              rowKey={(r) => r.id}
              empty="No PM due — all plans within interval"
              columns={[
                { key: 'unit', header: 'Unit', render: (r) => <UnitLink id={r.unitId} showType /> },
                { key: 'plan', header: 'PM plan', render: (r) => <div><div className="text-sm font-medium">{r.name}</div><div className="text-xs text-slate-500"><Mono>{r.id}</Mono> · {basisLabel(r)}</div></div> },
                { key: 'last', header: 'Last done', render: (r) => <div className="text-sm">{date(r.lastDate)}{r.basis !== 'days' && <div className="text-xs text-slate-500">at {num(r.lastMeter)} {r.basis}</div>}</div> },
                { key: 'cur', header: 'Current meter', align: 'right', render: (r) => (r.basis === 'days' ? '—' : `${num(getUnit(r.unitId)?.meter ?? 0)} ${r.basis}`) },
                { key: 'prog', header: 'Interval used', render: (r) => {
                  const used = r.interval - r.due.remaining
                  const p = (used / r.interval) * 100
                  return <div className="w-32"><Progress value={p} tone={p >= 100 ? 'red' : p >= 90 ? 'amber' : 'green'} /><div className="mt-0.5 text-[11px] text-slate-500">{p.toFixed(0)}%</div></div>
                } },
                { key: 'rem', header: 'Remaining', align: 'right', render: (r) => <span className={r.due.remaining < 0 ? 'font-semibold text-red-600' : ''}>{num(r.due.remaining)} {r.basis}</span> },
                { key: 'dd', header: 'Projected due', render: (r) => date(r.due.dueDate) },
                { key: 'st', header: 'Status', render: (r) => <Badge dot tone={r.due.status === 'Overdue' ? 'red' : r.due.status === 'Due soon' ? 'amber' : 'green'}>{r.due.status}</Badge> },
                { key: 'act', header: '', render: (r) => {
                  const wo = workOrders.find((w) => w.pmPlan === r.id && w.status !== 'Closed')
                  if (wo) return <Link to={`/maintenance/work-orders/${wo.id}`} className="font-mono text-[12px] text-brand-700 hover:underline">{wo.id}</Link>
                  if (generated.includes(r.id)) return <Badge tone="green">WO generated</Badge>
                  return r.due.status !== 'Scheduled' ? <Button size="sm" onClick={() => generate([r.id])}>Create WO</Button> : null
                } },
              ]}
            />
          </Card>
        </>
      )}

      {tab === 'calendar' && (
        <Card>
          <CardHeader title="March 2028" subtitle="PM due dates projected from average daily usage; open work orders by due date" />
          <div className="scrollbar-thin overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-xs">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="bg-slate-50 px-2 py-1.5 font-semibold text-slate-500">{d}</div>)}
              {cells.map((d, i) => {
                const ev = d ? events(d) : { pm: [], wo: [] }
                return (
                  <div key={i} className={cx('min-h-[92px] bg-white p-1.5', !d && 'bg-slate-50', d === 10 && 'ring-2 ring-brand-400 ring-inset')}>
                    {d && <div className={cx('mb-1 text-[11px] font-semibold', d === 10 ? 'text-brand-700' : 'text-slate-400')}>{d}{d === 10 && ' · today'}</div>}
                    <div className="space-y-1">
                      {ev.wo.map((w) => (
                        <button key={w.id} onClick={() => nav(`/maintenance/work-orders/${w.id}`)} className={cx('block w-full truncate rounded px-1 py-0.5 text-left', w.type === 'Breakdown' ? 'bg-red-50 text-red-700' : w.type === 'Inspection' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700')}>
                          {w.unitId} · {w.type}
                        </button>
                      ))}
                      {ev.pm.map((p) => (
                        <div key={p.id} className={cx('truncate rounded px-1 py-0.5', p.due.status === 'Overdue' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800')} title={p.name}>
                          {p.unitId} · {p.basis === 'days' ? `${p.interval}d` : `${num(p.interval)}${p.basis === 'hrs' ? 'h' : 'km'}`}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-100" /> PM due</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-100" /> Overdue / breakdown</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-100" /> Open work order</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-violet-100" /> Statutory inspection</span>
          </div>
        </Card>
      )}

      {tab === 'history' && (
        <Card padded={false}>
          <DataTable
            rows={history}
            rowKey={(h) => h.id}
            onRowClick={(h) => nav(`/maintenance/work-orders/${h.id}`)}
            columns={[
              { key: 'id', header: 'WO', render: (h) => <Mono className="text-brand-700">{h.id}</Mono> },
              { key: 'u', header: 'Unit', render: (h) => <UnitLink id={h.unitId} showType /> },
              { key: 't', header: 'Work done', render: (h) => h.title },
              { key: 'ty', header: 'Type', render: (h) => h.type },
              { key: 'c', header: 'Closed', render: (h) => date(h.closed ?? h.due) },
              { key: 'm', header: 'Meter', align: 'right', render: (h) => num(h.meterAtOpen) },
              { key: 'd', header: 'Downtime', align: 'right', render: (h) => `${h.downtimeHrs} h` },
              { key: 'cost', header: 'Cost', align: 'right', render: (h) => idrShort(woTotalCost(h)) },
            ]}
          />
        </Card>
      )}
    </>
  )
}
