/**
 * M7 Project Costing & Budgeting — derived cost model.
 *
 * Everything here is generated deterministically from the project totals in core.ts so the
 * numbers always reconcile:
 *   Σ category actuals          = project.actual
 *   Σ category committed        = project.committed   (open PRs / POs, not yet cost)
 *   Σ category RAB              = project.rab          (baseline + recorded revisions)
 *   Σ monthly revenue           = project.revenue
 *   parent code                 = Σ child codes
 * GEN overhead received by a project in Jan/Feb 2028 is exactly what the GEN allocation run
 * distributed (see runAllocation), so the project trail and the GEN trail agree (FAT-22).
 *
 * Public helpers for other modules (e.g. the Dashboard):
 *   projectCostBreakdown(code) → CategoryLine[]   cost by category (RAB, baseline, committed, actual, remaining)
 *   projectMonthly(code)       → MonthlyPoint[]   monthly cost & revenue, oldest first
 */
import { childProjects, getProject, projects, purchaseOrders, units, type BusinessLine, type Project } from './core'

// ─── Cost categories (aligned to the chart of accounts, FAT-07) ─────────────────
export type CostCategory =
  | 'Labour'
  | 'Fuel'
  | 'Subcontract'
  | 'Equipment depreciation'
  | 'Materials & equipment'
  | 'Travel & charges'
  | 'Permits & tolls'
  | 'GEN overhead'
  | 'Prepaid amortisation'

export const COST_CATEGORIES: CostCategory[] = [
  'Labour',
  'Fuel',
  'Subcontract',
  'Equipment depreciation',
  'Materials & equipment',
  'Travel & charges',
  'Permits & tolls',
  'GEN overhead',
  'Prepaid amortisation',
]

export const categoryMeta: Record<CostCategory, { gl: string; glName: string; basis: string }> = {
  Labour: { gl: '5110', glName: 'Direct labour', basis: 'Verified timesheets × labour rate' },
  Fuel: { gl: '5120', glName: 'Fuel & lubricants', basis: 'Field fuel log, trued-up to supplier statement' },
  Subcontract: { gl: '5130', glName: 'Subcontract & unit hire', basis: 'PO → goods / service receipt' },
  'Equipment depreciation': { gl: '5140', glName: 'Equipment depreciation (allocated)', basis: 'Unit depreciation × operating hours on the code' },
  'Materials & equipment': { gl: '5150', glName: 'Materials, parts & equipment', basis: 'PO → goods receipt / store issue' },
  'Travel & charges': { gl: '5160', glName: 'Travel, lodging & site charges', basis: 'AP invoice / expense claim' },
  'Permits & tolls': { gl: '5170', glName: 'Permits, tolls & escorts', basis: 'AP invoice / toll statement' },
  'GEN overhead': { gl: '5180', glName: 'Allocated GEN overhead', basis: 'Month-end GEN allocation run' },
  'Prepaid amortisation': { gl: '5190', glName: 'Prepaid amortisation', basis: 'Amortisation schedule (insurance, mob. fees)' },
}

// ─── Deterministic helpers ─────────────────────────────────────────────────────
function hash(s: string): number {
  let x = 2166136261
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i)
    x = Math.imul(x, 16777619)
  }
  return ((x >>> 0) % 10000) / 10000
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** Split total by weights, rounded to `unit`, last bucket absorbs the rounding so Σ = total exactly */
function splitAmount(total: number, weights: number[], unit = 100_000): number[] {
  const sw = sum(weights)
  if (!total || !sw || !weights.length) return weights.map(() => 0)
  const out = weights.map((w) => Math.round((total * w) / sw / unit) * unit)
  // put remainder on the largest-weighted bucket to keep every bucket positive
  let iMax = 0
  weights.forEach((w, i) => (w > weights[iMax] ? (iMax = i) : null))
  out[iMax] += total - sum(out)
  return out
}

export const CURRENT_PERIOD = '2028-03'
export const LAST_CLOSED_PERIOD = '2028-02'

function monthsBetween(from: string, to: string): string[] {
  const out: string[] = []
  let [y, m] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return out
}

// ─── GEN allocation engine (FAT-21 / FAT-22) ───────────────────────────────────
export type AllocDriver = 'Operating hours' | 'Trip count' | 'Headcount' | 'Revenue'
export const ALLOC_DRIVERS: AllocDriver[] = ['Operating hours', 'Trip count', 'Headcount', 'Revenue']
export type AllocMonth = '2028-01' | '2028-02' | '2028-03'
export type GenPool = 'GEN-HO' | 'GEN-BPN'

export interface AllocRule {
  id: string
  pool: GenPool
  name: string
  gl: string
  /** null = retained at company level (not allocated to projects) */
  driver: AllocDriver | null
  scope: 'All business lines' | 'Heavy Logistics only'
  amounts: Record<AllocMonth, number>
  rationale: string
}

export const allocRules: AllocRule[] = [
  { id: 'AR-HO-01', pool: 'GEN-HO', name: 'Finance, HR & procurement staff', gl: '6110', driver: 'Revenue', scope: 'All business lines', amounts: { '2028-01': 172_000_000, '2028-02': 168_000_000, '2028-03': 58_000_000 }, rationale: 'Back-office effort follows billing & transaction volume' },
  { id: 'AR-HO-02', pool: 'GEN-HO', name: 'IT systems & licences', gl: '6140', driver: 'Headcount', scope: 'All business lines', amounts: { '2028-01': 66_000_000, '2028-02': 64_000_000, '2028-03': 22_000_000 }, rationale: 'Licences are per named user on the project' },
  { id: 'AR-HO-03', pool: 'GEN-HO', name: 'Head office rent & utilities', gl: '6210', driver: 'Revenue', scope: 'All business lines', amounts: { '2028-01': 52_000_000, '2028-02': 52_000_000, '2028-03': 17_000_000 }, rationale: 'Shared facility cost, revenue as capacity proxy' },
  { id: 'AR-HO-04', pool: 'GEN-HO', name: 'HSE management system (SMK3)', gl: '6310', driver: 'Headcount', scope: 'All business lines', amounts: { '2028-01': 36_000_000, '2028-02': 38_000_000, '2028-03': 12_000_000 }, rationale: 'Inductions, audits & PPE programme per worker' },
  { id: 'AR-HO-05', pool: 'GEN-HO', name: 'Board & corporate secretary', gl: '6010', driver: null, scope: 'All business lines', amounts: { '2028-01': 250_000_000, '2028-02': 240_000_000, '2028-03': 121_000_000 }, rationale: 'Retained at company level — not a project cost' },
  { id: 'AR-HO-06', pool: 'GEN-HO', name: 'Commercial & tendering', gl: '6020', driver: null, scope: 'All business lines', amounts: { '2028-01': 180_000_000, '2028-02': 176_000_000, '2028-03': 56_000_000 }, rationale: 'Serves future contracts — retained at company level' },
  { id: 'AR-BPN-01', pool: 'GEN-BPN', name: 'Workshop & maintenance overhead', gl: '6410', driver: 'Operating hours', scope: 'Heavy Logistics only', amounts: { '2028-01': 98_000_000, '2028-02': 96_000_000, '2028-03': 34_000_000 }, rationale: 'Workshop load follows unit operating hours' },
  { id: 'AR-BPN-02', pool: 'GEN-BPN', name: 'Yard, base camp & security', gl: '6420', driver: 'Headcount', scope: 'Heavy Logistics only', amounts: { '2028-01': 44_000_000, '2028-02': 42_000_000, '2028-03': 15_000_000 }, rationale: 'Mess & accommodation per crew member' },
  { id: 'AR-BPN-03', pool: 'GEN-BPN', name: 'Operations admin & dispatch', gl: '6430', driver: 'Trip count', scope: 'Heavy Logistics only', amounts: { '2028-01': 40_000_000, '2028-02': 38_000_000, '2028-03': 13_000_000 }, rationale: 'Dispatch & POD handling per trip' },
  { id: 'AR-BPN-04', pool: 'GEN-BPN', name: 'Site support vehicles (LV fleet)', gl: '6440', driver: 'Operating hours', scope: 'Heavy Logistics only', amounts: { '2028-01': 22_000_000, '2028-02': 21_000_000, '2028-03': 8_000_000 }, rationale: 'Supervision vehicles follow equipment activity' },
  { id: 'AR-BPN-05', pool: 'GEN-BPN', name: 'Base management & HSE staff', gl: '6450', driver: 'Headcount', scope: 'Heavy Logistics only', amounts: { '2028-01': 120_000_000, '2028-02': 118_000_000, '2028-03': 41_000_000 }, rationale: 'Supervision span per crew member' },
  { id: 'AR-BPN-06', pool: 'GEN-BPN', name: 'Idle fleet standing cost', gl: '6460', driver: null, scope: 'Heavy Logistics only', amounts: { '2028-01': 108_000_000, '2028-02': 104_000_000, '2028-03': 98_000_000 }, rationale: 'Retained for utilisation review — not charged to projects' },
]

