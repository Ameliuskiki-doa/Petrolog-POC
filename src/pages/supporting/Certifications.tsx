import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Ban, BellRing, FileArchive, FileText, ShieldCheck, Upload, UserCheck, Truck, CheckCircle2, XCircle, Mail, Smartphone, MessageSquare } from 'lucide-react'
import {
  Badge, Button, Callout, Card, CardHeader, DataTable, DescList, Drawer, FormField, Grid, Input, Mono, PageHeader, ProjectCodeChip, SearchInput, Select, Stat, Tabs, cx,
  type Column,
} from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, daysUntil } from '@/lib/format'
import { contracts, employees, getContract, getCustomer, getEmployee, getUnit, jobs, projects, units } from '@/data/core'
import { certTier, equipmentCerts, operatorCerts, tierTone, type CertTier, type EquipmentCert, type OperatorCert } from '@/data/supporting'
import { DaysLeft, Person, TierBadge, UnitLink } from './shared'

type TabKey = 'equipment' | 'operators' | 'blocking' | 'alerts' | 'audit'
const TIERS: CertTier[] = ['Expired', '≤ 30 days', '≤ 60 days', '≤ 90 days', 'Valid']

export default function Certifications() {
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('equipment')
  const [eq, setEq] = useState<EquipmentCert[]>(equipmentCerts)
  const [ops, setOps] = useState<OperatorCert[]>(operatorCerts)
  const [tierFilter, setTierFilter] = useState<CertTier | 'All'>('All')
  const [q, setQ] = useState('')
  const [selEq, setSelEq] = useState<EquipmentCert | null>(null)
  const [selOp, setSelOp] = useState<OperatorCert | null>(null)

  const eqCount = (t: CertTier) => eq.filter((c) => certTier(c.expiry) === t).length
  const opCount = (t: CertTier) => ops.filter((c) => c.class === 'Licence' && certTier(c.expiry) === t).length
  const expiredUnits = eq.filter((c) => daysUntil(c.expiry) < 0)
  const expiredOps = ops.filter((c) => c.class === 'Licence' && daysUntil(c.expiry) < 0)

  const eqRows = eq
    .filter((c) => tierFilter === 'All' || certTier(c.expiry) === tierFilter)
    .filter((c) => !q || `${c.unitId} ${c.number} ${getUnit(c.unitId)?.type}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.expiry.localeCompare(b.expiry))
  const opRows = ops
    .filter((c) => tierFilter === 'All' || certTier(c.expiry) === tierFilter)
    .filter((c) => !q || `${getEmployee(c.empId)?.name} ${c.kind} ${c.number}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.expiry.localeCompare(b.expiry))

  const renewEq = (c: EquipmentCert, number: string, expiry: string) => {
    setEq((l) => l.map((x) => (x.unitId === c.unitId ? { ...x, number, issued: '2028-03-10', expiry, renewal: undefined } : x)))
    setSelEq(null)
    toast(`${c.unitId}: certificate ${number} uploaded — unit unblocked for assignment`, 'success')
  }
  const renewOp = (c: OperatorCert, number: string, expiry: string) => {
    setOps((l) => l.map((x) => (x.id === c.id ? { ...x, number, issued: '2028-03-10', expiry } : x)))
    setSelOp(null)
    toast(`${getEmployee(c.empId)?.name}: ${c.kind} renewed — operator unblocked`, 'success')
  }

  const eqCols: Column<EquipmentCert>[] = [
    { key: 'u', header: 'Unit', render: (c) => <UnitLink id={c.unitId} showType /> },
    { key: 'k', header: 'Certificate', render: (c) => <div><Badge tone={c.kind.startsWith('SILO') ? 'violet' : 'sky'}>{c.kind.split(' ')[0]}</Badge><div className="mt-0.5 font-mono text-[11px] text-slate-500">{c.number}</div></div> },
    { key: 'is', header: 'Issuer', render: (c) => <span className="block max-w-[220px] truncate text-xs text-slate-600" title={c.issuer}>{c.issuer}</span> },
    { key: 'i', header: 'Issued', render: (c) => date(c.issued) },
    { key: 'e', header: 'Expiry', render: (c) => <span className="font-medium">{date(c.expiry)}</span> },
    { key: 'd', header: 'Days left', align: 'right', render: (c) => <DaysLeft expiry={c.expiry} /> },
    { key: 't', header: 'Alert tier', render: (c) => <TierBadge expiry={c.expiry} /> },
    { key: 'docs', header: 'Docs', align: 'center', render: (c) => <span className="inline-flex items-center gap-1 text-xs text-slate-500"><FileText size={13} />{c.documents.length}</span> },
    { key: 'a', header: 'Assignment', render: (c) => (daysUntil(c.expiry) < 0 ? <Badge tone="red" dot>Blocked</Badge> : <Badge tone="green" dot>Allowed</Badge>) },
    { key: 'r', header: 'Renewal', render: (c) => c.renewal ? <Link onClick={(e) => e.stopPropagation()} to={`/maintenance/work-orders/${c.renewal.slice(0, 12)}`} className="text-xs text-brand-700 hover:underline">{c.renewal}</Link> : <span className="text-xs text-slate-300">—</span> },
  ]

  const opCols: Column<OperatorCert>[] = [
    { key: 'e', header: 'Person', render: (c) => <Person id={c.empId} sub /> },
    { key: 'k', header: 'Licence / competency', render: (c) => <div><div className="text-sm">{c.kind}</div><div className="font-mono text-[11px] text-slate-500">{c.number}</div></div> },
    { key: 'c', header: 'Class', render: (c) => <Badge tone={c.class === 'Licence' ? 'violet' : 'slate'}>{c.class}</Badge> },
    { key: 'is', header: 'Issuer', render: (c) => <span className="text-xs text-slate-600">{c.issuer}</span> },
    { key: 'x', header: 'Expiry', render: (c) => <span className="font-medium">{date(c.expiry)}</span> },
    { key: 'd', header: 'Days left', align: 'right', render: (c) => <DaysLeft expiry={c.expiry} /> },
    { key: 't', header: 'Alert tier', render: (c) => <TierBadge expiry={c.expiry} /> },
    { key: 'a', header: 'Assignment', render: (c) => (daysUntil(c.expiry) < 0 ? <Badge tone={c.class === 'Licence' ? 'red' : 'orange'} dot>{c.class === 'Licence' ? 'Blocked' : 'Restricted'}</Badge> : <Badge tone="green" dot>Allowed</Badge>) },
  ]

  return (
    <>
      <PageHeader
        module="M15 + M16 · Equipment & Operator Certification · Stage 1A"
        title="Certifications"
        subtitle="Statutory inspection certificates per unit (SILO / Riksa Uji for lifting plant, KIR for road vehicles) and operator licences & competencies per person. Lapsed certification blocks assignment at planning — not at audit (proposal §2.5.5)."
        actions={<Button variant="primary" icon={<FileArchive size={15} />} onClick={() => setTab('audit')}>Client audit pack</Button>}
      />

      <Grid cols={4} className="mb-4">
        <Stat label="Units blocked (expired)" value={expiredUnits.length} sub={expiredUnits.map((c) => c.unitId).join(', ') || 'None'} tone={expiredUnits.length ? 'bad' : 'good'} icon={<Ban size={16} />} />
        <Stat label="Operators blocked (licence lapsed)" value={expiredOps.length} sub={expiredOps.map((c) => getEmployee(c.empId)?.name).join(', ') || 'None'} tone={expiredOps.length ? 'bad' : 'good'} icon={<UserCheck size={16} />} />
        <Stat label="Expiring ≤ 30 days" value={eqCount('≤ 30 days') + opCount('≤ 30 days')} sub={`${eqCount('≤ 30 days')} units · ${opCount('≤ 30 days')} operators — renewal WO raised`} tone="warn" icon={<BellRing size={16} />} />
        <Stat label="Registry coverage" value="100%" sub={`${eq.length} units · ${ops.length} person certificates`} tone="good" icon={<ShieldCheck size={16} />} />
      </Grid>

      <Card className="mb-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-900">Tiered expiry alerting</div>
          <div className="text-xs text-slate-500">Click a tier to filter · alerts at 90 / 60 / 30 days and on expiry</div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {TIERS.map((t) => {
            const n = eqCount(t) + ops.filter((c) => certTier(c.expiry) === t).length
            const active = tierFilter === t
            const colors = { red: 'border-red-200 bg-red-50 text-red-700', orange: 'border-orange-200 bg-orange-50 text-orange-700', amber: 'border-amber-200 bg-amber-50 text-amber-800', sky: 'border-sky-200 bg-sky-50 text-sky-700', green: 'border-emerald-200 bg-emerald-50 text-emerald-700' }[tierTone[t]]
            return (
              <button key={t} onClick={() => setTierFilter(active ? 'All' : t)} className={cx('rounded-lg border px-3 py-2 text-left transition', colors, active ? 'ring-2 ring-slate-900/70' : 'hover:shadow-sm')}>
                <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{t}</div>
                <div className="num text-2xl font-semibold">{n}</div>
                <div className="text-[11px] opacity-80">{eqCount(t)} units · {n - eqCount(t)} people</div>
              </button>
            )
          })}
        </div>
      </Card>

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'equipment', label: 'Equipment certificates', count: eq.length },
          { key: 'operators', label: 'Operator licences & competency', count: ops.length },
          { key: 'blocking', label: 'Assignment blocking' },
          { key: 'alerts', label: 'Alert rules' },
          { key: 'audit', label: 'Client audit pack' },
        ]}
      />

      {(tab === 'equipment' || tab === 'operators') && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder={tab === 'equipment' ? 'Search unit, certificate no…' : 'Search person, licence…'} className="w-full sm:w-72" />
            <Select value={tierFilter} onChange={(e) => setTierFilter(e.target.value as CertTier)}>
              <option value="All">All tiers</option>
              {TIERS.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </div>
          <Card padded={false}>
            {tab === 'equipment' ? (
              <DataTable columns={eqCols} rows={eqRows} rowKey={(c) => c.unitId} onRowClick={setSelEq} rowClassName={(c) => (daysUntil(c.expiry) < 0 ? 'bg-red-50/50' : undefined)} />
            ) : (
              <DataTable columns={opCols} rows={opRows} rowKey={(c) => c.id} onRowClick={setSelOp} rowClassName={(c) => (daysUntil(c.expiry) < 0 ? 'bg-red-50/50' : undefined)} />
            )}
          </Card>
        </>
      )}

      {tab === 'blocking' && <Blocking eq={eq} ops={ops} />}
      {tab === 'alerts' && <AlertRules />}
      {tab === 'audit' && <AuditPack eq={eq} ops={ops} />}

      <EqDrawer cert={selEq} onClose={() => setSelEq(null)} onRenew={renewEq} />
      <OpDrawer cert={selOp} onClose={() => setSelOp(null)} onRenew={renewOp} />
    </>
  )
}

