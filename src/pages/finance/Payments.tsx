import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HandCoins, FileDown, Send, CircleCheck, Plus, Landmark, FileText } from 'lucide-react'
import { getVendor } from '@/data/core'
import { paymentRuns as seed, loketInvoices, itemPph, itemNet, runTotals, getLoket, type PaymentRun, type PaymentItem } from '@/data/finance'
import { PageHeader, Card, CardHeader, Grid, Stat, DataTable, Button, StatusBadge, Mono, Modal, Callout, Stepper, Avatar, Badge, ProjectCodeChip, cx, type Column } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, dateTime, idr, idrShort, num } from '@/lib/format'
import { DocLink, VendorLink, empName } from './components'

const STEPS = ['Draft', 'Pending Approval', 'Approved', 'Sent to bank', 'Executed']

export default function Payments() {
  const toast = useToast()
  const [runs, setRuns] = useState<PaymentRun[]>(seed)
  const [sel, setSel] = useState(seed[0].id)
  const [fileOpen, setFileOpen] = useState(false)
  const run = runs.find((r) => r.id === sel)!
  const t = runTotals(run)

  const patch = (p: Partial<PaymentRun>) => setRuns((rs) => rs.map((r) => (r.id === run.id ? { ...r, ...p } : r)))
  const bupotSeq = 21

  const advance = () => {
    if (run.status === 'Draft') {
      patch({ status: 'Pending Approval' })
      toast(`${run.id} submitted — Accounting Manager and Finance Director approve in sequence`, 'info')
    } else if (run.status === 'Pending Approval') {
      patch({ status: 'Approved', approvals: run.approvals.map((a) => (a.at ? a : { ...a, at: '2028-03-10T10:40' })) })
      toast(`${run.id} approved by Ratna Sari Dewi`, 'success')
    } else if (run.status === 'Approved') {
      patch({ status: 'Sent to bank', bankFile: `MCM_H2H_${run.date.replaceAll('-', '')}_01.txt` })
      toast('Bank file generated and transmitted host-to-host to Bank Mandiri', 'success')
    } else if (run.status === 'Sent to bank') {
      patch({
        status: 'Executed',
        journalId: run.journalId ?? 'JV-2028-03-0021',
        items: run.items.map((i, k) => (i.pphBase ? { ...i, bupotNo: i.bupotNo ?? `BP23-2028-03-000${bupotSeq + k}` } : i)),
      })
      toast(`Bank confirmed execution · payment journal posted · ${run.items.filter((i) => i.pphBase).length} e-Bupot certificate(s) issued`, 'success')
    }
  }

  const newRun = () => {
    const inRun = new Set(runs.flatMap((r) => r.items.map((i) => i.receiptNo)))
    const candidates = loketInvoices.filter((i) => i.status === 'Approved for payment' && !inRun.has(i.receiptNo))
    if (!candidates.length) return toast('No approved invoices outside existing runs', 'info')
    const id = `PAY-2028-03-0${runs.filter((r) => r.id.startsWith('PAY-2028-03')).length + 1}`
    const items: PaymentItem[] = candidates.map((c) => {
      const service = !['Fuel', 'Materials', 'Spare Parts', 'Equipment'].some((k) => c.description.toLowerCase().includes(k.toLowerCase())) && !c.description.toLowerCase().includes('nitrogen')
      return { receiptNo: c.receiptNo, vendorId: c.vendorId, gross: c.dpp + c.ppn, pphBase: service ? c.dpp : 0, pphRate: service ? 2 : 0 }
    })
    setRuns((rs) => [{ id, date: '2028-03-19', bank: 'Bank Mandiri — operating (H2H)', status: 'Draft', preparedBy: 'EMP-0009', approvals: [{ role: 'Accounting Manager', by: 'EMP-0028' }, { role: 'Finance Director', by: 'EMP-0002' }], items }, ...rs])
    setSel(id)
    toast(`${id} drafted with ${items.length} approved invoice(s) — PPh 23 determined automatically`, 'success')
  }

  const cols: Column<PaymentItem>[] = [
    {
      key: 'inv', header: 'Invoice',
      render: (i) => {
        const l = getLoket(i.receiptNo)
        return (
          <div className="min-w-[200px]">
            <DocLink to={l ? `/finance/loket?open=${i.receiptNo}` : undefined}>{i.receiptNo}</DocLink>
            <div className="text-[11px] text-slate-500">{l?.vendorInvoiceNo ?? 'Paid invoice'} {l && <>· due {date(addDays(l.receivedAt, l.termDays))}</>}</div>
          </div>
        )
      },
    },
    { key: 'v', header: 'Vendor', render: (i) => <div><VendorLink id={i.vendorId} /><div className="text-[11px] text-slate-500">{getVendor(i.vendorId)?.npwp}</div></div> },
    { key: 'pc', header: 'Project', render: (i) => { const l = getLoket(i.receiptNo); return l ? <ProjectCodeChip code={l.projectCode} /> : '—' } },
    { key: 'g', header: 'Gross', align: 'right', render: (i) => idr(i.gross) },
    { key: 'b', header: 'PPh 23 base', align: 'right', render: (i) => (i.pphBase ? idr(i.pphBase) : <span className="text-xs text-slate-400">Goods — n/a</span>) },
    { key: 'p', header: 'PPh 23', align: 'right', render: (i) => (i.pphBase ? <span className="text-violet-700">{idr(itemPph(i))} <span className="text-[11px]">({i.pphRate}%)</span></span> : '—') },
    { key: 'n', header: 'Net transfer', align: 'right', render: (i) => <b>{idr(itemNet(i))}</b> },
    { key: 'bp', header: 'e-Bupot', render: (i) => (i.bupotNo ? <DocLink to="/finance/tax?tab=bupot">{i.bupotNo}</DocLink> : i.pphBase ? <Badge tone="amber">On execution</Badge> : '') },
  ]

  const pending = runs.filter((r) => r.status === 'Pending Approval' || r.status === 'Draft')
  const executedMar = runs.filter((r) => r.status === 'Executed' && r.date >= '2028-03-01')

  return (
    <div>
      <PageHeader
        module="M9 · Accounts Payable"
        title="Payment runs"
        subtitle="Approved invoices batched into runs. PPh 23 is withheld automatically on payment by transaction type and vendor status (PROC-21); the e-Bupot certificate is issued on execution (FAT-36)."
        crumbs={[{ label: 'Finance' }, { label: 'Payments' }]}
        actions={<Button variant="primary" icon={<Plus size={15} />} onClick={newRun}>New payment run</Button>}
      />

      <Grid cols={4} className="mb-4">
        <Stat label="Awaiting approval" value={idrShort(pending.reduce((s, r) => s + runTotals(r).net, 0))} sub={`${pending.length} run(s)`} tone={pending.length ? 'warn' : undefined} icon={<HandCoins size={16} />} />
        <Stat label="Paid · Mar 2028" value={idrShort(executedMar.reduce((s, r) => s + runTotals(r).net, 0))} sub={`${executedMar.reduce((s, r) => s + r.items.length, 0)} invoices`} />
        <Stat label="PPh 23 withheld · Mar" value={idrShort(executedMar.reduce((s, r) => s + runTotals(r).pph, 0))} sub="Remitted by the 15th of next month" to="/finance/tax?tab=bupot" />
        <Stat label="Paid within SLA · Feb" value="97.2%" sub="Measured from Loket receipt date" tone="good" />
      </Grid>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card padded={false} className="lg:col-span-1">
          <div className="px-4 pt-4"><CardHeader title="Runs" /></div>
          <ul className="divide-y divide-slate-100">
            {runs.map((r) => (
              <li key={r.id}>
                <button onClick={() => setSel(r.id)} className={cx('w-full px-4 py-3 text-left transition hover:bg-slate-50', sel === r.id && 'bg-brand-50/60')}>
                  <div className="flex items-center justify-between gap-2">
                    <Mono className="font-medium">{r.id}</Mono>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>{date(r.date)} · {r.items.length} items</span>
                    <span className="num">{idrShort(runTotals(r).net)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          <Card>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><h2 className="font-mono text-lg font-semibold">{run.id}</h2><StatusBadge status={run.status} /></div>
                <div className="text-sm text-slate-500">Value date {date(run.date)} · {run.bank} · prepared by {empName(run.preparedBy)}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {run.bankFile && <Button icon={<FileText size={15} />} onClick={() => setFileOpen(true)}>Bank file</Button>}
                {run.journalId && <Link to={`/finance/gl/${run.journalId}`}><Button icon={<FileDown size={15} />}>Journal</Button></Link>}
                {run.status !== 'Executed' && (
                  <Button variant="primary" icon={run.status === 'Approved' ? <Send size={15} /> : <CircleCheck size={15} />} onClick={advance}>
                    {run.status === 'Draft' ? 'Submit for approval' : run.status === 'Pending Approval' ? 'Approve (Finance Director)' : run.status === 'Approved' ? 'Generate & send H2H file' : 'Confirm bank execution'}
                  </Button>
                )}
              </div>
            </div>
            <Stepper steps={STEPS} current={run.status} />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 px-3 py-2"><div className="text-xs text-slate-500">Gross payable</div><div className="num font-semibold">{idr(t.gross)}</div></div>
              <div className="rounded-lg bg-violet-50 px-3 py-2"><div className="text-xs text-violet-700">PPh 23 withheld</div><div className="num font-semibold text-violet-800">{idr(t.pph)}</div></div>
              <div className="rounded-lg bg-emerald-50 px-3 py-2"><div className="text-xs text-emerald-700">Net transfer</div><div className="num font-semibold text-emerald-800">{idr(t.net)}</div></div>
            </div>
          </Card>

          <Card padded={false}>
            <DataTable
              columns={cols}
              rows={run.items}
              rowKey={(i) => i.receiptNo}
              footer={
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-xs uppercase text-slate-500">{num(run.items.length)} items</td>
                  <td className="num px-3 py-2 text-right">{idr(t.gross)}</td>
                  <td />
                  <td className="num px-3 py-2 text-right">{idr(t.pph)}</td>
                  <td className="num px-3 py-2 text-right">{idr(t.net)}</td>
                  <td />
                </tr>
              }
            />
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader title="Approval chain" subtitle="Tiered by run value" />
              <ul className="space-y-3">
                {run.approvals.map((a) => (
                  <li key={a.role} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2"><Avatar name={empName(a.by)} size={26} /><span><div className="font-medium">{empName(a.by)}</div><div className="text-xs text-slate-500">{a.role}</div></span></span>
                    {a.at ? <span className="text-xs text-emerald-700">Approved {dateTime(a.at)}</span> : <Badge tone="amber">Pending</Badge>}
                  </li>
                ))}
              </ul>
            </Card>
            <Callout tone="violet" icon={<Landmark size={16} />} title="Withholding logic (PROC-21)">
              Services from vendors with NPWP: PPh 23 at 2% of DPP; without NPWP 4%. Goods (fuel, spare parts, materials) carry no PPh 23. Rates come from the tax determination rules in M12 — a rate change needs no redeployment. <Link to="/finance/tax?tab=rules" className="underline">View rules</Link>
            </Callout>
          </div>
        </div>
      </div>

      <Modal open={fileOpen} onClose={() => setFileOpen(false)} title={run.bankFile ?? 'Bank file'} footer={<Button onClick={() => { toast('Bank file downloaded', 'info'); setFileOpen(false) }} icon={<FileDown size={15} />}>Download</Button>}>
        <pre className="scrollbar-thin overflow-x-auto rounded-lg bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-emerald-200">
{`H|PTPETROLOGINDAH|1370011882044|${run.date.replaceAll('-', '')}|${run.items.length}|${Math.round(t.net)}
${run.items.map((i, k) => `D|${String(k + 1).padStart(3, '0')}|${getVendor(i.vendorId)?.name.toUpperCase().slice(0, 24).padEnd(24)}|${i.receiptNo}|${Math.round(itemNet(i))}|IDR|BEN`).join('\n')}
T|${run.items.length}|${Math.round(t.net)}|SHA256:9f2c…e71a`}
        </pre>
        <p className="mt-2 text-xs text-slate-500">Transmitted over host-to-host SFTP with PGP encryption; bank acknowledgement ACK-MDR-{run.date.replaceAll('-', '')} received.</p>
      </Modal>
    </div>
  )
}

function addDays(iso: string, n: number) {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
