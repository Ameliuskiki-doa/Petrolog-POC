import { Fragment, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown, ChevronRight, Download, FileSignature, GitBranch, Lock, Plus, Split } from 'lucide-react'
import {
  businessLines,
  childProjects,
  contracts,
  getContract,
  getCustomer,
  projects,
  remainingBudget,
  runningMargin,
  type BusinessLine,
  type Project,
  type ProjectStatus,
} from '@/data/core'
import { businessLineRollup, genPoolSummary, type PLRow } from '@/data/projects'
import { Button, Callout, Card, CardHeader, Grid, Modal, PageHeader, ProjectCodeChip, SearchInput, Select, Stat, StatusBadge, Stepper, Tabs, cx } from '@/components/ui'
import { idrShort, pct, date } from '@/lib/format'
import { ChartTooltip, GRID, Legend, axisProps } from '@/lib/chart'
import { useToast } from '@/lib/app-state'
import { BLTag, BudgetBar, COST_COLOR, MODULE, MarginCell, PersonCell, ProgressCell, REVENUE_COLOR } from './shared'

type TabKey = 'registry' | 'gen' | 'rollup'
const STATUSES: ProjectStatus[] = ['Planning', 'Active', 'Closing', 'Closed', 'On Hold']

const isGen = (p: Project) => p.code.startsWith('GEN')
const margin = (r: PLRow) => (r.revenue ? ((r.revenue - r.actual) / r.revenue) * 100 : 0)

