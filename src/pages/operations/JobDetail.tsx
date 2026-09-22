import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, CloudOff, FileText, MapPin, RotateCcw, Send, ShieldCheck, Smartphone, XCircle } from 'lucide-react'
import { Badge, Button, Callout, Card, CardHeader, DataTable, DescList, EmptyState, Grid, Modal, PageHeader, ProjectCodeChip, Stat, StatusBadge, Stepper, Tabs, Timeline, cx, type Column, type Tone } from '@/components/ui'
import { getCustomer, getProject, getUnit } from '@/data/core'
import { allocations, certState, chargeAmount, fuelEntries, getPerson, jobCharges, jobCheckins, jobDocuments, jobHoldIssues, jobMeta, licenceState, pendingTimesheets, personName, timesheets, type JobCharge, type JobDoc, type TimesheetEntry } from '@/data/operations'
import { date, dateTime, idr, idrShort, num } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { LIFECYCLE, updateJob, useJobs, type JobState } from './store'
import { contractFor, jobValue, OPS_MODULE, Person, UnitLink } from './shared'
import NotFound from '@/pages/NotFound'

const FUEL_PRICE = 13_700 // HSD industrial, IDR/L (PO-2028-0195)
const hourlyCost = (id: string) => (allocations.find((a) => a.employeeId === id)?.monthlyCost ?? 9_000_000) / 173

type TabKey = 'resources' | 'charges' | 'pod' | 'checkins' | 'field'

