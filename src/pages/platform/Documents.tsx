import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderOpen, Upload, FileText, FileImage, Link2, Archive, History, Download, ShieldCheck } from 'lucide-react'
import { Badge, Button, Card, DataTable, DescList, Drawer, Grid, Mono, PageHeader, ProjectCodeChip, SearchInput, Select, Stat, Tabs, Timeline } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, dateTime } from '@/lib/format'
import { getEmployee } from '@/data/core'
import { documents, type DocRecord } from '@/data/platform'

type TabKey = 'all' | 'retention'

const retentionPolicies = [
  { cls: 'Tax & accounting records (invoices, e-Faktur, POD, journals)', period: '10 years', basis: 'UU KUP art. 28 (11)', action: 'Archive to cold storage after 2 years; purge after 10 years with approval', docs: 18_420 },
  { cls: 'Contracts & amendments', period: '10 years after contract end', basis: 'Company policy / limitation period', action: 'Legal hold on dispute', docs: 612 },
  { cls: 'Equipment certificates & inspection reports', period: 'Life of asset + 5 years', basis: 'Permenaker 8/2020 (K3 pesawat angkat)', action: 'Retain with asset record', docs: 2_184 },
  { cls: 'HSE incident & investigation records', period: '30 years (occupational health)', basis: 'ISO 45001 / SMK3 PP 50/2012', action: 'No purge', docs: 944 },
  { cls: 'B3 waste manifests', period: '5 years', basis: 'PP 22/2021', action: 'Archive after close', docs: 318 },
  { cls: 'Personal data (ID scans in licences)', period: 'Employment + 2 years', basis: 'UU PDP 27/2022', action: 'Masked outside production; purge on schedule', docs: 1_207 },
]

