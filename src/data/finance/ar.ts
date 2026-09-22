/**
 * M10 Accounts Receivable & Billing — verified work → proforma (FAT-20) → client approval →
 * Surat Konversi (FAT-15) → AR invoice at the rate card effective on the work date (FAT-14),
 * Surat Konversi vs invoice reconciliation (FAT-16), receivables, retention and collections.
 */
import { getContract, jobs, type RateBasis } from '@/data/core'

export function rateOnDate(contractId: string, item: string, workDate: string) {
  const c = getContract(contractId)
  const cands = (c?.rateCard ?? []).filter((r) => r.item === item && r.effectiveFrom <= workDate).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
  return cands[0]
}

export interface BillingLine {
  description: string
  rateItem: string
  workDate: string
  qty: number
  basis: RateBasis
  rate: number
  rateEffective: string
  sourceRef: string
}

export type BillingStage = 'Proforma draft' | 'Awaiting client approval' | 'Client approved' | 'Surat Konversi issued' | 'Invoiced'
export const billingStages: BillingStage[] = ['Proforma draft', 'Awaiting client approval', 'Client approved', 'Surat Konversi issued', 'Invoiced']

export interface BillingDoc {
  proformaNo: string
  customerId: string
  contractId: string
  projectCode: string
  title: string
  stage: BillingStage
  proformaDate: string
  clientApprovedAt?: string
  clientApprover?: string
  skNo?: string
  skDate?: string
  invoiceNo?: string
  invoiceDate?: string
  /** Invoice value when it differs from the Surat Konversi (reconciliation variance) */
  invoiceAmount?: number
  lines: BillingLine[]
  preparedBy: string
}

const ln = (contractId: string, rateItem: string, description: string, workDate: string, qty: number, sourceRef: string): BillingLine => {
  const r = rateOnDate(contractId, rateItem, workDate)
  return { description, rateItem, workDate, qty, basis: r?.basis ?? 'lump sum', rate: r?.rate ?? 0, rateEffective: r?.effectiveFrom ?? workDate, sourceRef }
}

