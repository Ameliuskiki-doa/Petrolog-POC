/**
 * Procurement data — M6 Procurement & VMS.
 * Extends core.ts: every core purchaseOrders.prId exists here as a requisition; PO lines, receipts,
 * RFQs and vendor profiles hang off the same IDs.
 */
import { projects, purchaseOrders, vendors, getProject, type BusinessLine, type PurchaseOrder, type Vendor } from './core'
import { TODAY_ISO, daysUntil } from '@/lib/format'

// ─── Cost categories & RAB budget lines ───────────────────────────────────────
export const costCategories = ['Subcontract', 'Fuel', 'Materials', 'Equipment', 'Equipment Rental', 'Spare Parts', 'Permits & Tolls', 'Manpower', 'Services'] as const
export type CostCategory = (typeof costCategories)[number]

export interface BudgetLine {
  projectCode: string
  category: CostCategory
  rab: number
  actual: number
  committed: number
}

const weights: Record<BusinessLine, Partial<Record<CostCategory, number>>> = {
  HL: { Subcontract: 0.3, Fuel: 0.28, 'Spare Parts': 0.12, 'Equipment Rental': 0.1, 'Permits & Tolls': 0.05, Manpower: 0.15 },
  PS: { Subcontract: 0.4, Materials: 0.2, 'Equipment Rental': 0.1, Manpower: 0.25, Services: 0.05 },
  GS: { Equipment: 0.55, Subcontract: 0.2, Materials: 0.1, Manpower: 0.1, Services: 0.05 },
  CORP: { Services: 0.45, Manpower: 0.35, 'Spare Parts': 0.1, Materials: 0.1 },
}

/** Explicit RAB lines where the demo story needs exact figures (they still sum to the core project totals). */
const explicitLines: Record<string, [CostCategory, number, number, number][]> = {
  // Subcontract line was set before the rig survey added tail-crane scope → PR-2028-0250 exceeded it.
  'HL-2028-002': [
    ['Subcontract', 1_100_000_000, 440_000_000, 845_000_000],
    ['Fuel', 1_300_000_000, 360_000_000, 40_000_000],
    ['Equipment Rental', 1_700_000_000, 290_000_000, 0],
    ['Permits & Tolls', 350_000_000, 70_000_000, 25_000_000],
    ['Manpower', 1_150_000_000, 80_000_000, 0],
  ],
  'GS-2027-008': [
    ['Equipment', 10_400_000_000, 4_280_000_000, 5_600_000_000],
    ['Subcontract', 3_200_000_000, 1_200_000_000, 850_000_000],
    ['Materials', 1_500_000_000, 780_000_000, 300_000_000],
    ['Manpower', 1_600_000_000, 700_000_000, 0],
    ['Services', 600_000_000, 160_000_000, 200_000_000],
  ],
}

const roundM = (n: number) => Math.round(n / 1_000_000) * 1_000_000

function splitProject(code: string): BudgetLine[] {
  const p = getProject(code)
  if (!p) return []
  if (explicitLines[code]) return explicitLines[code].map(([category, rab, actual, committed]) => ({ projectCode: code, category, rab, actual, committed }))
  const w = Object.entries(weights[p.businessLine]) as [CostCategory, number][]
  const out: BudgetLine[] = []
  let r = 0, a = 0, c = 0
  w.forEach(([category, share], i) => {
    const last = i === w.length - 1
    const rab = last ? p.rab - r : roundM(p.rab * share)
    const actual = last ? p.actual - a : roundM(p.actual * share)
    const committed = last ? p.committed - c : roundM(p.committed * share)
    r += rab; a += actual; c += committed
    out.push({ projectCode: code, category, rab, actual, committed })
  })
  return out
}

/** Project codes that can be charged by a requisition (children rather than their parent; closed codes excluded). */
export const chargeableProjects = projects.filter((p) => p.status !== 'Closed' && !projects.some((c) => c.parent === p.code))

export const budgetLines: BudgetLine[] = chargeableProjects.flatMap((p) => splitProject(p.code))

export const getBudgetLine = (projectCode: string, category: string) => budgetLines.find((b) => b.projectCode === projectCode && b.category === category)
export const lineRemaining = (b: BudgetLine) => b.rab - b.actual - b.committed

// ─── Extra vendors (registered through the portal after go-live) ─────────────
export const extraVendors: Vendor[] = [
  { id: 'VND-00231', name: 'PT Ban Kaltim Jaya', category: 'Tyres', status: 'Active', city: 'Balikpapan', npwp: '79.004.311.2-721.000', score: 82, docsExpiry: '2028-10-15', pkp: true },
  { id: 'VND-00232', name: 'PT Kimia Tirta Utama', category: 'Water treatment chemicals', status: 'Active', city: 'Surabaya', npwp: '79.004.312.3-609.000', score: 76, docsExpiry: '2028-04-12', pkp: true },
  { id: 'VND-00233', name: 'PT Karya Teknik Hidrolik', category: 'Spare parts (hydraulic & brake)', status: 'Active', city: 'Balikpapan', npwp: '79.004.313.4-721.000', score: 74, docsExpiry: '2028-09-20', pkp: true },
  { id: 'VND-00234', name: 'PT Chemindo Proses', category: 'Water treatment chemicals', status: 'Active', city: 'Gresik', npwp: '79.004.314.5-613.000', score: 63, docsExpiry: '2028-07-30', pkp: true },
]

export const allVendors: Vendor[] = [...vendors, ...extraVendors]
export const findVendor = (id?: string) => allVendors.find((v) => v.id === id)

/** PROC-04: vendors with expired documents, or not Active, cannot be invited to an RFQ. */
export function rfqEligibility(v: Vendor): { ok: boolean; reason?: string } {
  if (v.status === 'Blocked') return { ok: false, reason: 'Blocked vendor' }
  if (v.status === 'Suspended') return { ok: false, reason: daysUntil(v.docsExpiry) < 0 ? 'Suspended · documents expired' : 'Suspended' }
  if (v.status === 'Prospective') return { ok: false, reason: 'Prospective · qualification incomplete' }
  if (daysUntil(v.docsExpiry) < 0) return { ok: false, reason: 'Legal documents expired' }
  return { ok: true }
}

// ─── Purchase requisitions ────────────────────────────────────────────────────
export type PRStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'RFQ' | 'PO Issued' | 'Rejected'

export interface PRLine {
  desc: string
  qty: number
  uom: string
  price: number
  projectCode: string
  category: CostCategory
}

export interface ApprovalStep {
  step: string
  approverId: string
  status: 'Approved' | 'Pending' | 'Rejected' | 'Waiting'
  at?: string
  comment?: string
}

export interface BudgetSnapshotRow {
  projectCode: string
  category: CostCategory
  rab: number
  actual: number
  committed: number
  request: number
}