export interface DriverStat {
  hours: number
  trips: number
  headcount: number
  /** revenue recognised in the month, IDR */
  revenue: number
}

/** Leaf project codes that receive GEN allocations */
export const allocReceivers = ['HL-2027-014.01', 'HL-2027-014.02', 'PS-2028-003', 'GS-2027-008', 'HL-2027-021', 'HL-2028-002']

const marHours = (code: string) => sum(units.filter((u) => u.projectCode === code).map((u) => u.hoursMTD.operating))

export const driverStats: Record<AllocMonth, Record<string, DriverStat>> = {
  '2028-01': {
    'HL-2027-014.01': { hours: 4_050, trips: 1_790, headcount: 45, revenue: 2_060_000_000 },
    'HL-2027-014.02': { hours: 610, trips: 71, headcount: 9, revenue: 420_000_000 },
    'PS-2028-003': { hours: 540, trips: 44, headcount: 52, revenue: 1_850_000_000 },
    'GS-2027-008': { hours: 150, trips: 18, headcount: 13, revenue: 980_000_000 },
    'HL-2027-021': { hours: 720, trips: 46, headcount: 19, revenue: 1_760_000_000 },
    'HL-2028-002': { hours: 0, trips: 0, headcount: 0, revenue: 0 },
  },
  '2028-02': {
    'HL-2027-014.01': { hours: 4_210, trips: 1_860, headcount: 46, revenue: 2_180_000_000 },
    'HL-2027-014.02': { hours: 520, trips: 64, headcount: 9, revenue: 360_000_000 },
    'PS-2028-003': { hours: 1_340, trips: 120, headcount: 58, revenue: 4_120_000_000 },
    'GS-2027-008': { hours: 180, trips: 22, headcount: 14, revenue: 1_240_000_000 },
    'HL-2027-021': { hours: 610, trips: 38, headcount: 17, revenue: 1_580_000_000 },
    'HL-2028-002': { hours: 890, trips: 142, headcount: 21, revenue: 1_020_000_000 },
  },
  // March to date — operating hours are live from the fleet hour meters (units.hoursMTD)
  '2028-03': {
    'HL-2027-014.01': { hours: marHours('HL-2027-014.01'), trips: 612, headcount: 46, revenue: 720_000_000 },
    'HL-2027-014.02': { hours: marHours('HL-2027-014.02'), trips: 21, headcount: 9, revenue: 110_000_000 },
    'PS-2028-003': { hours: marHours('PS-2028-003'), trips: 38, headcount: 61, revenue: 1_380_000_000 },
    'GS-2027-008': { hours: marHours('GS-2027-008'), trips: 6, headcount: 14, revenue: 0 },
    'HL-2027-021': { hours: marHours('HL-2027-021'), trips: 11, headcount: 15, revenue: 520_000_000 },
    'HL-2028-002': { hours: marHours('HL-2028-002'), trips: 47, headcount: 22, revenue: 390_000_000 },
  },
}

export const driverValue = (s: DriverStat, d: AllocDriver) => (d === 'Operating hours' ? s.hours : d === 'Trip count' ? s.trips : d === 'Headcount' ? s.headcount : s.revenue)

export interface AllocLine {
  month: AllocMonth
  ruleId: string
  pool: GenPool
  projectCode: string
  driver: AllocDriver
  driverValue: number
  driverTotal: number
  share: number
  amount: number
}

export const allocRuns: { month: AllocMonth; status: 'Posted' | 'Preview'; runOn?: string; runBy?: string; journalId?: string }[] = [
  { month: '2028-01', status: 'Posted', runOn: '2028-02-04T16:20', runBy: 'EMP-0028', journalId: 'JV-2028-02-0011' },
  { month: '2028-02', status: 'Posted', runOn: '2028-03-04T15:05', runBy: 'EMP-0028', journalId: 'JV-2028-03-0003' },
  { month: '2028-03', status: 'Preview' },
]

/**
 * Month-end allocation. `drivers` overrides the rule driver per rule id (null = retain).
 * Each rule's amount is distributed over in-scope receivers in proportion to the driver value;
 * rounding goes to the largest receiver so Σ lines = rule amount.
 */
export function runAllocation(month: AllocMonth, drivers: Partial<Record<string, AllocDriver | null>> = {}): AllocLine[] {
  const stats = driverStats[month]
  const lines: AllocLine[] = []
  for (const r of allocRules) {
    const d = r.id in drivers ? drivers[r.id] ?? null : r.driver
    if (!d) continue
    const receivers = allocReceivers.filter((c) => (r.scope === 'Heavy Logistics only' ? c.startsWith('HL') : true))
    const vals = receivers.map((c) => driverValue(stats[c], d))
    const total = sum(vals)
    if (!total) continue
    const amounts = splitAmount(r.amounts[month], vals, 1_000)
    receivers.forEach((c, i) => {
      if (!vals[i]) return
      lines.push({ month, ruleId: r.id, pool: r.pool, projectCode: c, driver: d, driverValue: vals[i], driverTotal: total, share: vals[i] / total, amount: amounts[i] })
    })
  }
  return lines
}

const postedRuns: Record<'2028-01' | '2028-02', AllocLine[]> = {
  '2028-01': runAllocation('2028-01'),
  '2028-02': runAllocation('2028-02'),
}
export const postedAllocation = (month: '2028-01' | '2028-02') => postedRuns[month]

/** GEN pool summary: YTD cost, allocated out (posted runs), retained, awaiting March run */
export function genPoolSummary(pool: GenPool) {
  const rules = allocRules.filter((r) => r.pool === pool)
  const ytd = sum(rules.map((r) => r.amounts['2028-01'] + r.amounts['2028-02'] + r.amounts['2028-03']))
  const allocated = sum([...postedRuns['2028-01'], ...postedRuns['2028-02']].filter((l) => l.pool === pool).map((l) => l.amount))
  const retained = sum(rules.filter((r) => !r.driver).map((r) => r.amounts['2028-01'] + r.amounts['2028-02']))
  const awaiting = sum(rules.map((r) => r.amounts['2028-03']))
  return { rules, ytd, allocated, retained, awaiting }
}

// ─── Late costs — controlled reopening (FAT-19) ────────────────────────────────
export type LateCostStatus = 'Pending approval' | 'Charged' | 'Rejected'
export interface LateCost {
  id: string
  projectCode: string
  category: CostCategory
  vendorId?: string
  vendorName: string
  invoiceNo: string
  loketNo: string
  description: string
  originalPeriod: string
  receivedOn: string
  amount: number
  status: LateCostStatus
  requestedBy: string
  approvedBy?: string
  journalId?: string
  postedOn?: string
  reason: string
}

