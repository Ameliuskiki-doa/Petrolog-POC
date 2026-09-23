import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, FileSignature, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Callout, Drawer, FormField, Input, Mono, Select, cx } from '@/components/ui'
import { useToast } from '@/lib/app-state'
import { contracts, type Contract, type RateBasis } from '@/data/core'
import { type ContractExtra, type Opportunity } from '@/data/commercial'
import { date, idr, TODAY_ISO } from '@/lib/format'
import { customerName } from './shared'
import { nextContractId, nextProjectCode, registerContract, useAllContracts } from './store'

const BASES: RateBasis[] = ['per tonne', 'per trip', 'per hour', 'per unit-month', 'per man-day', 'lump sum']
const BILLING: ContractExtra['billing'][] = ['Monthly on verified volume', 'Milestone', 'Lump sum + unit rates']

interface RateLine {
  item: string
  basis: RateBasis
  rate: string
  effectiveFrom: string
}

const emptyRate = (from: string): RateLine => ({ item: '', basis: 'per tonne', rate: '', effectiveFrom: from })

/**
 * Registers a contract from a won opportunity (BDS-01 … BDS-04).
 * Client, value and business line are inherited from the opportunity; the user adds what only the
 * signed contract carries — rate card with effective dates, payment terms, retention and critical dates.
 * On save the contract is Pending Approval and its project code is reserved, issued on approval (BDS-11).
 */
