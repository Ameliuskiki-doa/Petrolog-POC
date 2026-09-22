import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader, Card, Tabs, DataTable, Mono, SearchInput, useFilter, Button, Grid, Stat } from '@/components/ui'
import { idr, idrShort, date } from '@/lib/format'
import { invoiceTotals, vendorProfiles } from '@/data/portal'
import { usePortal, wib, slaDue } from '../store'
import { PStatus } from '../bits'

type TabKey = 'all' | 'process' | 'Exception' | 'Approved for payment' | 'Paid'

export default function Invoices() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { invoices, vendorId } = usePortal()
  const term = vendorProfiles[vendorId].paymentTermDays
  const st = params.get('status')
  const tab: TabKey = st === 'Exception' || st === 'Approved for payment' || st === 'Paid' ? st : st === 'process' || st === 'Received' || st === 'Document check' || st === 'Matching' ? 'process' : 'all'
  const setTab = (k: TabKey) => setParams(k === 'all' ? {} : { status: k }, { replace: true })
  const base = invoices.filter((i) => (tab === 'all' ? true : tab === 'process' ? ['Received', 'Document check', 'Matching'].includes(i.status) : i.status === tab))
  const { q, setQ, filtered } = useFilter(base, (i) => `${i.loketNo} ${i.vendorInvNo} ${i.poId} ${i.fakturNo}`)
  const open = invoices.filter((i) => i.status !== 'Paid')

  return (
    <div>
      <PageHeader
        module="Vendor Portal · FAT-12 Loket Invoice"
        title="Invoices"
        subtitle={`Submit against a PO and receipt. Each submission gets a Loket Invoice receipt number and date — the ${term}-day payment clock starts there.`}
        crumbs={[{ label: 'Home', to: '/portal' }, { label: 'Invoices' }]}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => nav('/portal/invoices/new')}>
            Submit invoice
          </Button>
        }
      />
      <Grid cols={4} className="mb-5">
        <Stat label="In process" value={open.length} sub={idrShort(open.reduce((s, i) => s + invoiceTotals(i).gross, 0))} />
        <Stat label="Needs your reply" value={invoices.filter((i) => i.status === 'Exception').length} sub="Exception — clarification thread" tone={invoices.some((i) => i.status === 'Exception') ? 'bad' : 'good'} />
        <Stat label="Approved, awaiting payment" value={invoices.filter((i) => i.status === 'Approved for payment').length} sub={idrShort(invoices.filter((i) => i.status === 'Approved for payment').reduce((s, i) => s + invoiceTotals(i).net, 0))} />
        <Stat label="Paid (net)" value={idrShort(invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + invoiceTotals(i).net, 0))} sub="After PPh 23 withholding" tone="good" />
      </Grid>
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3">
          <Tabs
            className="mb-0 border-0"
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'all', label: 'All', count: invoices.length },
              { key: 'process', label: 'In process', count: invoices.filter((i) => ['Received', 'Document check', 'Matching'].includes(i.status)).length },
              { key: 'Exception', label: 'Exception', count: invoices.filter((i) => i.status === 'Exception').length },
              { key: 'Approved for payment', label: 'Approved', count: invoices.filter((i) => i.status === 'Approved for payment').length },
              { key: 'Paid', label: 'Paid', count: invoices.filter((i) => i.status === 'Paid').length },
            ]}
          />
          <SearchInput value={q} onChange={setQ} placeholder="Search invoice, PO, faktur…" className="w-full sm:w-64" />
        </div>
        <div className="mt-3 border-t border-slate-200">
          <DataTable
            rows={filtered}
            rowKey={(i) => i.id}
            onRowClick={(i) => nav(`/portal/invoices/${i.id}`)}
            empty="No invoices in this view."
            columns={[
              { key: 'l', header: 'Loket receipt', render: (i) => <div className="whitespace-nowrap"><Mono className="font-medium">{i.loketNo}</Mono><div className="text-[11px] text-slate-500">{wib(i.receivedAt)}</div></div> },
              { key: 'v', header: 'Your invoice', render: (i) => <Mono>{i.vendorInvNo}</Mono> },
              { key: 'po', header: 'PO / receipt', render: (i) => <span className="text-xs whitespace-nowrap">{i.poId}{i.grIds.length ? ` · ${i.grIds.join(', ')}` : ' · advance'}</span> },
              { key: 'g', header: 'Gross', align: 'right', render: (i) => idr(invoiceTotals(i).gross) },
              {
                key: 'sla',
                header: 'Payment due',
                render: (i) => {
                  if (i.status === 'Paid') return <span className="text-xs whitespace-nowrap text-emerald-700">Paid {date(i.paidAt!)}</span>
                  const s = slaDue(i, term)
                  return (
                    <span className={`text-xs whitespace-nowrap ${s.left < 0 ? 'text-red-600' : s.left < 7 ? 'text-amber-700' : 'text-slate-600'}`}>
                      {date(s.iso)} · {s.left < 0 ? `${-s.left} d overdue` : `${s.left} d`}
                    </span>
                  )
                },
              },
              { key: 's', header: 'Status', render: (i) => <PStatus s={i.status} /> },
            ]}
          />
        </div>
      </Card>
    </div>
  )
}
