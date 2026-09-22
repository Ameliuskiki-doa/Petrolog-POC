import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, CalendarClock, Database, Play, ChevronLeft, LayoutDashboard, Send } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Callout, Card, CardHeader, DataTable, Grid, Mono, PageHeader, ProjectCodeChip, Stat, StatusBadge, Tabs } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { dateTime, idrShort, pct } from '@/lib/format'
import { ChartTooltip, GRID, Legend, NEUTRAL, SERIES, axisProps } from '@/lib/chart'
import { businessLines, getEmployee, getProject, type BusinessLine } from '@/data/core'
import { dashboards, marginReport, scheduledReports } from '@/data/platform'

type TabKey = 'catalog' | 'viewer' | 'sql'

const SAMPLE_SQL = `-- Remaining budget per active project code (RAB − actual − commitment)
SELECT p.project_code,
       p.name,
       p.rab_amount,
       COALESCE(SUM(c.amount) FILTER (WHERE c.kind = 'ACTUAL'), 0)     AS actual,
       COALESCE(SUM(c.amount) FILTER (WHERE c.kind = 'COMMITMENT'), 0) AS committed,
       p.rab_amount
         - COALESCE(SUM(c.amount), 0)                                   AS remaining
FROM   mdm.project_code p
LEFT   JOIN costing.cost_line c ON c.project_code = p.project_code
WHERE  p.status = 'ACTIVE' AND p.parent_code IS NULL
GROUP  BY p.project_code, p.name, p.rab_amount
ORDER  BY remaining ASC;`