export interface PurchaseRequisition {
  id: string
  date: string
  title: string
  requesterId: string
  neededBy: string
  status: PRStatus
  lines: PRLine[]
  justification: string
  /** Budget check failed → routed to Finance Director (PROC-07) */
  escalated: boolean
  snapshot: BudgetSnapshotRow[]
  snapshotAt: string
  approvals: ApprovalStep[]
  rfqId?: string
  poId?: string
}

export const prAmount = (pr: { lines: PRLine[] }) => pr.lines.reduce((s, l) => s + l.qty * l.price, 0)

/** Group requested lines by budget line (project code × cost category) */
export function groupRequest(lines: PRLine[]) {
  const map = new Map<string, { projectCode: string; category: CostCategory; request: number }>()
  for (const l of lines) {
    if (!l.projectCode) continue
    const k = `${l.projectCode}|${l.category}`
    const cur = map.get(k) ?? { projectCode: l.projectCode, category: l.category, request: 0 }
    cur.request += l.qty * l.price
    map.set(k, cur)
  }
  return [...map.values()]
}

/** Live budget check for a set of lines — remaining = RAB − actuals − commitments */
export function budgetCheck(lines: PRLine[]): BudgetSnapshotRow[] {
  return groupRequest(lines).map((g) => {
    const b = getBudgetLine(g.projectCode, g.category)
    return { projectCode: g.projectCode, category: g.category, rab: b?.rab ?? 0, actual: b?.actual ?? 0, committed: b?.committed ?? 0, request: g.request }
  })
}

export const snapRemaining = (s: BudgetSnapshotRow) => s.rab - s.actual - s.committed
export const snapExceeds = (s: BudgetSnapshotRow) => s.request > snapRemaining(s)

function approvalsFor(pr: { requesterId: string; lines: PRLine[]; date: string }, stage: 'done' | 'pm' | 'fd' | 'none', escalated: boolean, rejectedNote?: string): ApprovalStep[] {
  const pmId = getProject(pr.lines[0]?.projectCode)?.pmId ?? 'EMP-0003'
  const d = pr.date
  const steps: ApprovalStep[] = [{ step: 'Submitted — budget check run', approverId: pr.requesterId, status: 'Approved', at: `${d}T08:30`, comment: escalated ? 'Budget check: exceeds remaining RAB → escalation' : 'Budget check: within remaining RAB' }]
  steps.push({ step: 'Project Manager', approverId: pmId, status: stage === 'none' ? 'Waiting' : stage === 'pm' ? (rejectedNote ? 'Rejected' : 'Pending') : 'Approved', at: stage === 'pm' || stage === 'none' ? (rejectedNote ? `${d}T15:10` : undefined) : `${d}T13:45`, comment: rejectedNote })
  if (escalated) steps.push({ step: 'Finance Director (budget escalation)', approverId: 'EMP-0002', status: stage === 'fd' ? 'Pending' : stage === 'done' ? 'Approved' : 'Waiting', at: stage === 'done' ? `${d}T17:20` : undefined })
  steps.push({ step: 'Procurement acceptance', approverId: 'EMP-0008', status: stage === 'done' ? 'Approved' : 'Waiting', at: stage === 'done' ? `${d}T17:55` : undefined })
  return steps
}

type PRSeed = Omit<PurchaseRequisition, 'snapshot' | 'snapshotAt' | 'approvals' | 'escalated'> & { snapshot?: BudgetSnapshotRow[]; approvals?: ApprovalStep[]; stage?: 'done' | 'pm' | 'fd' | 'none'; rejectedNote?: string }

function mkPR(s: PRSeed): PurchaseRequisition {
  const committedAlready = s.status === 'PO Issued'
  const snapshot =
    s.snapshot ??
    // For requisitions already converted to POs, reconstruct the position at submission time
    // (their own value was not yet committed and fewer costs had been actualised).
    budgetCheck(s.lines).map((r) => (committedAlready ? { ...r, actual: roundM(r.actual * 0.5), committed: Math.max(0, r.committed - r.request) } : r))
  const escalated = snapshot.some(snapExceeds)
  const stage = s.stage ?? (s.status === 'Pending Approval' ? 'pm' : s.status === 'Draft' ? 'none' : s.status === 'Rejected' ? 'pm' : 'done')
  return {
    ...s,
    snapshot,
    snapshotAt: `${s.date}T08:30`,
    escalated,
    approvals: s.approvals ?? (s.status === 'Draft' ? [] : approvalsFor(s, stage, escalated, s.rejectedNote)),
  }
}

const L = (desc: string, qty: number, uom: string, price: number, projectCode: string, category: CostCategory): PRLine => ({ desc, qty, uom, price, projectCode, category })

