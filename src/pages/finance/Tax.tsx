import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw, Upload, Landmark, ShieldCheck, Plus, TriangleAlert } from 'lucide-react'
import { getCustomer, getVendor } from '@/data/core'
import { fakturs, bupots, taxRules as seedRules, taxRisks, taxRecon, type FakturRow, type BupotRow, type TaxRule, type TaxRisk } from '@/data/finance'
import { PageHeader, Card, CardHeader, Grid, Stat, Tabs, DataTable, Button, Mono, Badge, Callout, Select, StatusBadge, cx, type Column } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, idr, idrShort, num } from '@/lib/format'
import { DocLink, empName } from './components'

type Tab = 'efaktur' | 'bupot' | 'rules' | 'risk' | 'recon'
const cpName = (id: string) => getCustomer(id)?.name ?? getVendor(id)?.name ?? id
const fTone = (s: FakturRow['status']) => (s === 'Approved' || s === 'Credited' ? 'green' : s === 'Rejected' ? 'red' : s === 'Uploaded' ? 'sky' : 'amber')

export default function Tax() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'efaktur'
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })
  const [dir, setDir] = useState<'Output' | 'Input' | ''>('')
  const [rows, setRows] = useState<FakturRow[]>(fakturs)
  const [bp, setBp] = useState<BupotRow[]>(bupots)
  const [rules, setRules] = useState<TaxRule[]>(seedRules)
  const [syncing, setSyncing] = useState(false)

  const outMar = rows.filter((f) => f.direction === 'Output' && f.date >= '2028-03-01')
  const inMar = rows.filter((f) => f.direction === 'Input' && f.date >= '2028-03-01')
  const pendingSync = rows.filter((f) => f.status === 'Pending upload' || f.status === 'Uploaded' || f.status === 'Rejected')

  const sync = () => {
    setSyncing(true)
    setTimeout(() => {
      setRows((rs) => rs.map((f) => (f.status === 'Uploaded' && f.direction === 'Input' && !f.message?.includes('exception') ? { ...f, status: 'Approved', message: 'Matched to prepopulated input VAT' } : f)))
      setSyncing(false)
      toast('Coretax sync complete — 1 input faktur approved, 1 held (exception queue)', 'success')
    }, 700)
  }

  const fCols: Column<FakturRow>[] = [
    { key: 'no', header: 'Faktur no.', render: (f) => <Mono>{f.fakturNo}</Mono> },
    { key: 'dir', header: 'Type', render: (f) => <Badge tone={f.direction === 'Output' ? 'blue' : 'violet'}>{f.direction}</Badge> },
    { key: 'd', header: 'Date', render: (f) => <span className="whitespace-nowrap">{date(f.date)}</span> },
    { key: 'cp', header: 'Counterparty', render: (f) => <span className="min-w-[180px] block">{cpName(f.counterpartyId)}</span> },
    { key: 'doc', header: 'Document', render: (f) => <DocLink to={f.docLink}>{f.docRef}</DocLink> },
    { key: 'dpp', header: 'DPP', align: 'right', render: (f) => idr(f.dpp) },
    { key: 'ppn', header: 'PPN', align: 'right', render: (f) => idr(f.ppn) },
    { key: 's', header: 'Coretax status', render: (f) => <div><Badge tone={fTone(f.status)} dot>{f.status}</Badge>{f.message && <div className="mt-0.5 max-w-[220px] text-[11px] text-slate-500">{f.message}</div>}</div> },
  ]

  const bCols: Column<BupotRow>[] = [
    { key: 'no', header: 'Certificate', render: (b) => <Mono>{b.no}</Mono> },
    { key: 't', header: 'Direction', render: (b) => <Badge tone={b.type === 'Issued' ? 'violet' : 'blue'}>{b.type === 'Issued' ? 'Issued to vendor' : 'From customer'}</Badge> },
    { key: 'd', header: 'Date', render: (b) => <span className="whitespace-nowrap">{date(b.date)}</span> },
    { key: 'cp', header: 'Counterparty / NPWP', render: (b) => <div className="min-w-[180px]">{cpName(b.counterpartyId)}<div className="font-mono text-[11px] text-slate-500">{b.npwp}</div></div> },
    { key: 'o', header: 'Tax object', render: (b) => <span className="text-xs">{b.object}</span> },
    { key: 'dpp', header: 'DPP', align: 'right', render: (b) => idr(b.dpp) },
    { key: 'pph', header: 'PPh 23', align: 'right', render: (b) => <span>{idr(b.pph)} <span className="text-[11px] text-slate-500">({b.rate}%)</span></span> },
    { key: 'ref', header: 'Payment', render: (b) => <DocLink to={b.type === 'Issued' ? '/finance/ap/payments' : '/finance/ar'}>{b.paymentRef}</DocLink> },
    {
      key: 's', header: 'Status',
      render: (b) =>
        b.status === 'Awaiting from customer' ? (
          <Button size="sm" onClick={() => { setBp((xs) => xs.map((x) => (x.no === b.no ? { ...x, status: 'Received' } : x))); toast('Bukti potong received & matched to prepaid PPh 23 (1106.02)', 'success') }}>Record receipt</Button>
        ) : (
          <StatusBadge status={b.status} />
        ),
    },
  ]

  const rCols: Column<TaxRule>[] = [
    { key: 'id', header: 'Rule', render: (r) => <Mono>{r.id}</Mono> },
    { key: 'tx', header: 'Transaction type', render: (r) => <span className="block min-w-[200px]">{r.transaction}</span> },
    { key: 'cp', header: 'Counterparty status', render: (r) => r.counterparty },
    { key: 'ppn', header: 'PPN', render: (r) => <span className="text-xs">{r.ppn}</span> },
    { key: 'pph', header: 'Withholding', render: (r) => <span className="text-xs">{r.pph}</span> },
    { key: 'obj', header: 'Object code', render: (r) => <Mono>{r.objectCode}</Mono> },
    { key: 'eff', header: 'Effective', render: (r) => <span className="whitespace-nowrap">{date(r.effectiveFrom)}</span> },
    { key: 'a', header: 'Active', render: (r) => <input type="checkbox" checked={r.active} onChange={() => { setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, active: !x.active } : x))); toast(`${r.id} ${r.active ? 'deactivated' : 'activated'} — change logged, effective immediately`, 'info') }} /> },
  ]

  const riskCols: Column<TaxRisk>[] = [
    { key: 'id', header: 'ID', render: (r) => <Mono>{r.id}</Mono> },
    { key: 't', header: 'Risk', render: (r) => <div className="min-w-[240px]"><div className="font-medium text-slate-800">{r.title}</div><div className="text-[11px] text-slate-500">{r.taxType} · {r.classification}</div></div> },
    { key: 'l', header: 'Likelihood', render: (r) => <StatusBadge status={r.likelihood} /> },
    { key: 'i', header: 'Impact', align: 'right', render: (r) => idrShort(r.impact) },
    { key: 'm', header: 'Mitigation', render: (r) => <span className="block max-w-[340px] text-xs text-slate-600">{r.mitigation}</span> },
    { key: 'o', header: 'Owner', render: (r) => <span className="whitespace-nowrap">{empName(r.owner)}</span> },
    { key: 's', header: 'Status', render: (r) => <div><Badge tone={r.status === 'Closed' ? 'green' : r.status === 'Open' ? 'red' : 'amber'} dot>{r.status}</Badge><div className="mt-0.5 text-[11px] text-slate-400">rev. {date(r.reviewed)}</div></div> },
  ]

  const exposure = taxRisks.filter((r) => r.status !== 'Closed').reduce((s, r) => s + r.impact * (r.likelihood === 'High' ? 0.7 : r.likelihood === 'Medium' ? 0.4 : 0.1), 0)

  return (
    <div>
      <PageHeader
        module="M12 · Tax Management"
        title="Tax"
        subtitle="Output and input VAT synchronised with Coretax (FAT-35), withholding certificates via e-Bupot (FAT-36), rule-based tax determination (FAT-34), and tax risk monitoring with reconciliation to the GL (FAT-32/33)."
        crumbs={[{ label: 'Finance' }, { label: 'Tax' }]}
        actions={<Button variant="primary" icon={<RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />} onClick={sync} disabled={syncing}>Sync with Coretax</Button>}
      />

      <Grid cols={4} className="mb-4">
        <Stat label="PPN output · Mar MTD" value={idrShort(outMar.reduce((s, f) => s + f.ppn, 0))} sub={`${outMar.length} e-Faktur`} icon={<Landmark size={16} />} />
        <Stat label="PPN input · Mar MTD" value={idrShort(inMar.reduce((s, f) => s + f.ppn, 0))} sub={`${inMar.filter((f) => f.status === 'Credited' || f.status === 'Approved').length} creditable of ${inMar.length}`} />
        <Stat label="Awaiting Coretax" value={num(pendingSync.length)} sub={`${rows.filter((f) => f.status === 'Rejected').length} rejected — action needed`} tone={rows.some((f) => f.status === 'Rejected') ? 'bad' : undefined} icon={<Upload size={16} />} />
        <Stat label="Weighted tax exposure" value={idrShort(exposure)} sub={`${taxRisks.filter((r) => r.status !== 'Closed').length} open risks`} tone="warn" icon={<ShieldCheck size={16} />} />
      </Grid>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'efaktur', label: 'e-Faktur / Coretax', count: rows.length },
          { key: 'bupot', label: 'e-Bupot', count: bp.length },
          { key: 'rules', label: 'Tax determination rules', count: rules.length },
          { key: 'risk', label: 'Tax risk register', count: taxRisks.length },
          { key: 'recon', label: 'Reconciliation to GL' },
        ]}
      />

      {tab === 'efaktur' && (
        <Card padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3">
            <Select value={dir} onChange={(e) => setDir(e.target.value as 'Output' | 'Input' | '')}>
              <option value="">Output & input</option>
              <option value="Output">Output VAT (sales)</option>
              <option value="Input">Input VAT (purchases)</option>
            </Select>
            <span className="text-xs text-slate-500">Last sync 10 Mar 2028, 08:30 · Coretax API · NPWP 01.998.231.4-091.000</span>
          </div>
          <DataTable columns={fCols} rows={rows.filter((f) => !dir || f.direction === dir)} rowKey={(f) => f.fakturNo} rowClassName={(f) => (f.status === 'Rejected' ? 'bg-red-50/40' : undefined)} />
        </Card>
      )}

      {tab === 'bupot' && (
        <div className="space-y-4">
          <Callout tone="violet">Certificates to vendors are generated automatically when a payment run with PPh 23 is executed; drafts in the pending run are issued on bank confirmation. Certificates from customers are tracked against prepaid PPh 23 (1106.02).</Callout>
          <Card padded={false}><DataTable columns={bCols} rows={bp} rowKey={(b) => b.no} /></Card>
        </div>
      )}

      {tab === 'rules' && (
        <div className="space-y-4">
          <Callout tone="sky" title="Configuration, not code">Rates and object codes are effective-dated master data. A change in tax regulation is a new rule version with an effective date — no redeployment.</Callout>
          <Card padded={false}>
            <div className="flex justify-end px-4 pt-4 pb-3"><Button size="sm" icon={<Plus size={14} />} onClick={() => toast('New rule version opened — requires Tax Manager and Finance Director approval', 'info')}>New rule version</Button></div>
            <DataTable columns={rCols} rows={rules} rowKey={(r) => r.id} rowClassName={(r) => (!r.active ? 'opacity-50' : undefined)} />
          </Card>
        </div>
      )}

      {tab === 'risk' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {(['High', 'Medium', 'Low'] as const).map((l) => {
              const list = taxRisks.filter((r) => r.likelihood === l && r.status !== 'Closed')
              return (
                <Card key={l}>
                  <div className="flex items-center justify-between"><StatusBadge status={l} /><span className="text-xs text-slate-500">likelihood</span></div>
                  <div className="num mt-2 text-xl font-semibold">{list.length} open · {idrShort(list.reduce((s, r) => s + r.impact, 0))}</div>
                  <div className="text-xs text-slate-500">gross impact</div>
                </Card>
              )
            })}
          </div>
          <Card padded={false}><DataTable columns={riskCols} rows={taxRisks} rowKey={(r) => r.id} /></Card>
        </div>
      )}

      {tab === 'recon' && (
        <Card padded={false}>
          <div className="px-4 pt-4"><CardHeader title="Taxable items vs general ledger — Feb 2028" subtitle="Locked period; differences carry an explanation before SPT Masa is filed" /></div>
          <DataTable
            rows={taxRecon}
            rowKey={(r) => r.item}
            columns={[
              { key: 'i', header: 'Item', render: (r) => <span className="font-medium">{r.item}</span> },
              { key: 'a', header: 'GL account', render: (r) => (r.account.includes('–') ? <Mono>{r.account}</Mono> : <DocLink to={`/finance/gl?account=${r.account}`}>{r.account}</DocLink>) },
              { key: 's', header: 'Tax source', render: (r) => <span className="text-xs">{r.taxSource}</span> },
              { key: 't', header: 'Per tax records', align: 'right', render: (r) => idr(r.taxAmount) },
              { key: 'g', header: 'Per GL', align: 'right', render: (r) => idr(r.glAmount) },
              { key: 'd', header: 'Difference', align: 'right', render: (r) => { const d = r.glAmount - r.taxAmount; return <span className={cx(d ? 'font-semibold text-amber-700' : 'text-emerald-700')}>{d ? idr(d) : '0'}</span> } },
              { key: 'e', header: 'Explanation', render: (r) => <span className={cx('flex items-start gap-1 text-xs', r.glAmount !== r.taxAmount ? 'text-amber-800' : 'text-slate-500')}>{r.glAmount !== r.taxAmount && <TriangleAlert size={12} className="mt-0.5 shrink-0" />}{r.explanation}</span> },
            ]}
          />
        </Card>
      )}
    </div>
  )
}
