import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, ExternalLink, Lock, Printer, RotateCcw, CircleCheck, Link2 } from 'lucide-react'
import { getJournal, getAccount, getCostCentre, journalTotal, type Journal } from '@/data/finance'
import { PageHeader, Card, CardHeader, DataTable, DescList, StatusBadge, ProjectCodeChip, Mono, Button, Timeline, Callout, Modal, FormField, Input, Badge, type Column } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, dateTime, idr, period } from '@/lib/format'
import { ArchiveNote, BLTag, empName } from './components'
import type { JournalLine } from '@/data/finance'

export default function JournalDetail() {
  const { id = '' } = useParams()
  const toast = useToast()
  const base = useMemo(() => getJournal(id), [id])
  const [j, setJ] = useState<Journal>(base)
  const [jid, setJid] = useState(id)
  const [reverseOpen, setReverseOpen] = useState(false)
  const [reason, setReason] = useState('')
  if (jid !== id) {
    setJid(id)
    setJ(base)
  }

  const locked = j.period < '2028-03'
  const total = journalTotal(j)
  const credit = j.lines.reduce((s, l) => s + l.credit, 0)
  const primary = j.trace[0]

  const byProject = useMemo(() => {
    const m = new Map<string, { debit: number; credit: number }>()
    for (const l of j.lines) {
      const x = m.get(l.projectCode) ?? { debit: 0, credit: 0 }
      x.debit += l.debit
      x.credit += l.credit
      m.set(l.projectCode, x)
    }
    return [...m.entries()]
  }, [j])

  const columns: Column<JournalLine & { n: number }>[] = [
    { key: 'n', header: '#', render: (l) => <span className="text-slate-400">{l.n}</span> },
    {
      key: 'acc', header: 'Account',
      render: (l) => (
        <Link to={`/finance/gl?account=${l.account}`} className="block min-w-[200px] hover:underline">
          <Mono className="text-slate-900">{l.account}</Mono> <span className="text-slate-600">{getAccount(l.account)?.name}</span>
        </Link>
      ),
    },
    { key: 'cc', header: 'Cost centre', render: (l) => <span className="whitespace-nowrap"><Mono>{l.costCentre}</Mono> <span className="text-xs text-slate-500">{getCostCentre(l.costCentre)?.name}</span></span> },
    { key: 'pc', header: 'Project code', render: (l) => <ProjectCodeChip code={l.projectCode} /> },
    { key: 'bl', header: 'Business line', render: (l) => <BLTag bl={l.businessLine} /> },
    { key: 'memo', header: 'Line memo', render: (l) => <span className="text-xs text-slate-600">{l.memo}</span> },
    { key: 'dr', header: 'Debit', align: 'right', render: (l) => (l.debit ? idr(l.debit) : '') },
    { key: 'cr', header: 'Credit', align: 'right', render: (l) => (l.credit ? idr(l.credit) : '') },
  ]

  const audit = [
    { time: dateTime(j.postedAt ?? j.date + 'T09:00'), title: j.auto ? `Generated from ${j.sourceType.toLowerCase()}` : `Created by ${empName(j.createdBy)}`, body: j.auto ? `Rule-based posting · prepared by ${empName(j.createdBy)}` : 'Manual journal — dimension validation passed', tone: 'blue' as const },
    ...(j.approvedBy ? [{ time: j.postedAt ? dateTime(j.postedAt) : '', title: `Approved by ${empName(j.approvedBy)}`, body: 'Workflow step: Accounting approval', tone: 'green' as const }] : []),
    ...(j.status !== 'Draft' && j.status !== 'Pending Approval' && j.postedAt ? [{ time: dateTime(j.postedAt), title: `Posted to ${period(j.period)}`, body: 'Journal locked — immutable from this point', tone: 'green' as const }] : []),
    ...(j.status === 'Pending Approval' ? [{ time: 'Waiting', title: 'Awaiting approval — Ratna Sari Dewi', body: 'Finance Director (manual journals > IDR 5 m)', tone: 'amber' as const }] : []),
    ...(j.reversedBy ? [{ time: 'Later', title: `Reversed by ${j.reversedBy}`, body: 'Original retained for audit; effect neutralised', tone: 'violet' as const }] : []),
  ]

  const doReverse = () => {
    if (reason.trim().length < 8) {
      toast('Give a reason for the reversal (min. 8 characters)', 'error')
      return
    }
    const rid = `JV-2028-03-${String(21 + Math.floor(Math.random() * 20)).padStart(4, '0')}`
    setJ({ ...j, status: 'Reversed', reversedBy: rid })
    setReverseOpen(false)
    toast(`Reversing entry ${rid} posted to Mar 2028${locked ? ` — ${period(j.period)} remains locked` : ''}`, 'success')
  }

  return (
    <div>
      <PageHeader
        module="M8 · General Ledger"
        crumbs={[{ label: 'Finance' }, { label: 'General Ledger', to: '/finance/gl' }, { label: j.id }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{j.id}</span>
            <StatusBadge status={j.status} />
            <Badge tone="slate">{j.sourceType}</Badge>
            {j.reversalOf && <Badge tone="violet">Reversing entry</Badge>}
          </span>
        }
        subtitle={j.narrative.find((n) => n.label === 'Description')?.value}
        actions={
          <>
            <Button icon={<Printer size={15} />} onClick={() => toast('Journal voucher sent to printer', 'info')}>Print voucher</Button>
            {j.status === 'Pending Approval' && (
              <Button variant="success" icon={<CircleCheck size={15} />} onClick={() => { setJ({ ...j, status: 'Posted', approvedBy: 'EMP-0002', postedAt: '2028-03-10T10:15' }); toast(`${j.id} approved and posted`, 'success') }}>
                Approve & post
              </Button>
            )}
            {j.status === 'Posted' && !j.reversalOf && j.sourceType !== 'Opening Balance' && (
              <Button variant="danger" icon={<RotateCcw size={15} />} onClick={() => setReverseOpen(true)}>Reverse</Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <DescList
              cols={4}
              items={[
                { label: 'Document date', value: date(j.date) },
                { label: 'Posting period', value: <span className="flex items-center gap-1">{period(j.period)} {locked && <Lock size={12} className="text-slate-400" />}</span> },
                { label: 'Cost attribution period', value: j.attributionPeriod ? <span className="text-sky-700">{period(j.attributionPeriod)} (controlled reopening)</span> : period(j.period) },
                { label: 'Total', value: idr(total) },
                { label: 'Prepared by', value: empName(j.createdBy) },
                { label: 'Approved by', value: j.approvedBy ? empName(j.approvedBy) : '—' },
                { label: 'Posted at', value: j.postedAt ? dateTime(j.postedAt) : 'Not posted' },
                { label: 'Origin', value: j.auto ? 'Subsidiary ledger (automatic)' : 'Manual' },
              ]}
            />
          </Card>

          {primary && (
            <Card className="border-sky-200 bg-sky-50/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Link2 size={18} className="text-sky-600" />
                  <div>
                    <div className="text-xs text-slate-500">Source document · traceable in one step (FAT-31)</div>
                    <div className="text-sm font-semibold text-slate-900">
                      {primary.kind} <span className="font-mono">{primary.ref}</span>
                    </div>
                  </div>
                </div>
                {primary.to ? (
                  <Link to={primary.to}>
                    <Button variant="primary" icon={<ExternalLink size={15} />}>Open source document</Button>
                  </Link>
                ) : (
                  <ArchiveNote />
                )}
              </div>
            </Card>
          )}

          {(j.reversedBy || j.reversalOf || j.correctedBy || j.attributionPeriod) && (
            <div className="space-y-2">
              {j.reversedBy && (
                <Callout tone="violet" icon={<RotateCcw size={16} />} title="This journal has been reversed">
                  Reversed by <Link className="font-mono underline" to={`/finance/gl/${j.reversedBy}`}>{j.reversedBy}</Link>
                  {j.correctedBy && <> and re-posted correctly as <Link className="font-mono underline" to={`/finance/gl/${j.correctedBy}`}>{j.correctedBy}</Link></>}. The original stays in the ledger unchanged for audit.
                </Callout>
              )}
              {j.reversalOf && (
                <Callout tone="violet" icon={<RotateCcw size={16} />} title="Reversing entry">
                  Mirrors <Link className="font-mono underline" to={`/finance/gl/${j.reversalOf}`}>{j.reversalOf}</Link> line by line with debit and credit swapped, on identical dimensions.
                </Callout>
              )}
              {j.attributionPeriod && (
                <Callout tone="sky" icon={<Lock size={16} />} title="Controlled reopening">
                  Posted in {period(j.period)} per accounting principle; cost attributed to {period(j.attributionPeriod)} on the originating project code, so project P/L stays accurate without unlocking the closed period.{' '}
                  <Link to="/costing/late-costs" className="underline">View late costs</Link>
                </Callout>
              )}
            </div>
          )}

          <Card padded={false}>
            <div className="px-4 pt-4"><CardHeader title="Journal lines" subtitle="Four dimensions per line — account · cost centre · project code · business line" /></div>
            <DataTable
              columns={columns}
              rows={j.lines.map((l, i) => ({ ...l, n: i + 1 }))}
              rowKey={(l) => String(l.n)}
              dense
              footer={
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-right text-xs text-slate-500 uppercase">Totals {total === credit ? '· balanced' : '· OUT OF BALANCE'}</td>
                  <td className="num px-3 py-2 text-right">{idr(total)}</td>
                  <td className="num px-3 py-2 text-right">{idr(credit)}</td>
                </tr>
              }
            />
          </Card>
          {j.sourceType === 'Opening Balance' && <ArchiveNote>balances migrated under CUT-01 from the 31 Dec 2027 trial balance</ArchiveNote>}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Structured narrative" subtitle="Fixed fields, generated from the source document" />
            <dl className="space-y-2">
              {j.narrative.map((n) => (
                <div key={n.label} className="grid grid-cols-[96px_1fr] gap-2 text-sm">
                  <dt className="text-slate-500">{n.label}</dt>
                  <dd className="font-medium text-slate-800">{n.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Trace" subtitle="Related documents" />
            <ul className="divide-y divide-slate-100">
              {j.trace.map((t) => (
                <li key={t.kind + t.ref} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">{t.kind}</div>
                    <div className="truncate font-mono text-[12px] text-slate-800">{t.ref}</div>
                  </div>
                  {t.to && (
                    <Link to={t.to} className="shrink-0 text-sky-700 hover:text-sky-900">
                      <ArrowRight size={16} />
                    </Link>
                  )}
                </li>
              ))}
              {j.trace.length === 0 && <li className="py-2 text-sm text-slate-500">Manual journal — no source document</li>}
            </ul>
          </Card>

          <Card>
            <CardHeader title="By project code" />
            <div className="space-y-1.5">
              {byProject.map(([pc, v]) => (
                <div key={pc} className="flex items-center justify-between gap-2 text-sm">
                  <ProjectCodeChip code={pc} />
                  <span className="num text-slate-700">{v.debit ? `Dr ${idr(v.debit)}` : ''}{v.debit && v.credit ? ' / ' : ''}{v.credit ? `Cr ${idr(v.credit)}` : ''}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Audit trail" />
            <Timeline items={audit} />
          </Card>
        </div>
      </div>

      <Modal
        open={reverseOpen}
        onClose={() => setReverseOpen(false)}
        title={`Reverse ${j.id}`}
        footer={
          <>
            <Button onClick={() => setReverseOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={doReverse}>Post reversing entry</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">
            A reversing entry mirrors all {j.lines.length} lines with debit and credit swapped on identical dimensions. The original journal is never edited or deleted.
          </p>
          {locked && <Callout tone="amber" title={`${period(j.period)} is locked`}>The reversal posts to the current open period (Mar 2028). Project attribution follows the original lines.</Callout>}
          <FormField label="Reason (recorded in audit trail)">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong cost centre — re-post to CC-310" />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
