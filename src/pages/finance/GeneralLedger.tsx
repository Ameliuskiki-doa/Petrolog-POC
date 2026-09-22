import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Plus, RotateCcw, Timer, FileDown, Trash2 } from 'lucide-react'
import { projects } from '@/data/core'
import {
  journals as seed, sourceTypes, costCentres, accounts, narrativeText, journalTotal, journalProjects, getAccount, blForProject, ccForProject,
  type Journal,
} from '@/data/finance'
import { PageHeader, Card, Grid, Stat, DataTable, Select, SearchInput, Input, Button, StatusBadge, ProjectCodeChip, Mono, Drawer, FormField, Callout, Badge, type Column } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, idr, idrShort, num, period } from '@/lib/format'
import { ArchiveNote, FilterBar } from './components'

const PERIODS = ['2028-03', '2028-02', '2028-01']

interface DraftLine {
  account: string
  projectCode: string
  costCentre: string
  debit: string
  credit: string
}

export default function GeneralLedger() {
  const nav = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [rows, setRows] = useState<Journal[]>(seed)
  const [q, setQ] = useState(params.get('q') ?? '')
  const [pc, setPc] = useState(params.get('project') ?? '')
  const [cc, setCc] = useState(params.get('cc') ?? '')
  const [src, setSrc] = useState<string>(params.get('source') ?? '')
  const [per, setPer] = useState(params.get('period') ?? '')
  const [status, setStatus] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const account = params.get('account') ?? ''
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const lo = min ? Number(min.replace(/[^\d]/g, '')) : 0
    const hi = max ? Number(max.replace(/[^\d]/g, '')) : Infinity
    return rows.filter((j) => {
      const text = `${j.id} ${narrativeText(j)} ${j.trace.map((t) => t.ref).join(' ')} ${j.lines.map((l) => l.memo).join(' ')}`.toLowerCase()
      if (q && !text.includes(q.toLowerCase())) return false
      if (pc && !j.lines.some((l) => l.projectCode === pc || l.projectCode.startsWith(pc + '.'))) return false
      if (cc && !j.lines.some((l) => l.costCentre === cc)) return false
      if (account && !j.lines.some((l) => l.account.startsWith(account))) return false
      if (src && j.sourceType !== src) return false
      if (per && j.period !== per) return false
      if (status && j.status !== status) return false
      const t = journalTotal(j)
      return t >= lo && t <= hi
    }).sort((a, b) => b.id.localeCompare(a.id))
  }, [rows, q, pc, cc, src, per, status, min, max, account])

  const mar = rows.filter((j) => j.period === '2028-03')
  const pending = rows.filter((j) => j.status === 'Pending Approval' || j.status === 'Draft')
  const auto = mar.filter((j) => j.auto).length

  const reset = () => {
    setQ(''); setPc(''); setCc(''); setSrc(''); setPer(''); setStatus(''); setMin(''); setMax('')
    setParams({})
  }

  const columns: Column<Journal>[] = [
    { key: 'id', header: 'Journal', render: (j) => <Mono className="font-medium text-slate-900">{j.id}</Mono> },
    { key: 'date', header: 'Date', render: (j) => <span className="whitespace-nowrap">{date(j.date)}</span> },
    {
      key: 'narr', header: 'Narrative',
      render: (j) => (
        <div className="max-w-md min-w-[260px]">
          <div className="truncate text-slate-800">{j.narrative.find((n) => n.label === 'Description')?.value ?? narrativeText(j)}</div>
          <div className="truncate text-xs text-slate-500">{j.narrative.filter((n) => n.label !== 'Description').map((n) => n.value).join(' · ')}</div>
        </div>
      ),
    },
    {
      key: 'src', header: 'Source document',
      render: (j) => (
        <div className="whitespace-nowrap">
          <div className="text-xs font-medium text-slate-700">{j.sourceType}</div>
          <div className="font-mono text-[11px] text-slate-500">{j.trace[0]?.ref}</div>
        </div>
      ),
    },
    {
      key: 'pc', header: 'Project codes',
      render: (j) => {
        const p = journalProjects(j)
        return (
          <div className="flex flex-wrap gap-1">
            {p.slice(0, 2).map((c) => <ProjectCodeChip key={c} code={c} />)}
            {p.length > 2 && <span className="text-[11px] text-slate-500">+{p.length - 2}</span>}
          </div>
        )
      },
    },
    { key: 'lines', header: 'Lines', align: 'right', render: (j) => num(j.lines.length) },
    { key: 'amt', header: 'Amount', align: 'right', render: (j) => <span className="whitespace-nowrap">{idr(journalTotal(j))}</span> },
    {
      key: 'st', header: 'Status',
      render: (j) => (
        <div className="flex items-center gap-1">
          <StatusBadge status={j.status} />
          {j.reversalOf && <Badge tone="violet">Reversal</Badge>}
          {j.attributionPeriod && <Badge tone="sky">Late cost</Badge>}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        module="M8 · General Ledger"
        title="Journals"
        subtitle="Every line carries account, cost centre, project code and business line. Posted journals are immutable — corrections are made by reversing entry."
        crumbs={[{ label: 'Finance' }, { label: 'General Ledger' }]}
        actions={
          <>
            <Button icon={<FileDown size={15} />} onClick={() => toast(`Exported ${filtered.length} journals to XLSX`, 'info')}>Export</Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(true)}>Manual journal</Button>
          </>
        }
      />

      <Grid cols={4} className="mb-4">
        <Stat label="Journals · Mar 2028" value={num(mar.length)} sub={`${Math.round((auto / Math.max(1, mar.length)) * 100)}% generated from subsidiary ledgers`} icon={<BookOpen size={16} />} />
        <Stat label="Awaiting approval / draft" value={num(pending.length)} sub="Manual journals need Accounting Manager approval" tone={pending.length ? 'warn' : undefined} icon={<Timer size={16} />} />
        <Stat label="Reversals this period" value={num(mar.filter((j) => j.reversalOf).length)} sub="Corrections by reversing entry only" icon={<RotateCcw size={16} />} />
        <Stat label="Posted value · Mar 2028" value={idrShort(mar.filter((j) => j.status !== 'Draft').reduce((s, j) => s + journalTotal(j), 0))} sub="Period open · Feb 2028 locked" to="/finance/close" />
      </Grid>

      <Card padded={false}>
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search narrative, journal, document…" className="w-full sm:w-72" />
          <Select value={pc} onChange={(e) => setPc(e.target.value)} className="w-full sm:w-auto">
            <option value="">All project codes</option>
            {projects.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}
          </Select>
          <Select value={cc} onChange={(e) => setCc(e.target.value)} className="w-full sm:w-auto">
            <option value="">All cost centres</option>
            {costCentres.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
          </Select>
          <Select value={src} onChange={(e) => setSrc(e.target.value)} className="w-full sm:w-auto">
            <option value="">All source types</option>
            {sourceTypes.map((s) => <option key={s}>{s}</option>)}
          </Select>
          <Select value={per} onChange={(e) => setPer(e.target.value)} className="w-full sm:w-auto">
            <option value="">All periods</option>
            {PERIODS.map((p) => <option key={p} value={p}>{period(p)}</option>)}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-auto">
            <option value="">Any status</option>
            {['Posted', 'Pending Approval', 'Draft', 'Reversed'].map((s) => <option key={s}>{s}</option>)}
          </Select>
          <div className="flex items-center gap-1">
            <Input value={min} onChange={(e) => setMin(e.target.value)} placeholder="Min IDR" className="w-28" inputMode="numeric" />
            <span className="text-slate-400">–</span>
            <Input value={max} onChange={(e) => setMax(e.target.value)} placeholder="Max IDR" className="w-28" inputMode="numeric" />
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>Reset</Button>
        </FilterBar>
        {account && (
          <div className="px-4 pb-3">
            <Callout tone="sky">
              Filtered by account <Mono>{account}</Mono> — {getAccount(account)?.name}.{' '}
              <button className="underline" onClick={() => { params.delete('account'); setParams(params) }}>Clear</button>
            </Callout>
          </div>
        )}
        <DataTable columns={columns} rows={filtered} rowKey={(j) => j.id} onRowClick={(j) => nav(`/finance/gl/${j.id}`)} empty="No journals match these filters" />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          <span>{filtered.length} of {rows.length} journals · total {idr(filtered.reduce((s, j) => s + journalTotal(j), 0))}</span>
          <ArchiveNote>journals before 01 Jan 2028 remain enquiry-only in SAP B1 (CUT-03)</ArchiveNote>
        </div>
      </Card>

      <ManualJournalDrawer
        open={open}
        onClose={() => setOpen(false)}
        nextId={`JV-2028-03-${String(21 + rows.length - seed.length).padStart(4, '0')}`}
        onSubmit={(j) => {
          setRows((r) => [j, ...r])
          setOpen(false)
          toast(`${j.id} submitted for approval to Ratna Sari Dewi`, 'success')
        }}
      />
    </div>
  )
}

function ManualJournalDrawer({ open, onClose, onSubmit, nextId }: { open: boolean; onClose: () => void; onSubmit: (j: Journal) => void; nextId: string }) {
  const toast = useToast()
  const posting = accounts.filter((a) => a.posting)
  const blank = (): DraftLine => ({ account: '', projectCode: '', costCentre: '', debit: '', credit: '' })
  const [desc, setDesc] = useState('')
  const [reason, setReason] = useState('Accrual')
  const [lines, setLines] = useState<DraftLine[]>([blank(), blank()])
  const [errors, setErrors] = useState<string[]>([])

  const n = (s: string) => Number(s.replace(/[^\d]/g, '') || 0)
  const dr = lines.reduce((s, l) => s + n(l.debit), 0)
  const cr = lines.reduce((s, l) => s + n(l.credit), 0)

  const update = (i: number, patch: Partial<DraftLine>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch, ...(patch.projectCode ? { costCentre: l.costCentre || ccForProject(patch.projectCode) } : {}) } : l)))

  const submit = () => {
    const errs: string[] = []
    if (!desc.trim()) errs.push('Narrative description is required (structured narrative, FAT-31).')
    lines.forEach((l, i) => {
      const a = posting.find((x) => x.code === l.account)
      if (!a) errs.push(`Line ${i + 1}: select a posting account.`)
      if (!l.projectCode) errs.push(`Line ${i + 1}: project code is mandatory on every line — use GEN-HO / GEN-BPN for overhead.`)
      if (a && a.ccRule === 'Mandatory' && !l.costCentre) errs.push(`Line ${i + 1}: cost centre is mandatory for account ${a.code}.`)
      if (a?.projectRule === 'Mandatory' && l.projectCode.startsWith('GEN')) errs.push(`Line ${i + 1}: account ${a.code} requires a direct project code (GEN not allowed).`)
      if (!n(l.debit) && !n(l.credit)) errs.push(`Line ${i + 1}: enter a debit or credit amount.`)
    })
    if (dr !== cr) errs.push(`Journal does not balance — debit ${idr(dr)} vs credit ${idr(cr)}.`)
    setErrors(errs)
    if (errs.length) {
      toast('Journal rejected — see validation messages', 'error')
      return
    }
    onSubmit({
      id: nextId, date: '2028-03-10', period: '2028-03', status: 'Pending Approval', sourceType: 'Manual Journal', auto: false,
      narrative: [{ label: 'Source', value: 'Manual journal' }, { label: 'Reason', value: reason }, { label: 'Description', value: desc }],
      trace: [], createdBy: 'EMP-0028',
      lines: lines.map((l) => ({ account: l.account, projectCode: l.projectCode, costCentre: l.costCentre, businessLine: blForProject(l.projectCode), debit: n(l.debit), credit: n(l.credit), memo: desc })),
    })
    setDesc(''); setLines([blank(), blank()]); setErrors([])
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`New manual journal · ${nextId}`}
      width="max-w-3xl"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Submit for approval</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Callout tone="amber" title="Controls">Posting period Mar 2028 (open). Every line needs account, cost centre, project code — business line is derived from the project code. Posted journals cannot be edited; corrections are reversals.</Callout>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label="Reason">
            <Select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full">
              {['Accrual', 'Dimension correction', 'Reclassification', 'Provision', 'Other adjustment'].map((r) => <option key={r}>{r}</option>)}
            </Select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Description (narrative)">
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Accrue March site security, Kutai — PO pending" />
            </FormField>
          </div>
        </div>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-slate-500">
                <th className="py-1 pr-2">Account</th><th className="pr-2">Project code</th><th className="pr-2">Cost centre</th><th className="pr-2 text-right">Debit</th><th className="pr-2 text-right">Credit</th><th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <Select value={l.account} onChange={(e) => update(i, { account: e.target.value })} className="w-52">
                      <option value="">Select…</option>
                      {posting.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
                    </Select>
                  </td>
                  <td className="pr-2">
                    <Select value={l.projectCode} onChange={(e) => update(i, { projectCode: e.target.value })} className="w-40">
                      <option value="">Select…</option>
                      {projects.filter((p) => p.status !== 'Closed').map((p) => <option key={p.code}>{p.code}</option>)}
                    </Select>
                  </td>
                  <td className="pr-2">
                    <Select value={l.costCentre} onChange={(e) => update(i, { costCentre: e.target.value })} className="w-28">
                      <option value="">—</option>
                      {costCentres.map((c) => <option key={c.code}>{c.code}</option>)}
                    </Select>
                  </td>
                  <td className="pr-2"><Input value={l.debit} onChange={(e) => update(i, { debit: e.target.value })} className="w-32 text-right" inputMode="numeric" /></td>
                  <td className="pr-2"><Input value={l.credit} onChange={(e) => update(i, { credit: e.target.value })} className="w-32 text-right" inputMode="numeric" /></td>
                  <td>{lines.length > 2 && <button className="p-1 text-slate-400 hover:text-red-600" onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))}><Trash2 size={14} /></button>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 font-semibold">
                <td colSpan={3} className="py-2"><Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => setLines((ls) => [...ls, blank()])}>Add line</Button></td>
                <td className="num pr-2 text-right">{idr(dr)}</td>
                <td className="num pr-2 text-right">{idr(cr)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        {errors.length > 0 && (
          <Callout tone="red" title="Validation">
            <ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </Callout>
        )}
      </div>
    </Drawer>
  )
}

