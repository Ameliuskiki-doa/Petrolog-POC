import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { Factory, Play, Calculator, Scale } from 'lucide-react'
import { businessLines, getProject } from '@/data/core'
import { fixedAssets, commercialAccum, fiscalAccum, monthlyCommercial, monthlyFiscal, allocationFor, allocationByProject, STANDARD_HOURS, type AssetClass, type FixedAsset } from '@/data/finance'
import { PageHeader, Card, CardHeader, Grid, Stat, Tabs, DataTable, Button, ProjectCodeChip, Mono, SearchInput, Select, Callout, Badge, StatusBadge, cx, type Column } from '@/components/ui'
import { GRID, NEUTRAL, axisProps, ChartTooltip } from '@/lib/chart'
import { useToast } from '@/lib/app-state'
import { date, idr, idrShort, num } from '@/lib/format'
import { ArchiveNote, DocLink } from './components'

type Tab = 'register' | 'allocation' | 'books'
const CLASSES: AssetClass[] = ['Heavy Equipment', 'Trucks & Trailers', 'Light Vehicles', 'Buildings', 'IT & Office Equipment']
const TAX_RATE = 0.22

export default function FixedAssets() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('allocation')
  const [q, setQ] = useState('')
  const [cls, setCls] = useState<AssetClass | ''>('')
  const [per, setPer] = useState<'2028-02' | '2028-03'>('2028-02')

  const totals = useMemo(() => {
    const cost = fixedAssets.reduce((s, a) => s + a.cost, 0)
    const acc = fixedAssets.reduce((s, a) => s + commercialAccum(a), 0)
    const facc = fixedAssets.reduce((s, a) => s + fiscalAccum(a), 0)
    return { cost, acc, facc, nbv: cost - acc, fnbv: cost - facc, monthly: fixedAssets.reduce((s, a) => s + monthlyCommercial(a), 0) }
  }, [])

  const alloc = useMemo(() => allocationFor(per), [per])
  const byProj = useMemo(() => allocationByProject(per), [per])
  const unitRows = alloc.filter((r) => r.unitId)
  const chartData = [...byProj.byProject.filter((p) => !p.projectCode.startsWith('GEN')).map((p) => ({ name: p.projectCode, value: p.amount, color: businessLines[getProject(p.projectCode)?.businessLine ?? 'CORP'].color })), { name: 'Idle capacity (GEN-BPN)', value: byProj.idle, color: NEUTRAL }]

  const register = fixedAssets.filter((a) => (!cls || a.cls === cls) && (!q || `${a.id} ${a.name} ${a.location} ${a.sapAssetNo}`.toLowerCase().includes(q.toLowerCase())))

  const regCols: Column<FixedAsset>[] = [
    { key: 'id', header: 'Asset', render: (a) => <div className="whitespace-nowrap"><Mono className="font-medium">{a.id}</Mono><div className="text-[10px] text-slate-400">SAP B1 #{a.sapAssetNo}</div></div> },
    { key: 'n', header: 'Description', render: (a) => <div className="min-w-[220px]">{a.name}<div className="text-[11px] text-slate-500">{a.cls} · {a.location}</div></div> },
    { key: 'u', header: 'Unit', render: (a) => (a.unitId ? <DocLink to={`/fleet/units/${a.unitId}`}>{a.unitId}</DocLink> : '—') },
    { key: 'acq', header: 'Acquired', render: (a) => <span className="whitespace-nowrap">{date(a.acquired)}</span> },
    { key: 'c', header: 'Cost', align: 'right', render: (a) => idr(a.cost) },
    { key: 'ad', header: 'Acc. depreciation', align: 'right', render: (a) => idr(commercialAccum(a)) },
    { key: 'nbv', header: 'NBV (commercial)', align: 'right', render: (a) => <b>{idr(a.cost - commercialAccum(a))}</b> },
    { key: 'm', header: 'Monthly', align: 'right', render: (a) => idr(monthlyCommercial(a)) },
    { key: 's', header: 'Status', render: (a) => <StatusBadge status={a.status === 'In use' ? 'Active' : a.status === 'Under maintenance' ? 'Maintenance' : a.status} /> },
  ]

  const bookCols: Column<FixedAsset>[] = [
    { key: 'id', header: 'Asset', render: (a) => <div className="min-w-[180px]"><Mono className="font-medium">{a.id}</Mono><div className="text-[11px] text-slate-500">{a.name}</div></div> },
    { key: 'cm', header: 'Commercial book', render: (a) => <span className="text-xs whitespace-nowrap">{a.commercial.method}, {a.commercial.lifeYears} y, residual {a.commercial.residualPct}%</span> },
    { key: 'fm', header: 'Fiscal book', render: (a) => <span className="text-xs whitespace-nowrap">{a.fiscal.group} · {a.fiscal.method} {a.fiscal.ratePct}%</span> },
    { key: 'cn', header: 'NBV commercial', align: 'right', render: (a) => idr(a.cost - commercialAccum(a)) },
    { key: 'fn', header: 'NBV fiscal', align: 'right', render: (a) => idr(a.cost - fiscalAccum(a)) },
    { key: 'd', header: 'Temporary difference', align: 'right', render: (a) => { const d = fiscalAccum(a) - commercialAccum(a); return <span className={d > 0 ? 'text-violet-700' : 'text-slate-600'}>{idr(d)}</span> } },
    { key: 'mc', header: 'Monthly comm. / fiscal', align: 'right', render: (a) => <span className="text-xs whitespace-nowrap">{idrShort(monthlyCommercial(a))} / {idrShort(monthlyFiscal(a))}</span> },
  ]

  return (
    <div>
      <PageHeader
        module="M11 · Fixed Asset & Depreciation"
        title="Fixed assets"
        subtitle="One register, two books (FAT-27). Month-end depreciation (FAT-25) is charged to project codes by each unit's actual operating hours (FAT-26) — idle units do not burden projects that did not use them."
        crumbs={[{ label: 'Finance' }, { label: 'Fixed assets' }]}
        actions={
          <Button variant="primary" icon={<Play size={15} />} onClick={() => toast('Mar 2028 run is scheduled for WD+1 (01 Apr) once unit hours are locked — preview shown instead', 'warning')}>
            Run depreciation · Mar 2028
          </Button>
        }
      />

      <Grid cols={4} className="mb-4">
        <Stat label="Assets in register" value={num(fixedAssets.length)} sub={`${fixedAssets.filter((a) => a.unitId).length} fleet units · ${fixedAssets.filter((a) => !a.unitId).length} buildings & IT`} icon={<Factory size={16} />} />
        <Stat label="Cost / NBV (commercial)" value={idrShort(totals.nbv)} sub={`Cost ${idrShort(totals.cost)}`} />
        <Stat label="Monthly depreciation" value={idrShort(totals.monthly)} sub={`Feb idle capacity ${idrShort(allocationByProject('2028-02').idle)} kept off projects`} icon={<Calculator size={16} />} />
        <Stat label="Deferred tax (fiscal vs commercial)" value={idrShort((totals.facc - totals.acc) * TAX_RATE)} sub={`Temporary difference ${idrShort(totals.facc - totals.acc)} × 22%`} icon={<Scale size={16} />} />
      </Grid>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'allocation', label: 'Depreciation run & allocation' },
          { key: 'register', label: 'Asset register', count: fixedAssets.length },
          { key: 'books', label: 'Commercial vs fiscal' },
        ]}
      />

      {tab === 'allocation' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{per === '2028-02' ? 'February 2028 — posted' : 'March 2028 — preview (month to date)'}</div>
                <div className="text-xs text-slate-500">
                  {per === '2028-02' ? <>Run DEP-2028-02 posted 02 Mar 2028 as <Link to="/finance/gl/JV-2028-02-0052" className="font-mono text-sky-700 hover:underline">JV-2028-02-0052</Link> · hours locked from M15 hour meters & telematics</> : 'Uses operating hours to 10 Mar; final run after hours are locked at month end'}
                </div>
              </div>
              <Select value={per} onChange={(e) => setPer(e.target.value as '2028-02' | '2028-03')}>
                <option value="2028-02">Feb 2028 (posted)</option>
                <option value="2028-03">Mar 2028 (preview)</option>
              </Select>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Equipment depreciation by project code" subtitle="Operating-hours share; bars coloured by business line" />
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid stroke={GRID} horizontal={false} />
                  <XAxis type="number" {...axisProps} tickFormatter={(v: number) => idrShort(v).replace('IDR ', '')} />
                  <YAxis type="category" dataKey="name" {...axisProps} width={150} tick={{ fontSize: 11, fill: '#334155' }} />
                  <Tooltip content={<ChartTooltip format={idrShort} />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" name="Depreciation" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {chartData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {(['HL', 'PS', 'GS'] as const).map((bl) => <span key={bl} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: businessLines[bl].color }} />{businessLines[bl].short}</span>)}
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: NEUTRAL }} />Idle capacity — not charged to projects</span>
              </div>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader title="Allocation totals" />
                <div className="space-y-1.5 text-sm">
                  {byProj.byProject.map((p) => (
                    <div key={p.projectCode} className="flex items-center justify-between gap-2"><ProjectCodeChip code={p.projectCode} /><span className="num">{idr(p.amount)}</span></div>
                  ))}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5 text-slate-500"><span>Idle capacity (GEN-BPN)</span><span className="num">{idr(byProj.idle)}</span></div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-1.5 font-semibold"><span>Total charge</span><span className="num">{idr(byProj.byProject.reduce((s, p) => s + p.amount, 0) + byProj.idle)}</span></div>
                </div>
              </Card>
              <Callout tone="sky" title="How the charge is allocated">
                Rate per hour = monthly depreciation ÷ {STANDARD_HOURS} standard hours. Each project pays for the hours it used. Hours not worked stay on GEN-BPN as idle capacity — e.g. CR-050-01 stood idle all February, so none of its charge reached a project.
              </Callout>
            </div>
          </div>

          <Card padded={false}>
            <div className="px-4 pt-4"><CardHeader title="Per unit" subtitle={`Operating hours by project code · ${per === '2028-02' ? 'Feb 2028' : 'Mar 2028 MTD'}`} /></div>
            <DataTable
              dense
              rows={unitRows}
              rowKey={(r) => r.assetId}
              columns={[
                { key: 'u', header: 'Unit', render: (r) => <DocLink to={`/fleet/units/${r.unitId}`}>{r.unitId}</DocLink> },
                { key: 'm', header: 'Monthly charge', align: 'right', render: (r) => idr(r.monthly) },
                { key: 'rate', header: 'Rate / hour', align: 'right', render: (r) => idr(r.ratePerHour) },
                { key: 'op', header: 'Operating h', align: 'right', render: (r) => num(r.operating) },
                { key: 'idle', header: 'Idle h', align: 'right', render: (r) => <span className={cx(r.idle > r.operating && 'text-amber-700')}>{num(r.idle)}</span> },
                {
                  key: 'split', header: 'Charged to',
                  render: (r) => (
                    <div className="flex min-w-[240px] flex-wrap gap-1.5">
                      {r.split.length ? r.split.map((s) => <span key={s.projectCode} className="inline-flex items-center gap-1"><ProjectCodeChip code={s.projectCode} /><span className="num text-[11px] text-slate-600">{num(s.hours)} h · {idrShort(s.amount)}</span></span>) : <Badge tone="slate">No project hours</Badge>}
                    </div>
                  ),
                },
                { key: 'un', header: 'Idle capacity', align: 'right', render: (r) => <span className={cx(r.unabsorbed === r.monthly && 'font-semibold text-slate-900')}>{idr(r.unabsorbed)}</span> },
              ]}
            />
          </Card>
        </div>
      )}

      {tab === 'register' && (
        <Card padded={false}>
          <div className="flex flex-wrap gap-2 px-4 pt-4 pb-3">
            <SearchInput value={q} onChange={setQ} placeholder="Asset, description, SAP B1 no…" className="w-full sm:w-72" />
            <Select value={cls} onChange={(e) => setCls(e.target.value as AssetClass | '')}>
              <option value="">All classes</option>
              {CLASSES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </div>
          <DataTable columns={regCols} rows={register} rowKey={(a) => a.id} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
            <span>Register loaded under CUT-02 with acquisition values, accumulated depreciation and both book parameters — rehearsed on the Nov 2027 parallel run.</span>
            <ArchiveNote />
          </div>
        </Card>
      )}

      {tab === 'books' && (
        <div className="space-y-4">
          <Grid cols={4}>
            <Stat label="NBV commercial" value={idrShort(totals.nbv)} />
            <Stat label="NBV fiscal" value={idrShort(totals.fnbv)} />
            <Stat label="Temporary difference" value={idrShort(totals.facc - totals.acc)} sub="Fiscal depreciation ahead of commercial" />
            <Stat label="Deferred tax liability" value={idrShort((totals.facc - totals.acc) * TAX_RATE)} sub="At 22% corporate rate" />
          </Grid>
          <Card padded={false}>
            <DataTable columns={bookCols} rows={fixedAssets} rowKey={(a) => a.id} dense />
          </Card>
          <Callout tone="slate">Two parameter sets over the same asset register (FAT-27). The commercial book drives the P/L and project allocation; the fiscal book (PMK groups, declining balance where elected) drives the corporate income tax computation and the deferred tax schedule.</Callout>
        </div>
      )}
    </div>
  )
}
