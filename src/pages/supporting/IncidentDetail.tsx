import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Camera, MapPin, Plus, CheckCheck, Search, FileText } from 'lucide-react'
import {
  Badge, Button, Callout, Card, CardHeader, DataTable, DescList, EmptyState, FormField, Input, Modal, Mono, PageHeader, ProjectCodeChip, Select, StatusBadge, Stepper, Timeline,
} from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, dateTime } from '@/lib/format'
import { employees, getEmployee } from '@/data/core'
import { getIncident, type Capa, type Incident } from '@/data/supporting'
import { Person, UnitLink } from './shared'
import { classTone, incidentStatusTone } from './Incidents'

export default function IncidentDetail() {
  const { id } = useParams()
  const seed = getIncident(id)
  if (!seed) {
    return (
      <>
        <PageHeader title="Incident not found" crumbs={[{ label: 'HSE Incidents', to: '/hse/incidents' }, { label: id ?? '' }]} />
        <Card><EmptyState title={`No incident ${id}`} /></Card>
      </>
    )
  }
  return <Detail key={seed.id} seed={seed} />
}

function Detail({ seed }: { seed: Incident }) {
  const toast = useToast()
  const [inc, setInc] = useState<Incident>(seed)
  const [adding, setAdding] = useState(false)
  const [rc, setRc] = useState(seed.rootCause ?? '')
  const steps = ['Reported', 'Under Investigation', 'CAPA Open', 'Closed']
  const allDone = inc.capa.length > 0 && inc.capa.every((c) => c.status === 'Done')
  const push = (text: string, tone: 'blue' | 'green' | 'amber' = 'blue') => ({ time: '2028-03-10T09:40', text, tone })

  const advance = () => {
    if (inc.status === 'Reported') {
      setInc((x) => ({ ...x, status: 'Under Investigation', log: [...x.log, push('Investigation opened by HSE Manager')] }))
      toast('Investigation opened — team notified', 'success')
    } else if (inc.status === 'Under Investigation') {
      if (!rc.trim()) return toast('Record the root cause before moving to CAPA', 'error')
      if (!inc.capa.length) return toast('Add at least one corrective/preventive action', 'error')
      setInc((x) => ({ ...x, rootCause: rc, status: 'CAPA Open', log: [...x.log, push('Root cause approved; CAPA tracking started')] }))
      toast('Root cause approved — CAPA owners notified', 'success')
    } else if (inc.status === 'CAPA Open') {
      if (!allDone) return toast('All CAPA must be done and verified before closing', 'error')
      setInc((x) => ({ ...x, status: 'Closed', log: [...x.log, push('Effectiveness verified — incident closed', 'green')] }))
      toast('Incident closed', 'success')
    }
  }
  const setCapa = (cid: string, status: Capa['status']) => {
    setInc((x) => ({ ...x, capa: x.capa.map((c) => (c.id === cid ? { ...c, status } : c)) }))
    toast(`CAPA ${cid} marked ${status.toLowerCase()}`, 'success')
  }

  return (
    <>
      <PageHeader
        module="M16 · HSE & Enviro Compliance"
        crumbs={[{ label: 'HSE Incidents', to: '/hse/incidents' }, { label: inc.id }]}
        title={<span className="flex flex-wrap items-center gap-2">{inc.id} <Badge dot tone={incidentStatusTone[inc.status]}>{inc.status}</Badge></span>}
        subtitle={inc.title}
        actions={
          inc.status !== 'Closed' && (
            <Button variant="primary" icon={inc.status === 'CAPA Open' ? <CheckCheck size={15} /> : <Search size={15} />} onClick={advance}>
              {inc.status === 'Reported' ? 'Start investigation' : inc.status === 'Under Investigation' ? 'Approve root cause & CAPA' : 'Verify & close'}
            </Button>
          )
        }
      />
      <Card className="mb-4">
        <Stepper steps={steps} current={inc.status} />
        <div className="mt-4">
          <DescList
            cols={4}
            items={[
              { label: 'Date / time', value: dateTime(inc.time) },
              { label: 'Classification', value: <Badge tone={classTone[inc.classification]}>{inc.classification}</Badge> },
              { label: 'Potential severity', value: <StatusBadge status={inc.severity} /> },
              { label: 'Project code', value: <ProjectCodeChip code={inc.projectCode} showName /> },
              { label: 'Location', value: <span className="flex items-center gap-1"><MapPin size={13} className="text-slate-400" />{inc.site}</span> },
              { label: 'Reported by', value: <span>{getEmployee(inc.reporterId)?.name} <span className="text-xs text-slate-500">via {inc.channel}</span></span> },
              { label: 'Unit involved', value: inc.unitId ? <UnitLink id={inc.unitId} showType /> : '—' },
              { label: 'Person involved', value: inc.personId ? `${getEmployee(inc.personId)?.name}${inc.lostDays ? ` · ${inc.lostDays} days lost` : ''}` : '—' },
            ]}
          />
        </div>
      </Card>

      {inc.classification === 'Environmental Spill' && (
        <div className="mb-4"><Callout tone="violet" title="Environmental — ISO 14001">Contaminated material is tracked to disposal through a B3 waste manifest — see <Link to="/hse/waste" className="underline">Waste Manifests</Link> (WM-2028-015).</Callout></div>
      )}
      {inc.classification === 'LTI' && (
        <div className="mb-4"><Callout tone="red" title="Statutory reporting">LTI reported to Disnaker within 2×24 h (form KK2) and to the client per contract. Counts toward LTIFR.</Callout></div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Description & immediate action" />
            <p className="text-sm text-slate-700">{inc.description}</p>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><span className="font-medium">Immediate action: </span>{inc.immediateAction}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: inc.photos }).map((_, i) => (
                <div key={i} className="flex h-16 w-20 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Camera size={18} /></div>
              ))}
              {inc.photos > 0 && <span className="self-end text-xs text-slate-500">{inc.photos} photos · geotagged · captured on mobile</span>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Investigation & root cause" subtitle={`Lead investigator: ${getEmployee(inc.investigatorId)?.name}`} />
            {inc.whys && (
              <ol className="mb-3 space-y-1.5">
                {inc.whys.map((w, i) => (
                  <li key={i} className="flex gap-2 text-sm"><span className="flex h-5 w-12 shrink-0 items-center justify-center rounded bg-slate-100 text-[11px] font-semibold text-slate-600">Why {i + 1}</span>{w}</li>
                ))}
              </ol>
            )}
            {inc.status === 'Under Investigation' || inc.status === 'Reported' ? (
              <FormField label="Root cause statement">
                <textarea value={rc} onChange={(e) => setRc(e.target.value)} placeholder="State the underlying cause (system / procedure / equipment / behaviour)…" className="min-h-[80px] w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
              </FormField>
            ) : (
              <div className="rounded-lg border border-slate-200 p-3 text-sm"><span className="text-xs font-medium text-slate-500">Root cause</span><p className="mt-1">{inc.rootCause}</p></div>
            )}
          </Card>

          <Card padded={false}>
            <div className="p-4 pb-2">
              <CardHeader title="Corrective & preventive actions (CAPA)" actions={inc.status !== 'Closed' && <Button size="sm" icon={<Plus size={13} />} onClick={() => setAdding(true)}>Add action</Button>} />
            </div>
            <DataTable
              rows={inc.capa}
              rowKey={(c) => c.id}
              empty="No actions yet — add at least one before approving the root cause"
              columns={[
                { key: 'id', header: '#', render: (c) => <Mono>{c.id}</Mono> },
                { key: 'a', header: 'Action', render: (c) => <div className="min-w-[220px] text-sm">{c.action}</div> },
                { key: 'k', header: 'Type', render: (c) => <Badge tone={c.kind === 'Corrective' ? 'orange' : 'blue'}>{c.kind}</Badge> },
                { key: 'o', header: 'Owner', render: (c) => <Person id={c.ownerId} /> },
                { key: 'd', header: 'Due', render: (c) => <span className={c.status !== 'Done' && c.due < '2028-03-10' ? 'text-red-600' : ''}>{date(c.due)}</span> },
                { key: 's', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
                { key: 'x', header: '', render: (c) => c.status !== 'Done' && inc.status !== 'Closed' ? <Button size="sm" onClick={() => setCapa(c.id, 'Done')}>Mark done</Button> : null },
              ]}
            />
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Activity" />
            <Timeline items={[...inc.log].reverse().map((l) => ({ time: dateTime(l.time), title: l.text, tone: l.tone }))} />
          </Card>
          <Card>
            <CardHeader title="Notifications" />
            <ul className="space-y-2 text-sm text-slate-700">
              <li>HSE on-call roster — paged on sync ({dateTime(inc.log[0]?.time ?? inc.time)})</li>
              <li>Project manager — {getEmployee('EMP-0003')?.name}</li>
              {inc.clientNotified && <li>Client HSE — {dateTime(inc.clientNotified)}</li>}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Documents" />
            <ul className="space-y-2 text-sm">
              {['Incident report form (signed).pdf', 'Witness statements.pdf', inc.status !== 'Reported' ? 'Investigation report v1.docx' : null].filter(Boolean).map((d) => (
                <li key={d} className="flex items-center gap-2 text-slate-700"><FileText size={14} className="text-slate-400" />{d}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
      <AddCapa
        open={adding}
        onClose={() => setAdding(false)}
        onAdd={(c) => {
          setInc((x) => ({ ...x, capa: [...x.capa, { ...c, id: `CA-${x.capa.length + 1}` }] }))
          setAdding(false)
          toast(`Action assigned to ${getEmployee(c.ownerId)?.name} — due ${date(c.due)}`, 'success')
        }}
      />
    </>
  )
}

function AddCapa({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (c: Capa) => void }) {
  const toast = useToast()
  const [action, setAction] = useState('')
  const [kind, setKind] = useState<Capa['kind']>('Corrective')
  const [owner, setOwner] = useState('EMP-0012')
  const [due, setDue] = useState('2028-03-20')
  return (
    <Modal open={open} onClose={onClose} title="Add corrective / preventive action"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => (action.trim() ? onAdd({ id: '', action, kind, ownerId: owner, due, status: 'Open' }) : toast('Describe the action', 'error'))}>Add action</Button></>}>
      <div className="space-y-3">
        <FormField label="Action"><Input value={action} onChange={(e) => setAction(e.target.value)} /></FormField>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Type"><Select className="w-full" value={kind} onChange={(e) => setKind(e.target.value as Capa['kind'])}><option>Corrective</option><option>Preventive</option></Select></FormField>
          <FormField label="Owner"><Select className="w-full" value={owner} onChange={(e) => setOwner(e.target.value)}>{employees.filter((e) => e.type === 'Indirect' || e.position.includes('Leader')).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></FormField>
          <FormField label="Due"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></FormField>
        </div>
      </div>
    </Modal>
  )
}