export default function JobDetail() {
  const { id } = useParams()
  const jobs = useJobs()
  const toast = useToast()
  const job = jobs.find((j) => j.id === id)
  const [tab, setTab] = useState<TabKey>('resources')
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [note, setNote] = useState('')
  if (!job) return <NotFound />

  const meta = jobMeta(job)
  const project = getProject(job.projectCode)
  const contract = contractFor(job.projectCode)
  const customer = getCustomer(project?.customerId)
  const charges = jobCharges.filter((c) => c.jobId === job.id)
  const docs = jobDocuments(job)
  const checkins = jobCheckins(job)
  const ts = timesheets.filter((t) => t.jobId === job.id)
  const fuel = fuelEntries.filter((f) => f.jobId === job.id && f.status !== 'Duplicate — merged')
  const issues = job.status === 'Completed' ? jobHoldIssues(job) : []
  const tsPending = pendingTimesheets(job.id).length

  // Cost & revenue that flow on verification
  const labour = ts.reduce((a, t) => a + t.hours * hourlyCost(t.employeeId) * (t.category === 'Overtime' ? 1.5 : 1), 0)
  const fuelCost = fuel.reduce((a, f) => a + f.litres * FUEL_PRICE, 0)
  const chargeCost = charges.reduce((a, c) => a + chargeAmount(c), 0)
  const rechargeable = charges.filter((c) => c.rechargeable).reduce((a, c) => a + chargeAmount(c), 0)
  const revenue = jobValue(job) + rechargeable
  const verifiedLike = job.status === 'Verified' || job.status === 'Billed'

  const checks: { label: string; ok: boolean }[] = [
    { label: `POD complete (${docs.filter((d) => d.kind !== 'Lift plan').length} documents incl. signature)`, ok: docs.some((d) => d.kind === 'Signature') && !issues.some((i) => /sign-off|signature|POD|delivery note/i.test(i)) },
    { label: 'Geofence arrival & departure stamps present', ok: checkins.length >= 4 },
    { label: 'Quantity reconciled with weighbridge / client measure', ok: !issues.some((i) => /tonnage|weighbridge/i.test(i)) },
    { label: `Timesheets approved by field supervisor (${ts.length - tsPending}/${ts.length})`, ok: tsPending === 0 && !issues.some((i) => /timesheet/i.test(i)) },
    { label: 'Charges outside base rate carry receipts where required', ok: !issues.some((i) => /receipt/i.test(i)) },
  ]

  const doVerify = () => {
    updateJob(job.id, { status: 'Verified', verifiedAt: '2028-03-10T09:12', verifiedBy: 'EMP-0007' })
    setVerifyOpen(false)
    toast(`${job.id} verified — ${idrShort(labour + fuelCost + chargeCost)} cost posted to ${job.projectCode}; ${idrShort(revenue)} now billable`, 'success')
  }

  const actions = (
    <>
      {job.status === 'Draft' && (
        <Link to="/ops/planning">
          <Button variant="primary">Assign on planning board</Button>
        </Link>
      )}
      {job.status === 'Planned' && (
        <Button variant="primary" icon={<Send size={15} />} onClick={() => { updateJob(job.id, { status: 'Dispatched' }); toast(`Dispatched to ${job.crewIds.map(personName).join(', ') || 'crew'} via mobile app — awaiting acknowledgement`, 'info') }}>
          Dispatch to mobile
        </Button>
      )}
      {job.status === 'Completed' && (
        <>
          <Button icon={<RotateCcw size={15} />} onClick={() => { updateJob(job.id, { status: 'In Progress' }); toast(`${job.id} returned to field for correction`, 'warning') }}>
            Return to field
          </Button>
          <Button variant="success" icon={<ShieldCheck size={15} />} onClick={() => setVerifyOpen(true)}>
            Verify
          </Button>
        </>
      )}
      {job.status === 'Verified' && (
        <Link to="/finance/billing">
          <Button variant="primary" icon={<ArrowRight size={15} />}>
            Open in Billing
          </Button>
        </Link>
      )}
    </>
  )

  return (
    <>
      <PageHeader
        module={OPS_MODULE}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {job.title} <StatusBadge status={job.status} />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{job.id}</span>·<ProjectCodeChip code={job.projectCode} showName />
          </span>
        }
        crumbs={[{ label: 'Operations' }, { label: 'Job Orders', to: '/ops/jobs' }, { label: job.id }]}
        actions={actions}
      />

      <Card className="mb-4">
        <Stepper steps={LIFECYCLE} current={job.status} />
        <div className="mt-4">
          <DescList
            cols={4}
            items={[
              { label: 'Customer', value: customer?.name ?? '—' },
              { label: 'Contract', value: contract ? <Link className="font-mono text-brand-700 hover:underline" to={`/contracts/${contract.id}`}>{contract.id} v{contract.version}</Link> : '—' },
              { label: 'Date / shift', value: `${date(job.date)}${job.endDate || meta.endDate ? ` – ${date((job.endDate ?? meta.endDate)!)}` : ''} · ${meta.shift}` },
              { label: 'Route', value: `${job.origin} → ${job.destination}` },
              { label: 'Rate (from rate card)', value: job.rate ? `${idr(job.rate)} ${job.basis}` : 'Lump sum — milestone billing' },
              { label: 'Quantity', value: `${num(job.qty)} ${job.basis.replace('per ', '')}` },
              { label: 'Base value', value: job.rate ? idr(jobValue(job)) : 'Milestone' },
              { label: 'Field supervisor', value: personName(meta.supervisorId) },
              { label: 'Dispatched', value: meta.dispatchedAt ? dateTime(meta.dispatchedAt) : '—' },
              { label: 'Acknowledged on mobile', value: meta.acknowledgedAt ? dateTime(meta.acknowledgedAt) : '—' },
              { label: 'Recurring', value: job.recurring ? 'Generated from contract schedule' : 'Ad hoc' },
              { label: 'Verified', value: job.verifiedAt ? `${dateTime(job.verifiedAt)} · ${personName(job.verifiedBy)}` : verifiedLike ? 'Yes (ops admin)' : 'Not yet' },
            ]}
          />
        </div>
      </Card>

      {job.status === 'Completed' && (
        <Card className="mb-4 border-amber-300 ring-1 ring-amber-200">
          <CardHeader title="Verification gate" subtitle="Driver declared this job completed. Ops admin validates field data before cost and billing flow downstream." />
          <div className="grid gap-4 lg:grid-cols-2">
            <ul className="space-y-1.5 text-sm">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2">
                  {c.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />}
                  <span className={c.ok ? 'text-slate-700' : 'text-slate-900'}>{c.label}</span>
                </li>
              ))}
            </ul>
            {issues.length ? (
              <Callout tone="amber" title="Held — issues to resolve" icon={<AlertTriangle size={16} />}>
                <ul className="list-disc pl-4">
                  {issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </Callout>
            ) : (
              <Callout tone="green" title="All checks passed" icon={<CheckCircle2 size={16} />}>
                Ready to verify. Cost will post to {job.projectCode} and the job becomes billable.
              </Callout>
            )}
          </div>
        </Card>
      )}

      {verifiedLike && (
        <Card className="mb-4 border-emerald-300 ring-1 ring-emerald-200">
          <CardHeader title="Verified — cost & revenue flowed downstream" subtitle="Posted automatically on verification, each line carrying the job's project code." />
          <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
            <FlowBox title="Job verified" value={job.verifiedAt ? dateTime(job.verifiedAt) : date(job.date)} tone="green" />
            <ArrowRight className="hidden shrink-0 text-slate-300 lg:block" />
            <FlowBox title={`Cost to project costing (M7)`} value={idr(labour + fuelCost + chargeCost)} sub={`Labour ${idrShort(labour)} · Fuel ${idrShort(fuelCost)} · Charges ${idrShort(chargeCost)}`} to={`/projects/${job.projectCode}`} />
            <ArrowRight className="hidden shrink-0 text-slate-300 lg:block" />
            <FlowBox title={job.status === 'Billed' ? 'Billed (Surat Konversi)' : 'Billable → Billing & Surat Konversi'} value={job.rate ? idr(revenue) : 'Milestone'} sub={rechargeable ? `incl. ${idrShort(rechargeable)} rechargeable charges` : 'Base rate only'} to="/finance/billing" tone={job.status === 'Billed' ? 'violet' : 'amber'} />
          </div>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <Tabs<TabKey>
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'resources', label: 'Units & crew', count: job.unitIds.length + job.crewIds.length },
              { key: 'charges', label: 'Cost & charges', count: charges.length },
              { key: 'pod', label: 'POD & documents', count: docs.length },
              { key: 'checkins', label: 'Field check-ins', count: checkins.length },
              { key: 'field', label: 'Timesheets & fuel', count: ts.length + fuel.length },
            ]}
          />
          {tab === 'resources' && <Resources job={job} />}
          {tab === 'charges' && <Charges job={job} charges={charges} />}
          {tab === 'pod' && <Documents docs={docs} />}
          {tab === 'checkins' && <Checkins job={job} />}
          {tab === 'field' && <FieldData ts={ts} fuelCost={fuelCost} jobId={job.id} />}
        </div>
        <Card>
          <CardHeader title="Activity" />
          <Timeline
            items={[
              ...(job.verifiedAt ? [{ time: dateTime(job.verifiedAt), title: 'Verified by ops admin', body: `${personName(job.verifiedBy)} — cost posted to ${job.projectCode}`, tone: 'green' as Tone }] : []),
              ...(verifiedLike && !job.verifiedAt ? [{ time: `${date(job.date)}`, title: 'Verified by ops admin', body: 'Siti Nurhaliza', tone: 'green' as Tone }] : []),
              ...(job.status === 'Billed' ? [{ time: 'Billing run', title: 'Included in Surat Konversi', tone: 'violet' as Tone }] : []),
              ...checkins
                .slice()
                .reverse()
                .map((c) => ({ time: dateTime(c.time), title: c.stage, body: `${c.geofence} · ${c.source}`, tone: 'blue' as Tone })),
              ...(meta.acknowledgedAt ? [{ time: dateTime(meta.acknowledgedAt), title: 'Assignment acknowledged on mobile', body: job.crewIds.map(personName).join(', '), tone: 'sky' as Tone }] : []),
              ...(meta.dispatchedAt ? [{ time: dateTime(meta.dispatchedAt), title: 'Dispatched to driver app', body: 'Push notification sent', tone: 'sky' as Tone }] : []),
              { time: date(job.date), title: job.recurring ? 'Generated from contract schedule' : 'Job order created', body: `Project code ${job.projectCode} · rate from ${contract?.id ?? 'contract'}`, tone: 'slate' },
            ]}
          />
        </Card>
      </div>

      <Modal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        title={`Verify ${job.id}`}
        footer={
          <>
            <Button onClick={() => setVerifyOpen(false)}>Cancel</Button>
            <Button variant="success" icon={<ShieldCheck size={15} />} disabled={issues.length > 0 && note.trim().length < 10} onClick={doVerify}>
              {issues.length ? 'Verify with override' : 'Verify'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">On verification the following posts to project costing and the job becomes billable:</p>
          <div className="rounded-lg border border-slate-200">
            {[
              ['Labour (verified timesheets)', labour],
              ['Fuel (' + num(fuel.reduce((a, f) => a + f.litres, 0)) + ' L)', fuelCost],
              ['Charges outside base rate', chargeCost],
            ].map(([l, v]) => (
              <div key={l as string} className="flex justify-between border-b border-slate-100 px-3 py-1.5 last:border-0">
                <span className="text-slate-600">{l}</span>
                <span className="num font-medium">{idr(v as number)}</span>
              </div>
            ))}
            <div className="flex justify-between bg-slate-50 px-3 py-1.5 font-semibold">
              <span>Billable revenue</span>
              <span className="num">{job.rate ? idr(revenue) : 'Milestone'}</span>
            </div>
          </div>
          {issues.length > 0 && (
            <>
              <Callout tone="amber" title={`${issues.length} open issue(s)`}>
                Verifying with open issues requires a justification, recorded in the audit trail.
              </Callout>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Justification (min. 10 characters)…" className="w-full rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-brand-500" />
            </>
          )}
        </div>
      </Modal>
    </>
  )
}

