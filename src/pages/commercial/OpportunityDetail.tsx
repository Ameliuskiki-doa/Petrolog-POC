import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Circle, FileText, Gavel, MessageSquare, Plus, Send, XCircle } from 'lucide-react'
import {
  Badge, Button, Callout, Card, CardHeader, DataTable, DescList, EmptyState, Grid, Input, PageHeader, ProjectCodeChip, Stepper, StatusBadge, Tabs, cx,
} from '@/components/ui'
import { getContract, getEmployee, getProject, remainingBudget, runningMargin } from '@/data/core'
import { checklistItems, correspondence, oppStages, defaultProbability, tenderById, type OppStage, type Opportunity, type TrackReview } from '@/data/commercial'
import { budgetLines } from '@/data/procurement'
import { ageDays, date, dateTime, daysUntil, idr, idrShort, pct, TODAY_ISO } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { BLTag, MODULE_CRM, Person, TextLink, customerName } from './shared'
import { oppStore, useContractState, useOpps } from './store'

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const marginThreshold = { HL: 18, PS: 20, GS: 22, CORP: 0 }

type TabKey = 'review' | 'estimate' | 'proposals' | 'corr'

export default function OpportunityDetail() {
  const { id } = useParams()
  const opps = useOpps()
  const o = opps.find((x) => x.id === id)
  const [tab, setTab] = useState<TabKey>('review')
  const toast = useToast()

  if (!o) {
    return (
      <Card>
        <EmptyState title="Opportunity not found" body={`No opportunity with id ${id}.`} />
      </Card>
    )
  }

  const update = (fn: (o: Opportunity) => Opportunity) => oppStore.set((s) => s.map((x) => (x.id === o.id ? fn(x) : x)))
  const tender = tenderById(o.tenderId)
  const allApproved = o.reviews.every((r) => r.status === 'Approved' || r.status === 'Approved with conditions')
  const corr = correspondence.filter((c) => (c.bound.type === 'opportunity' && c.bound.id === o.id) || (o.contractId && c.bound.type === 'contract' && c.bound.id === o.contractId))

  const steps = o.stage === 'Lost' ? ['Lead', 'Qualified', 'Review', 'Proposal', 'Negotiation', 'Lost'] : oppStages.filter((s) => s !== 'Lost')
  const nextStage: Partial<Record<OppStage, OppStage>> = { Lead: 'Qualified', Qualified: 'Review', Review: 'Proposal', Proposal: 'Negotiation' }

  const advance = () => {
    const nx = nextStage[o.stage]
    if (!nx) return
    if (o.stage === 'Review' && !allApproved) {
      toast('Cannot move to Proposal: all three review tracks must be approved first (BDS-09)', 'error')
      setTab('review')
      return
    }
    update((x) => ({
      ...x,
      stage: nx,
      probability: defaultProbability[nx],
      stageSince: TODAY_ISO,
      reviews: nx === 'Review' ? x.reviews.map((r) => ({ ...r, status: 'In Review', startedAt: TODAY_ISO, checklist: r.checklist.length ? r.checklist : checklistItems[r.track].map((item) => ({ item, done: false })) })) : x.reviews,
    }))
    toast(nx === 'Review' ? `${o.id} moved to Review — Legal, Commercial and Technical tracks opened in parallel` : `${o.id} moved to ${nx}`, 'success')
  }

  return (
    <>
      <PageHeader
        module={MODULE_CRM}
        crumbs={[{ label: 'Pipeline', to: '/crm/pipeline' }, { label: o.id }]}
        title={o.title}
        subtitle={<span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs">{o.id}</span><StatusBadge status={o.stage} /><BLTag bl={o.businessLine} /></span>}
        actions={
          nextStage[o.stage] ? (
            <>
              <Button variant="ghost" icon={<XCircle size={15} />} onClick={() => { update((x) => ({ ...x, stage: 'Lost', probability: 0, stageSince: TODAY_ISO, lossReason: 'Withdrawn — no-bid decision recorded by BD Manager' })); toast(`${o.id} archived as Lost with reason`, 'warning') }}>Mark lost</Button>
              <Button variant="primary" icon={<ArrowRight size={15} />} onClick={advance}>Move to {nextStage[o.stage]}</Button>
            </>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <Stepper steps={steps} current={o.stage} />
        <div className="mt-4">
          <DescList
            cols={4}
            items={[
              { label: 'Client', value: customerName(o.customerId) },
              { label: 'Estimated value', value: idr(o.value) },
              { label: 'Probability · weighted', value: `${o.probability}% · ${idrShort((o.value * o.probability) / 100)}` },
              { label: 'Owner', value: <Person id={o.ownerId} /> },
              { label: 'Source', value: o.source },
              { label: 'Tender', value: tender ? <TextLink to="/crm/tenders">{tender.id}</TextLink> : '—' },
              { label: 'Registered · age', value: `${date(o.created)} · ${ageDays(o.created)} days` },
              { label: 'Expected close', value: date(o.expectedClose) },
            ]}
          />
        </div>
      </Card>

      {o.stage === 'Won' && <WonFlow o={o} />}
      {o.stage === 'Lost' && (
        <div className="mb-4">
          <Callout tone="red" icon={<XCircle size={18} />} title={`Lost on ${date(o.stageSince)} — archived with reason for loss`}>
            <p>{o.lossReason}</p>
            {o.competitors && <p className="mt-1 text-xs">Competitors: {o.competitors.join(', ')}</p>}
          </Callout>
        </div>
      )}

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'review', label: 'Review checklist', count: o.reviews.filter((r) => r.status === 'Approved' || r.status === 'Approved with conditions').length },
          { key: 'estimate', label: 'Cost estimate' },
          { key: 'proposals', label: 'Proposal tracker', count: o.proposals.length },
          { key: 'corr', label: 'Correspondence', count: corr.length },
        ]}
      />

      {tab === 'review' && <ReviewTracks o={o} update={update} />}
      {tab === 'estimate' && <CostEstimate o={o} />}
      {tab === 'proposals' && <Proposals o={o} />}
      {tab === 'corr' && (
        <Card padded={false}>
          <div className="flex items-center justify-between border-b border-slate-200 p-3">
            <div className="text-sm text-slate-600">Every letter and minute is bound to this opportunity{o.contractId ? ' or its contract' : ''} (BDS-08).</div>
            <Link to="/crm/correspondence" className="text-xs font-medium text-brand-700 hover:underline">Open correspondence database →</Link>
          </div>
          {corr.length === 0 ? (
            <EmptyState title="No correspondence yet" body="Inbound and outbound letters and meeting minutes will appear here once recorded." icon={<MessageSquare size={32} />} />
          ) : (
            <DataTable
              rows={corr}
              rowKey={(c) => c.id}
              columns={[
                { key: 'date', header: 'Date', render: (c) => <span className="whitespace-nowrap">{date(c.date)}</span> },
                { key: 'kind', header: 'Type', render: (c) => <Badge tone={c.kind === 'Inbound letter' ? 'sky' : c.kind === 'Outbound letter' ? 'violet' : 'slate'}>{c.kind}</Badge> },
                { key: 'subj', header: 'Subject', render: (c) => <div className="min-w-[260px]"><div className="font-medium text-slate-800">{c.subject}</div><div className="text-xs text-slate-500">{c.summary}</div></div> },
                { key: 'ref', header: 'Reference', render: (c) => <span className="font-mono text-[11px] text-slate-500">{c.ref}</span> },
                { key: 'bound', header: 'Bound to', render: (c) => <span className="font-mono text-[11px]">{c.bound.id}</span> },
              ]}
            />
          )}
        </Card>
      )}
    </>
  )
}

