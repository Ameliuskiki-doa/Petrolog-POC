import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Download, FileSignature, GitPullRequestArrow, SearchX } from 'lucide-react'
import { childProjects, getContract, getCustomer, getProject, jobs, remainingBudget, runningMargin, units, type Project } from '@/data/core'
import { COST_CATEGORIES, leafCodes, projectCommitments, projectCostBreakdown, projectLedger, type CostCategory } from '@/data/projects'
import { Button, Card, DescList, EmptyState, FormField, Input, Modal, PageHeader, ProjectCodeChip, Select, Stat, StatusBadge, Tabs, Grid } from '@/components/ui'
import { date, idr, idrShort, pct } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { BLTag, BudgetBar, MODULE, PersonCell } from './shared'
import { AllocationsTab, CommitmentsTab, LedgerTab, OverviewTab, RabTab, StructureTab } from './ProjectTabs'
import { GenPoolView } from './GenPoolView'

export type DetailTab = 'overview' | 'rab' | 'commitments' | 'ledger' | 'allocations' | 'structure'

export default function ProjectDetail() {
  const { code = '' } = useParams()
  const p = getProject(code)
  if (!p)
    return (
      <Card>
        <EmptyState icon={<SearchX size={36} />} title={`Project code ${code} not found`} body="Codes are issued from approved contracts. Check the registry for the correct code." />
        <div className="text-center">
          <Link to="/projects" className="text-sm text-sky-700 hover:underline">
            ← Back to project codes
          </Link>
        </div>
      </Card>
    )
  if (p.code.startsWith('GEN')) return <GenPoolView p={p} />
  return <ProjectPL key={p.code} p={p} />
}

