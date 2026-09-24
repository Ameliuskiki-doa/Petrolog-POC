import { useState } from 'react'
import { Settings2, Save, Plus, Info } from 'lucide-react'
import { Badge, Button, Callout, Card, CardHeader, DataTable, Input, Mono, PageHeader, Select, Tabs } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, idr } from '@/lib/format'
import { allocationDrivers, approvalLimits, fuelThresholds, notificationThresholds, taxRates, workingHourCategories, type ApprovalLimit } from '@/data/platform'

type TabKey = 'approval' | 'tax' | 'alloc' | 'hours' | 'fuel' | 'notify'

export default function Config() {
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('approval')
  const [limits, setLimits] = useState<ApprovalLimit[]>(approvalLimits)
  const [taxes, setTaxes] = useState(taxRates)
  const [fuel, setFuel] = useState(fuelThresholds)
  const [notify, setNotify] = useState(notificationThresholds)
  const [drivers, setDrivers] = useState(allocationDrivers)
  const [dirty, setDirty] = useState(false)

  const save = (what: string) => {
    if (tab === 'approval') {
      const bad = limits.find((l) => l.to !== null && l.to <= l.from)
      if (bad) return toast(`${bad.id}: upper limit must be greater than lower limit`, 'error')
    }
    setDirty(false)
    toast(`${what} saved — new version effective immediately, change written to audit trail`, 'success')
  }
  const mark = () => setDirty(true)

  return (
    <>
      <PageHeader
        module="Platform · Configuration (ADR-08)"
        title="Configuration"
        subtitle="Tax rules, authorisation limits, allocation drivers and thresholds are held as configuration, not code — changed by authorised users, versioned and audited, with no release required."
        actions={dirty ? <Badge tone="amber" dot>Unsaved changes</Badge> : <Badge tone="green" dot>All changes saved</Badge>}
      />
      <Tabs<TabKey>
        value={tab}
        onChange={(t) => { setTab(t); setDirty(false) }}
        tabs={[
          { key: 'approval', label: 'Approval limits', count: limits.length },
          { key: 'tax', label: 'Tax rates', count: taxes.length },
          { key: 'alloc', label: 'Allocation drivers', count: drivers.length },
          { key: 'hours', label: 'Working hour categories', count: workingHourCategories.length },
          { key: 'fuel', label: 'Fuel anomaly thresholds', count: fuel.length },
          { key: 'notify', label: 'Notification thresholds', count: notify.length },
        ]}
      />

      {tab === 'approval' && (
        <Card padded={false}>
          <div className="p-4 pb-2"><CardHeader title="Authorisation limits by value and transaction type" subtitle="Evaluated by the workflow engine at submission; delegation and SLA escalation apply" actions={<Button variant="primary" size="sm" icon={<Save size={13} />} onClick={() => save('Approval limits')}>Save</Button>} /></div>
          <DataTable
            rows={limits}
            rowKey={(l) => l.id}
            columns={[
              { key: 'id', header: 'Rule', render: (l) => <Mono>{l.id}</Mono> },
              { key: 't', header: 'Transaction', render: (l) => l.txn },
              { key: 'f', header: 'From (IDR)', align: 'right', render: (l) => idr(l.from).replace('IDR ', '') },
              { key: 'to', header: 'Up to (IDR)', render: (l) => (
                <Input type="number" className="h-8 w-40 text-right" value={l.to ?? ''} placeholder="no limit"
                  onChange={(e) => { mark(); setLimits((x) => x.map((y) => (y.id === l.id ? { ...y, to: e.target.value === '' ? null : Number(e.target.value) } : y))) }} />
              ) },
              { key: 'a', header: 'Approval chain', render: (l) => <span className="text-sm">{l.approvers}</span> },
              { key: 's', header: 'SLA (h)', render: (l) => <Input type="number" className="h-8 w-20 text-right" value={l.sla} onChange={(e) => { mark(); setLimits((x) => x.map((y) => (y.id === l.id ? { ...y, sla: Number(e.target.value) } : y))) }} /> },
            ]}
          />
        </Card>
      )}

      {tab === 'tax' && (
        <Card padded={false}>
          <div className="p-4 pb-2"><CardHeader title="Tax rates (effective dated)" subtitle="Transactions use the rate valid on the tax point date; the Coretax connector validates codes" actions={
            <div className="flex gap-2">
              <Button size="sm" icon={<Plus size={13} />} onClick={() => { mark(); setTaxes((t) => [{ code: 'PPN-NEW', name: 'PPN — new rate (draft)', rate: 12, from: '2029-01-01', to: '', ref: 'Pending regulation' }, ...t]) }}>New effective rate</Button>
              <Button variant="primary" size="sm" icon={<Save size={13} />} onClick={() => save('Tax rates')}>Save</Button>
            </div>
          } /></div>
          <DataTable
            rows={taxes}
            rowKey={(t) => t.code + t.from}
            columns={[
              { key: 'c', header: 'Code', render: (t) => <Mono>{t.code}</Mono> },
              { key: 'n', header: 'Name', render: (t) => <span className="text-sm">{t.name}</span> },
              { key: 'r', header: 'Rate %', render: (t) => <Input type="number" step="0.01" className="h-8 w-24 text-right" value={t.rate} onChange={(e) => { mark(); setTaxes((x) => x.map((y) => (y === t ? { ...y, rate: Number(e.target.value) } : y))) }} /> },
              { key: 'f', header: 'Effective from', render: (t) => date(t.from) },
              { key: 'to', header: 'To', render: (t) => (t.to ? date(t.to) : <Badge tone="green">current</Badge>) },
              { key: 'ref', header: 'Legal basis', render: (t) => <span className="text-xs text-slate-500">{t.ref}</span> },
            ]}
          />
        </Card>
      )}

      {tab === 'alloc' && (
        <Card padded={false}>
          <div className="p-4 pb-2"><CardHeader title="GEN allocation drivers" subtitle="Used by the GEN allocation engine (M7) to distribute GEN-HO / GEN-BPN pools to project codes" actions={<Button variant="primary" size="sm" icon={<Save size={13} />} onClick={() => save('Allocation drivers')}>Save</Button>} /></div>
          <DataTable
            rows={drivers}
            rowKey={(d) => d.pool}
            columns={[
              { key: 'p', header: 'Cost pool', render: (d) => <Mono>{d.pool}</Mono> },
              { key: 'd', header: 'Driver', render: (d) => (
                <Select value={d.driver} onChange={(e) => { mark(); setDrivers((x) => x.map((y) => (y.pool === d.pool ? { ...y, driver: e.target.value } : y))) }}>
                  {['Revenue share (month)', 'Unit operating hours', 'Work order labour hours', 'Headcount', 'Direct cost share', 'Man-hours (timesheets)'].map((o) => <option key={o}>{o}</option>)}
                </Select>
              ) },
              { key: 'b', header: 'Basis data', render: (d) => <span className="text-xs text-slate-600">{d.basis}</span> },
              { key: 'f', header: 'Frequency', render: (d) => d.frequency },
              { key: 's', header: 'Status', render: (d) => <Badge tone={d.status === 'Active' ? 'green' : 'slate'}>{d.status}</Badge> },
            ]}
          />
        </Card>
      )}

      {tab === 'hours' && (
        <Card padded={false}>
          <div className="p-4 pb-2"><CardHeader title="Working hour categories" subtitle="Used by timesheets, unit hours and billing; payroll multipliers feed the monthly payroll charge" actions={<Button variant="primary" size="sm" icon={<Save size={13} />} onClick={() => save('Working hour categories')}>Save</Button>} /></div>
          <DataTable
            rows={workingHourCategories}
            rowKey={(w) => w.code}
            columns={[
              { key: 'c', header: 'Code', render: (w) => <Mono>{w.code}</Mono> },
              { key: 'n', header: 'Category', render: (w) => w.name },
              { key: 'b', header: 'Billable', render: (w) => <Badge tone={w.billable ? 'green' : 'slate'}>{w.billable ? 'Billable' : 'Non-billable'}</Badge> },
              { key: 'p', header: 'Payroll treatment', render: (w) => <span className="text-xs">{w.payroll}</span> },
              { key: 'x', header: 'Notes', render: (w) => <span className="text-xs text-slate-500">{w.notes}</span> },
            ]}
          />
        </Card>
      )}

      {(tab === 'fuel' || tab === 'notify') && (
        <Card>
          <CardHeader
            title={tab === 'fuel' ? 'Fuel anomaly thresholds' : 'Notification thresholds'}
            subtitle={tab === 'fuel' ? 'Applied by M4 fuel monitoring to flag exceptions for review' : 'Drive alerts across certification, budget, Loket Invoice, POD and waste storage'}
            actions={<Button variant="primary" size="sm" icon={<Save size={13} />} onClick={() => save(tab === 'fuel' ? 'Fuel thresholds' : 'Notification thresholds')}>Save</Button>}
          />
          <div className="divide-y divide-slate-100">
            {(tab === 'fuel' ? fuel : notify).map((t) => (
              <div key={t.key} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="text-sm text-slate-700">{t.label}</div>
                <div className="flex items-center gap-2">
                  <Input type="number" className="h-8 w-24 text-right" value={t.value}
                    onChange={(e) => { mark(); const v = Number(e.target.value); (tab === 'fuel' ? setFuel : setNotify)((x) => x.map((y) => (y.key === t.key ? { ...y, value: v } : y))) }} />
                  <span className="w-36 text-xs text-slate-500">{t.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-4">
        <Callout tone="blue" icon={<Info size={16} />}>
          <span className="inline-flex items-center gap-1"><Settings2 size={13} /> Changes to limits and tax rates are themselves subject to approval by the Finance Director and are recorded in the audit trail with before/after values.</span>
        </Callout>
      </div>
    </>
  )
}
