import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Plus, Scale } from 'lucide-react'
import { businessLines, type BusinessLine } from '@/data/core'
import { accounts, accountBalance, costCentres, currentYearProfit, type Account } from '@/data/finance'
import { PageHeader, Card, CardHeader, Grid, Stat, Tabs, Button, SearchInput, Badge, Mono, DataTable, Callout, cx, type Column } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { idr, idrShort } from '@/lib/format'
import { ArchiveNote, BLTag, empName } from './components'

type Tab = 'tree' | 'cc' | 'rules'

const ruleTone = (r?: string) => (r === 'Mandatory' ? 'amber' : r === 'Mandatory · GEN allowed' ? 'sky' : 'slate')

export default function ChartOfAccounts() {
  const nav = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('tree')
  const [q, setQ] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['1102', '1103', '1104', '1105', '1106', '1201', '1202', '2103', '2104']))

  const children = useMemo(() => {
    const m = new Map<string, Account[]>()
    for (const a of accounts) if (a.parent) m.set(a.parent, [...(m.get(a.parent) ?? []), a])
    return m
  }, [])

  const rows = useMemo(() => {
    const out: { a: Account; depth: number }[] = []
    const walk = (a: Account, depth: number) => {
      out.push({ a, depth })
      if (q || !collapsed.has(a.code)) for (const c of children.get(a.code) ?? []) walk(c, depth + 1)
    }
    for (const a of accounts.filter((x) => !x.parent)) walk(a, 0)
    if (!q) return out
    const s = q.toLowerCase()
    return out.filter(({ a }) => a.code.includes(s) || a.name.toLowerCase().includes(s) || (a.sapCode ?? '').includes(s))
  }, [q, collapsed, children])

  const toggle = (code: string) =>
    setCollapsed((c) => {
      const n = new Set(c)
      if (n.has(code)) n.delete(code)
      else n.add(code)
      return n
    })

  const assets = accountBalance('1')
  const liab = accountBalance('2')
  const equity = accountBalance('3')
  const profit = currentYearProfit()
  const revenue = accountBalance('4')

  return (
    <div>
      <PageHeader
        module="M8 · General Ledger"
        title="Chart of accounts"
        subtitle="Dimensional chart of accounts in SAK structure. Account is one of four dimensions — cost centre, project code and business line are held on the line, not encoded in the account number."
        crumbs={[{ label: 'Finance' }, { label: 'Chart of accounts' }]}
        actions={<Button variant="primary" icon={<Plus size={15} />} onClick={() => toast('New account request sent to MDM for approval', 'info')}>Request new account</Button>}
      />

      <Grid cols={4} className="mb-4">
        <Stat label="Total assets" value={idrShort(assets)} sub="As at 10 Mar 2028" />
        <Stat label="Liabilities + equity" value={idrShort(liab + equity)} sub={Math.abs(assets - liab - equity) < 1 ? 'Balanced ✓' : 'Out of balance'} tone={Math.abs(assets - liab - equity) < 1 ? 'good' : 'bad'} icon={<Scale size={16} />} />
        <Stat label="Revenue YTD 2028" value={idrShort(revenue)} sub="Jan – 10 Mar 2028" />
        <Stat label="Profit before tax YTD" value={idrShort(profit + accountBalance('8'))} sub={`Net after tax ${idrShort(profit)}`} tone={profit > 0 ? 'good' : 'bad'} />
      </Grid>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'tree', label: 'Accounts', count: accounts.filter((a) => a.posting).length },
          { key: 'cc', label: 'Cost centres', count: costCentres.length },
          { key: 'rules', label: 'Dimension rules' },
        ]}
      />

      {tab === 'tree' && (
        <Card padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3">
            <SearchInput value={q} onChange={setQ} placeholder="Search code, name or SAP B1 code…" className="w-full sm:w-80" />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCollapsed(new Set())}>Expand all</Button>
              <Button size="sm" variant="ghost" onClick={() => setCollapsed(new Set(accounts.filter((a) => !a.posting && a.parent).map((a) => a.code)))}>Collapse</Button>
            </div>
          </div>
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Project code</th>
                  <th className="px-3 py-2">Cost centre</th>
                  <th className="px-3 py-2">SAP B1 map</th>
                  <th className="px-3 py-2 text-right">Opening 01 Jan (CUT-01)</th>
                  <th className="px-3 py-2 text-right">Movement YTD</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ a, depth }) => {
                  const bal = accountBalance(a.code)
                  const open = accountBalance(a.code, 'opening')
                  const isHeader = !a.posting
                  const hasKids = children.has(a.code)
                  return (
                    <tr
                      key={a.code}
                      className={cx('border-b border-slate-100', isHeader ? (depth === 0 ? 'bg-slate-50 font-semibold' : 'font-medium') : 'cursor-pointer hover:bg-brand-50/40')}
                      onClick={() => (a.posting ? nav(`/finance/gl?account=${a.code}`) : hasKids && toggle(a.code))}
                    >
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1" style={{ paddingLeft: depth * 18 }}>
                          {hasKids ? (
                            <button onClick={(e) => { e.stopPropagation(); toggle(a.code) }} className="text-slate-400">
                              {collapsed.has(a.code) && !q ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            </button>
                          ) : (
                            <span className="w-3.5" />
                          )}
                          <Mono className="w-16 shrink-0 text-slate-500">{a.code}</Mono>
                          <span className="text-slate-800">{a.name}</span>
                          {a.note && <span className="ml-1 hidden text-[11px] font-normal text-slate-400 xl:inline" title={a.note}>ⓘ</span>}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-slate-500">{depth === 0 ? a.cls : ''}</td>
                      <td className="px-3 py-1.5">{a.posting && a.projectRule && <Badge tone={ruleTone(a.projectRule)}>{a.projectRule}</Badge>}</td>
                      <td className="px-3 py-1.5">{a.posting && <Badge tone={a.ccRule === 'Mandatory' ? 'amber' : 'slate'}>{a.ccRule}</Badge>}</td>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-slate-500">{a.sapCode ?? ''}</td>
                      <td className="num px-3 py-1.5 text-right text-slate-600">{open ? idr(open) : '—'}</td>
                      <td className="num px-3 py-1.5 text-right text-slate-600">{idr(bal - open)}</td>
                      <td className={cx('num px-3 py-1.5 text-right', bal < 0 ? 'text-red-600' : 'text-slate-900')}>{idr(bal)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
            <span className="text-xs text-slate-500">Natural-side balances; contra accounts shown negative. Click a posting account to open its journals.</span>
            <ArchiveNote>opening balances migrated from SAP B1 accounts (CUT-01)</ArchiveNote>
          </div>
        </Card>
      )}

      {tab === 'cc' && <CostCentres />}

      {tab === 'rules' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Four dimensions on every line" subtitle="§3.4.1 — reports read from any perspective without recalculation" />
            <ul className="space-y-3 text-sm">
              <li><b>Account</b> — what: natural classification per SAK (this chart).</li>
              <li><b>Cost centre</b> — who/where: organisational unit accountable for the spend.</li>
              <li><b>Project code</b> — for which contracted work: mandatory on every transaction line, enforced by database constraint. Overhead falls to GEN-HO / GEN-BPN and is distributed by the allocation engine.</li>
              <li><b>Business line</b> — derived from the project code (HL, PS, GS, Corporate) so it can never contradict it.</li>
            </ul>
          </Card>
          <Card>
            <CardHeader title="Business lines" />
            <div className="space-y-2">
              {(Object.keys(businessLines) as BusinessLine[]).map((bl) => (
                <div key={bl} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><BLTag bl={bl} /> {businessLines[bl].name}</span>
                  <span className="text-xs text-slate-500">{bl === 'CORP' ? 'GEN-HO, GEN-BPN' : `Revenue account ${bl === 'HL' ? '4101' : bl === 'PS' ? '4102' : '4103'}`}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Validation rules applied at posting" />
            <Callout tone="amber">
              A line without a valid, active project code is rejected. The controlled exception routes it to the GEN code of the posting site and flags it for review. Revenue and cost-of-revenue accounts accept direct project codes only; operating expenses accept GEN codes. Cost centre is mandatory on P/L accounts.
            </Callout>
          </Card>
        </div>
      )}
    </div>
  )
}

function CostCentres() {
  const cols: Column<(typeof costCentres)[number]>[] = [
    { key: 'code', header: 'Code', render: (c) => <Mono>{c.code}</Mono> },
    { key: 'name', header: 'Cost centre', render: (c) => c.name },
    { key: 'loc', header: 'Location', render: (c) => c.location },
    { key: 'bl', header: 'Business line', render: (c) => <BLTag bl={c.businessLine} /> },
    { key: 'owner', header: 'Owner', render: (c) => empName(c.ownerId) },
  ]
  return (
    <Card padded={false}>
      <DataTable columns={cols} rows={costCentres} rowKey={(c) => c.code} />
    </Card>
  )
}
