import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Filter, Info, Split, X } from 'lucide-react'
import { childProjects, getContract, getUnit, getVendor, jobs, purchaseOrders, remainingBudget, runningMargin, units, type Project } from '@/data/core'
import {
  COST_CATEGORIES,
  SOURCE_TYPES,
  allocRules,
  categoryMeta,
  knownPrIds,
  lateCosts,
  leafCodes,
  projectCommitments,
  projectCostBreakdown,
  projectGenReceipts,
  projectLedger,
  projectMonthly,
  projectRabRevisions,
  type CostCategory,
  type LedgerLine,
  type SourceType,
} from '@/data/projects'
import { Badge, Button, Callout, Card, CardHeader, DataTable, Grid, Mono, ProjectCodeChip, SearchInput, Select, Stat, StatusBadge, Timeline, cx, type Column } from '@/components/ui'
import { date, dateTime, idr, idrShort, num, pct, period } from '@/lib/format'
import { ChartTooltip, GRID, Legend, axisProps } from '@/lib/chart'
import { ACTUAL_COLOR, BudgetBar, COMMITTED_COLOR, COST_COLOR, DocLink, Money, PersonCell, RAB_COLOR, REVENUE_COLOR, Segmented, SourceBadge } from './shared'

const bn = (v: number) => `${(v / 1e9).toFixed(v >= 1e10 ? 0 : 1)} bn`

