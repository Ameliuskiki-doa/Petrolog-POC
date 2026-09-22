import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Archive, CheckCircle2, Circle, Info, Plus, Send } from 'lucide-react'
import { getEmployee, getPO, projects } from '@/data/core'
import { COST_CATEGORIES, fpps, knownPrIds, projectCostBreakdown, type CostCategory, type Fpp, type FppStatus } from '@/data/projects'
import { Button, Callout, Card, DataTable, DescList, Drawer, FormField, Grid, Input, PageHeader, ProjectCodeChip, SearchInput, Select, Stat, Timeline, cx, type Column } from '@/components/ui'
import { date, idr, idrShort } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { BudgetBar, DocLink, FppBadge, MODULE, journalLink } from './shared'

const STATUSES: FppStatus[] = ['Draft', 'Pending approval', 'Approved', 'Committed', 'Partially realised', 'Realised', 'Closed']
const OPEN: FppStatus[] = ['Draft', 'Pending approval', 'Approved', 'Committed', 'Partially realised']

export default function FppControl() {
  const toast = useToast()
  const [items, setItems] = useState<Fpp[]>(fpps)
  const [q, setQ] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<FppStatus | ''>('')
  const [sel, setSel] = useState<Fpp | null>(null)
  const [creating, setCreating] = useState(false)

  const rows = items.filter(
    (f) => (!code || f.projectCode === code) && (!status || f.status === status) && (!q || `${f.id} ${f.description} ${f.prId ?? ''} ${f.poId ?? ''}`.toLowerCase().includes(q.toLowerCase())),
  )
  const open = items.filter((f) => OPEN.includes(f.status))
  const update = (id: string, s: FppStatus, toastMsg: string) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: s, approvedBy: s === 'Approved' ? 'EMP-0002' : x.approvedBy } : x)))
    setSel((x) => (x && x.id === id ? { ...x, status: s } : x))
    toast(toastMsg, 'success')
  }

  const cols: Column<Fpp>[] = [
    {
      key: 'id',
      header: 'FPP',
      render: (f) => (
        <div>
          <span className="font-mono text-[12px] font-medium">{f.id}</span>
          <div className="text-[11px] text-slate-500">{date(f.date)}</div>
        </div>
      ),
    },
    { key: 'p', header: 'Project code', render: (f) => <ProjectCodeChip code={f.projectCode} /> },
    {
      key: 'd',
      header: 'Description',
      render: (f) => (
        <div className="max-w-[280px]">
          <div className="truncate text-xs text-slate-800" title={f.description}>
            {f.description}
          </div>
          <div className="text-[11px] text-slate-500">{f.category}</div>
        </div>
      ),
    },
    { key: 'a', header: 'Amount', align: 'right', render: (f) => <span className="font-medium">{idrShort(f.amount)}</span> },
    { key: 'pr', header: 'PR', render: (f) => (f.prId ? <DocLink to={knownPrIds.has(f.prId) ? `/procurement/requisitions/${f.prId}` : undefined}>{f.prId}</DocLink> : <span className="text-slate-300">—</span>) },
    { key: 'po', header: 'PO', render: (f) => (f.poId ? <DocLink to={getPO(f.poId) ? `/procurement/orders/${f.poId}` : undefined}>{f.poId}</DocLink> : <span className="text-slate-300">—</span>) },
    {
      key: 'j',
      header: 'Journal',
      render: (f) => (
        <div className="flex flex-col gap-0.5">
          {f.journalIds.map((j) => (
            <DocLink key={j} to={journalLink(j)}>
              {j}
            </DocLink>
          ))}
          {f.legacyJournal && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400" title="SAP B1 archive — manual journal before the Stage 1B cut-over">
              <Archive size={10} /> {f.legacyJournal}
            </span>
          )}
          {!f.journalIds.length && !f.legacyJournal && <span className="text-[11px] text-slate-400">not yet realised</span>}
        </div>
      ),
    },
    { key: 's', header: 'Status', render: (f) => <FppBadge status={f.status} /> },
  ]

  return (
    <>
      <PageHeader
        module={MODULE}
        title="FPP — budget control documents"
        subtitle="The FPP is retained as a separate control instrument, as today (FAT-28). Since the Stage 1B cut-over, the control document and its journal sit in one system (FAT-29)."
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreating(true)}>
            New FPP
          </Button>
        }
      />
      <Grid cols={4} className="mb-5">
        <Stat label="Open FPPs" value={open.length} sub={idrShort(open.reduce((a, f) => a + f.amount, 0))} />
        <Stat label="Pending approval" value={items.filter((f) => f.status === 'Pending approval').length} sub="Finance Director" tone="warn" />
        <Stat label="Realised with platform journal" value={items.filter((f) => f.journalIds.length).length} sub="Linked to GL since 1 Jan 2028" tone="good" />
        <Stat label="Pre cut-over (SAP B1 archive)" value={items.filter((f) => f.legacyJournal).length} sub="Read-only link retained" />
      </Grid>
      <div className="mb-4">
        <Callout tone="blue" icon={<Info size={16} />} title="One chain: FPP → PR → PO → receipt → journal">
          Every FPP carries a project code and cost category and is checked against the remaining RAB of that category. After 1 Jan 2028 the realising journals are
          linked directly; earlier FPPs keep a reference to the manual journal in the SAP B1 archive.
        </Callout>
      </div>
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <SearchInput value={q} onChange={setQ} placeholder="FPP, PR, PO, description…" className="w-full sm:w-64" />
          <Select value={code} onChange={(e) => setCode(e.target.value)}>
            <option value="">All project codes</option>
            {projects.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value as FppStatus | '')}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <span className="ml-auto text-xs text-slate-500">
            {rows.length} documents · {idrShort(rows.reduce((a, f) => a + f.amount, 0))}
          </span>
        </div>
        <DataTable columns={cols} rows={rows} rowKey={(f) => f.id} onRowClick={setSel} empty="No FPP documents match the filters" />
      </Card>

      <FppDrawer f={sel} onClose={() => setSel(null)} onUpdate={update} />
      <NewFpp
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={(f) => {
          setItems((xs) => [f, ...xs])
          setCreating(false)
          toast(`${f.id} submitted for approval — budget check passed`, 'success')
        }}
        nextId={`FPP-2028-00${48 + items.length - fpps.length}`}
      />
    </>
  )
}

