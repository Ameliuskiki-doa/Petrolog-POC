import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Calculator, CheckCircle2, Info, RotateCcw, Send } from 'lucide-react'
import { Badge, Button, Callout, Card, CardHeader, DescList, Grid, Input, PageHeader, ProjectCodeChip, Progress, Stat, StatusBadge } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, idr, idrShort, num, pct } from '@/lib/format'
import { getCustomer, getEmployee, getProject, projects } from '@/data/core'
import { costCategories, budgetLines, type CostCategory } from '@/data/procurement'
import { opportunities } from '@/data/commercial'
import { approveRabV1, submitRabV1, type NewProject } from '@/lib/newProjects'
import { MODULE, PersonCell } from './shared'

/** Comparable project used to seed the category mix — the opportunity's own comparable when there is one. */
function seedMix(n: NewProject): { comparable?: string; mix: { category: CostCategory; share: number }[] } {
  const opp = opportunities.find((o) => o.id === n.sourceOpportunityId)
  const comparable = opp?.comparables.find((c) => getProject(c)) ?? projects.find((p) => p.businessLine === n.project.businessLine && p.rab > 0 && !p.parent)?.code
  const lines = budgetLines.filter((b) => comparable && (b.projectCode === comparable || b.projectCode.startsWith(comparable + '.')))
  const total = lines.reduce((s, l) => s + l.rab, 0)
  const byCat = new Map<CostCategory, number>()
  lines.forEach((l) => byCat.set(l.category, (byCat.get(l.category) ?? 0) + l.rab))
  const mix = [...byCat.entries()].map(([category, v]) => ({ category, share: v / total })).sort((a, b) => b.share - a.share)
  return { comparable, mix: mix.length ? mix : [{ category: 'Subcontract' as CostCategory, share: 1 }] }
}

/**
 * RAB v1 for a project code issued this session (FAT-07).
 * Seeded from the cost structure of a comparable project, adjusted by the Project Manager,
 * then approved by the Finance Director before the code accepts requisitions and jobs.
 */