export const billingDocs: BillingDoc[] = [
  {
    proformaNo: 'PF-2028-03-0010', customerId: 'CUS-001', contractId: 'CTR-2027-011', projectCode: 'HL-2027-014.01', title: 'Late-verified hauling tickets — 28 Dec 2027', stage: 'Proforma draft', proformaDate: '2028-03-10', preparedBy: 'EMP-0022',
    lines: [ln('CTR-2027-011', 'Coal hauling, pit to port (≤ 42 km)', 'Coal hauling — 58 weighbridge tickets verified 07 Mar (work date 28 Dec 2027)', '2027-12-28', 2_140, 'JO-27-12-0587')],
  },
  {
    proformaNo: 'PF-2028-03-0009', customerId: 'CUS-003', contractId: 'CTR-2027-016', projectCode: 'HL-2027-021', title: 'Crane 200T hours — week 10', stage: 'Proforma draft', proformaDate: '2028-03-09', preparedBy: 'EMP-0022',
    lines: [ln('CTR-2027-016', 'Crane 200T with operator & rigger', 'Crane 200T with operator & rigger — 01–07 Mar (timesheets TS-HL021-W10)', '2028-03-07', 52, 'TS-HL021-W10')],
  },
  {
    proformaNo: 'PF-2028-03-0008', customerId: 'CUS-001', contractId: 'CTR-2027-011', projectCode: 'HL-2027-014.01', title: 'Coal hauling 01–06 Mar 2028', stage: 'Awaiting client approval', proformaDate: '2028-03-08', preparedBy: 'EMP-0022',
    lines: [
      ln('CTR-2027-011', 'Coal hauling, pit to port (≤ 42 km)', 'Coal hauling — 22 job orders, 01–03 Mar', '2028-03-03', 5_720, 'JO-28-03-0301…0344'),
      ln('CTR-2027-011', 'Coal hauling, pit to port (≤ 42 km)', 'Coal hauling — 19 job orders, 04–06 Mar', '2028-03-06', 5_920, 'JO-28-03-0346…0371'),
    ],
  },
  {
    proformaNo: 'PF-2028-03-0006', customerId: 'CUS-002', contractId: 'CTR-2027-019', projectCode: 'PS-2028-003', title: 'Catalyst change-out — progress milestone 2 (30%)', stage: 'Client approved', proformaDate: '2028-03-05', clientApprovedAt: '2028-03-08T16:20', clientApprover: 'Ir. Wisnu Hadi (Client B, TA Manager)', preparedBy: 'EMP-0022',
    lines: [{ ...ln('CTR-2027-019', 'Catalyst unloading & loading (lump sum)', 'Milestone 2 — R-101/R-201 unloading complete (30% of lump sum)', '2028-03-04', 0.3, 'MS-PS003-02'), qty: 0.3 }],
  },
  {
    proformaNo: 'PF-2028-03-0003', customerId: 'CUS-005', contractId: 'CTR-2028-002', projectCode: 'HL-2028-002', title: 'Lowbed trips — loads 1–5', stage: 'Surat Konversi issued', proformaDate: '2028-02-29', clientApprovedAt: '2028-03-02T11:05', clientApprover: 'Dimas Aryo (Client E, Drilling Superintendent)', skNo: 'SK-2028-03-0003', skDate: '2028-03-03', preparedBy: 'EMP-0022',
    lines: [ln('CTR-2028-002', 'Lowbed trip, Garut area', 'Lowbed trips, Well Pad K-5 → K-7 — loads 1–5', '2028-03-01', 5, 'JO-28-02-0351…0364')],
  },
  {
    proformaNo: 'PF-2028-02-0023', customerId: 'CUS-002', contractId: 'CTR-2027-019', projectCode: 'PS-2028-003', title: 'Additional technicians — 16–29 Feb', stage: 'Surat Konversi issued', proformaDate: '2028-02-20', clientApprovedAt: '2028-02-23T09:40', clientApprover: 'Ir. Wisnu Hadi (Client B, TA Manager)', skNo: 'SK-2028-02-0027', skDate: '2028-02-24', preparedBy: 'EMP-0022',
    lines: [ln('CTR-2027-019', 'Additional technician', 'Additional catalyst technicians — 46 man-days (timesheets TS-PS003-W07/W08)', '2028-02-22', 46, 'TS-PS003-W07/W08')],
  },
  {
    proformaNo: 'PF-2028-02-0022', customerId: 'CUS-001', contractId: 'CTR-2027-011', projectCode: 'HL-2027-014.02', title: 'Client-caused standby — crusher CV-2 delay', stage: 'Surat Konversi issued', proformaDate: '2028-02-18', clientApprovedAt: '2028-02-21T14:15', clientApprover: 'Hartono Lim (Client A, Mine Ops Manager)', skNo: 'SK-2028-02-0026', skDate: '2028-02-22', preparedBy: 'EMP-0022',
    lines: [ln('CTR-2027-011', 'Standby (client-caused)', 'Standby — crane & crew awaiting crusher access, 12–16 Feb', '2028-02-16', 38, 'TS-HL014-W07')],
  },
  {
    proformaNo: 'PF-2028-02-0020', customerId: 'CUS-003', contractId: 'CTR-2027-016', projectCode: 'HL-2027-021', title: 'Crane 200T hours — February', stage: 'Surat Konversi issued', proformaDate: '2028-02-15', clientApprovedAt: '2028-02-18T10:30', clientApprover: 'Rini Susanti (Client C, Project Controls)', skNo: 'SK-2028-02-0024', skDate: '2028-02-19', preparedBy: 'EMP-0022',
    lines: [ln('CTR-2027-016', 'Crane 200T with operator & rigger', 'Crane 200T with operator & rigger — 01–14 Feb', '2028-02-14', 164, 'TS-HL021-W05…W07')],
  },
  {
    proformaNo: 'PF-2028-03-0004', customerId: 'CUS-003', contractId: 'CTR-2027-016', projectCode: 'HL-2027-021', title: 'Module M-13 SPMT transport & set', stage: 'Invoiced', proformaDate: '2028-02-28', clientApprovedAt: '2028-03-01T15:00', clientApprover: 'Rini Susanti (Client C, Project Controls)', skNo: 'SK-2028-03-0005', skDate: '2028-03-02', invoiceNo: 'INV-2028-03-0005', invoiceDate: '2028-03-04', preparedBy: 'EMP-0022',
    lines: [ln('CTR-2027-016', 'SPMT module move', 'SPMT module move — M-13, Laydown Yard B → Train 2', '2028-02-27', 1, 'JO-28-02-0297')],
  },
  {
    proformaNo: 'PF-2028-02-0024', customerId: 'CUS-005', contractId: 'CTR-2028-002', projectCode: 'HL-2028-002', title: 'Rig move — progress 30%', stage: 'Invoiced', proformaDate: '2028-02-26', clientApprovedAt: '2028-02-28T13:10', clientApprover: 'Dimas Aryo (Client E, Drilling Superintendent)', skNo: 'SK-2028-03-0001', skDate: '2028-03-01', invoiceNo: 'INV-2028-03-0004', invoiceDate: '2028-03-02', preparedBy: 'EMP-0022',
    lines: [{ ...ln('CTR-2028-002', 'Rig move (complete)', 'Rig move — progress milestone 30%', '2028-02-29', 0.3, 'MS-HL002-01'), qty: 0.3 }],
  },
  {
    proformaNo: 'PF-2028-02-0018', customerId: 'CUS-001', contractId: 'CTR-2027-011', projectCode: 'HL-2027-014.01', title: 'Coal hauling — February batch 4', stage: 'Invoiced', proformaDate: '2028-02-22', clientApprovedAt: '2028-02-24T08:50', clientApprover: 'Hartono Lim (Client A, Mine Ops Manager)', skNo: 'SK-2028-02-0021', skDate: '2028-02-25', invoiceNo: 'INV-2028-02-0014', invoiceDate: '2028-02-26', preparedBy: 'EMP-0022',
    lines: [ln('CTR-2027-011', 'Coal hauling, pit to port (≤ 42 km)', 'Coal hauling — February batch 4', '2028-02-26', 12_480, 'JO-28-02-0288')],
  },
  {
    proformaNo: 'PF-2028-02-0016', customerId: 'CUS-002', contractId: 'CTR-2027-019', projectCode: 'PS-2028-003', title: 'Nitrogen purge standby — reactor R-101', stage: 'Invoiced', proformaDate: '2028-02-09', clientApprovedAt: '2028-02-11T10:00', clientApprover: 'Ir. Wisnu Hadi (Client B, TA Manager)', skNo: 'SK-2028-02-0019', skDate: '2028-02-12', invoiceNo: 'INV-2028-02-0012', invoiceDate: '2028-02-15', invoiceAmount: 84_100_000, preparedBy: 'EMP-0022',
    lines: [ln('CTR-2027-019', 'Nitrogen purge standby', 'Nitrogen purge standby — 62 hours per signed log', '2028-02-08', 62, 'TS-PS003-W05')],
  },
]

