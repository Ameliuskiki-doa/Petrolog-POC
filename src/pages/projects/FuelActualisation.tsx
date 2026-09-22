import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, FileSpreadsheet, Link2, Lock, Upload } from 'lucide-react'
import { getUnit, getVendor } from '@/data/core'
import { FUEL_EST_PRICE, allocReceivers, fuelBatches, fuelStatement, type FuelStatementLine } from '@/data/projects'
import { Badge, Button, Callout, Card, CardHeader, DataTable, Grid, PageHeader, ProjectCodeChip, Select, Stat, StatusBadge, Stepper, cx, type Column } from '@/components/ui'
import { date, idr, idrShort, num, pct, period } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { DocLink, MODULE, journalLink } from './shared'

const STEPS = ['Import statement', 'Match', 'Review variances', 'Post']
const THRESHOLD = 3 // % litre variance that requires review
const VENDOR = 'VND-00118'
const JOURNAL = 'JV-2028-03-0019'

type Decision = 'accept' | 'hold'

interface Row extends FuelStatementLine {
  code?: string
  est: number
  actual: number
  qtyVar: number
  priceVar: number
  variance: number
  litrePct: number
  flagged: boolean
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export default function FuelActualisation() {
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [imported, setImported] = useState(false)
  const [assign, setAssign] = useState<Record<string, string>>({})
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const [posted, setPosted] = useState(false)
  const vendor = getVendor(VENDOR)!

  const rows: Row[] = useMemo(
    () =>
      fuelStatement.map((l) => {
        const code = l.projectCode ?? assign[l.id]
        const est = l.fieldLitres * FUEL_EST_PRICE
        const actual = l.statementLitres * l.statementPrice
        const qtyVar = (l.statementLitres - l.fieldLitres) * FUEL_EST_PRICE
        const priceVar = l.statementLitres * (l.statementPrice - FUEL_EST_PRICE)
        const litrePct = l.fieldLitres ? ((l.statementLitres - l.fieldLitres) / l.fieldLitres) * 100 : 100
        return { ...l, code, est, actual, qtyVar, priceVar, variance: actual - est, litrePct, flagged: Math.abs(litrePct) > THRESHOLD }
      }),
    [assign],
  )
  const unmatched = fuelStatement.filter((l) => !l.projectCode)
  const allMatched = unmatched.every((l) => assign[l.id])
  const flagged = rows.filter((r) => r.flagged)
  const allReviewed = flagged.every((r) => decisions[r.id])
  const postable = rows.filter((r) => !(r.flagged && decisions[r.id] === 'hold'))
  const byCode = [...new Set(postable.map((r) => r.code!))].map((code) => {
    const rs = postable.filter((r) => r.code === code)
    return { code, lines: rs.length, litres: sum(rs.map((r) => r.statementLitres)), est: sum(rs.map((r) => r.est)), actual: sum(rs.map((r) => r.actual)), variance: sum(rs.map((r) => r.variance)) }
  })
  const totalVar = sum(byCode.map((b) => b.variance))

  const next = () => setStep((s) => Math.min(3, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  return (
    <>
      <PageHeader
        module={MODULE}
        title="Fuel actualisation — Feb 2028"
        subtitle="Field fuel records (driver app & fuel stick) are compared against the supplier statement at month end (FAT-23); variances are posted to the consuming project code, not absorbed into overhead (FAT-24)."
        actions={
          <Link to={`/vendors/${VENDOR}`} className="text-sm text-sky-700 hover:underline">
            {vendor.name} · {VENDOR}
          </Link>
        }
      />

      <Grid cols={4} className="mb-5">
        <Stat label="Field estimate (Feb)" value={idrShort(sum(rows.map((r) => r.est)))} sub={`${num(sum(rows.map((r) => r.fieldLitres)))} L × IDR ${num(FUEL_EST_PRICE)} (PO price)`} />
        <Stat label="Supplier statement" value={imported ? idrShort(sum(rows.map((r) => r.actual))) : '—'} sub={imported ? `${num(sum(rows.map((r) => r.statementLitres)))} L · ${rows.length} lines` : 'Not yet imported'} />
        <Stat label="Variance to post" value={imported ? idrShort(sum(rows.map((r) => r.variance))) : '—'} sub="Actual − estimate" tone={imported ? 'warn' : undefined} />
        <Stat label="Lines needing review" value={imported ? flagged.length : '—'} sub={`Litre variance > ${THRESHOLD}% or no field record`} tone={imported && flagged.length ? 'bad' : undefined} />
      </Grid>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Stepper steps={STEPS} current={posted ? 'Post' : STEPS[step]} />
          {posted ? <StatusBadge status="Posted" /> : <Badge tone="amber">In progress</Badge>}
        </div>
      </Card>

      {step === 0 && (
        <Card>
          <CardHeader title="1 · Import supplier statement" subtitle="Monthly statement from the fuel station / fuel card provider" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border-2 border-dashed border-slate-300 p-5 text-center">
              <FileSpreadsheet size={32} className="mx-auto text-slate-400" />
              <div className="mt-2 text-sm font-medium text-slate-800">SOL-STM-2028-02.csv</div>
              <div className="text-xs text-slate-500">
                {vendor.name} · statement period 01–29 Feb 2028 · received {date('2028-03-04')}
              </div>
              <Button
                variant="primary"
                className="mt-4"
                icon={<Upload size={15} />}
                disabled={imported}
                onClick={() => {
                  setImported(true)
                  toast(`${fuelStatement.length} statement lines imported from ${vendor.name}`, 'success')
                }}
              >
                {imported ? 'Imported' : 'Import statement'}
              </Button>
            </div>
            <div className="space-y-3">
              <Callout tone="amber" icon={<Lock size={16} />} title="February is already closed">
                Feb 2028 was closed on the field estimate. The true-up journal posts to the open period (Mar 2028) while cost attribution stays on the consuming project code
                and on February consumption — the same controlled-reopening principle as late costs.
              </Callout>
              <div className="rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">Previous batches</div>
                {fuelBatches.map((b) => (
                  <div key={b.period} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-xs last:border-0">
                    <span className="font-medium">{period(b.period)}</span>
                    <span className="text-slate-500">{b.note}</span>
                    <span className="flex items-center gap-2">
                      {b.journal ? b.journal.startsWith('JV') ? <DocLink to={journalLink(b.journal)}>{b.journal}</DocLink> : <DocLink>{b.journal}</DocLink> : null}
                      {b.variance ? <span className="num">{idrShort(b.variance)}</span> : null}
                      <StatusBadge status={b.period === '2028-02' && posted ? 'Posted' : b.status} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" disabled={!imported} onClick={next} icon={<ArrowRight size={15} />}>
              Continue to matching
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card padded={false}>
          <div className="p-4 pb-2">
            <CardHeader
              title="2 · Match statement lines to field records"
              subtitle="Auto-matched on plate / tank / fuel card to the unit's fuel log; the unit's job assignment gives the consuming project code"
              actions={<Badge tone={allMatched ? 'green' : 'amber'}>{fuelStatement.length - unmatched.filter((l) => !assign[l.id]).length} / {fuelStatement.length} matched</Badge>}
            />
          </div>
          <DataTable
            dense
            columns={[
              { key: 'id', header: 'Line', render: (r: Row) => <span className="font-mono text-[11px]">{r.id}</span> },
              { key: 'p', header: 'Plate / point of issue', render: (r: Row) => <span className="text-xs">{r.plate}</span> },
              {
                key: 'u',
                header: 'Unit',
                render: (r: Row) => {
                  const uid = r.unitId ?? (r.plate === 'KT 8901 AC' ? 'PM-03' : undefined)
                  return uid ? (
                    <Link to={`/fleet/units/${uid}`} className="font-mono text-[12px] text-sky-700 hover:underline">
                      {uid}
                    </Link>
                  ) : (
                    '—'
                  )
                },
              },
              { key: 'r', header: 'Receipt', render: (r: Row) => <span className="text-[11px] text-slate-500">{r.receiptNo}</span> },
              { key: 'fl', header: 'Field litres', align: 'right', render: (r: Row) => (r.fieldLitres ? num(r.fieldLitres) : <span className="text-red-600">no record</span>) },
              { key: 'sl', header: 'Statement litres', align: 'right', render: (r: Row) => num(r.statementLitres) },
              {
                key: 'code',
                header: 'Consuming project code',
                render: (r: Row) =>
                  r.projectCode ? (
                    <ProjectCodeChip code={r.projectCode} />
                  ) : (
                    <Select value={assign[r.id] ?? ''} onChange={(e) => setAssign((a) => ({ ...a, [r.id]: e.target.value }))} className={cx('h-8 text-xs', !assign[r.id] && 'border-amber-400')}>
                      <option value="">Assign code…</option>
                      {allocReceivers
                        .filter((c) => c.startsWith('HL'))
                        .map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      <option value="GEN-BPN">GEN-BPN (controlled exception)</option>
                    </Select>
                  ),
              },
              {
                key: 's',
                header: 'Match',
                render: (r: Row) =>
                  r.projectCode ? (
                    <Badge tone="green">
                      <Link2 size={10} /> Auto
                    </Badge>
                  ) : assign[r.id] ? (
                    <Badge tone="violet">Manual</Badge>
                  ) : (
                    <Badge tone="amber">Unmatched</Badge>
                  ),
              },
            ]}
            rows={rows}
            rowKey={(r) => r.id}
            rowClassName={(r) => (!r.projectCode && !assign[r.id] ? 'bg-amber-50/60' : undefined)}
          />
          <div className="border-t border-slate-200 p-4">
            {!allMatched && (
              <Callout tone="amber" icon={<AlertTriangle size={16} />} title="1 statement line has no field record">
                KT 8901 AC (PM-03) drew 1,860 L on 19 Feb — the unit broke down on the Pit 3 haul road the same day and the driver log was not closed. Assign the consuming
                project so the cost is not absorbed into overhead.
              </Callout>
            )}
            <div className="mt-3 flex justify-between">
              <Button onClick={back} icon={<ArrowLeft size={15} />}>
                Back
              </Button>
              <Button variant="primary" disabled={!allMatched} onClick={next} icon={<ArrowRight size={15} />}>
                Review variances
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && <Review rows={rows} decisions={decisions} setDecisions={setDecisions} allReviewed={allReviewed} back={back} next={next} />}

      {step === 3 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card padded={false} className="xl:col-span-2">
            <div className="p-4 pb-2">
              <CardHeader title="4 · Post variance to consuming project codes" subtitle="One journal; each line carries the project code and attribution period Feb 2028" />
            </div>
            <DataTable
              columns={[
                { key: 'c', header: 'Project code', render: (b: (typeof byCode)[number]) => <ProjectCodeChip code={b.code} showName /> },
                { key: 'l', header: 'Lines', align: 'right', render: (b: (typeof byCode)[number]) => b.lines },
                { key: 'li', header: 'Litres', align: 'right', render: (b: (typeof byCode)[number]) => num(b.litres) },
                { key: 'e', header: 'Estimate booked', align: 'right', render: (b: (typeof byCode)[number]) => idrShort(b.est) },
                { key: 'a', header: 'Statement', align: 'right', render: (b: (typeof byCode)[number]) => idrShort(b.actual) },
                { key: 'v', header: 'Variance posted', align: 'right', render: (b: (typeof byCode)[number]) => <span className="font-semibold text-orange-700">{idr(b.variance)}</span> },
              ]}
              rows={byCode}
              rowKey={(b) => b.code}
              footer={
                <tr>
                  <td className="px-3 py-2.5" colSpan={5}>
                    Total variance
                  </td>
                  <td className="num px-3 text-right">{idr(totalVar)}</td>
                </tr>
              }
            />
            {rows.some((r) => decisions[r.id] === 'hold') && (
              <div className="border-t border-slate-100 p-3 text-xs text-slate-500">Held lines are excluded and stay open for next month's batch.</div>
            )}
          </Card>
          <Card>
            <CardHeader title="Journal preview" subtitle={posted ? `Posted as ${JOURNAL}` : 'Posting period Mar 2028 (open)'} />
            <div className="space-y-1.5 font-mono text-[11px]">
              {byCode.map((b) => (
                <div key={b.code} className="flex justify-between gap-2">
                  <span>Dr 5120 Fuel · {b.code}</span>
                  <span className="num">{num(b.variance)}</span>
                </div>
              ))}
              <div className="flex justify-between gap-2 border-t border-slate-200 pt-1.5">
                <span className="pl-4">Cr 2140 Accrued fuel · {VENDOR}</span>
                <span className="num">{num(totalVar)}</span>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              <div>Attribution period: Feb 2028 (locked)</div>
              <div>Posting period: Mar 2028</div>
              <div>Source: SOL-STM-2028-02 · {pct((totalVar / sum(byCode.map((b) => b.est))) * 100)} over estimate</div>
            </div>
            {posted ? (
              <Callout tone="green" icon={<CheckCircle2 size={16} />} title="Posted">
                <DocLink to={journalLink(JOURNAL)}>{JOURNAL}</DocLink> — variance now shows on each project P/L as a “Fuel actualisation” line.
              </Callout>
            ) : (
              <div className="mt-4 flex justify-between gap-2">
                <Button onClick={back} icon={<ArrowLeft size={15} />}>
                  Back
                </Button>
                <Button
                  variant="success"
                  icon={<CheckCircle2 size={15} />}
                  onClick={() => {
                    setPosted(true)
                    toast(`${JOURNAL} posted — ${idrShort(totalVar)} fuel variance charged to ${byCode.length} project codes`, 'success')
                  }}
                >
                  Post variance
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}

function Review({
  rows,
  decisions,
  setDecisions,
  allReviewed,
  back,
  next,
}: {
  rows: Row[]
  decisions: Record<string, Decision>
  setDecisions: (f: (d: Record<string, Decision>) => Record<string, Decision>) => void
  allReviewed: boolean
  back: () => void
  next: () => void
}) {
  const cols: Column<Row>[] = [
    {
      key: 'u',
      header: 'Unit',
      render: (r) => (
        <div>
          <span className="font-mono text-[12px]">{r.unitId ?? 'PM-03'}</span>
          <div className="text-[11px] text-slate-500">{getUnit(r.unitId ?? 'PM-03')?.type}</div>
        </div>
      ),
    },
    { key: 'c', header: 'Code', render: (r) => (r.code ? <ProjectCodeChip code={r.code} /> : '—') },
    { key: 'fl', header: 'Field L', align: 'right', render: (r) => num(r.fieldLitres) },
    { key: 'sl', header: 'Statement L', align: 'right', render: (r) => num(r.statementLitres) },
    { key: 'lp', header: 'Litre var.', align: 'right', render: (r) => <span className={cx('font-medium', r.flagged ? 'text-red-600' : 'text-slate-600')}>{r.fieldLitres ? pct(r.litrePct) : 'n/a'}</span> },
    { key: 'e', header: 'Estimate', align: 'right', render: (r) => idrShort(r.est) },
    { key: 'a', header: 'Statement', align: 'right', render: (r) => idrShort(r.actual) },
    { key: 'q', header: 'Qty var.', align: 'right', render: (r) => <span className="text-xs">{idrShort(r.qtyVar)}</span> },
    { key: 'pv', header: 'Price var.', align: 'right', render: (r) => <span className="text-xs">{idrShort(r.priceVar)}</span> },
    { key: 'v', header: 'Variance', align: 'right', render: (r) => <span className="font-semibold">{idrShort(r.variance)}</span> },
    {
      key: 'd',
      header: 'Review',
      render: (r) =>
        r.flagged ? (
          <div className="flex gap-1">
            <Button size="sm" variant={decisions[r.id] === 'accept' ? 'success' : 'secondary'} onClick={() => setDecisions((d) => ({ ...d, [r.id]: 'accept' }))}>
              Accept
            </Button>
            <Button size="sm" variant={decisions[r.id] === 'hold' ? 'danger' : 'secondary'} onClick={() => setDecisions((d) => ({ ...d, [r.id]: 'hold' }))}>
              Hold
            </Button>
          </div>
        ) : (
          <Badge tone="green">Within tolerance</Badge>
        ),
    },
  ]
  return (
    <Card padded={false}>
      <div className="p-4 pb-2">
        <CardHeader
          title="3 · Review variances"
          subtitle={`Estimate = field litres × PO price IDR ${num(FUEL_EST_PRICE)}. Quantity and price effects are split. Lines over ${THRESHOLD}% need a decision.`}
        />
      </div>
      <DataTable columns={cols} rows={rows} rowKey={(r) => r.id} dense rowClassName={(r) => (r.flagged && !decisions[r.id] ? 'bg-red-50/50' : undefined)} />
      <div className="border-t border-slate-200 p-4">
        <Callout tone="blue" title="Why DT-04 is 11.7% over">
          Fuel stick on DT-04 reported a calibration fault from 12 Feb (work order raised). Statement litres are the reliable figure — accept, the variance stays on
          HL-2027-014.01.
        </Callout>
        <div className="mt-3 flex justify-between">
          <Button onClick={back} icon={<ArrowLeft size={15} />}>
            Back
          </Button>
          <Button variant="primary" disabled={!allReviewed} onClick={next} icon={<ArrowRight size={15} />}>
            Prepare posting
          </Button>
        </div>
      </div>
    </Card>
  )
}
