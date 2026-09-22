import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Building2, Database, FileWarning, Globe, Plus, ShieldOff } from 'lucide-react'
import { Badge, Button, Callout, Card, DataTable, Grid, PageHeader, Progress, SearchInput, Select, Stat, StatusBadge, Tabs, cx } from '@/components/ui'
import type { Vendor } from '@/data/core'
import { allVendors, docState, nextVendorCode, vendorProfiles, type Registration } from '@/data/procurement'
import { date, daysUntil } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { MODULE_PROC, VendorLink } from './shared'
import { regStore, useRegs, useVendorStatus } from './store'

type TabKey = 'master' | 'portal' | 'docs'

export default function Vendors() {
  const vs = useVendorStatus()
  const regs = useRegs()
  const nav = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('master')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [src, setSrc] = useState('')

  const list: Vendor[] = allVendors.map((v) => ({ ...v, status: vs[v.id] ?? v.status }))
  const rows = list.filter(
    (v) =>
      (!status || v.status === status) &&
      (!src || vendorProfiles[v.id].channel === src) &&
      (!q || `${v.id} ${v.name} ${v.category} ${v.npwp} ${vendorProfiles[v.id].legacyCode ?? ''}`.toLowerCase().includes(q.toLowerCase())),
  )
  const docAlerts = list.flatMap((v) => vendorProfiles[v.id].docs.filter((d) => ['Expired', 'Expiring'].includes(docState(d.expiry))).map((d) => ({ v, d }))).sort((a, b) => (a.d.expiry ?? '').localeCompare(b.d.expiry ?? ''))
  const pendingRegs = regs.filter((r) => r.status !== 'Approved')

  const approveReg = (r: Registration) => {
    if (r.status === 'Duplicate NPWP') {
      const dup = list.find((v) => v.npwp === r.npwp)
      toast(`Cannot approve: NPWP ${r.npwp} already registered to ${dup?.id} ${dup?.name} (duplicate detection, PROC-03)`, 'error')
      return
    }
    if (r.docsUploaded < r.docsRequired) {
      toast(`Cannot approve: ${r.docsRequired - r.docsUploaded} mandatory document(s) missing`, 'error')
      return
    }
    const taken = [...allVendors.map((v) => v.id), ...regs.filter((x) => x.vendorId).map((x) => x.vendorId!)]
    const code = nextVendorCode(taken)
    regStore.set((s) => s.map((x) => (x.id === r.id ? { ...x, status: 'Approved', vendorId: code } : x)))
    toast(`${r.name} approved — vendor code ${code} issued automatically; status Prospective until qualification`, 'success')
  }

  return (
    <>
      <PageHeader
        module={MODULE_PROC}
        title="Vendor management (VMS)"
        subtitle="One vendor master with lifecycle states, automatic coding, document validity monitoring and performance scoring. Vendors register and maintain documents through the vendor portal."
        actions={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setTab('portal')}>Review registrations</Button>}
      />
      <Grid cols={4} className="mb-4">
        <Stat label="Active vendors" value={list.filter((v) => v.status === 'Active').length} sub={`${list.filter((v) => v.status === 'Prospective').length} prospective`} icon={<Building2 size={16} />} />
        <Stat label="Suspended / blocked" value={list.filter((v) => v.status === 'Suspended' || v.status === 'Blocked').length} sub="Excluded from RFQ invitations" tone="bad" icon={<ShieldOff size={16} />} />
        <Stat label="Documents expired / expiring ≤ 60 d" value={docAlerts.length} sub={`${docAlerts.filter((a) => docState(a.d.expiry) === 'Expired').length} expired`} tone="warn" icon={<FileWarning size={16} />} />
        <Stat label="Portal registrations to review" value={pendingRegs.length} sub={`${regs.filter((r) => r.status === 'Duplicate NPWP').length} flagged as duplicate NPWP`} icon={<Globe size={16} />} />
      </Grid>

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'master', label: 'Vendor master', count: list.length },
          { key: 'portal', label: 'Portal registrations', count: pendingRegs.length },
          { key: 'docs', label: 'Document expiry', count: docAlerts.length },
        ]}
      />

      {tab === 'master' && (
        <Card padded={false}>
          <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
            <SearchInput value={q} onChange={setQ} placeholder="Search name, code, NPWP, legacy code…" className="w-full sm:w-72" />
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All states</option>
              {['Prospective', 'Active', 'Suspended', 'Blocked'].map((s) => <option key={s}>{s}</option>)}
            </Select>
            <Select value={src} onChange={(e) => setSrc(e.target.value)}>
              <option value="">All sources</option>
              <option>Migrated from SAP B1</option>
              <option>Vendor portal</option>
            </Select>
          </div>
          <DataTable
            rows={rows}
            rowKey={(v) => v.id}
            onRowClick={(v) => nav(`/vendors/${v.id}`)}
            columns={[
              { key: 'id', header: 'Vendor code', render: (v) => <span className="font-mono text-[12px] font-medium">{v.id}</span> },
              { key: 'n', header: 'Vendor', render: (v) => <div className="min-w-[200px]"><div className="font-medium text-slate-800">{v.name}</div><div className="text-[11px] text-slate-500">{v.category} · {v.city}</div></div> },
              { key: 's', header: 'State', render: (v) => <StatusBadge status={v.status} /> },
              { key: 'sc', header: 'Score', render: (v) => (v.score ? <div className="w-24"><div className="flex justify-between text-xs"><span className="num font-semibold">{v.score}</span><span className="text-slate-400">/100</span></div><Progress value={v.score} tone={v.score >= 80 ? 'green' : v.score >= 60 ? 'amber' : 'red'} /></div> : <span className="text-xs text-slate-400">Not rated</span>) },
              { key: 'd', header: 'Documents', render: (v) => { const st = docState(v.docsExpiry); return <div className="text-xs whitespace-nowrap"><Badge tone={st === 'Expired' ? 'red' : st === 'Expiring' ? 'amber' : 'green'}>{st}</Badge><div className="mt-0.5 text-slate-500">earliest {date(v.docsExpiry)}</div></div> } },
              { key: 'src', header: 'Source', render: (v) => { const p = vendorProfiles[v.id]; return p.channel === 'Vendor portal' ? <Badge tone="sky"><Globe size={11} />Portal</Badge> : <span title={p.migrationNote}><Badge tone="slate"><Database size={11} />Migrated · {p.legacyCode}</Badge></span> } },
              { key: 'pkp', header: 'Tax', render: (v) => <span className="text-xs text-slate-600">{v.pkp ? 'PKP' : 'Non-PKP'}</span> },
              { key: 'npwp', header: 'NPWP', render: (v) => <span className="font-mono text-[11px] text-slate-500">{v.npwp}</span> },
            ]}
          />
        </Card>
      )}

      {tab === 'portal' && (
        <>
          <div className="mb-4">
            <Callout tone="blue" icon={<Globe size={18} />} title="Self-service registration (PROC-02) with automatic vendor code (PROC-03)">
              Vendors enter their own data and upload documents on the vendor portal instead of sending them by email. On approval the next code in the pattern VND-nnnnn is issued; a registration whose NPWP already exists in the master is stopped as a duplicate.
            </Callout>
          </div>
          <Card padded={false}>
            <DataTable
              rows={regs}
              rowKey={(r) => r.id}
              columns={[
                { key: 'id', header: 'Registration', render: (r) => <div><div className="font-mono text-[12px] font-medium">{r.id}</div><div className="text-[11px] text-slate-500">{date(r.submitted)}</div></div> },
                { key: 'n', header: 'Company', render: (r) => <div className="min-w-[200px]"><div className="font-medium text-slate-800">{r.name}</div><div className="text-[11px] text-slate-500">{r.category} · {r.city}</div></div> },
                { key: 'npwp', header: 'NPWP', render: (r) => <span className={cx('font-mono text-[11px]', r.status === 'Duplicate NPWP' ? 'font-semibold text-red-600' : 'text-slate-500')}>{r.npwp}</span> },
                { key: 'docs', header: 'Documents', render: (r) => <span className={cx('text-sm', r.docsUploaded < r.docsRequired && 'text-amber-700')}>{r.docsUploaded}/{r.docsRequired}</span> },
                { key: 's', header: 'Status', render: (r) => r.status === 'Duplicate NPWP' ? <Badge tone="red"><AlertTriangle size={11} />Duplicate NPWP</Badge> : <StatusBadge status={r.status} /> },
                { key: 'c', header: 'Vendor code', render: (r) => (r.vendorId ? (allVendors.some((v) => v.id === r.vendorId) ? <VendorLink id={r.vendorId} sub /> : <span className="font-mono text-[12px] font-medium text-emerald-700">{r.vendorId}</span>) : <span className="text-xs text-slate-400">on approval</span>) },
                { key: 'a', header: '', render: (r) => (r.status === 'Approved' ? null : <div className="flex gap-1.5"><Button size="sm" variant="success" onClick={() => approveReg(r)}>Approve</Button><Button size="sm" variant="ghost" onClick={() => { regStore.set((s) => s.filter((x) => x.id !== r.id)); toast(`${r.id} rejected — reason sent to applicant via portal`, 'warning') }}>Reject</Button></div>) },
              ]}
            />
          </Card>
        </>
      )}

      {tab === 'docs' && (
        <Card padded={false}>
          <div className="border-b border-slate-200 p-3 text-sm text-slate-600">Reminders go to the vendor (portal + email) and the buyer at 60 and 30 days. On expiry the vendor is automatically excluded from new RFQ invitations (PROC-04).</div>
          <DataTable
            rows={docAlerts}
            rowKey={(a) => a.v.id + a.d.type}
            onRowClick={(a) => nav(`/vendors/${a.v.id}`)}
            columns={[
              { key: 'v', header: 'Vendor', render: (a) => <VendorLink id={a.v.id} sub /> },
              { key: 't', header: 'Document', render: (a) => a.d.type },
              { key: 'n', header: 'Number', render: (a) => <span className="font-mono text-[11px]">{a.d.number}</span> },
              { key: 'e', header: 'Expiry', render: (a) => { const n = daysUntil(a.d.expiry!); return <div className="whitespace-nowrap"><div>{date(a.d.expiry!)}</div><div className={cx('text-[11px]', n < 0 ? 'text-red-600' : 'text-amber-700')}>{n < 0 ? `expired ${-n} d ago` : `${n} d left`}</div></div> } },
              { key: 's', header: 'State', render: (a) => <StatusBadge status={docState(a.d.expiry)} /> },
              { key: 'notif', header: 'Notifications', render: (a) => { const n = daysUntil(a.d.expiry!); return <span className="text-xs text-slate-500">{n < 0 ? '60 d, 30 d, expiry notice sent · excluded from RFQs' : n <= 30 ? '60 d and 30 d reminders sent' : '60 d reminder sent'}</span> } },
              { key: 'st', header: 'Vendor state', render: (a) => <StatusBadge status={a.v.status} /> },
            ]}
          />
        </Card>
      )}
    </>
  )
}
