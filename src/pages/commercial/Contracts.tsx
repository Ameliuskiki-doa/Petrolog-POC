import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing, CalendarClock, FileSignature, Hourglass, Wallet } from 'lucide-react'
import { Badge, Button, Card, CardHeader, DataTable, Grid, PageHeader, ProjectCodeChip, SearchInput, Select, Stat, StatusBadge, cx } from '@/components/ui'
import { businessLines, type BusinessLine, type Contract } from '@/data/core'
import { type ContractExtra, type CriticalDate, type Opportunity } from '@/data/commercial'
import { date, daysUntil, idrShort } from '@/lib/format'
import { BLTag, MODULE_CTR, TextLink, customerName } from './shared'
import { useAllContracts, useContractExtras, useContractState, useOpps } from './store'
import { RegisterContractDrawer } from './RegisterContractDrawer'

export interface DateAlert extends CriticalDate {
  contract: Contract
  days: number
}

/** Notification thresholds (configurable per contract type — BDS-04) */
export const THRESHOLDS = [90, 60, 30]

export function criticalAlerts(list: Contract[], status: Record<string, { status: Contract['status'] }>, extras: Record<string, ContractExtra>): DateAlert[] {
  return list
    .filter((c) => status[c.id]?.status !== 'Draft')
    .flatMap((c) =>
      (extras[c.id]?.criticalDates ?? [])
        .filter((d) => d.kind !== 'Start')
        .map((d) => ({ ...d, contract: c, days: daysUntil(d.date) })),
    )
    .filter((a) => a.days <= 90 && a.days >= -30)
    .sort((a, b) => a.days - b.days)
}

export function thresholdBadge(days: number) {
  if (days < 0) return <Badge tone="red">Overdue {-days} d</Badge>
  if (days <= 30) return <Badge tone="red">≤ 30 d · {days} d left</Badge>
  if (days <= 60) return <Badge tone="amber">≤ 60 d · {days} d left</Badge>
  return <Badge tone="sky">≤ 90 d · {days} d left</Badge>
}