export const lateCosts: LateCost[] = [
  { id: 'LC-2028-0003', projectCode: 'GS-2027-008', category: 'Travel & charges', vendorName: 'Hotel Grand Surabaya (via expense claim)', invoiceNo: 'EXP-2801-0214', loketNo: 'LI-2028-0301', description: 'Vendor FAT witness travel, Surabaya — UF skid factory acceptance test', originalPeriod: '2028-01', receivedOn: '2028-03-01', amount: 18_900_000, status: 'Charged', requestedBy: 'EMP-0005', approvedBy: 'EMP-0028', journalId: 'JV-2028-03-0005', postedOn: '2028-03-02', reason: 'Expense claim submitted after January close' },
  { id: 'LC-2028-0005', projectCode: 'HL-2027-021', category: 'Travel & charges', vendorName: 'Mess Bekapai Sejahtera', invoiceNo: 'MBS/INV/0128', loketNo: 'LI-2028-0309', description: 'Crew accommodation, Bekapai mess — January 2028 (17 pax)', originalPeriod: '2028-01', receivedOn: '2028-03-02', amount: 27_600_000, status: 'Charged', requestedBy: 'EMP-0003', approvedBy: 'EMP-0028', journalId: 'JV-2028-03-0008', postedOn: '2028-03-03', reason: 'Vendor invoice received after January close' },
  { id: 'LC-2028-0007', projectCode: 'PS-2027-017', category: 'Permits & tolls', vendorId: 'VND-00203', vendorName: 'CV Tol & Perizinan Kaltim', invoiceNo: 'TPK/2712/0877', loketNo: 'LI-2028-0318', description: 'Toll statement Dec 2027 — Jakarta–Merak, 14 heavy trips (boiler parts)', originalPeriod: '2027-12', receivedOn: '2028-03-04', amount: 38_450_000, status: 'Charged', requestedBy: 'EMP-0004', approvedBy: 'EMP-0028', journalId: 'JV-2028-03-0012', postedOn: '2028-03-06', reason: 'Deferred toll statement, project closed Dec 2027' },
  { id: 'LC-2028-0009', projectCode: 'PS-2027-017', category: 'Permits & tolls', vendorId: 'VND-00203', vendorName: 'CV Tol & Perizinan Kaltim', invoiceNo: 'TPK/2712/0901', loketNo: 'LI-2028-0327', description: 'Oversize-load dispensation (Dishub Banten) — boiler drum transport', originalPeriod: '2027-12', receivedOn: '2028-03-07', amount: 62_800_000, status: 'Pending approval', requestedBy: 'EMP-0004', reason: 'Permit invoice issued by agent 11 weeks after service' },
  { id: 'LC-2028-0011', projectCode: 'HL-2027-021', category: 'Subcontract', vendorId: 'VND-00210', vendorName: 'PT Geo Rig Support', invoiceNo: 'GRS/INV/2028/0045', loketNo: 'LI-2028-0331', description: 'Rigging crew subcontract — module M-11 set, January 2028', originalPeriod: '2028-01', receivedOn: '2028-03-08', amount: 184_000_000, status: 'Pending approval', requestedBy: 'EMP-0003', reason: 'Service entry sheet signed late by client; invoice after close' },
  { id: 'LC-2028-0012', projectCode: 'HL-2027-014.02', category: 'Permits & tolls', vendorId: 'VND-00203', vendorName: 'CV Tol & Perizinan Kaltim', invoiceNo: 'TPK/2802/0112', loketNo: 'LI-2028-0335', description: 'Police escort — excavator mobilisation Pit 3 → Pit 4', originalPeriod: '2028-02', receivedOn: '2028-03-09', amount: 12_750_000, status: 'Pending approval', requestedBy: 'EMP-0003', reason: 'Escort invoice received after February close' },
  { id: 'LC-2028-0002', projectCode: 'PS-2027-017', category: 'Materials & equipment', vendorId: 'VND-00226', vendorName: 'CV Karya Las Abadi', invoiceNo: 'KLA/1127/044', loketNo: 'LI-2028-0288', description: 'Welding consumables — Nov 2027 (vendor blocked, no GR on file)', originalPeriod: '2027-11', receivedOn: '2028-02-27', amount: 21_300_000, status: 'Rejected', requestedBy: 'EMP-0004', reason: 'Rejected: no goods receipt, vendor blocked since Nov 2027' },
]

// ─── Commitments (FAT-10) — open PRs/POs not yet cost ──────────────────────────
export interface Commitment {
  id: string
  kind: 'PO' | 'PR'
  poId?: string
  prId: string
  projectCode: string
  vendorId?: string
  description: string
  category: CostCategory
  /** Document total */
  docAmount: number
  /** Portion not yet received / realised = the commitment */
  openAmount: number
  status: string
  date: string
}

const poCategory = (c: string): CostCategory =>
  c === 'Subcontract' ? 'Subcontract' : c === 'Fuel' ? 'Fuel' : c === 'Permits & Tolls' ? 'Permits & tolls' : 'Materials & equipment'

const fromPO = (id: string, openAmount: number): Commitment => {
  const po = purchaseOrders.find((p) => p.id === id)!
  return { id, kind: 'PO', poId: po.id, prId: po.prId, projectCode: po.projectCode, vendorId: po.vendorId, description: po.description, category: poCategory(po.costCategory), docAmount: po.amount, openAmount, status: po.status, date: po.date }
}

export const commitments: Commitment[] = [
  fromPO('PO-2028-0187', 1_180_000_000),
  fromPO('PO-2028-0195', 451_300_000),
  fromPO('PO-2028-0201', 58_700_000),
  { id: 'PR-2028-0247', kind: 'PR', prId: 'PR-2028-0247', projectCode: 'HL-2027-014.02', description: 'Crane 100T boom inspection & rigging gear replacement', category: 'Materials & equipment', docAmount: 162_000_000, openAmount: 162_000_000, status: 'Approved', date: '2028-03-02' },
  { id: 'PR-2028-0256', kind: 'PR', prId: 'PR-2028-0256', projectCode: 'HL-2027-014.02', vendorId: 'VND-00112', description: 'Lowbed hire — Pit 4 crusher relocation', category: 'Subcontract', docAmount: 190_000_000, openAmount: 190_000_000, status: 'In RFQ', date: '2028-03-07' },
  { id: 'PR-2028-0259', kind: 'PR', prId: 'PR-2028-0259', projectCode: 'HL-2027-014.02', vendorId: 'VND-00203', description: 'Heavy haul road permits & escort — Q2 2028', category: 'Permits & tolls', docAmount: 98_000_000, openAmount: 98_000_000, status: 'Pending approval', date: '2028-03-09' },
  { id: 'PR-2028-0241', kind: 'PR', prId: 'PR-2028-0241', projectCode: 'PS-2028-003', vendorId: 'VND-00131', description: 'Additional catalyst technicians — 12 men × 20 days (client VO-02)', category: 'Subcontract', docAmount: 768_000_000, openAmount: 768_000_000, status: 'Approved', date: '2028-02-26' },
  { id: 'PR-2028-0249', kind: 'PR', prId: 'PR-2028-0249', projectCode: 'PS-2028-003', vendorId: 'VND-00188', description: 'Nitrogen purge top-up — 8 tanker loads', category: 'Materials & equipment', docAmount: 216_000_000, openAmount: 216_000_000, status: 'In RFQ', date: '2028-03-03' },
  { id: 'PR-2028-0252', kind: 'PR', prId: 'PR-2028-0252', projectCode: 'PS-2028-003', vendorId: 'VND-00219', description: 'Spent catalyst drums — B3 waste transport & disposal', category: 'Subcontract', docAmount: 396_000_000, openAmount: 396_000_000, status: 'Approved', date: '2028-03-05' },
  fromPO('PO-2027-0911', 5_685_000_000),
  fromPO('PO-2028-0158', 1_265_000_000),
  { id: 'PR-2028-0239', kind: 'PR', prId: 'PR-2028-0239', projectCode: 'HL-2027-021', vendorId: 'VND-00112', description: 'SPMT demobilisation Bekapai → Balikpapan base', category: 'Subcontract', docAmount: 120_000_000, openAmount: 120_000_000, status: 'Approved', date: '2028-03-01' },
  fromPO('PO-2028-0199', 845_000_000),
  { id: 'PR-2028-0257', kind: 'PR', prId: 'PR-2028-0257', projectCode: 'HL-2028-002', vendorId: 'VND-00203', description: 'Garut district road escort & bridge assessment', category: 'Permits & tolls', docAmount: 65_000_000, openAmount: 65_000_000, status: 'Approved', date: '2028-03-04' },
  { id: 'PR-2028-0233', kind: 'PR', prId: 'PR-2028-0233', projectCode: 'GEN-HO', description: 'Annual licence renewal — CAD & document management', category: 'GEN overhead', docAmount: 132_000_000, openAmount: 132_000_000, status: 'Approved', date: '2028-02-21' },
  { id: 'PR-2028-0245', kind: 'PR', prId: 'PR-2028-0245', projectCode: 'GEN-HO', description: 'HO office service charge — Q2 2028', category: 'GEN overhead', docAmount: 78_000_000, openAmount: 78_000_000, status: 'Pending approval', date: '2028-03-06' },
  { id: 'PR-2028-0248', kind: 'PR', prId: 'PR-2028-0248', projectCode: 'GEN-BPN', vendorId: 'VND-00171', description: 'Workshop consumables — Q2 stock', category: 'GEN overhead', docAmount: 87_000_000, openAmount: 87_000_000, status: 'Approved', date: '2028-03-03' },
  { id: 'PR-2028-0254', kind: 'PR', prId: 'PR-2028-0254', projectCode: 'GEN-BPN', description: 'Balikpapan yard security service — April 2028', category: 'GEN overhead', docAmount: 58_000_000, openAmount: 58_000_000, status: 'In RFQ', date: '2028-03-08' },
]

