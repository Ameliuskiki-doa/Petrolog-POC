import { useMemo, useState } from 'react'
import { Boxes, PackagePlus, PackageMinus, ArrowLeftRight, ClipboardCheck, AlertTriangle, Fuel, Warehouse as WarehouseIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Badge, Button, Callout, Card, CardHeader, DataTable, DescList, Drawer, FormField, Grid, Input, Mono, PageHeader, ProjectCodeChip, SearchInput, Select, Stat, StatusBadge, Tabs,
  type Column,
} from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { date, idr, idrShort, num } from '@/lib/format'
import { ChartTooltip, GRID, SERIES, axisProps } from '@/lib/chart'
import { projects } from '@/data/core'
import {
  getItem, getWarehouse, items as seedItems, movements as seedMovements, stockCounts as seedCounts, stockValue, totalStock, warehouses,
  type Item, type Movement, type MovementType, type StockCount,
} from '@/data/supporting'
import { Person, RefLink } from './shared'

type TabKey = 'items' | 'warehouses' | 'movements' | 'counts'

export default function Inventory() {
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('items')
  const [itemList, setItemList] = useState<Item[]>(seedItems)
  const [moves, setMoves] = useState<Movement[]>(seedMovements)
  const [counts, setCounts] = useState<StockCount[]>(seedCounts)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [wh, setWh] = useState('All')
  const [mvType, setMvType] = useState<'All' | MovementType>('All')
  const [selItem, setSelItem] = useState<Item | null>(null)
  const [selCount, setSelCount] = useState<StockCount | null>(null)
  const [txOpen, setTxOpen] = useState<null | 'Receipt' | 'Issue'>(null)

  const totalValue = itemList.reduce((a, i) => a + stockValue(i), 0)
  const belowRop = itemList.filter((i) => totalStock(i) <= i.reorderPoint)
  const fuel = itemList.find((i) => i.id === 'ITM-30001')

  const filteredItems = itemList.filter(
    (i) =>
      (cat === 'All' || i.category === cat) &&
      (wh === 'All' || (i.stock[wh] ?? 0) > 0) &&
      (!q || `${i.id} ${i.name} ${i.partNo ?? ''} ${i.fits ?? ''}`.toLowerCase().includes(q.toLowerCase())),
  )
  const filteredMoves = moves.filter(
    (m) =>
      (mvType === 'All' || m.type === mvType) &&
      (wh === 'All' || m.warehouseId === wh || m.toWarehouseId === wh) &&
      (!q || `${m.id} ${m.itemId} ${getItem(m.itemId)?.name} ${m.ref} ${m.projectCode}`.toLowerCase().includes(q.toLowerCase())),
  )

  const byWarehouse = warehouses.map((w) => {
    const value = itemList.reduce((a, i) => a + (i.stock[w.id] ?? 0) * i.avgCost, 0)
    const skus = itemList.filter((i) => (i.stock[w.id] ?? 0) > 0).length
    return { ...w, value, skus }
  })

  const itemCols: Column<Item>[] = [
    { key: 'id', header: 'Item', render: (i) => (
      <div className="min-w-[220px]">
        <div className="font-medium text-slate-800">{i.name}</div>
        <div className="text-xs text-slate-500"><Mono>{i.id}</Mono>{i.partNo && <> · {i.partNo}</>}</div>
      </div>
    ) },
    { key: 'cat', header: 'Category', render: (i) => <Badge>{i.category}</Badge> },
    { key: 'uom', header: 'UoM', render: (i) => i.uom },
    ...warehouses.map<Column<Item>>((w) => ({
      key: w.id, header: <span title={w.name}>{w.id}</span>, align: 'right',
      render: (i) => (i.stock[w.id] ? num(i.stock[w.id]) : <span className="text-slate-300">—</span>),
    })),
    { key: 'total', header: 'On hand', align: 'right', render: (i) => {
      const t = totalStock(i)
      return <span className={t <= i.reorderPoint ? 'font-semibold text-red-600' : 'font-semibold'}>{num(t)}</span>
    } },
    { key: 'rop', header: 'ROP', align: 'right', render: (i) => <span className="text-slate-500">{num(i.reorderPoint)}</span> },
    { key: 'avg', header: 'Moving avg cost', align: 'right', render: (i) => idr(i.avgCost) },
    { key: 'val', header: 'Stock value', align: 'right', render: (i) => idrShort(stockValue(i)) },
  ]

  const mvCols: Column<Movement>[] = [
    { key: 'id', header: 'Movement', render: (m) => <div><Mono>{m.id}</Mono><div className="text-xs text-slate-500">{date(m.date)}</div></div> },
    { key: 'type', header: 'Type', render: (m) => <Badge tone={{ Receipt: 'green', Issue: 'blue', Transfer: 'violet', Adjustment: 'orange', Return: 'sky' }[m.type] as 'green'}>{m.type}</Badge> },
    { key: 'item', header: 'Item', render: (m) => <div className="min-w-[180px] text-sm">{getItem(m.itemId)?.name}<div className="text-xs text-slate-500"><Mono>{m.itemId}</Mono></div></div> },
    { key: 'wh', header: 'Warehouse', render: (m) => <span className="text-xs">{m.warehouseId}{m.toWarehouseId && <> → {m.toWarehouseId}</>}</span> },
    { key: 'qty', header: 'Qty', align: 'right', render: (m) => <span className={m.qty < 0 ? 'text-red-600' : 'text-emerald-700'}>{m.qty > 0 ? '+' : ''}{num(m.qty)} {getItem(m.itemId)?.uom}</span> },
    { key: 'val', header: 'Value', align: 'right', render: (m) => idrShort(Math.abs(m.qty) * m.unitCost) },
    { key: 'pc', header: 'Project code', render: (m) => <ProjectCodeChip code={m.projectCode} /> },
    { key: 'ref', header: 'Source doc', render: (m) => <RefLink refId={m.ref} /> },
    { key: 'jv', header: 'Journal', render: (m) => (m.journal ? <RefLink refId={m.journal} /> : <span className="text-xs text-slate-400">no GL impact</span>) },
  ]

  const countCols: Column<StockCount>[] = [
    { key: 'id', header: 'Count', render: (c) => <Mono>{c.id}</Mono> },
    { key: 'wh', header: 'Warehouse', render: (c) => getWarehouse(c.warehouseId)?.name },
    { key: 'kind', header: 'Type', render: (c) => c.kind },
    { key: 'date', header: 'Date', render: (c) => date(c.date) },
    { key: 'by', header: 'Counter', render: (c) => <Person id={c.counterId} /> },
    { key: 'prog', header: 'Lines counted', align: 'right', render: (c) => `${c.lines.filter((l) => l.counted !== null).length} / ${c.lines.length}` },
    { key: 'var', header: 'Variance value', align: 'right', render: (c) => {
      const v = c.lines.reduce((a, l) => a + (l.counted === null ? 0 : (l.counted - l.system) * (getItem(l.itemId)?.avgCost ?? 0)), 0)
      return <span className={v < 0 ? 'text-red-600' : ''}>{idr(v)}</span>
    } },
    { key: 'st', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
  ]

  const postTx = (t: { type: 'Receipt' | 'Issue'; itemId: string; warehouseId: string; qty: number; projectCode: string; ref: string; unitCost: number }) => {
    const it = itemList.find((i) => i.id === t.itemId)!
    const signed = t.type === 'Issue' ? -t.qty : t.qty
    const onHand = totalStock(it)
    const newAvg = t.type === 'Receipt' ? Math.round((onHand * it.avgCost + t.qty * t.unitCost) / (onHand + t.qty)) : it.avgCost
    setItemList((l) => l.map((i) => (i.id === it.id ? { ...i, avgCost: newAvg, stock: { ...i.stock, [t.warehouseId]: (i.stock[t.warehouseId] ?? 0) + signed } } : i)))
    const id = `MV-28-03-${String(442 + moves.length).padStart(4, '0')}`
    setMoves((m) => [
      { id, date: '2028-03-10', type: t.type, itemId: it.id, warehouseId: t.warehouseId, qty: signed, unitCost: t.type === 'Receipt' ? t.unitCost : it.avgCost, projectCode: t.projectCode, ref: t.ref, byId: 'EMP-0024', avgAfter: newAvg, journal: `JV-2028-03-${String(320 + m.length).padStart(4, '0')}` },
      ...m,
    ])
    toast(`${t.type} ${id} posted to ${t.projectCode}${t.type === 'Receipt' ? ` — moving average now ${idr(newAvg)}` : ''}`, 'success')
    setTxOpen(null)
    setTab('movements')
  }

  return (
    <>
      <PageHeader
        module="M14 · Inventory & Warehouse · Stage 1B"
        title="Inventory & Warehouse"
        subtitle="Item master, multi-warehouse stock and fuel tanks, moving-average valuation. Every receipt and issue carries a project code and posts to the GL automatically."
        actions={
          <>
            <Button icon={<PackageMinus size={15} />} onClick={() => setTxOpen('Issue')}>Issue stock</Button>
            <Button variant="primary" icon={<PackagePlus size={15} />} onClick={() => setTxOpen('Receipt')}>Receive stock</Button>
          </>
        }
      />

      <Grid cols={4} className="mb-5">
        <Stat label="Inventory value (moving avg)" value={idrShort(totalValue)} sub={`${itemList.length} active SKUs · ${warehouses.length} locations`} icon={<Boxes size={16} />} />
        <Stat label="Below reorder point" value={belowRop.length} sub={belowRop.slice(0, 2).map((i) => i.name.split(' —')[0]).join(', ')} tone="bad" icon={<AlertTriangle size={16} />} />
        <Stat label="HSD in tanks" value={`${num(fuel ? totalStock(fuel) : 0)} L`} sub="T-01 Kutai 63% · Balikpapan 43%" icon={<Fuel size={16} />} />
        <Stat label="Movements MTD" value={moves.filter((m) => m.date >= '2028-03-01').length} sub="All carry a project code (FAT-18)" tone="good" icon={<ArrowLeftRight size={16} />} />
      </Grid>

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'items', label: 'Items', count: itemList.length },
          { key: 'warehouses', label: 'Stock by warehouse', count: warehouses.length },
          { key: 'movements', label: 'Movements', count: moves.length },
          { key: 'counts', label: 'Stock count', count: counts.length },
        ]}
      />

      {(tab === 'items' || tab === 'movements') && (
        <div className="mb-3 flex flex-wrap gap-2">
          <SearchInput value={q} onChange={setQ} placeholder={tab === 'items' ? 'Search item, part no, fits…' : 'Search item, reference, project code…'} className="w-full sm:w-72" />
          <Select value={wh} onChange={(e) => setWh(e.target.value)}>
            <option value="All">All warehouses</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
          {tab === 'items' ? (
            <Select value={cat} onChange={(e) => setCat(e.target.value)}>
              {['All', ...new Set(itemList.map((i) => i.category))].map((c) => <option key={c}>{c}</option>)}
            </Select>
          ) : (
            <Select value={mvType} onChange={(e) => setMvType(e.target.value as 'All')}>
              {['All', 'Receipt', 'Issue', 'Transfer', 'Adjustment', 'Return'].map((c) => <option key={c}>{c}</option>)}
            </Select>
          )}
        </div>
      )}

      {tab === 'items' && (
        <Card padded={false}>
          <DataTable columns={itemCols} rows={filteredItems} rowKey={(i) => i.id} onRowClick={setSelItem} dense
            rowClassName={(i) => (totalStock(i) <= i.reorderPoint ? 'bg-red-50/40' : undefined)}
            footer={<tr><td className="px-3 py-2" colSpan={3 + warehouses.length + 3}>Total ({filteredItems.length} items)</td><td className="num px-3 py-2 text-right">{idrShort(filteredItems.reduce((a, i) => a + stockValue(i), 0))}</td></tr>}
          />
        </Card>
      )}

      {tab === 'warehouses' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Stock value by location" subtitle="Moving-average valuation, IDR" />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byWarehouse.map((w) => ({ name: w.id, value: w.value }))}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={(v) => `${(v / 1e6).toFixed(0)} m`} width={56} />
                <Tooltip content={<ChartTooltip format={idrShort} />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="value" name="Stock value" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardHeader title="Fuel tanks" subtitle="Dip vs book — tank dips feed M4 fuel reconciliation" />
            {warehouses.filter((w) => w.kind === 'Fuel tank').map((w) => {
              const qty = fuel?.stock[w.id] ?? 0
              const cap = Number((w.capacity ?? '0').replace(/\D/g, ''))
              const p = (qty / cap) * 100
              return (
                <div key={w.id} className="mb-4 last:mb-0">
                  <div className="flex justify-between text-sm"><span className="font-medium">{w.name}</span><span className="num">{num(qty)} L</span></div>
                  <div className="mt-1.5 h-3 overflow-hidden rounded bg-slate-100"><div className="h-full rounded" style={{ width: `${p}%`, background: SERIES[0] }} /></div>
                  <div className="mt-1 flex justify-between text-xs text-slate-500"><span>{p.toFixed(0)}% of {w.capacity}</span><ProjectCodeChip code={w.defaultCode} /></div>
                </div>
              )
            })}
          </Card>
          <Card padded={false} className="lg:col-span-3">
            <div className="p-4 pb-0"><CardHeader title="Locations" /></div>
            <DataTable
              rows={byWarehouse}
              rowKey={(w) => w.id}
              onRowClick={(w) => { setWh(w.id); setTab('items') }}
              columns={[
                { key: 'id', header: 'Code', render: (w) => <Mono>{w.id}</Mono> },
                { key: 'name', header: 'Name', render: (w) => <span className="flex items-center gap-2"><WarehouseIcon size={14} className="text-slate-400" />{w.name}</span> },
                { key: 'kind', header: 'Type', render: (w) => <Badge tone={w.kind === 'Fuel tank' ? 'amber' : w.kind === 'Site store' ? 'sky' : 'slate'}>{w.kind}</Badge> },
                { key: 'loc', header: 'Location', render: (w) => w.location },
                { key: 'keeper', header: 'Store keeper', render: (w) => <Person id={w.keeperId} /> },
                { key: 'def', header: 'Holding code', render: (w) => <ProjectCodeChip code={w.defaultCode} /> },
                { key: 'skus', header: 'SKUs', align: 'right', render: (w) => w.skus },
                { key: 'val', header: 'Value', align: 'right', render: (w) => idrShort(w.value) },
              ]}
            />
          </Card>
        </div>
      )}

      {tab === 'movements' && (
        <Card padded={false}>
          <DataTable columns={mvCols} rows={filteredMoves} rowKey={(m) => m.id} dense />
        </Card>
      )}

      {tab === 'counts' && (
        <>
          <div className="mb-3"><Callout tone="blue" title="Count variances post as adjustments">Approved variances post an adjustment movement at moving-average cost to the warehouse holding code and a journal to inventory shrinkage. Tank dips reconcile against book fuel for M4.</Callout></div>
          <Card padded={false}>
            <DataTable columns={countCols} rows={counts} rowKey={(c) => c.id} onRowClick={setSelCount} />
          </Card>
        </>
      )}

      <ItemDrawer item={selItem} onClose={() => setSelItem(null)} moves={moves} />
      <CountDrawer
        count={selCount}
        onClose={() => setSelCount(null)}
        onChange={(c) => { setCounts((l) => l.map((x) => (x.id === c.id ? c : x))); setSelCount(c) }}
      />
      <TxDrawer mode={txOpen} onClose={() => setTxOpen(null)} items={itemList} onPost={postTx} />
    </>
  )
}