export const lineAmount = (l: BillingLine) => Math.round(l.qty * l.rate)
export const docAmount = (d: BillingDoc) => d.lines.reduce((s, l) => s + lineAmount(l), 0)
export const getBillingDocBySk = (sk: string) => billingDocs.find((d) => d.skNo === sk)

/** Verified work not yet on a proforma (billing pipeline) */
export interface BillableItem {
  id: string
  kind: 'Job' | 'Timesheet batch'
  ref: string
  projectCode: string
  contractId: string
  customerId: string
  rateItem: string
  description: string
  workDate: string
  qty: number
  verifiedBy: string
  verifiedAt: string
}

const verifiedJobs: BillableItem[] = jobs
  .filter((j) => j.status === 'Verified')
  .map((j) => {
    const contractId = j.projectCode.startsWith('HL-2027-014') ? 'CTR-2027-011' : j.projectCode === 'HL-2027-021' ? 'CTR-2027-016' : j.projectCode === 'HL-2028-002' ? 'CTR-2028-002' : 'CTR-2027-019'
    const c = getContract(contractId)
    const item = c?.rateCard.find((r) => r.basis === j.basis)?.item ?? ''
    return { id: `BI-${j.id}`, kind: 'Job' as const, ref: j.id, projectCode: j.projectCode, contractId, customerId: c?.customerId ?? '', rateItem: item, description: j.title, workDate: j.date, qty: j.qty, verifiedBy: 'EMP-0007', verifiedAt: `${j.date}T18:30` }
  })