// ─── RAB versions (FAT-07/08/09) ───────────────────────────────────────────────
export interface RabRevision {
  projectCode: string
  version: number
  date: string
  changes: { category: CostCategory; delta: number }[]
  rationale: string
  requestedBy: string
  approvedBy: string
}

export const rabRevisions: RabRevision[] = [
  { projectCode: 'HL-2027-014.01', version: 2, date: '2028-01-08', changes: [{ category: 'Fuel', delta: 650_000_000 }, { category: 'Subcontract', delta: 150_000_000 }], rationale: 'HSD price adjustment Jan 2028 (+6.2% industrial index) and rate card v3 tonnage uplift requiring 1 additional subcontract DT', requestedBy: 'EMP-0003', approvedBy: 'EMP-0002' },
  { projectCode: 'PS-2028-003', version: 2, date: '2028-02-02', changes: [{ category: 'Subcontract', delta: 250_000_000 }], rationale: 'Scope addition: reactor R-202 dense loading (client variation order VO-02)', requestedBy: 'EMP-0004', approvedBy: 'EMP-0001' },
  { projectCode: 'PS-2028-003', version: 3, date: '2028-02-24', changes: [{ category: 'Materials & equipment', delta: 150_000_000 }], rationale: 'Extended cooldown (+36 h) requiring additional nitrogen purge', requestedBy: 'EMP-0004', approvedBy: 'EMP-0002' },
]

// ─── Profiles ──────────────────────────────────────────────────────────────────
type Profile = Partial<Record<CostCategory, number>>
const profiles: Record<Exclude<BusinessLine, 'CORP'>, Profile> = {
  HL: { Labour: 0.2, Fuel: 0.26, Subcontract: 0.18, 'Equipment depreciation': 0.17, 'Materials & equipment': 0.07, 'Travel & charges': 0.04, 'Permits & tolls': 0.04, 'Prepaid amortisation': 0.04 },
  PS: { Labour: 0.3, Fuel: 0.03, Subcontract: 0.3, 'Equipment depreciation': 0.06, 'Materials & equipment': 0.2, 'Travel & charges': 0.06, 'Permits & tolls': 0.02, 'Prepaid amortisation': 0.03 },
  GS: { Labour: 0.14, Fuel: 0.01, Subcontract: 0.16, 'Equipment depreciation': 0.02, 'Materials & equipment': 0.58, 'Travel & charges': 0.05, 'Permits & tolls': 0.02, 'Prepaid amortisation': 0.02 },
}
const genRabPct: Record<BusinessLine, number> = { HL: 0.08, PS: 0.05, GS: 0.04, CORP: 0 }
/** Deliberate over/under-runs so the variance story is visible */
const actualTilt: Record<string, Profile> = {
  'HL-2027-014.01': { Fuel: 1.3, 'Equipment depreciation': 0.9 },
  'PS-2028-003': { Subcontract: 1.25, Labour: 1.1 },
  'HL-2027-021': { Subcontract: 1.2 },
  'PS-2027-017': { 'Materials & equipment': 1.3 },
}

const NON_GEN = COST_CATEGORIES.filter((c) => c !== 'GEN overhead')
const zeroCats = (): Record<CostCategory, number> => Object.fromEntries(COST_CATEGORIES.map((c) => [c, 0])) as Record<CostCategory, number>

// ─── Leaf model ───────────────────────────────────────────────────────────────
export interface GenReceipt {
  month: string
  pool: GenPool
  amount: number
  /** rule-level lines for months with a posted run in the platform (Jan/Feb 2028) */
  lines?: AllocLine[]
}

interface LeafModel {
  months: string[]
  cat: Record<CostCategory, Record<string, number>>
  revenue: Record<string, number>
  gen: GenReceipt[]
  late: LateCost[]
}

const leafCache = new Map<string, LeafModel>()