export default function Documents() {
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('all')
  const [q, setQ] = useState('')
  const [type, setType] = useState('All')
  const [sel, setSel] = useState<DocRecord | null>(null)

  const rows = documents.filter(
    (d) => (type === 'All' || d.type === type) && (!q || `${d.id} ${d.name} ${d.boundTo.id} ${d.projectCode ?? ''} ${d.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())),
  )

  return (
    <>
      <PageHeader
        module="Platform · Document Management"
        title="Documents"
        subtitle="Every document is bound to the transaction it evidences — contract, PO, job POD, invoice, certificate — versioned, searchable and held under a retention policy."
        actions={<Button variant="primary" icon={<Upload size={15} />} onClick={() => toast('Upload started — choose the transaction to bind the document to', 'info')}>Upload</Button>}
      />
      <Grid cols={4} className="mb-5">
        <Stat label="Documents stored" value="23,685" sub="1.8 TB · object storage, encrypted at rest" icon={<FolderOpen size={16} />} />
        <Stat label="Bound to a transaction" value="99.2%" sub="Unbound uploads flagged for filing" tone="good" icon={<Link2 size={16} />} />
        <Stat label="Captured from mobile (MTD)" value="1,412" sub="POD photos, signatures, P2H, incidents" />
        <Stat label="Due for archive this quarter" value="2,960" sub="Cold storage — still searchable" icon={<Archive size={16} />} />
      </Grid>
      <Tabs<TabKey> value={tab} onChange={setTab} tabs={[{ key: 'all', label: 'Repository', count: documents.length }, { key: 'retention', label: 'Retention policy', count: retentionPolicies.length }]} />
      {tab === 'all' ? (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Full-text search: name, transaction, project code, tag…" className="w-full sm:w-96" />
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {['All', ...new Set(documents.map((d) => d.type))].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </div>
          <Card padded={false}>
            <DataTable
              rows={rows}
              rowKey={(d) => d.id}
              onRowClick={setSel}
              columns={[
                { key: 'n', header: 'Document', render: (d) => (
                  <div className="flex min-w-[280px] items-start gap-2">
                    {d.name.endsWith('.jpg') ? <FileImage size={16} className="mt-0.5 shrink-0 text-sky-500" /> : <FileText size={16} className="mt-0.5 shrink-0 text-red-500" />}
                    <div className="min-w-0"><div className="truncate text-sm font-medium text-slate-800">{d.name}</div><div className="text-xs text-slate-500"><Mono>{d.id}</Mono> · {d.size}</div></div>
                  </div>
                ) },
                { key: 't', header: 'Type', render: (d) => <Badge>{d.type}</Badge> },
                { key: 'b', header: 'Bound to', render: (d) => (d.boundTo.to ? <Link onClick={(e) => e.stopPropagation()} to={d.boundTo.to} className="text-xs text-brand-700 hover:underline">{d.boundTo.kind} <span className="font-mono">{d.boundTo.id}</span></Link> : <span className="text-xs">{d.boundTo.kind} {d.boundTo.id}</span>) },
                { key: 'p', header: 'Project', render: (d) => (d.projectCode ? <ProjectCodeChip code={d.projectCode} /> : <span className="text-slate-300">—</span>) },
                { key: 'v', header: 'Ver.', align: 'center', render: (d) => <Badge tone={d.version > 1 ? 'violet' : 'slate'}>v{d.version}</Badge> },
                { key: 'u', header: 'Uploaded', render: (d) => <div className="text-xs"><div>{getEmployee(d.uploadedBy)?.name}</div><div className="text-slate-500">{dateTime(d.uploaded)}</div></div> },
                { key: 'r', header: 'Retention', render: (d) => <span className="text-xs text-slate-600">{d.retention}</span> },
              ]}
            />
          </Card>
        </>
      ) : (
        <Card padded={false}>
          <DataTable
            rows={retentionPolicies}
            rowKey={(r) => r.cls}
            columns={[
              { key: 'c', header: 'Document class', render: (r) => <span className="text-sm font-medium">{r.cls}</span> },
              { key: 'p', header: 'Retention', render: (r) => r.period },
              { key: 'b', header: 'Basis', render: (r) => <span className="text-xs text-slate-600">{r.basis}</span> },
              { key: 'a', header: 'Lifecycle action', render: (r) => <span className="text-xs text-slate-600">{r.action}</span> },
              { key: 'd', header: 'Documents', align: 'right', render: (r) => r.docs.toLocaleString('en-US') },
            ]}
          />
          <p className="flex items-center gap-1.5 p-3 text-xs text-slate-500"><ShieldCheck size={13} /> Documents under retention cannot be deleted by any user; purge runs only after the period ends and requires approval, and is itself audit-logged.</p>
        </Card>
      )}

      {sel && (
        <Drawer open onClose={() => setSel(null)} title={sel.name} width="max-w-2xl" footer={<><Button icon={<Download size={15} />} onClick={() => toast(`${sel.name} downloaded (watermarked)`, 'success')}>Download</Button><Button variant="primary" icon={<Upload size={15} />} onClick={() => toast(`New version v${sel.version + 1} uploaded — v${sel.version} retained`, 'success')}>Upload new version</Button></>}>
          <div className="mb-4 flex aspect-[4/3] max-h-72 w-full flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
            {sel.name.endsWith('.jpg') ? <FileImage size={40} /> : <FileText size={40} />}
            <div className="mt-2 text-xs">Preview · page 1 of {sel.type === 'Contract' ? 42 : sel.type === 'Report' ? 18 : 2}</div>
            <div className="mt-1 max-w-[80%] truncate text-center text-sm font-medium text-slate-600">{sel.name}</div>
          </div>
          <DescList cols={2} items={[
            { label: 'Document ID', value: <Mono>{sel.id}</Mono> },
            { label: 'Type', value: sel.type },
            { label: 'Bound to', value: sel.boundTo.to ? <Link to={sel.boundTo.to} className="text-brand-700 hover:underline">{sel.boundTo.kind} {sel.boundTo.id}</Link> : `${sel.boundTo.kind} ${sel.boundTo.id}` },
            { label: 'Project code', value: sel.projectCode ? <ProjectCodeChip code={sel.projectCode} showName /> : '—' },
            { label: 'Retention', value: sel.retention },
            { label: 'Tags', value: <div className="flex flex-wrap gap-1">{sel.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div> },
          ]} />
          <h4 className="mt-5 mb-2 flex items-center gap-1.5 text-sm font-semibold"><History size={14} /> Version history</h4>
          <Timeline items={(sel.versions ?? [{ v: 1, date: sel.uploaded.slice(0, 10), by: getEmployee(sel.uploadedBy)?.name ?? '', note: 'Original upload' }]).map((v) => ({ time: date(v.date), title: `v${v.v} — ${v.note}`, body: `by ${v.by}`, tone: v.v === sel.version ? 'green' : 'slate' }))} />
        </Drawer>
      )}
    </>
  )
}
