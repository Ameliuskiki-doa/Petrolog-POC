import { useState } from 'react'
import { AlertTriangle, CheckCheck, RefreshCw, Smartphone, Monitor, XCircle } from 'lucide-react'
import { Badge, Button, Card, CardHeader, DataTable, Grid, PageHeader, ProjectCodeChip, SearchInput, Select, Stat, StatusBadge, cx, type Column } from '@/components/ui'
import { projects } from '@/data/core'
import { hourCategories, personName, timesheets, type HourCategory, type TimesheetEntry, type TimesheetStatus } from '@/data/operations'
import { date, num, TODAY_ISO } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { Chip, JobLink, TS_MODULE } from './shared'

type Step = 'supervisor' | 'admin'
const catTone: Record<HourCategory, 'slate' | 'amber' | 'violet' | 'sky' | 'red'> = { Normal: 'slate', Overtime: 'amber', Standby: 'violet', Travel: 'sky', 'Public Holiday': 'red' }

const overdue = (t: TimesheetEntry) => (t.status === 'Submitted' || t.status === 'Supervisor Approved') && t.deadline < TODAY_ISO

export default function Timesheets() {
  const toast = useToast()
  const [rows, setRows] = useState<TimesheetEntry[]>(timesheets)
  const [step, setStep] = useState<Step>('supervisor')
  const [status, setStatus] = useState<TimesheetStatus | 'All' | 'Overdue'>('All')
  const [project, setProject] = useState('')
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())

  const actionable = (t: TimesheetEntry) => (step === 'supervisor' ? t.status === 'Submitted' : t.status === 'Supervisor Approved')

  const filtered = rows
    .filter((t) => (status === 'All' ? true : status === 'Overdue' ? overdue(t) : t.status === status))
    .filter((t) => !project || t.projectCode === project)
    .filter((t) => !cat || t.category === cat)
    .filter((t) => !q || `${personName(t.employeeId)} ${t.employeeId} ${t.jobId ?? ''}`.toLowerCase().includes(q.toLowerCase()))

  const approve = (ids: string[]) => {
    const target = rows.filter((t) => ids.includes(t.id) && actionable(t))
    if (!target.length) {
      toast(`Nothing to approve at the ${step === 'supervisor' ? 'field supervisor' : 'ops admin'} step in the selection`, 'warning')
      return
    }
    setRows((rs) =>
      rs.map((t) =>
        target.some((x) => x.id === t.id)
          ? step === 'supervisor'
            ? { ...t, status: 'Supervisor Approved', deadline: '2028-03-12', payroll: 'Pending' }
            : { ...t, status: 'Approved', payroll: 'Charged' }
          : t,
      ),
    )
    setSel(new Set())
    toast(
      step === 'supervisor'
        ? `${target.length} entries approved by field supervisor → forwarded to ops admin`
        : `${target.length} entries approved by ops admin — ${num(target.reduce((a, t) => a + t.hours, 0), 1)} h released for payroll charging to their project codes`,
      'success',
    )
  }
  const reject = (ids: string[]) => {
    const target = rows.filter((t) => ids.includes(t.id) && actionable(t))
    if (!target.length) return
    setRows((rs) => rs.map((t) => (target.some((x) => x.id === t.id) ? { ...t, status: 'Rejected', payroll: 'Not released' } : t)))
    setSel(new Set())
    toast(`${target.length} entries returned to the employee for correction`, 'warning')
  }

  const pendSup = rows.filter((t) => t.status === 'Submitted')
  const pendAdm = rows.filter((t) => t.status === 'Supervisor Approved')
  const od = rows.filter(overdue)
  const syncErr = rows.filter((t) => t.payroll === 'Held')
  const hoursByCat = hourCategories.map((c) => ({ cat: c.key, h: filtered.filter((t) => t.category === c.key).reduce((a, t) => a + t.hours, 0) }))
  const selectable = filtered.filter(actionable)
  const allSel = selectable.length > 0 && selectable.every((t) => sel.has(t.id))

  const cols: Column<TimesheetEntry>[] = [
    {
      key: 'sel',
      header: (
        <input
          type="checkbox"
          checked={allSel}
          onChange={() => setSel(allSel ? new Set() : new Set(selectable.map((t) => t.id)))}
          aria-label="Select all actionable"
        />
      ),
      render: (t) => <input type="checkbox" disabled={!actionable(t)} checked={sel.has(t.id)} onChange={() => { const n = new Set(sel); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); setSel(n) }} />,
      width: '32px',
    },
    { key: 'd', header: 'Date', render: (t) => <span className="whitespace-nowrap">{date(t.date)}</span> },
    { key: 'p', header: 'Person', render: (t) => <span className="whitespace-nowrap text-slate-800">{personName(t.employeeId)}</span> },
    { key: 'pc', header: 'Project code', render: (t) => <ProjectCodeChip code={t.projectCode} /> },
    { key: 'j', header: 'Job', render: (t) => (t.jobId ? <JobLink id={t.jobId} /> : <span className="text-xs text-slate-400">—</span>) },
    { key: 'c', header: 'Category', render: (t) => <Badge tone={catTone[t.category]}>{t.category}</Badge> },
    { key: 'h', header: 'Hours', align: 'right', render: (t) => num(t.hours, t.hours % 1 ? 1 : 0) },
    { key: 'ch', header: 'Channel', render: (t) => <span className="flex items-center gap-1 text-xs text-slate-500">{t.channel === 'Mobile' ? <Smartphone size={12} /> : <Monitor size={12} />}{t.channel}</span> },
    { key: 's', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    {
      key: 'dl',
      header: 'Step / deadline',
      render: (t) =>
        t.status === 'Submitted' || t.status === 'Supervisor Approved' ? (
          <div className="text-xs whitespace-nowrap">
            <div className="text-slate-600">{t.status === 'Submitted' ? `Supervisor: ${personName(t.supervisorId)}` : 'Ops admin: Siti Nurhaliza'}</div>
            <div className={cx(overdue(t) ? 'font-medium text-red-600' : 'text-slate-400')}>
              {overdue(t) ? `Overdue since ${date(t.deadline)} · escalated to PM` : `due ${date(t.deadline)}`}
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'pay',
      header: 'Payroll charging',
      render: (t) => <Badge tone={t.payroll === 'Charged' ? 'green' : t.payroll === 'Held' ? 'red' : t.payroll === 'Pending' ? 'amber' : 'slate'}>{t.payroll}</Badge>,
    },
  ]

  return (
    <>
      <PageHeader
        module={TS_MODULE}
        title="Timesheets"
        subtitle="Daily entry per person with project code allocation, from web and the field mobile app. Two-level approval — field supervisor, then operations admin — with deadlines and automatic escalation."
        crumbs={[{ label: 'Operations' }, { label: 'Timesheets' }]}
        actions={
          <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
            {(['supervisor', 'admin'] as const).map((s) => (
              <button key={s} onClick={() => { setStep(s); setSel(new Set()) }} className={cx('rounded-md px-2.5 py-1.5 font-medium', step === s ? 'bg-ink-900 text-white' : 'text-slate-600 hover:bg-slate-50')}>
                Approve as {s === 'supervisor' ? 'Field supervisor' : 'Ops admin'}
              </button>
            ))}
          </div>
        }
      />

      <Grid cols={4} className="mb-4">
        <Stat label="Awaiting field supervisor" value={pendSup.length} sub={`${num(pendSup.reduce((a, t) => a + t.hours, 0), 1)} h`} tone={pendSup.length ? 'warn' : 'good'} />
        <Stat label="Awaiting ops admin" value={pendAdm.length} sub={`${num(pendAdm.reduce((a, t) => a + t.hours, 0), 1)} h`} tone={pendAdm.length ? 'warn' : 'good'} />
        <Stat label="Overdue → escalated" value={od.length} sub="Past approval deadline; escalated to project manager" tone={od.length ? 'bad' : 'good'} icon={<AlertTriangle size={16} />} />
        <Stat
          label="Released for payroll charging"
          value={`${rows.filter((t) => t.payroll === 'Charged').length} entries`}
          sub={syncErr.length ? `${syncErr.length} held — no valid project code allocation` : 'All approved entries charged to their project codes'}
          tone={syncErr.length ? 'bad' : 'good'}
        />
      </Grid>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Hours by working-hour category" subtitle="Current filter" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {hoursByCat.map((c) => (
              <button key={c.cat} onClick={() => setCat(cat === c.cat ? '' : c.cat)} className={cx('rounded-lg border p-2.5 text-left transition', cat === c.cat ? 'border-ink-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300')}>
                <Badge tone={catTone[c.cat]}>{c.cat}</Badge>
                <div className="num mt-1.5 text-lg font-semibold text-slate-900">{num(c.h, 1)} h</div>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Payroll charging (HC-04)"
            actions={
              syncErr.length > 0 && (
                <Button
                  size="sm"
                  icon={<RefreshCw size={13} />}
                  onClick={() => {
                    setRows((rs) => rs.map((t) => (t.payroll === 'Held' ? { ...t, payroll: 'Charged' } : t)))
                    toast(`${syncErr.length} held entries resolved — hours charged to their project codes`, 'success')
                  }}
                >
                  Resolve held
                </Button>
              )
            }
          />
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between"><span>Labour cost</span><span className="font-medium text-slate-800">Approved hours × rate → project code</span></div>
            <div className="flex justify-between"><span>Payroll result</span><span className="font-medium text-slate-800">Monthly file from the payroll bureau</span></div>
            <div className="flex justify-between"><span>Last charge run</span><span className="font-medium text-slate-800">10 Mar 2028, 08:45</span></div>
            <div className="flex justify-between"><span>Held</span><span className={cx('font-medium', syncErr.length ? 'text-red-600' : 'text-emerald-600')}>{syncErr.length}</span></div>
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3">
          <div className="scrollbar-thin flex gap-1.5 overflow-x-auto">
            {(['All', 'Draft', 'Submitted', 'Supervisor Approved', 'Approved', 'Rejected', 'Overdue'] as const).map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(s)} count={s === 'All' ? rows.length : s === 'Overdue' ? od.length : rows.filter((t) => t.status === s).length} tone={s === 'Overdue' && od.length ? 'amber' : undefined}>
                {s}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search person or job…" className="w-full sm:w-56" />
            <Select value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">All project codes</option>
              {projects.filter((p) => p.status !== 'Closed').map((p) => (
                <option key={p.code} value={p.code}>{p.code}</option>
              ))}
            </Select>
            <Select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">All categories</option>
              {hourCategories.map((c) => (
                <option key={c.key}>{c.key}</option>
              ))}
            </Select>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-500">{sel.size} selected</span>
              <Button size="sm" variant="danger" icon={<XCircle size={13} />} disabled={!sel.size} onClick={() => reject([...sel])}>
                Reject
              </Button>
              <Button size="sm" variant="success" icon={<CheckCheck size={13} />} disabled={!sel.size} onClick={() => approve([...sel])}>
                Bulk approve
              </Button>
            </div>
          </div>
        </div>
        <DataTable dense columns={cols} rows={filtered} rowKey={(t) => t.id} rowClassName={(t) => (overdue(t) ? 'bg-red-50/40' : undefined)} />
        <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
          {filtered.length} entries · {num(filtered.reduce((a, t) => a + t.hours, 0), 1)} h · checkboxes are enabled for entries awaiting the {step === 'supervisor' ? 'field supervisor' : 'ops admin'} step
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Working-hour categories" subtitle="Configurable without development (OPS-11)" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {hourCategories.map((c) => (
            <div key={c.key} className="rounded-lg border border-slate-200 p-3">
              <Badge tone={catTone[c.key]}>{c.key}</Badge>
              <div className="mt-1.5 text-sm font-medium text-slate-800">{c.multiplier}</div>
              <div className="text-xs text-slate-500">{c.rule}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
