import { useState } from 'react'
import { AlertTriangle, CalendarClock, FileText, Gavel, Landmark, Plus, ShieldCheck } from 'lucide-react'
import { Badge, Button, Callout, Card, CardHeader, DataTable, Grid, PageHeader, SearchInput, Select, Stat, StatusBadge, Tabs, Timeline, cx } from '@/components/ui'
import { tenders, type BidBond, type Tender } from '@/data/commercial'
import { date, daysUntil, idr, idrShort } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { BLTag, MODULE_CRM, TextLink, customerName } from './shared'
import { bondStore, useBonds } from './store'

const concluded = (t?: Tender) => !!t && (t.status === 'Won' || t.status === 'Lost' || t.status === 'Cancelled')
const tenderOf = (b: BidBond) => tenders.find((t) => t.id === b.tenderId)

/** A bond needs release action when its tender is concluded and it is still held by the client. */
const needsRelease = (b: BidBond) => concluded(tenderOf(b)) && (b.status === 'Active' || b.status === 'In issuance')

export default function Tenders() {
  const bonds = useBonds()
  const toast = useToast()
  const [tab, setTab] = useState<'tenders' | 'bonds'>('tenders')
  const [sel, setSel] = useState<string>('TDR-2028-006')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')

  const rows = tenders.filter((t) => (!status || t.status === status) && (!q || `${t.id} ${t.title} ${customerName(t.customerId)} ${t.clientRef}`.toLowerCase().includes(q.toLowerCase())))
  const selected = tenders.find((t) => t.id === sel) ?? tenders[0]
  const live = tenders.filter((t) => !concluded(t))
  const due30 = live.filter((t) => daysUntil(t.submission) >= 0 && daysUntil(t.submission) <= 30)
  const outstanding = bonds.filter((b) => b.status === 'Active' || b.status === 'In issuance' || b.status === 'Release requested')
  const releaseAlerts = bonds.filter(needsRelease)
  const expiringSoon = bonds.filter((b) => (b.status === 'Active') && !concluded(tenderOf(b)) && daysUntil(b.validUntil) <= 75)

  const requestRelease = (b: BidBond) => {
    bondStore.set((s) => s.map((x) => (x.id === b.id ? { ...x, status: 'Release requested' } : x)))
    toast(`Release request for ${b.bondNo} sent to ${customerName(tenderOf(b)?.customerId)} — letter logged in correspondence`, 'success')
  }

  return (
    <>
      <PageHeader
        module={MODULE_CRM}
        title="Tenders & bid bonds"
        subtitle="Tender schedule, bid documents and outcomes (BDS-05), with bid bond validity monitoring and release alerts on concluded tenders (BDS-06)."
        actions={<Button variant="primary" icon={<Plus size={16} />} onClick={() => toast('Tender registration form opens with client RFP reference and schedule', 'info')}>Register tender</Button>}
      />

      <Grid cols={4} className="mb-4">
        <Stat label="Live tenders" value={live.length} sub={`${tenders.filter((t) => t.status === 'Won').length} won · ${tenders.filter((t) => t.status === 'Lost').length} lost (12 months)`} icon={<Gavel size={16} />} />
        <Stat label="Submissions due ≤ 30 days" value={due30.length} sub={due30.map((t) => `${t.id.slice(-3)}: ${date(t.submission)}`).join(' · ') || '—'} tone={due30.length ? 'warn' : undefined} icon={<CalendarClock size={16} />} />
        <Stat label="Bid bonds outstanding" value={idrShort(outstanding.reduce((s, b) => s + b.amount, 0))} sub={`${outstanding.length} bonds held by clients`} icon={<Landmark size={16} />} />
        <Stat label="Bonds to recover" value={releaseAlerts.length} sub={releaseAlerts.length ? `${idrShort(releaseAlerts.reduce((s, b) => s + b.amount, 0))} tied up on concluded tenders` : 'All concluded tenders cleared'} tone={releaseAlerts.length ? 'bad' : 'good'} icon={<AlertTriangle size={16} />} />
      </Grid>

      {(releaseAlerts.length > 0 || expiringSoon.length > 0) && (
        <div className="mb-4 space-y-2">
          {releaseAlerts.map((b) => {
            const t = tenderOf(b)!
            return (
              <Callout key={b.id} tone="red" icon={<AlertTriangle size={18} />} title={`Release alert — ${b.bondNo} (${b.bank}, ${idr(b.amount)})`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>Tender {t.id} concluded as <b>{t.status}</b> on {date(t.schedule[t.schedule.length - 1].date)}; bond still held and valid until {date(b.validUntil)}. Bank charges continue to accrue.</span>
                  <Button size="sm" variant="danger" onClick={() => requestRelease(b)}>Request release</Button>
                </div>
              </Callout>
            )
          })}
          {expiringSoon.map((b) => (
            <Callout key={b.id} tone="amber" icon={<CalendarClock size={18} />} title={`Validity check — ${b.bondNo} expires ${date(b.validUntil)} (${daysUntil(b.validUntil)} days)`}>
              Tender {b.tenderId} is still in {tenderOf(b)?.status.toLowerCase()}; award is planned before expiry. Extension would need to be requested from {b.bank} at least 14 days ahead.
            </Callout>
          ))}
        </div>
      )}

      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'tenders', label: 'Tender schedule', count: tenders.length }, { key: 'bonds', label: 'Bid bond register', count: bonds.length }]} />

      {tab === 'tenders' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card padded={false} className="xl:col-span-2">
            <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
              <SearchInput value={q} onChange={setQ} placeholder="Search tender, client, reference…" className="w-full sm:w-64" />
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                {['Announced', 'Prequalification', 'Open', 'Submitted', 'Evaluation', 'Won', 'Lost'].map((s) => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <DataTable
              rows={rows}
              rowKey={(t) => t.id}
              onRowClick={(t) => setSel(t.id)}
              rowClassName={(t) => (t.id === selected.id ? 'bg-brand-50/60' : undefined)}
              columns={[
                { key: 'id', header: 'Tender', render: (t) => <div className="min-w-[220px]"><div className="font-mono text-[11px] text-slate-500">{t.id} · {t.clientRef}</div><div className="font-medium text-slate-800">{t.title}</div></div> },
                { key: 'c', header: 'Client', render: (t) => <span className="text-slate-600">{customerName(t.customerId)}</span> },
                { key: 'bl', header: 'Line', render: (t) => <BLTag bl={t.businessLine} /> },
                { key: 'sub', header: 'Submission', render: (t) => <SubmissionCell t={t} /> },
                { key: 's', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
                { key: 'o', header: 'Opportunity', render: (t) => (t.opportunityId ? <TextLink to={`/crm/opportunities/${t.opportunityId}`}>{t.opportunityId}</TextLink> : '—') },
              ]}
            />
          </Card>
          <Card>
            <CardHeader title={<span className="font-mono">{selected.id}</span>} subtitle={selected.title} actions={<StatusBadge status={selected.status} />} />
            <div className="mb-4 text-xs text-slate-500">{customerName(selected.customerId)} · ref {selected.clientRef}</div>
            <div className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Schedule</div>
            <Timeline
              items={selected.schedule.map((s) => {
                const d = daysUntil(s.date)
                return { time: date(s.date), title: s.label, body: d > 0 ? `in ${d} days` : d === 0 ? 'today' : undefined, tone: d < 0 ? 'green' : d <= 14 ? 'amber' : 'slate' }
              })}
            />
            <div className="mt-4 mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Bid documents (version-controlled)</div>
            <ul className="divide-y divide-slate-100 text-sm">
              {selected.documents.map((d) => (
                <li key={d.name} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="flex min-w-0 items-center gap-2"><FileText size={14} className="shrink-0 text-slate-400" /><span className="truncate">{d.name}</span></span>
                  <span className="flex shrink-0 items-center gap-1.5"><Badge tone={d.kind === 'Our submission' ? 'violet' : d.kind === 'Result' ? 'green' : 'slate'}>{d.kind}</Badge><span className="text-[11px] text-slate-500">{d.version}</span></span>
                </li>
              ))}
            </ul>
            {selected.outcome && <div className="mt-4"><Callout tone={selected.status === 'Won' ? 'green' : 'red'} title="Outcome">{selected.outcome}</Callout></div>}
            {bonds.filter((b) => b.tenderId === selected.id).map((b) => (
              <div key={b.id} className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 p-2.5 text-xs ring-1 ring-slate-200">
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-slate-500" />Bid bond {b.bondNo}</span>
                <span className="num font-medium">{idrShort(b.amount)} · {b.status}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === 'bonds' && (
        <Card padded={false}>
          <DataTable
            rows={bonds}
            rowKey={(b) => b.id}
            rowClassName={(b) => (needsRelease(b) ? 'bg-red-50/50' : undefined)}
            columns={[
              { key: 'id', header: 'Bond', render: (b) => <div><div className="font-mono text-[12px] font-medium">{b.bondNo}</div><div className="text-[11px] text-slate-500">{b.id}</div></div> },
              { key: 't', header: 'Tender', render: (b) => { const t = tenderOf(b); return <div className="min-w-[200px]"><div className="text-sm text-slate-800">{t?.title}</div><div className="flex items-center gap-1.5 text-[11px] text-slate-500">{b.tenderId} · <StatusBadge status={t?.status ?? '—'} /></div></div> } },
              { key: 'bank', header: 'Bank', render: (b) => b.bank },
              { key: 'amt', header: 'Amount', align: 'right', render: (b) => idr(b.amount) },
              { key: 'iss', header: 'Issued', render: (b) => <span className="whitespace-nowrap">{date(b.issued)}</span> },
              { key: 'val', header: 'Valid until', render: (b) => { const d = daysUntil(b.validUntil); return <div className="whitespace-nowrap"><div>{date(b.validUntil)}</div>{b.status !== 'Released' && b.status !== 'Converted' && <div className={cx('text-[11px]', d < 30 ? 'text-red-600' : d < 75 ? 'text-amber-600' : 'text-slate-500')}>{d} days</div>}</div> } },
              { key: 's', header: 'Status', render: (b) => <Badge tone={b.status === 'Active' ? 'blue' : b.status === 'Released' || b.status === 'Converted' ? 'green' : 'amber'} dot>{b.status}</Badge> },
              { key: 'n', header: 'Notes / alert', render: (b) => needsRelease(b) ? <span className="text-xs font-medium text-red-700">Tender concluded — release outstanding</span> : <span className="text-xs text-slate-500">{b.releasedAt ? `Returned ${date(b.releasedAt)}. ` : ''}{b.note}</span> },
              { key: 'a', header: '', render: (b) => needsRelease(b) ? <Button size="sm" variant="danger" onClick={() => requestRelease(b)}>Request release</Button> : null },
            ]}
          />
        </Card>
      )}
    </>
  )
}

function SubmissionCell({ t }: { t: Tender }) {
  const d = daysUntil(t.submission)
  return (
    <div className="whitespace-nowrap">
      <div>{date(t.submission)}</div>
      {!concluded(t) && d >= 0 && <div className={cx('text-[11px]', d <= 14 ? 'font-medium text-amber-700' : 'text-slate-500')}>in {d} days</div>}
      {!concluded(t) && d < 0 && <div className="text-[11px] text-slate-500">submitted</div>}
    </div>
  )
}