function leafModel(p: Project): LeafModel {
  const cached = leafCache.get(p.code)
  if (cached) return cached
  const startM = p.start.slice(0, 7)
  const endM = p.end.slice(0, 7) < CURRENT_PERIOD ? p.end.slice(0, 7) : CURRENT_PERIOD
  const months = p.actual > 0 && startM <= endM ? monthsBetween(startM, endM) : []
  const partialStart = Number(p.start.slice(8, 10)) > 1
  const baseW = (m: string) => (0.85 + 0.3 * hash(p.code + m)) * (m === startM && partialStart ? 0.5 : 1)

  // GEN overhead received
  const gen: GenReceipt[] = []
  const late = lateCosts.filter((l) => l.projectCode === p.code && l.status === 'Charged')
  if (months.length) {
    const inRuns = allocReceivers.includes(p.code)
    const runFor = (m: '2028-01' | '2028-02') => postedRuns[m].filter((l) => l.projectCode === p.code)
    const janLines = inRuns ? runFor('2028-01') : []
    const refLines = janLines.length ? janLines : inRuns ? runFor('2028-02') : []
    for (const m of months.filter((x) => x <= LAST_CLOSED_PERIOD)) {
      if (m === '2028-01' || m === '2028-02') {
        if (inRuns) {
          for (const pool of ['GEN-HO', 'GEN-BPN'] as GenPool[]) {
            const ls = runFor(m).filter((l) => l.pool === pool)
            if (ls.length) gen.push({ month: m, pool, amount: sum(ls.map((l) => l.amount)), lines: ls })
          }
          continue
        }
      }
      if (inRuns && refLines.length) {
        // FY2027 allocations (prior-year GEN pools, smaller allocable base)
        for (const pool of ['GEN-HO', 'GEN-BPN'] as GenPool[]) {
          const ref = sum(refLines.filter((l) => l.pool === pool).map((l) => l.amount))
          if (ref) gen.push({ month: m, pool, amount: Math.round((ref * 0.5 * (0.9 + 0.2 * hash(p.code + m + pool)) * (m === startM && partialStart ? 0.5 : 1)) / 100_000) * 100_000 })
        }
      } else {
        const n = months.filter((x) => x <= LAST_CLOSED_PERIOD).length
        gen.push({ month: m, pool: 'GEN-HO', amount: Math.round((p.actual * 0.03) / n / 100_000) * 100_000 })
      }
    }
  }
  const genTotal = sum(gen.map((g) => g.amount))
  const lateTotal = sum(late.map((l) => l.amount))
  const base = p.actual - genTotal - lateTotal

  const prof = profiles[p.businessLine as Exclude<BusinessLine, 'CORP'>] ?? profiles.HL
  const tilt = actualTilt[p.code] ?? {}
  const w = NON_GEN.map((c) => (prof[c] ?? 0) * (0.85 + 0.3 * hash(p.code + c)) * (tilt[c] ?? 1))
  const catTotals = splitAmount(base, w, 1_000_000)

  const cat = Object.fromEntries(COST_CATEGORIES.map((c) => [c, {} as Record<string, number>])) as Record<CostCategory, Record<string, number>>
  NON_GEN.forEach((c, i) => {
    const monthEndOnly = c === 'Equipment depreciation' || c === 'Prepaid amortisation'
    const mw = months.map((m) => (m === CURRENT_PERIOD ? (monthEndOnly ? 0 : 0.33) : 1) * baseW(m))
    const parts = splitAmount(catTotals[i], mw, 100_000)
    months.forEach((m, j) => {
      if (parts[j]) cat[c][m] = parts[j]
    })
  })
  for (const g of gen) cat['GEN overhead'][g.month] = (cat['GEN overhead'][g.month] ?? 0) + g.amount
  // late costs post to the current period but stay on the originating project
  for (const l of late) cat[l.category][CURRENT_PERIOD] = (cat[l.category][CURRENT_PERIOD] ?? 0) + l.amount

  const revenue: Record<string, number> = {}
  const rw = months.map((m) => (m === CURRENT_PERIOD ? 0.22 : 1) * baseW(m))
  splitAmount(p.revenue, rw, 100_000).forEach((v, j) => {
    if (v) revenue[months[j]] = v
  })

  const allMonths = [...new Set([...months, ...(late.length ? [CURRENT_PERIOD] : [])])].sort()
  const model: LeafModel = { months: allMonths, cat, revenue, gen, late }
  leafCache.set(p.code, model)
  return model
}

/** Leaf codes under a code (itself when it has no children) */
export function leafCodes(code: string): string[] {
  const kids = childProjects(code)
  return kids.length ? kids.flatMap((k) => leafCodes(k.code)) : [code]
}

const isGen = (code: string) => code.startsWith('GEN')

// ─── Public helpers ───────────────────────────────────────────────────────────
export interface CategoryLine {
  category: CostCategory
  /** RAB v1 baseline */
  rabBaseline: number
  /** Current approved RAB */
  rab: number
  /** Open PR/PO commitments */
  committed: number
  /** Actual cost to date */
  actual: number
  /** rab − actual − committed */
  remaining: number
}

function leafRab(p: Project): { rab: Record<CostCategory, number>; base: Record<CostCategory, number> } {
  const base = zeroCats()
  const rab = zeroCats()
  if (isGen(p.code)) {
    base['GEN overhead'] = p.rabBaseline
    rab['GEN overhead'] = p.rab
    return { rab, base }
  }
  const prof = profiles[p.businessLine as Exclude<BusinessLine, 'CORP'>] ?? profiles.HL
  const g = genRabPct[p.businessLine]
  const weights = COST_CATEGORIES.map((c) => (c === 'GEN overhead' ? g : (prof[c] ?? 0) * (1 - g)))
  splitAmount(p.rabBaseline, weights, 1_000_000).forEach((v, i) => (base[COST_CATEGORIES[i]] = v))
  COST_CATEGORIES.forEach((c) => (rab[c] = base[c]))
  for (const r of rabRevisions.filter((x) => x.projectCode === p.code)) for (const ch of r.changes) rab[ch.category] += ch.delta
  return { rab, base }
}

/**
 * Cost breakdown by category for any project code (parent codes aggregate their children;
 * GEN codes return a single 'GEN overhead' line). Σ actual = project.actual, Σ committed = project.committed.
 */
export function projectCostBreakdown(code: string): CategoryLine[] {
  const p = getProject(code)
  if (!p) return []
  const leaves = leafCodes(code).map((c) => getProject(c)!)
  const acc = COST_CATEGORIES.map((c) => ({ category: c, rabBaseline: 0, rab: 0, committed: 0, actual: 0, remaining: 0 }))
  for (const lp of leaves) {
    const { rab, base } = leafRab(lp)
    const m = isGen(lp.code) ? null : leafModel(lp)
    acc.forEach((a) => {
      a.rab += rab[a.category]
      a.rabBaseline += base[a.category]
      a.actual += m ? sum(Object.values(m.cat[a.category])) : a.category === 'GEN overhead' ? lp.actual : 0
      a.committed += sum(commitments.filter((x) => x.projectCode === lp.code && x.category === a.category).map((x) => x.openAmount))
    })
  }
  acc.forEach((a) => (a.remaining = a.rab - a.actual - a.committed))
  return isGen(code) ? acc.filter((a) => a.category === 'GEN overhead') : acc
}