function WonFlow({ o }: { o: Opportunity }) {
  const cs = useContractState()
  const c = getContract(o.contractId)
  if (!c) return null
  const st = cs[c.id]
  const issued = st?.status === 'Active'
  const box = 'flex min-w-[180px] flex-1 flex-col rounded-lg bg-white p-3 ring-1 ring-slate-200'
  return (
    <Card className="mb-4 border-emerald-200 bg-emerald-50/40">
      <CardHeader title="Won → contract registered → project code issued automatically" subtitle="Flow §2.7.1 · BDS-11: the project code is issued from the approved contract, inheriting its rate card and contract period." />
      <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
        <div className={box}>
          <span className="text-[11px] text-slate-500">Opportunity</span>
          <span className="font-mono text-sm font-semibold">{o.id}</span>
          <span className="mt-1"><StatusBadge status="Won" /> <span className="text-xs text-slate-500">{date(o.stageSince)}</span></span>
        </div>
        <ArrowRight className="mx-auto shrink-0 rotate-90 text-slate-400 md:rotate-0" size={18} />
        <div className={box}>
          <span className="text-[11px] text-slate-500">Contract registered</span>
          <TextLink to={`/contracts/${c.id}`}>{c.id}</TextLink>
          <span className="mt-1 flex items-center gap-1.5"><StatusBadge status={st?.status ?? c.status} /> <span className="text-xs text-slate-500">v{c.version} · {c.rateCard.length} rate line(s)</span></span>
        </div>
        <ArrowRight className="mx-auto shrink-0 rotate-90 text-slate-400 md:rotate-0" size={18} />
        <div className={cx(box, !issued && 'ring-amber-300')}>
          <span className="text-[11px] text-slate-500">Project code</span>
          <span><ProjectCodeChip code={c.projectCode} /></span>
          <span className="mt-1 text-xs">
            {issued ? (
              <span className="text-emerald-700">Issued automatically{st?.codeIssuedAt ? ` · ${dateTime(st.codeIssuedAt)}` : ''} — period {date(c.start)} – {date(c.end)}</span>
            ) : (
              <span className="text-amber-700">Reserved · issued on contract approval. <Link className="font-medium underline" to={`/contracts/${c.id}`}>Go to approval</Link></span>
            )}
          </span>
        </div>
      </div>
    </Card>
  )
}

