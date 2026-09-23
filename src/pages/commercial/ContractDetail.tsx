import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { BadgeCheck, CheckCircle2, Clock, FileSignature, History, Info, Lock } from 'lucide-react'
import {
  Badge, Button, Callout, Card, CardHeader, DataTable, DescList, EmptyState, FormField, Input, PageHeader, Progress, ProjectCodeChip, StatusBadge, Tabs, Timeline,
} from '@/components/ui'
import { getContract, getEmployee, projects, remainingBudget, runningMargin, type Contract } from '@/data/core'
import { correspondence } from '@/data/commercial'
import { date, dateTime, daysUntil, idr, idrShort, num, pct, period, TODAY_ISO } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { BLTag, MODULE_CTR, TextLink, customerName } from './shared'
import { contractStore, useContractExtras, useContractState, useDraftContracts, useOpps } from './store'
import { thresholdBadge } from './Contracts'

type TabKey = 'overview' | 'rates' | 'payment' | 'projects' | 'corr'

/** Rate in force on a given service date — resolved by effective date, not by today's card (BDS-02). */
function rateOn(c: Contract, item: string, iso: string) {
  return c.rateCard.filter((r) => r.item === item && r.effectiveFrom <= iso).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
}

export default function ContractDetail() {
  const { id } = useParams()
  const drafts = useDraftContracts()
  const base = getContract(id) ?? drafts.find((d) => d.contract.id === id)?.contract
  const st = useContractState()
  const extras = useContractExtras()
  const opps = useOpps()
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('overview')
  const [lookup, setLookup] = useState(id === 'CTR-2027-011' ? '2027-12-15' : TODAY_ISO)

  if (!base) return <Card><EmptyState title="Contract not found" body={`No contract with id ${id}.`} /></Card>

  const state = st[base.id] ?? { status: base.status }
  const c = { ...base, status: state.status }
  const x = extras[c.id]
  const opp = opps.find((o) => o.contractId === c.id)
  const linked = projects.filter((p) => p.contractId === c.id)
  const corr = correspondence.filter((k) => k.bound.type === 'contract' && k.bound.id === c.id)
  const items = [...new Set(c.rateCard.map((r) => r.item))]
  const isDraft = drafts.some((d) => d.contract.id === c.id)
  const pending = c.status === 'Pending Approval'
  const issuedNow = !!state.codeIssuedAt

  const approve = () => {
    contractStore.set((s) => ({ ...s, [c.id]: { status: 'Active', codeIssuedAt: `${TODAY_ISO}T09:14` } }))
    toast(`${c.id} approved — project code ${c.projectCode} issued automatically, inheriting rate card and period ${date(c.start)} – ${date(c.end)}`, 'success')
  }

  return (
    <>
      <PageHeader
        module={MODULE_CTR}
        crumbs={[{ label: 'Contracts', to: '/contracts' }, { label: c.id }]}
        title={c.title}
        subtitle={<span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs">{c.id} · v{c.version}</span><StatusBadge status={c.status} /><BLTag bl={c.businessLine} /></span>}
        actions={pending ? <Button variant="primary" icon={<BadgeCheck size={16} />} onClick={approve}>Approve & issue project code</Button> : undefined}
      />

      {pending && (
        <div className="mb-4">
          <Callout tone="amber" icon={<Clock size={18} />} title="Pending Finance Director approval">
            On approval the contract becomes Active and project code <b className="font-mono">{c.projectCode}</b> is issued automatically — no separate request to Project Control. The code inherits this contract's rate card ({c.rateCard.length} line) and period {date(c.start)} – {date(c.end)} (BDS-11).
          </Callout>
        </div>
      )}
      {issuedNow && (
        <div className="mb-4">
          <Callout tone="green" icon={<CheckCircle2 size={18} />} title={`Contract approved · project code ${c.projectCode} issued ${dateTime(state.codeIssuedAt!)}`}>
            Rate card and period inherited. The code is now open for requisitions, jobs, timesheets and billing.{' '}
            {isDraft ? (
              <span className="text-emerald-800">Its P/L opens in Project Control once the first RAB version is approved.</span>
            ) : (
              <TextLink to={`/projects/${c.projectCode}`} mono={false}>Open project {c.projectCode} →</TextLink>
            )}
          </Callout>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <DescList
              cols={3}
              items={[
                { label: 'Client', value: customerName(c.customerId) },
                { label: 'Contract value (current version)', value: idr(c.value) },
                { label: 'Period', value: `${date(c.start)} – ${date(c.end)}` },
                { label: 'Payment terms', value: `${c.paymentTermDays} days · ${x?.billing ?? '—'}` },
                { label: 'Retention', value: `${c.retentionPct}% · ${x?.retentionRelease ?? ''}` },
                { label: 'Project code', value: <span className="flex items-center gap-2"><ProjectCodeChip code={c.projectCode} />{pending && <Badge tone="amber">Reserved</Badge>}</span> },
                { label: 'Source opportunity', value: opp ? <TextLink to={`/crm/opportunities/${opp.id}`}>{opp.id}</TextLink> : 'Pre-system contract (migrated)' },
                { label: 'Signed by', value: x?.signedBy ?? '—' },
                { label: 'Days to expiry', value: daysUntil(c.end) >= 0 ? `${daysUntil(c.end)} days` : `Ended ${date(c.end)}` },
              ]}
            />
          </Card>

          <div>
            <Tabs<TabKey>
              value={tab}
              onChange={setTab}
              tabs={[
                { key: 'overview', label: 'Versions & dates' },
                { key: 'rates', label: 'Rate card', count: c.rateCard.length },
                { key: 'payment', label: 'Payment terms', count: x?.milestones.length },
                { key: 'projects', label: 'Project codes & P/L', count: linked.length },
                { key: 'corr', label: 'Correspondence', count: corr.length },
              ]}
            />

            {tab === 'overview' && x && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader title="Versions & chained amendments" subtitle="Each amendment is a new version with its own effective date; earlier versions remain readable (BDS-01)." />
                  <Timeline
                    items={[...x.versions].reverse().map((v) => ({
                      time: `Signed ${date(v.signed)} · effective ${date(v.effective)}`,
                      title: <span className="flex flex-wrap items-center gap-2">v{v.version} — {v.label}{v.version === c.version && <Badge tone="green">Current</Badge>}</span>,
                      body: `${v.summary}. Value after: ${idrShort(v.valueAfter)}`,
                      tone: v.version === c.version ? 'green' : 'slate',
                    }))}
                  />
                </Card>
                <Card>
                  <CardHeader title="Critical dates" subtitle="Notifications at 90 / 60 / 30 days to the contract owner and Finance." />
                  <ul className="divide-y divide-slate-100">
                    {x.criticalDates.map((d) => {
                      const n = daysUntil(d.date)
                      return (
                        <li key={d.label} className="flex items-center justify-between gap-2 py-2">
                          <div>
                            <div className="text-sm text-slate-800">{d.label}</div>
                            <div className="text-xs text-slate-500">{d.kind} · {date(d.date)}</div>
                          </div>
                          {n <= 90 && n >= -30 && d.kind !== 'Start' ? thresholdBadge(n) : <span className="text-xs text-slate-400">{n < 0 ? 'passed' : `${n} d`}</span>}
                        </li>
                      )
                    })}
                  </ul>
                  {x.guarantees.length > 0 && (
                    <>
                      <div className="mt-3 mb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Guarantees</div>
                      {x.guarantees.map((g) => (
                        <div key={g.number} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                          <span>{g.kind} · {g.bank} <span className="font-mono text-slate-500">{g.number}</span></span>
                          <span className="num font-medium whitespace-nowrap">{idrShort(g.amount)} · to {date(g.validUntil)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </Card>
              </div>
            )}

            {tab === 'rates' && (
              <div className="space-y-4">
                <Card padded={false}>
                  <div className="p-4 pb-2"><CardHeader title="Rate card with effective dating" subtitle="Rates per trip, hour, tonne, unit-month, man-day or lump sum. A new rate starts a new effective period; it never overwrites the old one (BDS-02)." /></div>
                  <DataTable
                    rows={[...c.rateCard].sort((a, b) => a.item.localeCompare(b.item) || b.effectiveFrom.localeCompare(a.effectiveFrom))}
                    rowKey={(r) => r.item + r.effectiveFrom}
                    columns={[
                      { key: 'i', header: 'Rate item', render: (r) => <span className="font-medium text-slate-800">{r.item}</span> },
                      { key: 'b', header: 'Basis', render: (r) => <Badge>{r.basis}</Badge> },
                      { key: 'r', header: 'Rate', align: 'right', render: (r) => idr(r.rate) },
                      { key: 'f', header: 'Effective from', render: (r) => date(r.effectiveFrom) },
                      {
                        key: 's', header: 'Effective status', render: (r) => {
                          const cur = rateOn(c, r.item, TODAY_ISO)
                          if (r.effectiveFrom > TODAY_ISO) return <Badge tone="sky">Scheduled</Badge>
                          if (cur === r) return <Badge tone="green" dot>In force</Badge>
                          const next = c.rateCard.filter((z) => z.item === r.item && z.effectiveFrom > r.effectiveFrom).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0]
                          return <Badge tone="slate">Superseded {next ? `from ${date(next.effectiveFrom)}` : ''}</Badge>
                        },
                      },
                    ]}
                  />
                </Card>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader title="Rate lookup by service date" subtitle="Billing resolves the rate from the date the service was performed." />
                    <FormField label="Service date"><Input type="date" value={lookup} onChange={(e) => setLookup(e.target.value || TODAY_ISO)} /></FormField>
                    <ul className="mt-3 divide-y divide-slate-100 text-sm">
                      {items.map((it) => {
                        const r = rateOn(c, it, lookup)
                        return (
                          <li key={it} className="flex items-center justify-between gap-2 py-1.5">
                            <span className="text-slate-600">{it}</span>
                            <span className="num font-medium whitespace-nowrap">{r ? `${idr(r.rate)} ${r.basis}` : <span className="text-slate-400">not in force</span>}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </Card>
                  {x?.billingHistory ? (
                    <Card padded={false}>
                      <div className="p-4 pb-2"><CardHeader title="Billing already computed" subtitle="Amendment 02 (Jan 2028 hauling rate) did not alter earlier periods." /></div>
                      <DataTable
                        dense
                        rows={x.billingHistory}
                        rowKey={(b) => b.period}
                        columns={[
                          { key: 'p', header: 'Period', render: (b) => <span className="flex items-center gap-1.5">{period(b.period)}{b.period < '2028-01' && <Lock size={12} className="text-slate-400" />}</span> },
                          { key: 'q', header: 'Tonnes', align: 'right', render: (b) => num(b.qty) },
                          { key: 'r', header: 'Rate applied', align: 'right', render: (b) => <span className={b.rate === 46_000 ? 'text-slate-500' : 'font-medium'}>{num(b.rate)}</span> },
                          { key: 'a', header: 'Amount', align: 'right', render: (b) => idrShort(b.qty * b.rate) },
                          { key: 'i', header: 'Invoice', render: (b) => <span className="font-mono text-[11px]">{b.invoice}</span> },
                        ]}
                      />
                      <div className="p-3"><Callout tone="blue" icon={<Info size={16} />}>Nov–Dec 2027 stay at IDR 46,000 per tonne; Jan 2028 onwards bills at IDR 48,500. No credit notes or re-billing were needed.</Callout></div>
                    </Card>
                  ) : (
                    <Card><EmptyState title="Single rate period" body="No mid-contract rate amendment on this contract yet." icon={<History size={30} />} /></Card>
                  )}
                </div>
              </div>
            )}

            {tab === 'payment' && x && (
              <Card padded={false}>
                <div className="p-4 pb-2"><CardHeader title="Payment terms, milestones & retention" subtitle={`${c.paymentTermDays}-day terms · ${c.retentionPct}% retention · drives billing schedules in Billing & Surat Konversi (BDS-03)`} /></div>
                <DataTable
                  rows={x.milestones}
                  rowKey={(m) => m.name}
                  columns={[
                    { key: 'n', header: 'Milestone / term', render: (m) => <span className="font-medium text-slate-800">{m.name}</span> },
                    { key: 'p', header: '%', align: 'right', render: (m) => `${m.pct}%` },
                    { key: 'a', header: 'Amount', align: 'right', render: (m) => idrShort((c.value * m.pct) / 100) },
                    { key: 'd', header: 'Due', render: (m) => (m.due.startsWith('20') ? date(m.due) : m.due) },
                    { key: 's', header: 'Status', render: (m) => <StatusBadge status={m.status} /> },
                  ]}
                  footer={<tr><td className="px-3 py-2">Total</td><td className="num px-3 py-2 text-right">{x.milestones.reduce((s, m) => s + m.pct, 0)}%</td><td className="num px-3 py-2 text-right">{idrShort(c.value)}</td><td colSpan={2} /></tr>}
                />
                <div className="p-3 text-xs text-slate-500">Retention release condition: {x.retentionRelease}.</div>
              </Card>
            )}

            {tab === 'projects' && (
              <Card padded={false}>
                <div className="p-4 pb-2"><CardHeader title="Linked project code(s)" subtitle="Issued from this contract. P/L updates as costs and revenue post against the code." /></div>
                <DataTable
                  rows={linked}
                  rowKey={(p) => p.code}
                  columns={[
                    { key: 'c', header: 'Project code', render: (p) => <ProjectCodeChip code={p.code} showName /> },
                    { key: 's', header: 'Status', render: (p) => <StatusBadge status={pending && p.code === c.projectCode ? 'Reserved' : issuedNow && p.status === 'Planning' ? 'Active' : p.status} /> },
                    { key: 'rev', header: 'Revenue', align: 'right', render: (p) => idrShort(p.revenue) },
                    { key: 'act', header: 'Actual cost', align: 'right', render: (p) => idrShort(p.actual) },
                    { key: 'com', header: 'Committed', align: 'right', render: (p) => idrShort(p.committed) },
                    { key: 'rab', header: 'RAB', align: 'right', render: (p) => idrShort(p.rab) },
                    { key: 'rem', header: 'Remaining', align: 'right', render: (p) => idrShort(remainingBudget(p)) },
                    { key: 'm', header: 'Margin', align: 'right', render: (p) => (p.revenue ? <span className={runningMargin(p) >= 15 ? 'text-emerald-700' : 'text-amber-700'}>{pct(runningMargin(p))}</span> : '—') },
                    { key: 'pr', header: 'Progress', render: (p) => <div className="w-20"><Progress value={p.progress} /><div className="mt-0.5 text-[11px] text-slate-500">{p.progress}%</div></div> },
                  ]}
                />
              </Card>
            )}

            {tab === 'corr' && (
              <Card padded={false}>
                {corr.length === 0 ? <EmptyState title="No correspondence bound to this contract" /> : (
                  <DataTable
                    rows={corr}
                    rowKey={(k) => k.id}
                    columns={[
                      { key: 'd', header: 'Date', render: (k) => date(k.date) },
                      { key: 't', header: 'Type', render: (k) => <Badge>{k.kind}</Badge> },
                      { key: 's', header: 'Subject', render: (k) => <div className="min-w-[240px]"><div className="font-medium">{k.subject}</div><div className="text-xs text-slate-500">{k.summary}</div></div> },
                      { key: 'r', header: 'Reference', render: (k) => <span className="font-mono text-[11px]">{k.ref}</span> },
                    ]}
                  />
                )}
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {x?.approvals && (
            <Card>
              <CardHeader title="Approval trail" subtitle="Approval → contract active → project code issued" />
              <Timeline
                items={x.approvals.map((a, i) => {
                  const last = i === x.approvals!.length - 1
                  const done = a.status === 'Approved' || (last && !pending)
                  return {
                    time: done ? (a.at ? dateTime(a.at) : dateTime(state.codeIssuedAt ?? `${TODAY_ISO}T09:14`)) : 'Awaiting',
                    title: a.step,
                    body: `${getEmployee(a.by)?.name} · ${done ? 'Approved' : 'Pending'}`,
                    tone: done ? 'green' : 'amber',
                  }
                })}
              />
              {!pending && <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800 ring-1 ring-emerald-200"><CheckCircle2 size={14} /> Project code {c.projectCode} issued automatically</div>}
            </Card>
          )}
          <Card>
            <CardHeader title="Contract summary" />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Versions</dt><dd>{x?.versions.length ?? 1}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Rate lines (all periods)</dt><dd>{c.rateCard.length}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Retention held</dt><dd className="num">{idrShort((c.value * c.retentionPct) / 100)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Linked project codes</dt><dd>{linked.length}</dd></div>
            </dl>
          </Card>
          <Card>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-800"><FileSignature size={15} /> Documents</div>
            <ul className="mt-2 space-y-1.5 text-xs text-brand-700">
              {(x?.versions ?? []).map((v) => <li key={v.version}>{c.id}_v{v.version}_{v.label.replace(/\s+/g, '')}.pdf</li>)}
              {x?.guarantees.map((g) => <li key={g.number}>{g.kind.split(' (')[0]}_{g.number.replace(/\//g, '-')}.pdf</li>)}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