export const requisitions: PurchaseRequisition[] = [
  mkPR({ id: 'PR-2028-0259', date: '2028-03-10', title: 'Lifting slings & shackles — Pit 3 lifting crew', requesterId: 'EMP-0006', neededBy: '2028-03-20', status: 'Draft', justification: 'Replacement of slings failing inspection', lines: [L('Wire rope sling 32 mm × 6 m', 8, 'pcs', 2_850_000, 'HL-2027-014.02', 'Spare Parts'), L('Bow shackle 25T', 6, 'pcs', 1_950_000, 'HL-2027-014.02', 'Spare Parts')] }),
  mkPR({ id: 'PR-2028-0258', date: '2028-03-09', title: 'Laptops for site admin (Balikpapan)', requesterId: 'EMP-0007', neededBy: '2028-03-31', status: 'Pending Approval', justification: 'Replacement of 3 units > 5 years old', lines: [L('Laptop 14" i5 / 16 GB', 3, 'unit', 14_500_000, 'GEN-BPN', 'Services')] }),
  mkPR({ id: 'PR-2028-0257', date: '2028-03-06', title: 'Tyres 12.00R24 — DT fleet', requesterId: 'EMP-0012', neededBy: '2028-03-25', status: 'RFQ', rfqId: 'RFQ-2028-0047', justification: 'Tread depth below limit on DT-01, DT-02, DT-05', lines: [L('Tyre 12.00R24 radial', 18, 'pcs', 7_400_000, 'HL-2027-014.01', 'Spare Parts'), L('Inner tube & flap set', 18, 'set', 650_000, 'HL-2027-014.01', 'Spare Parts')] }),
  mkPR({
    id: 'PR-2028-0256', date: '2028-03-08', title: 'Additional RO membrane elements — spare set', requesterId: 'EMP-0021', neededBy: '2028-04-15', status: 'Pending Approval', stage: 'fd',
    justification: 'Client requested a commissioning spare set after water analysis showed higher silica',
    lines: [L('RO membrane element 8" (brackish, high rejection)', 48, 'pcs', 14_200_000, 'GS-2027-008', 'Equipment'), L('Pressure vessel 8" 6-element', 2, 'unit', 49_200_000, 'GS-2027-008', 'Equipment')],
  }),
  mkPR({ id: 'PR-2028-0255', date: '2028-03-02', title: 'Membrane antiscalant & CIP chemicals', requesterId: 'EMP-0021', neededBy: '2028-03-30', status: 'RFQ', rfqId: 'RFQ-2028-0045', justification: 'Commissioning chemicals for UF/RO train', lines: [L('Antiscalant (phosphonate based)', 2_400, 'kg', 68_000, 'GS-2027-008', 'Materials'), L('CIP acid cleaner', 800, 'kg', 42_000, 'GS-2027-008', 'Materials'), L('CIP alkaline cleaner', 800, 'kg', 46_000, 'GS-2027-008', 'Materials')] }),
  mkPR({ id: 'PR-2028-0254', date: '2028-03-05', title: 'HSD fuel top-up — Pit 3 (duplicate)', requesterId: 'EMP-0007', neededBy: '2028-03-12', status: 'Rejected', rejectedNote: 'Duplicate of PR-2028-0244 — volume already covered by PO-2028-0195.', justification: 'Fuel top-up', lines: [L('HSD (B40) delivered to Pit 3', 20_000, 'L', 13_700, 'HL-2027-014.01', 'Fuel')] }),
  mkPR({ id: 'PR-2028-0253', date: '2028-03-04', title: 'Brake chambers & air dryers — DT fleet', requesterId: 'EMP-0012', neededBy: '2028-03-18', status: 'PO Issued', rfqId: 'RFQ-2028-0044', poId: 'PO-2028-0201', justification: 'Brake system campaign after inspection findings', lines: [L('Brake chamber type 30/30', 24, 'pcs', 1_450_000, 'HL-2027-014.01', 'Spare Parts'), L('Air dryer assembly', 10, 'pcs', 2_390_000, 'HL-2027-014.01', 'Spare Parts')] }),
  mkPR({
    id: 'PR-2028-0250', date: '2028-03-03', title: 'Rig move support crew & tail cranes — Well Pad K-7', requesterId: 'EMP-0003', neededBy: '2028-03-12', status: 'PO Issued', rfqId: 'RFQ-2028-0038', poId: 'PO-2028-0199',
    justification: 'Rig survey on 1 Mar showed substructure loads need two 50T tail cranes — scope not in the original RAB',
    lines: [L('Rig move support crew (22 loads)', 1, 'lot', 385_000_000, 'HL-2028-002', 'Subcontract'), L('Tail crane 50T with operator', 46, 'unit-day', 10_000_000, 'HL-2028-002', 'Subcontract')],
    snapshot: [{ projectCode: 'HL-2028-002', category: 'Subcontract', rab: 1_100_000_000, actual: 385_000_000, committed: 90_000_000, request: 845_000_000 }],
    approvals: [
      { step: 'Submitted — budget check run', approverId: 'EMP-0003', status: 'Approved', at: '2028-03-03T08:30', comment: 'Budget check: RAB line HL-2028-002 · Subcontract remaining IDR 625.0 m < request IDR 845.0 m → exceeds by IDR 220.0 m. Escalated automatically.' },
      { step: 'Project Manager', approverId: 'EMP-0003', status: 'Approved', at: '2028-03-03T09:05', comment: 'Tail-crane scope confirmed by rig survey. RAB revision v2 (+IDR 450 m Subcontract, offset from Equipment Rental) submitted to Project Control.' },
      { step: 'Finance Director (budget escalation)', approverId: 'EMP-0002', status: 'Approved', at: '2028-03-05T16:40', comment: 'Approved as exception. Contract margin still 22% at completion; RAB revision to be approved before PO release.' },
      { step: 'Procurement acceptance', approverId: 'EMP-0008', status: 'Approved', at: '2028-03-05T17:10' },
    ],
  }),
  mkPR({ id: 'PR-2028-0244', date: '2028-02-26', title: 'HSD fuel supply — March 2028', requesterId: 'EMP-0007', neededBy: '2028-03-01', status: 'PO Issued', poId: 'PO-2028-0195', justification: 'Monthly fuel call-off under frame agreement', lines: [L('HSD (B40) delivered to Pit 3 fuel station', 125_000, 'L', 13_700, 'HL-2027-014.01', 'Fuel')] }),
  mkPR({ id: 'PR-2028-0236', date: '2028-02-14', title: 'Scaffolding — reactor deck', requesterId: 'EMP-0029', neededBy: '2028-02-20', status: 'PO Issued', poId: 'PO-2028-0190', justification: 'Access for catalyst loading', lines: [L('Scaffolding erection — reactor deck', 1, 'lot', 218_400_000, 'PS-2028-003', 'Subcontract'), L('Scaffolding dismantle', 1, 'lot', 93_600_000, 'PS-2028-003', 'Subcontract')] }),
  mkPR({ id: 'PR-2028-0231', date: '2028-02-16', title: 'Haulage subcontract — March 2028 (4 DT)', requesterId: 'EMP-0003', neededBy: '2028-03-01', status: 'PO Issued', rfqId: 'RFQ-2028-0033', poId: 'PO-2028-0187', justification: 'Peak volume in March exceeds own fleet capacity', lines: [L('Dump truck 40T with driver', 4, 'unit-month', 295_000_000, 'HL-2027-014.01', 'Subcontract')] }),
  mkPR({ id: 'PR-2028-0227', date: '2028-02-10', title: 'Heavy haul permits & escort — Q1', requesterId: 'EMP-0007', neededBy: '2028-02-15', status: 'PO Issued', poId: 'PO-2028-0183', justification: 'Oversize loads on public road', lines: [L('Heavy haul road permits — Q1', 1, 'lot', 58_500_000, 'HL-2027-014.02', 'Permits & Tolls'), L('Police escort per trip', 19, 'trip', 2_000_000, 'HL-2027-014.02', 'Permits & Tolls')] }),
  mkPR({ id: 'PR-2028-0222', date: '2028-02-07', title: 'Liquid nitrogen — 18 tanker loads', requesterId: 'EMP-0019', neededBy: '2028-02-12', status: 'PO Issued', poId: 'PO-2028-0181', justification: 'Nitrogen blanketing during catalyst unloading', lines: [L('Liquid nitrogen tanker load (12 t)', 18, 'load', 27_000_000, 'PS-2028-003', 'Materials')] }),
  mkPR({ id: 'PR-2028-0214', date: '2028-02-01', title: 'PM 1000 hr service kits — fleet', requesterId: 'EMP-0012', neededBy: '2028-02-08', status: 'PO Issued', poId: 'PO-2028-0176', justification: 'Scheduled maintenance, charged to GEN-BPN and allocated', lines: [L('PM kit — DT Scania P410', 6, 'kit', 18_500_000, 'GEN-BPN', 'Spare Parts'), L('PM kit — mobile crane', 2, 'kit', 32_000_000, 'GEN-BPN', 'Spare Parts'), L('PM kit — prime mover', 3, 'kit', 13_000_000, 'GEN-BPN', 'Spare Parts')] }),
  mkPR({ id: 'PR-2028-0209', date: '2028-01-26', title: 'HSD fuel supply — February 2028', requesterId: 'EMP-0007', neededBy: '2028-02-01', status: 'PO Issued', poId: 'PO-2028-0172', justification: 'Monthly fuel call-off under frame agreement', lines: [L('HSD (B40) delivered to Pit 3 fuel station', 120_000, 'L', 13_700, 'HL-2027-014.01', 'Fuel')] }),
  mkPR({ id: 'PR-2028-0198', date: '2028-01-12', title: 'Catalyst handling crew & dense loading equipment', requesterId: 'EMP-0004', neededBy: '2028-01-18', status: 'PO Issued', poId: 'PO-2028-0164', justification: 'Specialist crew for turnaround', lines: [L('Catalyst handling crew (lump sum)', 1, 'lot', 1_950_000_000, 'PS-2028-003', 'Subcontract'), L('Dense loading equipment rental', 1, 'lot', 400_000_000, 'PS-2028-003', 'Equipment Rental')] }),
  mkPR({ id: 'PR-2028-0190', date: '2028-01-05', title: 'High-pressure pumps & VFD panels', requesterId: 'EMP-0005', neededBy: '2028-03-15', status: 'PO Issued', poId: 'PO-2028-0158', justification: 'RO train feed pumps', lines: [L('HP pump 50 m³/h, 65 bar', 4, 'unit', 212_500_000, 'GS-2027-008', 'Equipment'), L('VFD panel 132 kW', 4, 'unit', 103_750_000, 'GS-2027-008', 'Equipment')] }),
  mkPR({ id: 'PR-2027-1102', date: '2027-11-02', title: 'UF membrane skid + RO train (2 × 50 m³/h)', requesterId: 'EMP-0005', neededBy: '2028-02-15', status: 'PO Issued', poId: 'PO-2027-0911', justification: 'Main equipment package', lines: [L('UF membrane skid, 100 m³/h', 1, 'set', 2_980_000_000, 'GS-2027-008', 'Equipment'), L('RO train 50 m³/h', 2, 'set', 1_720_000_000, 'GS-2027-008', 'Equipment')] }),
]

