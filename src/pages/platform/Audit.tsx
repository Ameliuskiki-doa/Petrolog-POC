import { useState } from 'react'
import { Lock, ScrollText, Download, ShieldCheck } from 'lucide-react'
import { Badge, Button, Callout, Card, DataTable, DescList, Drawer, Grid, Input, Mono, PageHeader, SearchInput, Select, Stat } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { dateTime } from '@/lib/format'
import { auditLog, type AuditEntry } from '@/data/platform'

const actionTone: Record<AuditEntry['action'], 'slate' | 'blue' | 'green' | 'red' | 'violet' | 'amber' | 'orange'> = {
  Create: 'blue', Update: 'slate', Approve: 'green', Reject: 'red', 'Delete (soft)': 'orange', Login: 'slate', Post: 'violet', 'Config change': 'amber', 'Role assignment': 'amber',
}

export default function Audit() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [entity, setEntity] = useState('All')
  const [action, setAction] = useState('All')
  const [source, setSource] = useState('All')
  const [from, setFrom] = useState('2028-03-01')
  const [sel, setSel] = useState<AuditEntry | null>(null)

  const rows = auditLog.filter(
    (a) =>
      (entity === 'All' || a.entity === entity) &&
      (action === 'All' || a.action === action) &&
      (source === 'All' || a.source === source) &&
      a.time.slice(0, 10) >= from &&
      (!q || `${a.actor} ${a.entityId} ${a.field ?? ''} ${a.before ?? ''} ${a.after ?? ''}`.toLowerCase().includes(q.toLowerCase())),
  )

  return (
    <>
      <PageHeader
        module="Platform · Audit Trail"
        title="Audit Trail"
        subtitle="Every data change is recorded with actor, timestamp, before and after values, and source."
        actions={<Button icon={<Download size={15} />} onClick={() => toast(`Exported ${rows.length} audit entries (CSV, signed hash manifest)`, 'success')}>Export</Button>}
      />
      <div className="mb-4">
        <Callout tone="slate" icon={<Lock size={16} />} title="Immutable by design">
          Audit records are append-only and hash-chained. They cannot be altered or deleted by any user — including system administrators. The database role used by the application has INSERT but no UPDATE/DELETE on the audit schema.
        </Callout>
      </div>
      <Grid cols={4} className="mb-5">
        <Stat label="Entries (last 24 h)" value="48,212" sub="Web 61% · mobile 22% · system 17%" icon={<ScrollText size={16} />} />
        <Stat label="Hash chain" value="Verified" sub="Last integrity check 10 Mar 2028, 06:00" tone="good" icon={<ShieldCheck size={16} />} />
        <Stat label="Privileged actions (24 h)" value="37" sub="Config changes, role assignments, period lock" tone="warn" />
        <Stat label="Retention" value="10 years" sub="Tiered to archive after 13 months" />
      </Grid>
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search actor, record, value…" className="w-full sm:w-72" />
        <Select value={entity} onChange={(e) => setEntity(e.target.value)}>{['All', ...new Set(auditLog.map((a) => a.entity))].map((x) => <option key={x}>{x}</option>)}</Select>
        <Select value={action} onChange={(e) => setAction(e.target.value)}>{['All', ...Object.keys(actionTone)].map((x) => <option key={x}>{x}</option>)}</Select>
        <Select value={source} onChange={(e) => setSource(e.target.value)}>{['All', 'Web', 'Mobile', 'API', 'System job', 'Vendor portal'].map((x) => <option key={x}>{x}</option>)}</Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
      </div>
      <Card padded={false}>
        <DataTable
          rows={rows}
          rowKey={(a) => a.id}
          onRowClick={setSel}
          dense
          columns={[
            { key: 't', header: 'Timestamp', render: (a) => <span className="text-xs whitespace-nowrap">{dateTime(a.time)}:{a.time.slice(17, 19)}</span> },
            { key: 'u', header: 'Actor', render: (a) => <span className="text-sm">{a.actor}</span> },
            { key: 'a', header: 'Action', render: (a) => <Badge tone={actionTone[a.action]}>{a.action}</Badge> },
            { key: 'e', header: 'Entity', render: (a) => <div className="text-xs">{a.entity}<div><Mono>{a.entityId}</Mono></div></div> },
            { key: 'f', header: 'Field', render: (a) => <span className="text-xs">{a.field}</span> },
            { key: 'b', header: 'Before', render: (a) => <span className="block max-w-[180px] truncate text-xs text-red-700" title={a.before}>{a.before}</span> },
            { key: 'af', header: 'After', render: (a) => <span className="block max-w-[240px] truncate text-xs text-emerald-700" title={a.after}>{a.after}</span> },
            { key: 's', header: 'Source', render: (a) => <Badge>{a.source}</Badge> },
          ]}
        />
      </Card>
      {sel && (
        <Drawer open onClose={() => setSel(null)} title={`Audit entry ${sel.id}`}>
          <DescList cols={2} items={[
            { label: 'Timestamp (WIB)', value: `${dateTime(sel.time)}:${sel.time.slice(17, 19)}` },
            { label: 'Actor', value: `${sel.actor}${sel.actorId ? ` (${sel.actorId})` : ''}` },
            { label: 'Action', value: <Badge tone={actionTone[sel.action]}>{sel.action}</Badge> },
            { label: 'Source / IP', value: `${sel.source} · ${sel.ip}` },
            { label: 'Entity', value: `${sel.entity} ${sel.entityId}` },
            { label: 'Field', value: sel.field ?? '—' },
          ]} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-red-50 p-3"><div className="text-xs font-semibold text-red-700">Before</div><div className="mt-1 font-mono text-[12px] break-words text-red-900">{sel.before ?? '—'}</div></div>
            <div className="rounded-lg bg-emerald-50 p-3"><div className="text-xs font-semibold text-emerald-700">After</div><div className="mt-1 font-mono text-[12px] break-words text-emerald-900">{sel.after ?? '—'}</div></div>
          </div>
          <div className="mt-5 rounded-lg border border-slate-200 p-3 text-xs text-slate-500">
            <div>Record hash <Mono className="text-slate-700">sha256:{(parseInt(sel.id.slice(4), 10) * 2654435761).toString(16).slice(0, 12)}…</Mono></div>
            <div className="mt-1">Chained to previous entry · write-once storage · no edit or delete available</div>
          </div>
        </Drawer>
      )}
    </>
  )
}