function FlowBox({ title, value, sub, to, tone = 'slate' }: { title: string; value: string; sub?: string; to?: string; tone?: 'green' | 'amber' | 'violet' | 'slate' }) {
  const body = (
    <div
      className={cx(
        'flex-1 rounded-lg border p-3',
        { green: 'border-emerald-200 bg-emerald-50', amber: 'border-amber-200 bg-amber-50', violet: 'border-violet-200 bg-violet-50', slate: 'border-slate-200 bg-slate-50' }[tone],
        to && 'transition hover:shadow',
      )}
    >
      <div className="text-xs text-slate-500">{title}</div>
      <div className="num mt-0.5 font-semibold text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  )
  return to ? (
    <Link to={to} className="flex-1">
      {body}
    </Link>
  ) : (
    body
  )
}

function Resources({ job }: { job: JobState }) {
  return (
    <Grid cols={2}>
      <Card padded={false}>
        <div className="px-4 pt-4">
          <CardHeader title="Units" subtitle="Availability read from M15 maintenance & certification registry" />
        </div>
        {job.unitIds.length === 0 ? (
          <EmptyState title="No units assigned" body="Assign units on the planning board." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {job.unitIds.map((uid) => {
              const u = getUnit(uid)
              if (!u) return null
              const cs = certState(u)
              return (
                <li key={uid} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <UnitLink id={uid} className="font-semibold" />
                    <div className="truncate text-xs text-slate-500">
                      {u.type} · {u.make} {u.plate ? `· ${u.plate}` : ''}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={u.status} />
                    <Badge tone={cs === 'Valid' ? 'green' : cs === 'Expiring' ? 'amber' : 'red'}>
                      {u.cert.number.split('/')[0]} {cs === 'Valid' ? 'valid' : cs === 'Expiring' ? 'expiring ' + date(u.cert.expiry) : 'expired'}
                    </Badge>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      <Card padded={false}>
        <div className="px-4 pt-4">
          <CardHeader title="Crew" subtitle="Operator licence (SIO / SIM) checked at assignment" />
        </div>
        {job.crewIds.length === 0 ? (
          <EmptyState title="No crew assigned" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {job.crewIds.map((cid) => {
              const e = getPerson(cid)
              const ls = licenceState(e)
              return (
                <li key={cid} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <Person id={cid} />
                  {e?.licence && (
                    <Badge tone={ls === 'Valid' ? 'green' : ls === 'Expiring' ? 'amber' : 'red'}>
                      {e.licence.kind} {ls === 'Expired' ? 'expired ' + date(e.licence.expiry) : ls === 'Expiring' ? 'exp. ' + date(e.licence.expiry) : 'valid'}
                    </Badge>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {job.crewIds.some((c) => licenceState(getPerson(c)) === 'Expired') && (
          <div className="p-3">
            <Callout tone="red" icon={<AlertTriangle size={16} />} title="Crew member with expired licence">
              Assigned before the licence lapsed. The planning board now blocks new assignments until the renewal is recorded in the licence registry.
            </Callout>
          </div>
        )}
      </Card>
    </Grid>
  )
}

function Charges({ job, charges }: { job: JobState; charges: JobCharge[] }) {
  const cols: Column<JobCharge>[] = [
    { key: 'id', header: 'Charge', render: (c) => <span className="font-mono text-[12px]">{c.id}</span> },
    { key: 'type', header: 'Type', render: (c) => <Badge tone={c.type === 'Standby' || c.type === 'Demurrage' ? 'violet' : c.type === 'Overtime' ? 'amber' : 'slate'}>{c.type}</Badge> },
    { key: 'desc', header: 'Description', render: (c) => <span className="text-slate-700">{c.description}</span> },
    { key: 'pc', header: 'Project code', render: () => <ProjectCodeChip code={job.projectCode} /> },
    { key: 'qty', header: 'Qty', align: 'right', render: (c) => num(c.qty, c.qty % 1 ? 1 : 0) },
    { key: 'amt', header: 'Amount', align: 'right', render: (c) => idr(chargeAmount(c)) },
    { key: 'bill', header: 'Rechargeable', render: (c) => (c.rechargeable ? <Badge tone="green">To client</Badge> : <span className="text-xs text-slate-400">Internal</span>) },
    { key: 'src', header: 'Source', render: (c) => <span className="text-xs text-slate-500">{c.source}{c.receipt ? ' · receipt' : ''}</span> },
  ]
  const total = charges.reduce((a, c) => a + chargeAmount(c), 0)
  return (
    <Card padded={false}>
      <div className="px-4 pt-4">
        <CardHeader title="Costs & charges outside the base rate" subtitle="Tolls, parking, overtime, standby, demurrage — every charge inherits the project code of its parent job (OPS-07)." />
      </div>
      <DataTable
        columns={cols}
        rows={charges}
        rowKey={(c) => c.id}
        empty="No charges recorded for this job"
        footer={
          charges.length ? (
            <tr>
              <td colSpan={5} className="px-3 py-2 text-right text-xs">Total</td>
              <td className="num px-3 py-2 text-right">{idr(total)}</td>
              <td colSpan={2} className="px-3 py-2 text-xs text-slate-500">{idr(charges.filter((c) => c.rechargeable).reduce((a, c) => a + chargeAmount(c), 0))} rechargeable</td>
            </tr>
          ) : undefined
        }
      />
    </Card>
  )
}

function Thumb({ kind }: { kind: JobDoc['kind'] }) {
  if (kind === 'Signature')
    return (
      <svg viewBox="0 0 160 100" className="h-full w-full bg-white">
        <line x1="15" y1="78" x2="145" y2="78" stroke="#cbd5e1" strokeWidth="1" />
        <path d="M22 70 C 35 30, 45 30, 48 62 S 62 80, 70 50 S 88 28, 92 60 C 95 75, 108 40, 118 56 S 135 66, 142 48" fill="none" stroke="#1e3a8a" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  if (kind === 'Cargo photo')
    return (
      <svg viewBox="0 0 160 100" className="h-full w-full">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#bae6fd" />
            <stop offset="1" stopColor="#e0f2fe" />
          </linearGradient>
        </defs>
        <rect width="160" height="100" fill="url(#sky)" />
        <path d="M0 70 Q 40 58 80 66 T 160 62 V100 H0Z" fill="#a16207" opacity="0.55" />
        <rect x="40" y="46" width="62" height="22" rx="2" fill="#f59e0b" />
        <path d="M44 46 L58 34 L96 36 L100 46Z" fill="#1f2937" opacity="0.85" />
        <rect x="102" y="50" width="20" height="18" rx="2" fill="#fbbf24" />
        <rect x="106" y="53" width="10" height="7" fill="#bae6fd" />
        <circle cx="54" cy="72" r="6" fill="#1f2937" />
        <circle cx="90" cy="72" r="6" fill="#1f2937" />
        <circle cx="114" cy="72" r="6" fill="#1f2937" />
      </svg>
    )
  return (
    <svg viewBox="0 0 160 100" className="h-full w-full bg-slate-50">
      <rect x="44" y="8" width="72" height="86" rx="3" fill="#fff" stroke="#cbd5e1" />
      <rect x="52" y="16" width="30" height="5" fill="#f59e0b" />
      {[30, 38, 46, 54, 62, 70].map((y) => (
        <rect key={y} x="52" y={y} width={y % 16 ? 56 : 42} height="3" fill="#cbd5e1" />
      ))}
      <path d="M84 82 c6 -8 10 4 16 -4" stroke="#1e3a8a" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

function Documents({ docs }: { docs: JobDoc[] }) {
  if (!docs.length) return <Card><EmptyState title="No POD yet" body="Photos, delivery note and receiver signature are captured on the driver app at unloading — offline if needed." /></Card>
  return (
    <Card>
      <CardHeader title="Proof of delivery & documents" subtitle="Bound to the job order and traceable from the invoice. Items captured offline are held on the device and synchronised when connectivity returns (OPS-08/09)." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {docs.map((d) => (
          <div key={d.id} className="overflow-hidden rounded-lg border border-slate-200">
            <div className="relative aspect-[16/10] overflow-hidden">
              <Thumb kind={d.kind} />
              {d.offline && (
                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-slate-900/75 px-1.5 py-0.5 text-[10px] text-white">
                  <CloudOff size={10} /> offline
                </span>
              )}
            </div>
            <div className="p-2">
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                {d.kind === 'Delivery note' || d.kind === 'Lift plan' || d.kind === 'Weighbridge ticket' ? <FileText size={11} /> : <Smartphone size={11} />}
                {d.kind}
              </div>
              <div className="truncate text-xs text-slate-800" title={d.name}>
                {d.name}
              </div>
              <div className="mt-1 text-[10px] leading-tight text-slate-500">
                Captured {dateTime(d.capturedAt)}
                <br />
                Synced {dateTime(d.syncedAt)} · {personName(d.by)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Checkins({ job }: { job: JobState }) {
  const list = jobCheckins(job)
  if (!list.length) return <Card><EmptyState title="No field check-ins yet" body="Check-ins are stamped automatically when the unit enters or exits the client site geofence." /></Card>
  const stages = ['Loading check-in', 'Depart', 'Unloading check-in', 'POD captured']
  return (
    <Card>
      <CardHeader title="Field execution timeline" subtitle="Loading → depart → unloading → POD, with GPS geofence timestamps (OPS-18)" />
      <ol className="grid gap-3 sm:grid-cols-4">
        {stages.map((s, i) => {
          const c = list.find((x) => x.stage === s)
          return (
            <li key={s} className={cx('rounded-lg border p-3', c ? 'border-emerald-200 bg-emerald-50/50' : 'border-dashed border-slate-300 bg-slate-50')}>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <span className={cx('flex h-5 w-5 items-center justify-center rounded-full text-[10px]', c ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500')}>{i + 1}</span>
                {s}
              </div>
              {c ? (
                <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                  <div className="num font-medium text-slate-900">{dateTime(c.time)}</div>
                  <div className="flex items-center gap-1">
                    <MapPin size={11} /> {c.geofence}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">{c.coords}</div>
                  <Badge tone={c.source === 'GPS geofence' ? 'blue' : 'slate'}>{c.source}</Badge>
                </div>
              ) : (
                <div className="mt-2 text-xs text-slate-400">Pending</div>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

function FieldData({ ts, fuelCost, jobId }: { ts: TimesheetEntry[]; fuelCost: number; jobId: string }) {
  const fuel = fuelEntries.filter((f) => f.jobId === jobId)
  const tsCols: Column<TimesheetEntry>[] = [
    { key: 'd', header: 'Date', render: (t) => date(t.date) },
    { key: 'p', header: 'Person', render: (t) => personName(t.employeeId) },
    { key: 'c', header: 'Category', render: (t) => t.category },
    { key: 'h', header: 'Hours', align: 'right', render: (t) => num(t.hours, t.hours % 1 ? 1 : 0) },
    { key: 'ch', header: 'Channel', render: (t) => <span className="text-xs text-slate-500">{t.channel}</span> },
    { key: 's', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
  ]
  return (
    <div className="space-y-4">
      <Grid cols={3}>
        <Stat label="Timesheet hours" value={num(ts.reduce((a, t) => a + t.hours, 0), 1)} sub={`${ts.filter((t) => t.status === 'Approved').length}/${ts.length} fully approved`} to="/timesheets" />
        <Stat label="Fuel issued" value={`${num(fuel.filter((f) => f.status !== 'Duplicate — merged').reduce((a, f) => a + f.litres, 0))} L`} sub={idr(fuelCost)} to="/fleet/fuel" />
        <Stat label="Entries from mobile app" value={ts.filter((t) => t.channel === 'Mobile').length + fuel.filter((f) => f.channel === 'Manual').length} sub="Synced from driver app queue" />
      </Grid>
      <Card padded={false}>
        <div className="px-4 pt-4">
          <CardHeader title="Timesheets" />
        </div>
        <DataTable dense columns={tsCols} rows={ts} rowKey={(t) => t.id} empty="No timesheets linked to this job" />
      </Card>
      <Card padded={false}>
        <div className="px-4 pt-4">
          <CardHeader title="Fuel entries" subtitle="Duplicates across channels are merged automatically" />
        </div>
        <DataTable
          dense
          columns={[
            { key: 't', header: 'Time', render: (f) => dateTime(f.time) },
            { key: 'u', header: 'Unit', render: (f) => <UnitLink id={f.unitId} /> },
            { key: 'c', header: 'Channel', render: (f) => f.channel },
            { key: 'l', header: 'Litres', align: 'right', render: (f) => num(f.litres, 1) },
            { key: 's', header: 'Status', render: (f) => <Badge tone={f.status === 'Accepted' ? 'green' : f.status === 'Pending review' ? 'amber' : 'slate'}>{f.status}</Badge> },
          ]}
          rows={fuel}
          rowKey={(f) => f.id}
          empty="No fuel entries linked to this job"
        />
      </Card>
    </div>
  )
}
