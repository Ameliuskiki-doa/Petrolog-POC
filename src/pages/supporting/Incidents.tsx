import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, Plus, CalendarCheck2, Activity, HeartPulse, Smartphone, PhoneCall } from 'lucide-react'
import { Line, LineChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Badge, Button, Callout, Card, CardHeader, DataTable, Drawer, FormField, Grid, Input, Mono, PageHeader, ProjectCodeChip, SearchInput, Select, Stat, StatusBadge,
  type Column,
} from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { dateTime, daysUntil, num, period } from '@/lib/format'
import { ChartTooltip, GRID, Legend, SERIES, axisProps } from '@/lib/chart'
import { projects } from '@/data/core'
import { LAST_LTI, hseMonthly, incidents as seed, type Incident, type IncidentClass } from '@/data/supporting'
import { UnitLink } from './shared'

export const classTone: Record<IncidentClass, 'slate' | 'sky' | 'amber' | 'red' | 'orange' | 'violet'> = {
  'Near Miss': 'sky', 'First Aid': 'slate', 'Medical Treatment': 'amber', LTI: 'red', 'Property Damage': 'orange', 'Environmental Spill': 'violet',
}

export const incidentStatusTone = { Reported: 'amber', 'Under Investigation': 'violet', 'CAPA Open': 'blue', Closed: 'green' } as const