// ─── RFQs ─────────────────────────────────────────────────────────────────────
export type RFQStatus = 'Draft' | 'Open' | 'Evaluation' | 'Negotiation' | 'Awarded' | 'Cancelled'

export interface Quotation {
  vendorId: string
  version: number
  round: string
  submittedAt: string
  prices: number[]
  deliveryDays: number
  paymentTerms: string
  note?: string
}

export interface RFQ {
  id: string
  prId: string
  title: string
  projectCode: string
  created: string
  closing: string
  status: RFQStatus
  buyerId: string
  lines: { desc: string; qty: number; uom: string }[]
  invited: { vendorId: string; invitedAt: string; responded: boolean }[]
  excluded: { vendorId: string; reason: string }[]
  quotations: Quotation[]
  award?: { vendorId: string; at: string; by: string; justification?: string; poId?: string }
}

export const rfqs: RFQ[] = [
  {
    id: 'RFQ-2028-0047', prId: 'PR-2028-0257', title: 'Tyres 12.00R24 — DT fleet', projectCode: 'HL-2027-014.01', created: '2028-03-07', closing: '2028-03-14T17:00', status: 'Open', buyerId: 'EMP-0008',
    lines: [{ desc: 'Tyre 12.00R24 radial', qty: 18, uom: 'pcs' }, { desc: 'Inner tube & flap set', qty: 18, uom: 'set' }],
    invited: [{ vendorId: 'VND-00231', invitedAt: '2028-03-07T10:00', responded: true }, { vendorId: 'VND-00177', invitedAt: '2028-03-07T10:00', responded: true }, { vendorId: 'VND-00171', invitedAt: '2028-03-07T10:00', responded: false }],
    excluded: [{ vendorId: 'VND-00224', reason: 'Prospective · qualification incomplete' }, { vendorId: 'VND-00226', reason: 'Blocked vendor' }],
    quotations: [
      { vendorId: 'VND-00231', version: 1, round: 'Initial', submittedAt: '2028-03-09T14:22', prices: [7_150_000, 610_000], deliveryDays: 7, paymentTerms: '30 days' },
      { vendorId: 'VND-00177', version: 1, round: 'Initial', submittedAt: '2028-03-10T08:05', prices: [7_480_000, 590_000], deliveryDays: 5, paymentTerms: '30 days' },
    ],
  },
  {
    id: 'RFQ-2028-0045', prId: 'PR-2028-0255', title: 'Membrane antiscalant & CIP chemicals', projectCode: 'GS-2027-008', created: '2028-03-02', closing: '2028-03-06T17:00', status: 'Negotiation', buyerId: 'EMP-0008',
    lines: [{ desc: 'Antiscalant (phosphonate based)', qty: 2_400, uom: 'kg' }, { desc: 'CIP acid cleaner', qty: 800, uom: 'kg' }, { desc: 'CIP alkaline cleaner', qty: 800, uom: 'kg' }],
    invited: [{ vendorId: 'VND-00145', invitedAt: '2028-03-02T11:00', responded: true }, { vendorId: 'VND-00232', invitedAt: '2028-03-02T11:00', responded: true }, { vendorId: 'VND-00234', invitedAt: '2028-03-02T11:00', responded: true }],
    excluded: [],
    quotations: [
      { vendorId: 'VND-00145', version: 1, round: 'Initial', submittedAt: '2028-03-05T16:10', prices: [72_500, 44_000, 49_500], deliveryDays: 10, paymentTerms: '45 days', note: 'OEM chemistry — keeps membrane warranty valid' },
      { vendorId: 'VND-00232', version: 1, round: 'Initial', submittedAt: '2028-03-06T09:40', prices: [66_000, 45_500, 47_000], deliveryDays: 14, paymentTerms: '30 days' },
      { vendorId: 'VND-00234', version: 1, round: 'Initial', submittedAt: '2028-03-06T15:55', prices: [61_500, 39_000, 44_000], deliveryDays: 21, paymentTerms: '30 days', note: 'Generic phosphonate, compatibility letter not provided' },
      { vendorId: 'VND-00145', version: 2, round: 'Negotiation 1', submittedAt: '2028-03-08T13:20', prices: [67_800, 41_500, 46_000], deliveryDays: 10, paymentTerms: '45 days', note: 'Reduced after negotiation; warranty letter attached' },
      { vendorId: 'VND-00232', version: 2, round: 'Negotiation 1', submittedAt: '2028-03-08T15:05', prices: [64_500, 43_000, 46_500], deliveryDays: 12, paymentTerms: '30 days' },
    ],
  },
  {
    id: 'RFQ-2028-0044', prId: 'PR-2028-0253', title: 'Brake chambers & air dryers — DT fleet', projectCode: 'HL-2027-014.01', created: '2028-03-04', closing: '2028-03-07T17:00', status: 'Awarded', buyerId: 'EMP-0008',
    lines: [{ desc: 'Brake chamber type 30/30', qty: 24, uom: 'pcs' }, { desc: 'Air dryer assembly', qty: 10, uom: 'pcs' }],
    invited: [{ vendorId: 'VND-00171', invitedAt: '2028-03-04T13:00', responded: true }, { vendorId: 'VND-00177', invitedAt: '2028-03-04T13:00', responded: true }, { vendorId: 'VND-00233', invitedAt: '2028-03-04T13:00', responded: true }],
    excluded: [],
    quotations: [
      { vendorId: 'VND-00171', version: 1, round: 'Initial', submittedAt: '2028-03-06T10:30', prices: [1_450_000, 2_390_000], deliveryDays: 4, paymentTerms: '30 days' },
      { vendorId: 'VND-00177', version: 1, round: 'Initial', submittedAt: '2028-03-06T15:12', prices: [1_620_000, 2_250_000], deliveryDays: 3, paymentTerms: '30 days' },
      { vendorId: 'VND-00233', version: 1, round: 'Initial', submittedAt: '2028-03-07T09:48', prices: [1_520_000, 2_450_000], deliveryDays: 6, paymentTerms: '30 days' },
    ],
    award: { vendorId: 'VND-00171', at: '2028-03-09T10:15', by: 'EMP-0008', poId: 'PO-2028-0201' },
  },
  {
    id: 'RFQ-2028-0038', prId: 'PR-2028-0250', title: 'Rig move support crew & tail cranes — Well Pad K-7', projectCode: 'HL-2028-002', created: '2028-03-05', closing: '2028-03-05T17:00', status: 'Awarded', buyerId: 'EMP-0008',
    lines: [{ desc: 'Rig move support crew (22 loads)', qty: 1, uom: 'lot' }, { desc: 'Tail crane 50T with operator', qty: 46, uom: 'unit-day' }],
    invited: [{ vendorId: 'VND-00210', invitedAt: '2028-03-05T08:00', responded: true }, { vendorId: 'VND-00112', invitedAt: '2028-03-05T08:00', responded: true }, { vendorId: 'VND-00203', invitedAt: '2028-03-05T08:00', responded: false }],
    excluded: [{ vendorId: 'VND-00160', reason: 'Suspended · documents expired' }],
    quotations: [
      { vendorId: 'VND-00210', version: 1, round: 'Initial', submittedAt: '2028-03-05T13:30', prices: [395_000_000, 10_200_000], deliveryDays: 2, paymentTerms: '30 days' },
      { vendorId: 'VND-00112', version: 1, round: 'Initial', submittedAt: '2028-03-05T15:45', prices: [360_000_000, 10_800_000], deliveryDays: 4, paymentTerms: '30 days', note: 'Crane sub-hired from third party' },
      { vendorId: 'VND-00210', version: 2, round: 'Negotiation 1', submittedAt: '2028-03-06T09:20', prices: [385_000_000, 10_000_000], deliveryDays: 2, paymentTerms: '30 days' },
    ],
    award: { vendorId: 'VND-00210', at: '2028-03-06T11:00', by: 'EMP-0008', poId: 'PO-2028-0199' },
  },
  {
    id: 'RFQ-2028-0033', prId: 'PR-2028-0231', title: 'Haulage subcontract — March 2028 (4 DT)', projectCode: 'HL-2027-014.01', created: '2028-02-17', closing: '2028-02-22T17:00', status: 'Awarded', buyerId: 'EMP-0008',
    lines: [{ desc: 'Dump truck 40T with driver', qty: 4, uom: 'unit-month' }],
    invited: [{ vendorId: 'VND-00112', invitedAt: '2028-02-17T09:00', responded: true }, { vendorId: 'VND-00210', invitedAt: '2028-02-17T09:00', responded: true }],
    excluded: [{ vendorId: 'VND-00160', reason: 'Suspended · documents expired' }],
    quotations: [
      { vendorId: 'VND-00112', version: 1, round: 'Initial', submittedAt: '2028-02-21T10:00', prices: [298_000_000], deliveryDays: 5, paymentTerms: '30 days' },
      { vendorId: 'VND-00210', version: 1, round: 'Initial', submittedAt: '2028-02-22T11:30', prices: [312_000_000], deliveryDays: 10, paymentTerms: '30 days' },
      { vendorId: 'VND-00112', version: 2, round: 'Negotiation 1', submittedAt: '2028-02-24T14:00', prices: [295_000_000], deliveryDays: 5, paymentTerms: '30 days' },
    ],
    award: { vendorId: 'VND-00112', at: '2028-02-26T10:00', by: 'EMP-0008', poId: 'PO-2028-0187' },
  },
]

