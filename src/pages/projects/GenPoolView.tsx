import { Link } from 'react-router-dom'
import { ArrowRight, Lock, Split } from 'lucide-react'
import { getProject, remainingBudget, type Project } from '@/data/core'
import { genPoolSummary, postedAllocation, projectCommitments, type AllocRule, type GenPool } from '@/data/projects'
import { Badge, Callout, Card, CardHeader, DataTable, DescList, Grid, PageHeader, ProjectCodeChip, Stat, StatusBadge } from '@/components/ui'
import { date, idr, idrShort, pct } from '@/lib/format'
import { BudgetBar, DocLink, MODULE, PersonCell } from './shared'

export function GenPoolView({ p }: { p: Project }) {
  const pool = p.code as GenPool
  const s = genPoolSummary(pool)
  const feb = postedAllocation('2028-02').filter((l) => l.pool === pool)
  const byProject = [...new Set(feb.map((l) => l.projectCode))]
    .map((code) => ({ code, amount: feb.filter((l) => l.projectCode === code).reduce((a, l) => a + l.amount, 0) }))
    .sort((a, b) => b.amount - a.amount)
  const febTotal = byProject.reduce((a, r) => a + r.amount, 0)
  const commits = projectCommitments(p.code)
  const ytd = (r: AllocRule) => r.amounts['2028-01'] + r.amounts['2028-02'] + r.amounts['2028-03']

  return (
    <>
      <PageHeader
        module={MODULE}
        crumbs={[{ label: 'Project codes & P/L', to: '/projects' }, { label: p.code }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{p.code}</span>
            <span className="text-slate-400">·</span>
            <span>{p.name}</span>
            <Badge tone="slate">Overhead pool</Badge>
          </span>
        }
        subtitle="GEN codes hold overhead that cannot be charged directly. There is no revenue and no P/L here — the allocable part is distributed to project codes every month-end."
        actions={
          <Link to={`/costing/allocation?pool=${pool}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-900 bg-ink-900 px-3.5 text-sm font-medium text-white hover:bg-ink-800">
            <Split size={15} /> Open allocation engine
          </Link>
        }
      />
      <Card className="mb-4">
        <DescList
          cols={4}
          items={[
            { label: 'Budget owner', value: <PersonCell id={p.pmId} /> },
            { label: 'Location', value: p.site },
            { label: 'Budget year', value: `${date(p.start)} – ${date(p.end)}` },
            { label: 'Status', value: <StatusBadge status={p.status} /> },
          ]}
        />
      </Card>
      <Grid cols={6} className="mb-5">
        <Stat label="Annual RAB" value={idrShort(p.rab)} sub="Company budget via GEN (FAT-11)" />
        <Stat label="Cost YTD" value={idrShort(p.actual)} sub={`${pct((p.actual / p.rab) * 100, 0)} of annual RAB`} />
        <Stat label="Committed" value={idrShort(p.committed)} sub={`${commits.length} open PRs`} tone="warn" />
        <Stat label="Allocated to projects" value={idrShort(s.allocated)} sub="Jan & Feb runs posted" tone="good" />
        <Stat label="Retained (company level)" value={idrShort(s.retained)} sub="Rules with no driver" />
        <Stat label="Awaiting Mar run" value={idrShort(s.awaiting)} sub={`Remaining budget ${idrShort(remainingBudget(p))}`} />
      </Grid>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card padded={false} className="xl:col-span-2">
          <div className="p-4 pb-2">
            <CardHeader title="Cost pool by rule" subtitle="Each rule carries its allocation driver; rules without a driver stay at company level" />
          </div>
          <DataTable
            columns={[
              {
                key: 'r',
                header: 'Rule',
                render: (r: AllocRule) => (
                  <div>
                    <div className="font-medium text-slate-800">{r.name}</div>
                    <div className="text-[11px] text-slate-500">
                      <span className="font-mono">{r.id}</span> · GL {r.gl}
                    </div>
                  </div>
                ),
              },
              { key: 'd', header: 'Driver', render: (r: AllocRule) => (r.driver ? <Badge tone="sky">{r.driver}</Badge> : <Badge tone="slate">Retained</Badge>) },
              { key: 'j', header: 'Jan', align: 'right', render: (r: AllocRule) => idrShort(r.amounts['2028-01']) },
              { key: 'f', header: 'Feb', align: 'right', render: (r: AllocRule) => idrShort(r.amounts['2028-02']) },
              { key: 'm', header: 'Mar MTD', align: 'right', render: (r: AllocRule) => <span className="text-slate-500">{idrShort(r.amounts['2028-03'])}</span> },
              { key: 'y', header: 'YTD', align: 'right', render: (r: AllocRule) => <span className="font-medium">{idrShort(ytd(r))}</span> },
            ]}
            rows={s.rules}
            rowKey={(r) => r.id}
            footer={
              <tr>
                <td className="px-3 py-2.5" colSpan={5}>
                  Total — equals cost YTD on {p.code}
                </td>
                <td className="num px-3 text-right">{idrShort(s.ytd)}</td>
              </tr>
            }
          />
        </Card>
        <Card>
          <CardHeader
            title="Feb 2028 distribution"
            subtitle={
              <span className="inline-flex items-center gap-1">
                <Lock size={11} /> Posted 04 Mar 2028 · <DocLink to="/finance/gl/JV-2028-03-0003">JV-2028-03-0003</DocLink>
              </span>
            }
          />
          <div className="space-y-3">
            {byProject.map((r) => (
              <div key={r.code}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <ProjectCodeChip code={r.code} />
                  <span className="num">
                    <b>{idrShort(r.amount)}</b> <span className="text-slate-500">· {pct((r.amount / febTotal) * 100)}</span>
                  </span>
                </div>
                <div className="mt-1 truncate text-[11px] text-slate-500">{getProject(r.code)?.name}</div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${(r.amount / byProject[0].amount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold">
            <span>Allocated in Feb</span>
            <span className="num">{idr(febTotal)}</span>
          </div>
          <Link to={`/costing/allocation?pool=${pool}`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline">
            Trace rule by rule <ArrowRight size={12} />
          </Link>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card padded={false} className="xl:col-span-2">
          <div className="p-4 pb-2">
            <CardHeader title="Open commitments on this GEN code" />
          </div>
          <DataTable
            columns={[
              { key: 'id', header: 'PR', render: (c: (typeof commits)[number]) => <DocLink>{c.prId}</DocLink> },
              { key: 'd', header: 'Description', render: (c: (typeof commits)[number]) => <span className="text-xs">{c.description}</span> },
              { key: 'dt', header: 'Date', render: (c: (typeof commits)[number]) => <span className="text-xs">{date(c.date)}</span> },
              { key: 's', header: 'Status', render: (c: (typeof commits)[number]) => <StatusBadge status={c.status} /> },
              { key: 'a', header: 'Open amount', align: 'right', render: (c: (typeof commits)[number]) => <span className="text-amber-700">{idrShort(c.openAmount)}</span> },
            ]}
            rows={commits}
            rowKey={(c) => c.id}
          />
        </Card>
        <Card>
          <CardHeader title="Budget use" />
          <BudgetBar rab={p.rab} actual={p.actual} committed={p.committed} />
          <p className="mt-3 text-xs text-slate-500">
            Transactions without a project code are rejected at entry (FAT-18). Posting to {p.code} is the controlled exception for overhead — it is then either allocated or
            retained, never lost.
          </p>
          <div className="mt-3">
            <Callout tone="slate">Cost-to-date is Jan–Mar 2028 (code opened with the 2028 budget year).</Callout>
          </div>
        </Card>
      </div>
    </>
  )
}
