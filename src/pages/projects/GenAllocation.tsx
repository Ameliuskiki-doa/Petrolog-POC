import { Fragment, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, ArrowRight, Lock, Play, RotateCcw, Send, Split } from 'lucide-react'
import { getEmployee, getProject } from '@/data/core'
import {
  ALLOC_DRIVERS,
  allocReceivers,
  allocRules,
  allocRuns,
  driverStats,
  postedAllocation,
  runAllocation,
  type AllocDriver,
  type AllocLine,
  type AllocMonth,
  type GenPool,
} from '@/data/projects'
import { Badge, Button, Callout, Card, CardHeader, EmptyState, Grid, PageHeader, ProjectCodeChip, Select, Stat, cx } from '@/components/ui'
import { dateTime, idr, idrShort, num, pct, period } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { DocLink, MODULE, Segmented, journalLink } from './shared'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const defaults = () => Object.fromEntries(allocRules.map((r) => [r.id, r.driver])) as Record<string, AllocDriver | null>

export default function GenAllocation() {
  const [params] = useSearchParams()
  const toast = useToast()
  const [month, setMonth] = useState<AllocMonth>('2028-02')
  const [ran, setRan] = useState(false)
  const [drivers, setDrivers] = useState<Record<string, AllocDriver | null>>(defaults)
  const [pool, setPool] = useState<GenPool>((params.get('pool') as GenPool) || 'GEN-HO')
  const [proj, setProj] = useState(allocReceivers.includes(params.get('project') ?? '') ? params.get('project')! : 'HL-2027-014.01')

  const isPreview = month === '2028-03'
  const lines: AllocLine[] = useMemo(() => (isPreview ? (ran ? runAllocation('2028-03', drivers) : []) : postedAllocation(month)), [isPreview, ran, drivers, month])
  const baseline = useMemo(() => runAllocation('2028-03'), [])
  const run = allocRuns.find((r) => r.month === month)!
  const changed = allocRules.filter((r) => drivers[r.id] !== r.driver)
  const effDriver = (id: string) => (isPreview ? drivers[id] : allocRules.find((r) => r.id === id)!.driver)

  const poolTotal = sum(allocRules.map((r) => r.amounts[month]))
  const allocated = sum(lines.map((l) => l.amount))
  const retained = sum(allocRules.filter((r) => !effDriver(r.id)).map((r) => r.amounts[month]))

  const runPreview = () => {
    setMonth('2028-03')
    setRan(true)
    toast('Mar 2028 allocation computed as preview — nothing posted', 'info')
  }

  return (
    <>
      <PageHeader
        module={MODULE}
        title="GEN allocation engine"
        subtitle="Driver-based month-end distribution of GEN-HO and GEN-BPN overhead to project codes (FAT-21), with a bidirectional audit trail (FAT-22)."
        actions={
          <>
            {isPreview && ran && (
              <>
                <Button icon={<RotateCcw size={15} />} onClick={() => setDrivers(defaults())} disabled={!changed.length}>
                  Reset drivers
                </Button>
                <Button icon={<Send size={15} />} onClick={() => toast('Mar 2028 can be posted after the month-end cost cut-off (31 Mar 2028)', 'warning')}>
                  Post run
                </Button>
              </>
            )}
            <Button variant="primary" icon={<Play size={15} />} onClick={runPreview}>
              Run Mar 2028 (preview)
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          options={allocRuns.map((r) => ({
            key: r.month,
            label: (
              <span className="flex items-center gap-1.5">
                {r.status === 'Posted' && <Lock size={11} />}
                {period(r.month)} · {r.status}
              </span>
            ),
          }))}
          value={month}
          onChange={setMonth}
        />
        {run.status === 'Posted' ? (
          <span className="text-xs text-slate-500">
            Posted {dateTime(run.runOn!)} by {getEmployee(run.runBy)?.name} · journal <DocLink to={journalLink(run.journalId!)}>{run.journalId}</DocLink>
          </span>
        ) : (
          <span className="text-xs text-slate-500">Pool = actuals to 10 Mar + accruals. Hours are live from fleet hour meters. Change a driver to see the effect.</span>
        )}
      </div>

      <Grid cols={4} className="mb-5">
        <Stat label={`GEN cost pool · ${period(month)}`} value={idrShort(poolTotal)} sub="GEN-HO + GEN-BPN" />
        <Stat label="Allocated to projects" value={isPreview && !ran ? '—' : idrShort(allocated)} sub={isPreview && !ran ? 'Run the preview' : `${pct((allocated / poolTotal) * 100, 0)} of pool`} tone="good" />
        <Stat label="Retained at company level" value={idrShort(retained)} sub="Rules without a driver" />
        <Stat label="Receiving project codes" value={new Set(lines.map((l) => l.projectCode)).size || '—'} sub={changed.length && isPreview ? `${changed.length} driver change(s) vs rule` : 'Leaf codes with activity'} tone={changed.length && isPreview ? 'warn' : undefined} />
      </Grid>

      <Card padded={false} className="mb-4">
        <div className="p-4 pb-2">
          <CardHeader
            title="Allocation rules"
            subtitle={isPreview ? 'Drivers are editable in the preview — the distribution below recomputes instantly' : 'Posted run — rules and drivers are locked for this period'}
          />
        </div>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-y border-slate-200 bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                <th className="px-3 py-2">Rule</th>
                <th className="px-3 py-2">GEN source</th>
                <th className="px-3 py-2">Scope</th>
                <th className="px-3 py-2">Driver</th>
                <th className="px-3 py-2 text-right">Pool amount</th>
                <th className="px-3 py-2 text-right">Allocated</th>
              </tr>
            </thead>
            <tbody>
              {allocRules.map((r) => {
                const d = effDriver(r.id)
                const alloc = sum(lines.filter((l) => l.ruleId === r.id).map((l) => l.amount))
                return (
                  <tr key={r.id} className={cx('border-b border-slate-100', isPreview && drivers[r.id] !== r.driver && 'bg-amber-50/60')}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{r.name}</div>
                      <div className="text-[11px] text-slate-500">
                        <span className="font-mono">{r.id}</span> · GL {r.gl} · {r.rationale}
                      </div>
                    </td>
                    <td className="px-3">
                      <ProjectCodeChip code={r.pool} />
                    </td>
                    <td className="px-3 text-xs whitespace-nowrap text-slate-600">{r.scope}</td>
                    <td className="px-3">
                      {isPreview ? (
                        <Select
                          value={d ?? ''}
                          onChange={(e) => setDrivers((x) => ({ ...x, [r.id]: (e.target.value || null) as AllocDriver | null }))}
                          className="h-8 text-xs"
                        >
                          {ALLOC_DRIVERS.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                          <option value="">Retain (not allocated)</option>
                        </Select>
                      ) : d ? (
                        <span className="inline-flex items-center gap-1">
                          <Badge tone="sky">{d}</Badge>
                          <Lock size={11} className="text-slate-400" />
                        </span>
                      ) : (
                        <Badge tone="slate">Retained</Badge>
                      )}
                    </td>
                    <td className="num px-3 text-right">{idrShort(r.amounts[month])}</td>
                    <td className="num px-3 text-right font-medium">{alloc ? idrShort(alloc) : <span className="text-slate-400">{isPreview && !ran ? '—' : 'retained'}</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {isPreview && !ran ? (
        <Card>
          <EmptyState icon={<Split size={36} />} title="March 2028 has not been computed" body="Run the preview to distribute the March pool with current driver data. A preview never posts a journal." />
          <div className="text-center">
            <Button variant="primary" icon={<Play size={15} />} onClick={runPreview}>
              Run Mar 2028 (preview)
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Matrix lines={lines} month={month} />
          {isPreview && changed.length > 0 && <Impact lines={lines} baseline={baseline} />}
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <FromGen lines={lines} pool={pool} setPool={setPool} />
            <FromProject lines={lines} proj={proj} setProj={setProj} month={month} />
          </div>
          <DriverTable month={month} lines={lines} />
        </>
      )}
    </>
  )
}

function Matrix({ lines, month }: { lines: AllocLine[]; month: AllocMonth }) {
  const ruleIds = [...new Set(lines.map((l) => l.ruleId))]
  const cols = allocReceivers
  const cell = (rid: string, c: string) => lines.find((l) => l.ruleId === rid && l.projectCode === c)
  return (
    <Card padded={false}>
      <div className="p-4 pb-2">
        <CardHeader title={`Results matrix — ${period(month)}`} subtitle="GEN source rule → receiving project code. Each cell shows amount and proportion of that rule." />
      </div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[1080px] text-sm">
          <thead>
            <tr className="border-y border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <th className="px-3 py-2 text-left">Rule</th>
              {cols.map((c) => (
                <th key={c} className="px-2 py-2 text-right">
                  <ProjectCodeChip code={c} />
                </th>
              ))}
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(['GEN-HO', 'GEN-BPN'] as GenPool[]).map((pool) => {
              const ids = ruleIds.filter((id) => allocRules.find((r) => r.id === id)!.pool === pool)
              if (!ids.length) return null
              return (
                <Fragment key={pool}>
                  <tr className="bg-slate-50/60">
                    <td colSpan={cols.length + 2} className="px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                      {pool} · {getProject(pool)?.name}
                    </td>
                  </tr>
                  {ids.map((id) => {
                    const r = allocRules.find((x) => x.id === id)!
                    const ls = lines.filter((l) => l.ruleId === id)
                    return (
                      <tr key={id} className="border-b border-slate-100">
                        <td className="px-3 py-2">
                          <div className="text-xs font-medium text-slate-800">{r.name}</div>
                          <div className="text-[11px] text-slate-500">by {ls[0]?.driver}</div>
                        </td>
                        {cols.map((c) => {
                          const l = cell(id, c)
                          return (
                            <td key={c} className="num px-2 text-right">
                              {l ? (
                                <>
                                  <div className="text-xs font-medium">{idrShort(l.amount)}</div>
                                  <div className="text-[10px] text-slate-500">{pct(l.share * 100)}</div>
                                </>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="num px-3 text-right text-xs font-semibold">{idrShort(sum(ls.map((l) => l.amount)))}</td>
                      </tr>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
            <tr>
              <td className="px-3 py-2.5 text-xs">Received by project</td>
              {cols.map((c) => (
                <td key={c} className="num px-2 text-right text-xs">
                  {idrShort(sum(lines.filter((l) => l.projectCode === c).map((l) => l.amount)))}
                </td>
              ))}
              <td className="num px-3 text-right text-xs">{idrShort(sum(lines.map((l) => l.amount)))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

function Impact({ lines, baseline }: { lines: AllocLine[]; baseline: AllocLine[] }) {
  const rows = allocReceivers.map((c) => {
    const now = sum(lines.filter((l) => l.projectCode === c).map((l) => l.amount))
    const was = sum(baseline.filter((l) => l.projectCode === c).map((l) => l.amount))
    return { c, now, was, d: now - was }
  })
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.d)))
  return (
    <Card className="mt-4">
      <CardHeader title="Impact of driver changes" subtitle="Preview vs the rule-default drivers — shows who absorbs more or less overhead" />
      <div className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
        {rows.map((r) => (
          <div key={r.c} className="flex items-center gap-3 text-xs">
            <ProjectCodeChip code={r.c} className="w-[118px] justify-center" />
            <div className="relative h-2 flex-1 rounded-full bg-slate-100">
              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-300" />
              <div
                className={cx('absolute inset-y-0 rounded-full', r.d >= 0 ? 'bg-[#eb6834]' : 'bg-[#2a78d6]')}
                style={r.d >= 0 ? { left: '50%', width: `${(r.d / maxAbs) * 50}%` } : { right: '50%', width: `${(-r.d / maxAbs) * 50}%` }}
              />
            </div>
            <span className={cx('num w-24 text-right font-medium', r.d > 0 ? 'text-orange-700' : r.d < 0 ? 'text-sky-700' : 'text-slate-400')}>
              {r.d > 0 ? '+' : ''}
              {idrShort(r.d)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function FromGen({ lines, pool, setPool }: { lines: AllocLine[]; pool: GenPool; setPool: (p: GenPool) => void }) {
  const ls = lines.filter((l) => l.pool === pool)
  const total = sum(ls.map((l) => l.amount))
  const projects = [...new Set(ls.map((l) => l.projectCode))].map((c) => ({ c, amt: sum(ls.filter((l) => l.projectCode === c).map((l) => l.amount)) })).sort((a, b) => b.amt - a.amt)
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-1.5">
            <ArrowRight size={14} /> From GEN: where did it go?
          </span>
        }
        subtitle="Distribution of a GEN source across projects, with proportions"
        actions={
          <Segmented
            options={[
              { key: 'GEN-HO', label: 'GEN-HO' },
              { key: 'GEN-BPN', label: 'GEN-BPN' },
            ]}
            value={pool}
            onChange={setPool}
          />
        }
      />
      {projects.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Nothing allocated from {pool} in this run</p>}
      <div className="space-y-3">
        {projects.map((p) => (
          <div key={p.c}>
            <div className="flex items-center justify-between gap-2">
              <ProjectCodeChip code={p.c} showName />
              <span className="num shrink-0 text-xs">
                <b>{idrShort(p.amt)}</b> <span className="text-slate-500">{pct((p.amt / total) * 100)}</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${(p.amt / total) * 100}%` }} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
              {ls
                .filter((l) => l.projectCode === p.c)
                .map((l) => (
                  <span key={l.ruleId}>
                    {l.ruleId}: {idrShort(l.amount)}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-sm font-semibold">
          <span>Total distributed from {pool}</span>
          <span className="num">{idr(total)}</span>
        </div>
      )}
    </Card>
  )
}

function FromProject({ lines, proj, setProj, month }: { lines: AllocLine[]; proj: string; setProj: (c: string) => void; month: AllocMonth }) {
  const ls = lines.filter((l) => l.projectCode === proj)
  const total = sum(ls.map((l) => l.amount))
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-1.5">
            <ArrowLeftRight size={14} /> From project: where did it come from?
          </span>
        }
        subtitle="Every allocated amount traced back to its GEN origin and rule"
        actions={
          <Select value={proj} onChange={(e) => setProj(e.target.value)} className="h-8 text-xs">
            {allocReceivers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        }
      />
      <div className="mb-2 text-xs text-slate-600">{getProject(proj)?.name}</div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[460px] text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              <th className="py-1.5 pr-2">Origin</th>
              <th className="py-1.5 pr-2">Rule · driver</th>
              <th className="py-1.5 pr-2 text-right">Project / total</th>
              <th className="py-1.5 pr-2 text-right">Share</th>
              <th className="py-1.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {ls.map((l) => (
              <tr key={l.ruleId} className="border-b border-slate-100">
                <td className="py-1.5 pr-2">
                  <ProjectCodeChip code={l.pool} />
                </td>
                <td className="py-1.5 pr-2">
                  <div className="font-medium text-slate-800">{allocRules.find((r) => r.id === l.ruleId)?.name}</div>
                  <div className="text-slate-500">{l.driver}</div>
                </td>
                <td className="num py-1.5 pr-2 text-right text-slate-600">
                  {l.driver === 'Revenue' ? idrShort(l.driverValue) : num(l.driverValue)} / {l.driver === 'Revenue' ? idrShort(l.driverTotal) : num(l.driverTotal)}
                </td>
                <td className="num py-1.5 pr-2 text-right">{pct(l.share * 100)}</td>
                <td className="num py-1.5 text-right font-medium">{idrShort(l.amount)}</td>
              </tr>
            ))}
            {!ls.length && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No allocation to {proj} in {period(month)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <Link to={`/projects/${proj}?tab=allocations`} className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline">
            Open project allocations <ArrowRight size={12} />
          </Link>
          <span className="num font-semibold">{idr(total)}</span>
        </div>
      )}
    </Card>
  )
}

function DriverTable({ month, lines }: { month: AllocMonth; lines: AllocLine[] }) {
  const used = new Set(lines.map((l) => l.driver))
  const stats = driverStats[month]
  const tot = (k: 'hours' | 'trips' | 'headcount' | 'revenue') => sum(allocReceivers.map((c) => stats[c][k]))
  const col = (d: AllocDriver) => cx('px-3 py-2 text-right', used.has(d) && 'bg-sky-50/70')
  return (
    <Card padded={false} className="mt-4">
      <div className="p-4 pb-2">
        <CardHeader title={`Driver statistics — ${period(month)}`} subtitle="Operating hours from unit hour meters (GPS-verified), trips from verified job orders, headcount from verified timesheets, revenue from Surat Konversi" />
      </div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-y border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <th className="px-3 py-2 text-left">Project code</th>
              {ALLOC_DRIVERS.map((d) => (
                <th key={d} className={col(d)}>
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allocReceivers.map((c) => (
              <tr key={c} className="border-b border-slate-100">
                <td className="px-3 py-2">
                  <ProjectCodeChip code={c} showName />
                </td>
                <td className={cx(col('Operating hours'), 'num')}>{num(stats[c].hours)}</td>
                <td className={cx(col('Trip count'), 'num')}>{num(stats[c].trips)}</td>
                <td className={cx(col('Headcount'), 'num')}>{num(stats[c].headcount)}</td>
                <td className={cx(col('Revenue'), 'num')}>{idrShort(stats[c].revenue)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
            <tr>
              <td className="px-3 py-2.5">Total</td>
              <td className={cx(col('Operating hours'), 'num')}>{num(tot('hours'))}</td>
              <td className={cx(col('Trip count'), 'num')}>{num(tot('trips'))}</td>
              <td className={cx(col('Headcount'), 'num')}>{num(tot('headcount'))}</td>
              <td className={cx(col('Revenue'), 'num')}>{idrShort(tot('revenue'))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="border-t border-slate-100 p-3">
        <Callout tone="slate">
          Heavy Logistics–only rules (GEN-BPN) distribute over HL codes; GEN-HO rules over all business lines. A project with a zero driver value receives nothing from that rule.
        </Callout>
      </div>
    </Card>
  )
}