/** Latest quotation version per vendor */
export function latestQuotes(r: RFQ): Quotation[] {
  const m = new Map<string, Quotation>()
  for (const q of r.quotations) {
    const cur = m.get(q.vendorId)
    if (!cur || q.version > cur.version) m.set(q.vendorId, q)
  }
  return [...m.values()]
}
export const quoteTotal = (r: RFQ, q: Quotation) => q.prices.reduce((s, p, i) => s + p * (r.lines[i]?.qty ?? 0), 0)
export const isSealed = (r: RFQ) => r.status === 'Open' && r.closing > `${TODAY_ISO}T09:00`

// ─── Purchase orders — lines, approvals, milestones, invoices ────────────────
export interface POLine {
  desc: string
  qty: number
  uom: string
  price: number
  projectCode: string
}

export interface PODetail {
  lines: POLine[]
  deliveryTo: string
  paymentTerms: string
  milestones?: { name: string; pct: number; due: string; status: 'Paid' | 'Invoiced' | 'Due' | 'Scheduled'; evidence?: string }[]
  invoices: { id: string; loketNo: string; received: string; amount: number; match: 'Matched' | 'Exception' | 'In review' | 'Awaiting GR' }[]
}

/** Additional POs raised in Procurement (same shape as core.purchaseOrders) */
export const extraPurchaseOrders: PurchaseOrder[] = []
export const allPurchaseOrders: PurchaseOrder[] = [...purchaseOrders, ...extraPurchaseOrders]

const pl = (desc: string, qty: number, uom: string, price: number, projectCode: string): POLine => ({ desc, qty, uom, price, projectCode })