export interface MonthlyPoint {
  /** 'YYYY-MM' */
  period: string
  /** 'Feb 28' */
  label: string
  cost: number
  revenue: number
  byCategory: Record<CostCategory, number>
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const shortPeriod = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`

/** Monthly cost & revenue for a project code (oldest first). Σ cost = project.actual, Σ revenue = project.revenue. */
export function projectMonthly(code: string): MonthlyPoint[] {
  const p = getProject(code)
  if (!p || isGen(code)) return []
  const map = new Map<string, MonthlyPoint>()
  for (const lc of leafCodes(code)) {
    const lp = getProject(lc)!
    const m = leafModel(lp)
    for (const period of m.months) {
      const pt = map.get(period) ?? { period, label: shortPeriod(period), cost: 0, revenue: 0, byCategory: zeroCats() }
      for (const c of COST_CATEGORIES) {
        const v = m.cat[c][period] ?? 0
        pt.byCategory[c] += v
        pt.cost += v
      }
      pt.revenue += m.revenue[period] ?? 0
      map.set(period, pt)
    }
  }
  return [...map.values()].sort((a, b) => a.period.localeCompare(b.period))
}

/** GEN overhead received by a code (parents aggregate children), newest first */
export function projectGenReceipts(code: string): (GenReceipt & { projectCode: string })[] {
  return leafCodes(code)
    .flatMap((c) => {
      const lp = getProject(c)!
      return isGen(c) ? [] : leafModel(lp).gen.map((g) => ({ ...g, projectCode: c }))
    })
    .sort((a, b) => b.month.localeCompare(a.month) || a.pool.localeCompare(b.pool))
}

export const projectCommitments = (code: string) => {
  const leaves = leafCodes(code)
  return commitments.filter((c) => leaves.includes(c.projectCode))
}

export const projectRabRevisions = (code: string) => {
  const leaves = leafCodes(code)
  return rabRevisions.filter((r) => leaves.includes(r.projectCode)).sort((a, b) => a.date.localeCompare(b.date))
}

// ─── Transactions ledger ──────────────────────────────────────────────────────
export type SourceType =
  | 'Timesheet'
  | 'Fuel log'
  | 'Fuel actualisation'
  | 'PO/GR'
  | 'AP invoice'
  | 'Depreciation'
  | 'GEN allocation'
  | 'Prepaid amortisation'
  | 'Late cost'
  | 'AR invoice'

export const SOURCE_TYPES: SourceType[] = ['Timesheet', 'Fuel log', 'Fuel actualisation', 'PO/GR', 'AP invoice', 'Depreciation', 'GEN allocation', 'Prepaid amortisation', 'Late cost', 'AR invoice']

export interface LedgerLine {
  id: string
  projectCode: string
  /** accounting (posting) period YYYY-MM */
  postingPeriod: string
  /** period the cost belongs to (differs from posting for late costs) */
  attributionPeriod: string
  date: string
  kind: 'Cost' | 'Revenue'
  category?: CostCategory
  source: SourceType
  docId: string
  docLink?: string
  description: string
  counterparty?: string
  amount: number
  /** Posted from SAP B1 archive (before the 1 Jan 2028 cut-over) */
  legacy?: boolean
}

const descTemplates: Record<Exclude<CostCategory, 'GEN overhead'>, string[]> = {
  Labour: ['Verified timesheets — operators & drivers', 'Verified timesheets — site crew overtime', 'Verified timesheets — supervisors & riggers'],
  Fuel: ['HSD issued to units — fuel log', 'HSD issued — fuel stick / pump records', 'Lubricants & HSD top-up'],
  Subcontract: ['Subcontract service receipt', 'Unit hire — service entry sheet', 'Subcontract progress claim'],
  'Equipment depreciation': ['Depreciation allocated by operating hours'],
  'Materials & equipment': ['Goods receipt — materials & parts', 'Store issue to project', 'Consumables goods receipt'],
  'Travel & charges': ['Crew travel & lodging', 'Site mess & accommodation', 'Mobilisation travel'],
  'Permits & tolls': ['Toll statement', 'Road permit & escort', 'Port / site access charges'],
  'Prepaid amortisation': ['Amortisation — CAR insurance & mobilisation fee'],
}

const sourceFor = (c: CostCategory, i: number): SourceType => {
  switch (c) {
    case 'Labour':
      return 'Timesheet'
    case 'Fuel':
      return 'Fuel log'
    case 'Subcontract':
    case 'Materials & equipment':
      return i % 3 === 2 ? 'AP invoice' : 'PO/GR'
    case 'Equipment depreciation':
      return 'Depreciation'
    case 'Travel & charges':
    case 'Permits & tolls':
      return 'AP invoice'
    case 'GEN overhead':
      return 'GEN allocation'
    case 'Prepaid amortisation':
      return 'Prepaid amortisation'
  }
}

const catCode: Record<CostCategory, string> = { Labour: 'LB', Fuel: 'FU', Subcontract: 'SC', 'Equipment depreciation': 'DP', 'Materials & equipment': 'MT', 'Travel & charges': 'TR', 'Permits & tolls': 'PT', 'GEN overhead': 'GA', 'Prepaid amortisation': 'PA' }

function docFor(src: SourceType, m: string, seed: number, projectCode: string, category?: CostCategory): { docId: string; docLink?: string } {
  const yymm = m.slice(2, 4) + m.slice(5, 7)
  const n = String(100 + Math.floor(seed * 890)).padStart(4, '0')
  const legacy = m < '2028-01'
  switch (src) {
    case 'Timesheet':
      return { docId: `TS-${yymm}-${n}`, docLink: '/timesheets' }
    case 'Fuel log':
      return { docId: `FL-${yymm}-${n}`, docLink: '/fleet/fuel' }
    case 'Fuel actualisation':
      return { docId: `FA-${m}`, docLink: '/costing/fuel-actualisation' }
    case 'PO/GR': {
      const po = purchaseOrders.find((p) => p.projectCode === projectCode && category && poCategory(p.costCategory) === category && p.date.slice(0, 7) <= m)
      return po ? { docId: `GR-${yymm}-${n} · ${po.id}`, docLink: `/procurement/orders/${po.id}` } : { docId: `GR-${yymm}-${n}`, docLink: '/procurement/receipts' }
    }
    case 'AP invoice':
      return { docId: `LI-${m.slice(0, 4)}-${n}`, docLink: '/finance/loket' }
    case 'Depreciation':
      return legacy ? { docId: `B1-DEP-${yymm}` } : { docId: `DEP-${m}`, docLink: '/finance/assets' }
    case 'Prepaid amortisation':
      return legacy ? { docId: `B1-AMZ-${yymm}` } : { docId: `AMZ-${m}-${n.slice(2)}`, docLink: '/finance/gl' }
    case 'GEN allocation':
      return { docId: `ALLOC-${m}`, docLink: '/costing/allocation' }
    case 'AR invoice':
      return { docId: `INV-${yymm}-${n}`, docLink: '/finance/ar' }
    case 'Late cost':
      return { docId: '', docLink: '/costing/late-costs' }
  }
}

const ledgerCache = new Map<string, LedgerLine[]>()

function leafLedger(p: Project): LedgerLine[] {
  const cached = ledgerCache.get(p.code)
  if (cached) return cached
  const m = leafModel(p)
  const lines: LedgerLine[] = []
  const lastDay = (period: string) => (period === CURRENT_PERIOD ? 10 : 28)
  let seq = 0
  const push = (l: Omit<LedgerLine, 'id' | 'projectCode'>) => lines.push({ ...l, id: `${p.code}-${++seq}`, projectCode: p.code })

  for (const period of m.months) {
    for (const c of NON_GEN) {
      let amt = m.cat[c][period] ?? 0
      // late costs are separate lines
      const lateHere = period === CURRENT_PERIOD ? m.late.filter((l) => l.category === c) : []
      for (const l of lateHere) {
        amt -= l.amount
        push({ postingPeriod: CURRENT_PERIOD, attributionPeriod: l.originalPeriod, date: l.postedOn ?? `${CURRENT_PERIOD}-06`, kind: 'Cost', category: c, source: 'Late cost', docId: l.id, docLink: '/costing/late-costs', description: `${l.description} (journal ${l.journalId})`, counterparty: l.vendorName, amount: l.amount })
      }
      if (amt <= 0) continue
      const monthEnd = c === 'Equipment depreciation' || c === 'Prepaid amortisation'
      const n = monthEnd ? 1 : amt > 600_000_000 ? 3 : amt > 150_000_000 ? 2 : 1
      // fuel true-up after the Jan 2028 actualisation run
      const fuelVar = c === 'Fuel' && p.businessLine === 'HL' && period === '2028-01' && amt > 50_000_000 ? Math.round((amt * 0.018) / 100_000) * 100_000 : 0
      const parts = splitAmount(amt - fuelVar, Array.from({ length: n }, (_, i) => 0.7 + 0.6 * hash(p.code + period + c + i)), 100_000)
      const tmpl = descTemplates[c as Exclude<CostCategory, 'GEN overhead'>]
      parts.forEach((v, i) => {
        const src = sourceFor(c, i)
        const seed = hash(p.code + period + c + 'doc' + i)
        const doc = docFor(src, period, seed, p.code, c)
        const day = monthEnd ? lastDay(period) : Math.min(lastDay(period), 4 + Math.floor((i + 1) * (lastDay(period) / (n + 1))))
        push({
          postingPeriod: period,
          attributionPeriod: period,
          date: `${period}-${String(day).padStart(2, '0')}`,
          kind: 'Cost',
          category: c,
          source: src,
          ...doc,
          description: `${tmpl[i % tmpl.length]}${period < '2028-01' && (src === 'Depreciation' || src === 'Prepaid amortisation') ? ' (SAP B1 archive)' : ''}`,
          amount: v,
        })
      })
      if (fuelVar)
        push({ postingPeriod: '2028-02', attributionPeriod: period, date: '2028-02-06', kind: 'Cost', category: c, source: 'Fuel actualisation', docId: 'FA-2028-01', docLink: '/costing/fuel-actualisation', description: 'Fuel variance true-up vs PT Solar Energi Kaltim statement (Jan 2028)', counterparty: 'PT Solar Energi Kaltim', amount: fuelVar })
    }
    for (const g of m.gen.filter((x) => x.month === period)) {
      const doc = docFor('GEN allocation', period, 0, p.code)
      push({ postingPeriod: period, attributionPeriod: period, date: `${period}-28`, kind: 'Cost', category: 'GEN overhead', source: 'GEN allocation', ...doc, description: `${g.pool} allocation${g.lines ? ` — ${g.lines.length} rules` : ' — FY2027 pool'}`, counterparty: g.pool, amount: g.amount })
    }
    const rev = m.revenue[period]
    if (rev) {
      const doc = docFor('AR invoice', period, hash(p.code + period + 'rev'), p.code)
      push({ postingPeriod: period, attributionPeriod: period, date: `${period}-${period === CURRENT_PERIOD ? '08' : '25'}`, kind: 'Revenue', source: 'AR invoice', ...doc, description: 'Billing per Surat Konversi — verified work', counterparty: p.customerId, amount: rev })
    }
  }
  lines.forEach((l) => (l.legacy = l.postingPeriod < '2028-01'))
  ledgerCache.set(p.code, lines)
  return lines
}

/** Every cost & revenue line for a code (parents include children), newest first */
export function projectLedger(code: string): LedgerLine[] {
  return leafCodes(code)
    .filter((c) => !isGen(c))
    .flatMap((c) => leafLedger(getProject(c)!))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
}

export { catCode }

// ─── Roll-up (FAT-06) ─────────────────────────────────────────────────────────
export interface PLRow {
  contractValue: number
  rab: number
  committed: number
  actual: number
  revenue: number
}
const addPL = (a: PLRow, p: PLRow): PLRow => ({ contractValue: a.contractValue + p.contractValue, rab: a.rab + p.rab, committed: a.committed + p.committed, actual: a.actual + p.actual, revenue: a.revenue + p.revenue })
const zeroPL = (): PLRow => ({ contractValue: 0, rab: 0, committed: 0, actual: 0, revenue: 0 })

/** Project → business line → company. Uses top-level codes only so children are not double counted. */
export function businessLineRollup() {
  const roots = projects.filter((p) => !p.parent && !isGen(p.code))
  const lines = (['HL', 'PS', 'GS'] as const).map((bl) => {
    const ps = roots.filter((p) => p.businessLine === bl)
    return { bl, projects: ps, total: ps.reduce((a, p) => addPL(a, p), zeroPL()) }
  })
  const projectTotal = lines.reduce((a, l) => addPL(a, l.total), zeroPL())
  const retained = genPoolSummary('GEN-HO').retained + genPoolSummary('GEN-BPN').retained
  const awaiting = genPoolSummary('GEN-HO').awaiting + genPoolSummary('GEN-BPN').awaiting
  return { lines, projectTotal, retainedOverhead: retained, awaitingAllocation: awaiting }
}

// ─── Fuel actualisation (FAT-23/24) ───────────────────────────────────────────
export interface FuelStatementLine {
  id: string
  date: string
  plate: string
  /** Unit matched from the plate / fuel card, undefined = no field record */
  unitId?: string
  projectCode?: string
  fieldLitres: number
  statementLitres: number
  statementPrice: number
  receiptNo: string
}

export const FUEL_EST_PRICE = 13_700 // PO-2028-0172 price per litre used for the field estimate

export const fuelStatement: FuelStatementLine[] = [
  { id: 'SOL-0201', date: '2028-02-25', plate: 'KT 8114 AD', unitId: 'DT-01', projectCode: 'HL-2027-014.01', fieldLitres: 9_840, statementLitres: 9_910, statementPrice: 13_905, receiptNo: 'SPBU 64.751.07 / 28-02 batch 14' },
  { id: 'SOL-0202', date: '2028-02-25', plate: 'KT 8115 AD', unitId: 'DT-02', projectCode: 'HL-2027-014.01', fieldLitres: 9_620, statementLitres: 9_655, statementPrice: 13_905, receiptNo: 'SPBU 64.751.07 / 28-02 batch 14' },
  { id: 'SOL-0203', date: '2028-02-25', plate: 'KT 8007 AC', unitId: 'DT-03', projectCode: 'HL-2027-014.01', fieldLitres: 9_210, statementLitres: 9_480, statementPrice: 13_905, receiptNo: 'SPBU 64.751.07 / 28-02 batch 15' },
  { id: 'SOL-0204', date: '2028-02-25', plate: 'KT 8008 AC', unitId: 'DT-04', projectCode: 'HL-2027-014.01', fieldLitres: 5_480, statementLitres: 6_120, statementPrice: 13_905, receiptNo: 'SPBU 64.751.07 / 28-02 batch 15' },
  { id: 'SOL-0205', date: '2028-02-25', plate: 'KT 8233 AE', unitId: 'DT-05', projectCode: 'HL-2027-014.01', fieldLitres: 10_120, statementLitres: 10_140, statementPrice: 13_905, receiptNo: 'SPBU 64.751.07 / 28-02 batch 16' },
  { id: 'SOL-0206', date: '2028-02-25', plate: 'KT 8234 AE', unitId: 'DT-06', projectCode: 'HL-2027-014.01', fieldLitres: 3_950, statementLitres: 3_960, statementPrice: 13_905, receiptNo: 'SPBU 64.751.07 / 28-02 batch 16' },
  { id: 'SOL-0207', date: '2028-02-25', plate: 'Site tank T-3 (EX-01)', unitId: 'EX-01', projectCode: 'HL-2027-014.01', fieldLitres: 7_380, statementLitres: 7_410, statementPrice: 13_780, receiptNo: 'Tank delivery DO-2802-118' },
  { id: 'SOL-0208', date: '2028-02-25', plate: 'KT 8450 AB', unitId: 'WT-01', projectCode: 'HL-2027-014.01', fieldLitres: 4_260, statementLitres: 4_310, statementPrice: 13_905, receiptNo: 'SPBU 64.751.07 / 28-02 batch 17' },
  { id: 'SOL-0209', date: '2028-02-25', plate: 'KT 8812 AB', unitId: 'PM-01', projectCode: 'HL-2027-014.02', fieldLitres: 3_120, statementLitres: 3_145, statementPrice: 13_905, receiptNo: 'SPBU 64.751.07 / 28-02 batch 17' },
  { id: 'SOL-0210', date: '2028-02-25', plate: 'Site tank T-3 (CR-100-01)', unitId: 'CR-100-01', projectCode: 'HL-2027-014.02', fieldLitres: 2_480, statementLitres: 2_470, statementPrice: 13_780, receiptNo: 'Tank delivery DO-2802-121' },
  { id: 'SOL-0211', date: '2028-02-25', plate: 'Barge tank Bekapai (CR-200-01)', unitId: 'CR-200-01', projectCode: 'HL-2027-021', fieldLitres: 3_860, statementLitres: 3_905, statementPrice: 14_120, receiptNo: 'Marine delivery MD-2802-007' },
  { id: 'SOL-0212', date: '2028-02-25', plate: 'Barge tank Bekapai (SP-01)', unitId: 'SP-01', projectCode: 'HL-2027-021', fieldLitres: 1_240, statementLitres: 1_250, statementPrice: 14_120, receiptNo: 'Marine delivery MD-2802-007' },
  { id: 'SOL-0213', date: '2028-02-25', plate: 'KT 1127 PL', unitId: 'LV-07', projectCode: 'GEN-BPN', fieldLitres: 690, statementLitres: 705, statementPrice: 13_905, receiptNo: 'Fuel card 7788-0012' },
  { id: 'SOL-0214', date: '2028-02-19', plate: 'KT 8901 AC', fieldLitres: 0, statementLitres: 1_860, statementPrice: 13_905, receiptNo: 'SPBU 64.751.07 / 28-02 batch 11' },
]

export const fuelBatches = [
  { period: '2027-12', statement: 'SOL/STM/2027-12', status: 'Posted', journal: 'B1-JE-2801-0044', note: 'Manual journal to SAP B1 (pre cut-over)', variance: 38_200_000 },
  { period: '2028-01', statement: 'SOL/STM/2028-01', status: 'Posted', journal: 'JV-2028-02-0007', note: 'Posted in platform GL', variance: 41_600_000 },
  { period: '2028-02', statement: 'SOL/STM/2028-02', status: 'In progress', journal: undefined, note: 'Statement received 04 Mar 2028', variance: 0 },
] as const

// ─── FPP — budget control documents (FAT-28/29) ────────────────────────────────
export type FppStatus = 'Draft' | 'Pending approval' | 'Approved' | 'Committed' | 'Partially realised' | 'Realised' | 'Closed'
export interface Fpp {
  id: string
  projectCode: string
  category: CostCategory
  description: string
  amount: number
  prId?: string
  poId?: string
  /** Platform GL journals (Stage 1B onward) */
  journalIds: string[]
  /** SAP B1 archive journal (before the 1 Jan 2028 cut-over) */
  legacyJournal?: string
  status: FppStatus
  date: string
  requestedBy: string
  approvedBy?: string
}

export const fpps: Fpp[] = [
  { id: 'FPP-2028-0047', projectCode: 'HL-2027-014.01', category: 'Materials & equipment', description: 'Brake chambers & air dryers — DT fleet', amount: 58_700_000, prId: 'PR-2028-0253', poId: 'PO-2028-0201', journalIds: [], status: 'Draft', date: '2028-03-09', requestedBy: 'EMP-0007' },
  { id: 'FPP-2028-0046', projectCode: 'HL-2028-002', category: 'Subcontract', description: 'Rig move support crew & tail cranes', amount: 845_000_000, prId: 'PR-2028-0250', poId: 'PO-2028-0199', journalIds: [], status: 'Pending approval', date: '2028-03-06', requestedBy: 'EMP-0003' },
  { id: 'FPP-2028-0045', projectCode: 'PS-2028-003', category: 'Subcontract', description: 'Additional catalyst technicians — client VO-02', amount: 768_000_000, prId: 'PR-2028-0241', journalIds: [], status: 'Approved', date: '2028-02-26', requestedBy: 'EMP-0004', approvedBy: 'EMP-0002' },
  { id: 'FPP-2028-0044', projectCode: 'HL-2027-014.01', category: 'Fuel', description: 'HSD fuel supply — March 2028 (125 KL)', amount: 1_712_500_000, prId: 'PR-2028-0244', poId: 'PO-2028-0195', journalIds: ['JV-2028-03-0015'], status: 'Partially realised', date: '2028-02-28', requestedBy: 'EMP-0003', approvedBy: 'EMP-0002' },
  { id: 'FPP-2028-0041', projectCode: 'HL-2027-014.01', category: 'Subcontract', description: 'Haulage subcontract — March 2028 (4 DT)', amount: 1_180_000_000, prId: 'PR-2028-0231', poId: 'PO-2028-0187', journalIds: [], status: 'Committed', date: '2028-02-26', requestedBy: 'EMP-0003', approvedBy: 'EMP-0002' },
  { id: 'FPP-2028-0040', projectCode: 'PS-2028-003', category: 'Subcontract', description: 'Scaffolding erection & dismantle — reactor deck', amount: 312_000_000, prId: 'PR-2028-0236', poId: 'PO-2028-0190', journalIds: ['JV-2028-03-0006'], status: 'Realised', date: '2028-02-19', requestedBy: 'EMP-0004', approvedBy: 'EMP-0002' },
  { id: 'FPP-2028-0038', projectCode: 'HL-2027-014.01', category: 'Fuel', description: 'HSD fuel supply — February 2028 (120 KL)', amount: 1_644_000_000, prId: 'PR-2028-0209', poId: 'PO-2028-0172', journalIds: ['JV-2028-02-0018', 'JV-2028-03-0004'], status: 'Realised', date: '2028-01-30', requestedBy: 'EMP-0003', approvedBy: 'EMP-0002' },
  { id: 'FPP-2028-0036', projectCode: 'HL-2027-014.02', category: 'Permits & tolls', description: 'Heavy haul road permits & escort — Q1', amount: 96_500_000, prId: 'PR-2028-0227', poId: 'PO-2028-0183', journalIds: ['JV-2028-03-0012'], status: 'Realised', date: '2028-02-14', requestedBy: 'EMP-0003', approvedBy: 'EMP-0002' },
  { id: 'FPP-2028-0035', projectCode: 'PS-2028-003', category: 'Materials & equipment', description: 'Liquid nitrogen — 18 tanker loads', amount: 486_000_000, prId: 'PR-2028-0222', poId: 'PO-2028-0181', journalIds: ['JV-2028-02-0033'], status: 'Realised', date: '2028-02-11', requestedBy: 'EMP-0004', approvedBy: 'EMP-0002' },
  { id: 'FPP-2028-0033', projectCode: 'GEN-BPN', category: 'GEN overhead', description: 'Spare parts — PM 1000 hr kits (fleet)', amount: 214_000_000, prId: 'PR-2028-0214', poId: 'PO-2028-0176', journalIds: ['JV-2028-02-0029'], status: 'Realised', date: '2028-02-05', requestedBy: 'EMP-0012', approvedBy: 'EMP-0003' },
  { id: 'FPP-2028-0029', projectCode: 'PS-2028-003', category: 'Subcontract', description: 'Catalyst handling crew & dense loading equipment', amount: 2_350_000_000, prId: 'PR-2028-0198', poId: 'PO-2028-0164', journalIds: ['JV-2028-02-0021'], status: 'Realised', date: '2028-01-19', requestedBy: 'EMP-0004', approvedBy: 'EMP-0001' },
  { id: 'FPP-2028-0027', projectCode: 'GS-2027-008', category: 'Materials & equipment', description: 'High-pressure pumps & VFD panels', amount: 1_265_000_000, prId: 'PR-2028-0190', poId: 'PO-2028-0158', journalIds: [], status: 'Committed', date: '2028-01-10', requestedBy: 'EMP-0005', approvedBy: 'EMP-0002' },
  { id: 'FPP-2027-0212', projectCode: 'GS-2027-008', category: 'Materials & equipment', description: 'UF membrane skid + RO train (2 × 50 m³/h)', amount: 6_420_000_000, prId: 'PR-2027-1102', poId: 'PO-2027-0911', journalIds: ['JV-2028-03-0010'], legacyJournal: 'B1-JE-2712-0318', status: 'Partially realised', date: '2027-11-14', requestedBy: 'EMP-0005', approvedBy: 'EMP-0001' },
  { id: 'FPP-2027-0198', projectCode: 'PS-2027-017', category: 'Subcontract', description: 'Boiler tube replacement — specialist welding crew', amount: 1_480_000_000, prId: 'PR-2027-1071', journalIds: [], legacyJournal: 'B1-JE-2712-0107', status: 'Closed', date: '2027-10-12', requestedBy: 'EMP-0004', approvedBy: 'EMP-0001' },
  { id: 'FPP-2027-0187', projectCode: 'HL-2027-021', category: 'Subcontract', description: 'SPMT operators & module transport engineering', amount: 1_120_000_000, prId: 'PR-2027-1016', journalIds: ['JV-2028-01-0042'], legacyJournal: 'B1-JE-2711-0266', status: 'Realised', date: '2027-10-03', requestedBy: 'EMP-0003', approvedBy: 'EMP-0002' },
]

/** Core-known PR ids (from purchase orders) — safe to link to /procurement/requisitions/:id */
export const knownPrIds = new Set(purchaseOrders.map((p) => p.prId))