export default function Contracts() {
  const st = useContractState()
  const all = useAllContracts()
  const opps = useOpps()
  const [register, setRegister] = useState<Opportunity | null>(null)
  const extras = useContractExtras()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [bl, setBl] = useState('')
  const [status, setStatus] = useState('')

  const list = all.map((c) => ({ ...c, status: st[c.id]?.status ?? c.status }))
  const rows = list.filter((c) => (!bl || c.businessLine === bl) && (!status || c.status === status) && (!q || `${c.id} ${c.title} ${customerName(c.customerId)} ${c.projectCode}`.toLowerCase().includes(q.toLowerCase())))
  const active = list.filter((c) => c.status === 'Active')
  const alerts = criticalAlerts(list, st, extras)
  // A contract is registered from a won opportunity, never from a blank form (BDS-01)
  const awaiting = opps.find((o) => o.stage === 'Won' && !o.contractId)

  const nextDate = (c: Contract) => {
    const d = (extras[c.id]?.criticalDates ?? []).filter((x) => x.kind !== 'Start' && daysUntil(x.date) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0]
    return d
  }

  return (
    <>
      <PageHeader
        module={MODULE_CTR}
        title="Contract repository"
        subtitle="Contracts with versioned amendments, effective-dated rate cards, payment terms and critical dates. Each active contract carries the project code(s) it issued."
        actions={
          <Button variant="primary" icon={<FileSignature size={15} />} disabled={!awaiting} onClick={() => awaiting && setRegister(awaiting)} title={awaiting ? undefined : 'No won opportunity is waiting for a contract'}>
            Register contract{awaiting ? ` (${awaiting.id})` : ''}
          </Button>
        }
      />
      <Grid cols={4} className="mb-4">
        <Stat label="Active contracts" value={active.length} sub={`${list.filter((c) => c.status === 'Closed').length} closed · ${list.filter((c) => c.status === 'Pending Approval').length} pending approval`} icon={<FileSignature size={16} />} />
        <Stat label="Active contract value" value={idrShort(active.reduce((s, c) => s + c.value, 0))} sub="Sum of current versions" icon={<Wallet size={16} />} />
        <Stat label="Critical dates ≤ 90 days" value={alerts.length} sub={`${alerts.filter((a) => a.days <= 30).length} within 30 days or overdue`} tone={alerts.some((a) => a.days <= 30) ? 'bad' : 'warn'} icon={<CalendarClock size={16} />} />
        <Stat label="Awaiting approval" value={list.filter((c) => c.status === 'Pending Approval').length} sub={list.filter((c) => c.status === 'Pending Approval').map((c) => c.id).join(', ') || 'None'} tone="warn" icon={<Hourglass size={16} />} to="/contracts/CTR-2028-004" />
      </Grid>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card padded={false} className="xl:col-span-2">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
            <SearchInput value={q} onChange={setQ} placeholder="Search contract, client, project code…" className="w-full sm:w-64" />
            <Select value={bl} onChange={(e) => setBl(e.target.value)}>
              <option value="">All business lines</option>
              {(['HL', 'PS', 'GS'] as BusinessLine[]).map((k) => <option key={k} value={k}>{businessLines[k].short}</option>)}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {['Pending Approval', 'Active', 'Closed'].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <DataTable
            rows={rows}
            rowKey={(c) => c.id}
            onRowClick={(c) => nav(`/contracts/${c.id}`)}
            columns={[
              { key: 'id', header: 'Contract', render: (c) => <div className="min-w-[230px]"><div className="font-mono text-[11px] text-slate-500">{c.id} · v{c.version}</div><div className="font-medium text-slate-800">{c.title}</div><div className="text-[11px] text-slate-500">{customerName(c.customerId)}</div></div> },
              { key: 'bl', header: 'Line', render: (c) => <BLTag bl={c.businessLine} /> },
              { key: 'pc', header: 'Project code', render: (c) => <ProjectCodeChip code={c.projectCode} /> },
              { key: 'p', header: 'Period', render: (c) => <span className="text-xs whitespace-nowrap text-slate-600">{date(c.start)} –<br />{date(c.end)}</span> },
              { key: 'v', header: 'Value', align: 'right', render: (c) => idrShort(c.value) },
              { key: 's', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
              { key: 'n', header: 'Next critical date', render: (c) => { const d = nextDate(c); if (!d) return <span className="text-xs text-slate-400">—</span>; const n = daysUntil(d.date); return <div className="text-xs whitespace-nowrap"><div className={cx(n <= 30 ? 'font-medium text-red-600' : n <= 90 ? 'text-amber-700' : 'text-slate-600')}>{d.label}</div><div className="text-slate-500">{date(d.date)} · {n} d</div></div> } },
            ]}
          />
        </Card>

        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><BellRing size={15} className="text-amber-600" />Critical date notifications</span>} subtitle={`Expiry, renewal option, guarantee validity and retention dates. Alerts fire at ${THRESHOLDS.join(' / ')} days (BDS-04).`} />
          <ul className="divide-y divide-slate-100">
            {alerts.map((a, i) => (
              <li key={i} className="py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800">{a.label}</div>
                    <div className="text-xs text-slate-500"><TextLink to={`/contracts/${a.contract.id}`}>{a.contract.id}</TextLink> · {date(a.date)}</div>
                  </div>
                  {thresholdBadge(a.days)}
                </div>
                <div className="mt-1 truncate text-[11px] text-slate-500">{a.contract.title}</div>
              </li>
            ))}
            {alerts.length === 0 && <li className="py-6 text-center text-sm text-slate-400">No critical dates in the next 90 days</li>}
          </ul>
        </Card>
      </div>
          {register && <RegisterContractDrawer open onClose={() => setRegister(null)} opportunity={register} />}
    </>
  )
}