export const poDetails: Record<string, PODetail> = {
  'PO-2028-0187': { lines: [pl('Dump truck 40T with driver — March 2028', 4, 'unit-month', 295_000_000, 'HL-2027-014.01')], deliveryTo: 'Pit 3, Kutai Kartanegara', paymentTerms: '30 days after SR', invoices: [] },
  'PO-2028-0172': { lines: [pl('HSD (B40) delivered to Pit 3 fuel station', 120_000, 'L', 13_700, 'HL-2027-014.01')], deliveryTo: 'Pit 3 fuel station', paymentTerms: '14 days after GR', invoices: [{ id: 'SEK/INV/2028/0212', loketNo: 'LKT-2028-0341', received: '2028-02-28', amount: 1_644_000_000, match: 'Matched' }] },
  'PO-2028-0195': { lines: [pl('HSD (B40) delivered to Pit 3 fuel station', 125_000, 'L', 13_700, 'HL-2027-014.01')], deliveryTo: 'Pit 3 fuel station', paymentTerms: '14 days after GR', invoices: [{ id: 'SEK/INV/2028/0266', loketNo: 'LKT-2028-0402', received: '2028-03-06', amount: 616_500_000, match: 'Matched' }] },
  'PO-2028-0164': {
    lines: [pl('Catalyst handling crew (lump sum)', 1, 'lot', 1_950_000_000, 'PS-2028-003'), pl('Dense loading equipment rental', 1, 'lot', 400_000_000, 'PS-2028-003')], deliveryTo: 'Cilacap refinery, CDU/NHT', paymentTerms: 'Per milestone, 30 days',
    milestones: [
      { name: 'Mobilisation', pct: 30, due: '2028-01-25', status: 'Paid', evidence: 'SR-2028-0029 · mobilisation report' },
      { name: 'Unloading complete', pct: 40, due: '2028-02-29', status: 'Invoiced', evidence: 'SR-2028-0038 · client unloading certificate' },
      { name: 'Loading & box-up complete', pct: 30, due: '2028-04-05', status: 'Scheduled' },
    ],
    invoices: [{ id: 'KPS/2028/INV-011', loketNo: 'LKT-2028-0287', received: '2028-02-02', amount: 705_000_000, match: 'Matched' }, { id: 'KPS/2028/INV-019', loketNo: 'LKT-2028-0409', received: '2028-03-07', amount: 940_000_000, match: 'In review' }],
  },
  'PO-2028-0181': { lines: [pl('Liquid nitrogen tanker load (12 t)', 18, 'load', 27_000_000, 'PS-2028-003')], deliveryTo: 'Cilacap refinery gate 4', paymentTerms: '30 days after GR', invoices: [{ id: 'GIN/2028/0388', loketNo: 'LKT-2028-0366', received: '2028-03-01', amount: 494_100_000, match: 'Exception' }] },
  'PO-2028-0190': { lines: [pl('Scaffolding erection — reactor deck', 1, 'lot', 218_400_000, 'PS-2028-003'), pl('Scaffolding dismantle', 1, 'lot', 93_600_000, 'PS-2028-003')], deliveryTo: 'Reactor deck R-201', paymentTerms: '30 days after SR', invoices: [] },
  'PO-2027-0911': {
    lines: [pl('UF membrane skid, 100 m³/h', 1, 'set', 2_980_000_000, 'GS-2027-008'), pl('RO train 50 m³/h', 2, 'set', 1_720_000_000, 'GS-2027-008')], deliveryTo: 'Bontang site, cooling tower area', paymentTerms: 'Per milestone, 45 days',
    milestones: [
      { name: 'Down payment (against advance bond)', pct: 20, due: '2027-11-30', status: 'Paid', evidence: 'Advance payment bond MDR/APB/2027/1188' },
      { name: 'UF skid delivered', pct: 35, due: '2028-02-15', status: 'Invoiced', evidence: 'GR-2028-0071 · delivery note & FAT report' },
      { name: 'RO trains delivered', pct: 35, due: '2028-04-20', status: 'Scheduled' },
      { name: 'Commissioning support', pct: 10, due: '2028-07-31', status: 'Scheduled' },
    ],
    invoices: [{ id: 'AMT/INV/2027/1204', loketNo: 'LKT-2027-1822', received: '2027-12-04', amount: 1_284_000_000, match: 'Matched' }, { id: 'AMT/INV/2028/0219', loketNo: 'LKT-2028-0355', received: '2028-02-29', amount: 2_247_000_000, match: 'In review' }],
  },
  'PO-2028-0158': { lines: [pl('HP pump 50 m³/h, 65 bar', 4, 'unit', 212_500_000, 'GS-2027-008'), pl('VFD panel 132 kW', 4, 'unit', 103_750_000, 'GS-2027-008')], deliveryTo: 'Bontang site', paymentTerms: '45 days after GR', invoices: [] },
  'PO-2028-0199': { lines: [pl('Rig move support crew (22 loads)', 1, 'lot', 385_000_000, 'HL-2028-002'), pl('Tail crane 50T with operator', 46, 'unit-day', 10_000_000, 'HL-2028-002')], deliveryTo: 'Well Pad K-5 → K-7, Garut', paymentTerms: '30 days after SR', invoices: [] },
  'PO-2028-0176': { lines: [pl('PM kit — DT Scania P410', 6, 'kit', 18_500_000, 'GEN-BPN'), pl('PM kit — mobile crane', 2, 'kit', 32_000_000, 'GEN-BPN'), pl('PM kit — prime mover', 3, 'kit', 13_000_000, 'GEN-BPN')], deliveryTo: 'Balikpapan workshop', paymentTerms: '30 days after GR', invoices: [{ id: 'UTP/INV/2028/1178', loketNo: 'LKT-2028-0322', received: '2028-02-19', amount: 214_000_000, match: 'Matched' }] },
  'PO-2028-0183': { lines: [pl('Heavy haul road permits — Q1', 1, 'lot', 58_500_000, 'HL-2027-014.02'), pl('Police escort per trip', 19, 'trip', 2_000_000, 'HL-2027-014.02')], deliveryTo: 'Kutai Kartanegara', paymentTerms: '14 days after SR', invoices: [{ id: 'TPK/INV/2028/028', loketNo: 'LKT-2028-0372', received: '2028-03-02', amount: 96_500_000, match: 'Matched' }] },
  'PO-2028-0201': { lines: [pl('Brake chamber type 30/30', 24, 'pcs', 1_450_000, 'HL-2027-014.01'), pl('Air dryer assembly', 10, 'pcs', 2_390_000, 'HL-2027-014.01')], deliveryTo: 'Pit 3 workshop', paymentTerms: '30 days after GR', invoices: [] },
}

