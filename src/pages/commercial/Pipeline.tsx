import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Clock, KanbanSquare, List, Plus, Target, Trophy, TrendingUp } from 'lucide-react'
import {
  Badge, Button, Card, CardHeader, DataTable, Drawer, FormField, Grid, Input, PageHeader, SearchInput, Select, Stat, StatusBadge, cx, type Column,
} from '@/components/ui'
import { businessLines, customers, employees, type BusinessLine } from '@/data/core'
import { defaultProbability, oppStages, type OppStage, type Opportunity } from '@/data/commercial'
import { ageDays, date, idrShort, pct, TODAY_ISO } from '@/lib/format'
import { ChartTooltip, GRID, Legend, NEUTRAL, SERIES, axisProps } from '@/lib/chart'
import { useToast } from '@/lib/app-state'
import { BLTag, MODULE_CRM, Person, customerName } from './shared'
import { oppStore, useOpps } from './store'

const weighted = (o: Opportunity) => (o.value * o.probability) / 100
const openStage = (s: OppStage) => s !== 'Won' && s !== 'Lost'

export default function Pipeline() {
  const opps = useOpps()
  const nav = useNavigate()
  const [view, setView] = useState<'board' | 'list'>('board')
  const [bl, setBl] = useState<'' | BusinessLine>('')
  const [owner, setOwner] = useState('')
  const [q, setQ] = useState('')
  const [drawer, setDrawer] = useState(false)

  const rows = useMemo(
    () =>
      opps.filter(
        (o) =>
          (!bl || o.businessLine === bl) &&
          (!owner || o.ownerId === owner) &&
          (!q || `${o.id} ${o.title} ${customerName(o.customerId)}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [opps, bl, owner, q],
  )

  const open = rows.filter((o) => openStage(o.stage))
  const won = rows.filter((o) => o.stage === 'Won')
  const lost = rows.filter((o) => o.stage === 'Lost')
  const openValue = open.reduce((s, o) => s + o.value, 0)
  const openWeighted = open.reduce((s, o) => s + weighted(o), 0)
  const winRate = won.length + lost.length ? (won.length / (won.length + lost.length)) * 100 : 0
  const winRateValue = won.length + lost.length ? (won.reduce((s, o) => s + o.value, 0) / [...won, ...lost].reduce((s, o) => s + o.value, 0)) * 100 : 0
  const avgAge = open.length ? open.reduce((s, o) => s + ageDays(o.created), 0) / open.length : 0

  const byStage = oppStages.map((s) => {
    const r: Record<string, number | string> = { stage: s }
    for (const k of ['HL', 'PS', 'GS'] as BusinessLine[]) r[k] = rows.filter((o) => o.stage === s && o.businessLine === k).reduce((a, o) => a + o.value, 0)
    return r
  })

  const buckets = [
    { label: '0–30 d', min: 0, max: 30 },
    { label: '31–60 d', min: 31, max: 60 },
    { label: '61–90 d', min: 61, max: 90 },
    { label: '> 90 d', min: 91, max: 99999 },
  ].map((b) => {
    const inB = open.filter((o) => {
      const a = ageDays(o.created)
      return a >= b.min && a <= b.max
    })
    return { bucket: b.label, count: inB.length, value: inB.reduce((s, o) => s + o.value, 0) }
  })

  const columns: Column<Opportunity>[] = [
    { key: 'id', header: 'Opportunity', render: (o) => <div className="min-w-[240px]"><div className="font-mono text-[11px] text-slate-500">{o.id}</div><div className="font-medium text-slate-800">{o.title}</div></div> },
    { key: 'cust', header: 'Client', render: (o) => <span className="text-slate-600">{customerName(o.customerId)}</span> },
    { key: 'bl', header: 'Business line', render: (o) => <BLTag bl={o.businessLine} /> },
    { key: 'stage', header: 'Stage', render: (o) => <StatusBadge status={o.stage} /> },
    { key: 'value', header: 'Value', align: 'right', render: (o) => idrShort(o.value) },
    { key: 'prob', header: 'Prob.', align: 'right', render: (o) => `${o.probability}%` },
    { key: 'w', header: 'Weighted', align: 'right', render: (o) => <span className="font-medium">{idrShort(weighted(o))}</span> },
    { key: 'age', header: 'Ageing', align: 'right', render: (o) => <AgeCell o={o} /> },
    { key: 'close', header: 'Expected close', render: (o) => <span className="whitespace-nowrap">{date(o.expectedClose)}</span> },
    { key: 'owner', header: 'Owner', render: (o) => <Person id={o.ownerId} /> },
  ]

  return (
    <>
      <PageHeader
        module={MODULE_CRM}
        title="Opportunity pipeline"
        subtitle="Every lead and tender from registration to award. Won opportunities become contracts, and contracts issue project codes."
        actions={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setDrawer(true)}>New opportunity</Button>}
      />

      <Grid cols={4} className="mb-4">
        <Stat label="Open pipeline" value={idrShort(openValue)} sub={`${open.length} open opportunities`} icon={<Target size={16} />} />
        <Stat label="Weighted pipeline" value={idrShort(openWeighted)} sub={`${pct((openWeighted / (openValue || 1)) * 100, 0)} of open value`} icon={<TrendingUp size={16} />} />
        <Stat label="Win rate (count · value)" value={`${pct(winRate, 0)} · ${pct(winRateValue, 0)}`} sub={`${won.length} won, ${lost.length} lost (last 12 months)`} tone={winRate >= 50 ? 'good' : 'warn'} icon={<Trophy size={16} />} />
        <Stat label="Average age of open deals" value={`${Math.round(avgAge)} days`} sub={`${open.filter((o) => ageDays(o.stageSince) > 30).length} stuck > 30 days in stage`} tone="warn" icon={<Clock size={16} />} />
      </Grid>

      <Grid cols={2} className="mb-4">
        <Card>
          <CardHeader title="Pipeline value by stage" subtitle="Stacked by business line (BDS-12). Click a stage in the board to drill down." />
          <Legend items={(['HL', 'PS', 'GS'] as BusinessLine[]).map((k) => ({ label: businessLines[k].short, color: businessLines[k].color }))} />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byStage} margin={{ left: 8, right: 8, top: 4 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="stage" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v: number) => `${v / 1e9}`} width={40} label={{ value: 'IDR bn', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }} />
              <Tooltip content={<ChartTooltip format={idrShort} />} cursor={{ fill: '#f1f5f9' }} />
              {(['HL', 'PS', 'GS'] as BusinessLine[]).map((k, i, a) => (
                <Bar key={k} dataKey={k} name={businessLines[k].short} stackId="v" fill={businessLines[k].color} radius={i === a.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardHeader title="Opportunity ageing" subtitle="Open opportunities by days since registration" />
          <Legend items={[{ label: 'Open value', color: SERIES[0] }]} />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={buckets} margin={{ left: 8, right: 8, top: 4 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="bucket" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v: number) => `${v / 1e9}`} width={40} label={{ value: 'IDR bn', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }} />
              <Tooltip content={<ChartTooltip format={idrShort} />} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="value" name="Open value" fill={SERIES[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
            {buckets.map((b) => (
              <span key={b.bucket}>{b.bucket}: <b className="text-slate-700">{b.count}</b></span>
            ))}
          </div>
        </Card>
      </Grid>

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search opportunity or client…" className="w-full sm:w-64" />
          <Select value={bl} onChange={(e) => setBl(e.target.value as '' | BusinessLine)}>
            <option value="">All business lines</option>
            {(['HL', 'PS', 'GS'] as BusinessLine[]).map((k) => <option key={k} value={k}>{businessLines[k].short}</option>)}
          </Select>
          <Select value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">All owners</option>
            {[...new Set(opps.map((o) => o.ownerId))].map((id) => <option key={id} value={id}>{employees.find((e) => e.id === id)?.name}</option>)}
          </Select>
          <div className="ml-auto flex rounded-lg border border-slate-300 p-0.5">
            <button onClick={() => setView('board')} className={cx('flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium', view === 'board' ? 'bg-ink-900 text-white' : 'text-slate-600')}><KanbanSquare size={14} /> Board</button>
            <button onClick={() => setView('list')} className={cx('flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium', view === 'list' ? 'bg-ink-900 text-white' : 'text-slate-600')}><List size={14} /> List</button>
          </div>
        </div>

        {view === 'list' ? (
          <DataTable columns={columns} rows={rows} rowKey={(o) => o.id} onRowClick={(o) => nav(`/crm/opportunities/${o.id}`)} />
        ) : (
          <div className="scrollbar-thin flex gap-3 overflow-x-auto p-3">
            {oppStages.map((s) => {
              const col = rows.filter((o) => o.stage === s)
              const total = col.reduce((a, o) => a + o.value, 0)
              return (
                <div key={s} className="flex w-64 shrink-0 flex-col rounded-lg bg-slate-50 ring-1 ring-slate-200">
                  <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={s} />
                      <span className="text-xs text-slate-500">{col.length}</span>
                    </div>
                    <span className="num text-xs font-medium text-slate-600">{idrShort(total)}</span>
                  </div>
                  <div className="flex flex-col gap-2 px-2 pb-2">
                    {col.length === 0 && <div className="rounded-md border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">No opportunities</div>}
                    {col.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => nav(`/crm/opportunities/${o.id}`)}
                        className="rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm transition hover:border-brand-300 hover:shadow"
                        style={{ borderLeft: `3px solid ${businessLines[o.businessLine].color}` }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-slate-500">{o.id}</span>
                          <AgeCell o={o} />
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-[13px] font-medium text-slate-800">{o.title}</div>
                        <div className="mt-0.5 truncate text-[11px] text-slate-500">{customerName(o.customerId)}</div>
                        <div className="mt-2 flex items-end justify-between">
                          <div>
                            <div className="num text-sm font-semibold text-slate-900">{idrShort(o.value)}</div>
                            <div className="num text-[11px] text-slate-500">{o.probability}% · wtd {idrShort(weighted(o))}</div>
                          </div>
                          {o.stage === 'Won' && o.projectCode && <Badge tone="green">{o.projectCode}</Badge>}
                          {o.stage === 'Review' && <Badge tone="violet">3-track review</Badge>}
                          {o.stage === 'Lost' && <Badge tone="red">Lost</Badge>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <NewOpportunityDrawer open={drawer} onClose={() => setDrawer(false)} onCreated={(id) => nav(`/crm/opportunities/${id}`)} />
    </>
  )
}

function AgeCell({ o }: { o: Opportunity }) {
  const inStage = ageDays(o.stageSince)
  const stale = openStage(o.stage) && inStage > 30
  return (
    <span className={cx('num text-[11px] whitespace-nowrap', stale ? 'font-medium text-amber-700' : 'text-slate-500')} title={`${ageDays(o.created)} days since registration`}>
      {openStage(o.stage) ? `${inStage} d in stage` : `${ageDays(o.created) - ageDays(o.stageSince)} d cycle`}
    </span>
  )
}

function NewOpportunityDrawer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const toast = useToast()
  const [f, setF] = useState({ title: '', customerId: '', bl: 'HL' as BusinessLine, source: 'Tender invitation' as Opportunity['source'], value: '', close: '2028-06-30', ownerId: 'EMP-0011', tender: '' })
  const [err, setErr] = useState<string | null>(null)
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))

  const submit = () => {
    if (!f.title.trim() || !f.customerId || !Number(f.value)) {
      setErr('Title, client and estimated value are required.')
      return
    }
    const existing = oppStore.get()
    const n = Math.max(...existing.filter((o) => o.id.startsWith('OPP-2028')).map((o) => Number(o.id.slice(-3)))) + 1
    const id = `OPP-2028-${String(n).padStart(3, '0')}`
    const comps = { HL: ['HL-2027-014', 'HL-2027-021'], PS: ['PS-2028-003', 'PS-2027-017'], GS: ['GS-2027-008'], CORP: [] }[f.bl]
    const opp: Opportunity = {
      id, title: f.title.trim(), customerId: f.customerId, businessLine: f.bl, stage: 'Lead', value: Number(f.value) * 1e9, probability: defaultProbability.Lead,
      ownerId: f.ownerId, source: f.source, created: TODAY_ISO, stageSince: TODAY_ISO, expectedClose: f.close, comparables: comps,
      reviews: (['Legal', 'Commercial', 'Technical'] as const).map((t) => ({ track: t, reviewerId: t === 'Legal' ? 'EMP-0028' : t === 'Commercial' ? 'EMP-0002' : 'EMP-0003', slaDays: t === 'Commercial' ? 3 : 5, status: 'Not started' as const, checklist: [], comments: [] })),
      proposals: [],
    }
    oppStore.set((s) => [opp, ...s])
    toast(`${id} registered in the pipeline as Lead`, 'success')
    setErr(null)
    onClose()
    onCreated(id)
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New opportunity"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Register opportunity</Button></>}
    >
      <div className="space-y-4">
        <FormField label="Opportunity title"><Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Heavy lift — Train 3 compressor" /></FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Client">
            <Select className="w-full" value={f.customerId} onChange={(e) => set('customerId', e.target.value)}>
              <option value="">Select client…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Business line">
            <Select className="w-full" value={f.bl} onChange={(e) => set('bl', e.target.value)}>
              {(['HL', 'PS', 'GS'] as BusinessLine[]).map((k) => <option key={k} value={k}>{businessLines[k].name}</option>)}
            </Select>
          </FormField>
          <FormField label="Source">
            <Select className="w-full" value={f.source} onChange={(e) => set('source', e.target.value)}>
              {['Tender invitation', 'Direct negotiation', 'Existing client extension', 'Referral'].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="Estimated value (IDR bn)"><Input type="number" min={0} step="0.1" value={f.value} onChange={(e) => set('value', e.target.value)} placeholder="0.0" /></FormField>
          <FormField label="Expected close"><Input type="date" value={f.close} onChange={(e) => set('close', e.target.value)} /></FormField>
          <FormField label="Owner">
            <Select className="w-full" value={f.ownerId} onChange={(e) => set('ownerId', e.target.value)}>
              {employees.filter((e) => ['Commercial', 'Operations', 'Plant Services', 'Green Solutions'].includes(e.department) && e.type === 'Indirect').map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Client tender reference (optional)" hint="If this is a tender, the tender schedule and bid bond are tracked under Tenders & Bid Bonds."><Input value={f.tender} onChange={(e) => set('tender', e.target.value)} placeholder="e.g. NFZ/TND/2028/031" /></FormField>
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
          On registration the opportunity starts as <b>Lead</b> ({defaultProbability.Lead}% probability). Moving to <b>Review</b> opens the Legal, Commercial and Technical checklists in parallel, each with its own SLA. The cost estimate is pre-filled from comparable closed projects in the same business line.
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <div className="text-[11px]" style={{ color: NEUTRAL }}>Registered by the logged-in user · {date(TODAY_ISO)}</div>
      </div>
    </Drawer>
  )
}