function ItemDrawer({ item, onClose, moves }: { item: Item | null; onClose: () => void; moves: Movement[] }) {
  if (!item) return null
  const hist = moves.filter((m) => m.itemId === item.id)
  return (
    <Drawer open onClose={onClose} title={item.name} width="max-w-2xl">
      <DescList
        cols={3}
        items={[
          { label: 'Item code', value: <Mono>{item.id}</Mono> },
          { label: 'Part number', value: item.partNo ?? '—' },
          { label: 'Category', value: item.category },
          { label: 'Moving-average cost', value: idr(item.avgCost) },
          { label: 'On hand', value: `${num(totalStock(item))} ${item.uom}` },
          { label: 'Reorder point', value: `${num(item.reorderPoint)} ${item.uom}` },
          { label: 'Fits', value: item.fits ?? '—' },
          { label: 'Stock value', value: idr(stockValue(item)) },
          { label: 'Golden record', value: <Badge tone="green">MDM-owned</Badge> },
        ]}
      />
      {totalStock(item) <= item.reorderPoint && (
        <div className="mt-4"><Callout tone="amber" title="Below reorder point">A replenishment PR can be raised to GEN-BPN from here — the budget check runs against the RAB of the charging code.</Callout></div>
      )}
      <h4 className="mt-5 mb-2 text-sm font-semibold">Stock by location</h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Object.entries(item.stock).map(([w, q]) => (
          <div key={w} className="rounded-lg border border-slate-200 p-2.5">
            <div className="text-xs text-slate-500">{getWarehouse(w)?.name}</div>
            <div className="num font-semibold">{num(q)} {item.uom}</div>
          </div>
        ))}
      </div>
      <h4 className="mt-5 mb-2 text-sm font-semibold">Movement history & valuation</h4>
      <DataTable
        dense
        rows={hist}
        rowKey={(m) => m.id}
        empty="No movements in the last 90 days"
        columns={[
          { key: 'd', header: 'Date', render: (m) => date(m.date) },
          { key: 't', header: 'Type', render: (m) => m.type },
          { key: 'q', header: 'Qty', align: 'right', render: (m) => num(m.qty) },
          { key: 'c', header: 'Unit cost', align: 'right', render: (m) => idr(m.unitCost) },
          { key: 'a', header: 'Avg after', align: 'right', render: (m) => idr(m.avgAfter) },
          { key: 'p', header: 'Code', render: (m) => <ProjectCodeChip code={m.projectCode} /> },
          { key: 'r', header: 'Ref', render: (m) => <RefLink refId={m.ref} /> },
        ]}
      />
    </Drawer>
  )
}

