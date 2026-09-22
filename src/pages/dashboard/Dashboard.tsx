import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  AlertTriangle, ArrowRight, BadgeCheck, CalendarClock, CheckCircle2, ClipboardCheck, FileWarning, Fuel, PlayCircle, ShieldAlert, Truck, Wallet,
} from 'lucide-react'
import {
  Badge, Button, Card, CardHeader, DataTable, Grid, PageHeader, ProjectCodeChip, Progress, Stat, StatusBadge, cx,
} from '@/components/ui'
import { axisProps, ChartTooltip, GRID, Legend, NEUTRAL_LIGHT, SERIES, STATUS } from '@/lib/chart'
import { useRole } from '@/lib/app-state'
import { idrShort, num, pct, date, daysUntil } from '@/lib/format'
import {
  businessLines, employees, getEmployee, jobs, purchaseOrders, remainingBudget, roles, rootProjects, runningMargin, units, vendors,
  type BusinessLine, type Project,
} from '@/data/core'
import { approvals, arAgeing, closeTasksMar, fleetUtilisation, hseStats, marginByMonth, pipelineByStage, revenueByMonth } from '@/data/dashboard'

const BLS: BusinessLine[] = ['HL', 'PS', 'GS']

// ─── Shared widgets ──────────────────────────────────────────────────────────

