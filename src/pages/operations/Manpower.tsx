import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Plus, Split, Trash2, Upload } from 'lucide-react'
import { Badge, Button, Callout, Card, CardHeader, DataTable, Drawer, Grid, Input, PageHeader, ProjectCodeChip, Select, Stat, StatusBadge, Tabs, type Column } from '@/components/ui'
import { businessLines, getProject, projects } from '@/data/core'
import { allocations as seedAlloc, getPerson, labourUtilisation, payrollBatches, payrollCharging, type Allocation } from '@/data/operations'
import { dateTime, idr, idrShort, num, pct, period } from '@/lib/format'
import { axisProps, ChartTooltip, GRID, Legend, NEUTRAL_LIGHT, SERIES } from '@/lib/chart'
import { useToast } from '@/lib/app-state'
import { Chip, Person, TS_MODULE } from './shared'

type TabKey = 'allocation' | 'utilisation' | 'payroll'
const colorFor = (code: string) => (code.startsWith('GEN') ? '#94a3b8' : businessLines[getProject(code)?.businessLine ?? 'CORP'].color)

export default function Manpower() {
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('allocation')
  const [alloc, setAlloc] = useState<Allocation[]>(seedAlloc)
  const [kind, setKind] = useState<'All' | 'Direct' | 'Indirect'>('All')
  const [edit, setEdit] = useState<Allocation | null>(null)
  const [batches, setBatches] = useState(payrollBatches)

  const rows = alloc.filter((a) => kind === 'All' || a.kind === kind)
  const direct = alloc.filter((a) => a.kind === 'Direct')
  const indirect = alloc.filter((a) => a.kind === 'Indirect')
  const multi = alloc.filter((a) => a.splits.length > 1)
  const util = labourUtilisation.map((u) => ({ ...u, pct: (u.billable / u.available) * 100 }))
  const totAvail = util.reduce((a, u) => a + u.available, 0)
  const totBill = util.reduce((a, u) => a + u.billable, 0)
  const costByProject = new Map<string, number>()
  for (const a of alloc) for (const s of a.splits) costByProject.set(s.projectCode, (costByProject.get(s.projectCode) ?? 0) + (a.monthlyCost * s.pct) / 100)

  const cols: Column<Allocation>[] = [
    { key: 'p', header: 'Person', render: (a) => <Person id={a.employeeId} /> },
    { key: 'k', header: 'Labour', render: (a) => <Badge tone={a.kind === 'Direct' ? 'blue' : 'slate'}>{a.kind}</Badge> },
    { key: 'loc', header: 'Base', render: (a) => <span className="text-xs text-slate-500">{getPerson(a.employeeId)?.location}</span> },
    {
      key: 's',
      header: 'Allocation — March 2028',
      render: (a) => (
        <div className="min-w-64">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
            {a.splits.map((s) => (
              <div key={s.projectCode} style={{ width: `${s.pct}%`, background: colorFor(s.projectCode) }} title={`${s.projectCode} ${s.pct}%`} className="border-r border-white last:border-0" />
            ))}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {a.splits.map((s) => (
              <span key={s.projectCode} className="flex items-center gap-1 text-[11px] text-slate-600">
                <ProjectCodeChip code={s.projectCode} /> {s.pct}%
              </span>
            ))}
          </div>
        </div>
      ),
    },
    { key: 'c', header: 'Monthly cost', align: 'right', render: (a) => idrShort(a.monthlyCost) },
    { key: 'e', header: '', render: (a) => <Button size="sm" variant="ghost" onClick={() => setEdit(a)}>Edit split</Button> },
  ]

  return (
    <>
      <PageHeader
        module={TS_MODULE}
        title="Manpower Allocation"
        subtitle="Personnel assigned to project codes, one person across several projects at defined proportions within a period. Payroll cost is charged on verified timesheets rather than nominal assignment; indirect labour is held on GEN and distributed by the GEN allocation engine."
        crumbs={[{ label: 'Operations' }, { label: 'Manpower Allocation' }]}
        actions={
          <Link to="/costing/allocation">
            <Button icon={<Split size={15} />}>GEN allocation (FAT-21)</Button>
          </Link>
        }
      />
      <Grid cols={5} className="mb-4">
        <Stat label="People allocated (Mar)" value={alloc.length} sub={`${direct.length} direct · ${indirect.length} indirect`} />
        <Stat label="Split across projects" value={multi.length} sub="Allocated to 2+ project codes" />
        <Stat label="Labour utilisation (MTD)" value={pct((totBill / totAvail) * 100, 0)} sub={`${num(totBill)} billable of ${num(totAvail)} available h`} tone={totBill / totAvail > 0.75 ? 'good' : 'warn'} />
        <Stat label="Indirect cost on GEN" value={idrShort(indirect.reduce((a, x) => a + x.monthlyCost, 0))} sub="Monthly, distributed via FAT-21" to="/costing/allocation" />
        <Stat label="Payroll import (Mar)" value={batches[0].status === 'Awaiting file' ? 'Awaiting' : 'Imported'} sub="Outsource Indonesia · expected 25 Mar" tone={batches[0].status === 'Awaiting file' ? 'warn' : 'good'} />
      </Grid>

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'allocation', label: 'Allocation by person', count: alloc.length },
          { key: 'utilisation', label: 'Labour utilisation by project' },
          { key: 'payroll', label: 'Payroll charging' },
        ]}
      />

      {tab === 'allocation' && (
        <div className="space-y-4">
          <Callout tone="blue" title="Direct vs indirect labour">
            Direct personnel (HC-05) are charged to their project codes by verified timesheet hours. Indirect personnel (HC-06) — site admin, maintenance supervision, HSE, finance — are held on{' '}
            <ProjectCodeChip code="GEN-BPN" /> / <ProjectCodeChip code="GEN-HO" /> and distributed to projects through the GEN allocation engine at period close.
          </Callout>
          <Card padded={false}>
            <div className="flex gap-1.5 border-b border-slate-200 p-3">
              {(['All', 'Direct', 'Indirect'] as const).map((k) => (
                <Chip key={k} active={kind === k} onClick={() => setKind(k)} count={k === 'All' ? alloc.length : alloc.filter((a) => a.kind === k).length}>
                  {k}
                </Chip>
              ))}
            </div>
            <DataTable columns={cols} rows={rows} rowKey={(a) => a.employeeId} />
          </Card>
          <Card>
            <CardHeader title="Allocated labour cost by project code — March 2028" subtitle="Nominal allocation. Actual charging follows verified hours (see Payroll charging)." />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[...costByProject.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([code, v]) => (
                  <div key={code} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <ProjectCodeChip code={code} />
                    <span className="num text-sm font-medium">{idrShort(v)}</span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'utilisation' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Billable vs available hours by project — March 2028 MTD" subtitle="Available = rostered hours of allocated personnel; billable = verified hours on billable jobs (HC-07)" />
            <Legend items={[{ label: 'Available', color: NEUTRAL_LIGHT }, { label: 'Billable', color: SERIES[0] }]} />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={util} margin={{ left: 0, right: 8, top: 4 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="projectCode" {...axisProps} interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis {...axisProps} width={44} />
                <Tooltip content={<ChartTooltip format={(v) => `${num(v)} h`} />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="available" name="Available" fill={NEUTRAL_LIGHT} radius={[4, 4, 0, 0]} />
                <Bar dataKey="billable" name="Billable" fill={SERIES[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card padded={false}>
            <DataTable
              columns={[
                { key: 'p', header: 'Project code', render: (u) => <ProjectCodeChip code={u.projectCode} showName /> },
                { key: 'a', header: 'Available h', align: 'right', render: (u) => num(u.available) },
                { key: 'b', header: 'Billable h', align: 'right', render: (u) => num(u.billable) },
                { key: 'n', header: 'Non-billable h', align: 'right', render: (u) => num(u.nonBillable) },
                { key: 'i', header: 'Idle / unrecorded h', align: 'right', render: (u) => num(u.available - u.billable - u.nonBillable) },
                { key: 'u', header: 'Utilisation', align: 'right', render: (u) => <span className={u.pct < 60 ? 'font-medium text-red-600' : u.pct < 75 ? 'text-amber-600' : 'text-emerald-700'}>{pct(u.pct, 0)}</span> },
              ]}
              rows={util}
              rowKey={(u) => u.projectCode}
              footer={
                <tr>
                  <td className="px-3 py-2">Total</td>
                  <td className="num px-3 py-2 text-right">{num(totAvail)}</td>
                  <td className="num px-3 py-2 text-right">{num(totBill)}</td>
                  <td className="num px-3 py-2 text-right">{num(util.reduce((a, u) => a + u.nonBillable, 0))}</td>
                  <td className="num px-3 py-2 text-right">{num(totAvail - totBill - util.reduce((a, u) => a + u.nonBillable, 0))}</td>
                  <td className="num px-3 py-2 text-right">{pct((totBill / totAvail) * 100, 0)}</td>
                </tr>
              }
            />
          </Card>
        </div>
      )}

      {tab === 'payroll' && (
        <div className="space-y-4">
          <Card padded={false}>
            <div className="px-4 pt-4">
              <CardHeader
                title="Payroll imports — Outsource Indonesia"
                subtitle="Payroll results administered by Outsource Indonesia are drawn in as cost (HC-03). The payroll engine remains out of scope."
                actions={
                  batches[0].status === 'Awaiting file' && (
                    <Button size="sm" icon={<Upload size={13} />} onClick={() => toast('Manual upload is disabled until the SFTP window closes on 25 Mar — the file is picked up automatically', 'info')}>
                      Upload file
                    </Button>
                  )
                }
              />
            </div>
            <DataTable
              columns={[
                { key: 'id', header: 'Batch', render: (b) => <span className="font-mono text-[12px]">{b.id}</span> },
                { key: 'p', header: 'Period', render: (b) => period(b.period) },
                { key: 's', header: 'Source', render: (b) => <span className="text-xs text-slate-500">{b.source}</span> },
                { key: 'r', header: 'Received', render: (b) => (b.receivedAt ? dateTime(b.receivedAt) : '—') },
                { key: 'h', header: 'Headcount', align: 'right', render: (b) => (b.headcount ? num(b.headcount) : '—') },
                { key: 'g', header: 'Gross cost', align: 'right', render: (b) => (b.gross ? idrShort(b.gross) : '—') },
                { key: 'd', header: 'Charged to projects', align: 'right', render: (b) => (b.chargedDirect ? idrShort(b.chargedDirect) : '—') },
                { key: 'gen', header: 'Held on GEN', align: 'right', render: (b) => (b.heldOnGen ? idrShort(b.heldOnGen) : '—') },
                { key: 'u', header: 'Unallocated', align: 'right', render: (b) => (b.unallocated ? <span className="text-amber-600">{idrShort(b.unallocated)}</span> : '—') },
                { key: 'st', header: 'Status', render: (b) => <StatusBadge status={b.status === 'Imported & charged' ? 'Posted' : b.status === 'Awaiting file' ? 'Pending' : b.status} /> },
              ]}
              rows={batches}
              rowKey={(b) => b.id}
            />
          </Card>
          {batches[1].unallocated > 0 && (
            <Callout tone="amber" icon={<AlertTriangle size={16} />} title={`${idr(batches[1].unallocated)} of February payroll has no verified hours`}>
              3 employees on leave with no approved timesheets. Cost is parked on <ProjectCodeChip code="GEN-BPN" /> until hours are verified or HR confirms leave.
              <Button size="sm" className="ml-2" onClick={() => { setBatches(batches.map((b, i) => (i === 1 ? { ...b, heldOnGen: b.heldOnGen + b.unallocated, unallocated: 0 } : b))); toast('Unallocated February payroll moved to GEN-BPN for distribution', 'success') }}>
                Park on GEN-BPN
              </Button>
            </Callout>
          )}
          <Card padded={false}>
            <div className="px-4 pt-4">
              <CardHeader title="February 2028 — payroll charged by verified timesheet hours (HC-04)" subtitle="Gross cost from Outsource Indonesia × share of verified hours per project code (sample of direct workforce)" />
            </div>
            <DataTable
              columns={[
                { key: 'p', header: 'Person', render: (r) => <Person id={r.employeeId} /> },
                { key: 'g', header: 'Gross (payroll)', align: 'right', render: (r) => idr(r.gross) },
                { key: 'h', header: 'Verified h', align: 'right', render: (r) => num(r.hours.reduce((a, h) => a + h.hrs, 0)) },
                {
                  key: 'split',
                  header: 'Charged to project codes',
                  render: (r) => {
                    const tot = r.hours.reduce((a, h) => a + h.hrs, 0)
                    return (
                      <div className="flex flex-col gap-0.5">
                        {r.hours.map((h) => (
                          <div key={h.projectCode} className="flex items-center gap-2 text-xs">
                            <ProjectCodeChip code={h.projectCode} />
                            <span className="text-slate-500">{num(h.hrs)} h ({pct((h.hrs / tot) * 100, 0)})</span>
                            <span className="num ml-auto font-medium text-slate-800">{idr((r.gross * h.hrs) / tot)}</span>
                          </div>
                        ))}
                      </div>
                    )
                  },
                },
              ]}
              rows={payrollCharging}
              rowKey={(r) => r.employeeId}
            />
          </Card>
        </div>
      )}

      {edit && (
        <EditAllocation
          a={edit}
          onClose={() => setEdit(null)}
          onSave={(n) => {
            setAlloc(alloc.map((x) => (x.employeeId === n.employeeId ? n : x)))
            setEdit(null)
            toast(`Allocation for ${getPerson(n.employeeId)?.name} saved — ${n.splits.map((s) => `${s.projectCode} ${s.pct}%`).join(', ')}`)
          }}
        />
      )}
    </>
  )
}

function EditAllocation({ a, onClose, onSave }: { a: Allocation; onClose: () => void; onSave: (a: Allocation) => void }) {
  const [splits, setSplits] = useState(a.splits)
  const [kind, setKind] = useState(a.kind)
  const sum = splits.reduce((x, s) => x + s.pct, 0)
  const valid = sum === 100 && splits.every((s) => s.projectCode && s.pct > 0) && new Set(splits.map((s) => s.projectCode)).size === splits.length
  const options = projects.filter((p) => p.status !== 'Closed' && !projects.some((c) => c.parent === p.code))
  return (
    <Drawer
      open
      onClose={onClose}
      title={`Edit allocation — ${getPerson(a.employeeId)?.name}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid} onClick={() => onSave({ ...a, kind, splits })}>
            Save allocation
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-sm text-slate-600">
          Period <span className="font-medium text-slate-800">{period(a.period)}</span> · {getPerson(a.employeeId)?.position}
        </div>
        <div className="flex gap-1.5">
          {(['Direct', 'Indirect'] as const).map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {k} labour
            </Chip>
          ))}
        </div>
        <div className="space-y-2">
          {splits.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select className="min-w-0 flex-1" value={s.projectCode} onChange={(e) => setSplits(splits.map((x, j) => (j === i ? { ...x, projectCode: e.target.value } : x)))}>
                <option value="">Project code…</option>
                {options.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </Select>
              <Input type="number" min={0} max={100} className="w-20 text-right" value={s.pct} onChange={(e) => setSplits(splits.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))} />
              <span className="text-sm text-slate-500">%</span>
              <button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600" onClick={() => setSplits(splits.filter((_, j) => j !== i))} aria-label="Remove">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={() => setSplits([...splits, { projectCode: '', pct: Math.max(0, 100 - sum) }])}>
            Add project code
          </Button>
        </div>
        <div className={sum === 100 ? 'text-sm text-emerald-700' : 'text-sm font-medium text-red-600'}>Total {sum}% {sum !== 100 && '— proportions must add up to 100%'}</div>
        {kind === 'Indirect' && !splits.every((s) => s.projectCode.startsWith('GEN')) && (
          <Callout tone="amber">Indirect labour is normally held on a GEN code and distributed via FAT-21. Direct charging of indirect staff requires PM approval.</Callout>
        )}
      </div>
    </Drawer>
  )
}