export default function ProjectList() {
  const [tab, setTab] = useState<TabKey>('registry')
  const [newOpen, setNewOpen] = useState(false)
  const toast = useToast()
  const roots = projects.filter((p) => !p.parent && !isGen(p))
  const gens = projects.filter(isGen)
  const tot = roots.reduce(
    (a, p) => ({ cv: a.cv + (p.status !== 'Closed' ? p.contractValue : 0), rev: a.rev + p.revenue, act: a.act + p.actual, com: a.com + p.committed, rab: a.rab + p.rab }),
    { cv: 0, rev: 0, act: 0, com: 0, rab: 0 },
  )
  const overBudget = projects.filter((p) => !isGen(p) && remainingBudget(p) < 0).length

  return (
    <>
      <PageHeader
        module={MODULE}
        title="Project codes & P/L"
        subtitle="Every transaction line carries a project code. Remaining budget = RAB − actuals − commitments; running margin is on revenue recognised to date."
        actions={
          <>
            <Button icon={<Download size={15} />} onClick={() => toast('Portfolio P/L exported to Excel (11 codes)', 'info')}>
              Export
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setNewOpen(true)}>
              New project code
            </Button>
          </>
        }
      />

      <Grid cols={6} className="mb-5">
        <Stat label="Open contract value" value={idrShort(tot.cv)} sub={`${roots.filter((p) => p.status !== 'Closed').length} live codes`} />
        <Stat label="Revenue to date" value={idrShort(tot.rev)} sub="Recognised via Surat Konversi" />
        <Stat label="Actual cost to date" value={idrShort(tot.act)} sub={`${pct((tot.act / tot.rab) * 100)} of RAB consumed`} />
        <Stat label="Running margin" value={pct(((tot.rev - tot.act) / tot.rev) * 100)} sub="After allocated GEN overhead" tone="good" />
        <Stat label="Open commitments" value={idrShort(tot.com)} sub="PRs & POs not yet cost" tone="warn" />
        <Stat label="Remaining budget" value={idrShort(tot.rab - tot.act - tot.com)} sub={overBudget ? `${overBudget} code over RAB` : 'All codes within RAB'} tone={overBudget ? 'bad' : 'good'} />
      </Grid>

      <Tabs<TabKey>
        tabs={[
          { key: 'registry', label: 'Project code registry', count: projects.length - gens.length },
          { key: 'gen', label: 'Overhead codes (GEN)', count: gens.length },
          { key: 'rollup', label: 'P/L roll-up: project → business line → company' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'registry' && <Registry />}
      {tab === 'gen' && <GenCodes codes={gens} />}
      {tab === 'rollup' && <Rollup />}

      <NewCodeModal open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  )
}

// ─── Registry ────────────────────────────────────────────────────────────────
function Registry() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [bl, setBl] = useState<BusinessLine | ''>('')
  const [status, setStatus] = useState<ProjectStatus | ''>('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const matches = (p: Project) =>
    (!bl || p.businessLine === bl) &&
    (!status || p.status === status) &&
    (!q || `${p.code} ${p.name} ${getCustomer(p.customerId)?.name ?? ''} ${p.site}`.toLowerCase().includes(q.toLowerCase()))

  const rows = useMemo(() => {
    const out: { p: Project; depth: number; hasKids: boolean }[] = []
    for (const r of projects.filter((p) => !p.parent && !isGen(p))) {
      const kids = childProjects(r.code)
      const kidMatches = kids.filter(matches)
      if (!matches(r) && !kidMatches.length) continue
      out.push({ p: r, depth: 0, hasKids: kids.length > 0 })
      if (!collapsed[r.code]) for (const k of matches(r) ? kids : kidMatches) out.push({ p: k, depth: 1, hasKids: false })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, bl, status, collapsed])

  const totals = rows
    .filter((r) => r.depth === 0)
    .reduce((a, { p }) => ({ cv: a.cv + p.contractValue, rab: a.rab + p.rab, com: a.com + p.committed, act: a.act + p.actual, rev: a.rev + p.revenue }), { cv: 0, rab: 0, com: 0, act: 0, rev: 0 })

  const th = 'px-3 py-2 whitespace-nowrap'
  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search code, name, customer, site…" className="w-full sm:w-72" />
        <Select value={bl} onChange={(e) => setBl(e.target.value as BusinessLine | '')}>
          <option value="">All business lines</option>
          {(['HL', 'PS', 'GS'] as const).map((b) => (
            <option key={b} value={b}>
              {businessLines[b].name}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus | '')}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-[#2a78d6]" /> Actual
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-[#eda100]" /> Committed
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-slate-100 ring-1 ring-slate-200" /> RAB headroom
          </span>
        </div>
      </div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[1320px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <th className={th}>Project code</th>
              <th className={th}>BL</th>
              <th className={th}>Customer</th>
              <th className={th}>PM</th>
              <th className={th}>Status</th>
              <th className={cx(th, 'text-right')}>Contract</th>
              <th className={cx(th, 'text-right')}>RAB</th>
              <th className={cx(th, 'text-right')}>Committed</th>
              <th className={cx(th, 'text-right')}>Actual</th>
              <th className={cx(th, 'text-right')}>Remaining</th>
              <th className={th} style={{ width: 110 }}>
                Budget use
              </th>
              <th className={cx(th, 'text-right')}>Revenue</th>
              <th className={cx(th, 'text-right')}>Margin</th>
              <th className={th}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={14} className="px-3 py-10 text-center text-sm text-slate-400">
                  No project codes match the filters
                </td>
              </tr>
            )}
            {rows.map(({ p, depth, hasKids }) => {
              const rem = remainingBudget(p)
              return (
                <tr
                  key={p.code}
                  onClick={() => navigate(`/projects/${p.code}`)}
                  className={cx('cursor-pointer border-b border-slate-100 hover:bg-brand-50/40', depth === 1 && 'bg-slate-50/60')}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 22 }}>
                      {hasKids ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCollapsed((c) => ({ ...c, [p.code]: !c[p.code] }))
                          }}
                          className="rounded p-0.5 text-slate-500 hover:bg-slate-200"
                          aria-label="Toggle sub-codes"
                        >
                          {collapsed[p.code] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </button>
                      ) : depth === 1 ? (
                        <GitBranch size={12} className="mx-0.5 text-slate-400" />
                      ) : (
                        <span className="w-[18px]" />
                      )}
                      <div className="min-w-0">
                        <ProjectCodeChip code={p.code} />
                        <div className="mt-0.5 max-w-[230px] truncate text-xs text-slate-600">{p.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3">
                    <BLTag bl={p.businessLine} />
                  </td>
                  <td className="max-w-[170px] truncate px-3 text-xs text-slate-700">{depth === 0 ? getCustomer(p.customerId)?.name : <span className="text-slate-400">↳ same contract</span>}</td>
                  <td className="px-3">{depth === 0 && <PersonCell id={p.pmId} />}</td>
                  <td className="px-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="num px-3 text-right">{idrShort(p.contractValue)}</td>
                  <td className="num px-3 text-right">
                    {idrShort(p.rab)}
                    {p.rabVersion > 1 && <span className="ml-1 rounded bg-sky-50 px-1 text-[10px] text-sky-700">v{p.rabVersion}</span>}
                  </td>
                  <td className="num px-3 text-right text-amber-700">{p.committed ? idrShort(p.committed) : '—'}</td>
                  <td className="num px-3 text-right font-medium text-slate-900">{p.actual ? idrShort(p.actual) : '—'}</td>
                  <td className={cx('num px-3 text-right', rem < 0 ? 'font-semibold text-red-600' : 'text-slate-700')}>{idrShort(rem)}</td>
                  <td className="px-3">
                    <BudgetBar rab={p.rab} actual={p.actual} committed={p.committed} />
                  </td>
                  <td className="num px-3 text-right">{p.revenue ? idrShort(p.revenue) : '—'}</td>
                  <td className="num px-3 text-right">
                    <MarginCell value={runningMargin(p)} revenue={p.revenue} />
                  </td>
                  <td className="px-3">
                    <ProgressCell value={p.progress} />
                  </td>
                </tr>
              )
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold">
              <tr>
                <td className="px-3 py-2.5" colSpan={5}>
                  Total (top-level codes shown)
                </td>
                <td className="num px-3 text-right">{idrShort(totals.cv)}</td>
                <td className="num px-3 text-right">{idrShort(totals.rab)}</td>
                <td className="num px-3 text-right text-amber-700">{idrShort(totals.com)}</td>
                <td className="num px-3 text-right">{idrShort(totals.act)}</td>
                <td className="num px-3 text-right">{idrShort(totals.rab - totals.act - totals.com)}</td>
                <td className="px-3">
                  <BudgetBar rab={totals.rab} actual={totals.act} committed={totals.com} />
                </td>
                <td className="num px-3 text-right">{idrShort(totals.rev)}</td>
                <td className="num px-3 text-right">{totals.rev ? pct(((totals.rev - totals.act) / totals.rev) * 100) : '—'}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500">
        Parent codes aggregate their sub-codes (FAT-17). Sub-codes let P/L be read at contract level and at sub-job level. Click a row for the project P/L.
      </div>
    </Card>
  )
}

// ─── GEN codes ───────────────────────────────────────────────────────────────
function GenCodes({ codes }: { codes: Project[] }) {
  const navigate = useNavigate()
  return (
    <div className="space-y-4">
      <Callout tone="slate" icon={<Split size={16} />} title="Overhead that cannot be charged directly sits on a GEN code">
        GEN-HO and GEN-BPN hold overhead budget not tied to a project (FAT-11). A month-end driver-based run distributes the allocable part to project codes;
        the remainder is retained at company level. <Link to="/costing/allocation" className="font-medium underline">Open the GEN allocation engine →</Link>
      </Callout>
      <Card padded={false}>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                <th className="px-3 py-2">GEN code</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2 text-right">Annual RAB</th>
                <th className="px-3 py-2 text-right">Cost YTD</th>
                <th className="px-3 py-2 text-right">Committed</th>
                <th className="px-3 py-2 text-right">Allocated to projects</th>
                <th className="px-3 py-2 text-right">Retained (company)</th>
                <th className="px-3 py-2 text-right">Awaiting Mar run</th>
                <th className="px-3 py-2 text-right">Remaining</th>
                <th className="px-3 py-2" style={{ width: 120 }}>
                  Budget use
                </th>
              </tr>
            </thead>
            <tbody>
              {codes.map((p) => {
                const s = genPoolSummary(p.code as 'GEN-HO' | 'GEN-BPN')
                return (
                  <tr key={p.code} onClick={() => navigate(`/projects/${p.code}`)} className="cursor-pointer border-b border-slate-100 hover:bg-brand-50/40">
                    <td className="px-3 py-2.5">
                      <ProjectCodeChip code={p.code} />
                      <div className="mt-0.5 text-xs text-slate-600">{p.name}</div>
                    </td>
                    <td className="px-3">
                      <PersonCell id={p.pmId} />
                    </td>
                    <td className="num px-3 text-right">{idrShort(p.rab)}</td>
                    <td className="num px-3 text-right font-medium">{idrShort(p.actual)}</td>
                    <td className="num px-3 text-right text-amber-700">{idrShort(p.committed)}</td>
                    <td className="num px-3 text-right text-emerald-700">{idrShort(s.allocated)}</td>
                    <td className="num px-3 text-right">{idrShort(s.retained)}</td>
                    <td className="num px-3 text-right text-slate-500">{idrShort(s.awaiting)}</td>
                    <td className="num px-3 text-right">{idrShort(remainingBudget(p))}</td>
                    <td className="px-3">
                      <BudgetBar rab={p.rab} actual={p.actual} committed={p.committed} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Roll-up ─────────────────────────────────────────────────────────────────
function Rollup() {
  const r = businessLineRollup()
  const [open, setOpen] = useState<Record<string, boolean>>({ HL: true })
  const chart = r.lines.map((l) => ({ name: businessLines[l.bl].short, Revenue: l.total.revenue, Cost: l.total.actual }))
  const projectMargin = r.projectTotal.revenue - r.projectTotal.actual
  const Row = ({ label, row, depth, bold, onToggle, isOpen, code, bl }: { label: string; row: PLRow; depth: number; bold?: boolean; onToggle?: () => void; isOpen?: boolean; code?: string; bl?: BusinessLine }) => (
    <tr className={cx('border-b border-slate-100', bold && 'bg-slate-50 font-semibold', depth === 2 && 'text-slate-600')}>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 20 }}>
          {onToggle ? (
            <button onClick={onToggle} className="rounded p-0.5 text-slate-500 hover:bg-slate-200" aria-label="Toggle">
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-[18px]" />
          )}
          {bl && <span className="h-2.5 w-2.5 rounded-full" style={{ background: businessLines[bl].color }} />}
          {code ? <ProjectCodeChip code={code} showName /> : label}
        </div>
      </td>
      <td className="num px-3 text-right">{idrShort(row.revenue)}</td>
      <td className="num px-3 text-right">{idrShort(row.actual)}</td>
      <td className="num px-3 text-right">{idrShort(row.revenue - row.actual)}</td>
      <td className="num px-3 text-right">
        <MarginCell value={margin(row)} revenue={row.revenue} />
      </td>
      <td className="num px-3 text-right">{idrShort(row.rab)}</td>
      <td className="num px-3 text-right text-amber-700">{idrShort(row.committed)}</td>
      <td className={cx('num px-3 text-right', row.rab - row.actual - row.committed < 0 && 'text-red-600')}>{idrShort(row.rab - row.actual - row.committed)}</td>
    </tr>
  )
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card padded={false} className="xl:col-span-2">
        <div className="p-4 pb-0">
          <CardHeader title="Tiered P/L roll-up (FAT-06)" subtitle="Contract-to-date. Sub-codes roll into parents, parents into business lines, business lines into the company — no re-entry." />
        </div>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2 text-right">Margin</th>
                <th className="px-3 py-2 text-right">Margin %</th>
                <th className="px-3 py-2 text-right">RAB</th>
                <th className="px-3 py-2 text-right">Committed</th>
                <th className="px-3 py-2 text-right">Remaining</th>
              </tr>
            </thead>
            <tbody>
              <Row label="PT Petrolog Indah — all project codes" row={r.projectTotal} depth={0} bold />
              {r.lines.map((l) => (
                <Fragment key={l.bl}>
                  <Row label={businessLines[l.bl].name} bl={l.bl} row={l.total} depth={1} onToggle={() => setOpen((o) => ({ ...o, [l.bl]: !o[l.bl] }))} isOpen={open[l.bl]} />
                  {open[l.bl] &&
                    l.projects.map((p) => (
                      <Fragment key={p.code}>
                        <Row label={p.name} code={p.code} row={p} depth={2} />
                        {childProjects(p.code).map((c) => (
                          <Row key={c.code} label={c.name} code={c.code} row={c} depth={3} />
                        ))}
                      </Fragment>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 p-4">
          <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Company level</div>
          <dl className="max-w-md space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Project margin (after allocated GEN overhead)</dt>
              <dd className="num font-medium">{idrShort(projectMargin)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Less: overhead retained at company level (Jan–Feb 2028)</dt>
              <dd className="num font-medium text-red-600">−{idrShort(r.retainedOverhead)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold">
              <dt>Contribution after corporate overhead</dt>
              <dd className="num">{idrShort(projectMargin - r.retainedOverhead)}</dd>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <dt>GEN cost awaiting March allocation run</dt>
              <dd className="num">{idrShort(r.awaitingAllocation)}</dd>
            </div>
          </dl>
        </div>
      </Card>
      <Card>
        <CardHeader title="Revenue vs cost by business line" subtitle="Contract-to-date, IDR" />
        <Legend
          items={[
            { label: 'Revenue', color: REVENUE_COLOR },
            { label: 'Cost', color: COST_COLOR },
          ]}
        />
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chart} margin={{ left: 4, right: 4, top: 8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} tickFormatter={(v: number) => `${(v / 1e9).toFixed(0)} bn`} width={44} />
            <Tooltip content={<ChartTooltip format={idrShort} />} cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="Revenue" fill={REVENUE_COLOR} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Cost" fill={COST_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 space-y-2">
          {r.lines.map((l) => (
            <div key={l.bl} className="flex items-center justify-between text-xs">
              <BLTag bl={l.bl} short={false} />
              <span className={cx('num font-semibold', margin(l.total) < 10 ? 'text-red-600' : margin(l.total) < 15 ? 'text-amber-600' : 'text-emerald-600')}>{pct(margin(l.total))}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── New project code (rule explainer) ───────────────────────────────────────
function NewCodeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pending = contracts.filter((c) => c.status === 'Pending Approval')
  const navigate = useNavigate()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New project code"
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" icon={<FileSignature size={15} />} onClick={() => navigate('/contracts')}>
            Go to contracts
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <Callout tone="amber" icon={<Lock size={16} />} title="Project codes are not created by hand">
          A code is issued automatically when a contract is approved in M2 Contracts (FAT-17). This removes duplicate or free-typed codes and ties every cost to a
          signed commercial basis.
        </Callout>
        <div>
          <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">How a code is born</div>
          <Stepper steps={['Contract approved', 'Code issued', 'RAB v1 approved', 'Active']} current="Code issued" />
        </div>
        <ul className="list-disc space-y-1 pl-5 text-slate-600">
          <li>
            Format <span className="font-mono text-xs">&lt;BL&gt;-&lt;year&gt;-&lt;seq&gt;</span>, e.g. <span className="font-mono text-xs">HL-2028-003</span>; the business line comes from the contract.
          </li>
          <li>
            Sub-codes (<span className="font-mono text-xs">.01</span>, <span className="font-mono text-xs">.02</span>) are added by the PM under an existing parent, with Finance approval.
          </li>
          <li>The code starts in Planning. Costs are blocked until RAB v1 is approved; after that PRs are budget-checked against it.</li>
          <li>Overhead that cannot be charged directly uses GEN-HO / GEN-BPN (controlled exception).</li>
        </ul>
        {pending.length > 0 && (
          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">Contracts awaiting approval → code reserved</div>
            {pending.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <Link to={`/contracts/${c.id}`} className="font-mono text-xs text-sky-700 hover:underline">
                    {c.id}
                  </Link>
                  <div className="truncate text-xs text-slate-600">
                    {c.title} · starts {date(c.start)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ProjectCodeChip code={c.projectCode} />
                  <StatusBadge status="Planning" />
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-500">
          Last issued: <span className="font-mono">HL-2028-002</span> from {getContract('CTR-2028-002')?.id} on {date('2028-01-24')}.
        </p>
      </div>
    </Modal>
  )
}