function chainState(f: Fpp) {
  const idx = STATUSES.indexOf(f.status)
  return [
    { label: 'FPP approved', done: idx >= 2 },
    { label: 'PR', done: !!f.prId && idx >= 2, ref: f.prId },
    { label: 'PO issued', done: !!f.poId && idx >= 3, ref: f.poId },
    { label: 'Goods / service receipt', done: idx >= 4 },
    { label: 'Journal (GL)', done: f.journalIds.length > 0 || !!f.legacyJournal, ref: f.journalIds[0] ?? f.legacyJournal },
  ]
}

function FppDrawer({ f, onClose, onUpdate }: { f: Fpp | null; onClose: () => void; onUpdate: (id: string, s: FppStatus, msg: string) => void }) {
  if (!f) return null
  const line = projectCostBreakdown(f.projectCode).find((l) => l.category === f.category)
  const chain = chainState(f)
  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className="font-mono">{f.id}</span>
          <FppBadge status={f.status} />
        </span>
      }
      footer={
        f.status === 'Pending approval' ? (
          <>
            <Button onClick={onClose}>Close</Button>
            <Button variant="success" icon={<CheckCircle2 size={15} />} onClick={() => onUpdate(f.id, 'Approved', `${f.id} approved — budget reserved on ${f.projectCode}`)}>
              Approve
            </Button>
          </>
        ) : f.status === 'Draft' ? (
          <>
            <Button onClick={onClose}>Close</Button>
            <Button variant="primary" icon={<Send size={15} />} onClick={() => onUpdate(f.id, 'Pending approval', `${f.id} submitted for approval`)}>
              Submit
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      <div className="space-y-5">
        <DescList
          cols={2}
          items={[
            { label: 'Project code', value: <ProjectCodeChip code={f.projectCode} showName /> },
            { label: 'Cost category', value: f.category },
            { label: 'Amount', value: idr(f.amount) },
            { label: 'Date', value: date(f.date) },
            { label: 'Requested by', value: getEmployee(f.requestedBy)?.name ?? '—' },
            { label: 'Approved by', value: f.approvedBy ? getEmployee(f.approvedBy)?.name : '—' },
          ]}
        />
        <div className="text-sm text-slate-700">{f.description}</div>

        {line && (
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Budget check — {f.category}</span>
              <Link to={`/projects/${f.projectCode}?tab=rab`} className="font-normal text-sky-700 hover:underline">
                Open RAB
              </Link>
            </div>
            <BudgetBar rab={line.rab} actual={line.actual} committed={line.committed} />
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-slate-500">RAB</div>
                <div className="num font-medium">{idrShort(line.rab)}</div>
              </div>
              <div>
                <div className="text-slate-500">Actual + committed</div>
                <div className="num font-medium">{idrShort(line.actual + line.committed)}</div>
              </div>
              <div>
                <div className="text-slate-500">Remaining</div>
                <div className={cx('num font-medium', line.remaining < 0 ? 'text-red-600' : 'text-emerald-700')}>{idrShort(line.remaining)}</div>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Document chain</div>
          <ol className="space-y-2">
            {chain.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-sm">
                {c.done ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} className="text-slate-300" />}
                <span className={c.done ? 'text-slate-800' : 'text-slate-400'}>{c.label}</span>
                {c.ref && <span className="ml-auto font-mono text-[11px] text-slate-500">{c.ref}</span>}
              </li>
            ))}
          </ol>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Linked accounting records</div>
          {f.journalIds.length === 0 && !f.legacyJournal && <p className="text-xs text-slate-500">No journal yet — the FPP realises at goods / service receipt.</p>}
          <div className="space-y-1.5">
            {f.journalIds.map((j) => (
              <div key={j} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <DocLink to={journalLink(j)}>{j}</DocLink>
                <span className="text-slate-500">Platform GL · same system</span>
              </div>
            ))}
            {f.legacyJournal && (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-1 font-mono text-slate-500">
                  <Archive size={11} /> {f.legacyJournal}
                </span>
                <span className="text-slate-500">SAP B1 archive · read-only</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Audit</div>
          <Timeline
            items={[
              ...(f.approvedBy && STATUSES.indexOf(f.status) >= 2 ? [{ time: date(f.date), title: `Approved by ${getEmployee(f.approvedBy)?.name}`, tone: 'green' as const }] : []),
              { time: date(f.date), title: `Budget check passed on ${f.projectCode} / ${f.category}`, tone: 'blue' as const },
              { time: date(f.date), title: `Created by ${getEmployee(f.requestedBy)?.name}`, tone: 'slate' as const },
            ]}
          />
        </div>
      </div>
    </Drawer>
  )
}

function NewFpp({ open, onClose, onCreate, nextId }: { open: boolean; onClose: () => void; onCreate: (f: Fpp) => void; nextId: string }) {
  const [code, setCode] = useState('')
  const [cat, setCat] = useState<CostCategory>('Subcontract')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [err, setErr] = useState('')
  const line = code ? projectCostBreakdown(code).find((l) => l.category === (code.startsWith('GEN') ? 'GEN overhead' : cat)) : undefined
  const v = Number(amount.replace(/[^0-9]/g, ''))
  const exceeds = !!line && v > line.remaining

  const submit = () => {
    if (!code) return setErr('Project code is mandatory — documents without a project code are rejected (FAT-18).')
    if (!v) return setErr('Enter an amount.')
    if (!desc.trim()) return setErr('Enter a description.')
    if (exceeds) return setErr('Exceeds the remaining RAB for this category. Request a RAB revision first.')
    onCreate({ id: nextId, projectCode: code, category: code.startsWith('GEN') ? 'GEN overhead' : cat, description: desc, amount: v, journalIds: [], status: 'Pending approval', date: '2028-03-10', requestedBy: 'EMP-0003' })
    setCode('')
    setAmount('')
    setDesc('')
    setErr('')
  }
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New FPP"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            Submit for approval
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Project code *">
          <Select value={code} onChange={(e) => setCode(e.target.value)} className="w-full">
            <option value="">Select project code…</option>
            {projects
              .filter((p) => p.status !== 'Closed' && !projects.some((c) => c.parent === p.code))
              .map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} — {p.name}
                </option>
              ))}
          </Select>
        </FormField>
        <FormField label="Cost category">
          <Select value={code.startsWith('GEN') ? 'GEN overhead' : cat} onChange={(e) => setCat(e.target.value as CostCategory)} className="w-full" disabled={code.startsWith('GEN')}>
            {COST_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Amount (IDR)">
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 150000000" inputMode="numeric" />
        </FormField>
        <FormField label="Description">
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What the budget is reserved for" />
        </FormField>
        {line && (
          <div className={cx('rounded-lg p-3 text-xs ring-1', exceeds ? 'bg-red-50 ring-red-200' : 'bg-slate-50 ring-slate-200')}>
            <div className="mb-1.5 font-semibold text-slate-700">Budget check</div>
            <BudgetBar rab={line.rab} actual={line.actual} committed={line.committed + (v || 0)} />
            <div className="mt-2 flex justify-between">
              <span>Remaining before this FPP</span>
              <span className="num font-medium">{idrShort(line.remaining)}</span>
            </div>
            <div className="flex justify-between">
              <span>After this FPP</span>
              <span className={cx('num font-medium', exceeds ? 'text-red-600' : 'text-emerald-700')}>{idrShort(line.remaining - (v || 0))}</span>
            </div>
            {exceeds && (
              <div className="mt-2 flex items-center gap-1.5 font-medium text-red-700">
                <AlertTriangle size={13} /> Over budget — blocked
              </div>
            )}
          </div>
        )}
        {err && <p className="text-xs font-medium text-red-600">{err}</p>}
      </div>
    </Drawer>
  )
}
