import { useMemo, useState } from 'react'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { Banknote, Upload, Wand2, CircleCheck, FilePlus2, Link2 } from 'lucide-react'
import { bankAccounts, statementLines as seed, cashForecast, OPENING_CASH, MIN_CASH, type StatementLine } from '@/data/finance'
import { PageHeader, Card, CardHeader, Grid, Stat, DataTable, Button, Mono, Badge, Select, Callout, cx, type Column } from '@/components/ui'
import { SERIES, GRID, STATUS, axisProps, ChartTooltip, Legend } from '@/lib/chart'
import { useToast } from '@/lib/app-state'
import { date, dateTime, idr, idrShort, num } from '@/lib/format'
import { ArchiveNote, DocLink } from './components'

const lineTone = (s: StatementLine['status']) => (s === 'Auto-matched' || s === 'Manually matched' ? 'green' : s === 'Suggested' ? 'sky' : 'red')

export default function CashBank() {
  const toast = useToast()
  const [acct, setAcct] = useState('BA-MDR-01')
  const [lines, setLines] = useState<StatementLine[]>(seed)
  const total = bankAccounts.reduce((s, a) => s + a.balance, 0)
  const unmatched = lines.filter((l) => l.status === 'Unmatched' || l.status === 'Suggested')

  const forecast = useMemo(() => {
    let bal = OPENING_CASH
    return cashForecast.map((w) => {
      bal += w.inflow - w.outflow
      return { week: w.week, Inflows: w.inflow, Outflows: -w.outflow, 'Closing balance': bal }
    })
  }, [])
  const low = forecast.reduce((m, w) => (w['Closing balance'] < m['Closing balance'] ? w : m), forecast[0])

  const shown = lines.filter((l) => l.accountId === acct)
  const setStatus = (id: string, patch: Partial<StatementLine>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))

  const cols: Column<StatementLine>[] = [
    { key: 'd', header: 'Value date', render: (l) => <span className="whitespace-nowrap">{date(l.date)}</span> },
    { key: 'desc', header: 'Bank narrative', render: (l) => <span className="block min-w-[240px] font-mono text-[11px] text-slate-700">{l.description}</span> },
    { key: 'a', header: 'Amount', align: 'right', render: (l) => <span className={l.amount < 0 ? 'text-slate-900' : 'text-emerald-700'}>{idr(l.amount)}</span> },
    { key: 's', header: 'Status', render: (l) => <Badge tone={lineTone(l.status)} dot>{l.status}</Badge> },
    { key: 'm', header: 'Matched to', render: (l) => (l.matchRef ? <div className="min-w-[180px]"><DocLink to={l.matchLink}>{l.matchRef}</DocLink>{l.rule && <div className="text-[10px] text-slate-400">Rule: {l.rule}</div>}</div> : <span className="text-xs text-slate-500">{l.rule}</span>) },
    {
      key: 'act', header: '',
      render: (l) =>
        l.status === 'Suggested' ? (
          <Button size="sm" icon={<CircleCheck size={13} />} onClick={() => { setStatus(l.id, { status: 'Manually matched' }); toast(`Match confirmed: ${l.matchRef}`, 'success') }}>Confirm</Button>
        ) : l.status === 'Unmatched' ? (
          <Button size="sm" icon={<FilePlus2 size={13} />} onClick={() => { setStatus(l.id, { status: 'Manually matched', matchRef: 'JV-2028-03-0022 (new)', rule: 'Journal created from statement line' }); toast('Journal drafted from statement line with GEN-HO / CC-110 dimensions — sent for approval', 'success') }}>Create journal</Button>
        ) : null,
    },
  ]

  return (
    <div>
      <PageHeader
        module="M13 · Cash & Bank"
        title="Cash & bank"
        subtitle="Bank accounts, statement import and reconciliation, cash position and 13-week forecast. The destination of every payment and receipt."
        crumbs={[{ label: 'Finance' }, { label: 'Cash & bank' }]}
        actions={
          <>
            <Button icon={<Upload size={15} />} onClick={() => toast('Statements imported: Mandiri (H2H), BCA & BNI (MT940) to 10 Mar 06:00', 'success')}>Import statements</Button>
            <Button
              variant="primary"
              icon={<Wand2 size={15} />}
              onClick={() => {
                const n = lines.filter((l) => l.status === 'Suggested').length
                setLines((ls) => ls.map((l) => (l.status === 'Suggested' ? { ...l, status: 'Auto-matched' } : l)))
                toast(n ? `Auto-match: ${n} suggested line(s) matched; ${lines.filter((l) => l.status === 'Unmatched').length} remain for review` : 'Nothing new to match', n ? 'success' : 'info')
              }}
            >
              Run auto-match
            </Button>
          </>
        }
      />

      <Grid cols={4} className="mb-4">
        <Stat label="Cash & bank (book)" value={idrShort(total + 186_500_000)} sub={`${bankAccounts.length} bank accounts + site petty cash`} icon={<Banknote size={16} />} />
        <Stat label="Items to reconcile" value={num(unmatched.length)} sub={`${lines.filter((l) => l.status === 'Auto-matched').length} of ${lines.length} lines auto-matched`} tone={unmatched.length ? 'warn' : 'good'} />
        <Stat label="13-week low point" value={idrShort(low['Closing balance'])} sub={`${low.week} · buffer ${idrShort(MIN_CASH)}`} tone={low['Closing balance'] < MIN_CASH ? 'bad' : 'good'} />
        <Stat label="Undrawn facility" value={idrShort(10_000_000_000)} sub="Mandiri working capital line" />
      </Grid>

      <Card padded={false} className="mb-4">
        <div className="px-4 pt-4"><CardHeader title="Bank accounts" subtitle="Book balance vs latest imported statement" /></div>
        <DataTable
          rows={bankAccounts}
          rowKey={(a) => a.id}
          onRowClick={(a) => setAcct(a.id)}
          rowClassName={(a) => (a.id === acct ? 'bg-brand-50/50' : undefined)}
          columns={[
            { key: 'b', header: 'Account', render: (a) => <div className="min-w-[200px]"><div className="font-medium">{a.bank} <Mono className="text-slate-500">{a.number}</Mono></div><div className="text-[11px] text-slate-500">{a.purpose}</div></div> },
            { key: 'gl', header: 'GL', render: (a) => <DocLink to={`/finance/gl?account=${a.glAccount}`}>{a.glAccount}</DocLink> },
            { key: 'ch', header: 'Feed', render: (a) => <Badge tone={a.channel === 'H2H' ? 'green' : a.channel === 'MT940 SFTP' ? 'sky' : 'amber'}>{a.channel}</Badge> },
            { key: 'bk', header: 'Book balance', align: 'right', render: (a) => idr(a.balance) },
            { key: 'st', header: 'Statement', align: 'right', render: (a) => idr(a.statementBalance) },
            { key: 'df', header: 'Difference', align: 'right', render: (a) => <span className={cx(a.statementBalance - a.balance ? 'text-amber-700' : 'text-emerald-700')}>{a.statementBalance - a.balance ? idr(a.statementBalance - a.balance) : '0'}</span> },
            { key: 'imp', header: 'Last import', render: (a) => <span className="text-xs whitespace-nowrap">{dateTime(a.lastImport)}</span> },
            { key: 'rec', header: 'Reconciled to', render: (a) => <span className="whitespace-nowrap">{date(a.reconciledTo)}</span> },
          ]}
        />
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card padded={false} className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Statement reconciliation</h3>
              <p className="text-xs text-slate-500">Auto-match by payment batch, invoice number, NTPN and amount rules</p>
            </div>
            <Select value={acct} onChange={(e) => setAcct(e.target.value)}>
              {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.bank} · {a.number}</option>)}
            </Select>
          </div>
          <DataTable columns={cols} rows={shown} rowKey={(l) => l.id} empty="No statement lines imported since last reconciliation" rowClassName={(l) => (l.status === 'Unmatched' ? 'bg-red-50/30' : undefined)} />
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Reconciliation — selected account" />
            {(() => {
              const a = bankAccounts.find((x) => x.id === acct)!
              const open = shown.filter((l) => l.status === 'Unmatched' || l.status === 'Suggested')
              return (
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Statement balance</span><span className="num">{idr(a.statementBalance)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Items not yet in books</span><span className="num">{idr(-open.reduce((s, l) => s + l.amount, 0))}</span></div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5"><span className="text-slate-500">Adjusted statement</span><span className="num">{idr(a.statementBalance - open.reduce((s, l) => s + l.amount, 0))}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Book balance</span><span className="num">{idr(a.balance)}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold"><span>Unexplained</span><span className="num">{idr(a.statementBalance - open.reduce((s, l) => s + l.amount, 0) - a.balance)}</span></div>
                </div>
              )
            })()}
          </Card>
          <Callout tone="slate" icon={<Link2 size={16} />}>Payment runs post via host-to-host with Bank Mandiri; the bank's execution file closes the loop automatically. Receipts on BCA match on invoice number net of PPh 23 withheld by the customer.</Callout>
        </div>
      </div>

      <Card>
        <CardHeader title="13-week cash forecast" subtitle="From AR due dates & collection history, approved AP and payment runs, payroll, tax and loan instalments" />
        <Legend items={[{ label: 'Inflows', color: SERIES[0] }, { label: 'Outflows', color: SERIES[1] }, { label: 'Closing balance', color: SERIES[6] }, { label: `Minimum buffer ${idrShort(MIN_CASH)}`, color: STATUS.bad, dashed: true }]} />
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={forecast} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="week" {...axisProps} tick={{ fontSize: 10, fill: '#64748b' }} interval={1} />
            <YAxis {...axisProps} tickFormatter={(v: number) => idrShort(v).replace('IDR ', '')} width={64} />
            <Tooltip content={<ChartTooltip format={idrShort} />} cursor={{ fill: '#f1f5f9' }} />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <ReferenceLine y={MIN_CASH} stroke={STATUS.bad} strokeDasharray="4 4" />
            <Bar dataKey="Inflows" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="Outflows" fill={SERIES[1]} radius={[0, 0, 4, 4]} maxBarSize={18} />
            <Line dataKey="Closing balance" stroke={SERIES[6]} strokeWidth={2} dot={false} type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Opening position {idrShort(OPENING_CASH)} on 10 Mar 2028. W13 dips on the PPh 25 instalment, payroll and the quarterly loan instalment.</span>
          <ArchiveNote>cash balances migrated at statement level (CUT-01)</ArchiveNote>
        </div>
      </Card>
    </div>
  )
}