function slaInfo(r: TrackReview): { label: string; tone: 'green' | 'amber' | 'red' | 'slate' } {
  if (!r.startedAt) return { label: `SLA ${r.slaDays} days · not started`, tone: 'slate' }
  const due = addDays(r.startedAt, r.slaDays)
  if (r.completedAt) {
    const took = ageDays(r.startedAt) - ageDays(r.completedAt)
    return { label: `Closed in ${took} d (SLA ${r.slaDays} d)`, tone: took <= r.slaDays ? 'green' : 'red' }
  }
  const left = daysUntil(due)
  if (left < 0) return { label: `Overdue ${-left} d · due ${date(due)}`, tone: 'red' }
  if (left <= 1) return { label: left === 0 ? `Due today` : `Due tomorrow`, tone: 'amber' }
  return { label: `${left} d left · due ${date(due)}`, tone: 'green' }
}

function ReviewTracks({ o, update }: { o: Opportunity; update: (fn: (o: Opportunity) => Opportunity) => void }) {
  const toast = useToast()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const started = o.reviews.filter((r) => r.startedAt)
  const parallelDays = Math.max(0, ...o.reviews.map((r) => r.slaDays))
  const sequentialDays = o.reviews.reduce((s, r) => s + r.slaDays, 0)

  const setTrack = (track: string, fn: (r: TrackReview) => TrackReview) => update((x) => ({ ...x, reviews: x.reviews.map((r) => (r.track === track ? fn(r) : r)) }))

  if (started.length === 0) {
    return (
      <Card>
        <EmptyState title="Review not yet opened" body={`The three review tracks open in parallel when the opportunity moves to Review. Current stage: ${o.stage}.`} icon={<Gavel size={32} />} />
      </Card>
    )
  }

  return (
    <>
      <div className="mb-4">
        <Callout tone="violet" title="Three tracks running in parallel (BDS-09 / BDS-10)">
          Legal, Commercial and Technical reviewers work at the same time, each against its own SLA. The review closes in <b>{parallelDays} working days</b> at most, not the {sequentialDays} days a sequential hand-off would take, so the bid cycle stays inside the tender deadline.
        </Callout>
      </div>
      <Grid cols={3}>
        {o.reviews.map((r) => {
          const s = slaInfo(r)
          const done = r.checklist.filter((c) => c.done).length
          const open = r.status === 'In Review'
          return (
            <Card key={r.track} className="flex flex-col">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{r.track} review</div>
                  <div className="mt-1"><Person id={r.reviewerId} sub /></div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone={s.tone}>{s.label}</Badge>
                <span className="text-[11px] text-slate-500">{done}/{r.checklist.length} items</span>
              </div>
              <ul className="mb-3 space-y-1.5">
                {r.checklist.map((c, i) => (
                  <li key={i}>
                    <button
                      disabled={!open}
                      onClick={() => setTrack(r.track, (t) => ({ ...t, checklist: t.checklist.map((x, k) => (k === i ? { ...x, done: !x.done } : x)) }))}
                      className="flex w-full items-start gap-2 text-left text-sm disabled:cursor-default"
                    >
                      {c.done ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <Circle size={16} className="mt-0.5 shrink-0 text-slate-300" />}
                      <span className={cx(c.done ? 'text-slate-700' : 'text-slate-500')}>{c.item}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-auto border-t border-slate-100 pt-3">
                <div className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Reviewer comments</div>
                {r.comments.length === 0 && <div className="mb-2 text-xs text-slate-400">No comments.</div>}
                <div className="space-y-2">
                  {r.comments.map((c, i) => (
                    <div key={i} className="rounded-md bg-slate-50 p-2 text-xs">
                      <div className="mb-0.5 flex justify-between gap-2 text-slate-500"><span className="font-medium text-slate-700">{getEmployee(c.by)?.name}</span><span>{dateTime(c.at)}</span></div>
                      <div className="text-slate-700">{c.text}</div>
                    </div>
                  ))}
                </div>
                {open && (
                  <>
                    <div className="mt-2 flex gap-1.5">
                      <Input value={drafts[r.track] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [r.track]: e.target.value }))} placeholder="Add a comment…" className="h-8 text-xs" />
                      <Button
                        size="sm"
                        icon={<Send size={13} />}
                        onClick={() => {
                          const t = (drafts[r.track] ?? '').trim()
                          if (!t) return
                          setTrack(r.track, (x) => ({ ...x, comments: [...x.comments, { by: x.reviewerId, at: `${TODAY_ISO}T09:30`, text: t }] }))
                          setDrafts((d) => ({ ...d, [r.track]: '' }))
                        }}
                      />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        className="flex-1"
                        onClick={() => {
                          if (done < r.checklist.length) {
                            toast(`${r.track} track: complete all checklist items before approving`, 'error')
                            return
                          }
                          setTrack(r.track, (x) => ({ ...x, status: 'Approved', completedAt: TODAY_ISO }))
                          toast(`${r.track} review approved`, 'success')
                        }}
                      >
                        Approve
                      </Button>
                      <Button size="sm" variant="danger" className="flex-1" onClick={() => { setTrack(r.track, (x) => ({ ...x, status: 'Rejected', completedAt: TODAY_ISO })); toast(`${r.track} review rejected — BD Manager notified`, 'warning') }}>Reject</Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )
        })}
      </Grid>
    </>
  )
}

function CostEstimate({ o }: { o: Opportunity }) {
  const comps = o.comparables.map((c) => getProject(c)).filter((p): p is NonNullable<typeof p> => !!p)
  const ratio = comps.length ? comps.reduce((s, p) => s + p.rab / p.contractValue, 0) / comps.length : 0.8
  const estCost = o.value * ratio
  const margin = ((o.value - estCost) / o.value) * 100
  const threshold = marginThreshold[o.businessLine]

  // Category mix from the comparable projects' RAB lines (children included)
  const codes = new Set(comps.flatMap((p) => [p.code, ...budgetLines.filter((b) => b.projectCode.startsWith(p.code + '.')).map((b) => b.projectCode)]))
  const mix = new Map<string, number>()
  budgetLines.filter((b) => codes.has(b.projectCode)).forEach((b) => mix.set(b.category, (mix.get(b.category) ?? 0) + b.rab))
  const mixTotal = [...mix.values()].reduce((a, b) => a + b, 0)
  const lines = [...mix.entries()].sort((a, b) => b[1] - a[1]).map(([cat, v]) => ({ cat, share: v / mixTotal, amount: (estCost * v) / mixTotal }))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2" padded={false}>
        <div className="p-4 pb-2">
          <CardHeader title="Historical comparable projects" subtitle="The estimate is drawn from the cost structure of similar completed or running project codes, not a blank spreadsheet." />
        </div>
        <DataTable
          rows={comps}
          rowKey={(p) => p.code}
          columns={[
            { key: 'code', header: 'Project code', render: (p) => <ProjectCodeChip code={p.code} showName /> },
            { key: 'cv', header: 'Contract value', align: 'right', render: (p) => idrShort(p.contractValue) },
            { key: 'rab', header: 'RAB', align: 'right', render: (p) => idrShort(p.rab) },
            { key: 'act', header: 'Actual to date', align: 'right', render: (p) => idrShort(p.actual) },
            { key: 'rem', header: 'Remaining', align: 'right', render: (p) => idrShort(remainingBudget(p)) },
            { key: 'ratio', header: 'RAB / value', align: 'right', render: (p) => pct((p.rab / p.contractValue) * 100) },
            { key: 'mg', header: 'Running margin', align: 'right', render: (p) => pct(runningMargin(p)) },
          ]}
          footer={
            <tr>
              <td className="px-3 py-2 text-xs" colSpan={5}>Average cost ratio applied</td>
              <td className="num px-3 py-2 text-right text-sm">{pct(ratio * 100)}</td>
              <td />
            </tr>
          }
        />
        <div className="border-t border-slate-200 p-4">
          <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Estimated cost by category</div>
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={l.cat} className="grid grid-cols-[140px_1fr_110px] items-center gap-3 text-sm">
                <span className="text-slate-600">{l.cat}</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${l.share * 100}%` }} /></div>
                <span className="num text-right font-medium">{idrShort(l.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Estimate summary" />
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Offer value</dt><dd className="num font-medium">{idr(o.value)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Estimated cost</dt><dd className="num font-medium">{idr(estCost)}</dd></div>
          <div className="flex justify-between border-t border-slate-100 pt-3"><dt className="text-slate-500">Estimated gross margin</dt><dd className={cx('num font-semibold', margin >= threshold ? 'text-emerald-700' : 'text-red-600')}>{pct(margin)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Business-line threshold</dt><dd className="num">{pct(threshold, 0)}</dd></div>
        </dl>
        <div className="mt-4">
          <Callout tone={margin >= threshold ? 'green' : 'amber'}>
            {margin >= threshold ? 'Margin meets the threshold checked by the Commercial review track.' : 'Margin below threshold — Commercial track will require Director sign-off.'}
          </Callout>
        </div>
        <p className="mt-3 text-xs text-slate-500">When the opportunity is won, this estimate seeds RAB v1 of the new project code.</p>
      </Card>
    </div>
  )
}

function Proposals({ o }: { o: Opportunity }) {
  const toast = useToast()
  if (o.proposals.length === 0)
    return (
      <Card>
        <EmptyState title="No proposal yet" body="Proposal versions are tracked here once the review is complete." icon={<FileText size={32} />} />
      </Card>
    )
  const cur = o.proposals[o.proposals.length - 1]
  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3">
        <div className="text-sm text-slate-600">
          Current: <b>{cur.version}</b> · <StatusBadge status={cur.status} /> · deadline {date(cur.deadline)}{' '}
          {daysUntil(cur.deadline) >= 0 ? <Badge tone={daysUntil(cur.deadline) <= 7 ? 'amber' : 'slate'}>{daysUntil(cur.deadline)} days left</Badge> : null}
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => toast('New proposal version created from template — previous version kept (BDS-07)', 'info')}>New version</Button>
      </div>
      <DataTable
        rows={[...o.proposals].reverse()}
        rowKey={(p) => p.version}
        columns={[
          { key: 'v', header: 'Version', render: (p) => <span className="font-medium">{p.version}</span> },
          { key: 'd', header: 'Date', render: (p) => date(p.date) },
          { key: 's', header: 'Submission status', render: (p) => <StatusBadge status={p.status} /> },
          { key: 'dl', header: 'Deadline', render: (p) => date(p.deadline) },
          { key: 'age', header: 'Age', align: 'right', render: (p) => `${ageDays(p.date)} d` },
          { key: 'o', header: 'Owner', render: (p) => <Person id={p.ownerId} /> },
          { key: 'n', header: 'Notes', render: (p) => <span className="text-slate-600">{p.note}</span> },
          { key: 'f', header: 'Document', render: (p) => <span className="inline-flex items-center gap-1 text-xs text-brand-700"><FileText size={13} />{p.file}</span> },
        ]}
      />
    </Card>
  )
}
