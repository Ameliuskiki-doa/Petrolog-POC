import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Recycle, Truck, Warehouse, Plus, CheckCircle2, Circle, Send } from 'lucide-react'
import { Badge, Button, Callout, Card, CardHeader, DataTable, DescList, Drawer, Grid, Mono, PageHeader, ProjectCodeChip, SearchInput, Select, Stat, cx } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, dateTime, daysUntil, num } from '@/lib/format'
import { getVendor } from '@/data/core'
import { wasteManifests, type WasteManifest } from '@/data/supporting'

const statusTone: Record<WasteManifest['status'], 'slate' | 'amber' | 'sky' | 'blue' | 'violet' | 'green'> = {
  Draft: 'slate', 'Stored (TPS)': 'amber', 'Picked Up': 'sky', 'In Transit': 'blue', 'Received by Processor': 'violet', Closed: 'green',
}
const TPS_LIMIT = 90

export default function WasteManifests() {
  const toast = useToast()
  const [list, setList] = useState<WasteManifest[]>(wasteManifests)
  const [q, setQ] = useState('')
  const [st, setSt] = useState('All')
  const [sel, setSel] = useState<WasteManifest | null>(null)

  const rows = list
    .filter((m) => (st === 'All' || m.status === st) && (!q || `${m.id} ${m.manifestNo} ${m.wasteName} ${m.wasteCode} ${m.projectCode}`.toLowerCase().includes(q.toLowerCase())))
  const inTps = list.filter((m) => m.status === 'Draft' || m.status === 'Stored (TPS)')
  const overLimit = inTps.filter((m) => -daysUntil(m.storedSince) > TPS_LIMIT)

  const submit = (m: WasteManifest) => {
    const manifestNo = `FST-2028-0310-KT-00219-${String(95 + list.indexOf(m)).padStart(4, '0')}`
    const upd: WasteManifest = { ...m, manifestNo, status: 'Stored (TPS)', steps: m.steps.map((s, i) => (i === 0 ? { ...s, time: '2028-03-10T10:05' } : s)) }
    setList((l) => l.map((x) => (x.id === m.id ? upd : x)))
    setSel(upd)
    toast(`Manifest ${manifestNo} issued via Festronik — pickup requested from ${getVendor(m.transporterId)?.name}`, 'success')
  }

  return (
    <>
      <PageHeader
        module="M16 · HSE & Enviro Compliance · Stage 1A"
        title="Waste Manifests"
        subtitle="B3 (hazardous) waste from generation to disposal — temporary storage (TPS LB3) dwell time, licensed transporter, electronic manifest tracking (Festronik) and processor receipt. Disposal cost carries the generating project code."
        actions={<Button variant="primary" icon={<Plus size={15} />} onClick={() => toast('New manifest draft created — select waste stream and packaging', 'info')}>New manifest</Button>}
      />
      <Grid cols={4} className="mb-5">
        <Stat label="Manifests this year" value={list.length + 9} sub={`${list.filter((m) => m.status === 'Closed').length + 9} closed & returned`} icon={<Recycle size={16} />} />
        <Stat label="In transit" value={list.filter((m) => m.status === 'In Transit' || m.status === 'Picked Up').length} sub="GPS-tracked by transporter" icon={<Truck size={16} />} />
        <Stat label="Held in TPS" value={inTps.length} sub={`${overLimit.length} beyond ${TPS_LIMIT}-day storage limit`} tone={overLimit.length ? 'bad' : 'good'} icon={<Warehouse size={16} />} />
        <Stat label="Licensed transporter" value="VND-00219" sub={`${getVendor('VND-00219')?.name} · licence valid to ${date(getVendor('VND-00219')!.docsExpiry)}`} to="/vendors/VND-00219" />
      </Grid>
      {overLimit.length > 0 && (
        <div className="mb-4">
          <Callout tone="red" title={`${overLimit.length} waste stream${overLimit.length > 1 ? 's' : ''} exceed the ${TPS_LIMIT}-day TPS storage limit`}>
            {overLimit.map((m) => `${m.wasteName} (${m.source}, stored since ${date(m.storedSince)})`).join('; ')}. Issue the manifest and schedule pickup to stay within the TPS LB3 permit conditions.
          </Callout>
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search manifest, waste code, project…" className="w-full sm:w-72" />
        <Select value={st} onChange={(e) => setSt(e.target.value)}>
          {['All', ...Object.keys(statusTone)].map((c) => <option key={c}>{c}</option>)}
        </Select>
      </div>
      <Card padded={false}>
        <DataTable
          rows={rows}
          rowKey={(m) => m.id}
          onRowClick={setSel}
          columns={[
            { key: 'id', header: 'Manifest', render: (m) => <div><Mono className="font-medium text-brand-700">{m.id}</Mono><div className="font-mono text-[10px] text-slate-500">{m.manifestNo}</div></div> },
            { key: 'w', header: 'Waste', render: (m) => <div className="min-w-[220px]"><div className="text-sm text-slate-800">{m.wasteName}</div><div className="text-xs text-slate-500">Code {m.wasteCode} · {m.source}</div></div> },
            { key: 'q', header: 'Quantity', align: 'right', render: (m) => `${num(m.qty, m.qty < 10 ? 1 : 0)} ${m.uom}` },
            { key: 'p', header: 'Project', render: (m) => <ProjectCodeChip code={m.projectCode} /> },
            { key: 't', header: 'Transporter', render: (m) => <Link onClick={(e) => e.stopPropagation()} to={`/vendors/${m.transporterId}`} className="text-xs text-brand-700 hover:underline">{m.transporterId}</Link> },
            { key: 'tps', header: 'Days in TPS', align: 'right', render: (m) => {
              if (!(m.status === 'Draft' || m.status === 'Stored (TPS)')) return <span className="text-slate-300">—</span>
              const d = -daysUntil(m.storedSince)
              return <span className={d > TPS_LIMIT ? 'font-semibold text-red-600' : ''}>{d}</span>
            } },
            { key: 'prog', header: 'Tracking', render: (m) => <Track m={m} compact /> },
            { key: 's', header: 'Status', render: (m) => <Badge dot tone={statusTone[m.status]}>{m.status}</Badge> },
          ]}
        />
      </Card>

      {sel && (
        <Drawer open onClose={() => setSel(null)} title={`${sel.id} · ${sel.wasteName}`} width="max-w-xl"
          footer={<><Button onClick={() => setSel(null)}>Close</Button>{sel.status === 'Draft' && <Button variant="primary" icon={<Send size={15} />} onClick={() => submit(sel)}>Issue manifest (Festronik)</Button>}</>}>
          <DescList cols={2} items={[
            { label: 'Manifest number', value: <Mono>{sel.manifestNo}</Mono> },
            { label: 'Status', value: <Badge dot tone={statusTone[sel.status]}>{sel.status}</Badge> },
            { label: 'Waste code (PP 22/2021)', value: sel.wasteCode },
            { label: 'Quantity', value: `${num(sel.qty, sel.qty < 10 ? 1 : 0)} ${sel.uom}` },
            { label: 'Packaging', value: sel.packaging },
            { label: 'Generated at', value: sel.source },
            { label: 'Project code', value: <ProjectCodeChip code={sel.projectCode} showName /> },
            { label: 'Stored in TPS since', value: date(sel.storedSince) },
            { label: 'Transporter', value: <Link className="text-brand-700 hover:underline" to={`/vendors/${sel.transporterId}`}>{getVendor(sel.transporterId)?.name}</Link> },
            { label: 'Vehicle', value: sel.vehicle },
            { label: 'Receiver / processor', value: sel.receiver },
            { label: 'Created', value: date(sel.created) },
          ]} />
          <div className="mt-5">
            <CardHeader title="Manifest tracking" subtitle="Festronik-style chain of custody: generator → transporter → processor" />
            <Track m={sel} />
          </div>
          {sel.projectCode === 'PS-2028-003' && (
            <div className="mt-4"><Callout tone="blue">Spent catalyst from the Reactor R-201 change-out. Disposal cost is charged to PS-2028-003 and is pass-through billable under CTR-2027-019.</Callout></div>
          )}
        </Drawer>
      )}
    </>
  )
}

function Track({ m, compact }: { m: WasteManifest; compact?: boolean }) {
  if (compact) {
    const done = m.steps.filter((s) => s.time).length
    return (
      <div className="flex items-center gap-1" title={`${done} of ${m.steps.length} steps`}>
        {m.steps.map((s, i) => <span key={i} className={cx('h-1.5 w-5 rounded-full', s.time ? 'bg-emerald-500' : 'bg-slate-200')} />)}
      </div>
    )
  }
  return (
    <ol className="space-y-2.5">
      {m.steps.map((s) => (
        <li key={s.label} className="flex items-start gap-2.5 text-sm">
          {s.time ? <CheckCircle2 size={17} className="mt-0.5 text-emerald-600" /> : <Circle size={17} className="mt-0.5 text-slate-300" />}
          <div><div className={s.time ? 'text-slate-800' : 'text-slate-400'}>{s.label}</div>{s.time && <div className="text-xs text-slate-500">{dateTime(s.time)}</div>}</div>
        </li>
      ))}
    </ol>
  )
}