/** PROC-14: tiered PO approval by value */
export const poTiers = [
  { tier: 1, max: 100_000_000, label: '≤ IDR 100 m', approvers: ['Procurement Manager'] },
  { tier: 2, max: 1_000_000_000, label: '≤ IDR 1 bn', approvers: ['Procurement Manager', 'Project Manager'] },
  { tier: 3, max: 5_000_000_000, label: '≤ IDR 5 bn', approvers: ['Procurement Manager', 'Project Manager', 'Finance Director'] },
  { tier: 4, max: Number.POSITIVE_INFINITY, label: '> IDR 5 bn', approvers: ['Procurement Manager', 'Project Manager', 'Finance Director', 'CEO'] },
]
export const tierFor = (amount: number) => poTiers.find((t) => amount <= t.max)!

// ─── Goods / service receipts ─────────────────────────────────────────────────
export interface Receipt {
  id: string
  type: 'GR' | 'SR'
  poId: string
  date: string
  receivedBy: string
  location: string
  lines: { line: number; qty: number }[]
  note?: string
}

export const receipts: Receipt[] = [
  { id: 'GR-2028-0092', type: 'GR', poId: 'PO-2028-0195', date: '2028-03-09', receivedBy: 'EMP-0006', location: 'Pit 3 fuel station', lines: [{ line: 0, qty: 40_000 }], note: 'Flow-meter ticket FM-0309-02; density checked' },
  { id: 'GR-2028-0088', type: 'GR', poId: 'PO-2028-0195', date: '2028-03-04', receivedBy: 'EMP-0006', location: 'Pit 3 fuel station', lines: [{ line: 0, qty: 45_000 }] },
  { id: 'SR-2028-0041', type: 'SR', poId: 'PO-2028-0190', date: '2028-03-08', receivedBy: 'EMP-0029', location: 'Reactor deck R-201', lines: [{ line: 1, qty: 1 }], note: 'Dismantle confirmed by client HSE' },
  { id: 'SR-2028-0038', type: 'SR', poId: 'PO-2028-0164', date: '2028-03-03', receivedBy: 'EMP-0029', location: 'Cilacap CDU/NHT', lines: [{ line: 0, qty: 1 }], note: 'Crew services accepted — unloading certificate attached' },
  { id: 'SR-2028-0035', type: 'SR', poId: 'PO-2028-0190', date: '2028-02-28', receivedBy: 'EMP-0029', location: 'Reactor deck R-201', lines: [{ line: 0, qty: 1 }], note: 'Scaff-tag inspection passed' },
  { id: 'GR-2028-0083', type: 'GR', poId: 'PO-2028-0181', date: '2028-02-27', receivedBy: 'EMP-0019', location: 'Cilacap gate 4', lines: [{ line: 0, qty: 8 }] },
  { id: 'GR-2028-0074', type: 'GR', poId: 'PO-2028-0172', date: '2028-02-25', receivedBy: 'EMP-0006', location: 'Pit 3 fuel station', lines: [{ line: 0, qty: 40_000 }] },
  { id: 'GR-2028-0079', type: 'GR', poId: 'PO-2028-0181', date: '2028-02-20', receivedBy: 'EMP-0019', location: 'Cilacap gate 4', lines: [{ line: 0, qty: 10 }] },
  { id: 'SR-2028-0031', type: 'SR', poId: 'PO-2028-0183', date: '2028-02-20', receivedBy: 'EMP-0007', location: 'Kutai Kartanegara', lines: [{ line: 0, qty: 1 }, { line: 1, qty: 19 }] },
  { id: 'GR-2028-0068', type: 'GR', poId: 'PO-2028-0172', date: '2028-02-16', receivedBy: 'EMP-0006', location: 'Pit 3 fuel station', lines: [{ line: 0, qty: 40_000 }] },
  { id: 'GR-2028-0071', type: 'GR', poId: 'PO-2027-0911', date: '2028-02-12', receivedBy: 'EMP-0021', location: 'Bontang site laydown', lines: [{ line: 0, qty: 1 }], note: 'UF skid received; RO trains still at vendor FAT' },
  { id: 'GR-2028-0066', type: 'GR', poId: 'PO-2028-0176', date: '2028-02-10', receivedBy: 'EMP-0024', location: 'Balikpapan workshop', lines: [{ line: 0, qty: 6 }, { line: 1, qty: 2 }, { line: 2, qty: 3 }] },
  { id: 'GR-2028-0061', type: 'GR', poId: 'PO-2028-0172', date: '2028-02-08', receivedBy: 'EMP-0006', location: 'Pit 3 fuel station', lines: [{ line: 0, qty: 40_000 }] },
  { id: 'SR-2028-0029', type: 'SR', poId: 'PO-2028-0164', date: '2028-02-05', receivedBy: 'EMP-0029', location: 'Cilacap CDU/NHT', lines: [{ line: 1, qty: 1 }], note: 'Dense loading equipment on site & commissioned' },
]

export const receiptValue = (r: Receipt) => {
  const d = poDetails[r.poId]
  return r.lines.reduce((s, l) => s + l.qty * (d?.lines[l.line]?.price ?? 0), 0)
}

// ─── Vendor profiles (VMS) ────────────────────────────────────────────────────
export interface VendorDoc {
  type: string
  number: string
  issued: string
  expiry?: string
}

export interface VendorProfile {
  contact: string
  email: string
  phone: string
  bank: string
  since: string
  channel: 'Migrated from SAP B1' | 'Vendor portal'
  legacyCode?: string
  migrationNote?: string
  docs: VendorDoc[]
  scores: { timeliness: number; quality: number; docCompliance: number } | null
  trend: { month: string; timeliness: number; quality: number; docCompliance: number }[]
  lifecycle: { date: string; status: string; by: string; note: string }[]
}

const contacts = ['Andreas Halim', 'Siska Rahayu', 'Hendrik Sitompul', 'Lina Marlina', 'Rahmat Syah', 'Yohanes Wibowo', 'Nur Aisyah', 'Ferry Kusuma', 'Diana Puspita', 'Bayu Adi', 'Mega Sari', 'Robert Tanjung', 'Wulan Dari', 'Agung Pramono', 'Tono Sugiarto', 'Irma Susanti', 'Galih Permana', 'Citra Lestari', 'Hadi Purnomo']
const banks = ['Bank Mandiri', 'BCA', 'BNI', 'BRI', 'Bank Mandiri', 'BCA']

const addMonths = (iso: string, m: number) => {
  const d = new Date(iso + 'T00:00:00')
  d.setMonth(d.getMonth() + m)
  return d.toISOString().slice(0, 10)
}