export default function Incidents() {
  const nav = useNavigate()
  const toast = useToast()
  const [list, setList] = useState<Incident[]>(seed)
  const [q, setQ] = useState('')
  const [cls, setCls] = useState('All')
  const [st, setSt] = useState('All')
  const [creating, setCreating] = useState(false)

  const rows = list
    .filter((i) => (cls === 'All' || i.classification === cls) && (st === 'All' || i.status === st))
    .filter((i) => !q || `${i.id} ${i.title} ${i.site} ${i.projectCode}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.time.localeCompare(a.time))

  // Rolling 12-month statistics
  const mh = hseMonthly.reduce((a, m) => a + m.manHours, 0)
  const lti = hseMonthly.reduce((a, m) => a + m.lti, 0)
  const rec = hseMonthly.reduce((a, m) => a + m.recordables, 0)
  const ltifr = (lti * 1_000_000) / mh
  const trir = (rec * 200_000) / mh
  const chart = hseMonthly.map((m, i) => {
    const w = hseMonthly.slice(Math.max(0, i - 11), i + 1)
    const h = w.reduce((a, x) => a + x.manHours, 0)
    return {
      month: period(m.month).slice(0, 3) + ' ' + m.month.slice(2, 4),
      LTIFR: +((w.reduce((a, x) => a + x.lti, 0) * 1e6) / h).toFixed(2),
      TRIR: +((w.reduce((a, x) => a + x.recordables, 0) * 2e5) / h).toFixed(2),
      nearMiss: m.nearMiss,
      firstAid: m.firstAid,
    }
  })
  const openCapa = list.flatMap((i) => i.capa).filter((c) => c.status !== 'Done')
  const overdueCapa = openCapa.filter((c) => c.status === 'Overdue' || c.due < '2028-03-10')

  const cols: Column<Incident>[] = [
    { key: 'id', header: 'Incident', render: (i) => <div><Mono className="font-medium text-brand-700">{i.id}</Mono><div className="text-xs text-slate-500">{dateTime(i.time)}</div></div> },
    { key: 't', header: 'Description', render: (i) => <div className="max-w-[340px] min-w-[240px]"><div className="text-sm text-slate-800">{i.title}</div><div className="truncate text-xs text-slate-500">{i.site}</div></div> },
    { key: 'c', header: 'Classification', render: (i) => <Badge tone={classTone[i.classification]}>{i.classification}</Badge> },
    { key: 's', header: 'Severity', render: (i) => <StatusBadge status={i.severity} /> },
    { key: 'p', header: 'Project', render: (i) => <ProjectCodeChip code={i.projectCode} /> },
    { key: 'u', header: 'Unit', render: (i) => (i.unitId ? <UnitLink id={i.unitId} /> : <span className="text-slate-300">—</span>) },
    { key: 'ch', header: 'Channel', render: (i) => <span className="flex items-center gap-1 text-xs text-slate-600">{i.channel.startsWith('Mobile') ? <Smartphone size={13} /> : i.channel.startsWith('Hotline') ? <PhoneCall size={13} /> : null}{i.channel}</span> },
    { key: 'capa', header: 'CAPA', align: 'right', render: (i) => `${i.capa.filter((c) => c.status === 'Done').length}/${i.capa.length}` },
    { key: 'st', header: 'Status', render: (i) => <Badge dot tone={incidentStatusTone[i.status]}>{i.status}</Badge> },
  ]

  return (
    <>
      <PageHeader
        module="M16 · HSE & Enviro Compliance · Stage 1A"
        title="HSE Incidents"
        subtitle="Incidents reported from the field (mobile app works offline), classified, investigated with root cause and tracked through corrective and preventive actions. Supports ISO 45001, ISO 14001 and SMK3."
        actions={<Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreating(true)}>Report incident</Button>}
      />
      <div className="mb-4">
        <Callout tone="amber" icon={<Activity size={16} />} title="24/7 function — 99.5% availability tier">
          HSE reporting runs on the highest service tier (redundant app servers, database replication, automatic failover). The on-call HSE officer is paged within 5 minutes of any High/Critical report, day or night.
        </Callout>
      </div>
      <Grid cols={5} className="mb-5">
        <Stat label="Days without LTI" value={-daysUntil(LAST_LTI)} sub="Last LTI 21 Nov 2027 (INC-2027-114)" tone="good" icon={<CalendarCheck2 size={16} />} />
        <Stat label="LTIFR (rolling 12 m)" value={ltifr.toFixed(2)} sub="per 1,000,000 man-hours · target < 1.0" tone={ltifr < 1 ? 'good' : 'warn'} icon={<HeartPulse size={16} />} />
        <Stat label="TRIR (rolling 12 m)" value={trir.toFixed(2)} sub="per 200,000 man-hours · target < 1.0" tone={trir < 1 ? 'good' : 'warn'} />
        <Stat label="Man-hours (12 m)" value={num(mh)} sub="From Mekari Talenta timesheets" />
        <Stat label="Open CAPA" value={openCapa.length} sub={`${overdueCapa.length} overdue`} tone={overdueCapa.length ? 'bad' : 'good'} icon={<ShieldAlert size={16} />} />
      </Grid>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Frequency rates — rolling 12 months" subtitle="LTIFR per 1M man-hours · TRIR per 200k man-hours" />
          <Legend items={[{ label: 'LTIFR', color: SERIES[0] }, { label: 'TRIR', color: SERIES[1] }]} />
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chart}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} width={36} />
              <Tooltip content={<ChartTooltip format={(v) => v.toFixed(2)} />} />
              <Line type="monotone" dataKey="LTIFR" stroke={SERIES[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="TRIR" stroke={SERIES[1]} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardHeader title="Leading indicators — reports per month" subtitle="A rising near-miss count is a healthy reporting culture" />
          <Legend items={[{ label: 'Near miss', color: SERIES[0] }, { label: 'First aid', color: SERIES[3] }]} />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} width={30} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="nearMiss" name="Near miss" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="firstAid" name="First aid" fill={SERIES[3]} radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search incident, site, project…" className="w-full sm:w-72" />
        <Select value={cls} onChange={(e) => setCls(e.target.value)}>
          {['All', 'Near Miss', 'First Aid', 'Medical Treatment', 'LTI', 'Property Damage', 'Environmental Spill'].map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select value={st} onChange={(e) => setSt(e.target.value)}>
          {['All', 'Reported', 'Under Investigation', 'CAPA Open', 'Closed'].map((c) => <option key={c}>{c}</option>)}
        </Select>
      </div>
      <Card padded={false}>
        <DataTable columns={cols} rows={rows} rowKey={(i) => i.id} onRowClick={(i) => nav(`/hse/incidents/${i.id}`)} />
      </Card>

      <ReportDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(i) => {
          setList((l) => [i, ...l])
          setCreating(false)
          toast(`${i.id} reported — HSE on-call paged${i.severity === 'High' || i.severity === 'Critical' ? ' and client notified' : ''}`, 'success')
        }}
        nextId={`INC-2028-0${32 + list.length - seed.length}`}
      />
    </>
  )
}

function ReportDrawer({ open, onClose, onSubmit, nextId }: { open: boolean; onClose: () => void; onSubmit: (i: Incident) => void; nextId: string }) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [cls, setCls] = useState<IncidentClass>('Near Miss')
  const [sev, setSev] = useState<Incident['severity']>('Medium')
  const [code, setCode] = useState('')
  const [desc, setDesc] = useState('')
  if (!open) return null
  const submit = () => {
    if (!title || !desc) return toast('Title and description are required', 'error')
    if (!code) return toast('Select the project code / site where it happened', 'error')
    const p = projects.find((x) => x.code === code)!
    onSubmit({
      id: nextId, time: '2028-03-10T09:15', site: p.site, projectCode: code, classification: cls, severity: sev, title, description: desc, reporterId: 'EMP-0010', channel: 'Web',
      status: 'Reported', investigatorId: 'EMP-0010', immediateAction: 'To be recorded by investigator', capa: [], photos: 0,
      log: [{ time: '2028-03-10T09:15', text: 'Reported via web', tone: 'amber' }],
    })
  }
  return (
    <Drawer open onClose={onClose} title="Report incident" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Submit report</Button></>}>
      <div className="space-y-4">
        <Callout tone="blue">Most reports arrive from the field mobile app — captured offline with photos and GPS, synced when signal returns. This form is the web equivalent.</Callout>
        <FormField label="What happened (short title)"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dropped object from crane hook block" /></FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Classification">
            <Select className="w-full" value={cls} onChange={(e) => setCls(e.target.value as IncidentClass)}>
              {Object.keys(classTone).map((c) => <option key={c}>{c}</option>)}
            </Select>
          </FormField>
          <FormField label="Potential severity">
            <Select className="w-full" value={sev} onChange={(e) => setSev(e.target.value as Incident['severity'])}>
              {['Low', 'Medium', 'High', 'Critical'].map((c) => <option key={c}>{c}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField label="Project code / site">
          <Select className="w-full" value={code} onChange={(e) => setCode(e.target.value)}>
            <option value="">— select —</option>
            {projects.filter((p) => p.status !== 'Closed').map((p) => <option key={p.code} value={p.code}>{p.code} — {p.site}</option>)}
          </Select>
        </FormField>
        <FormField label="Description">
          <textarea className="min-h-[100px] w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </FormField>
      </div>
    </Drawer>
  )
}
