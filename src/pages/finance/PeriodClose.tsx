import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, CircleCheck, Lock, LockOpen, ShieldCheck, Stamp } from 'lucide-react'
import { closeTasks, periods, parallelRun, cutoverChecklist, type CloseStatus, type CloseTask } from '@/data/finance'
import { PageHeader, Card, CardHeader, Grid, Stat, DataTable, StatusBadge, Button, Callout, Progress, Tabs, Select, Avatar, Badge, type Column } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, idr, period, pct } from '@/lib/format'
import { ArchiveNote, empName } from './components'

export default function PeriodClose() {
  const toast = useToast()
  const [tasks, setTasks] = useState<CloseTask[]>(closeTasks)
  const [pr, setPr] = useState<'2027-11' | '2027-12'>('2027-12')
  const done = tasks.filter((t) => t.status === 'Done').length
  const lockReady = tasks.filter((t) => t.id !== 'C-12').every((t) => t.status === 'Done')

  const setStatus = (id: string, status: CloseStatus) => {
    const t = tasks.find((x) => x.id === id)!
    const blockers = (t.dependsOn ?? []).filter((d) => tasks.find((x) => x.id === d)?.status !== 'Done')
    if (status === 'Done' && blockers.length) {
      toast(`${t.task}: waiting on ${blockers.join(', ')}`, 'warning')
      return
    }
    setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, status } : x)))
    if (status === 'Done') toast(`${t.task} marked done`, 'success')
  }

  const cols: Column<CloseTask>[] = [
    { key: 'wd', header: 'Day', render: (t) => <span className="font-mono text-[11px] whitespace-nowrap text-slate-500">{t.workday}</span> },
    {
      key: 'task', header: 'Task',
      render: (t) => (
        <div className="min-w-[240px]">
          <div className="font-medium text-slate-800">{t.link ? <Link to={t.link} className="hover:underline">{t.task}</Link> : t.task}</div>
          <div className="text-xs text-slate-500">{t.detail}</div>
          {t.dependsOn && <div className="mt-0.5 text-[11px] text-slate-400">After {t.dependsOn.join(', ')}</div>}
        </div>
      ),
    },
    { key: 'owner', header: 'Owner', render: (t) => <span className="flex items-center gap-2 whitespace-nowrap"><Avatar name={empName(t.ownerId)} size={22} />{empName(t.ownerId)}</span> },
    { key: 'due', header: 'Due', render: (t) => <span className="whitespace-nowrap">{date(t.due)}</span> },
    { key: 'ref', header: 'Open items', render: (t) => (t.ref ? <Badge tone="amber">{t.ref}</Badge> : <span className="text-slate-300">—</span>) },
    {
      key: 'st', header: 'Status',
      render: (t) =>
        t.id === 'C-12' ? (
          <StatusBadge status={t.status} />
        ) : (
          <Select value={t.status} onChange={(e) => setStatus(t.id, e.target.value as CloseStatus)} className="h-8 text-xs">
            {(['Not started', 'In progress', 'Done', 'Blocked'] as CloseStatus[]).map((s) => <option key={s}>{s}</option>)}
          </Select>
        ),
    },
    { key: 'go', header: '', render: (t) => t.link && <Link to={t.link} className="text-slate-400 hover:text-slate-700"><ArrowRight size={15} /></Link> },
  ]

  const run = parallelRun.find((p) => p.period === pr)!

  return (
    <div>
      <PageHeader
        module="M8 · Period Close"
        title="Period close cockpit — Mar 2028"
        subtitle="Scheduled month-end processes in dependency order. A locked period never reopens; late costs are charged through controlled reopening."
        crumbs={[{ label: 'Finance' }, { label: 'Period close' }]}
        actions={
          <Button
            variant="primary"
            icon={<Lock size={15} />}
            onClick={() => {
              if (!lockReady) return toast('Lock blocked — complete all preceding close tasks first', 'error')
              setTasks((ts) => ts.map((x) => (x.id === 'C-12' ? { ...x, status: 'Done' } : x)))
              toast('Mar 2028 locked. Posting now opens in Apr 2028', 'success')
            }}
          >
            Lock Mar 2028
          </Button>
        }
      />

      <Grid cols={4} className="mb-4">
        <Card>
          <div className="text-xs font-medium text-slate-500">Close progress · Mar 2028</div>
          <div className="num mt-1.5 text-2xl font-semibold text-slate-900">{done}/{tasks.length}</div>
          <Progress value={(done / tasks.length) * 100} className="mt-2" />
          <div className="mt-1 text-xs text-slate-500">Target: locked by WD+5 · 05 Apr 2028</div>
        </Card>
        <Stat label="Feb 2028" value="Locked" sub="Closed 06 Mar · 4 working days" tone="good" icon={<Lock size={16} />} />
        <Stat label="Jan 2028 — first close" value="6 days" sub="Target 5 · within stabilisation plan" tone="warn" icon={<CalendarCheck size={16} />} />
        <Stat label="Late costs after close" value="1" sub="Charged via controlled reopening in Mar" to="/costing/late-costs" />
      </Grid>

      <Card padded={false} className="mb-4">
        <div className="px-4 pt-4"><CardHeader title="Month-end checklist" subtitle="Owners, due dates and dependencies — status updates are logged in the audit trail" /></div>
        <DataTable columns={cols} rows={tasks} rowKey={(t) => t.id} rowClassName={(t) => (t.status === 'Done' ? 'bg-emerald-50/30' : undefined)} />
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <Card padded={false} className="lg:col-span-3">
          <div className="px-4 pt-4"><CardHeader title="Accounting periods" subtitle="FY 2028 on the platform; earlier periods in the SAP B1 archive" /></div>
          <DataTable
            dense
            rows={periods}
            rowKey={(p) => p.period}
            columns={[
              { key: 'p', header: 'Period', render: (p) => <span className="font-medium">{period(p.period)}</span> },
              {
                key: 's', header: 'Status',
                render: (p) => (
                  <span className="flex items-center gap-1.5">
                    {p.status === 'Locked' ? <Lock size={13} className="text-slate-500" /> : p.status === 'Open' ? <LockOpen size={13} className="text-emerald-600" /> : null}
                    <StatusBadge status={p.status} />
                  </span>
                ),
              },
              { key: 'c', header: 'Closed', render: (p) => (p.closedOn ? `${date(p.closedOn)} · ${empName(p.closedBy)}` : '—') },
              { key: 'wd', header: 'Days', align: 'right', render: (p) => p.workdays ?? '—' },
              { key: 'j', header: 'Journals', align: 'right', render: (p) => (p.journals ? p.journals : '—') },
              { key: 'l', header: 'Late costs', align: 'right', render: (p) => p.lateCosts || '—' },
              { key: 'n', header: 'Note', render: (p) => <span className="text-xs text-slate-500">{p.note}</span> },
            ]}
          />
          <div className="border-t border-slate-100 px-4 py-2.5"><ArchiveNote>Nov–Dec 2027 were run in parallel before cut-over</ArchiveNote></div>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Controlled reopening" subtitle="FAT-19 — why a locked period is never unlocked" />
            <ol className="list-decimal space-y-1.5 pl-4 text-sm text-slate-600">
              <li>A cost arrives after its period is locked (e.g. a December toll invoice received in March).</li>
              <li>The journal posts to the <b>current open period</b>, in line with accounting principle.</li>
              <li>Cost attribution stays on the <b>originating project code and period</b>, so project P/L is correct.</li>
              <li>The closed period's statutory figures never change.</li>
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/costing/late-costs"><Button size="sm" icon={<ArrowRight size={14} />}>Late costs register</Button></Link>
              <Link to="/finance/gl/JV-2028-03-0012"><Button size="sm" variant="ghost">Example JV-2028-03-0012</Button></Link>
            </div>
          </Card>
          <Callout tone="sky" icon={<ShieldCheck size={16} />} title="Q1 2028 — first-close stabilisation">
            Jan 2028 was the first close on the platform (6 working days against a 5-day target) with hyper-care support on site. Feb closed in 4 days. The provider's stabilisation team stays engaged through the Q1 close in April.
          </Callout>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Parallel run evidence — SAP B1 vs platform"
            subtitle="Same source transactions recorded in both systems, reconciled line by line before cut-over"
            actions={<Badge tone="green"><Stamp size={12} /> Signed {date(run.signedOn)}</Badge>}
          />
          <Tabs<'2027-11' | '2027-12'> value={pr} onChange={setPr} tabs={[{ key: '2027-11', label: 'Nov 2027' }, { key: '2027-12', label: 'Dec 2027' }]} />
          <DataTable
            dense
            rows={run.rows}
            rowKey={(r) => r.area}
            columns={[
              { key: 'a', header: 'Area', render: (r) => r.area },
              { key: 's', header: 'SAP B1', align: 'right', render: (r) => idr(r.sap) },
              { key: 'p', header: 'Platform', align: 'right', render: (r) => idr(r.platform) },
              { key: 'v', header: 'Variance', align: 'right', render: (r) => <span className={r.platform - r.sap ? 'text-amber-700' : 'text-emerald-700'}>{r.platform - r.sap ? `${idr(r.platform - r.sap)} (${pct(((r.platform - r.sap) / r.sap) * 100, 3)})` : '0'}</span> },
              { key: 'e', header: 'Explanation', render: (r) => <span className="text-xs text-slate-500">{r.explanation}</span> },
            ]}
          />
          <div className="mt-3 text-xs text-slate-500">Signed by: {run.signedBy.join(' · ')}</div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Cut-over preconditions" subtitle="Stage 1B · 01 Jan 2028" />
          <ul className="space-y-3">
            {cutoverChecklist.map((c) => (
              <li key={c.id} className="flex gap-3 text-sm">
                <CircleCheck size={16} className={c.status === 'Done' ? 'mt-0.5 shrink-0 text-emerald-600' : 'mt-0.5 shrink-0 text-slate-300'} />
                <div>
                  <div className="font-medium text-slate-800"><span className="font-mono text-xs text-slate-500">{c.id}</span> {c.label}</div>
                  <div className="text-xs text-slate-500">{c.status} · {c.evidence}</div>
                </div>
              </li>
            ))}
          </ul>
          <ArchiveNote className="mt-4" />
        </Card>
      </div>
    </div>
  )
}