export function PrepareRab({ n }: { n: NewProject }) {
  const toast = useToast()
  const p = n.project
  const customer = getCustomer(p.customerId)
  const { comparable, mix } = useMemo(() => seedMix(n), [n])
  const comp = getProject(comparable)
  /** Cost ratio of the comparable: RAB ÷ contract value */
  const ratio = comp && comp.contractValue ? comp.rab / comp.contractValue : 0.8
  const seeded = useMemo(
    () => Object.fromEntries(mix.map((m) => [m.category, Math.round((p.contractValue * ratio * m.share) / 1e6) * 1e6])) as Record<string, number>,
    [mix, p.contractValue, ratio],
  )

  const [amounts, setAmounts] = useState<Record<string, number>>(() => Object.fromEntries(n.rabLines.map((l) => [l.category, l.amount])) as Record<string, number>)
  const [rationale, setRationale] = useState('')
  const [tried, setTried] = useState(false)
  const values = n.rabStatus === 'Not prepared' && Object.keys(amounts).length === 0 ? seeded : amounts
  const total = Object.values(values).reduce((s, v) => s + (v || 0), 0)
  const margin = p.contractValue ? ((p.contractValue - total) / p.contractValue) * 100 : 0
  const threshold = { HL: 15, PS: 12, GS: 18, CORP: 0 }[p.businessLine]
  const submitted = n.rabStatus !== 'Not prepared'

  const errors = {
    total: total <= 0 ? 'Enter at least one cost category' : total >= p.contractValue ? 'RAB cannot reach or exceed the contract value' : '',
    rationale: rationale.trim().length < 10 ? 'Describe how this budget was built (minimum 10 characters)' : '',
  }
  const valid = !errors.total && !errors.rationale

  const set = (cat: string, raw: string) => setAmounts({ ...values, [cat]: Number(raw.replace(/\D/g, '')) })

  function submit() {
    setTried(true)
    if (!valid) return
    const lines = Object.entries(values)
      .filter(([, v]) => v > 0)
      .map(([category, amount]) => ({ category, amount }))
    submitRabV1(p.code, lines, rationale.trim(), 'EMP-0003')
    toast(`RAB v1 of ${idrShort(total)} submitted for approval — ${p.code} stays blocked until the Finance Director approves`, 'success')
  }

  function approve() {
    approveRabV1(p.code)
    toast(`RAB v1 approved — ${p.code} is now open for requisitions, job orders and timesheets`, 'success')
  }

  return (
    <>
      <PageHeader
        module={MODULE}
        crumbs={[{ label: 'Project codes & P/L', to: '/projects' }, { label: p.code }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{p.code}</span>
            <span className="text-slate-400">·</span>
            {p.name}
            <StatusBadge status={p.status} />
          </span>
        }
        subtitle={n.rabStatus === 'Approved' ? 'RAB v1 approved. The P/L fills as purchase orders, verified jobs, timesheets and fuel entries arrive against this code.' : 'The code is issued and reserved. Costs are blocked until RAB v1 is approved (FAT-07).'}
        actions={
          n.rabStatus === 'Pending approval' ? (
            <Button variant="success" icon={<BadgeCheck size={15} />} onClick={approve}>
              Approve RAB v1 (Finance Director)
            </Button>
          ) : n.rabStatus === 'Not prepared' ? (
            <Button variant="primary" icon={<Send size={15} />} onClick={submit}>
              Submit RAB v1 for approval
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <DescList
          cols={4}
          items={[
            { label: 'Contract', value: p.contractId ? <Link className="font-mono text-sm text-sky-700 hover:underline" to={`/contracts/${p.contractId}`}>{p.contractId}</Link> : '—' },
            { label: 'Client', value: customer?.name ?? '—' },
            { label: 'Contract value', value: idr(p.contractValue) },
            { label: 'Period', value: `${date(p.start)} – ${date(p.end)}` },
            { label: 'Project manager', value: <PersonCell id={p.pmId} /> },
            { label: 'Source opportunity', value: n.sourceOpportunityId ? <Link className="font-mono text-sm text-sky-700 hover:underline" to={`/crm/opportunities/${n.sourceOpportunityId}`}>{n.sourceOpportunityId}</Link> : '—' },
            { label: 'RAB status', value: <StatusBadge status={n.rabStatus === 'Not prepared' ? 'Draft' : n.rabStatus === 'Pending approval' ? 'Pending Approval' : 'Approved'} /> },
            { label: 'Prepared by', value: n.preparedBy ? `${getEmployee(n.preparedBy)?.name} · ${date(n.preparedOn!)}` : 'Not yet submitted' },
          ]}
        />
      </Card>

      <Grid cols={4} className="mb-4">
        <Stat label="Contract value" value={idrShort(p.contractValue)} sub="Revenue ceiling for this code" />
        <Stat label="RAB v1 (working)" value={idrShort(total)} sub={`${pct((total / p.contractValue) * 100, 1)} of contract value`} />
        <Stat label="Planned gross margin" value={pct(margin)} sub={`Business-line threshold ${pct(threshold, 0)}`} tone={margin >= threshold ? 'good' : 'bad'} />
        <Stat label="Comparable cost ratio" value={pct(ratio * 100, 1)} sub={comp ? `${comp.code} · ${comp.name}` : 'Business-line default'} />
      </Grid>

      {n.rabStatus === 'Approved' ? (
        <Callout tone="green" icon={<CheckCircle2 size={18} />} title={`RAB v1 approved — ${idrShort(total)}`}>
          {p.code} now accepts purchase requisitions (budget-checked per category), job orders, timesheets and fuel entries. Later changes are recorded as RAB v2 with their
          rationale; this baseline stays for comparison (FAT-08).
        </Callout>
      ) : (
        <Callout tone="blue" icon={<Calculator size={16} />} title={`Seeded from ${comp ? `${comp.code} — ${comp.name}` : 'the business-line cost structure'}`}>
          The starting figures apply that project&apos;s cost ratio ({pct(ratio * 100, 1)} of contract value) and its category mix to this contract. Adjust each category to
          the scope actually sold, then submit. The estimate behind the winning bid is the starting point, not the answer.
        </Callout>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card padded={false} className="lg:col-span-2">
          <div className="p-4 pb-2">
            <CardHeader
              title="RAB by cost category"
              subtitle="Categories follow the chart of accounts, so budget-to-actual comparison stays meaningful (FAT-07)."
              actions={!submitted && <Button size="sm" icon={<RotateCcw size={13} />} onClick={() => setAmounts({})}>Reset to seeded</Button>}
            />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                <th className="px-3 py-2">Cost category</th>
                <th className="px-3 py-2">Share of RAB</th>
                <th className="px-3 py-2 text-right">Comparable mix</th>
                <th className="px-3 py-2 text-right" style={{ width: 190 }}>
                  RAB v1
                </th>
              </tr>
            </thead>
            <tbody>
              {costCategories.map((cat) => {
                const v = values[cat] ?? 0
                const share = total ? (v / total) * 100 : 0
                const compShare = mix.find((m) => m.category === cat)?.share
                return (
                  <tr key={cat} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-medium text-slate-700">{cat}</td>
                    <td className="px-3 py-2">
                      <div className="w-32">
                        <Progress value={share} tone="brand" />
                      </div>
                    </td>
                    <td className="num px-3 py-2 text-right text-xs text-slate-500">{compShare ? pct(compShare * 100, 1) : '—'}</td>
                    <td className="px-3 py-2 text-right">
                      {submitted ? (
                        <span className="num font-medium">{v ? idr(v) : '—'}</span>
                      ) : (
                        <Input value={v ? num(v) : ''} onChange={(e) => set(cat, e.target.value)} placeholder="0" className="text-right" inputMode="numeric" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
              <tr>
                <td className="px-3 py-2">Total RAB v1</td>
                <td className="px-3 py-2 text-xs font-normal text-slate-500">Contract value {idrShort(p.contractValue)}</td>
                <td />
                <td className="num px-3 py-2 text-right">{idr(total)}</td>
              </tr>
            </tfoot>
          </table>
          {tried && errors.total && <div className="px-4 py-2 text-xs text-red-600">{errors.total}</div>}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Basis of the budget" subtitle="Recorded with the version and read by the Finance Director" />
            {submitted ? (
              <p className="text-sm text-slate-700">{n.rationale}</p>
            ) : (
              <>
                <textarea
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  rows={5}
                  placeholder="e.g. Tender build-up at IDR 51,200 per tonne over 14 months; subcontract haulage for 2 of 6 trucks; fuel at PO price with 3% contingency."
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
                {tried && errors.rationale && <div className="mt-1 text-xs text-red-600">{errors.rationale}</div>}
              </>
            )}
          </Card>

          <Card>
            <CardHeader title="What happens next" />
            <ol className="space-y-2 text-sm text-slate-600">
              {[
                ['Project Manager submits RAB v1', n.rabStatus !== 'Not prepared'],
                ['Finance Director approves', n.rabStatus === 'Approved'],
                ['Code opens for PR budget check, jobs, timesheets and fuel', n.rabStatus === 'Approved'],
                ['Changes are recorded as RAB v2 with rationale; baseline v1 stays', false],
              ].map(([label, done]) => (
                <li key={String(label)} className="flex items-start gap-2">
                  {done ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /> : <Info size={15} className="mt-0.5 shrink-0 text-slate-300" />}
                  <span>{label}</span>
                </li>
              ))}
            </ol>
            {n.rabStatus === 'Approved' && (
              <p className="mt-3 text-xs text-slate-500">
                The P/L statement fills as transactions arrive against {p.code}: purchase orders, verified job orders, timesheets and fuel entries. Nothing has been booked
                yet, so every figure below is still the budget.
              </p>
            )}
          </Card>

          {comp && (
            <Card>
              <CardHeader title="Comparable project" />
              <div className="space-y-1.5 text-sm">
                <div>
                  <ProjectCodeChip code={comp.code} showName />
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Contract value</span>
                  <span className="num">{idrShort(comp.contractValue)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>RAB</span>
                  <span className="num">{idrShort(comp.rab)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Running margin</span>
                  <span className="num">{pct(comp.revenue ? ((comp.revenue - comp.actual) / comp.revenue) * 100 : 0)}</span>
                </div>
                <Badge tone="slate">Cost ratio {pct(ratio * 100, 1)}</Badge>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