export function docState(expiry?: string): 'Valid' | 'Expiring' | 'Expired' | 'No expiry' {
  if (!expiry) return 'No expiry'
  const d = daysUntil(expiry)
  if (d < 0) return 'Expired'
  if (d <= 60) return 'Expiring'
  return 'Valid'
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
const trendMonths = ['2027-10', '2027-11', '2027-12', '2028-01', '2028-02', '2028-03']

function buildProfile(v: Vendor, i: number): VendorProfile {
  const num = Number(v.id.slice(4))
  const migrated = num < 219
  const docTypes = ['NIB (business identification)', 'SIUJK / business licence', 'ISO 9001 certificate', 'SMK3 / CSMS certificate', 'Bank reference letter']
  const earliestIdx = i % docTypes.length
  const docs: VendorDoc[] = [
    { type: 'NPWP & PKP confirmation', number: v.npwp, issued: '2019-04-02' },
    ...docTypes.map((t, k) => ({
      type: t,
      number: `${['NIB', 'SIUJK', 'ISO', 'SMK3', 'BRL'][k]}/${v.id.slice(4)}/${2024 + (k % 3)}`,
      issued: addMonths(v.docsExpiry, -24 - k),
      expiry: k === earliestIdx ? v.docsExpiry : addMonths(v.docsExpiry, 4 + k * 3),
    })),
  ]
  const states = docs.map((d) => docState(d.expiry))
  const docCompliance = states.includes('Expired') ? 40 : states.includes('Expiring') ? 80 : 100
  let scores: VendorProfile['scores'] = null
  let trend: VendorProfile['trend'] = []
  if (v.score > 0) {
    const t = clamp(v.score + [3, -2, 5, 1, -4][i % 5])
    const q = clamp((v.score - 0.2 * docCompliance - 0.4 * t) / 0.4)
    scores = { timeliness: t, quality: q, docCompliance }
    const wig = [4, -3, 2, 5, -1, 0]
    const down = v.status === 'Suspended' || v.status === 'Blocked'
    trend = trendMonths.map((m, k) => {
      const drift = down ? (5 - k) * 6 : 0
      return {
        month: m,
        timeliness: clamp(t + drift + (k === 5 ? 0 : wig[(k + i) % 6])),
        quality: clamp(q + drift + (k === 5 ? 0 : wig[(k + i + 2) % 6])),
        docCompliance: k === 5 ? docCompliance : clamp(down && k >= 4 ? 40 : 100 - (k % 3 === 0 && i % 2 ? 20 : 0)),
      }
    })
  }
  const lifecycle: VendorProfile['lifecycle'] = []
  if (migrated) lifecycle.push({ date: '2027-05-12', status: 'Active', by: 'Data migration', note: 'Loaded from SAP B1 vendor master after cleansing (PROC-22)' })
  else lifecycle.push({ date: addMonths('2027-08-01', i % 6), status: 'Prospective', by: 'Vendor portal', note: 'Self-registration submitted with documents (PROC-02)' })
  if (!migrated && v.status !== 'Prospective') lifecycle.push({ date: addMonths('2027-08-15', i % 6), status: 'Active', by: 'Rudi Hartono', note: 'Qualification passed — vendor code issued' })
  if (v.id === 'VND-00160') lifecycle.push({ date: '2028-02-01', status: 'Suspended', by: 'System rule', note: 'Legal documents expired 31 Jan 2028 and composite score below 50 — automatically suspended' })
  if (v.id === 'VND-00226') {
    lifecycle.push({ date: '2027-11-30', status: 'Suspended', by: 'System rule', note: 'SIUJK expired; quality NCR on PO-2027-0874 (weld defects)' })
    lifecycle.push({ date: '2027-12-15', status: 'Blocked', by: 'Rudi Hartono', note: 'Blocked by Procurement committee — repeated quality failure, score 31' })
  }
  return {
    contact: contacts[i % contacts.length],
    email: `sales@${v.name.toLowerCase().replace(/^(pt|cv)\s+/, '').replace(/[^a-z]+/g, '').slice(0, 14)}.co.id`,
    phone: `+62 ${['21', '542', '541', '282', '31'][i % 5]} ${7000 + num * 13}`,
    bank: `${banks[i % banks.length]} · ${String(1_000_000_000 + num * 7_919_311).slice(0, 10)}`,
    since: migrated ? addMonths('2019-03-01', i * 5) : lifecycle[0].date,
    channel: migrated ? 'Migrated from SAP B1' : 'Vendor portal',
    legacyCode: migrated ? `V-${10_000 + num * 7}` : undefined,
    migrationNote: migrated ? (i % 3 === 0 ? 'NPWP reformatted to 15-digit; two duplicate SAP records merged' : 'Bank account validated; address normalised') : undefined,
    docs,
    scores,
    trend,
    lifecycle,
  }
}

export const vendorProfiles: Record<string, VendorProfile> = Object.fromEntries(allVendors.map((v, i) => [v.id, buildProfile(v, i)]))

export const compositeScore = (s: { timeliness: number; quality: number; docCompliance: number }) => Math.round(0.4 * s.timeliness + 0.4 * s.quality + 0.2 * s.docCompliance)

/** Vendor portal self-registrations awaiting qualification (PROC-02, PROC-03) */
export interface Registration {
  id: string
  name: string
  category: string
  city: string
  npwp: string
  submitted: string
  docsUploaded: number
  docsRequired: number
  status: 'Submitted' | 'Under review' | 'Duplicate NPWP' | 'Approved'
  vendorId?: string
}

export const registrations: Registration[] = [
  { id: 'REG-2028-0048', name: 'PT Enviro Lab Kalimantan', category: 'Laboratory testing', city: 'Balikpapan', npwp: '80.221.009.1-721.000', submitted: '2028-03-09', docsUploaded: 6, docsRequired: 6, status: 'Submitted' },
  { id: 'REG-2028-0047', name: 'PT Lintas Lowbed Nusantara', category: 'Heavy haulage subcontractor', city: 'Samarinda', npwp: '80.221.010.2-722.000', submitted: '2028-03-09', docsUploaded: 6, docsRequired: 6, status: 'Submitted' },
  { id: 'REG-2028-0045', name: 'CV Borneo Trans Mandiri Jaya', category: 'Haulage subcontractor', city: 'Samarinda', npwp: '71.234.001.1-722.000', submitted: '2028-03-07', docsUploaded: 5, docsRequired: 6, status: 'Duplicate NPWP' },
  { id: 'REG-2028-0044', name: 'PT Sinar Rigging Indonesia', category: 'Lifting gear & slings', city: 'Surabaya', npwp: '79.100.221.4-609.000', submitted: '2028-03-06', docsUploaded: 5, docsRequired: 6, status: 'Under review' },
  { id: 'REG-2028-0041', name: 'PT Ban Mulia Sentosa', category: 'Tyres', city: 'Balikpapan', npwp: '77.888.101.4-721.000', submitted: '2028-03-02', docsUploaded: 6, docsRequired: 6, status: 'Approved', vendorId: 'VND-00224' },
]

/** Next vendor code in the configured pattern VND-nnnnn (PROC-03) */
export const nextVendorCode = (taken: string[]) => {
  const max = Math.max(...taken.map((id) => Number(id.slice(4))))
  return `VND-${String(max + 1).padStart(5, '0')}`
}