function RevenueByLine() {
  return (
    <Card>
      <CardHeader title="Revenue by business line" subtitle="Trailing 12 months · recognised against project codes" />
      <Legend items={BLS.map((b) => ({ label: businessLines[b].short, color: businessLines[b].color }))} />
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={revenueByMonth} margin={{ left: 0, right: 8, top: 4 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} width={56} tickFormatter={(v) => `${(v / 1e9).toFixed(0)} bn`} />
          <Tooltip cursor={{ fill: '#f1f5f9' }} content={<ChartTooltip format={idrShort} />} />
          {BLS.map((b, i) => (
            <Bar key={b} dataKey={b} name={businessLines[b].short} stackId="r" fill={businessLines[b].color} stroke="#fff" strokeWidth={1} radius={i === BLS.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={28} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

function MarginTrend() {
  return (
    <Card>
      <CardHeader title="Gross margin by business line" subtitle="%, trailing 12 months — Plant Services is sliding" />
      <Legend items={BLS.map((b) => ({ label: businessLines[b].short, color: businessLines[b].color }))} />
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={marginByMonth} margin={{ left: 0, right: 12, top: 4 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} width={40} domain={[0, 25]} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<ChartTooltip format={(v) => pct(v)} />} />
          {BLS.map((b) => (
            <Line key={b} dataKey={b} name={businessLines[b].short} stroke={businessLines[b].color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

function ProjectPLTable({ list, title = 'Project P/L', subtitle }: { list: Project[]; title?: string; subtitle?: string }) {
  const nav = useNavigate()
  return (
    <Card padded={false}>
      <div className="p-4 pb-0">
        <CardHeader title={title} subtitle={subtitle ?? 'Live from transactions — not month-end summarisation'} actions={<Link to="/projects" className="text-xs font-medium text-brand-700 hover:underline">All projects</Link>} />
      </div>
      <DataTable
        rows={list}
        rowKey={(p) => p.code}
        onRowClick={(p) => nav(`/projects/${p.code}`)}
        columns={[
          { key: 'code', header: 'Project', render: (p) => <div className="min-w-0"><ProjectCodeChip code={p.code} /><div className="mt-0.5 max-w-[240px] truncate text-xs text-slate-500">{p.name}</div></div> },
          { key: 'bl', header: 'Line', render: (p) => <span className="flex items-center gap-1.5 text-xs"><span className="h-2 w-2 rounded-sm" style={{ background: businessLines[p.businessLine].color }} />{businessLines[p.businessLine].short}</span> },
          { key: 'st', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
          { key: 'rev', header: 'Revenue', align: 'right', render: (p) => idrShort(p.revenue) },
          { key: 'cost', header: 'Actual cost', align: 'right', render: (p) => idrShort(p.actual) },
          {
            key: 'budget', header: 'RAB used', render: (p) => {
              const used = ((p.actual + p.committed) / p.rab) * 100
              return (
                <div className="w-28">
                  <div className="num mb-1 text-xs text-slate-600">{pct(used, 0)}</div>
                  <Progress value={used} tone={used > p.progress + 12 ? 'red' : used > p.progress + 5 ? 'amber' : 'green'} />
                </div>
              )
            },
          },
          { key: 'm', header: 'Margin', align: 'right', render: (p) => { const m = runningMargin(p); return <span className={cx('font-medium', m < 10 ? 'text-red-600' : m < 15 ? 'text-amber-600' : 'text-emerald-700')}>{p.revenue ? pct(m) : '—'}</span> } },
        ]}
      />
    </Card>
  )
}

function Alerts({ items }: { items: { icon: ReactNode; title: string; body: string; to: string; tone: 'red' | 'amber' | 'sky' }[] }) {
  return (
    <Card>
      <CardHeader title="Needs attention" />
      <div className="space-y-1">
        {items.map((a) => (
          <Link key={a.title} to={a.to} className="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
            <span className={cx('mt-0.5 rounded-md p-1.5', a.tone === 'red' ? 'bg-red-50 text-red-600' : a.tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600')}>{a.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-slate-800">{a.title}</span>
              <span className="block text-xs text-slate-500">{a.body}</span>
            </span>
            <ArrowRight size={14} className="mt-1 text-slate-300" />
          </Link>
        ))}
      </div>
    </Card>
  )
}

function ApprovalsWidget({ role }: { role: string }) {
  const mine = approvals.filter((a) => a.roles.includes(role)).slice(0, 5)
  return (
    <Card>
      <CardHeader title="Waiting for my approval" actions={<Link to="/inbox" className="text-xs font-medium text-brand-700 hover:underline">Open inbox</Link>} />
      {mine.length === 0 && <div className="py-6 text-center text-sm text-slate-400">Nothing waiting</div>}
      <div className="divide-y divide-slate-100">
        {mine.map((a) => (
          <Link key={a.id} to={a.to} className="flex items-center gap-3 py-2 hover:bg-slate-50">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="font-medium text-slate-600">{a.type}</span>· <span className="font-mono">{a.ref}</span>
                {a.flag && <Badge tone={a.flag === 'Overdue' ? 'red' : 'amber'}>{a.flag}</Badge>}
              </div>
              <div className="truncate text-[13px] text-slate-800">{a.title}</div>
            </div>
            {a.amount !== undefined && <div className="num text-right text-xs font-medium text-slate-700">{idrShort(a.amount)}</div>}
          </Link>
        ))}
      </div>
    </Card>
  )
}

// ─── Guided demo: one project code across every domain (proposal §2.7.5) ─────

const tour = [
  { n: 1, title: 'Contract won → project code issued', body: 'CTR-2027-011 issues HL-2027-014 with its rate card', to: '/contracts/CTR-2027-011' },
  { n: 2, title: 'Budget check at requisition', body: 'PR blocked when RAB − actual − commitments is exceeded', to: '/procurement/requisitions/PR-2028-0256' },
  { n: 3, title: 'Planning board', body: 'Expired SILO / licence blocks assignment', to: '/ops/planning' },
  { n: 4, title: 'Driver app, offline', body: 'Check-in, POD photo & signature, fuel, timesheet', to: '/mobile' },
  { n: 5, title: 'Verify the job', body: 'Completed ≠ verified — ops admin quality gate', to: '/ops/jobs/JO-28-03-0398' },
  { n: 6, title: 'Loket Invoice & three-way match', body: 'Vendor invoice gets a receipt number', to: '/finance/loket' },
  { n: 7, title: 'Surat Konversi vs AR invoice', body: 'Close revenue leakage', to: '/finance/billing/reconciliation' },
  { n: 8, title: 'GEN allocation & fuel actualisation', body: 'Month-end, driver-based, traceable both ways', to: '/costing/allocation' },
  { n: 9, title: 'Late cost, period locked', body: 'Controlled reopening keeps project P/L final', to: '/costing/late-costs' },
  { n: 10, title: 'Project P/L', body: 'RAB, commitments, actuals, drill-down', to: '/projects/HL-2027-014' },
]

function DemoTour() {
  return (
    <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-white">
      <CardHeader
        title={<span className="flex items-center gap-2"><PlayCircle size={16} className="text-brand-600" /> Guided demo — one project code, end to end</span>}
        subtitle="Follows HL-2027-014 (Kutai Pit 3 Coal Hauling) through every domain, as in proposal §2.7.5"
      />
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {tour.map((t) => (
          <li key={t.n}>
            <Link to={t.to} target={t.to === '/mobile' ? '_blank' : undefined} className="flex h-full gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5 transition hover:border-brand-300 hover:shadow-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[10px] font-semibold text-white">{t.n}</span>
              <span className="min-w-0">
                <span className="block text-[12px] leading-snug font-semibold text-slate-800">{t.title}</span>
                <span className="block text-[11px] leading-snug text-slate-500">{t.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  )
}

// ─── Role dashboards ─────────────────────────────────────────────────────────

function ExecutiveDashboard() {
  const active = rootProjects().filter((p) => p.businessLine !== 'CORP' && p.status !== 'Planning')
  const revenueYtd = revenueByMonth.slice(-3).reduce((a, m) => a + m.HL + m.PS + m.GS, 0)
  const revenue12 = revenueByMonth.reduce((a, m) => a + m.HL + m.PS + m.GS, 0)
  const pipeline = pipelineByStage.reduce((a, s) => a + s.value, 0)
  const opHours = units.reduce((a, u) => a + u.hoursMTD.operating, 0)
  const allHours = units.reduce((a, u) => a + u.hoursMTD.operating + u.hoursMTD.idle + u.hoursMTD.maintenance, 0)
  return (
    <div className="space-y-4">
      <DemoTour />
      <Grid cols={4}>
        <Stat label="Revenue YTD 2028" value={idrShort(revenueYtd)} sub={`12-month run-rate ${idrShort(revenue12)}`} icon={<Wallet size={16} />} to="/finance/ar" />
        <Stat label="Portfolio gross margin" value={pct(15.8)} sub="▼ 1.2 pts vs Q4 2027 — Plant Services" tone="bad" to="/projects" />
        <Stat label="Weighted pipeline" value={idrShort(pipeline * 0.42)} sub={`${idrShort(pipeline)} unweighted · 20 opportunities`} to="/crm/pipeline" />
        <Stat label="Fleet utilisation (MTD)" value={pct((opHours / allHours) * 100, 0)} sub="Operating hours / available hours" icon={<Truck size={16} />} to="/fleet/units" />
      </Grid>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RevenueByLine />
        <MarginTrend />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ProjectPLTable list={active} />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Pipeline by stage" subtitle="Unweighted value" actions={<Link to="/crm/pipeline" className="text-xs font-medium text-brand-700 hover:underline">Pipeline</Link>} />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={pipelineByStage} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" {...axisProps} tickFormatter={(v) => `${(v / 1e9).toFixed(0)} bn`} />
                <YAxis type="category" dataKey="stage" {...axisProps} width={78} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} content={<ChartTooltip format={idrShort} />} />
                <Bar dataKey="value" name="Value" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Alerts
            items={[
              { icon: <AlertTriangle size={15} />, title: 'PS-2028-003 cost ahead of progress', body: 'RAB used 95% at 71% progress · v4 revision pending', to: '/projects/PS-2028-003', tone: 'red' },
              { icon: <FileWarning size={15} />, title: '3 Surat Konversi not invoiced', body: 'IDR 1.62 bn of acknowledged work unbilled', to: '/finance/billing/reconciliation', tone: 'amber' },
              { icon: <BadgeCheck size={15} />, title: '2 certifications lapsed', body: 'CR-050-01 SILO · operator licence R. Hidayat', to: '/maintenance/certifications', tone: 'red' },
            ]}
          />
        </div>
      </div>
      <Card>
        <CardHeader title="Fleet utilisation by category" subtitle="Operating, idle and maintenance hours are tracked as three distinct categories (OPS-19)" actions={<Link to="/fleet/units" className="text-xs font-medium text-brand-700 hover:underline">Fleet</Link>} />
        <Legend items={[{ label: 'Operating', color: SERIES[0] }, { label: 'Idle', color: NEUTRAL_LIGHT }, { label: 'Maintenance', color: SERIES[3] }]} />
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={fleetUtilisation} margin={{ left: 0, right: 8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="category" {...axisProps} />
            <YAxis {...axisProps} width={40} tickFormatter={(v) => `${v}%`} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} content={<ChartTooltip format={(v) => pct(v, 0)} />} />
            <Bar dataKey="operating" name="Operating" stackId="u" fill={SERIES[0]} stroke="#fff" maxBarSize={48} />
            <Bar dataKey="idle" name="Idle" stackId="u" fill={NEUTRAL_LIGHT} stroke="#fff" maxBarSize={48} />
            <Bar dataKey="maintenance" name="Maintenance" stackId="u" fill={SERIES[3]} stroke="#fff" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

function PMDashboard() {
  const me = roles.pm.userId
  const mine = rootProjects().filter((p) => p.pmId === me)
  const openPOs = purchaseOrders.filter((po) => mine.some((p) => po.projectCode.startsWith(p.code)) && ['Draft', 'Pending Approval', 'Approved', 'Partially Received'].includes(po.status))
  const chart = mine.map((p) => ({ code: p.code, RAB: p.rab, Actual: p.actual, Committed: p.committed }))
  return (
    <div className="space-y-4">
      <Grid cols={4}>
        <Stat label="My active projects" value={mine.filter((p) => p.status === 'Active' || p.status === 'Closing').length} sub={`${idrShort(mine.reduce((a, p) => a + p.contractValue, 0))} contract value`} to="/projects" />
        <Stat label="Open commitments" value={idrShort(mine.reduce((a, p) => a + p.committed, 0))} sub={`${openPOs.length} PR/PO not yet cost`} to="/procurement/orders" />
        <Stat label="Remaining RAB" value={idrShort(mine.reduce((a, p) => a + remainingBudget(p), 0))} sub="RAB − actuals − commitments" />
        <Stat label="Running margin" value={pct(mine.reduce((a, p) => a + p.revenue - p.actual, 0) / mine.reduce((a, p) => a + p.revenue, 0) * 100)} sub="Revenue recognised to date" tone="good" />
      </Grid>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="RAB against actuals and commitments" subtitle="Committed spend already reduces available budget before it becomes cost" />
          <Legend items={[{ label: 'Actual', color: SERIES[0] }, { label: 'Committed', color: SERIES[3] }, { label: 'RAB', color: NEUTRAL_LIGHT }]} />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chart} margin={{ left: 0, right: 8 }} barGap={4}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="code" {...axisProps} />
              <YAxis {...axisProps} width={56} tickFormatter={(v) => `${(v / 1e9).toFixed(0)} bn`} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} content={<ChartTooltip format={idrShort} />} />
              <Bar dataKey="Actual" stackId="c" fill={SERIES[0]} stroke="#fff" maxBarSize={36} />
              <Bar dataKey="Committed" stackId="c" fill={SERIES[3]} stroke="#fff" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="RAB" fill={NEUTRAL_LIGHT} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <ApprovalsWidget role="pm" />
      </div>
      <ProjectPLTable list={mine} title="My projects" />
    </div>
  )
}

function SiteDashboard() {
  const today = jobs.filter((j) => j.date === '2028-03-10' || j.date === '2028-03-11')
  const siteUnits = units.filter((u) => u.location === 'Kutai Kartanegara')
  const blockedUnits = units.filter((u) => daysUntil(u.cert.expiry) < 0)
  const blockedOps = employees.filter((e) => e.licence && daysUntil(e.licence.expiry) < 0)
  return (
    <div className="space-y-4">
      <Grid cols={4}>
        <Stat label="Jobs today" value={today.length} sub={`${today.filter((j) => j.status === 'In Progress').length} in progress`} to="/ops/jobs" icon={<ClipboardCheck size={16} />} />
        <Stat label="Units available (site)" value={`${siteUnits.filter((u) => u.status === 'Idle').length} / ${siteUnits.length}`} sub={`${siteUnits.filter((u) => u.status === 'Maintenance' || u.status === 'Breakdown').length} in workshop`} to="/ops/planning" icon={<Truck size={16} />} />
        <Stat label="Timesheets awaiting approval" value={38} sub="Week 10 · due 11 Mar 12:00" tone="warn" to="/timesheets" />
        <Stat label="Blocked by certification" value={blockedUnits.length + blockedOps.length} sub="Cannot be assigned to jobs" tone="bad" to="/maintenance/certifications" icon={<BadgeCheck size={16} />} />
      </Grid>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card padded={false} className="xl:col-span-2">
          <div className="p-4 pb-0"><CardHeader title="Today's and tomorrow's jobs" actions={<Link to="/ops/planning" className="text-xs font-medium text-brand-700 hover:underline">Planning board</Link>} /></div>
          <JobsTable list={today} />
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Unit status — Kutai" />
            <div className="space-y-1.5">
              {siteUnits.map((u) => (
                <Link key={u.id} to={`/fleet/units/${u.id}`} className="flex items-center justify-between rounded px-1 py-1 text-[13px] hover:bg-slate-50">
                  <span><span className="font-mono text-xs font-medium">{u.id}</span> <span className="text-slate-500">{u.type}</span></span>
                  <StatusBadge status={u.status} />
                </Link>
              ))}
            </div>
          </Card>
          <ApprovalsWidget role="site" />
        </div>
      </div>
      <Card>
        <CardHeader title="Blocked from assignment" subtitle="Control operates at planning, not at audit (proposal §2.5.5)" />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {blockedUnits.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-lg bg-red-50 p-3 text-sm ring-1 ring-red-100">
              <ShieldAlert size={16} className="text-red-600" />
              <span><b className="font-mono">{u.id}</b> {u.type} — certificate {u.cert.number} expired {date(u.cert.expiry)}</span>
            </div>
          ))}
          {blockedOps.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg bg-red-50 p-3 text-sm ring-1 ring-red-100">
              <ShieldAlert size={16} className="text-red-600" />
              <span><b>{e.name}</b> — {e.licence!.kind} expired {date(e.licence!.expiry)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function JobsTable({ list }: { list: typeof jobs }) {
  const nav = useNavigate()
  return (
    <DataTable
      rows={list}
      rowKey={(j) => j.id}
      onRowClick={(j) => nav(`/ops/jobs/${j.id}`)}
      columns={[
        { key: 'id', header: 'Job', render: (j) => <div><div className="font-mono text-xs font-medium">{j.id}</div><div className="max-w-[260px] truncate text-xs text-slate-500">{j.title}</div></div> },
        { key: 'pc', header: 'Project', render: (j) => <ProjectCodeChip code={j.projectCode} /> },
        { key: 'd', header: 'Date', render: (j) => <span className="text-xs">{date(j.date)}</span> },
        { key: 'u', header: 'Units', render: (j) => <span className="font-mono text-xs">{j.unitIds.join(', ') || '—'}</span> },
        { key: 's', header: 'Status', render: (j) => <StatusBadge status={j.status} /> },
      ]}
    />
  )
}

function AdminDashboard() {
  const held = jobs.filter((j) => j.status === 'Completed')
  return (
    <div className="space-y-4">
      <Grid cols={4}>
        <Stat label="Jobs held at verification" value={held.length} sub="Completed by field, not yet verified" tone="warn" to="/ops/jobs" icon={<ClipboardCheck size={16} />} />
        <Stat label="POD completeness (7 days)" value="96%" sub="2 jobs missing signed delivery note" to="/ops/jobs" />
        <Stat label="Pending mobile sync" value={7} sub="3 devices last seen > 2 h ago" to="/admin/integrations" />
        <Stat label="Cost entries to review" value={12} sub="Tolls, parking, standby charges" to="/ops/jobs" icon={<Fuel size={16} />} />
      </Grid>
      <Card padded={false}>
        <div className="p-4 pb-0"><CardHeader title="Held at verification" subtitle="The driver declares the work done; operations admin validates before cost and billing flow downstream" /></div>
        <JobsTable list={held} />
      </Card>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ApprovalsWidget role="admin" />
        <Card>
          <CardHeader title="Recently verified → billable" />
          <div className="divide-y divide-slate-100">
            {jobs.filter((j) => j.status === 'Verified').map((j) => (
              <Link key={j.id} to={`/ops/jobs/${j.id}`} className="flex items-center gap-3 py-2 text-[13px] hover:bg-slate-50">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span className="flex-1 truncate">{j.title}</span>
                <span className="num text-xs font-medium">{idrShort(j.qty * j.rate)}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function FinanceDashboard() {
  const arTotal = arAgeing.reduce((a, b) => a + b.amount, 0)
  return (
    <div className="space-y-4">
      <Grid cols={4}>
        <Stat label="Receivables outstanding" value={idrShort(arTotal)} sub={`${idrShort(arAgeing.slice(2).reduce((a, b) => a + b.amount, 0))} over 30 days`} to="/finance/ar" />
        <Stat label="Konversi not invoiced" value={idrShort(1.62e9)} sub="3 documents · oldest 26 days" tone="bad" to="/finance/billing/reconciliation" />
        <Stat label="Loket Invoice queue" value={23} sub="5 in exception · avg age 4.2 days" tone="warn" to="/finance/loket" />
        <Stat label="Period close — Mar 2028" value="2 / 9" sub="tasks complete · Jan & Feb locked" to="/finance/close" icon={<CalendarClock size={16} />} />
      </Grid>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Invoice ageing" subtitle="Customer receivables, days past due" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={arAgeing} margin={{ left: 0, right: 8 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="bucket" {...axisProps} />
              <YAxis {...axisProps} width={50} tickFormatter={(v) => `${(v / 1e9).toFixed(0)} bn`} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} content={<ChartTooltip format={idrShort} />} />
              <Bar dataKey="amount" name="Outstanding" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardHeader title="Month-end close — Mar 2028" actions={<Link to="/finance/close" className="text-xs font-medium text-brand-700 hover:underline">Close cockpit</Link>} />
          <div className="space-y-2">
            {closeTasksMar.map((t) => (
              <div key={t.task} className="flex items-center justify-between text-[13px]">
                <span><span className="text-slate-800">{t.task}</span><span className="block text-xs text-slate-500">{t.owner}</span></span>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </Card>
        <ApprovalsWidget role="finance" />
      </div>
      <Card>
        <CardHeader title="Cut-over status" subtitle="Stage 1B finance cut-over completed 01 Jan 2028" />
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
          {[
            ['Opening balances', 'Reconciled to SAP B1 trial balance'],
            ['Open AP / AR', 'Loaded at document level'],
            ['Fixed asset register', 'Commercial & fiscal books'],
            ['SAP Business One', 'Read-only archive · Stage 2 history load in 2028'],
          ].map(([t, b]) => (
            <div key={t} className="flex gap-2 rounded-lg bg-slate-50 p-3">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: STATUS.good }} />
              <span><span className="block font-medium text-slate-800">{t}</span><span className="text-xs text-slate-500">{b}</span></span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ProcurementDashboard() {
  const nav = useNavigate()
  const pending = purchaseOrders.filter((p) => p.status === 'Pending Approval' || p.status === 'Draft')
  const top = [...vendors].filter((v) => v.score > 0).sort((a, b) => b.score - a.score)
  const expiring = vendors.filter((v) => daysUntil(v.docsExpiry) < 30)
  return (
    <div className="space-y-4">
      <Grid cols={4}>
        <Stat label="Open RFQs" value={4} sub="1 closing today 17:00" to="/procurement/rfq" />
        <Stat label="POs awaiting approval" value={pending.length} sub={idrShort(pending.reduce((a, p) => a + p.amount, 0))} tone="warn" to="/procurement/orders" />
        <Stat label="PRs blocked by budget check" value={1} sub="GS-2027-008 · escalated to Finance Director" tone="bad" to="/procurement/requisitions" />
        <Stat label="Vendor documents expiring" value={expiring.length} sub="Excluded from new RFQs once expired" to="/vendors" />
      </Grid>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card padded={false} className="xl:col-span-2">
          <div className="p-4 pb-0"><CardHeader title="Purchase orders" subtitle="Every line carries a project code" /></div>
          <DataTable
            rows={purchaseOrders.slice(0, 8)}
            rowKey={(p) => p.id}
            onRowClick={(p) => nav(`/procurement/orders/${p.id}`)}
            columns={[
              { key: 'id', header: 'PO', render: (p) => <span className="font-mono text-xs font-medium">{p.id}</span> },
              { key: 'd', header: 'Description', render: (p) => <span className="block max-w-[260px] truncate text-[13px]">{p.description}</span> },
              { key: 'pc', header: 'Project', render: (p) => <ProjectCodeChip code={p.projectCode} /> },
              { key: 'a', header: 'Amount', align: 'right', render: (p) => idrShort(p.amount) },
              { key: 's', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
            ]}
          />
        </Card>
        <div className="space-y-4">
          <ApprovalsWidget role="procurement" />
          <Card>
            <CardHeader title="Vendor performance" subtitle="Timeliness, quality, document compliance" />
            <div className="space-y-2">
              {top.slice(0, 6).map((v) => (
                <Link key={v.id} to={`/vendors/${v.id}`} className="block text-[13px] hover:underline">
                  <div className="flex justify-between"><span className="truncate">{v.name}</span><span className="num font-medium">{v.score}</span></div>
                  <Progress value={v.score} tone={v.score >= 80 ? 'green' : v.score >= 60 ? 'amber' : 'red'} className="mt-1" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function HSEDashboard() {
  const certs = [
    ...units.map((u) => ({ what: `${u.id} · ${u.type}`, doc: u.cert.number, expiry: u.cert.expiry })),
    ...employees.filter((e) => e.licence).map((e) => ({ what: e.name, doc: e.licence!.kind, expiry: e.licence!.expiry })),
  ]
    .filter((c) => daysUntil(c.expiry) < 60)
    .sort((a, b) => a.expiry.localeCompare(b.expiry))
  return (
    <div className="space-y-4">
      <Grid cols={4}>
        <Stat label="Days without LTI" value={num(hseStats.daysWithoutLti)} sub="Company-wide" tone="good" icon={<ShieldAlert size={16} />} />
        <Stat label="TRIR (rolling 12 m)" value={hseStats.trir.toFixed(2)} sub={`${num(hseStats.manHoursYtd)} man-hours YTD`} />
        <Stat label="Open incidents" value={hseStats.openIncidents} sub={`${hseStats.openCapa} corrective actions open`} tone="warn" to="/hse/incidents" />
        <Stat label="Certificates expiring < 60 days" value={certs.length} sub="Equipment & operators" tone="bad" to="/maintenance/certifications" />
      </Grid>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card padded={false} className="xl:col-span-2">
          <div className="p-4 pb-0"><CardHeader title="Permits & certificates approaching expiry" subtitle="Tiered alerts at 90 / 60 / 30 days; lapsed items block assignment" actions={<Link to="/maintenance/certifications" className="text-xs font-medium text-brand-700 hover:underline">Registry</Link>} /></div>
          <DataTable
            rows={certs}
            rowKey={(c) => c.what + c.doc}
            columns={[
              { key: 'w', header: 'Unit / person', render: (c) => <span className="text-[13px] font-medium">{c.what}</span> },
              { key: 'd', header: 'Document', render: (c) => <span className="font-mono text-xs">{c.doc}</span> },
              { key: 'e', header: 'Expiry', render: (c) => <span className="text-xs">{date(c.expiry)}</span> },
              { key: 's', header: 'Status', render: (c) => { const d = daysUntil(c.expiry); return d < 0 ? <Badge tone="red" dot>Expired {-d} d ago</Badge> : <Badge tone={d <= 30 ? 'amber' : 'sky'} dot>{d} days left</Badge> } },
            ]}
          />
        </Card>
        <ApprovalsWidget role="hse" />
      </div>
    </div>
  )
}

const views = {
  executive: ExecutiveDashboard,
  pm: PMDashboard,
  site: SiteDashboard,
  admin: AdminDashboard,
  finance: FinanceDashboard,
  procurement: ProcurementDashboard,
  hse: HSEDashboard,
}

export default function Dashboard() {
  const { role } = useRole()
  const user = getEmployee(roles[role].userId)!
  const View = views[role]
  return (
    <>
      <PageHeader
        title={`Good morning, ${user.name.split(' ')[0]}`}
        subtitle={`${roles[role].label} dashboard — ${roles[role].description}. Every figure opens to the transactions that formed it.`}
        actions={
          <Link to="/inbox">
            <Button icon={<ClipboardCheck size={15} />}>My approvals ({approvals.filter((a) => a.roles.includes(role)).length})</Button>
          </Link>
        }
      />
      <View />
    </>
  )
}
