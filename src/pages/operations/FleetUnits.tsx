import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Card, CardHeader, DataTable, Grid, PageHeader, ProjectCodeChip, SearchInput, Select, Stat, StatusBadge, type Column } from '@/components/ui'
import { units, type Unit, type UnitStatus } from '@/data/core'
import { certState } from '@/data/operations'
import { date, idrShort, num, pct } from '@/lib/format'
import { axisProps, ChartTooltip, GRID, Legend } from '@/lib/chart'
import { Chip, FLEET_MODULE, UTIL_COLORS, UtilBar } from './shared'

const util = (u: Unit) => {
  const t = u.hoursMTD.operating + u.hoursMTD.idle + u.hoursMTD.maintenance
  return t ? (u.hoursMTD.operating / t) * 100 : 0
}

export default function FleetUnits() {
  const nav = useNavigate()
  const [status, setStatus] = useState<UnitStatus | 'All'>('All')
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')

  const rows = units
    .filter((u) => status === 'All' || u.status === status)
    .filter((u) => !cat || u.category === cat)
    .filter((u) => !q || `${u.id} ${u.type} ${u.make} ${u.plate ?? ''} ${u.location} ${u.projectCode ?? ''}`.toLowerCase().includes(q.toLowerCase()))

  const tot = units.reduce((a, u) => ({ operating: a.operating + u.hoursMTD.operating, idle: a.idle + u.hoursMTD.idle, maintenance: a.maintenance + u.hoursMTD.maintenance }), { operating: 0, idle: 0, maintenance: 0 })
  const fleetUtil = (tot.operating / (tot.operating + tot.idle + tot.maintenance)) * 100
  const cats = [...new Set(units.map((u) => u.category))]
  const byCat = cats.map((c) => {
    const us = units.filter((u) => u.category === c)
    return { cat: c, operating: us.reduce((a, u) => a + u.hoursMTD.operating, 0), idle: us.reduce((a, u) => a + u.hoursMTD.idle, 0), maintenance: us.reduce((a, u) => a + u.hoursMTD.maintenance, 0) }
  })
  const certIssues = units.filter((u) => certState(u) !== 'Valid')

  const cols: Column<Unit>[] = [
    {
      key: 'id',
      header: 'Unit',
      render: (u) => (
        <div>
          <div className="font-mono text-[12px] font-semibold text-slate-800">{u.id}</div>
          <div className="text-[11px] text-slate-500">{u.plate ?? u.category}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type / make',
      render: (u) => (
        <div className="min-w-40">
          <div className="text-slate-800">{u.type}</div>
          <div className="text-[11px] text-slate-500">
            {u.make} · {u.year}
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status} /> },
    { key: 'loc', header: 'Location', render: (u) => <span className="whitespace-nowrap text-slate-600">{u.location}</span> },
    { key: 'pc', header: 'Project code', render: (u) => (u.projectCode ? <ProjectCodeChip code={u.projectCode} /> : <span className="text-xs text-slate-400">Unallocated</span>) },
    { key: 'hrs', header: 'Op / idle / maint. (MTD)', render: (u) => (
      <div className="w-40">
        <UtilBar h={u.hoursMTD} />
        <div className="num mt-1 text-[11px] text-slate-500">
          {u.hoursMTD.operating} / {u.hoursMTD.idle} / {u.hoursMTD.maintenance} h
        </div>
      </div>
    ) },
    { key: 'util', header: 'Utilisation', align: 'right', render: (u) => pct(util(u), 0) },
    { key: 'meter', header: 'Meter', align: 'right', render: (u) => `${num(u.meter)} ${u.meterUnit}` },
    {
      key: 'cert',
      header: 'SILO / KIR',
      render: (u) => {
        const s = certState(u)
        return <Badge tone={s === 'Valid' ? 'green' : s === 'Expiring' ? 'amber' : 'red'}>{s === 'Valid' ? date(u.cert.expiry) : `${s} ${date(u.cert.expiry)}`}</Badge>
      },
    },
  ]

  return (
    <>
      <PageHeader
        module={FLEET_MODULE}
        title="Fleet & Utilisation"
        subtitle="Unit master data and utilisation. Operating, idle and maintenance hours are held as three distinct categories (OPS-19); hour meters are shared with M15 maintenance."
        crumbs={[{ label: 'Operations' }, { label: 'Fleet' }]}
      />
      <Grid cols={5} className="mb-4">
        <Stat label="Units" value={units.length} sub={`${units.filter((u) => u.status === 'Operating').length} operating · ${units.filter((u) => u.status === 'Idle').length} idle`} />
        <Stat label="Fleet utilisation (MTD)" value={pct(fleetUtil, 0)} sub="Operating ÷ recorded hours" tone={fleetUtil >= 70 ? 'good' : 'warn'} />
        <Stat label="Operating hours (MTD)" value={num(tot.operating)} sub={`${num(tot.idle)} idle · ${num(tot.maintenance)} maintenance`} />
        <Stat label="Maintenance / breakdown" value={units.filter((u) => u.status === 'Maintenance' || u.status === 'Breakdown').length} sub="Not assignable on planning board" tone="warn" to="/maintenance/work-orders" />
        <Stat label="Certificates expired / expiring" value={certIssues.length} sub={certIssues.map((u) => u.id).join(', ')} tone="bad" to="/maintenance/certifications" />
      </Grid>

      <Card className="mb-4">
        <CardHeader title="Hours by category and unit type — March 2028 MTD" subtitle="Three distinct categories feed utilisation and unit-hour costing" />
        <Legend items={[{ label: 'Operating', color: UTIL_COLORS.operating }, { label: 'Idle', color: UTIL_COLORS.idle }, { label: 'Maintenance', color: UTIL_COLORS.maintenance }]} />
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={byCat} margin={{ left: 0, right: 8, top: 4 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="cat" {...axisProps} interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
            <YAxis {...axisProps} width={40} />
            <Tooltip content={<ChartTooltip format={(v) => `${num(v)} h`} />} cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="operating" name="Operating" stackId="h" fill={UTIL_COLORS.operating} />
            <Bar dataKey="idle" name="Idle" stackId="h" fill={UTIL_COLORS.idle} />
            <Bar dataKey="maintenance" name="Maintenance" stackId="h" fill={UTIL_COLORS.maintenance} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3">
          <div className="scrollbar-thin flex gap-1.5 overflow-x-auto">
            {(['All', 'Operating', 'Idle', 'Maintenance', 'Breakdown'] as const).map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(s)} count={s === 'All' ? units.length : units.filter((u) => u.status === s).length}>
                {s}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search unit, plate, site…" className="w-full sm:w-64" />
            <Select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">All categories</option>
              {cats.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
        </div>
        <DataTable columns={cols} rows={rows} rowKey={(u) => u.id} onRowClick={(u) => nav(`/fleet/units/${u.id}`)} />
        <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
          {rows.length} units · acquisition value {idrShort(rows.reduce((a, u) => a + u.acquisitionValue, 0))}
        </div>
      </Card>
    </>
  )
}