export default function Reports() {
  const toast = useToast()
  const nav = useNavigate()
  const [tab, setTab] = useState<TabKey>('catalog')
  const [bl, setBl] = useState<BusinessLine | null>(null)
  const [ran, setRan] = useState(false)

  const byBl = (['HL', 'PS', 'GS'] as BusinessLine[]).map((b) => {
    const r = marginReport.filter((m) => m.bl === b)
    const revenue = r.reduce((a, x) => a + x.revenue, 0) * 1e6
    const cost = r.reduce((a, x) => a + x.cost, 0) * 1e6
    return { key: b, name: businessLines[b].short, margin: revenue - cost, revenue, cost, color: businessLines[b].color }
  })
  const drill = bl
    ? marginReport.filter((m) => m.bl === bl).map((m) => ({ key: m.code, name: m.code, margin: (m.revenue - m.cost) * 1e6, revenue: m.revenue * 1e6, cost: m.cost * 1e6, color: businessLines[bl].color }))
    : byBl
  const sqlRows = ['HL-2027-014', 'PS-2028-003', 'GS-2027-008', 'HL-2027-021', 'HL-2028-002']
    .map((c) => getProject(c)!)
    .map((p) => ({ code: p.code, name: p.name, rab: p.rab, actual: p.actual, committed: p.committed, remaining: p.rab - p.actual - p.committed }))
    .sort((a, b) => a.remaining - b.remaining)

  return (
    <>
      <PageHeader
        module="Platform · BI & Dashboards"
        title="Reports & BI"
        subtitle="Role-based dashboards with drill-down to the source transaction, scheduled report distribution, and an open database that can be queried directly with native SQL."
        actions={<Button variant="primary" icon={<CalendarClock size={15} />} onClick={() => toast('Schedule created — Weekly project P/L pack to PMs, Monday 07:00', 'success')}>Schedule a report</Button>}
      />
      <Grid cols={4} className="mb-5">
        <Stat label="Dashboards" value={dashboards.length} sub="Filtered by role & data scope" icon={<LayoutDashboard size={16} />} />
        <Stat label="Scheduled reports" value={scheduledReports.length} sub={`${scheduledReports.filter((s) => s.status === 'Failed').length} failed last run`} tone="warn" icon={<Send size={16} />} />
        <Stat label="Views this month" value="3,696" sub="Top: Project P/L (1,086)" icon={<BarChart3 size={16} />} />
        <Stat label="Read replica lag" value="0.8 s" sub="BI & SQL queries never touch the primary" tone="good" icon={<Database size={16} />} />
      </Grid>
      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[{ key: 'catalog', label: 'Catalog' }, { key: 'viewer', label: 'Report viewer' }, { key: 'sql', label: 'SQL console (read-only)' }]}
      />

      {tab === 'catalog' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card padded={false}>
            <div className="p-4 pb-2"><CardHeader title="Role-based dashboards" /></div>
            <DataTable
              rows={dashboards}
              rowKey={(d) => d.id}
              onRowClick={() => setTab('viewer')}
              columns={[
                { key: 'n', header: 'Dashboard', render: (d) => <div className="min-w-[200px]"><div className="text-sm font-medium">{d.name}</div><div className="text-xs text-slate-500">Owner {getEmployee(d.owner)?.name} · {d.refresh}</div></div> },
                { key: 'r', header: 'Roles', render: (d) => <div className="flex flex-wrap gap-1">{d.roles.map((r) => <Badge key={r}>{r}</Badge>)}</div> },
                { key: 'v', header: 'Views', align: 'right', render: (d) => d.views.toLocaleString('en-US') },
              ]}
            />
          </Card>
          <Card padded={false}>
            <div className="p-4 pb-2"><CardHeader title="Scheduled reports" /></div>
            <DataTable
              rows={scheduledReports}
              rowKey={(s) => s.id}
              columns={[
                { key: 'n', header: 'Report', render: (s) => <div className="min-w-[200px]"><div className="text-sm font-medium">{s.name}</div><div className="text-xs text-slate-500">{s.recipients}</div></div> },
                { key: 's', header: 'Schedule', render: (s) => <div className="text-xs">{s.schedule}<div className="text-slate-500">{s.format}</div></div> },
                { key: 'l', header: 'Last run', render: (s) => <div className="text-xs">{dateTime(s.last)}<div className="mt-0.5"><StatusBadge status={s.status === 'Delivered' ? 'Done' : 'Failed'} /></div></div> },
                { key: 'x', header: '', render: (s) => <Button size="sm" onClick={() => toast(`${s.name} — run now and delivered`, 'success')}>Run now</Button> },
              ]}
            />
          </Card>
        </div>
      )}

      {tab === 'viewer' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title={bl ? `Gross margin by project — ${businessLines[bl].name}` : 'Gross margin by business line — 2028 YTD'}
              subtitle={bl ? 'Click a project code to open its P/L' : 'Click a bar to drill down to project codes'}
              actions={bl && <Button size="sm" variant="ghost" icon={<ChevronLeft size={14} />} onClick={() => setBl(null)}>All business lines</Button>}
            />
            {!bl && <Legend items={byBl.map((b) => ({ label: b.name, color: b.color }))} />}
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={drill}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={(v) => `${(v / 1e9).toFixed(1)} bn`} width={52} />
                <Tooltip content={<ChartTooltip format={idrShort} />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="margin" name="Gross margin" radius={[4, 4, 0, 0]} maxBarSize={56} className="cursor-pointer"
                  onClick={(d: { payload?: { key: string } }) => { const k = d.payload?.key; if (!k) return; if (!bl) setBl(k as BusinessLine); else nav(`/projects/${k}`) }}>
                  {drill.map((d) => <Cell key={d.key} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card padded={false}>
            <div className="p-4 pb-2"><CardHeader title="Underlying rows" subtitle="Every number drills to source transactions" /></div>
            <DataTable
              dense
              rows={drill}
              rowKey={(d) => d.key}
              onRowClick={(d) => (!bl ? setBl(d.key as BusinessLine) : nav(`/projects/${d.key}`))}
              columns={[
                { key: 'n', header: bl ? 'Project' : 'BL', render: (d) => (bl ? <ProjectCodeChip code={d.key} /> : <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />{d.name}</span>) },
                { key: 'r', header: 'Revenue', align: 'right', render: (d) => idrShort(d.revenue) },
                { key: 'm', header: 'Margin', align: 'right', render: (d) => <span>{pct(((d.revenue - d.cost) / d.revenue) * 100)}</span> },
              ]}
            />
            <p className="p-3 text-xs text-slate-500" style={{ color: NEUTRAL }}>Source: costing.cost_line ⋈ billing.revenue_line, as of 10 Mar 2028 09:00</p>
          </Card>
        </div>
      )}

      {tab === 'sql' && (
        <div className="space-y-4">
          <Callout tone="blue" icon={<Database size={16} />} title="Open architecture — the database is directly queryable">
            PostgreSQL with documented schemas per domain (<Mono>mdm</Mono>, <Mono>ops</Mono>, <Mono>costing</Mono>, <Mono>gl</Mono>, <Mono>ap</Mono>, <Mono>ar</Mono>…). Analysts query a read-only replica with native SQL or connect any BI tool (Power BI, Metabase, Excel) over ODBC. Row-level security applies the same business line / location scope as the application.
          </Callout>
          <Card padded={false}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm"><Database size={15} className="text-slate-400" /><span className="font-medium">petrolog_ro</span><Badge tone="green">read-only replica</Badge><Badge>role: analyst_finance</Badge></div>
              <Button size="sm" variant="primary" icon={<Play size={13} />} onClick={() => { setRan(true); toast('Query executed — 5 rows in 42 ms', 'success') }}>Run</Button>
            </div>
            <pre className="scrollbar-thin overflow-x-auto bg-slate-900 p-4 font-mono text-[12px] leading-relaxed text-slate-100">{SAMPLE_SQL}</pre>
            {ran && (
              <>
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-1.5 text-xs text-slate-500">5 rows · 42 ms · executed as kevin.tanoto (audit-logged)</div>
                <DataTable
                  dense
                  rows={sqlRows}
                  rowKey={(r) => r.code}
                  columns={[
                    { key: 'c', header: 'project_code', render: (r) => <ProjectCodeChip code={r.code} /> },
                    { key: 'n', header: 'name', render: (r) => <span className="font-mono text-[12px]">{r.name}</span> },
                    { key: 'rab', header: 'rab_amount', align: 'right', render: (r) => <span className="font-mono text-[12px]">{r.rab.toLocaleString('en-US')}</span> },
                    { key: 'a', header: 'actual', align: 'right', render: (r) => <span className="font-mono text-[12px]">{r.actual.toLocaleString('en-US')}</span> },
                    { key: 'cm', header: 'committed', align: 'right', render: (r) => <span className="font-mono text-[12px]">{r.committed.toLocaleString('en-US')}</span> },
                    { key: 'rm', header: 'remaining', align: 'right', render: (r) => <span className="font-mono text-[12px] font-semibold">{r.remaining.toLocaleString('en-US')}</span> },
                  ]}
                />
              </>
            )}
          </Card>
          <p className="text-xs text-slate-500">Write statements (INSERT / UPDATE / DELETE / DDL) are rejected by the read-only role. <span style={{ color: SERIES[0] }}>Schema documentation</span> is generated from the database catalogue on every release.</p>
        </div>
      )}
    </>
  )
}