function CountDrawer({ count, onClose, onChange }: { count: StockCount | null; onClose: () => void; onChange: (c: StockCount) => void }) {
  const toast = useToast()
  if (!count) return null
  const editable = count.status === 'In Progress' || count.status === 'Planned'
  const setLine = (idx: number, v: string) =>
    onChange({ ...count, status: count.status === 'Planned' ? 'In Progress' : count.status, lines: count.lines.map((l, i) => (i === idx ? { ...l, counted: v === '' ? null : Number(v) } : l)) })
  const pending = count.lines.some((l) => l.counted === null)
  return (
    <Drawer
      open
      onClose={onClose}
      title={`${count.kind} · ${count.id}`}
      width="max-w-2xl"
      footer={
        <>
          {count.status === 'In Progress' && (
            <Button variant="primary" disabled={pending} onClick={() => { onChange({ ...count, status: 'Pending Approval' }); toast('Count submitted for approval by Maintenance Superintendent', 'info') }}>
              Submit count
            </Button>
          )}
          {count.status === 'Pending Approval' && (
            <Button variant="success" onClick={() => { onChange({ ...count, status: 'Posted' }); toast('Variance adjustment posted — journal JV-2028-03-0331 created', 'success') }}>
              Approve & post variance
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <DescList items={[{ label: 'Warehouse', value: getWarehouse(count.warehouseId)?.name }, { label: 'Date', value: date(count.date) }, { label: 'Status', value: <StatusBadge status={count.status} /> }]} />
      {count.lines.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">Count sheet generated on the count date (ABC cycle: A-class items weekly, B monthly, C quarterly). Counting is blind — system quantities are hidden from the counter on mobile.</p>
      ) : (
        <div className="mt-5">
          <DataTable
            dense
            rows={count.lines.map((l, i) => ({ ...l, i }))}
            rowKey={(l) => l.itemId}
            columns={[
              { key: 'i', header: 'Item', render: (l) => <div className="text-sm">{getItem(l.itemId)?.name}<div className="text-xs text-slate-500"><Mono>{l.itemId}</Mono></div></div> },
              { key: 's', header: 'System', align: 'right', render: (l) => num(l.system) },
              { key: 'c', header: 'Counted', align: 'right', render: (l) => editable ? (
                <Input type="number" className="h-8 w-24 text-right" value={l.counted ?? ''} onChange={(e) => setLine(l.i, e.target.value)} />
              ) : num(l.counted ?? 0) },
              { key: 'v', header: 'Variance', align: 'right', render: (l) => l.counted === null ? <span className="text-slate-300">—</span> : (
                <span className={l.counted - l.system < 0 ? 'text-red-600' : l.counted - l.system > 0 ? 'text-emerald-700' : 'text-slate-500'}>{num(l.counted - l.system)}</span>
              ) },
              { key: 'val', header: 'Value', align: 'right', render: (l) => l.counted === null ? '' : idr((l.counted - l.system) * (getItem(l.itemId)?.avgCost ?? 0)) },
            ]}
          />
        </div>
      )}
    </Drawer>
  )
}

function TxDrawer({ mode, onClose, items, onPost }: {
  mode: null | 'Receipt' | 'Issue'
  onClose: () => void
  items: Item[]
  onPost: (t: { type: 'Receipt' | 'Issue'; itemId: string; warehouseId: string; qty: number; projectCode: string; ref: string; unitCost: number }) => void
}) {
  const toast = useToast()
  const [itemId, setItemId] = useState('ITM-10022')
  const [warehouseId, setWarehouseId] = useState('WH-BPN')
  const [qty, setQty] = useState('2')
  const [projectCode, setProjectCode] = useState('')
  const [ref, setRef] = useState('')
  const [cost, setCost] = useState('1250000')
  const it = items.find((i) => i.id === itemId)
  const avail = it?.stock[warehouseId] ?? 0
  const codes = useMemo(() => projects.filter((p) => p.status !== 'Closed'), [])
  if (!mode) return null
  const submit = () => {
    const n = Number(qty)
    if (!projectCode) return toast('Rejected: every stock movement must carry a project code (FAT-18)', 'error')
    if (!n || n <= 0) return toast('Enter a quantity greater than zero', 'error')
    if (mode === 'Issue' && n > avail) return toast(`Rejected: only ${num(avail)} ${it?.uom} on hand in ${warehouseId} — negative stock is not allowed`, 'error')
    if (!ref) return toast(mode === 'Receipt' ? 'Enter the PO / GRN reference' : 'Enter the work order or job reference', 'error')
    onPost({ type: mode, itemId, warehouseId, qty: n, projectCode, ref, unitCost: Number(cost) })
  }
  return (
    <Drawer
      open
      onClose={onClose}
      title={mode === 'Receipt' ? 'Receive stock (goods receipt)' : 'Issue stock'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit} icon={<ClipboardCheck size={15} />}>Post {mode.toLowerCase()}</Button></>}
    >
      <div className="space-y-4">
        <FormField label="Item">
          <Select className="w-full" value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {items.map((i) => <option key={i.id} value={i.id}>{i.id} — {i.name}</option>)}
          </Select>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Warehouse" hint={mode === 'Issue' ? `Available: ${num(avail)} ${it?.uom ?? ''}` : undefined}>
            <Select className="w-full" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </Select>
          </FormField>
          <FormField label={`Quantity (${it?.uom ?? ''})`}>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Project code (mandatory)" hint="Issues charge the consuming project; receipts charge the holding code until issue.">
          <Select className="w-full" value={projectCode} onChange={(e) => setProjectCode(e.target.value)}>
            <option value="">— select project code —</option>
            {codes.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
          </Select>
        </FormField>
        <FormField label={mode === 'Receipt' ? 'PO reference' : 'Work order / job reference'}>
          <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={mode === 'Receipt' ? 'PO-2028-0176' : 'WO-2028-0150'} />
        </FormField>
        {mode === 'Receipt' && (
          <FormField label="Unit cost (from PO)" hint={it ? `Current moving average ${idr(it.avgCost)} — recomputed on posting` : undefined}>
            <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
          </FormField>
        )}
        <Callout tone="slate">Posting creates the movement, updates the moving average and generates the journal (Dr Inventory / Cr GRNI for receipts; Dr project cost / Cr Inventory for issues).</Callout>
      </div>
    </Drawer>
  )
}
