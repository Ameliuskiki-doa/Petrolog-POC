import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BadgeCheck, Fuel, Landmark, Wrench } from 'lucide-react'
import { Badge, Callout, Card, CardHeader, DataTable, DescList, Grid, PageHeader, ProjectCodeChip, Stat, StatusBadge, type Column } from '@/components/ui'
import { getUnit } from '@/data/core'
import { certState, deviceStatus, fuelEntries, fuelRatios, getUnitOps, ratioStats, unitBlock } from '@/data/operations'
import { date, dateTime, daysUntil, idr, num, pct } from '@/lib/format'
import { axisProps, ChartTooltip, GRID, Legend } from '@/lib/chart'
import { useJobs, type JobState } from './store'
import { FLEET_MODULE, jobValueLabel, UTIL_COLORS } from './shared'
import NotFound from '@/pages/NotFound'

export default function UnitDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const jobs = useJobs()
  const u = getUnit(id)
  const ops = getUnitOps(id)
  if (!u || !ops) return <NotFound />

  const cs = certState(u)
  const block = unitBlock(u)
  const h = u.hoursMTD
  const t = h.operating + h.idle + h.maintenance
  const ratio = fuelRatios.find((r) => r.unitId === u.id)
  const rs = ratio && ratioStats(ratio)
  const unitJobs = jobs.filter((j) => j.unitIds.includes(u.id)).sort((a, b) => b.date.localeCompare(a.date))
  const current = jobs.find((j) => j.id === ops.currentJobId)
  const fuel = fuelEntries.filter((f) => f.unitId === u.id)
  const dev = deviceStatus.find((d) => d.unitId === u.id)
  const age = 2028 - u.year
  const annualDep = (u.acquisitionValue * 0.9) / ops.usefulLifeYears
  const nbv = Math.max(u.acquisitionValue * 0.1, u.acquisitionValue - annualDep * (age + 0.2))
  const certKind = u.cert.number.split('/')[0]

  const jobCols: Column<JobState>[] = [
    { key: 'id', header: 'Job', render: (j) => <span className="font-mono text-[12px]">{j.id}</span> },
    { key: 't', header: 'Description', render: (j) => j.title },
    { key: 'pc', header: 'Project code', render: (j) => <ProjectCodeChip code={j.projectCode} /> },
    { key: 'd', header: 'Date', render: (j) => date(j.date) },
    { key: 'v', header: 'Value', align: 'right', render: (j) => jobValueLabel(j) },
    { key: 's', header: 'Status', render: (j) => <StatusBadge status={j.status} /> },
  ]

  return (
    <>
      <PageHeader
        module={FLEET_MODULE}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {u.id} · {u.type} <StatusBadge status={u.status} />
          </span>
        }
        subtitle={`${u.make} · ${u.year}${u.plate ? ` · ${u.plate}` : ''} · ${u.location}`}
        crumbs={[{ label: 'Operations' }, { label: 'Fleet', to: '/fleet/units' }, { label: u.id }]}
      />

      {block && (
        <div className="mb-4">
          <Callout tone={cs === 'Expired' || u.status === 'Breakdown' ? 'red' : 'amber'} icon={<AlertTriangle size={16} />} title="Not assignable on the planning board">
            {block}
          </Callout>
        </div>
      )}

      <Grid cols={4} className="mb-4">
        <Stat label="Utilisation (MTD)" value={pct(t ? (h.operating / t) * 100 : 0, 0)} sub={`${h.operating} operating of ${t} recorded h`} />
        <Stat
          label={`Fuel ratio (${ratio?.basis ?? ops.fuelBasis})`}
          value={rs ? num(rs.actual, 2) : '—'}
          sub={rs ? `baseline ${ratio!.baseline} · consumption ${rs.consumptionDev >= 0 ? '+' : ''}${pct(rs.consumptionDev, 1)}` : 'No ratio this period'}
          tone={rs && rs.consumptionDev > 10 ? 'bad' : rs ? 'good' : undefined}
          icon={<Fuel size={16} />}
          to="/fleet/fuel"
        />
        <Stat label={`${certKind} certificate`} value={cs} sub={`${u.cert.number} · ${daysUntil(u.cert.expiry) >= 0 ? `${daysUntil(u.cert.expiry)} days left` : `expired ${-daysUntil(u.cert.expiry)} days ago`}`} tone={cs === 'Valid' ? 'good' : cs === 'Expiring' ? 'warn' : 'bad'} icon={<BadgeCheck size={16} />} to="/maintenance/certifications" />
        <Stat label="Maintenance status" value={ops.openWorkOrder ? 'Open WO' : 'No open WO'} sub={ops.openWorkOrder ? `${ops.openWorkOrder.id} · ETA ${date(ops.openWorkOrder.eta)}` : 'Next PM per M15 schedule'} tone={ops.openWorkOrder ? 'warn' : 'good'} icon={<Wrench size={16} />} to={ops.openWorkOrder ? `/maintenance/work-orders/${ops.openWorkOrder.id}` : '/maintenance/schedule'} />
      </Grid>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Utilisation trend — operating / idle / maintenance hours" subtitle="Monthly hours by category; March is month-to-date (10 days)" />
            <Legend items={[{ label: 'Operating', color: UTIL_COLORS.operating }, { label: 'Idle', color: UTIL_COLORS.idle }, { label: 'Maintenance', color: UTIL_COLORS.maintenance }]} />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ops.utilTrend} margin={{ left: 0, right: 8, top: 4 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} width={40} />
                <Tooltip content={<ChartTooltip format={(v) => `${num(v)} h`} />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="operating" name="Operating" stackId="h" fill={UTIL_COLORS.operating} />
                <Bar dataKey="idle" name="Idle" stackId="h" fill={UTIL_COLORS.idle} />
                <Bar dataKey="maintenance" name="Maintenance" stackId="h" fill={UTIL_COLORS.maintenance} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card padded={false}>
            <div className="px-4 pt-4">
              <CardHeader title="Job history" subtitle="Jobs this unit was assigned to" />
            </div>
            <DataTable dense columns={jobCols} rows={unitJobs} rowKey={(j) => j.id} onRowClick={(j) => nav(`/ops/jobs/${j.id}`)} empty="No jobs on record" />
          </Card>

          <Card padded={false}>
            <div className="px-4 pt-4">
              <CardHeader title="Fuel entries" actions={<Link to="/fleet/fuel" className="text-xs text-brand-700 hover:underline">Fuel monitoring →</Link>} />
            </div>
            <DataTable
              dense
              columns={[
                { key: 't', header: 'Time', render: (f) => dateTime(f.time) },
                { key: 'c', header: 'Channel', render: (f) => f.channel },
                { key: 'pc', header: 'Project code', render: (f) => <ProjectCodeChip code={f.projectCode} /> },
                { key: 'l', header: 'Litres', align: 'right', render: (f) => num(f.litres, 1) },
                { key: 'm', header: 'Meter', align: 'right', render: (f) => num(f.meter) },
                { key: 's', header: 'Status', render: (f) => <Badge tone={f.status === 'Accepted' ? 'green' : f.status === 'Pending review' ? 'amber' : 'slate'}>{f.status}</Badge> },
              ]}
              rows={fuel}
              rowKey={(f) => f.id}
              empty="No fuel entries this period"
            />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Current assignment" />
            {current ? (
              <Link to={`/ops/jobs/${current.id}`} className="block rounded-lg border border-slate-200 p-3 hover:border-brand-300">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold">{current.id}</span>
                  <StatusBadge status={current.status} />
                </div>
                <div className="mt-1 text-sm text-slate-800">{current.title}</div>
                <div className="mt-1.5">
                  <ProjectCodeChip code={current.projectCode} showName />
                </div>
              </Link>
            ) : (
              <div className="text-sm text-slate-500">No active job today.</div>
            )}
            {u.projectCode && (
              <div className="mt-3 text-xs text-slate-500">
                Allocated project code: <ProjectCodeChip code={u.projectCode} />
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Unit master" />
            <DescList
              cols={2}
              items={[
                { label: 'Category', value: u.category },
                { label: 'Year', value: u.year },
                { label: 'Meter', value: `${num(u.meter)} ${u.meterUnit}` },
                { label: 'Fuel basis', value: ops.fuelBasis },
                { label: `${certKind} no.`, value: <span className="font-mono text-xs">{u.cert.number}</span> },
                { label: 'Expiry', value: <Badge tone={cs === 'Valid' ? 'green' : cs === 'Expiring' ? 'amber' : 'red'}>{date(u.cert.expiry)}</Badge> },
              ]}
            />
            <Link to="/maintenance/certifications" className="mt-3 inline-block text-xs text-brand-700 hover:underline">
              Open certification registry →
            </Link>
          </Card>

          <Card>
            <CardHeader title={<span className="flex items-center gap-1.5"><Landmark size={14} /> Depreciation basis</span>} />
            <DescList
              cols={2}
              items={[
                { label: 'Acquisition value', value: idr(u.acquisitionValue) },
                { label: 'Useful life', value: `${ops.usefulLifeYears} years` },
                { label: 'Annual depreciation', value: idr(annualDep) },
                { label: 'Est. net book value', value: idr(nbv) },
              ]}
            />
            <p className="mt-3 text-xs leading-relaxed text-slate-500">{ops.depreciationBasis}</p>
            <Link to="/finance/assets" className="mt-2 inline-block text-xs text-brand-700 hover:underline">
              Fixed asset register →
            </Link>
          </Card>

          {dev && (
            <Card>
              <CardHeader title="Telematics devices" subtitle={dev.adapter} />
              <div className="space-y-1.5 text-sm">
                {(
                  [
                    ['GPS', dev.gps],
                    ['Dashcam', dev.dashcam],
                    ['Fuel stick', dev.fuelStick],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-slate-600">{k}</span>
                    {v === 'n/a' ? <span className="text-xs text-slate-400">not fitted</span> : <Badge tone={v === 'Online' ? 'green' : v === 'Delayed' ? 'amber' : 'red'} dot>{v}</Badge>}
                  </div>
                ))}
                <div className="pt-1 text-[11px] text-slate-400">Last ping {dateTime(dev.lastPing)}</div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
