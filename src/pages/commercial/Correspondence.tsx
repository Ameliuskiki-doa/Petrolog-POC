import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, FileText, Link2, NotebookPen, Paperclip, Plus } from 'lucide-react'
import { Badge, Button, Callout, Card, DataTable, Drawer, FormField, Grid, Input, PageHeader, SearchInput, Select, Stat, Tabs } from '@/components/ui'
import { contracts } from '@/data/core'
import { correspondence as seed, type Correspondence as Corr } from '@/data/commercial'
import { date, TODAY_ISO } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { MODULE_CRM, Person, TextLink } from './shared'
import { useOpps } from './store'

type Kind = 'all' | Corr['kind']

const kindTone = (k: Corr['kind']) => (k === 'Inbound letter' ? 'sky' : k === 'Outbound letter' ? 'violet' : k === 'Meeting minutes' ? 'amber' : 'slate')
const kindIcon = (k: Corr['kind']) => (k === 'Inbound letter' ? <ArrowDownLeft size={13} /> : k === 'Outbound letter' ? <ArrowUpRight size={13} /> : k === 'Meeting minutes' ? <NotebookPen size={13} /> : <FileText size={13} />)

export default function Correspondence() {
  const opps = useOpps()
  const toast = useToast()
  const [items, setItems] = useState<Corr[]>(seed)
  const [kind, setKind] = useState<Kind>('all')
  const [bound, setBound] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const boundLabel = (c: Corr) => (c.bound.type === 'opportunity' ? opps.find((o) => o.id === c.bound.id)?.title : contracts.find((k) => k.id === c.bound.id)?.title) ?? ''
  const rows = items
    .filter((c) => (kind === 'all' || c.kind === kind) && (!bound || c.bound.id === bound) && (!q || `${c.subject} ${c.ref} ${c.counterparty} ${c.summary}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.date.localeCompare(a.date))

  const count = (k: Corr['kind']) => items.filter((c) => c.kind === k).length

  return (
    <>
      <PageHeader
        module={MODULE_CRM}
        title="Correspondence database"
        subtitle="Inbound and outbound letters and meeting minutes. Each item is bound to an opportunity or a contract, never stored loose (BDS-08)."
        actions={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setOpen(true)}>Record correspondence</Button>}
      />
      <Grid cols={4} className="mb-4">
        <Stat label="Inbound letters" value={count('Inbound letter')} icon={<ArrowDownLeft size={16} />} />
        <Stat label="Outbound letters" value={count('Outbound letter')} icon={<ArrowUpRight size={16} />} />
        <Stat label="Meeting minutes" value={count('Meeting minutes')} icon={<NotebookPen size={16} />} />
        <Stat label="Unbound items" value={0} sub="Binding is mandatory on entry" tone="good" icon={<Link2 size={16} />} />
      </Grid>

      <Tabs<Kind>
        value={kind}
        onChange={setKind}
        tabs={[
          { key: 'all', label: 'All', count: items.length },
          { key: 'Inbound letter', label: 'Inbound', count: count('Inbound letter') },
          { key: 'Outbound letter', label: 'Outbound', count: count('Outbound letter') },
          { key: 'Meeting minutes', label: 'Minutes', count: count('Meeting minutes') },
          { key: 'Email record', label: 'Email records', count: count('Email record') },
        ]}
      />

      <Card padded={false}>
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
          <SearchInput value={q} onChange={setQ} placeholder="Search subject, reference, counterparty…" className="w-full sm:w-72" />
          <Select value={bound} onChange={(e) => setBound(e.target.value)}>
            <option value="">Bound to: any</option>
            <optgroup label="Opportunities">{opps.map((o) => <option key={o.id} value={o.id}>{o.id} — {o.title.slice(0, 40)}</option>)}</optgroup>
            <optgroup label="Contracts">{contracts.map((c) => <option key={c.id} value={c.id}>{c.id} — {c.title.slice(0, 40)}</option>)}</optgroup>
          </Select>
        </div>
        <DataTable
          rows={rows}
          rowKey={(c) => c.id}
          columns={[
            { key: 'd', header: 'Date', render: (c) => <span className="whitespace-nowrap">{date(c.date)}</span> },
            { key: 'k', header: 'Type', render: (c) => <Badge tone={kindTone(c.kind)}>{kindIcon(c.kind)}{c.kind}</Badge> },
            { key: 's', header: 'Subject', render: (c) => <div className="min-w-[280px]"><div className="font-medium text-slate-800">{c.subject}</div><div className="text-xs text-slate-500">{c.summary}</div></div> },
            { key: 'cp', header: 'Counterparty', render: (c) => <span className="text-slate-600">{c.counterparty}</span> },
            { key: 'r', header: 'Reference', render: (c) => <span className="font-mono text-[11px] whitespace-nowrap text-slate-500">{c.ref}</span> },
            { key: 'b', header: 'Bound to', render: (c) => <div className="min-w-[160px]"><TextLink to={c.bound.type === 'opportunity' ? `/crm/opportunities/${c.bound.id}` : `/contracts/${c.bound.id}`}>{c.bound.id}</TextLink><div className="truncate text-[11px] text-slate-500">{boundLabel(c)}</div></div> },
            { key: 'a', header: 'Recorded by', render: (c) => <Person id={c.authorId} /> },
            { key: 'att', header: '', align: 'right', render: (c) => c.attachments ? <span className="inline-flex items-center gap-0.5 text-xs text-slate-500"><Paperclip size={12} />{c.attachments}</span> : null },
          ]}
        />
      </Card>

      <NewCorrespondence
        open={open}
        onClose={() => setOpen(false)}
        onSave={(c) => {
          setItems((s) => [c, ...s])
          toast(`${c.id} recorded and bound to ${c.bound.id}`, 'success')
          setOpen(false)
        }}
        nextId={`COR-2028-${String(Math.max(...items.map((c) => Number(c.id.slice(-4)))) + 1).padStart(4, '0')}`}
      />
    </>
  )
}

function NewCorrespondence({ open, onClose, onSave, nextId }: { open: boolean; onClose: () => void; onSave: (c: Corr) => void; nextId: string }) {
  const opps = useOpps()
  const [f, setF] = useState({ kind: 'Inbound letter' as Corr['kind'], subject: '', counterparty: '', ref: '', bound: '', summary: '' })
  const [err, setErr] = useState('')
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }))
  const save = () => {
    if (!f.bound) return setErr('Correspondence must be bound to an opportunity or a contract before it can be saved.')
    if (!f.subject.trim()) return setErr('Subject is required.')
    const isContract = f.bound.startsWith('CTR')
    onSave({ id: nextId, kind: f.kind, date: TODAY_ISO, ref: f.ref || '—', subject: f.subject, counterparty: f.counterparty || '—', authorId: 'EMP-0011', bound: { type: isContract ? 'contract' : 'opportunity', id: f.bound }, attachments: 1, summary: f.summary || '—' })
    setErr('')
    setF({ kind: 'Inbound letter', subject: '', counterparty: '', ref: '', bound: '', summary: '' })
  }
  return (
    <Drawer open={open} onClose={onClose} title="Record correspondence" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        <FormField label="Type">
          <Select className="w-full" value={f.kind} onChange={(e) => set('kind', e.target.value)}>
            {['Inbound letter', 'Outbound letter', 'Meeting minutes', 'Email record'].map((k) => <option key={k}>{k}</option>)}
          </Select>
        </FormField>
        <FormField label="Bound to (mandatory)" hint="Pick the opportunity or contract this item belongs to.">
          <Select className="w-full" value={f.bound} onChange={(e) => set('bound', e.target.value)}>
            <option value="">Select…</option>
            <optgroup label="Opportunities">{opps.map((o) => <option key={o.id} value={o.id}>{o.id} — {o.title}</option>)}</optgroup>
            <optgroup label="Contracts">{contracts.map((c) => <option key={c.id} value={c.id}>{c.id} — {c.title}</option>)}</optgroup>
          </Select>
        </FormField>
        <FormField label="Subject"><Input value={f.subject} onChange={(e) => set('subject', e.target.value)} /></FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Counterparty"><Input value={f.counterparty} onChange={(e) => set('counterparty', e.target.value)} /></FormField>
          <FormField label="Letter reference"><Input value={f.ref} onChange={(e) => set('ref', e.target.value)} placeholder="e.g. PI/BD/OUT/2028/0121" /></FormField>
        </div>
        <FormField label="Summary"><Input value={f.summary} onChange={(e) => set('summary', e.target.value)} /></FormField>
        <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500"><Paperclip size={14} className="mx-auto mb-1" />Drop scanned letter or minutes (PDF) — stored in the document repository with version control</div>
        {err && <Callout tone="red">{err}</Callout>}
      </div>
    </Drawer>
  )
}