export const billableItems: BillableItem[] = [
  ...verifiedJobs,
  { id: 'BI-TS-PS003-W10', kind: 'Timesheet batch', ref: 'TS-PS003-W10', projectCode: 'PS-2028-003', contractId: 'CTR-2027-019', customerId: 'CUS-002', rateItem: 'Additional technician', description: 'Additional catalyst technicians — 01–07 Mar (verified timesheets)', workDate: '2028-03-07', qty: 18, verifiedBy: 'EMP-0029', verifiedAt: '2028-03-08T17:05' },
  { id: 'BI-TS-PS003-N2', kind: 'Timesheet batch', ref: 'TS-PS003-N2-W10', projectCode: 'PS-2028-003', contractId: 'CTR-2027-019', customerId: 'CUS-002', rateItem: 'Nitrogen purge standby', description: 'Nitrogen purge standby — R-201, 9 hours per signed log', workDate: '2028-03-06', qty: 9, verifiedBy: 'EMP-0029', verifiedAt: '2028-03-07T08:40' },
  { id: 'BI-TS-HL014-W10', kind: 'Timesheet batch', ref: 'TS-HL014-W10', projectCode: 'HL-2027-014.02', contractId: 'CTR-2027-011', customerId: 'CUS-001', rateItem: 'Crane 100T with operator', description: 'Crane 100T with operator — conveyor prep lifts, 01–07 Mar', workDate: '2028-03-07', qty: 26, verifiedBy: 'EMP-0006', verifiedAt: '2028-03-08T07:55' },
]

export const billableAmount = (b: BillableItem) => {
  const r = rateOnDate(b.contractId, b.rateItem, b.workDate)
  return { rate: r?.rate ?? 0, effectiveFrom: r?.effectiveFrom ?? b.workDate, basis: r?.basis ?? 'lump sum', amount: Math.round((r?.rate ?? 0) * b.qty) }
}

// ─── AR invoices & ageing ─────────────────────────────────────────────────────
export interface ArInvoice {
  id: string
  customerId: string
  projectCode: string
  contractId: string
  date: string
  dueDate: string
  dpp: number
  ppn: number
  retentionPct: number
  /** Amount received (cash + PPh 23 withheld) */
  received: number
  skNo?: string
  fakturNo: string
  description: string
  migrated?: boolean
  collection?: { at: string; by: string; action: string }[]
}

export const arInvoices: ArInvoice[] = [
  { id: 'INV-2028-03-0005', customerId: 'CUS-003', projectCode: 'HL-2027-021', contractId: 'CTR-2027-016', date: '2028-03-04', dueDate: '2028-04-03', dpp: 285_000_000, ppn: 31_350_000, retentionPct: 5, received: 0, skNo: 'SK-2028-03-0005', fakturNo: '010.028-28.00041188', description: 'Module M-13 SPMT transport & set' },
  { id: 'INV-2028-03-0004', customerId: 'CUS-005', projectCode: 'HL-2028-002', contractId: 'CTR-2028-002', date: '2028-03-02', dueDate: '2028-04-01', dpp: 1_260_000_000, ppn: 138_600_000, retentionPct: 5, received: 0, skNo: 'SK-2028-03-0001', fakturNo: '010.028-28.00041171', description: 'Rig move — progress milestone 30%' },
  { id: 'INV-2028-02-0014', customerId: 'CUS-001', projectCode: 'HL-2027-014.01', contractId: 'CTR-2027-011', date: '2028-02-26', dueDate: '2028-03-27', dpp: 605_280_000, ppn: 66_580_800, retentionPct: 0, received: 671_860_800, skNo: 'SK-2028-02-0021', fakturNo: '010.028-28.00041127', description: 'Coal hauling — February batch 4' },
  { id: 'INV-2028-02-0012', customerId: 'CUS-002', projectCode: 'PS-2028-003', contractId: 'CTR-2027-019', date: '2028-02-15', dueDate: '2028-03-31', dpp: 84_100_000, ppn: 9_251_000, retentionPct: 10, received: 0, skNo: 'SK-2028-02-0019', fakturNo: '010.028-28.00041092', description: 'Nitrogen purge standby — reactor R-101' },
  { id: 'INV-2028-02-0009', customerId: 'CUS-003', projectCode: 'HL-2027-021', contractId: 'CTR-2027-016', date: '2028-02-10', dueDate: '2028-03-11', dpp: 911_800_000, ppn: 100_298_000, retentionPct: 5, received: 0, skNo: 'SK-2028-02-0011', fakturNo: '010.028-28.00041066', description: 'Crane 200T hours — January (188 h)', collection: [{ at: '2028-03-06', by: 'EMP-0022', action: 'Reminder sent 5 days before due date' }] },
  { id: 'INV-2028-02-0004', customerId: 'CUS-002', projectCode: 'PS-2028-003', contractId: 'CTR-2027-019', date: '2028-02-05', dueDate: '2028-03-21', dpp: 3_840_000_000, ppn: 422_400_000, retentionPct: 10, received: 0, skNo: 'SK-2028-02-0006', fakturNo: '010.028-28.00041031', description: 'Catalyst change-out — milestone 1 (40%)' },
  { id: 'INV-2028-01-0007', customerId: 'CUS-001', projectCode: 'HL-2027-014.01', contractId: 'CTR-2027-011', date: '2028-01-31', dueDate: '2028-03-01', dpp: 3_412_000_000, ppn: 375_320_000, retentionPct: 0, received: 3_787_320_000, skNo: 'SK-2028-01-0015', fakturNo: '010.028-28.00040987', description: 'Coal hauling — January (70,350 t)' },
  { id: 'INV-2028-01-0003', customerId: 'CUS-006', projectCode: 'GS-2027-008', contractId: 'CTR-2027-014', date: '2028-01-22', dueDate: '2028-03-07', dpp: 2_140_000_000, ppn: 235_400_000, retentionPct: 10, received: 0, skNo: 'SK-2028-01-0009', fakturNo: '010.028-28.00040952', description: 'Engineering & design milestone (100%)', collection: [{ at: '2028-03-01', by: 'EMP-0022', action: 'Reminder e-mailed to AP Nusantara Fertilizer' }, { at: '2028-03-08', by: 'EMP-0022', action: 'Call — invoice in client approval workflow, promise to pay 15 Mar' }] },
  { id: 'INV-2027-12-0041', customerId: 'CUS-007', projectCode: 'PS-2027-017', contractId: 'CTR-2027-009', date: '2027-12-22', dueDate: '2028-01-21', dpp: 1_905_000_000, ppn: 209_550_000, retentionPct: 5, received: 0, fakturNo: '010.027-27.00038841', description: 'Boiler overhaul — final 30% (migrated open item, CUT-01)', migrated: true, collection: [{ at: '2028-01-25', by: 'EMP-0022', action: 'First reminder' }, { at: '2028-02-12', by: 'EMP-0022', action: 'Escalated to Selat Power finance manager' }, { at: '2028-03-04', by: 'EMP-0002', action: 'Meeting — client disputes 2 punch-list items; partial payment proposed' }] },
  { id: 'INV-2027-11-0033', customerId: 'CUS-001', projectCode: 'HL-2027-014.01', contractId: 'CTR-2027-011', date: '2027-11-30', dueDate: '2027-12-30', dpp: 2_860_000_000, ppn: 314_600_000, retentionPct: 0, received: 2_000_000_000, fakturNo: '010.027-27.00038602', description: 'Coal hauling — November (migrated open item, CUT-01)', migrated: true, collection: [{ at: '2028-01-10', by: 'EMP-0022', action: 'Balance confirmed by client — tonnage dispute on 3 days' }, { at: '2028-02-20', by: 'EMP-0022', action: 'Weighbridge reconciliation sent' }] },
]

