import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Ban, CheckCircle2, Database, FileText, Globe, PauseCircle, PlayCircle, ShieldAlert } from 'lucide-react'
import { Badge, Button, Callout, Card, CardHeader, DataTable, DescList, EmptyState, PageHeader, ProjectCodeChip, StatusBadge, Tabs, Timeline, cx } from '@/components/ui'
import type { VendorStatus } from '@/data/core'
import { allPurchaseOrders, compositeScore, docState, findVendor, vendorProfiles } from '@/data/procurement'
import { date, daysUntil, idrShort, period, TODAY_ISO } from '@/lib/format'
import { ChartTooltip, GRID, Legend, SERIES, axisProps } from '@/lib/chart'
import { useToast } from '@/lib/app-state'
import { MODULE_PROC, TextLink } from './shared'
import { usePOState, useRFQs, useVendorStatus, vendorStatusStore } from './store'

type TabKey = 'perf' | 'docs' | 'pos' | 'life'
const STATES: VendorStatus[] = ['Prospective', 'Active', 'Suspended', 'Blocked']

export default function VendorDetail() {
  const { id } = useParams()
  const vs = useVendorStatus()
  const pst = usePOState()
  const rfqs = useRFQs()
  const nav = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('perf')
  const [log, setLog] = useState<{ date: string; status: string; by: string; note: string }[]>([])
  const base = findVendor(id)
  if (!base) return <Card><EmptyState title="Vendor not found" body={`No vendor with code ${id}.`} /></Card>

  const v = { ...base, status: vs[base.id] ?? base.status }
  const p = vendorProfiles[v.id]
  const pos = allPurchaseOrders.filter((x) => x.vendorId === v.id).map((x) => ({ ...x, status: pst[x.id]?.status ?? x.status }))
  const invited = rfqs.filter((r) => r.invited.some((i) => i.vendorId === v.id))
  const responded = invited.filter((r) => r.quotations.some((q) => q.vendorId === v.id))
  const awarded = rfqs.filter((r) => r.award?.vendorId === v.id)
  const docsExpired = p.docs.some((d) => docState(d.expiry) === 'Expired')

  const setStatus = (s: VendorStatus, note: string) => {
    vendorStatusStore.set((x) => ({ ...x, [v.id]: s }))
    setLog((l) => [...l, { date: TODAY_ISO, status: s, by: 'Rudi Hartono', note }])
    toast(`${v.name} is now ${s}`, s === 'Active' ? 'success' : 'warning')
  }
  const reactivate = () => {
    if (docsExpired) {
      toast('Cannot reactivate: legal documents are expired. The vendor must upload renewed documents via the portal first.', 'error')
      setTab('docs')
      return
    }
    setStatus('Active', 'Reactivated after document renewal')
  }

  const lifecycle = [...p.lifecycle, ...log]

  return (
    <>
      <PageHeader
        module={MODULE_PROC}
        crumbs={[{ label: 'Vendors', to: '/vendors' }, { label: v.id }]}
        title={v.name}
        subtitle={<span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs">{v.id}</span><StatusBadge status={v.status} />{p.channel === 'Vendor portal' ? <Badge tone="sky"><Globe size={11} />Registered via portal</Badge> : <Badge><Database size={11} />Migrated · {p.legacyCode}</Badge>}</span>}
        actions={
          <>
            {v.status === 'Prospective' && <Button variant="success" icon={<CheckCircle2 size={15} />} onClick={() => (docsExpired ? toast('Qualification blocked: documents expired', 'error') : setStatus('Active', 'Qualification passed'))}>Qualify & activate</Button>}
            {v.status === 'Active' && <Button icon={<PauseCircle size={15} />} onClick={() => setStatus('Suspended', 'Suspended manually by Procurement')}>Suspend</Button>}
            {v.status === 'Suspended' && <Button variant="success" icon={<PlayCircle size={15} />} onClick={reactivate}>Reactivate</Button>}
            {v.status !== 'Blocked' && <Button variant="danger" icon={<Ban size={15} />} onClick={() => setStatus('Blocked', 'Blocked by Procurement committee')}>Block</Button>}
          </>
        }
      />

      <Card className="mb-4">
        <div className="mb-4 flex flex-wrap items-center gap-1">
          {STATES.map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              <span className={cx('rounded-full px-3 py-1 text-xs font-medium', v.status === s ? (s === 'Active' ? 'bg-emerald-600 text-white' : s === 'Prospective' ? 'bg-ink-900 text-white' : s === 'Suspended' ? 'bg-orange-500 text-white' : 'bg-red-600 text-white') : 'bg-slate-100 text-slate-400')}>{s}</span>
              {i < STATES.length - 1 && <span className="h-px w-4 bg-slate-200" />}
            </span>
          ))}
          <span className="ml-2 text-[11px] text-slate-500">Vendor lifecycle (PROC-01)</span>
        </div>
        <DescList
          cols={4}
          items={[
            { label: 'Category', value: v.category },
            { label: 'NPWP', value: <span className="font-mono text-[12px]">{v.npwp}</span> },
            { label: 'Tax status', value: v.pkp ? 'PKP (issues e-Faktur)' : 'Non-PKP' },
            { label: 'City', value: v.city },
            { label: 'Contact', value: `${p.contact} · ${p.phone}` },
            { label: 'Email', value: p.email },
            { label: 'Bank account', value: p.bank },
            { label: 'Vendor since', value: date(p.since) },
          ]}
        />
      </Card>

      {p.channel === 'Migrated from SAP B1' && (
        <div className="mb-4">
          <Callout tone="slate" icon={<Database size={18} />} title={`Migrated vendor record — SAP B1 code ${p.legacyCode} (PROC-22)`}>
            Extracted from the SAP B1 vendor master, cleansed and loaded on 12 May 2027. Cleansing applied: {p.migrationNote}. The legacy code remains searchable for archive look-ups.
          </Callout>
        </div>
      )}
      {(v.status === 'Suspended' || v.status === 'Blocked') && (
        <div className="mb-4">
          <Callout tone="red" icon={<ShieldAlert size={18} />} title={`${v.status} — excluded from RFQ invitations and new POs`}>
            {lifecycle.filter((l) => l.status === v.status).slice(-1)[0]?.note ?? 'Status set by Procurement.'}
          </Callout>
        </div>
      )}

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'perf', label: 'Performance' },
          { key: 'docs', label: 'Qualification documents', count: p.docs.length },
          { key: 'pos', label: 'PO history', count: pos.length },
          { key: 'life', label: 'Lifecycle log', count: lifecycle.length },
        ]}
      />

      {tab === 'perf' && (
        p.scores ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader title="Vendor score" subtitle="Weighted: timeliness 40%, quality 40%, document compliance 20% (PROC-05)" />
              <div className="mb-4 flex items-end gap-2">
                <span className={cx('num text-4xl font-semibold', compositeScore(p.scores) >= 80 ? 'text-emerald-700' : compositeScore(p.scores) >= 50 ? 'text-amber-700' : 'text-red-600')}>{compositeScore(p.scores)}</span>
                <span className="mb-1 text-sm text-slate-500">/ 100</span>
              </div>
              {([['Timeliness', p.scores.timeliness, SERIES[0]], ['Quality', p.scores.quality, SERIES[1]], ['Document compliance', p.scores.docCompliance, SERIES[2]]] as const).map(([label, val, color]) => (
                <div key={label} className="mb-3">
                  <div className="mb-1 flex justify-between text-sm"><span className="flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-sm" style={{ background: color }} />{label}</span><span className="num font-medium">{val}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${val}%`, background: color }} /></div>
                </div>
              ))}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-50 p-2"><div className="num text-lg font-semibold">{invited.length}</div>RFQs invited</div>
                <div className="rounded-lg bg-slate-50 p-2"><div className="num text-lg font-semibold">{responded.length}</div>Responded</div>
                <div className="rounded-lg bg-slate-50 p-2"><div className="num text-lg font-semibold">{awarded.length}</div>Awarded</div>
              </div>
              <div className="mt-4">
                <Callout tone={compositeScore(p.scores) < 50 ? 'red' : 'blue'}>
                  Blocking rule: a composite score below 50, or any expired legal document, suspends the vendor automatically. Blocking is a committee decision.
                </Callout>
              </div>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader title="Performance trend" subtitle="Monthly score per dimension, last six months" />
              <Legend items={[{ label: 'Timeliness', color: SERIES[0] }, { label: 'Quality', color: SERIES[1] }, { label: 'Document compliance', color: SERIES[2] }]} />
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={p.trend.map((t) => ({ ...t, label: period(t.month) }))} margin={{ left: 0, right: 12, top: 4 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis domain={[0, 100]} {...axisProps} width={32} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="timeliness" name="Timeliness" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="quality" name="Quality" stroke={SERIES[1]} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="docCompliance" name="Document compliance" stroke={SERIES[2]} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        ) : (
          <Card><EmptyState title="Not yet rated" body="Scoring starts after the first PO is received. Prospective vendors must pass qualification before they can be invited to RFQs." /></Card>
        )
      )}

      {tab === 'docs' && (
        <Card padded={false}>
          <div className="p-4 pb-2"><CardHeader title="Qualification documents" subtitle="Validity is monitored daily; vendor and buyer are notified at 60 and 30 days. Vendors with expired documents are excluded from new RFQs (PROC-04)." /></div>
          <DataTable
            rows={p.docs}
            rowKey={(d) => d.type}
            columns={[
              { key: 't', header: 'Document', render: (d) => <span className="flex items-center gap-2 font-medium text-slate-800"><FileText size={14} className="text-slate-400" />{d.type}</span> },
              { key: 'n', header: 'Number', render: (d) => <span className="font-mono text-[11px]">{d.number}</span> },
              { key: 'i', header: 'Issued', render: (d) => date(d.issued) },
              { key: 'e', header: 'Expiry', render: (d) => (d.expiry ? <div className="whitespace-nowrap">{date(d.expiry)}<div className={cx('text-[11px]', daysUntil(d.expiry) < 0 ? 'text-red-600' : daysUntil(d.expiry) <= 60 ? 'text-amber-700' : 'text-slate-500')}>{daysUntil(d.expiry) < 0 ? `expired ${-daysUntil(d.expiry)} d ago` : `${daysUntil(d.expiry)} d left`}</div></div> : '—') },
              { key: 's', header: 'State', render: (d) => { const s = docState(d.expiry); return <Badge tone={s === 'Expired' ? 'red' : s === 'Expiring' ? 'amber' : s === 'Valid' ? 'green' : 'slate'} dot>{s}</Badge> } },
              { key: 'u', header: 'Source', render: () => <span className="text-xs text-slate-500">{p.channel === 'Vendor portal' ? 'Uploaded by vendor (portal)' : 'Migrated · re-verified'}</span> },
            ]}
          />
        </Card>
      )}

      {tab === 'pos' && (
        <Card padded={false}>
          {pos.length === 0 ? (
            <EmptyState title="No purchase orders yet" />
          ) : (
            <DataTable
              rows={pos}
              rowKey={(x) => x.id}
              onRowClick={(x) => nav(`/procurement/orders/${x.id}`)}
              columns={[
                { key: 'id', header: 'PO', render: (x) => <TextLink to={`/procurement/orders/${x.id}`}>{x.id}</TextLink> },
                { key: 'd', header: 'Date', render: (x) => date(x.date) },
                { key: 'desc', header: 'Description', render: (x) => x.description },
                { key: 'pc', header: 'Project code', render: (x) => <ProjectCodeChip code={x.projectCode} /> },
                { key: 'a', header: 'Amount', align: 'right', render: (x) => idrShort(x.amount) },
                { key: 's', header: 'Status', render: (x) => <StatusBadge status={x.status} /> },
              ]}
              footer={<tr><td colSpan={4} className="px-3 py-2">Total ({pos.length} POs)</td><td className="num px-3 py-2 text-right">{idrShort(pos.reduce((s, x) => s + x.amount, 0))}</td><td /></tr>}
            />
          )}
        </Card>
      )}

      {tab === 'life' && (
        <Card>
          <Timeline items={[...lifecycle].reverse().map((l) => ({ time: `${date(l.date)} · ${l.by}`, title: l.status, body: l.note, tone: l.status === 'Active' ? 'green' : l.status === 'Suspended' ? 'orange' : l.status === 'Blocked' ? 'red' : 'slate' }))} />
        </Card>
      )}

    </>
  )
}
