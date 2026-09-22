import { useState } from 'react'
import { FileBadge, BellRing, RefreshCw, Upload, FileText } from 'lucide-react'
import { Badge, Button, Callout, Card, DataTable, DescList, Drawer, FormField, Grid, Input, Mono, PageHeader, SearchInput, Select, Stat, Timeline } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, daysUntil } from '@/lib/format'
import { certTier, permits as seed, type Permit } from '@/data/supporting'
import { DaysLeft, Person, TierBadge } from './shared'

export default function Permits() {
  const toast = useToast()
  const [list, setList] = useState<Permit[]>(seed)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [tier, setTier] = useState('All')
  const [sel, setSel] = useState<Permit | null>(null)
  const [exp, setExp] = useState('2031-05-19')

  const rows = list
    .filter((p) => (cat === 'All' || p.category === cat) && (tier === 'All' || certTier(p.expiry) === tier))
    .filter((p) => !q || `${p.name} ${p.number} ${p.issuer} ${p.site}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.expiry.localeCompare(b.expiry))
  const expired = list.filter((p) => daysUntil(p.expiry) < 0)
  const d90 = list.filter((p) => daysUntil(p.expiry) >= 0 && daysUntil(p.expiry) <= 90)

  const renew = (p: Permit) => {
    setList((l) => l.map((x) => (x.id === p.id ? { ...x, issued: '2028-03-10', expiry: exp, renewalStatus: undefined } : x)))
    setSel(null)
    toast(`${p.name.split(' —')[0]} renewed until ${date(exp)} — alerts cleared`, 'success')
  }

  return (
    <>
      <PageHeader
        module="M16 · HSE & Enviro Compliance · Stage 1A"
        title="Permits & Licences"
        subtitle="Company-level permits, management-system certificates, environmental approvals and client site passes — one registry with tiered expiry notifications (90 / 60 / 30 days)."
        actions={<Button variant="primary" icon={<BellRing size={15} />} onClick={() => toast(`Digest sent: ${expired.length} expired, ${d90.length} expiring within 90 days`, 'info')}>Send expiry digest</Button>}
      />
      <Grid cols={4} className="mb-5">
        <Stat label="Registered permits" value={list.length} sub="ISO 45001 · ISO 14001 · SMK3 · DLH · ESDM · CSMS" icon={<FileBadge size={16} />} />
        <Stat label="Expired" value={expired.length} sub={expired.map((p) => p.name.split(' —')[0]).join(', ') || 'None'} tone={expired.length ? 'bad' : 'good'} />
        <Stat label="Expiring ≤ 90 days" value={d90.length} sub={`${d90.filter((p) => p.renewalStatus).length} with renewal in progress`} tone="warn" />
        <Stat label="Next external audit" value="22 Apr" sub="ISO 45001 / 14001 recertification" icon={<RefreshCw size={16} />} />
      </Grid>
      {expired.length > 0 && (
        <div className="mb-4">
          <Callout tone="red" title={`${expired[0].name} expired ${date(expired[0].expiry)}`}>
            {expired[0].renewalStatus}. Mobilisation of new crew to {expired[0].site} is flagged on the planning board until the client confirms.
          </Callout>
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search permit, number, issuer…" className="w-full sm:w-72" />
        <Select value={cat} onChange={(e) => setCat(e.target.value)}>
          {['All', 'Management system', 'Environmental permit', 'Waste permit', 'Operating licence', 'Client site pass'].map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select value={tier} onChange={(e) => setTier(e.target.value)}>
          {['All', 'Expired', '≤ 30 days', '≤ 60 days', '≤ 90 days', 'Valid'].map((c) => <option key={c}>{c}</option>)}
        </Select>
      </div>
      <Card padded={false}>
        <DataTable
          rows={rows}
          rowKey={(p) => p.id}
          onRowClick={setSel}
          rowClassName={(p) => (daysUntil(p.expiry) < 0 ? 'bg-red-50/50' : undefined)}
          columns={[
            { key: 'n', header: 'Permit / certificate', render: (p) => <div className="min-w-[260px]"><div className="text-sm font-medium text-slate-800">{p.name}</div><div className="font-mono text-[11px] text-slate-500">{p.number}</div></div> },
            { key: 'c', header: 'Category', render: (p) => <Badge>{p.category}</Badge> },
            { key: 'i', header: 'Issuer', render: (p) => <span className="text-xs text-slate-600">{p.issuer}</span> },
            { key: 's', header: 'Site', render: (p) => p.site },
            { key: 'x', header: 'Expiry', render: (p) => <span className="font-medium">{date(p.expiry)}</span> },
            { key: 'd', header: 'Days left', align: 'right', render: (p) => <DaysLeft expiry={p.expiry} /> },
            { key: 't', header: 'Alert', render: (p) => <TierBadge expiry={p.expiry} /> },
            { key: 'o', header: 'Owner', render: (p) => <Person id={p.ownerId} /> },
            { key: 'r', header: 'Renewal', render: (p) => <span className="block max-w-[200px] text-xs text-slate-600">{p.renewalStatus ?? '—'}</span> },
          ]}
        />
      </Card>

      {sel && (
        <Drawer open onClose={() => setSel(null)} title={sel.name} width="max-w-xl"
          footer={<><Button onClick={() => setSel(null)}>Close</Button><Button variant="primary" icon={<Upload size={15} />} onClick={() => renew(sel)}>Upload renewed permit</Button></>}>
          <DescList cols={2} items={[
            { label: 'Number', value: <Mono>{sel.number}</Mono> },
            { label: 'Category', value: sel.category },
            { label: 'Issuer', value: sel.issuer },
            { label: 'Holder / site', value: `${sel.holder} · ${sel.site}` },
            { label: 'Issued', value: date(sel.issued) },
            { label: 'Expiry', value: <span className="flex items-center gap-2">{date(sel.expiry)} <TierBadge expiry={sel.expiry} /></span> },
            { label: 'Owner', value: <Person id={sel.ownerId} sub /> },
            { label: 'Renewal', value: sel.renewalStatus ?? 'Not started' },
          ]} />
          <h4 className="mt-5 mb-2 text-sm font-semibold">Notification history</h4>
          <Timeline items={[
            ...(daysUntil(sel.expiry) <= 90 ? [{ time: '90 days before', title: 'Reminder e-mailed to owner', tone: 'sky' as const }] : []),
            ...(daysUntil(sel.expiry) <= 60 ? [{ time: '60 days before', title: 'Renewal task created in owner inbox', tone: 'amber' as const }] : []),
            ...(daysUntil(sel.expiry) <= 30 ? [{ time: '30 days before', title: 'Escalated to HSE Manager & Operations Director', tone: 'orange' as const }] : []),
            ...(daysUntil(sel.expiry) < 0 ? [{ time: date(sel.expiry), title: 'Expired — daily escalation active', tone: 'red' as const }] : []),
            { time: date(sel.issued), title: 'Permit registered with scan attached', tone: 'green' as const },
          ]} />
          <h4 className="mt-5 mb-2 text-sm font-semibold">Documents</h4>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2"><FileText size={14} className="text-slate-400" />{sel.number.replace(/\//g, '-')}.pdf <Badge>current</Badge></li>
            <li className="flex items-center gap-2 text-slate-500"><FileText size={14} className="text-slate-400" />Previous version (superseded).pdf</li>
          </ul>
          <div className="mt-5"><FormField label="New expiry date (on renewal)"><Input type="date" value={exp} onChange={(e) => setExp(e.target.value)} /></FormField></div>
        </Drawer>
      )}
    </>
  )
}