// ─── Assignment blocking ─────────────────────────────────────────────────────

function Blocking({ eq, ops }: { eq: EquipmentCert[]; ops: OperatorCert[] }) {
  const toast = useToast()
  const [kind, setKind] = useState<'unit' | 'operator'>('unit')
  const [unitId, setUnitId] = useState('CR-050-01')
  const [empId, setEmpId] = useState('EMP-0016')
  const [jobDate, setJobDate] = useState('2028-03-13')
  const [result, setResult] = useState<null | { ok: boolean; msg: string }>(null)

  const openJobs = jobs.filter((j) => ['Draft', 'Planned', 'Dispatched', 'In Progress'].includes(j.status))
  const conflicts: { job: (typeof jobs)[number]; who: string; what: string; expiry: string; kind: 'unit' | 'operator' }[] = []
  openJobs.forEach((j) => {
    j.unitIds.forEach((u) => {
      const c = eq.find((x) => x.unitId === u)
      if (c && c.expiry < j.date) conflicts.push({ job: j, who: u, what: `${c.kind.split(' ')[0]} ${c.number}`, expiry: c.expiry, kind: 'unit' })
    })
    j.crewIds.forEach((e) => {
      const c = ops.find((x) => x.empId === e && x.class === 'Licence')
      if (c && c.expiry < j.date) conflicts.push({ job: j, who: getEmployee(e)?.name ?? e, what: `${c.kind} ${c.number}`, expiry: c.expiry, kind: 'operator' })
    })
  })
  const upcoming = [
    ...eq.filter((c) => daysUntil(c.expiry) >= 0 && daysUntil(c.expiry) <= 30).map((c) => ({ who: c.unitId, what: c.kind.split(' ')[0], expiry: c.expiry, link: `/fleet/units/${c.unitId}` })),
    ...ops.filter((c) => c.class === 'Licence' && daysUntil(c.expiry) >= 0 && daysUntil(c.expiry) <= 30).map((c) => ({ who: getEmployee(c.empId)?.name ?? '', what: c.kind, expiry: c.expiry, link: '' })),
  ]

  const check = () => {
    if (kind === 'unit') {
      const c = eq.find((x) => x.unitId === unitId)!
      const ok = c.expiry >= jobDate
      const msg = ok
        ? `${unitId} can be assigned on ${date(jobDate)} — ${c.kind.split(' ')[0]} valid until ${date(c.expiry)}.`
        : `${unitId} cannot be assigned on ${date(jobDate)}: ${c.kind.split(' ')[0]} ${c.number} expired ${date(c.expiry)}.`
      setResult({ ok, msg })
      toast(ok ? 'Assignment allowed' : `Assignment blocked — ${unitId} certificate expired`, ok ? 'success' : 'error')
    } else {
      const c = ops.find((x) => x.empId === empId && x.class === 'Licence')
      const name = getEmployee(empId)?.name
      const ok = !!c && c.expiry >= jobDate
      const msg = !c ? `${name} holds no operator licence — cannot be assigned as operator/driver.` : ok ? `${name} can be assigned on ${date(jobDate)} — ${c.kind} valid until ${date(c.expiry)}.` : `${name} cannot be assigned on ${date(jobDate)}: ${c.kind} ${c.number} expired ${date(c.expiry)}.`
      setResult({ ok, msg })
      toast(ok ? 'Assignment allowed' : `Assignment blocked — ${name} licence not valid`, ok ? 'success' : 'error')
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card padded={false}>
          <div className="p-4 pb-2">
            <CardHeader title="Conflicts on open jobs" subtitle="Existing assignments whose certification lapses before the job date — site leader notified to replace" />
          </div>
          <DataTable
            rows={conflicts}
            rowKey={(c) => c.job.id + c.who}
            empty="No conflicts — all assigned units and operators are certified"
            columns={[
              { key: 'j', header: 'Job', render: (c) => <div><Link to={`/ops/jobs/${c.job.id}`} className="font-mono text-[12px] text-brand-700 hover:underline">{c.job.id}</Link><div className="text-xs text-slate-500">{date(c.job.date)} · {c.job.status}</div></div> },
              { key: 'pc', header: 'Project', render: (c) => <ProjectCodeChip code={c.job.projectCode} /> },
              { key: 'w', header: 'Blocked resource', render: (c) => <span className="flex items-center gap-1.5">{c.kind === 'unit' ? <Truck size={14} className="text-slate-400" /> : <UserCheck size={14} className="text-slate-400" />}{c.who}</span> },
              { key: 'x', header: 'Certificate', render: (c) => <span className="text-xs">{c.what}<div className="text-red-600">expired {date(c.expiry)}</div></span> },
              { key: 'a', header: '', render: (c) => <Button size="sm" onClick={() => toast(`Replacement request sent to site leader for ${c.job.id}`, 'info')}>Request replacement</Button> },
            ]}
          />
        </Card>
        <Card>
          <CardHeader title="Try it — assignment check at planning" subtitle="The same rule the planning board (M3) and mobile dispatch call before a unit or person is assigned" />
          <div className="grid gap-3 sm:grid-cols-4">
            <FormField label="Resource type">
              <Select className="w-full" value={kind} onChange={(e) => { setKind(e.target.value as 'unit'); setResult(null) }}>
                <option value="unit">Unit</option>
                <option value="operator">Operator / driver</option>
              </Select>
            </FormField>
            <FormField label={kind === 'unit' ? 'Unit' : 'Person'}>
              {kind === 'unit' ? (
                <Select className="w-full" value={unitId} onChange={(e) => { setUnitId(e.target.value); setResult(null) }}>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.id} — {u.type}</option>)}
                </Select>
              ) : (
                <Select className="w-full" value={empId} onChange={(e) => { setEmpId(e.target.value); setResult(null) }}>
                  {employees.filter((e) => e.licence).map((e) => <option key={e.id} value={e.id}>{e.name} — {e.position}</option>)}
                </Select>
              )}
            </FormField>
            <FormField label="Job date"><Input type="date" value={jobDate} onChange={(e) => { setJobDate(e.target.value); setResult(null) }} /></FormField>
            <div className="flex items-end"><Button variant="primary" className="w-full" onClick={check}>Assign to job</Button></div>
          </div>
          {result && (
            <div className={cx('mt-3 flex items-start gap-2 rounded-lg p-3 text-sm', result.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800')}>
              {result.ok ? <CheckCircle2 size={18} className="shrink-0" /> : <XCircle size={18} className="shrink-0" />}
              <div>
                <div className="font-semibold">{result.ok ? 'Assignment accepted' : 'Assignment rejected'}</div>
                {result.msg}
                {!result.ok && <div className="mt-1 text-xs opacity-80">Override is not available to planners. The block lifts automatically when the renewed certificate is uploaded.</div>}
              </div>
            </div>
          )}
        </Card>
      </div>
      <Card>
        <CardHeader title="Will block within 30 days" subtitle="Future bookings after these dates are rejected" />
        <ul className="divide-y divide-slate-100">
          {upcoming.sort((a, b) => a.expiry.localeCompare(b.expiry)).map((u) => (
            <li key={u.who + u.what} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0"><div className="truncate font-medium">{u.who}</div><div className="truncate text-xs text-slate-500">{u.what}</div></div>
              <div className="text-right"><div className="text-xs">{date(u.expiry)}</div><DaysLeft expiry={u.expiry} /></div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

// ─── Alert rules ─────────────────────────────────────────────────────────────

function AlertRules() {
  const rules = [
    { tier: '≤ 90 days', tone: 'sky' as const, action: 'Renewal reminder', to: 'Asset owner, HR admin (operators)', ch: ['Email'] },
    { tier: '≤ 60 days', tone: 'amber' as const, action: 'Renewal task created; inspector / training booked', to: 'Maintenance Superintendent, HSE Manager', ch: ['Email', 'In-app'] },
    { tier: '≤ 30 days', tone: 'orange' as const, action: 'Inspection work order auto-raised; planner warned on every booking beyond expiry', to: 'Maintenance Superintendent, Site Leader, PM', ch: ['Email', 'In-app', 'Mobile push'] },
    { tier: 'Expired', tone: 'red' as const, action: 'Unit / person blocked from assignment; daily escalation', to: 'Operations Director, HSE Manager, PM', ch: ['Email', 'In-app', 'Mobile push', 'WhatsApp'] },
  ]
  const icon = { Email: <Mail size={12} />, 'In-app': <BellRing size={12} />, 'Mobile push': <Smartphone size={12} />, WhatsApp: <MessageSquare size={12} /> } as Record<string, ReactNode>
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card padded={false} className="lg:col-span-2">
        <DataTable
          rows={rules}
          rowKey={(r) => r.tier}
          columns={[
            { key: 't', header: 'Tier', render: (r) => <Badge tone={r.tone} dot>{r.tier}</Badge> },
            { key: 'a', header: 'Automatic action', render: (r) => <span className="text-sm">{r.action}</span> },
            { key: 'to', header: 'Recipients', render: (r) => <span className="text-xs text-slate-600">{r.to}</span> },
            { key: 'c', header: 'Channels', render: (r) => <div className="flex flex-wrap gap-1">{r.ch.map((c) => <Badge key={c}><span className="flex items-center gap-1">{icon[c]}{c}</span></Badge>)}</div> },
          ]}
        />
      </Card>
      <Card>
        <CardHeader title="Recent notifications" />
        <ul className="space-y-3 text-sm">
          <li><div className="text-xs text-slate-400">10 Mar 2028, 06:00</div>Daily escalation: CR-050-01 SILO expired 11 days · Rahmat Hidayat SIM B2 Umum expired 19 days</li>
          <li><div className="text-xs text-slate-400">03 Mar 2028, 08:00</div>FL-01 SILO entered 30-day tier — WO-2028-0149 raised</li>
          <li><div className="text-xs text-slate-400">28 Feb 2028, 08:00</div>Andi Saputra SIO Crane Class I entered 30-day tier — retest booked 21 Mar</li>
          <li><div className="text-xs text-slate-400">21 Feb 2028, 08:00</div>CR-100-02 SILO entered 30-day tier — WO-2028-0142 extended with load-test prep</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">Thresholds are configuration, not code — see <Link to="/admin/config" className="text-brand-700 hover:underline">Configuration › Notification thresholds</Link>.</p>
      </Card>
    </div>
  )
}

// ─── Client audit pack ───────────────────────────────────────────────────────

function AuditPack({ eq, ops }: { eq: EquipmentCert[]; ops: OperatorCert[] }) {
  const toast = useToast()
  const active = contracts.filter((c) => c.status === 'Active')
  const [ctrId, setCtrId] = useState(active[0].id)
  const [includeCompetency, setIncludeCompetency] = useState(true)
  const [excluded, setExcluded] = useState<string[]>([])
  const [generated, setGenerated] = useState<string | null>(null)
  const ctr = getContract(ctrId)!
  const codes = projects.filter((p) => p.code === ctr.projectCode || p.parent === ctr.projectCode).map((p) => p.code)

  const { unitIds, empIds } = useMemo(() => {
    const cj = jobs.filter((j) => codes.includes(j.projectCode))
    const u = new Set<string>([...units.filter((x) => x.projectCode && codes.includes(x.projectCode)).map((x) => x.id), ...cj.flatMap((j) => j.unitIds)])
    const e = new Set<string>(cj.flatMap((j) => j.crewIds))
    return { unitIds: [...u], empIds: [...e] }
  }, [codes])

  const lines = [
    ...unitIds.map((u) => {
      const c = eq.find((x) => x.unitId === u)!
      return { key: `U-${u}`, subject: `${u} — ${getUnit(u)?.type}`, doc: `${c.kind.split(' ')[0]} ${c.number}`, files: c.documents, expiry: c.expiry, group: 'Equipment' }
    }),
    ...empIds.flatMap((e) =>
      ops
        .filter((c) => c.empId === e && (includeCompetency || c.class === 'Licence'))
        .map((c) => ({ key: `O-${c.id}`, subject: `${getEmployee(e)?.name} — ${getEmployee(e)?.position}`, doc: `${c.kind} ${c.number}`, files: [`${c.number.replace(/\//g, '-')}.pdf`, 'ID card (KTP) — masked.pdf'], expiry: c.expiry, group: 'Operator' })),
    ),
  ]
  const included = lines.filter((l) => !excluded.includes(l.key))
  const lapsed = included.filter((l) => daysUntil(l.expiry) < 0)

  const generate = () => {
    const name = `AuditPack_${ctr.id}_${ctr.projectCode}_20280310.pdf`
    setGenerated(name)
    toast(`Audit pack PDF generated — ${included.length} certificates, ${included.reduce((a, l) => a + l.files.length, 0)} documents`, 'success')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="h-fit">
        <CardHeader title="1 · Scope" subtitle="Evidence is assembled per unit and per operator working under the contract" />
        <div className="space-y-3">
          <FormField label="Contract / site">
            <Select className="w-full" value={ctrId} onChange={(e) => { setCtrId(e.target.value); setExcluded([]); setGenerated(null) }}>
              {active.map((c) => <option key={c.id} value={c.id}>{c.id} — {getCustomer(c.customerId)?.name}</option>)}
            </Select>
          </FormField>
          <DescList cols={2} items={[
            { label: 'Client', value: getCustomer(ctr.customerId)?.name },
            { label: 'Project code', value: <ProjectCodeChip code={ctr.projectCode} /> },
            { label: 'Units in scope', value: unitIds.length },
            { label: 'Operators in scope', value: empIds.length },
          ]} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeCompetency} onChange={(e) => setIncludeCompetency(e.target.checked)} /> Include competency certificates</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> Include last 2 inspection reports per unit</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> Watermark “Issued for {getCustomer(ctr.customerId)?.name.split(' (')[0]} audit”</label>
        </div>
      </Card>
      <Card padded={false} className="lg:col-span-2">
        <div className="p-4 pb-2">
          <CardHeader
            title="2 · Evidence list"
            subtitle={`${included.length} certificates · ${included.reduce((a, l) => a + l.files.length, 0)} documents from Document Management`}
            actions={<Button variant="primary" icon={<FileArchive size={15} />} onClick={generate} disabled={!included.length}>Generate audit pack</Button>}
          />
          {lapsed.length > 0 && (
            <Callout tone="amber" title={`${lapsed.length} lapsed certificate${lapsed.length > 1 ? 's' : ''} in scope`}>
              The pack flags these rather than hiding them — the resources are already blocked from assignment, and the renewal evidence (work order / booking) is attached instead.
            </Callout>
          )}
          {generated && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 size={16} /> <span className="font-medium">{generated}</span> <span className="text-xs">stored in Documents, bound to {ctr.id}, retention 10 years</span>
              <Link to="/documents" className="ml-auto text-xs font-medium underline">Open in Documents</Link>
            </div>
          )}
        </div>
        <DataTable
          dense
          rows={lines}
          rowKey={(l) => l.key}
          rowClassName={(l) => (excluded.includes(l.key) ? 'opacity-40' : undefined)}
          columns={[
            { key: 'c', header: '', render: (l) => <input type="checkbox" checked={!excluded.includes(l.key)} onChange={() => setExcluded((x) => (x.includes(l.key) ? x.filter((k) => k !== l.key) : [...x, l.key]))} /> },
            { key: 'g', header: 'Type', render: (l) => <Badge tone={l.group === 'Equipment' ? 'violet' : 'sky'}>{l.group}</Badge> },
            { key: 's', header: 'Subject', render: (l) => <span className="text-sm">{l.subject}</span> },
            { key: 'd', header: 'Certificate', render: (l) => <span className="text-xs">{l.doc}</span> },
            { key: 'f', header: 'Files', render: (l) => <span className="text-xs text-slate-500" title={l.files.join('\n')}>{l.files.length} files</span> },
            { key: 'x', header: 'Status', render: (l) => <TierBadge expiry={l.expiry} /> },
          ]}
        />
      </Card>
    </div>
  )
}

// ─── Drawers ─────────────────────────────────────────────────────────────────

function EqDrawer({ cert, onClose, onRenew }: { cert: EquipmentCert | null; onClose: () => void; onRenew: (c: EquipmentCert, n: string, e: string) => void }) {
  const [num, setNum] = useState('')
  const [exp, setExp] = useState('2029-03-15')
  if (!cert) return null
  const u = getUnit(cert.unitId)!
  const assigned = jobs.filter((j) => j.unitIds.includes(u.id) && ['Planned', 'Dispatched', 'In Progress', 'Draft'].includes(j.status))
  return (
    <Drawer open onClose={onClose} title={`${cert.unitId} · ${cert.kind}`} width="max-w-2xl"
      footer={<><Button onClick={onClose}>Close</Button><Button variant="primary" icon={<Upload size={15} />} onClick={() => onRenew(cert, num || `${cert.number.split('/').slice(0, 2).join('/')}/2028/${String(Math.floor(Math.random() * 9000) + 1000)}`, exp)}>Upload renewed certificate</Button></>}>
      <DescList cols={2} items={[
        { label: 'Unit', value: `${u.id} — ${u.type} (${u.make}, ${u.year})` },
        { label: 'Location / project', value: <span className="flex items-center gap-2">{u.location}{u.projectCode && <ProjectCodeChip code={u.projectCode} />}</span> },
        { label: 'Certificate number', value: <Mono>{cert.number}</Mono> },
        { label: 'Issuer', value: cert.issuer },
        { label: 'Issued', value: date(cert.issued) },
        { label: 'Expiry', value: <span className="flex items-center gap-2">{date(cert.expiry)} <TierBadge expiry={cert.expiry} /></span> },
      ]} />
      {daysUntil(cert.expiry) < 0 && <div className="mt-4"><Callout tone="red" title="Blocked from assignment" icon={<Ban size={16} />}>The planning board and mobile dispatch reject this unit until a valid certificate is uploaded.{assigned.length > 0 && <> Open assignments needing replacement: {assigned.map((j) => j.id).join(', ')}.</>}</Callout></div>}
      {cert.renewal && <div className="mt-3"><Callout tone="blue" title="Renewal in progress">{cert.renewal}</Callout></div>}
      <h4 className="mt-5 mb-2 text-sm font-semibold">Supporting documents</h4>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {cert.documents.map((d, i) => (
          <li key={d} className="flex items-center gap-2 px-3 py-2 text-sm"><FileText size={14} className="text-slate-400" /><span className="flex-1 truncate">{d}</span><span className="text-xs text-slate-400">v{i === 0 ? 1 : 2} · {date(cert.issued)}</span></li>
        ))}
      </ul>
      <h4 className="mt-5 mb-2 text-sm font-semibold">Record renewal</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="New certificate number"><Input value={num} onChange={(e) => setNum(e.target.value)} placeholder={cert.number.replace(/20\d\d/, '2028')} /></FormField>
        <FormField label="New expiry"><Input type="date" value={exp} onChange={(e) => setExp(e.target.value)} /></FormField>
      </div>
      <p className="mt-2 text-xs text-slate-500"><BadgeCheck size={12} className="mr-1 inline" />Previous certificate versions are retained in Document Management for audit history.</p>
    </Drawer>
  )
}

function OpDrawer({ cert, onClose, onRenew }: { cert: OperatorCert | null; onClose: () => void; onRenew: (c: OperatorCert, n: string, e: string) => void }) {
  const [exp, setExp] = useState('2033-03-10')
  if (!cert) return null
  const e = getEmployee(cert.empId)!
  const all = operatorCerts.filter((c) => c.empId === e.id)
  const assigned = jobs.filter((j) => j.crewIds.includes(e.id) && ['Planned', 'Dispatched', 'In Progress', 'Draft'].includes(j.status))
  return (
    <Drawer open onClose={onClose} title={`${e.name} · ${cert.kind}`} width="max-w-2xl"
      footer={<><Button onClick={onClose}>Close</Button><Button variant="primary" icon={<Upload size={15} />} onClick={() => onRenew(cert, cert.number.replace(/\d{4}$/, '2291'), exp)}>Upload renewal</Button></>}>
      <DescList cols={2} items={[
        { label: 'Person', value: `${e.name} (${e.id})` },
        { label: 'Position / location', value: `${e.position} · ${e.location}` },
        { label: 'Number', value: <Mono>{cert.number}</Mono> },
        { label: 'Issuer', value: cert.issuer },
        { label: 'Issued', value: date(cert.issued) },
        { label: 'Expiry', value: <span className="flex items-center gap-2">{date(cert.expiry)} <TierBadge expiry={cert.expiry} /></span> },
      ]} />
      <p className="mt-3 text-xs text-slate-500">Linked to the individual (from the Mekari Talenta employee record), not to a job — it follows the person across projects.</p>
      {daysUntil(cert.expiry) < 0 && cert.class === 'Licence' && (
        <div className="mt-4"><Callout tone="red" title="Blocked from assignment as operator / driver" icon={<Ban size={16} />}>
          {assigned.length > 0 ? <>Currently listed on {assigned.map((j) => <Link key={j.id} to={`/ops/jobs/${j.id}`} className="mr-1 underline">{j.id}</Link>)} — the site leader has been asked to replace this crew member.</> : 'No open assignments.'}
        </Callout></div>
      )}
      <h4 className="mt-5 mb-2 text-sm font-semibold">All certificates held</h4>
      <DataTable dense rows={all} rowKey={(c) => c.id} columns={[
        { key: 'k', header: 'Certificate', render: (c) => c.kind },
        { key: 'c', header: 'Class', render: (c) => c.class },
        { key: 'x', header: 'Expiry', render: (c) => date(c.expiry) },
        { key: 't', header: 'Status', render: (c) => <TierBadge expiry={c.expiry} /> },
      ]} />
      <h4 className="mt-5 mb-2 text-sm font-semibold">Record renewal</h4>
      <FormField label="New expiry"><Input type="date" value={exp} onChange={(ev) => setExp(ev.target.value)} /></FormField>
    </Drawer>
  )
}