function ProjectPL({ p }: { p: Project }) {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as DetailTab) || 'overview'
  const catFilter = (params.get('cat') as CostCategory | null) ?? ''
  const [revOpen, setRevOpen] = useState(false)
  const toast = useToast()

  const setTab = (t: DetailTab, extra: Record<string, string> = {}) => {
    const next = new URLSearchParams()
    if (t !== 'overview') next.set('tab', t)
    Object.entries(extra).forEach(([k, v]) => v && next.set(k, v))
    setParams(next, { replace: false })
  }
  const drill = (cat: CostCategory) => setTab('ledger', { cat })

  const contract = getContract(p.contractId)
  const customer = getCustomer(p.customerId)
  const parent = getProject(p.parent)
  const kids = childProjects(p.code)
  const leaves = leafCodes(p.code)
  const jobCount = jobs.filter((j) => leaves.includes(j.projectCode)).length
  const unitCount = units.filter((u) => u.projectCode && leaves.includes(u.projectCode)).length
  const rem = remainingBudget(p)
  const consumption = p.rab ? ((p.actual + p.committed) / p.rab) * 100 : 0
  const margin = runningMargin(p)

  return (
    <>
      <PageHeader
        module={MODULE}
        crumbs={[{ label: 'Project codes & P/L', to: '/projects' }, ...(parent ? [{ label: parent.code, to: `/projects/${parent.code}` }] : []), { label: p.code }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{p.code}</span>
            <span className="text-slate-400">·</span>
            <span>{p.name}</span>
            <StatusBadge status={p.status} className="text-xs" />
          </span>
        }
        subtitle={parent ? `Sub-code of ${parent.code} ${parent.name}` : kids.length ? `Parent code — aggregates ${kids.length} sub-codes` : undefined}
        actions={
          <>
            <Button icon={<Download size={15} />} onClick={() => toast(`P/L for ${p.code} exported (PDF + Excel)`, 'info')}>
              Export P/L
            </Button>
            {!kids.length && p.status !== 'Closed' && (
              <Button variant="primary" icon={<GitPullRequestArrow size={15} />} onClick={() => setRevOpen(true)}>
                Request RAB revision
              </Button>
            )}
          </>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
          <DescList
            cols={4}
            items={[
              {
                label: 'Contract',
                value: contract ? (
                  <Link to={`/contracts/${contract.id}`} className="inline-flex items-center gap-1 text-sky-700 hover:underline">
                    <FileSignature size={13} /> {contract.id} <span className="text-xs text-slate-500">v{contract.version}</span>
                  </Link>
                ) : (
                  '—'
                ),
              },
              { label: 'Customer', value: customer?.name ?? '—' },
              { label: 'Project manager', value: <PersonCell id={p.pmId} /> },
              { label: 'Business line', value: <BLTag bl={p.businessLine} short={false} /> },
              { label: 'Site', value: p.site },
              { label: 'Period', value: `${date(p.start)} – ${date(p.end)}` },
              { label: 'Contract value', value: <span className="num">{idr(p.contractValue)}</span> },
              {
                label: `RAB (current v${p.rabVersion})`,
                value: (
                  <span className="num">
                    {idrShort(p.rab)}
                    {p.rab !== p.rabBaseline && <span className="ml-1 text-xs font-normal text-slate-500">baseline {idrShort(p.rabBaseline)}</span>}
                  </span>
                ),
              },
            ]}
          />
          <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="flex items-baseline justify-between text-xs text-slate-500">
              <span>Physical progress</span>
              <span className="num text-lg font-semibold text-slate-900">{p.progress}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${p.progress}%` }} />
            </div>
            <div className="mt-3 flex items-baseline justify-between text-xs text-slate-500">
              <span>Budget consumed (actual + committed)</span>
              <span className={`num text-lg font-semibold ${consumption > 100 ? 'text-red-600' : consumption - p.progress > 10 ? 'text-amber-600' : 'text-slate-900'}`}>{pct(consumption, 0)}</span>
            </div>
            <BudgetBar className="mt-1" rab={p.rab} actual={p.actual} committed={p.committed} />
          </div>
        </div>
      </Card>

      <Grid cols={5} className="mb-5">
        <Stat label="Revenue recognised" value={idrShort(p.revenue)} sub={p.contractValue ? `${pct((p.revenue / p.contractValue) * 100, 0)} of contract` : undefined} />
        <Stat label="Actual cost" value={idrShort(p.actual)} sub={`${pct(p.rab ? (p.actual / p.rab) * 100 : 0, 0)} of RAB`} />
        <Stat label="Open commitments" value={idrShort(p.committed)} sub={`${projectCommitments(p.code).length} open PR/PO`} tone="warn" />
        <Stat label="Remaining budget" value={idrShort(rem)} sub="RAB − actual − committed" tone={rem < 0 ? 'bad' : 'good'} />
        <Stat label="Running margin" value={p.revenue ? pct(margin) : '—'} sub={p.revenue ? idrShort(p.revenue - p.actual) : 'No revenue yet'} tone={!p.revenue ? undefined : margin < 10 ? 'bad' : margin < 15 ? 'warn' : 'good'} />
      </Grid>

      <Tabs<DetailTab>
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'rab', label: 'RAB & versions', count: p.rabVersion },
          { key: 'commitments', label: 'Commitments', count: projectCommitments(p.code).length },
          { key: 'ledger', label: 'Transactions', count: projectLedger(p.code).length },
          { key: 'allocations', label: 'Allocations' },
          { key: 'structure', label: kids.length ? 'Sub-codes & jobs' : 'Jobs & units', count: kids.length ? kids.length : jobCount + unitCount },
        ]}
        value={tab}
        onChange={(t) => setTab(t)}
      />

      {tab === 'overview' && <OverviewTab p={p} onDrill={drill} />}
      {tab === 'rab' && <RabTab p={p} onDrill={drill} />}
      {tab === 'commitments' && <CommitmentsTab p={p} />}
      {tab === 'ledger' && <LedgerTab p={p} category={catFilter} onCategory={(c) => setTab('ledger', { cat: c })} />}
      {tab === 'allocations' && <AllocationsTab p={p} />}
      {tab === 'structure' && <StructureTab p={p} />}

      <RevisionModal open={revOpen} onClose={() => setRevOpen(false)} p={p} />
    </>
  )
}

function RevisionModal({ open, onClose, p }: { open: boolean; onClose: () => void; p: Project }) {
  const toast = useToast()
  const [cat, setCat] = useState<CostCategory>('Fuel')
  const [amount, setAmount] = useState('')
  const [why, setWhy] = useState('')
  const [err, setErr] = useState('')
  const line = projectCostBreakdown(p.code).find((l) => l.category === cat)
  const submit = () => {
    const v = Number(amount.replace(/[^0-9-]/g, ''))
    if (!v) return setErr('Enter the change in IDR (positive to increase, negative to release).')
    if (why.trim().length < 15) return setErr('A rationale is required — it is kept with the version for audit (FAT-08).')
    toast(`RAB v${p.rabVersion + 1} for ${p.code} submitted — awaiting Finance Director approval`, 'success')
    setAmount('')
    setWhy('')
    setErr('')
    onClose()
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Request RAB revision — ${p.code}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            Submit v{p.rabVersion + 1} for approval
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          The baseline (v1) is never overwritten. A revision creates version v{p.rabVersion + 1} with rationale and approver, and variance keeps being reported against both.
        </p>
        <FormField label="Cost category">
          <Select value={cat} onChange={(e) => setCat(e.target.value as CostCategory)} className="w-full">
            {COST_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </FormField>
        {line && (
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs">
            <div>
              <div className="text-slate-500">Current RAB</div>
              <div className="num font-semibold">{idrShort(line.rab)}</div>
            </div>
            <div>
              <div className="text-slate-500">Actual + committed</div>
              <div className="num font-semibold">{idrShort(line.actual + line.committed)}</div>
            </div>
            <div>
              <div className="text-slate-500">Remaining</div>
              <div className={`num font-semibold ${line.remaining < 0 ? 'text-red-600' : ''}`}>{idrShort(line.remaining)}</div>
            </div>
          </div>
        )}
        <FormField label="Change (IDR)" hint="Above IDR 500 m requires CEO approval in addition to the Finance Director.">
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 250000000" inputMode="numeric" />
        </FormField>
        <FormField label="Rationale">
          <textarea
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            placeholder="Why the budget changes (variation order, price index, scope)…"
          />
        </FormField>
        {err && <p className="text-xs font-medium text-red-600">{err}</p>}
        <div className="text-xs text-slate-500">
          Linked code: <ProjectCodeChip code={p.code} />
        </div>
      </div>
    </Modal>
  )
}
