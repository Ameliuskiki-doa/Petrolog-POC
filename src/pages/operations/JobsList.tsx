import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarPlus, ClipboardCheck, Plus, Repeat, ShieldCheck } from 'lucide-react'
import { Badge, Button, Callout, Card, CardHeader, DataTable, Drawer, FormField, Grid, Input, Modal, PageHeader, ProjectCodeChip, SearchInput, Select, Stat, StatusBadge, type Column } from '@/components/ui'
import { getProject, projects, type Job, type JobStatus } from '@/data/core'
import { jobHoldIssues, recurringSchedules } from '@/data/operations'
import { date, idr, idrShort, num, TODAY_ISO } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { addJobs, LIFECYCLE, nextJobId, useJobs, type JobState } from './store'
import { Chip, contractFor, effectiveRates, jobValue, jobValueLabel, OPS_MODULE, UnitLink } from './shared'

export default function JobsList() {
  const jobs = useJobs()
  const nav = useNavigate()
  const toast = useToast()
  const [status, setStatus] = useState<JobStatus | 'All'>('All')
  const [project, setProject] = useState('')
  const [type, setType] = useState('')
  const [q, setQ] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [genOpen, setGenOpen] = useState(false)

  const held = jobs.filter((j) => j.status === 'Completed')
  const counts = useMemo(() => Object.fromEntries(LIFECYCLE.map((s) => [s, jobs.filter((j) => j.status === s).length])), [jobs])

  const rows = jobs
    .filter((j) => status === 'All' || j.status === status)
    .filter((j) => !project || j.projectCode === project || j.projectCode.startsWith(project + '.'))
    .filter((j) => !type || j.type === type)
    .filter((j) => !q || `${j.id} ${j.title} ${j.origin} ${j.destination} ${j.unitIds.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)))

  const today = jobs.filter((j) => j.date === TODAY_ISO)
  const verifiedValue = jobs.filter((j) => j.status === 'Verified').reduce((a, j) => a + jobValue(j), 0)
  const heldValue = held.reduce((a, j) => a + jobValue(j), 0)

  const cols: Column<JobState>[] = [
    { key: 'id', header: 'Job order', render: (j) => <span className="font-mono text-[12px] font-medium text-slate-800">{j.id}</span> },
    {
      key: 'title',
      header: 'Description',
      render: (j) => (
        <div className="min-w-56">
          <div className="flex items-center gap-1.5 text-slate-800">
            {j.title}
            {j.recurring && <Repeat size={12} className="text-slate-400" aria-label="Generated from recurring schedule" />}
          </div>
          <div className="text-[11px] text-slate-500">
            {j.origin} → {j.destination}
          </div>
        </div>
      ),
    },
    { key: 'project', header: 'Project code', render: (j) => <ProjectCodeChip code={j.projectCode} /> },
    { key: 'type', header: 'Type', render: (j) => <span className="text-slate-600">{j.type}</span> },
    { key: 'date', header: 'Date', render: (j) => <span className="whitespace-nowrap">{date(j.date)}</span> },
    {
      key: 'units',
      header: 'Units',
      render: (j) =>
        j.unitIds.length ? (
          <div className="flex flex-wrap gap-1">
            {j.unitIds.map((u) => (
              <UnitLink key={u} id={u} />
            ))}
          </div>
        ) : (
          <Badge tone="orange">Unassigned</Badge>
        ),
    },
    { key: 'qty', header: 'Qty', align: 'right', render: (j) => <span className="whitespace-nowrap">{num(j.qty)} <span className="text-[11px] text-slate-400">{j.basis.replace('per ', '')}</span></span> },
    { key: 'value', header: 'Est. value', align: 'right', render: (j) => jobValueLabel(j) },
    { key: 'status', header: 'Status', render: (j) => <StatusBadge status={j.status} /> },
  ]

  return (
    <>
      <PageHeader
        module={OPS_MODULE}
        title="Job Orders"
        subtitle="Every job order carries a project code and draws its rate from the contract rate card. Completed ≠ Verified: the driver declares the work done, the operations admin validates it before cost and billing flow downstream."
        crumbs={[{ label: 'Operations' }, { label: 'Job Orders' }]}
        actions={
          <>
            <Button icon={<CalendarPlus size={15} />} onClick={() => setGenOpen(true)}>
              Generate recurring jobs
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setNewOpen(true)}>
              New job order
            </Button>
          </>
        }
      />

      <Grid cols={4} className="mb-4">
        <Stat label="Jobs today (10 Mar)" value={today.length} sub={`${today.filter((j) => j.status === 'In Progress').length} in progress · ${today.filter((j) => j.status === 'Dispatched').length} dispatched`} />
        <Stat label="Held at verification" value={held.length} sub={`${idrShort(heldValue)} not yet billable`} tone="warn" icon={<ClipboardCheck size={16} />} />
        <Stat label="Unassigned drafts" value={jobs.filter((j) => j.status === 'Draft').length} sub="Open the planning board to assign" to="/ops/planning" />
        <Stat label="Verified, ready to bill" value={idrShort(verifiedValue)} sub={`${counts.Verified} jobs → Billing & Surat Konversi`} tone="good" to="/finance/billing" />
      </Grid>

      {held.length > 0 && (
        <Card className="mb-4 border-amber-300 bg-amber-50/40 ring-1 ring-amber-200">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-600" /> Held at verification — operations admin quality gate
              </span>
            }
            subtitle="Jobs declared Completed by the field. Cost and revenue do not flow to project costing or billing until verified."
            actions={<Button size="sm" onClick={() => setStatus('Completed')}>Show only these</Button>}
          />
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {held.map((j) => {
              const issues = jobHoldIssues(j)
              return (
                <button key={j.id} onClick={() => nav(`/ops/jobs/${j.id}`)} className="rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-amber-400 hover:shadow">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] font-semibold text-slate-800">{j.id}</span>
                    <span className="text-[11px] text-slate-500">completed {date(j.date)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-sm text-slate-700">{j.title}</div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <ProjectCodeChip code={j.projectCode} />
                    <span className="num text-xs font-medium text-slate-700">{jobValueLabel(j)}</span>
                  </div>
                  <div className="mt-2 text-[11px]">
                    {issues.length ? (
                      issues.map((i) => (
                        <div key={i} className="flex items-start gap-1 text-amber-700">
                          <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                          {i}
                        </div>
                      ))
                    ) : (
                      <div className="text-emerald-700">All checks passed — ready to verify</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>
      )}

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3">
          <div className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-0.5">
            <Chip active={status === 'All'} onClick={() => setStatus('All')} count={jobs.length}>
              All
            </Chip>
            {LIFECYCLE.map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(s)} count={counts[s]} tone={s === 'Completed' && counts[s] > 0 ? 'amber' : undefined}>
                {s === 'Completed' ? 'Completed (held)' : s}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search job, route, unit…" className="w-full sm:w-64" />
            <Select value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">All project codes</option>
              {projects
                .filter((p) => !p.code.startsWith('GEN'))
                .map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.name}
                  </option>
                ))}
            </Select>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              {['Hauling', 'Mobilisation', 'Lifting', 'Rig Move', 'Turnaround', 'Installation'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
        </div>
        <DataTable columns={cols} rows={rows} rowKey={(j) => j.id} onRowClick={(j) => nav(`/ops/jobs/${j.id}`)} rowClassName={(j) => (j.status === 'Completed' ? 'bg-amber-50/40' : undefined)} />
        <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">{rows.length} job orders</div>
      </Card>

      <NewJobDrawer open={newOpen} onClose={() => setNewOpen(false)} onCreated={(j) => { addJobs([j]); toast(`${j.id} created as Draft on ${j.projectCode}`); setNewOpen(false); nav(`/ops/jobs/${j.id}`) }} />
      <GenerateModal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        onGenerate={(list) => {
          addJobs(list)
          setGenOpen(false)
          setStatus('Draft')
          toast(`${list.length} job orders generated from contract schedules`, 'success')
        }}
        existing={jobs}
      />
    </>
  )
}

// ─── New job drawer (OPS-01) ─────────────────────────────────────────────────
function NewJobDrawer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (j: JobState) => void }) {
  const [code, setCode] = useState('')
  const [d, setD] = useState('2028-03-13')
  const [item, setItem] = useState('')
  const [qty, setQty] = useState('1')
  const [title, setTitle] = useState('')
  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [type, setType] = useState<Job['type']>('Hauling')
  const [err, setErr] = useState<string[]>([])

  const p = getProject(code)
  const contract = code ? contractFor(code) : undefined
  const rates = effectiveRates(contract, d)
  const line = rates.find((r) => r.item === item)
  const selectable = projects.filter((x) => x.status !== 'Closed' && !(x.code.startsWith('GEN')) && !projects.some((c) => c.parent === x.code))

  const save = () => {
    const e: string[] = []
    if (!code) e.push('Project code is mandatory — a job order cannot be saved without a valid, active project code.')
    else if (p && p.status !== 'Active') e.push(`Project code ${code} is ${p.status}; job orders need an Active project code.`)
    else if (!contract || contract.status !== 'Active') e.push(`No active contract behind ${code} — rate cannot be drawn.`)
    if (code && !line) e.push('Select a rate card line from the contract.')
    if (!title.trim()) e.push('Description is required.')
    if (!(Number(qty) > 0)) e.push('Quantity must be greater than zero.')
    setErr(e)
    if (e.length) return
    onCreated({ id: nextJobId(d), projectCode: code, title, type, status: 'Draft', date: d, unitIds: [], crewIds: [], origin: origin || '—', destination: dest || '—', qty: Number(qty), basis: line!.basis, rate: line!.basis === 'lump sum' ? 0 : line!.rate })
    setCode('')
    setItem('')
    setTitle('')
    setErr([])
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New job order"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>
            Save as Draft
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {err.length > 0 && (
          <Callout tone="red" title="Job order not saved" icon={<AlertTriangle size={16} />}>
            <ul className="list-disc pl-4">
              {err.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </Callout>
        )}
        <FormField label="Project code *" hint="Issued from the approved contract; GEN codes cannot carry job orders.">
          <Select className="w-full" value={code} onChange={(e) => { setCode(e.target.value); setItem('') }}>
            <option value="">Select project code…</option>
            {selectable.map((x) => (
              <option key={x.code} value={x.code}>
                {x.code} — {x.name} {x.status !== 'Active' ? `(${x.status})` : ''}
              </option>
            ))}
          </Select>
        </FormField>
        {contract && (
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            Contract <span className="font-mono">{contract.id}</span> · v{contract.version} · {contract.title} · <span className="font-medium">{contract.status}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Job date">
            <Input type="date" value={d} onChange={(e) => { setD(e.target.value); setItem('') }} />
          </FormField>
          <FormField label="Job type">
            <Select className="w-full" value={type} onChange={(e) => setType(e.target.value as Job['type'])}>
              {['Hauling', 'Mobilisation', 'Lifting', 'Rig Move', 'Turnaround', 'Installation'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="Rate card line *" hint={code ? `Only lines effective on ${date(d)} are offered.` : 'Choose a project code first.'}>
          <Select className="w-full" value={item} onChange={(e) => setItem(e.target.value)} disabled={!rates.length}>
            <option value="">Select rate…</option>
            {rates.map((r) => (
              <option key={r.item} value={r.item}>
                {r.item} — {r.basis === 'lump sum' ? 'lump sum (milestone)' : `${idr(r.rate)} ${r.basis}`}
              </option>
            ))}
          </Select>
        </FormField>
        {line && (
          <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-200 p-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Rate (locked)</div>
              <div className="num font-medium">{line.basis === 'lump sum' ? 'Milestone' : idr(line.rate)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Basis</div>
              <div className="font-medium">{line.basis}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Effective from</div>
              <div className="font-medium">{date(line.effectiveFrom)}</div>
            </div>
          </div>
        )}
        <FormField label="Description *">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Coal hauling — shift A (Pit 3 → Jetty)" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Origin">
            <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Pit 3 ROM" />
          </FormField>
          <FormField label="Destination">
            <Input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Tanjung Jetty" />
          </FormField>
        </div>
        <FormField label={`Quantity${line ? ` (${line.basis})` : ''}`} hint={line && line.basis !== 'lump sum' ? `Estimated value ${idr(Number(qty || 0) * line.rate)}` : undefined}>
          <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
        </FormField>
        <p className="text-xs text-slate-500">Units and crew are assigned on the planning board, where availability, conflicts and certification are checked.</p>
      </div>
    </Drawer>
  )
}

// ─── Recurring generation (OPS-02) ───────────────────────────────────────────
function GenerateModal({ open, onClose, onGenerate, existing }: { open: boolean; onClose: () => void; onGenerate: (j: JobState[]) => void; existing: JobState[] }) {
  const [to, setTo] = useState('2028-03-16')
  const [sel, setSel] = useState<string[]>(recurringSchedules.map((s) => s.id))

  const preview = useMemo(() => {
    const out: { sched: (typeof recurringSchedules)[number]; date: string }[] = []
    for (const s of recurringSchedules.filter((x) => sel.includes(x.id))) {
      const d = new Date(s.generatedTo + 'T00:00:00Z')
      for (;;) {
        d.setUTCDate(d.getUTCDate() + 1)
        const iso = d.toISOString().slice(0, 10)
        if (iso > to) break
        if (!s.days.includes(d.getUTCDay())) continue
        if (existing.some((j) => j.recurring && j.date === iso && j.title === s.template)) continue
        out.push({ sched: s, date: iso })
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date))
  }, [sel, to, existing])

  const generate = () => {
    const list: JobState[] = preview.map((x, i) => ({
      id: nextJobId(x.date, i),
      projectCode: x.sched.projectCode,
      title: x.sched.template,
      type: x.sched.projectCode === 'HL-2028-002' ? 'Rig Move' : 'Hauling',
      status: 'Draft',
      date: x.date,
      unitIds: [],
      crewIds: [],
      origin: x.sched.projectCode === 'HL-2028-002' ? 'Garut base' : 'Pit 3 ROM',
      destination: x.sched.projectCode === 'HL-2028-002' ? 'Well Pad K-7' : 'Tanjung Jetty',
      qty: x.sched.qty,
      basis: x.sched.basis,
      rate: x.sched.rate,
      recurring: true,
    }))
    onGenerate(list)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate jobs from contract schedules"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={generate} disabled={!preview.length}>
            Generate {preview.length} job orders
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="text-slate-600">Contracts with fixed trip patterns generate scheduled Draft job orders with the project code and effective rate already set.</p>
        <div className="space-y-2">
          {recurringSchedules.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50">
              <input type="checkbox" className="mt-1" checked={sel.includes(s.id)} onChange={(e) => setSel(e.target.checked ? [...sel, s.id] : sel.filter((x) => x !== s.id))} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-800">{s.template}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono">{s.contractId}</span>
                  <ProjectCodeChip code={s.projectCode} />
                  <span>{s.pattern}</span>
                  <span>generated to {date(s.generatedTo)}</span>
                </div>
              </div>
            </label>
          ))}
        </div>
        <FormField label="Generate up to">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </FormField>
        <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
          {preview.length ? (
            <>
              Preview: {preview.slice(0, 6).map((x) => `${date(x.date)} · ${x.sched.template.split(' (')[0]}`).join(' / ')}
              {preview.length > 6 && ` … +${preview.length - 6} more`}
            </>
          ) : (
            'Nothing to generate — schedules are already generated up to this date.'
          )}
        </div>
      </div>
    </Modal>
  )
}
