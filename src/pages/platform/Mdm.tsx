import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Database, Copy, GitPullRequest, CalendarClock, Lock, Merge, Plus, ShieldCheck } from 'lucide-react'
import {
  Badge, Button, Callout, Card, DataTable, Drawer, FormField, Grid, Input, Mono, PageHeader, ProjectCodeChip, Progress, SearchInput, Select, Stat, StatusBadge, Tabs,
} from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, dateTime, num } from '@/lib/format'
import { getEmployee, projects, vendors } from '@/data/core'
import { changeRequests, duplicates, effectiveRecords, mdmEntities, type ChangeRequest, type DuplicateCandidate } from '@/data/platform'

type TabKey = 'overview' | 'duplicates' | 'changes' | 'effective' | 'codes'

export default function Mdm() {
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('overview')
  const [dups, setDups] = useState<DuplicateCandidate[]>(duplicates)
  const [crs, setCrs] = useState<ChangeRequest[]>(changeRequests)
  const [crFilter, setCrFilter] = useState('Pending Approval')
  const [kind, setKind] = useState('All')
  const [q, setQ] = useState('')
  const [newVendor, setNewVendor] = useState(false)

  const pending = crs.filter((c) => c.status === 'Pending Approval')
  const decide = (c: ChangeRequest, status: ChangeRequest['status']) => {
    setCrs((l) => l.map((x) => (x.id === c.id ? { ...x, status } : x)))
    toast(`${c.id} ${status.toLowerCase()} — ${status === 'Approved' ? `golden record updated${c.effectiveFrom ? `, effective ${date(c.effectiveFrom)}` : ''} and published to all modules` : 'requester notified'}`, status === 'Approved' ? 'success' : 'warning')
  }

  return (
    <>
      <PageHeader
        module="Platform · Master Data Management"
        title="Master Data (MDM)"
        subtitle="One golden record per entity, read by every module and modifiable only through MDM. Deduplication by official identifier, approval of master changes, and effective dating."
        actions={<Button variant="primary" icon={<Plus size={15} />} onClick={() => setNewVendor(true)}>New master record</Button>}
      />
      <Grid cols={4} className="mb-5">
        <Stat label="Golden records" value={num(mdmEntities.reduce((a, e) => a + e.records, 0))} sub={`${mdmEntities.length} governed entities`} icon={<Database size={16} />} />
        <Stat label="Duplicate candidates" value={dups.length} sub="Detected by NPWP / part no / serial" tone={dups.length ? 'warn' : 'good'} icon={<Copy size={16} />} />
        <Stat label="Change requests pending" value={pending.length} sub="Bank data requires dual control" icon={<GitPullRequest size={16} />} />
        <Stat label="Future-dated values" value={effectiveRecords.filter((e) => e.status === 'Future').length} sub="Take effect automatically" icon={<CalendarClock size={16} />} />
      </Grid>

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'overview', label: 'Golden records' },
          { key: 'duplicates', label: 'Duplicate detection', count: dups.length },
          { key: 'changes', label: 'Change requests', count: pending.length },
          { key: 'effective', label: 'Effective-dated records', count: effectiveRecords.length },
          { key: 'codes', label: 'Project code registry', count: projects.length },
        ]}
      />

      {tab === 'overview' && (
        <Card padded={false}>
          <DataTable
            rows={mdmEntities}
            rowKey={(e) => e.key}
            onRowClick={(e) => (e.key === 'project' ? setTab('codes') : e.duplicatesOpen ? setTab('duplicates') : undefined)}
            columns={[
              { key: 'n', header: 'Entity', render: (e) => <div className="min-w-[180px]"><div className="font-medium">{e.name}</div><div className="text-xs text-slate-500">{e.source}</div></div> },
              { key: 'r', header: 'Records', align: 'right', render: (e) => num(e.records) },
              { key: 'id', header: 'Official identifier', render: (e) => <span className="text-xs">{e.identifier}</span> },
              { key: 'c', header: 'Completeness', render: (e) => <div className="w-28"><Progress value={e.completeness} tone={e.completeness >= 98 ? 'green' : e.completeness >= 93 ? 'amber' : 'red'} /><div className="mt-0.5 text-[11px] text-slate-500">{e.completeness}%</div></div> },
              { key: 'd', header: 'Duplicates', align: 'right', render: (e) => (e.duplicatesOpen ? <span className="font-semibold text-amber-700">{e.duplicatesOpen}</span> : '0') },
              { key: 'p', header: 'Pending changes', align: 'right', render: (e) => e.pendingChanges },
              { key: 's', header: 'Data steward', render: (e) => <span className="text-sm">{getEmployee(e.steward)?.name}</span> },
              { key: 'l', header: 'Last change', render: (e) => <span className="text-xs text-slate-500">{dateTime(e.lastChange)}</span> },
            ]}
          />
        </Card>
      )}

      {tab === 'duplicates' && (
        <div className="space-y-3">
          <Callout tone="blue" title="Detection at the point of entry">New vendor or customer records are matched on NPWP before they are saved; items on OEM part number; units on chassis/serial. A match holds the new record in quarantine until a steward merges or rejects it.</Callout>
          {dups.length === 0 && <Card><p className="py-8 text-center text-sm text-slate-500">No open duplicate candidates.</p></Card>}
          {dups.map((d) => (
            <Card key={d.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2"><Mono className="font-semibold">{d.id}</Mono><Badge>{d.entity}</Badge><Badge tone={d.score >= 95 ? 'red' : 'amber'}>Match {d.score}%</Badge><span className="text-xs text-slate-500">Identifier <Mono>{d.identifier}</Mono></span></div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setDups((l) => l.filter((x) => x.id !== d.id)); toast(`${d.id} marked not a duplicate — both records kept`, 'info') }}>Not a duplicate</Button>
                  <Button size="sm" variant="primary" icon={<Merge size={13} />} onClick={() => { setDups((l) => l.filter((x) => x.id !== d.id)); toast(`${d.b.id} merged into ${d.a.id} — references re-pointed, ${d.b.id} retired`, 'success') }}>Merge into {d.a.id}</Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[{ r: d.a, label: 'Surviving record' }, { r: d.b, label: 'Candidate (quarantined)' }].map(({ r, label }) => (
                  <div key={r.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="mb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{label}</div>
                    <div className="font-medium">{r.id.startsWith('VND') && vendors.some((v) => v.id === r.id) ? <Link to={`/vendors/${r.id}`} className="text-brand-700 hover:underline">{r.name}</Link> : r.name}</div>
                    <div className="text-xs text-slate-500"><Mono>{r.id}</Mono> · {r.city} · created {date(r.created)} · {r.txns} transactions</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">{d.reason}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'changes' && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <Select value={crFilter} onChange={(e) => setCrFilter(e.target.value)}>
              {['All', 'Pending Approval', 'Approved', 'Rejected'].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <Card padded={false}>
            <DataTable
              rows={crs.filter((c) => crFilter === 'All' || c.status === crFilter)}
              rowKey={(c) => c.id}
              columns={[
                { key: 'id', header: 'Request', render: (c) => <div><Mono>{c.id}</Mono><div className="text-xs text-slate-500">{dateTime(c.requested)}</div></div> },
                { key: 'e', header: 'Record', render: (c) => <div className="min-w-[180px]"><div className="text-sm">{c.recordName}</div><div className="text-xs text-slate-500">{c.entity} · <Mono>{c.recordId}</Mono></div></div> },
                { key: 'f', header: 'Change', render: (c) => <div className="min-w-[200px] text-xs"><div className="font-medium text-slate-700">{c.field}</div><div><span className="text-red-600 line-through">{c.before}</span> → <span className="text-emerald-700">{c.after}</span></div></div> },
                { key: 'ef', header: 'Effective', render: (c) => (c.effectiveFrom ? date(c.effectiveFrom) : 'On approval') },
                { key: 'r', header: 'Requested by', render: (c) => getEmployee(c.requesterId)?.name },
                { key: 'a', header: 'Approver', render: (c) => <span className="text-xs text-slate-600">{c.approverRole}</span> },
                { key: 's', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
                { key: 'x', header: '', render: (c) => c.status === 'Pending Approval' ? (
                  <div className="flex gap-1"><Button size="sm" variant="success" onClick={() => decide(c, 'Approved')}>Approve</Button><Button size="sm" onClick={() => decide(c, 'Rejected')}>Reject</Button></div>
                ) : null },
              ]}
            />
          </Card>
        </>
      )}

      {tab === 'effective' && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              {['All', 'Rate card', 'Tax rate', 'Depreciation parameter', 'Fuel price', 'Labour rate'].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <Card padded={false}>
            <DataTable
              rows={effectiveRecords.filter((e) => kind === 'All' || e.kind === kind)}
              rowKey={(e) => e.id}
              columns={[
                { key: 'k', header: 'Type', render: (e) => <Badge>{e.kind}</Badge> },
                { key: 's', header: 'Subject', render: (e) => <span className="text-sm">{e.subject}</span> },
                { key: 'v', header: 'Value', render: (e) => <span className="font-medium">{e.value}</span> },
                { key: 'f', header: 'Effective from', render: (e) => date(e.from) },
                { key: 't', header: 'To', render: (e) => (e.to ? date(e.to) : <span className="text-slate-400">open</span>) },
                { key: 'st', header: 'State', render: (e) => <Badge tone={e.status === 'Current' ? 'green' : e.status === 'Future' ? 'sky' : 'slate'} dot>{e.status}</Badge> },
                { key: 'r', header: 'Reference', render: (e) => <span className="text-xs text-slate-500">{e.ref}</span> },
              ]}
            />
            <p className="p-3 text-xs text-slate-500">Transactions pick the value valid on their document date, so a back-dated job in an open period is priced at the rate that applied then — never overwritten.</p>
          </Card>
        </>
      )}

      {tab === 'codes' && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search project code…" className="w-full sm:w-72" />
            <Badge tone="violet"><Lock size={11} className="mr-0.5 inline" />Owned by MDM — modifiable only through change request</Badge>
          </div>
          <Card padded={false}>
            <DataTable
              rows={projects.filter((p) => !q || `${p.code} ${p.name}`.toLowerCase().includes(q.toLowerCase()))}
              rowKey={(p) => p.code}
              dense
              columns={[
                { key: 'c', header: 'Project code', render: (p) => <span className={p.parent ? 'pl-5' : ''}><ProjectCodeChip code={p.code} /></span> },
                { key: 'n', header: 'Name', render: (p) => p.name },
                { key: 'bl', header: 'BL', render: (p) => p.businessLine },
                { key: 'src', header: 'Issued from', render: (p) => (p.contractId ? <Link to={`/contracts/${p.contractId}`} className="font-mono text-[12px] text-brand-700 hover:underline">{p.contractId}</Link> : <span className="text-xs text-slate-500">Finance (GEN pool)</span>) },
                { key: 'site', header: 'Site', render: (p) => p.site },
                { key: 'st', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
                { key: 'x', header: '', render: (p) => <Button size="sm" variant="ghost" onClick={() => toast(`Direct edit of ${p.code} is not permitted — raise a master change request`, 'warning')}>Edit</Button> },
              ]}
            />
          </Card>
        </>
      )}

      <NewRecord open={newVendor} onClose={() => setNewVendor(false)} />
    </>
  )
}

function NewRecord({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [npwp, setNpwp] = useState('')
  if (!open) return null
  const save = () => {
    const clean = npwp.replace(/\D/g, '')
    if (clean.length < 15) return toast('NPWP must be 15 or 16 digits', 'error')
    const hit = vendors.find((v) => v.npwp.replace(/\D/g, '') === clean)
    if (hit) return toast(`Duplicate blocked: NPWP already belongs to ${hit.id} ${hit.name}`, 'error')
    toast(`Vendor ${name || 'record'} submitted — auto-coded VND-00232, pending steward approval`, 'success')
    onClose()
  }
  return (
    <Drawer open onClose={onClose} title="New vendor golden record" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={<ShieldCheck size={15} />} onClick={save}>Check & submit</Button></>}>
      <div className="space-y-4">
        <FormField label="Legal name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="PT …" /></FormField>
        <FormField label="NPWP" hint="Try 71.234.001.1-722.000 to see duplicate detection"><Input value={npwp} onChange={(e) => setNpwp(e.target.value)} placeholder="00.000.000.0-000.000" /></FormField>
        <Callout tone="slate">Code is assigned automatically from the numbering pattern VND-NNNNN; the record becomes usable in procurement after document validation and steward approval.</Callout>
      </div>
    </Drawer>
  )
}
