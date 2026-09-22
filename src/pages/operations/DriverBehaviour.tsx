import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FileBarChart, Video } from 'lucide-react'
import { Badge, Button, Card, CardHeader, DataTable, Grid, Input, PageHeader, Progress, Select, Stat, type Column } from '@/components/ui'
import { defaultWeights, driverEvents, drivers, driverScoreTrend, personName, type DriverEvent, type DriverEventType } from '@/data/operations'
import { dateTime, num } from '@/lib/format'
import { axisProps, ChartTooltip, GRID, Legend, SERIES } from '@/lib/chart'
import { useToast } from '@/lib/app-state'
import { Chip, FLEET_MODULE, Person, UnitLink } from './shared'

const TYPES: DriverEventType[] = ['Overspeed', 'Harsh braking', 'Harsh acceleration', 'Idling']

export default function DriverBehaviour() {
  const toast = useToast()
  const [weights, setWeights] = useState(defaultWeights)
  const [type, setType] = useState<DriverEventType | 'All'>('All')
  const [driver, setDriver] = useState('')
  const [periodSel, setPeriodSel] = useState('Weekly')

  const board = useMemo(
    () =>
      drivers
        .map((d) => {
          const ev = driverEvents.filter((e) => e.driverId === d.id)
          const counts = Object.fromEntries(TYPES.map((t) => [t, ev.filter((e) => e.type === t).length])) as Record<DriverEventType, number>
          const penalty = TYPES.reduce((a, t) => a + counts[t] * weights[t], 0)
          const score = Math.max(0, Math.round(100 - penalty / (d.kmMTD / 1000)))
          return { ...d, counts, total: ev.length, score, per100: (ev.length / d.kmMTD) * 100 }
        })
        .sort((a, b) => b.score - a.score),
    [weights],
  )
  const avg = board.reduce((a, d) => a + d.score, 0) / board.length
  const events = driverEvents.filter((e) => (type === 'All' || e.type === type) && (!driver || e.driverId === driver))
  const chartData = board.map((d) => ({ name: personName(d.id).split(' ')[0], ...d.counts }))

  const cols: Column<(typeof board)[number]>[] = [
    { key: 'rank', header: '#', render: (d) => <span className="num font-semibold text-slate-500">{board.indexOf(d) + 1}</span>, width: '36px' },
    { key: 'd', header: 'Driver', render: (d) => <Person id={d.id} /> },
    { key: 'u', header: 'Unit', render: (d) => <UnitLink id={d.unitId} /> },
    { key: 'km', header: 'Km (MTD)', align: 'right', render: (d) => num(d.kmMTD) },
    ...TYPES.map((t) => ({ key: t, header: t.replace('Harsh ', 'H. '), align: 'right' as const, render: (d: (typeof board)[number]) => d.counts[t] || <span className="text-slate-300">0</span> })),
    { key: 'r', header: 'Events / 100 km', align: 'right', render: (d) => num(d.per100, 2) },
    {
      key: 'score',
      header: 'Score',
      render: (d) => (
        <div className="flex w-36 items-center gap-2">
          <Progress value={d.score} tone={d.score >= 85 ? 'green' : d.score >= 70 ? 'amber' : 'red'} />
          <span className="num w-7 text-right font-semibold">{d.score}</span>
        </div>
      ),
    },
    { key: 'band', header: 'Band', render: (d) => <Badge tone={d.score >= 85 ? 'green' : d.score >= 70 ? 'amber' : 'red'}>{d.score >= 85 ? 'Good' : d.score >= 70 ? 'Coaching' : 'At risk'}</Badge> },
  ]

  const evCols: Column<DriverEvent>[] = [
    { key: 't', header: 'Time', render: (e) => <span className="whitespace-nowrap">{dateTime(e.time)}</span> },
    { key: 'd', header: 'Driver', render: (e) => personName(e.driverId) },
    { key: 'u', header: 'Unit', render: (e) => <UnitLink id={e.unitId} /> },
    { key: 'ty', header: 'Event', render: (e) => <Badge tone={e.type === 'Overspeed' ? 'red' : e.type === 'Idling' ? 'slate' : 'amber'}>{e.type}</Badge> },
    { key: 'de', header: 'Detail', render: (e) => <span className="text-slate-700">{e.detail}</span> },
    { key: 'l', header: 'Location', render: (e) => <span className="text-xs text-slate-500">{e.location}</span> },
    {
      key: 's',
      header: 'Source',
      render: (e) => (
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          {e.source}
          {e.clip && (
            <button onClick={() => toast(`Dashcam clip for ${e.id} requested from device — available within 2 minutes`, 'info')} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 hover:bg-slate-200">
              <Video size={10} /> clip
            </button>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        module={FLEET_MODULE}
        title="Driver Behaviour"
        subtitle="Overspeed, harsh braking, harsh acceleration and idling events from the GPS and dashcam devices already installed. Scoring weights per violation type are configurable."
        crumbs={[{ label: 'Operations' }, { label: 'Driver Behaviour' }]}
        actions={
          <>
            <Select value={periodSel} onChange={(e) => setPeriodSel(e.target.value)}>
              <option>Weekly</option>
              <option>Monthly</option>
            </Select>
            <Button variant="primary" icon={<FileBarChart size={15} />} onClick={() => toast(`${periodSel} driver behaviour report generated and sent to site leaders & HSE`, 'success')}>
              Generate report
            </Button>
          </>
        }
      />
      <Grid cols={4} className="mb-4">
        <Stat label="Fleet average score" value={num(avg, 0)} sub="Month to date, weighted per 1,000 km" tone={avg >= 85 ? 'good' : 'warn'} />
        <Stat label="Events (1–10 Mar)" value={driverEvents.length} sub={`${num((driverEvents.length / drivers.reduce((a, d) => a + d.kmMTD, 0)) * 100, 2)} per 100 km`} />
        <Stat label="Overspeed events" value={driverEvents.filter((e) => e.type === 'Overspeed').length} sub="Haul road limit 40 km/h" tone="bad" />
        <Stat label="Drivers at risk (< 70)" value={board.filter((d) => d.score < 70).length} sub={board.filter((d) => d.score < 70).map((d) => personName(d.id)).join(', ') || 'None'} tone={board.some((d) => d.score < 70) ? 'bad' : 'good'} to="/hse/incidents" />
      </Grid>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card padded={false} className="min-w-0">
          <div className="px-4 pt-4">
            <CardHeader title="Leaderboard" subtitle="Score = 100 − Σ(events × weight) per 1,000 km" />
          </div>
          <DataTable columns={cols} rows={board} rowKey={(d) => d.id} onRowClick={(d) => setDriver(d.id === driver ? '' : d.id)} rowClassName={(d) => (d.id === driver ? 'bg-brand-50' : undefined)} />
        </Card>
        <Card>
          <CardHeader title="Scoring weights" subtitle="Penalty points per event" />
          <div className="space-y-2.5">
            {TYPES.map((t) => (
              <div key={t} className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700">{t}</span>
                <Input type="number" min={0} max={20} className="w-20 text-right" value={weights[t]} onChange={(e) => setWeights({ ...weights, [t]: Math.max(0, Number(e.target.value)) })} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="primary" onClick={() => toast('Scoring weights saved; scores recalculated for March')}>
              Save weights
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setWeights(defaultWeights)}>
              Reset
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">Leaderboard recalculates live as you change weights. Bands: ≥ 85 good · 70–84 coaching · &lt; 70 at risk (HSE follow-up).</p>
        </Card>
      </div>

      <Grid cols={2} className="mb-4">
        <Card>
          <CardHeader title="Events by driver and type" subtitle="1–10 Mar 2028" />
          <Legend items={TYPES.map((t, i) => ({ label: t, color: SERIES[i] }))} />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ left: 0, right: 8, top: 4 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" {...axisProps} interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis {...axisProps} width={30} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
              {TYPES.map((t, i) => (
                <Bar key={t} dataKey={t} name={t} stackId="e" fill={SERIES[i]} radius={i === TYPES.length - 1 ? [4, 4, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardHeader title="Weekly score trend" subtitle="Periodic report — fleet average, best and worst driver" />
          <Legend items={[{ label: 'Fleet average', color: SERIES[0] }, { label: 'Best driver', color: SERIES[2] }, { label: 'Worst driver', color: SERIES[1] }]} />
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={driverScoreTrend} margin={{ left: 0, right: 8, top: 4 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="week" {...axisProps} />
              <YAxis {...axisProps} width={30} domain={[50, 100]} />
              <Tooltip content={<ChartTooltip />} />
              <Line dataKey="fleet" name="Fleet average" stroke={SERIES[0]} strokeWidth={2} dot={false} />
              <Line dataKey="best" name="Best driver" stroke={SERIES[2]} strokeWidth={2} dot={false} />
              <Line dataKey="worst" name="Worst driver" stroke={SERIES[1]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Grid>

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <span className="mr-1 text-sm font-semibold text-slate-800">Event log</span>
          <Chip active={type === 'All'} onClick={() => setType('All')} count={driverEvents.length}>
            All
          </Chip>
          {TYPES.map((t) => (
            <Chip key={t} active={type === t} onClick={() => setType(t)} count={driverEvents.filter((e) => e.type === t).length}>
              {t}
            </Chip>
          ))}
          {driver && (
            <Button size="sm" variant="ghost" onClick={() => setDriver('')}>
              Driver: {personName(driver)} ✕
            </Button>
          )}
        </div>
        <DataTable dense columns={evCols} rows={events} rowKey={(e) => e.id} />
      </Card>
    </>
  )
}