// ─── Overview ────────────────────────────────────────────────────────────────
export function OverviewTab({ p, onDrill }: { p: Project; onDrill: (c: CostCategory) => void }) {
  const lines = projectCostBreakdown(p.code)
  const monthly = projectMonthly(p.code)
  const direct = lines.filter((l) => l.category !== 'GEN overhead')
  const gen = lines.find((l) => l.category === 'GEN overhead')!
  const directActual = direct.reduce((a, l) => a + l.actual, 0)
  const directRab = direct.reduce((a, l) => a + l.rab, 0)
  const gm = p.revenue - directActual
  const chart = lines.map((l) => ({ name: l.category, category: l.category, Actual: l.actual, Committed: l.committed, RAB: l.rab }))
  const trend = monthly.map((m) => ({ name: m.label, Revenue: m.revenue, Cost: m.cost }))
  const ofRev = (v: number) => (p.revenue ? pct((v / p.revenue) * 100) : '—')

  const Row = ({ label, rab, committed, actual, bold, indent, cat, tone }: { label: ReactNode; rab?: number; committed?: number; actual: number; bold?: boolean; indent?: boolean; cat?: CostCategory; tone?: string }) => {
    const rem = rab !== undefined ? rab - actual - (committed ?? 0) : undefined
    return (
      <tr onClick={cat ? () => onDrill(cat) : undefined} className={cx('border-b border-slate-100', bold && 'bg-slate-50 font-semibold', cat && 'group cursor-pointer hover:bg-brand-50/40')}>
        <td className={cx('py-2 pr-3', indent ? 'pl-7' : 'pl-3')}>
          <span className="flex items-center gap-1.5">
            {label}
            {cat && <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-500" />}
          </span>
        </td>
        <td className="num px-3 text-right text-slate-500">{rab !== undefined ? idrShort(rab) : ''}</td>
        <td className="num px-3 text-right text-amber-700">{committed ? idrShort(committed) : ''}</td>
        <td className={cx('num px-3 text-right', tone)}>{idrShort(actual)}</td>
        <td className={cx('num px-3 text-right', rem !== undefined && rem < 0 && 'font-semibold text-red-600')}>{rem !== undefined ? idrShort(rem) : ''}</td>
        <td className="num px-3 text-right text-slate-500">{ofRev(actual)}</td>
      </tr>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <Card padded={false}>
          <div className="p-4 pb-2">
            <CardHeader
              title="Project P/L statement"
              subtitle="Contract-to-date. Click a cost line to drill down to the transactions that formed it."
              actions={<Badge tone="slate">Posting period Mar 2028 open · Feb 2028 locked</Badge>}
            />
          </div>
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  <th className="px-3 py-2">Line</th>
                  <th className="px-3 py-2 text-right">RAB</th>
                  <th className="px-3 py-2 text-right">Committed</th>
                  <th className="px-3 py-2 text-right">Actual</th>
                  <th className="px-3 py-2 text-right">Remaining</th>
                  <th className="px-3 py-2 text-right">% of revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 font-semibold">
                  <td className="px-3 py-2">Revenue recognised</td>
                  <td className="num px-3 text-right text-slate-500">{idrShort(p.contractValue)}</td>
                  <td />
                  <td className="num px-3 text-right text-emerald-700">{idrShort(p.revenue)}</td>
                  <td />
                  <td className="num px-3 text-right text-slate-500">100.0%</td>
                </tr>
                <tr>
                  <td colSpan={6} className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    Direct costs
                  </td>
                </tr>
                {direct.map((l) => (
                  <Row
                    key={l.category}
                    indent
                    cat={l.category}
                    label={
                      <>
                        {l.category}
                        <span className="font-mono text-[10px] text-slate-400">{categoryMeta[l.category].gl}</span>
                      </>
                    }
                    rab={l.rab}
                    committed={l.committed}
                    actual={l.actual}
                  />
                ))}
                <Row label="Total direct cost" rab={directRab} committed={direct.reduce((a, l) => a + l.committed, 0)} actual={directActual} bold />
                <tr className="border-b border-slate-100 font-semibold">
                  <td className="px-3 py-2">Gross margin before overhead</td>
                  <td colSpan={2} />
                  <td className="num px-3 text-right">{idrShort(gm)}</td>
                  <td />
                  <td className="num px-3 text-right">{ofRev(gm)}</td>
                </tr>
                <Row
                  indent
                  cat="GEN overhead"
                  label={
                    <>
                      Allocated GEN overhead <span className="font-mono text-[10px] text-slate-400">5180</span>
                    </>
                  }
                  rab={gen.rab}
                  committed={gen.committed}
                  actual={gen.actual}
                />
                <tr className="bg-ink-900 font-semibold text-white">
                  <td className="px-3 py-2.5">Project margin (running)</td>
                  <td className="num px-3 text-right text-slate-300" title="Planned margin: contract value − RAB">
                    {idrShort(p.contractValue - p.rab)}
                  </td>
                  <td />
                  <td className="num px-3 text-right">{idrShort(p.revenue - p.actual)}</td>
                  <td />
                  <td className="num px-3 text-right">{p.revenue ? pct(runningMargin(p)) : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="RAB vs committed vs actual by cost category" subtitle="Click a bar to open its transactions" />
          <Legend
            items={[
              { label: 'Actual', color: ACTUAL_COLOR },
              { label: 'Committed (open PR/PO)', color: COMMITTED_COLOR },
              { label: 'RAB (current)', color: RAB_COLOR },
            ]}
          />
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 16 }} barGap={2} barCategoryGap="22%">
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" {...axisProps} tickFormatter={bn} />
              <YAxis type="category" dataKey="name" {...axisProps} width={150} />
              <Tooltip content={<ChartTooltip format={idrShort} />} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="Actual" stackId="spend" fill={ACTUAL_COLOR} cursor="pointer" onClick={(_d: unknown, i: number) => onDrill(chart[i].category)} />
              <Bar dataKey="Committed" stackId="spend" fill={COMMITTED_COLOR} radius={[0, 4, 4, 0]} cursor="pointer" onClick={(_d: unknown, i: number) => onDrill(chart[i].category)} />
              <Bar dataKey="RAB" fill={RAB_COLOR} radius={[0, 4, 4, 0]} cursor="pointer" onClick={(_d: unknown, i: number) => onDrill(chart[i].category)} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Monthly revenue & cost" subtitle={monthly.length ? `${monthly[0].label} – ${monthly[monthly.length - 1].label} · March is month-to-date (depreciation & GEN run at month end)` : 'No postings yet'} />
          {monthly.length ? (
            <>
              <Legend
                items={[
                  { label: 'Revenue', color: REVENUE_COLOR },
                  { label: 'Cost', color: COST_COLOR },
                ]}
              />
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trend} margin={{ left: 4, right: 4, top: 8 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" {...axisProps} />
                  <YAxis {...axisProps} tickFormatter={bn} width={52} />
                  <Tooltip content={<ChartTooltip format={idrShort} />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="Revenue" fill={REVENUE_COLOR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Cost" fill={COST_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">Costs are blocked until RAB v1 is approved and the project is mobilised.</p>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <BudgetHealth p={p} />
        <Card>
          <CardHeader title="Audit trail" subtitle="Code, budget and allocation events" />
          <Timeline items={auditTrail(p)} />
        </Card>
      </div>
    </div>
  )
}

function BudgetHealth({ p }: { p: Project }) {
  const lines = projectCostBreakdown(p.code)
  const consumption = p.rab ? ((p.actual + p.committed) / p.rab) * 100 : 0
  const eac = p.progress > 0 ? p.actual / (p.progress / 100) : p.rab
  const fcMargin = p.contractValue ? ((p.contractValue - eac) / p.contractValue) * 100 : 0
  const over = lines.filter((l) => l.remaining < 0)
  const ahead = lines.filter((l) => l.rab > 0 && l.remaining >= 0 && ((l.actual + l.committed) / l.rab) * 100 - p.progress > 15)
  const status = over.length || eac > p.rab * 1.02 ? 'bad' : consumption - p.progress > 10 || ahead.length ? 'warn' : 'good'
  return (
    <Card>
      <CardHeader title="Budget health" subtitle="Forecast uses cost-to-date ÷ physical progress (EAC)" />
      {p.actual === 0 ? (
        <Callout tone="slate" icon={<Info size={16} />} title="No costs yet">
          RAB v1 of {idrShort(p.rab)} is approved. PRs raised against this code will be budget-checked per category.
        </Callout>
      ) : (
        <Callout
          tone={status === 'bad' ? 'red' : status === 'warn' ? 'amber' : 'green'}
          icon={status === 'good' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          title={status === 'bad' ? 'Over budget — action required' : status === 'warn' ? 'Spend running ahead of progress' : 'Within budget and on pace'}
        >
          {pct(consumption, 0)} of RAB consumed or committed at {p.progress}% progress.
        </Callout>
      )}
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Estimate at completion</dt>
          <dd className="num font-medium">{idrShort(eac)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">vs current RAB</dt>
          <dd className={cx('num font-medium', eac > p.rab ? 'text-red-600' : 'text-emerald-600')}>
            {eac > p.rab ? '+' : ''}
            {idrShort(eac - p.rab)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Forecast margin at completion</dt>
          <dd className={cx('num font-medium', fcMargin < 10 ? 'text-red-600' : fcMargin < 15 ? 'text-amber-600' : 'text-emerald-600')}>{p.contractValue ? pct(fcMargin) : '—'}</dd>
        </div>
      </dl>
      {(over.length > 0 || ahead.length > 0) && (
        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          {over.map((l) => (
            <div key={l.category} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {l.category} over RAB
              </span>
              <span className="num font-semibold text-red-700">{idrShort(l.remaining)}</span>
            </div>
          ))}
          {ahead.map((l) => (
            <div key={l.category} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {l.category} {pct(((l.actual + l.committed) / l.rab) * 100, 0)} used
              </span>
              <span className="num text-slate-500">{idrShort(l.remaining)} left</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function shiftDate(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function auditTrail(p: Project) {
  const items: { at: string; title: ReactNode; body?: ReactNode; tone?: 'green' | 'blue' | 'amber' | 'slate' | 'violet' | 'red' }[] = []
  const c = getContract(p.contractId)
  if (c) items.push({ at: shiftDate(p.start, -18) + 'T10:12', title: `Code issued from ${c.id} approval`, body: 'Automatic issuance (FAT-17)', tone: 'blue' })
  items.push({ at: shiftDate(p.start, -9) + 'T15:40', title: `RAB v1 approved — ${idrShort(p.rabBaseline)}`, body: 'Approved by Ratna Sari Dewi (Finance Director)', tone: 'green' })
  for (const r of projectRabRevisions(p.code))
    items.push({ at: r.date + 'T11:05', title: `RAB v${r.version} approved (${r.projectCode})`, body: r.rationale, tone: 'violet' })
  const leaves = leafCodes(p.code)
  if (projectGenReceipts(p.code).some((g) => g.month === '2028-02')) items.push({ at: '2028-03-04T15:05', title: 'Feb 2028 GEN allocation posted', body: 'JV-2028-03-0003', tone: 'slate' })
  for (const l of lateCosts.filter((x) => leaves.includes(x.projectCode) && x.status !== 'Rejected'))
    items.push({ at: (l.postedOn ?? l.receivedOn) + 'T09:30', title: l.status === 'Charged' ? `Late cost charged — ${idrShort(l.amount)}` : `Late cost awaiting approval — ${idrShort(l.amount)}`, body: `${l.id} · attributed to ${period(l.originalPeriod)}`, tone: l.status === 'Charged' ? 'amber' : 'red' })
  if (p.status === 'Closed') items.push({ at: shiftDate(p.end, 12) + 'T17:00', title: 'Project closed', body: 'Controlled reopening only for late costs', tone: 'slate' })
  return items
    .filter((i) => i.at.slice(0, 10) <= '2028-03-10')
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 7)
    .map((i) => ({ time: dateTime(i.at), title: i.title, body: i.body, tone: i.tone }))
}

// ─── RAB & versions ──────────────────────────────────────────────────────────
export function RabTab({ p, onDrill }: { p: Project; onDrill: (c: CostCategory) => void }) {
  const lines = projectCostBreakdown(p.code)
  const revs = projectRabRevisions(p.code)
  const [cmp, setCmp] = useState<'baseline' | 'current'>('current')
  const tot = lines.reduce((a, l) => ({ b: a.b + l.rabBaseline, r: a.r + l.rab, a: a.a + l.actual, c: a.c + l.committed }), { b: 0, r: 0, a: 0, c: 0 })
  const ref = (l: { rab: number; rabBaseline: number }) => (cmp === 'baseline' ? l.rabBaseline : l.rab)

  const cols: Column<(typeof lines)[number]>[] = [
    {
      key: 'cat',
      header: 'Cost category',
      render: (l) => (
        <div>
          <div className="font-medium text-slate-800">{l.category}</div>
          <div className="text-[11px] text-slate-500">
            <span className="font-mono">{categoryMeta[l.category].gl}</span> · {categoryMeta[l.category].basis}
          </div>
        </div>
      ),
    },
    { key: 'base', header: 'Baseline v1', align: 'right', render: (l) => idrShort(l.rabBaseline) },
    {
      key: 'delta',
      header: 'Revisions',
      align: 'right',
      render: (l) => (l.rab !== l.rabBaseline ? <span className="font-medium text-sky-700">+{idrShort(l.rab - l.rabBaseline)}</span> : <span className="text-slate-300">—</span>),
    },
    { key: 'cur', header: `Current v${p.rabVersion}`, align: 'right', render: (l) => <span className="font-medium">{idrShort(l.rab)}</span> },
    { key: 'act', header: 'Actual', align: 'right', render: (l) => idrShort(l.actual) },
    { key: 'com', header: 'Committed', align: 'right', render: (l) => <span className="text-amber-700">{l.committed ? idrShort(l.committed) : '—'}</span> },
    {
      key: 'var',
      header: cmp === 'baseline' ? 'Variance vs v1' : `Variance vs v${p.rabVersion}`,
      align: 'right',
      render: (l) => {
        const v = ref(l) - l.actual - l.committed
        return <span className={cx('font-semibold', v < 0 ? 'text-red-600' : 'text-emerald-700')}>{idrShort(v)}</span>
      },
    },
    {
      key: 'use',
      header: 'Consumption',
      width: '160px',
      render: (l) => (
        <div className="flex items-center gap-2">
          <BudgetBar rab={ref(l)} actual={l.actual} committed={l.committed} />
          <span className="num w-10 text-right text-[11px] text-slate-500">{ref(l) ? pct(((l.actual + l.committed) / ref(l)) * 100, 0) : '—'}</span>
        </div>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card padded={false} className="xl:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-2 p-4 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">RAB by cost category (FAT-07 / FAT-09)</h3>
            <p className="mt-0.5 text-xs text-slate-500">Categories follow the chart of accounts so budget and actuals compare line by line. Click a row for the causing transactions.</p>
          </div>
          <Segmented
            options={[
              { key: 'current', label: `Compare to v${p.rabVersion}` },
              { key: 'baseline', label: 'Compare to baseline v1' },
            ]}
            value={cmp}
            onChange={setCmp}
          />
        </div>
        <DataTable
          columns={cols}
          rows={lines}
          rowKey={(l) => l.category}
          onRowClick={(l) => onDrill(l.category)}
          footer={
            <tr>
              <td className="px-3 py-2.5">Total</td>
              <td className="num px-3 text-right">{idrShort(tot.b)}</td>
              <td className="num px-3 text-right text-sky-700">{tot.r !== tot.b ? `+${idrShort(tot.r - tot.b)}` : '—'}</td>
              <td className="num px-3 text-right">{idrShort(tot.r)}</td>
              <td className="num px-3 text-right">{idrShort(tot.a)}</td>
              <td className="num px-3 text-right text-amber-700">{idrShort(tot.c)}</td>
              <td className={cx('num px-3 text-right', (cmp === 'baseline' ? tot.b : tot.r) - tot.a - tot.c < 0 ? 'text-red-600' : 'text-emerald-700')}>
                {idrShort((cmp === 'baseline' ? tot.b : tot.r) - tot.a - tot.c)}
              </td>
              <td />
            </tr>
          }
        />
      </Card>
      <Card>
        <CardHeader title="Version history (FAT-08)" subtitle="The baseline is retained; every revision carries rationale and approver" />
        <ol className="space-y-3">
          {[...revs].reverse().map((r) => (
            <li key={r.projectCode + r.version} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Badge tone="violet">v{r.version}</Badge>
                  {r.projectCode !== p.code && <ProjectCodeChip code={r.projectCode} />}
                </span>
                <span className="text-[11px] text-slate-500">{date(r.date)}</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-700">{r.rationale}</p>
              <div className="mt-2 space-y-0.5">
                {r.changes.map((ch) => (
                  <div key={ch.category} className="flex justify-between text-xs">
                    <span className="text-slate-500">{ch.category}</span>
                    <span className="num font-medium text-sky-700">+{idr(ch.delta)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Requested</div>
                  <PersonCell id={r.requestedBy} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Approved</div>
                  <PersonCell id={r.approvedBy} />
                </div>
              </div>
            </li>
          ))}
          <li className="rounded-lg border border-dashed border-slate-300 p-3">
            <div className="flex items-center justify-between">
              <Badge tone="slate">v1 · baseline</Badge>
              <span className="text-[11px] text-slate-500">{date(shiftDate(p.start, -9))}</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-700">Initial RAB prepared from the tender cost build-up and approved with the contract.</p>
            <div className="num mt-1 text-sm font-semibold">{idr(p.rabBaseline)}</div>
            <div className="mt-2 border-t border-slate-100 pt-2">
              <div className="text-[10px] text-slate-400 uppercase">Approved</div>
              <PersonCell id="EMP-0002" />
            </div>
          </li>
        </ol>
      </Card>
    </div>
  )
}

// ─── Commitments ─────────────────────────────────────────────────────────────
export function CommitmentsTab({ p }: { p: Project }) {
  const rows = projectCommitments(p.code)
  const leaves = leafCodes(p.code)
  const realised = purchaseOrders.filter((po) => leaves.includes(po.projectCode) && ['Received', 'Invoiced', 'Closed'].includes(po.status))
  const cols: Column<(typeof rows)[number]>[] = [
    {
      key: 'doc',
      header: 'Document',
      render: (c) => (
        <div>
          {c.poId ? <DocLink to={`/procurement/orders/${c.poId}`}>{c.poId}</DocLink> : <DocLink to={knownPrIds.has(c.prId) ? `/procurement/requisitions/${c.prId}` : undefined}>{c.prId}</DocLink>}
          <div className="text-[11px] text-slate-500">{c.poId ? <>from {c.prId}</> : 'Purchase requisition'}</div>
        </div>
      ),
    },
    { key: 'kind', header: 'Stage', render: (c) => <Badge tone={c.kind === 'PO' ? 'sky' : 'slate'}>{c.kind === 'PO' ? 'PO issued' : 'PR (budget reserved)'}</Badge> },
    ...(leaves.length > 1 ? [{ key: 'code', header: 'Code', render: (c: (typeof rows)[number]) => <ProjectCodeChip code={c.projectCode} /> }] : []),
    {
      key: 'desc',
      header: 'Description',
      render: (c) => (
        <div className="max-w-[320px]">
          <div className="truncate text-slate-800">{c.description}</div>
          {c.vendorId && (
            <Link to={`/vendors/${c.vendorId}`} onClick={(e) => e.stopPropagation()} className="text-[11px] text-sky-700 hover:underline">
              {getVendor(c.vendorId)?.name}
            </Link>
          )}
        </div>
      ),
    },
    { key: 'cat', header: 'Category', render: (c) => <span className="text-xs">{c.category}</span> },
    { key: 'date', header: 'Date', render: (c) => <span className="text-xs whitespace-nowrap">{date(c.date)}</span> },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    { key: 'amt', header: 'Document value', align: 'right', render: (c) => <Money v={c.docAmount} muted /> },
    { key: 'open', header: 'Open commitment', align: 'right', render: (c) => <span className="font-semibold text-amber-700">{idrShort(c.openAmount)}</span> },
  ]
  const total = rows.reduce((a, c) => a + c.openAmount, 0)
  return (
    <div className="space-y-4">
      <Grid cols={4}>
        <Stat label="Open commitments" value={idrShort(total)} sub="Not yet cost — reduces remaining budget" tone="warn" />
        <Stat label="Open POs" value={rows.filter((r) => r.kind === 'PO').length} sub={idrShort(rows.filter((r) => r.kind === 'PO').reduce((a, c) => a + c.openAmount, 0))} />
        <Stat label="PRs with budget reserved" value={rows.filter((r) => r.kind === 'PR').length} sub={idrShort(rows.filter((r) => r.kind === 'PR').reduce((a, c) => a + c.openAmount, 0))} />
        <Stat label="Remaining after commitments" value={idrShort(remainingBudget(p))} sub={`RAB ${idrShort(p.rab)} − actual ${idrShort(p.actual)} − committed`} tone={remainingBudget(p) < 0 ? 'bad' : 'good'} />
      </Grid>
      <Callout tone="blue" icon={<Info size={16} />} title="When does a commitment become cost? (FAT-02, FAT-10)">
        A PR reserves budget at approval (budget check); a PO holds it as a commitment; it becomes actual cost at goods or service receipt — not at PO issuance.
        Partially received POs show only the unreceived balance here.
      </Callout>
      <Card padded={false}>
        <div className="p-4 pb-2">
          <CardHeader title="Open PRs & POs" subtitle={`${rows.length} documents on ${leaves.length > 1 ? `${p.code} and sub-codes` : p.code}`} />
        </div>
        <DataTable
          columns={cols}
          rows={rows}
          rowKey={(c) => c.id}
          empty="No open commitments on this code"
          footer={
            rows.length ? (
              <tr>
                <td className="px-3 py-2.5" colSpan={cols.length - 1}>
                  Total open commitments
                </td>
                <td className="num px-3 text-right text-amber-700">{idrShort(total)}</td>
              </tr>
            ) : undefined
          }
        />
      </Card>
      {realised.length > 0 && (
        <Card padded={false}>
          <div className="p-4 pb-2">
            <CardHeader title="Realised purchase orders" subtitle="Received / invoiced — already in actual cost, shown for reference" />
          </div>
          <DataTable
            dense
            columns={[
              { key: 'po', header: 'PO', render: (po) => <DocLink to={`/procurement/orders/${po.id}`}>{po.id}</DocLink> },
              { key: 'd', header: 'Description', render: (po) => <span className="text-xs">{po.description}</span> },
              { key: 'v', header: 'Vendor', render: (po) => <span className="text-xs">{getVendor(po.vendorId)?.name}</span> },
              { key: 's', header: 'Status', render: (po) => <StatusBadge status={po.status} /> },
              { key: 'a', header: 'Amount', align: 'right', render: (po) => idrShort(po.amount) },
            ]}
            rows={realised}
            rowKey={(po) => po.id}
          />
        </Card>
      )}
    </div>
  )
}

// ─── Transactions ledger ─────────────────────────────────────────────────────
const PAGE = 60

export function LedgerTab({ p, category, onCategory }: { p: Project; category: CostCategory | ''; onCategory: (c: CostCategory | '') => void }) {
  const all = projectLedger(p.code)
  const [source, setSource] = useState<SourceType | ''>('')
  const [kind, setKind] = useState<'all' | 'Cost' | 'Revenue'>('all')
  const [per, setPer] = useState('')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const leaves = leafCodes(p.code)
  const periods = [...new Set(all.map((l) => l.postingPeriod))].sort().reverse()

  const rows = useMemo(
    () =>
      all.filter(
        (l) =>
          (!category || l.category === category) &&
          (!source || l.source === source) &&
          (kind === 'all' || l.kind === kind) &&
          (!per || l.postingPeriod === per) &&
          (!q || `${l.docId} ${l.description} ${l.counterparty ?? ''}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [all, category, source, kind, per, q],
  )
  const cost = rows.filter((l) => l.kind === 'Cost').reduce((a, l) => a + l.amount, 0)
  const rev = rows.filter((l) => l.kind === 'Revenue').reduce((a, l) => a + l.amount, 0)
  const catLine = category ? projectCostBreakdown(p.code).find((l) => l.category === category) : undefined

  const cols: Column<LedgerLine>[] = [
    { key: 'date', header: 'Date', render: (l) => <span className="text-xs whitespace-nowrap">{date(l.date)}</span> },
    {
      key: 'per',
      header: 'Period',
      render: (l) => (
        <div className="text-xs whitespace-nowrap">
          {period(l.postingPeriod)}
          {l.attributionPeriod !== l.postingPeriod && <div className="text-[10px] text-amber-700">attributed {period(l.attributionPeriod)}</div>}
        </div>
      ),
    },
    ...(leaves.length > 1 ? [{ key: 'code', header: 'Code', render: (l: LedgerLine) => <ProjectCodeChip code={l.projectCode} /> }] : []),
    { key: 'cat', header: 'Category', render: (l) => <span className="text-xs whitespace-nowrap">{l.kind === 'Revenue' ? <span className="font-medium text-emerald-700">Revenue</span> : l.category}</span> },
    {
      key: 'src',
      header: 'Source',
      render: (l) => (
        <div className="flex flex-col items-start gap-0.5">
          <SourceBadge source={l.source} />
          {l.legacy && <span className="text-[10px] text-slate-400">SAP B1 archive</span>}
        </div>
      ),
    },
    { key: 'doc', header: 'Document', render: (l) => <DocLink to={l.docLink}>{l.docId}</DocLink> },
    {
      key: 'desc',
      header: 'Description',
      render: (l) => (
        <div className="max-w-[340px]">
          <div className="truncate text-xs text-slate-700" title={l.description}>
            {l.description}
          </div>
          {l.counterparty && <div className="truncate text-[11px] text-slate-400">{l.counterparty.startsWith('CUS') ? 'Customer billing' : l.counterparty}</div>}
        </div>
      ),
    },
    { key: 'amt', header: 'Amount', align: 'right', render: (l) => <span className={cx('whitespace-nowrap', l.kind === 'Revenue' ? 'text-emerald-700' : 'text-slate-900')}>{idr(l.amount)}</span> },
  ]

  return (
    <div className="space-y-4">
      {category && catLine && (
        <Callout tone="blue" icon={<Filter size={16} />} title={`Drill-down: ${category}`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              RAB <b className="num">{idrShort(catLine.rab)}</b>
            </span>
            <span>
              Actual <b className="num">{idrShort(catLine.actual)}</b>
            </span>
            <span>
              Committed <b className="num">{idrShort(catLine.committed)}</b>
            </span>
            <span className={catLine.remaining < 0 ? 'font-semibold text-red-700' : ''}>
              Remaining <b className="num">{idrShort(catLine.remaining)}</b>
            </span>
            <button onClick={() => onCategory('')} className="ml-auto inline-flex items-center gap-1 text-xs font-medium underline">
              <X size={12} /> Clear
            </button>
          </div>
        </Callout>
      )}
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Document, description, vendor…" className="w-full sm:w-60" />
          <Select value={category} onChange={(e) => onCategory(e.target.value as CostCategory | '')}>
            <option value="">All categories</option>
            {COST_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select value={source} onChange={(e) => setSource(e.target.value as SourceType | '')}>
            <option value="">All sources</option>
            {SOURCE_TYPES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select value={per} onChange={(e) => setPer(e.target.value)}>
            <option value="">All periods</option>
            {periods.map((m) => (
              <option key={m} value={m}>
                {period(m)}
                {m <= '2028-02' ? ' (locked)' : ' (open)'}
              </option>
            ))}
          </Select>
          <Segmented
            options={[
              { key: 'all', label: 'All' },
              { key: 'Cost', label: 'Cost' },
              { key: 'Revenue', label: 'Revenue' },
            ]}
            value={kind}
            onChange={setKind}
          />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-slate-100 bg-slate-50/60 px-3 py-2 text-xs text-slate-600">
          <span>
            <b className="num text-slate-900">{num(rows.length)}</b> lines
          </span>
          <span>
            Cost <b className="num text-slate-900">{idr(cost)}</b>
          </span>
          <span>
            Revenue <b className="num text-emerald-700">{idr(rev)}</b>
          </span>
          {!category && !source && !per && !q && kind === 'all' && (
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 size={12} /> Σ cost reconciles to P/L actual {idrShort(p.actual)}
            </span>
          )}
        </div>
        <DataTable columns={cols} rows={rows.slice(0, limit)} rowKey={(l) => l.id} dense empty="No transactions match the filters" />
        {rows.length > limit && (
          <div className="border-t border-slate-200 p-3 text-center">
            <Button size="sm" onClick={() => setLimit((l) => l + PAGE)}>
              Show {Math.min(PAGE, rows.length - limit)} more of {rows.length - limit} remaining
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Allocations ─────────────────────────────────────────────────────────────
export function AllocationsTab({ p }: { p: Project }) {
  const rec = projectGenReceipts(p.code)
  const leaves = leafCodes(p.code)
  const total = rec.reduce((a, r) => a + r.amount, 0)
  const byPool = (pool: string) => rec.filter((r) => r.pool === pool).reduce((a, r) => a + r.amount, 0)
  const ruleName = (id: string) => allocRules.find((r) => r.id === id)?.name ?? id
  type Row = { key: string; month: string; pool: string; code: string; rule: string; driver: string; share?: number; dv?: string; amount: number; legacy: boolean }
  const rows: Row[] = rec.flatMap((r): Row[] =>
    r.lines
      ? r.lines.map((l): Row => ({
          key: `${r.projectCode}-${l.month}-${l.ruleId}`,
          month: l.month,
          pool: l.pool,
          code: r.projectCode,
          rule: `${l.ruleId} · ${ruleName(l.ruleId)}`,
          driver: l.driver,
          share: l.share,
          dv: `${l.driver === 'Revenue' ? idrShort(l.driverValue) : num(l.driverValue)} of ${l.driver === 'Revenue' ? idrShort(l.driverTotal) : num(l.driverTotal)}`,
          amount: l.amount,
          legacy: false,
        }))
      : [{ key: `${r.projectCode}-${r.month}-${r.pool}`, month: r.month, pool: r.pool, code: r.projectCode, rule: 'FY2027 pool — summary allocation', driver: 'Mixed', amount: r.amount, legacy: true }],
  )
  return (
    <div className="space-y-4">
      <Grid cols={4}>
        <Stat label="GEN overhead received" value={idrShort(total)} sub={p.revenue ? `${pct((total / p.revenue) * 100)} of revenue` : undefined} />
        <Stat label="From GEN-HO" value={idrShort(byPool('GEN-HO'))} sub="Head office overhead" />
        <Stat label="From GEN-BPN" value={idrShort(byPool('GEN-BPN'))} sub="Balikpapan ops overhead" />
        <Stat label="Next run" value="Mar 2028" sub="Month-end, after cost cut-off" to="/costing/allocation" />
      </Grid>
      <Callout tone="slate" icon={<Split size={16} />} title="Bidirectional trail (FAT-22)">
        Every allocated line below traces to its GEN origin, rule and driver. From the GEN side, the same run shows the distribution across all receiving projects.{' '}
        <Link to={`/costing/allocation?project=${leaves[0]}`} className="inline-flex items-center gap-1 font-medium underline">
          Open in allocation engine <ArrowRight size={12} />
        </Link>
      </Callout>
      <Card padded={false}>
        <DataTable
          columns={[
            { key: 'm', header: 'Month', render: (r: Row) => <span className="text-xs whitespace-nowrap">{period(r.month)}</span> },
            { key: 'pool', header: 'GEN origin', render: (r: Row) => <ProjectCodeChip code={r.pool} /> },
            ...(leaves.length > 1 ? [{ key: 'code', header: 'Receiving code', render: (r: Row) => <ProjectCodeChip code={r.code} /> }] : []),
            { key: 'rule', header: 'Rule', render: (r: Row) => <span className={cx('text-xs', r.legacy && 'text-slate-500')}>{r.rule}</span> },
            { key: 'drv', header: 'Driver', render: (r: Row) => <span className="text-xs">{r.driver}</span> },
            { key: 'dv', header: 'Project / total', align: 'right', render: (r: Row) => <span className="text-xs text-slate-600">{r.dv ?? '—'}</span> },
            { key: 'share', header: 'Proportion', align: 'right', render: (r: Row) => (r.share !== undefined ? <span className="font-medium">{pct(r.share * 100)}</span> : '—') },
            { key: 'amt', header: 'Amount', align: 'right', render: (r: Row) => <span className="font-medium">{idr(r.amount)}</span> },
          ]}
          rows={rows}
          rowKey={(r) => r.key}
          dense
          empty="No GEN overhead received yet — allocation starts from the first month with activity"
          footer={
            rows.length ? (
              <tr>
                <td className="px-3 py-2.5" colSpan={leaves.length > 1 ? 7 : 6}>
                  Total — equals the “Allocated GEN overhead” line of the P/L
                </td>
                <td className="num px-3 text-right">{idr(total)}</td>
              </tr>
            ) : undefined
          }
        />
      </Card>
    </div>
  )
}

// ─── Structure: sub-codes, jobs, units ───────────────────────────────────────
export function StructureTab({ p }: { p: Project }) {
  const navigate = useNavigate()
  const kids = childProjects(p.code)
  const leaves = leafCodes(p.code)
  const js = jobs.filter((j) => leaves.includes(j.projectCode)).sort((a, b) => b.date.localeCompare(a.date))
  const us = units.filter((u) => u.projectCode && leaves.includes(u.projectCode))
  return (
    <div className="space-y-4">
      {kids.length > 0 && (
        <Card padded={false}>
          <div className="p-4 pb-2">
            <CardHeader title="Sub-codes" subtitle="Sub-job P/L — the parent is the sum of these lines" />
          </div>
          <DataTable
            columns={[
              { key: 'c', header: 'Code', render: (k: Project) => <ProjectCodeChip code={k.code} showName /> },
              { key: 's', header: 'Status', render: (k: Project) => <StatusBadge status={k.status} /> },
              { key: 'cv', header: 'Contract share', align: 'right', render: (k: Project) => idrShort(k.contractValue) },
              { key: 'rab', header: 'RAB', align: 'right', render: (k: Project) => idrShort(k.rab) },
              { key: 'a', header: 'Actual', align: 'right', render: (k: Project) => idrShort(k.actual) },
              { key: 'cm', header: 'Committed', align: 'right', render: (k: Project) => <span className="text-amber-700">{idrShort(k.committed)}</span> },
              { key: 'r', header: 'Revenue', align: 'right', render: (k: Project) => idrShort(k.revenue) },
              { key: 'm', header: 'Margin', align: 'right', render: (k: Project) => pct(runningMargin(k)) },
              { key: 'b', header: 'Budget use', width: '130px', render: (k: Project) => <BudgetBar rab={k.rab} actual={k.actual} committed={k.committed} /> },
            ]}
            rows={kids}
            rowKey={(k) => k.code}
            onRowClick={(k) => navigate(`/projects/${k.code}`)}
          />
        </Card>
      )}
      <Card padded={false}>
        <div className="p-4 pb-2">
          <CardHeader
            title="Job orders"
            subtitle="Verified jobs drive timesheet, fuel and depreciation cost onto this code"
            actions={
              <Link to="/ops/jobs" className="text-xs font-medium text-sky-700 hover:underline">
                All jobs →
              </Link>
            }
          />
        </div>
        <DataTable
          columns={[
            { key: 'id', header: 'Job', render: (j: (typeof js)[number]) => <Mono className="text-sky-700">{j.id}</Mono> },
            { key: 't', header: 'Title', render: (j: (typeof js)[number]) => <span className="text-xs">{j.title}</span> },
            ...(leaves.length > 1 ? [{ key: 'code', header: 'Code', render: (j: (typeof js)[number]) => <ProjectCodeChip code={j.projectCode} /> }] : []),
            { key: 'd', header: 'Date', render: (j: (typeof js)[number]) => <span className="text-xs whitespace-nowrap">{date(j.date)}</span> },
            {
              key: 'u',
              header: 'Units',
              render: (j: (typeof js)[number]) => (
                <span className="flex flex-wrap gap-1">
                  {j.unitIds.map((u) => (
                    <Link key={u} to={`/fleet/units/${u}`} onClick={(e) => e.stopPropagation()} className="font-mono text-[11px] text-sky-700 hover:underline">
                      {u}
                    </Link>
                  ))}
                  {!j.unitIds.length && <span className="text-xs text-slate-400">—</span>}
                </span>
              ),
            },
            { key: 'q', header: 'Billable', align: 'right', render: (j: (typeof js)[number]) => <span className="text-xs">{j.rate ? `${num(j.qty)} ${j.basis.replace('per ', '')}` : 'Lump sum'}</span> },
            { key: 'v', header: 'Value', align: 'right', render: (j: (typeof js)[number]) => (j.rate ? idrShort(j.qty * j.rate) : '—') },
            { key: 's', header: 'Status', render: (j: (typeof js)[number]) => <StatusBadge status={j.status} /> },
          ]}
          rows={js}
          rowKey={(j) => j.id}
          onRowClick={(j) => navigate(`/ops/jobs/${j.id}`)}
          empty="No job orders on this code yet"
        />
      </Card>
      <Card padded={false}>
        <div className="p-4 pb-2">
          <CardHeader title="Units assigned" subtitle="Depreciation is allocated to the code by operating hours (FAT-26)" />
        </div>
        <DataTable
          columns={[
            { key: 'id', header: 'Unit', render: (u: (typeof us)[number]) => <Mono className="text-sky-700">{u.id}</Mono> },
            { key: 't', header: 'Type', render: (u: (typeof us)[number]) => <span className="text-xs">{u.type}</span> },
            { key: 'c', header: 'Code', render: (u: (typeof us)[number]) => <ProjectCodeChip code={u.projectCode!} /> },
            { key: 'h', header: 'Operating hrs MTD', align: 'right', render: (u: (typeof us)[number]) => num(u.hoursMTD.operating) },
            { key: 'i', header: 'Idle hrs MTD', align: 'right', render: (u: (typeof us)[number]) => num(u.hoursMTD.idle) },
            {
              key: 'dep',
              header: 'Depreciation MTD (est.)',
              align: 'right',
              render: (u: (typeof us)[number]) => idrShort(((getUnit(u.id)!.acquisitionValue / 8 / 12) * u.hoursMTD.operating) / Math.max(1, u.hoursMTD.operating + u.hoursMTD.idle + u.hoursMTD.maintenance)),
            },
            { key: 's', header: 'Status', render: (u: (typeof us)[number]) => <StatusBadge status={u.status} /> },
          ]}
          rows={us}
          rowKey={(u) => u.id}
          onRowClick={(u) => navigate(`/fleet/units/${u.id}`)}
          empty="No fleet units currently assigned"
        />
      </Card>
    </div>
  )
}