export function RegisterContractDrawer({ open, onClose, opportunity }: { open: boolean; onClose: () => void; opportunity: Opportunity }) {
  const toast = useToast()
  const nav = useNavigate()
  const all = useAllContracts()

  const conditions = useMemo(
    () => opportunity.reviews.filter((r) => r.status === 'Approved with conditions').flatMap((r) => r.comments.map((c) => ({ track: r.track, text: c.text }))),
    [opportunity],
  )

  const contractId = nextContractId(all)
  const projectCode = nextProjectCode(opportunity.businessLine, [...all.map((c) => c.projectCode), ...(opportunity.projectCode ? [opportunity.projectCode] : [])])

  const [clientRef, setClientRef] = useState('')
  const [signed, setSigned] = useState(TODAY_ISO)
  const [start, setStart] = useState('2028-04-01')
  const [end, setEnd] = useState('2029-05-31')
  const [terms, setTerms] = useState('30')
  const [retention, setRetention] = useState('5')
  const [billing, setBilling] = useState<ContractExtra['billing']>('Monthly on verified volume')
  const [rates, setRates] = useState<RateLine[]>([emptyRate('2028-04-01')])
  const [accepted, setAccepted] = useState<boolean[]>(conditions.map(() => false))
  const [tried, setTried] = useState(false)

  const rateErrors = rates.map((r) => (!r.item.trim() ? 'Description required' : !(Number(r.rate) > 0) ? 'Rate must be greater than zero' : r.effectiveFrom < start ? 'Effective date cannot precede the contract start' : ''))
  const errors = {
    clientRef: clientRef.trim().length < 3 ? "The client's contract number is required" : '',
    period: end <= start ? 'End date must be after the start date' : '',
    signed: signed > TODAY_ISO ? 'Signature date cannot be in the future' : '',
    terms: !(Number(terms) >= 0 && Number(terms) <= 120) ? 'Payment terms: 0 – 120 days' : '',
    retention: !(Number(retention) >= 0 && Number(retention) <= 20) ? 'Retention: 0 – 20%' : '',
    rates: rates.length === 0 ? 'At least one rate line is required' : rateErrors.some(Boolean) ? 'Check the rate lines' : '',
    conditions: accepted.some((a) => !a) ? 'Every review condition must be carried into the contract' : '',
  }
  const valid = Object.values(errors).every((e) => !e)

  function save() {
    setTried(true)
    if (!valid) return
    const contract: Contract = {
      id: contractId,
      title: opportunity.title,
      customerId: opportunity.customerId,
      businessLine: opportunity.businessLine,
      projectCode,
      status: 'Pending Approval',
      start,
      end,
      value: opportunity.value,
      version: 1,
      paymentTermDays: Number(terms),
      retentionPct: Number(retention),
      rateCard: rates.map((r) => ({ item: r.item.trim(), basis: r.basis, rate: Number(r.rate), effectiveFrom: r.effectiveFrom })),
    }
    const extra: ContractExtra = {
      signedBy: 'Putri Maharani',
      billing,
      retentionRelease: `Released 90 days after final hand-over, ${retention}% held against each invoice`,
      versions: [{ version: 1, label: 'Original contract', signed, effective: start, summary: `Registered from ${opportunity.id} · client reference ${clientRef.trim()}`, valueAfter: opportunity.value }],
      milestones: [{ name: billing === 'Milestone' ? 'Milestone invoices per schedule' : 'Progress invoice on verified work', pct: 100 - Number(retention), due: `${terms} days`, status: 'Scheduled' }],
      criticalDates: [
        { label: 'Contract expiry', date: end, kind: 'Expiry' },
        { label: 'Renewal decision due', date: new Date(new Date(end).getTime() - 60 * 86400000).toISOString().slice(0, 10), kind: 'Renewal option' },
      ],
      guarantees: [],
      approvals: [
        { step: 'Registered by Commercial', by: 'Putri Maharani', at: `${TODAY_ISO}T09:40`, status: 'Approved' },
        { step: 'Director approval → project code issued', by: 'Hendra Wijaya', status: 'Pending' },
      ],
    }
    registerContract(contract, extra, opportunity.id)
    toast(`${contractId} registered — pending approval; project code ${projectCode} reserved`, 'success')
    onClose()
    nav(`/contracts/${contractId}`)
  }

  const err = (m: string) => tried && m && <div className="mt-1 text-xs text-red-600">{m}</div>

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-3xl"
      title={`Register contract from ${opportunity.id}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={<FileSignature size={15} />} onClick={save}>
            Register contract
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Callout tone="blue">
          Client, scope and value are inherited from the won opportunity. On approval the contract becomes Active and project code <Mono>{projectCode}</Mono> is issued
          automatically, inheriting this rate card and period (BDS-11).
        </Callout>

        <div className="rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
          <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Inherited from the opportunity</div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            {[
              ['Contract no.', <Mono key="c">{contractId}</Mono>],
              ['Client', customerName(opportunity.customerId)],
              ['Contract value', idr(opportunity.value)],
              ['Project code (reserved)', <Mono key="p">{projectCode}</Mono>],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="font-medium text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Client contract number">
            <Input value={clientRef} onChange={(e) => setClientRef(e.target.value)} placeholder="BCM/PROC/2028/0214" />
            {err(errors.clientRef)}
          </FormField>
          <FormField label="Signed on">
            <Input type="date" value={signed} onChange={(e) => setSigned(e.target.value)} />
            {err(errors.signed)}
          </FormField>
          <FormField label="Start of work">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </FormField>
          <FormField label="End of work">
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            {err(errors.period)}
          </FormField>
          <FormField label="Payment terms (days)">
            <Input value={terms} onChange={(e) => setTerms(e.target.value)} inputMode="numeric" />
            {err(errors.terms)}
          </FormField>
          <FormField label="Retention (%)">
            <Input value={retention} onChange={(e) => setRetention(e.target.value)} inputMode="decimal" />
            {err(errors.retention)}
          </FormField>
          <FormField label="Billing basis">
            <Select className="w-full" value={billing} onChange={(e) => setBilling(e.target.value as ContractExtra['billing'])}>
              {BILLING.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800">Rate card</div>
              <div className="text-xs text-slate-500">Billing resolves the rate from the date the work was performed, so a later rate never re-prices earlier periods (BDS-02).</div>
            </div>
            <Button size="sm" icon={<Plus size={13} />} onClick={() => setRates([...rates, emptyRate(start)])}>
              Add rate
            </Button>
          </div>
          <div className="space-y-2">
            {rates.map((r, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1fr_130px_140px_140px_32px]">
                <Input value={r.item} onChange={(e) => setRates(rates.map((x, j) => (j === i ? { ...x, item: e.target.value } : x)))} placeholder="Coal hauling, pit to ramp (≤ 12 km)" className={cx(tried && rateErrors[i] && 'border-red-400')} />
                <Select value={r.basis} onChange={(e) => setRates(rates.map((x, j) => (j === i ? { ...x, basis: e.target.value as RateBasis } : x)))}>
                  {BASES.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </Select>
                <Input value={r.rate} onChange={(e) => setRates(rates.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)))} inputMode="numeric" placeholder="51200" />
                <Input type="date" value={r.effectiveFrom} onChange={(e) => setRates(rates.map((x, j) => (j === i ? { ...x, effectiveFrom: e.target.value } : x)))} />
                <button className="flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-red-600" onClick={() => setRates(rates.filter((_, j) => j !== i))} title="Remove rate line">
                  <Trash2 size={15} />
                </button>
                {tried && rateErrors[i] && <div className="text-xs text-red-600 sm:col-span-5">{rateErrors[i]}</div>}
              </div>
            ))}
          </div>
          {err(errors.rates)}
        </div>

        {conditions.length > 0 && (
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-800">Conditions from the review</div>
            <div className="space-y-2">
              {conditions.map((c, i) => (
                <label key={i} className={cx('flex cursor-pointer items-start gap-3 rounded-lg p-3 text-sm ring-1', accepted[i] ? 'bg-emerald-50 ring-emerald-200' : 'bg-amber-50 ring-amber-200')}>
                  <input type="checkbox" checked={accepted[i]} onChange={(e) => setAccepted(accepted.map((a, j) => (j === i ? e.target.checked : a)))} className="mt-0.5" />
                  <span>
                    <Badge tone="violet">{c.track} review</Badge>
                    <span className="mt-1 block text-slate-700">{c.text}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">Tick to confirm this condition is carried into the signed contract.</span>
                  </span>
                </label>
              ))}
            </div>
            {err(errors.conditions)}
          </div>
        )}

        {tried && !valid && (
          <Callout tone="red" icon={<AlertTriangle size={16} />} title="Contract not registered">
            Correct the fields marked above. Nothing is saved until every check passes.
          </Callout>
        )}

        <p className="text-xs text-slate-500">
          Registered {date(TODAY_ISO)} by Commercial. After saving, the contract waits for Director approval; the project code is issued at that moment, not before.
          Seeded contracts for reference: {contracts.length}.
        </p>
      </div>
    </Drawer>
  )
}
