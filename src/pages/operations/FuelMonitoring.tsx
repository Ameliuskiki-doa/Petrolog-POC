import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, CopyCheck, CreditCard, Gauge, PenLine, Save } from 'lucide-react'
import { Badge, Button, Callout, Card, CardHeader, DataTable, Grid, Input, PageHeader, ProjectCodeChip, Stat, Tabs, cx, type Column } from '@/components/ui'
import { getUnit } from '@/data/core'
import { fuelAnomalies, fuelEntries, fuelRatios, fuelThresholds, personName, ratioStats, type FuelAnomaly, type FuelChannel, type FuelEntry, type FuelRatio } from '@/data/operations'
import { dateTime, num, pct } from '@/lib/format'
import { axisProps, ChartTooltip, GRID, NEUTRAL, STATUS } from '@/lib/chart'
import { useToast } from '@/lib/app-state'
import { Chip, FLEET_MODULE, JobLink, UnitLink } from './shared'

type TabKey = 'entries' | 'ratios' | 'anomalies' | 'thresholds'
const channelIcon: Record<FuelChannel, typeof CreditCard> = { Manual: PenLine, 'Fuel card': CreditCard, 'GPS fuel stick': Gauge }

export default function FuelMonitoring() {
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('entries')
  const [channel, setChannel] = useState<FuelChannel | 'All'>('All')
  const [entries, setEntries] = useState<FuelEntry[]>(fuelEntries)
  const [anoms, setAnoms] = useState<FuelAnomaly[]>(fuelAnomalies)
  const [thr, setThr] = useState(fuelThresholds)

  const tolFor = (unitId: string) => thr.find((t) => t.category === getUnit(unitId)?.category)?.tolerance ?? 10
  const accepted = entries.filter((e) => e.status === 'Accepted')
  const dupes = entries.filter((e) => e.status === 'Duplicate — merged')
  const pending = entries.filter((e) => e.status === 'Pending review')
  const openAnoms = anoms.filter((a) => a.status === 'Open' || a.status === 'Investigating')

  const devData = fuelRatios.map((r) => ({ unit: r.unitId, dev: Number(ratioStats(r).consumptionDev.toFixed(1)), tol: tolFor(r.unitId) }))

  const resolvePending = (keep: FuelEntry) => {
    setEntries((es) => es.map((e) => (e.id === keep.id ? { ...e, status: 'Accepted' } : pending.some((p) => p.id === e.id) && e.unitId === keep.unitId ? { ...e, status: 'Duplicate — merged', duplicateOf: keep.id } : e)))
    toast(`${keep.id} accepted (${num(keep.litres, 1)} L from ${keep.channel}); conflicting entry merged as duplicate`, 'success')
  }

  const entryCols: Column<FuelEntry>[] = [
    { key: 'id', header: 'Entry', render: (e) => <span className="font-mono text-[12px]">{e.id}</span> },
    { key: 't', header: 'Time', render: (e) => <span className="whitespace-nowrap">{dateTime(e.time)}</span> },
    { key: 'u', header: 'Unit', render: (e) => <UnitLink id={e.unitId} /> },
    { key: 'j', header: 'Job', render: (e) => (e.jobId ? <JobLink id={e.jobId} /> : <span className="text-xs text-slate-400">—</span>) },
    { key: 'pc', header: 'Project code', render: (e) => <ProjectCodeChip code={e.projectCode} /> },
    {
      key: 'ch',
      header: 'Channel',
      render: (e) => {
        const I = channelIcon[e.channel]
        return (
          <span className="flex items-center gap-1.5 whitespace-nowrap text-slate-600">
            <I size={13} /> {e.channel}
            {e.by && <span className="text-[11px] text-slate-400">· {personName(e.by)}</span>}
          </span>
        )
      },
    },
    { key: 'l', header: 'Litres', align: 'right', render: (e) => num(e.litres, 1) },
    { key: 'm', header: 'Meter', align: 'right', render: (e) => num(e.meter) },
    { key: 'loc', header: 'Location', render: (e) => <span className="text-xs text-slate-500">{e.location}</span> },
    {
      key: 's',
      header: 'Status',
      render: (e) =>
        e.status === 'Duplicate — merged' ? (
          <span className="text-xs text-slate-500">
            <Badge tone="slate">Duplicate</Badge> of <span className="font-mono">{e.duplicateOf}</span>
          </span>
        ) : e.status === 'Pending review' ? (
          <Button size="sm" onClick={() => resolvePending(e)}>
            Accept this
          </Button>
        ) : (
          <Badge tone="green">Accepted</Badge>
        ),
    },
  ]

  const ratioCols: Column<FuelRatio>[] = [
    { key: 'u', header: 'Unit', render: (r) => <UnitLink id={r.unitId} /> },
    { key: 'cat', header: 'Type', render: (r) => <span className="text-slate-600">{getUnit(r.unitId)?.category}</span> },
    { key: 'j', header: 'Job', render: (r) => (r.jobId ? <JobLink id={r.jobId} /> : <span className="text-xs text-slate-400">Period</span>) },
    { key: 'pc', header: 'Project code', render: (r) => <ProjectCodeChip code={r.projectCode} /> },
    { key: 'd', header: 'Km / hours', align: 'right', render: (r) => `${num(r.distanceOrHours, r.basis === 'L/hr' ? 1 : 0)} ${r.basis === 'km/L' ? 'km' : 'h'}` },
    { key: 'l', header: 'Litres', align: 'right', render: (r) => num(r.litres) },
    { key: 'a', header: 'Ratio', align: 'right', render: (r) => `${num(ratioStats(r).actual, 2)} ${r.basis}` },
    { key: 'b', header: 'Baseline', align: 'right', render: (r) => num(r.baseline, 2) },
    {
      key: 'dev',
      header: 'Consumption vs baseline',
      align: 'right',
      render: (r) => {
        const d = ratioStats(r).consumptionDev
        const over = d > tolFor(r.unitId)
        return <span className={cx('font-medium', over ? 'text-red-600' : d > 0 ? 'text-slate-700' : 'text-emerald-600')}>{d >= 0 ? '+' : ''}{pct(d, 1)}</span>
      },
    },
  ]

  const setAnom = (id: string, status: FuelAnomaly['status']) => {
    setAnoms((a) => a.map((x) => (x.id === id ? { ...x, status } : x)))
    toast(`${id} → ${status}`, status.startsWith('Closed') ? 'success' : 'info')
  }

  return (
    <>
      <PageHeader
        module={FLEET_MODULE}
        title="Fuel Monitoring"
        subtitle="Fuel captured through three channels — manual entry, fuel card and GPS-linked fuel stick — with duplicate handling across sources. Ratios use odometer / hour-meter data from M15; deviations beyond the unit-type threshold raise an investigation."
        crumbs={[{ label: 'Operations' }, { label: 'Fuel Monitoring' }]}
        actions={<Link to="/costing/fuel-actualisation"><Button>Fuel actualisation (M7)</Button></Link>}
      />
      <Grid cols={4} className="mb-4">
        <Stat label="Litres accepted (8–10 Mar)" value={num(accepted.reduce((a, e) => a + e.litres, 0))} sub={`${accepted.length} entries across ${new Set(accepted.map((e) => e.unitId)).size} units`} />
        <Stat label="Duplicates merged" value={dupes.length} sub="Fuel card ↔ fuel stick matched on unit, time ±10 min & meter" icon={<CopyCheck size={16} />} />
        <Stat label="Conflicting entries" value={pending.length} sub={pending.length ? 'Channels disagree — choose the valid reading' : 'None'} tone={pending.length ? 'warn' : 'good'} />
        <Stat label="Open anomalies" value={openAnoms.length} sub={openAnoms.map((a) => `${a.unitId} +${a.deviation}%`).join(' · ')} tone={openAnoms.length ? 'bad' : 'good'} />
      </Grid>

      {openAnoms.some((a) => a.unitId === 'DT-03') && (
        <div className="mb-4">
          <Callout tone="red" icon={<AlertTriangle size={16} />} title="DT-03 consuming 18% above baseline (threshold 10% for dump trucks)">
            Same route, payload and shift pattern as DT-01/DT-02. Two conflicting readings on 10 Mar (fuel stick 238 L vs manual 150 L). Investigation assigned to {personName('EMP-0007')}.{' '}
            <button className="font-medium underline" onClick={() => setTab('anomalies')}>
              Open investigation queue
            </button>
          </Callout>
        </div>
      )}

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'entries', label: 'Fuel entries', count: entries.length },
          { key: 'ratios', label: 'Consumption ratios', count: fuelRatios.length },
          { key: 'anomalies', label: 'Investigation queue', count: openAnoms.length },
          { key: 'thresholds', label: 'Thresholds by unit type' },
        ]}
      />

      {tab === 'entries' && (
        <Card padded={false}>
          <div className="scrollbar-thin flex gap-1.5 overflow-x-auto border-b border-slate-200 p-3">
            {(['All', 'Manual', 'Fuel card', 'GPS fuel stick'] as const).map((c) => (
              <Chip key={c} active={channel === c} onClick={() => setChannel(c)} count={c === 'All' ? entries.length : entries.filter((e) => e.channel === c).length}>
                {c}
              </Chip>
            ))}
          </div>
          <DataTable
            dense
            columns={entryCols}
            rows={entries.filter((e) => channel === 'All' || e.channel === channel)}
            rowKey={(e) => e.id}
            rowClassName={(e) => (e.status === 'Duplicate — merged' ? 'text-slate-400 bg-slate-50/60' : e.status === 'Pending review' ? 'bg-amber-50/50' : undefined)}
          />
        </Card>
      )}

      {tab === 'ratios' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Fuel consumption vs baseline by unit" subtitle="Positive = burning more fuel than the unit-type baseline. Red bars exceed the threshold." />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={devData} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="unit" {...axisProps} interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis {...axisProps} width={40} unit="%" />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <ReferenceLine y={10} stroke={STATUS.bad} strokeDasharray="4 3" label={{ value: 'DT threshold 10%', fontSize: 10, fill: STATUS.bad, position: 'insideTopRight' }} />
                <Tooltip content={<ChartTooltip format={(v) => `${v > 0 ? '+' : ''}${v}%`} />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="dev" name="Consumption vs baseline" radius={[4, 4, 0, 0]}>
                  {devData.map((d) => (
                    <Cell key={d.unit} fill={d.dev > d.tol ? STATUS.bad : NEUTRAL} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card padded={false}>
            <DataTable dense columns={ratioCols} rows={fuelRatios} rowKey={(r) => r.unitId + (r.jobId ?? '')} />
          </Card>
        </div>
      )}

      {tab === 'anomalies' && (
        <div className="grid gap-3 lg:grid-cols-2">
          {anoms.map((a) => (
            <Card key={a.id} className={cx(a.status === 'Open' && 'border-red-300 ring-1 ring-red-200')}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold">{a.id}</span>
                    <Badge tone={a.status === 'Open' ? 'red' : a.status === 'Investigating' ? 'amber' : 'slate'}>{a.status}</Badge>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    <UnitLink id={a.unitId} className="text-sm" /> · {getUnit(a.unitId)?.type}
                  </div>
                </div>
                <div className="text-right">
                  <div className={cx('num text-xl font-semibold', a.deviation > a.threshold ? 'text-red-600' : 'text-slate-700')}>
                    {a.deviation > 0 ? '+' : ''}
                    {a.deviation}%
                  </div>
                  <div className="text-[11px] text-slate-500">threshold {a.threshold}%</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {a.metric} · detected {dateTime(a.detected)} · assignee {personName(a.assignee)}
              </div>
              <p className="mt-2 text-sm text-slate-700">{a.note}</p>
              {(a.status === 'Open' || a.status === 'Investigating') && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.status === 'Open' && (
                    <Button size="sm" onClick={() => setAnom(a.id, 'Investigating')}>
                      Start investigation
                    </Button>
                  )}
                  <Button size="sm" variant="success" onClick={() => setAnom(a.id, 'Closed — explained')}>
                    Close — explained
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setAnom(a.id, 'Closed — loss confirmed')}>
                    Confirm fuel loss
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {tab === 'thresholds' && (
        <Card>
          <CardHeader
            title="Anomaly thresholds per unit type"
            subtitle="Configurable without development. A deviation above tolerance on the 7-day rolling ratio or on a single job raises an investigation."
            actions={
              <Button size="sm" variant="primary" icon={<Save size={14} />} onClick={() => toast('Fuel thresholds saved — effective from next evaluation run (21:00)')}>
                Save
              </Button>
            }
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="px-3 py-2">Unit type</th>
                  <th className="px-3 py-2">Basis</th>
                  <th className="px-3 py-2 text-right">Baseline</th>
                  <th className="px-3 py-2 text-right">Tolerance %</th>
                </tr>
              </thead>
              <tbody>
                {thr.map((t, i) => (
                  <tr key={t.category} className="border-b border-slate-100">
                    <td className="px-3 py-1.5">{t.category}</td>
                    <td className="px-3 py-1.5 text-slate-600">{t.basis}</td>
                    <td className="num px-3 py-1.5 text-right">{t.baseline}</td>
                    <td className="px-3 py-1.5 text-right">
                      <Input type="number" className="ml-auto w-20 text-right" value={t.tolerance} onChange={(e) => setThr(thr.map((x, j) => (j === i ? { ...x, tolerance: Number(e.target.value) } : x)))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}