export const arGross = (i: ArInvoice) => i.dpp + i.ppn
export const arRetention = (i: ArInvoice) => Math.round((i.dpp * i.retentionPct) / 100)
export const arOutstanding = (i: ArInvoice) => Math.max(0, arGross(i) - arRetention(i) - i.received)
export const getArInvoice = (id?: string) => arInvoices.find((i) => i.id === id)

export interface RetentionRow {
  contractId: string
  billed: number
  retained: number
  released: number
  releaseCondition: string
  releaseDate: string
}

export const retentions: RetentionRow[] = [
  { contractId: 'CTR-2027-011', billed: 17_920_000_000, retained: 896_000_000, released: 0, releaseCondition: 'End of contract + 90 days', releaseDate: '2029-03-31' },
  { contractId: 'CTR-2027-019', billed: 8_960_000_000, retained: 896_000_000, released: 0, releaseCondition: 'Mechanical completion certificate', releaseDate: '2028-05-15' },
  { contractId: 'CTR-2027-014', billed: 8_980_000_000, retained: 898_000_000, released: 0, releaseCondition: 'Performance test + 12-month warranty', releaseDate: '2029-08-31' },
  { contractId: 'CTR-2027-016', billed: 9_120_000_000, retained: 456_000_000, released: 0, releaseCondition: 'Final handover certificate', releaseDate: '2028-04-30' },
  { contractId: 'CTR-2027-009', billed: 6_350_000_000, retained: 317_500_000, released: 0, releaseCondition: 'Warranty period 6 months', releaseDate: '2028-06-20' },
  { contractId: 'CTR-2028-002', billed: 1_580_000_000, retained: 79_000_000, released: 0, releaseCondition: 'Rig accepted at K-7', releaseDate: '2028-07-31' },
]
