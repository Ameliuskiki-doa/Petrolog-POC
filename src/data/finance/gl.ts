/**
 * M8 General Ledger — journals. Every line carries four dimensions (account, cost centre, project code,
 * business line — §3.4.1). Journals are immutable once posted; corrections are made by reversing entry only.
 */
import { getProject, purchaseOrders, vendors, type BusinessLine } from '@/data/core'
import { accounts, blForProject, ccForProject } from './common'
import { allocationFor, assetClassAccount, fixedAssets } from './assets'

export type SourceType =
  | 'AP Invoice'
  | 'AR Invoice'
  | 'Goods Receipt'
  | 'Payment Run'
  | 'Customer Receipt'
  | 'Payroll'
  | 'Depreciation Run'
  | 'GEN Allocation'
  | 'Fuel Actualisation'
  | 'Accrual'
  | 'Prepaid Amortisation'
  | 'Bank Statement'
  | 'Tax Payment'
  | 'Inventory Issue'
  | 'Late Cost'
  | 'Manual Journal'
  | 'Reversal'
  | 'Opening Balance'

export const sourceTypes: SourceType[] = [
  'AP Invoice', 'AR Invoice', 'Goods Receipt', 'Payment Run', 'Customer Receipt', 'Payroll', 'Depreciation Run', 'GEN Allocation',
  'Fuel Actualisation', 'Accrual', 'Prepaid Amortisation', 'Bank Statement', 'Tax Payment', 'Inventory Issue', 'Late Cost', 'Manual Journal', 'Reversal', 'Opening Balance',
]

export interface JournalLine {
  account: string
  costCentre: string
  projectCode: string
  businessLine: BusinessLine
  debit: number
  credit: number
  memo: string
}

export interface TraceLink {
  kind: string
  ref: string
  to?: string
}

export interface Journal {
  id: string
  date: string
  period: string
  status: 'Posted' | 'Pending Approval' | 'Draft' | 'Reversed'
  sourceType: SourceType
  /** Structured narrative: fixed fields rendered in a fixed order (FAT-31) */
  narrative: { label: string; value: string }[]
  /** Primary source document first */
  trace: TraceLink[]
  createdBy: string
  approvedBy?: string
  postedAt?: string
  auto: boolean
  reversalOf?: string
  reversedBy?: string
  correctedBy?: string
  /** Controlled reopening: the period the cost belongs to when it differs from the posting period */
  attributionPeriod?: string
  lines: JournalLine[]
}

const L = (account: string, projectCode: string, debit: number, credit: number, memo: string, costCentre?: string): JournalLine => ({
  account,
  projectCode,
  costCentre: costCentre ?? ccForProject(projectCode),
  businessLine: blForProject(projectCode),
  debit,
  credit,
  memo,
})

export const narrativeText = (j: Pick<Journal, 'narrative'>) => j.narrative.map((n) => n.value).join(' · ')
export const journalTotal = (j: Pick<Journal, 'lines'>) => j.lines.reduce((s, l) => s + l.debit, 0)
export const journalProjects = (j: Pick<Journal, 'lines'>) => [...new Set(j.lines.map((l) => l.projectCode))]

const loket = (id: string): TraceLink => ({ kind: 'Loket Invoice', ref: id, to: `/finance/loket?open=${id}` })
const po = (id: string): TraceLink => ({ kind: 'Purchase Order', ref: id, to: `/procurement/orders/${id}` })
const vendor = (id: string): TraceLink => ({ kind: 'Vendor', ref: vendors.find((v) => v.id === id)?.name ?? id, to: `/vendors/${id}` })
const project = (code: string): TraceLink => ({ kind: 'Project', ref: code, to: `/projects/${code}` })
const jv = (id: string, kind = 'Journal'): TraceLink => ({ kind, ref: id, to: `/finance/gl/${id}` })
const arInv = (id: string): TraceLink => ({ kind: 'AR Invoice', ref: id, to: `/finance/ar?open=${id}` })
const sk = (id: string): TraceLink => ({ kind: 'Surat Konversi', ref: id, to: `/finance/billing/reconciliation?q=${id}` })

// ─── Opening balance journal (CUT-01) ─────────────────────────────────────────
const openingLines: JournalLine[] = accounts
  .filter((a) => a.posting && a.opening)
  .map((a) => {
    const v = a.opening ?? 0
    const debitSide = a.cls === 'Asset'
    const dr = debitSide ? Math.max(0, v) : Math.max(0, -v)
    const cr = debitSide ? Math.max(0, -v) : Math.max(0, v)
    return L(a.code, 'GEN-HO', dr, cr, `Migrated balance — SAP B1 account ${a.sapCode ?? '—'}`, 'CC-110')
  })

// ─── Depreciation run Feb 2028 (derived from the asset register & unit hours) ─
function depreciationLines(): JournalLine[] {
  const rows = allocationFor('2028-02')
  const dr = new Map<string, number>()
  const cr = new Map<string, number>()
  for (const r of rows) {
    const a = fixedAssets.find((x) => x.id === r.assetId)!
    const acc = assetClassAccount[a.cls]
    for (const s of r.split) dr.set(`${acc.expense}|${s.projectCode}`, (dr.get(`${acc.expense}|${s.projectCode}`) ?? 0) + s.amount)
    if (r.unabsorbed) dr.set(`${acc.expense}|GEN-BPN|idle`, (dr.get(`${acc.expense}|GEN-BPN|idle`) ?? 0) + r.unabsorbed)
    cr.set(acc.accum, (cr.get(acc.accum) ?? 0) + r.monthly)
  }
  const lines: JournalLine[] = []
  for (const [k, v] of dr) {
    const [acct, pc, idle] = k.split('|')
    lines.push(L(acct, pc, v, 0, idle ? 'Idle capacity — not charged to projects (FAT-26)' : acct === '5104' ? 'Operating-hours share, Feb 2028' : 'Straight-line charge'))
  }
  for (const [k, v] of cr) lines.push(L(k, 'GEN-BPN', 0, v, 'Accumulated depreciation', 'CC-110'))
  return lines
}

const e = (id: string) => `EMP-${id}`

export const journals: Journal[] = [
  {
    id: 'JV-2028-01-0001', date: '2028-01-01', period: '2028-01', status: 'Posted', sourceType: 'Opening Balance', auto: true,
    narrative: [{ label: 'Source', value: 'Opening balance' }, { label: 'Reference', value: 'CUT-01 · SAP B1 trial balance 31 Dec 2027' }, { label: 'Description', value: 'Migrated opening balances, reconciled and signed before cut-over' }],
    trace: [{ kind: 'Migration pack', ref: 'CUT-01 · TB-SAPB1-20271231', to: '/finance/close' }, { kind: 'Archive', ref: 'SAP B1 JE 2027/12 (read-only)' }],
    createdBy: e('0028'), approvedBy: e('0002'), postedAt: '2028-01-02T07:40', lines: openingLines,
  },
  {
    id: 'JV-2028-02-0037', date: '2028-02-26', period: '2028-02', status: 'Posted', sourceType: 'AR Invoice', auto: true,
    narrative: [{ label: 'Source', value: 'AR invoice INV-2028-02-0014' }, { label: 'Counterparty', value: 'Borneo Coal Mining (Client A)' }, { label: 'Project', value: 'HL-2027-014.01' }, { label: 'Description', value: 'Coal hauling Feb batch 4 — 12,480 t × IDR 48,500' }],
    trace: [arInv('INV-2028-02-0014'), sk('SK-2028-02-0021'), { kind: 'Job', ref: 'JO-28-02-0288', to: '/ops/jobs/JO-28-02-0288' }, { kind: 'Contract', ref: 'CTR-2027-011', to: '/contracts/CTR-2027-011' }],
    createdBy: e('0022'), approvedBy: e('0028'), postedAt: '2028-02-26T15:12',
    lines: [
      L('1103.01', 'HL-2027-014.01', 671_860_800, 0, 'Receivable incl. PPN'),
      L('1103.03', 'HL-2027-014.01', 0, 605_280_000, 'Clear unbilled revenue — SK-2028-02-0021'),
      L('2104.01', 'HL-2027-014.01', 0, 66_580_800, 'PPN output 11% — e-Faktur 010.028-28.00041127'),
    ],
  },
  {
    id: 'JV-2028-02-0041', date: '2028-02-29', period: '2028-02', status: 'Reversed', sourceType: 'Accrual', auto: false, reversedBy: 'JV-2028-03-0001',
    narrative: [{ label: 'Source', value: 'Month-end accrual' }, { label: 'Counterparty', value: 'CV Borneo Trans Mandiri' }, { label: 'Project', value: 'HL-2027-014.01' }, { label: 'Description', value: 'Haulage subcontract 22–29 Feb delivered, not yet invoiced (auto-reverse 01 Mar)' }],
    trace: [{ kind: 'Close task', ref: 'Feb 2028 · Accruals', to: '/finance/close' }, vendor('VND-00112'), project('HL-2027-014.01')],
    createdBy: e('0028'), approvedBy: e('0002'), postedAt: '2028-03-02T10:05',
    lines: [L('5102', 'HL-2027-014.01', 412_000_000, 0, '8,480 t × IDR 48,585 subcontract rate'), L('2103.02', 'HL-2027-014.01', 0, 412_000_000, 'Accrued subcontract')],
  },
  {
    id: 'JV-2028-02-0048', date: '2028-02-29', period: '2028-02', status: 'Posted', sourceType: 'Fuel Actualisation', auto: true,
    narrative: [{ label: 'Source', value: 'Fuel actualisation Feb 2028' }, { label: 'Reference', value: 'FA-2028-02' }, { label: 'Description', value: 'Estimate vs supplier actual — variances posted to consuming project codes (FAT-24)' }],
    trace: [{ kind: 'Fuel actualisation', ref: 'FA-2028-02', to: '/costing/fuel-actualisation' }, po('PO-2028-0172')],
    createdBy: 'SYSTEM', approvedBy: e('0028'), postedAt: '2028-03-03T08:30',
    lines: [
      L('5101', 'HL-2027-014.01', 38_400_000, 0, 'Actual 3.2% above dipstick estimate'),
      L('5101', 'HL-2027-014.02', 5_100_000, 0, 'Actual above estimate'),
      L('5101', 'HL-2028-002', 6_200_000, 0, 'Actual above estimate'),
      L('5101', 'PS-2028-003', 0, 2_300_000, 'Actual below estimate'),
      L('1104.02', 'GEN-BPN', 0, 47_400_000, 'Site tank stock adjustment'),
    ],
  },
  {
    id: 'JV-2028-02-0050', date: '2028-02-29', period: '2028-02', status: 'Posted', sourceType: 'Prepaid Amortisation', auto: true,
    narrative: [{ label: 'Source', value: 'Prepaid amortisation schedule' }, { label: 'Reference', value: 'PPA-2028-02' }, { label: 'Description', value: 'Insurance and SILO/KIR certificate fees — Feb 2028 instalment' }],
    trace: [{ kind: 'Close task', ref: 'Feb 2028 · Prepaid amortisation', to: '/finance/close' }],
    createdBy: 'SYSTEM', approvedBy: e('0028'), postedAt: '2028-03-02T08:00',
    lines: [
      L('6107', 'GEN-HO', 58_000_000, 0, 'Corporate & D&O policy'),
      L('6107', 'GEN-BPN', 133_000_000, 0, 'Fleet all-risk policy'),
      L('6108', 'GEN-BPN', 14_000_000, 0, 'SILO / KIR certificate fees'),
      L('1105.01', 'GEN-HO', 0, 191_000_000, 'Prepaid insurance'),
      L('1105.02', 'GEN-BPN', 0, 14_000_000, 'Prepaid certification'),
    ],
  },
  {
    id: 'JV-2028-02-0052', date: '2028-02-29', period: '2028-02', status: 'Posted', sourceType: 'Depreciation Run', auto: true,
    narrative: [{ label: 'Source', value: 'Depreciation run Feb 2028' }, { label: 'Reference', value: 'DEP-2028-02 · commercial book' }, { label: 'Description', value: 'Charge allocated to project codes by actual operating hours; idle capacity retained on GEN-BPN (FAT-25/26)' }],
    trace: [{ kind: 'Depreciation run', ref: 'DEP-2028-02', to: '/finance/assets' }, { kind: 'GEN allocation', ref: 'Feb 2028', to: '/costing/allocation' }],
    createdBy: 'SYSTEM', approvedBy: e('0028'), postedAt: '2028-03-02T09:14', lines: depreciationLines(),
  },
  {
    id: 'JV-2028-02-0053', date: '2028-02-29', period: '2028-02', status: 'Posted', sourceType: 'GEN Allocation', auto: true,
    narrative: [{ label: 'Source', value: 'GEN allocation run Feb 2028' }, { label: 'Reference', value: 'ALLOC-2028-02' }, { label: 'Description', value: 'GEN-HO by revenue share, GEN-BPN by operating hours (FAT-21/22)' }],
    trace: [{ kind: 'Allocation run', ref: 'ALLOC-2028-02', to: '/costing/allocation' }],
    createdBy: 'SYSTEM', approvedBy: e('0002'), postedAt: '2028-03-03T11:20',
    lines: [
      L('5109', 'HL-2027-014.01', 214_600_000, 0, 'GEN-HO 29.4% · GEN-BPN 32.8%'),
      L('5109', 'HL-2027-014.02', 48_300_000, 0, 'GEN-HO 5.1% · GEN-BPN 9.6%'),
      L('5109', 'HL-2027-021', 96_200_000, 0, 'GEN-HO 12.2% · GEN-BPN 16.1%'),
      L('5109', 'HL-2028-002', 52_700_000, 0, 'GEN-HO 5.6% · GEN-BPN 10.3%'),
      L('5109', 'PS-2028-003', 188_400_000, 0, 'GEN-HO 33.1% · GEN-BPN 18.2%'),
      L('5109', 'GS-2027-008', 97_800_000, 0, 'GEN-HO 14.6% · GEN-BPN 13.0%'),
      L('6199', 'GEN-HO', 0, 412_000_000, 'Distributed from GEN-HO'),
      L('6199', 'GEN-BPN', 0, 286_000_000, 'Distributed from GEN-BPN'),
    ],
  },
  {
    id: 'JV-2028-03-0001', date: '2028-03-01', period: '2028-03', status: 'Posted', sourceType: 'Accrual', auto: true, reversalOf: 'JV-2028-02-0041',
    narrative: [{ label: 'Source', value: 'Auto-reversal' }, { label: 'Reference', value: 'JV-2028-02-0041' }, { label: 'Project', value: 'HL-2027-014.01' }, { label: 'Description', value: 'Reverse February haulage accrual on first day of period' }],
    trace: [jv('JV-2028-02-0041', 'Reversed journal'), vendor('VND-00112')],
    createdBy: 'SYSTEM', approvedBy: e('0028'), postedAt: '2028-03-01T00:05',
    lines: [L('2103.02', 'HL-2027-014.01', 412_000_000, 0, 'Reverse accrued subcontract'), L('5102', 'HL-2027-014.01', 0, 412_000_000, 'Reverse accrued subcontract')],
  },
  {
    id: 'JV-2028-03-0002', date: '2028-03-02', period: '2028-03', status: 'Posted', sourceType: 'AP Invoice', auto: true,
    narrative: [{ label: 'Source', value: 'AP invoice SEK/INV/2028/0211' }, { label: 'Counterparty', value: 'PT Solar Energi Kaltim' }, { label: 'Project', value: 'HL-2027-014.01' }, { label: 'Description', value: 'HSD fuel supply Feb 2028 — 120 KL, three-way matched' }],
    trace: [loket('LKT-2028-03-0138'), po('PO-2028-0172'), vendor('VND-00118'), project('HL-2027-014.01')],
    createdBy: e('0009'), approvedBy: e('0028'), postedAt: '2028-03-02T14:22',
    lines: [
      L('2102', 'HL-2027-014.01', 1_644_000_000, 0, 'Clear GR/IR — GRN-2028-0244/0251/0263'),
      L('1106.01', 'HL-2027-014.01', 180_840_000, 0, 'PPN input — Faktur 010.041-28.00012873'),
      L('2101', 'HL-2027-014.01', 0, 1_824_840_000, 'Payable, due 31 Mar 2028'),
    ],
  },
  {
    id: 'JV-2028-03-0003', date: '2028-03-03', period: '2028-03', status: 'Posted', sourceType: 'Goods Receipt', auto: true,
    narrative: [{ label: 'Source', value: 'Goods receipt GRN-2028-0311' }, { label: 'Counterparty', value: 'PT Solar Energi Kaltim' }, { label: 'Project', value: 'HL-2027-014.01' }, { label: 'Description', value: 'HSD fuel 50 KL delivered to Kutai site tank — PO commitment becomes actual cost (FAT-02)' }],
    trace: [{ kind: 'Goods receipt', ref: 'GRN-2028-0311', to: '/procurement/receipts' }, po('PO-2028-0195'), project('HL-2027-014.01')],
    createdBy: e('0007'), approvedBy: e('0006'), postedAt: '2028-03-03T16:48',
    lines: [L('5101', 'HL-2027-014.01', 685_000_000, 0, '50,000 L × IDR 13,700'), L('2102', 'HL-2027-014.01', 0, 685_000_000, 'GR/IR clearing')],
  },
  {
    id: 'JV-2028-03-0004', date: '2028-03-04', period: '2028-03', status: 'Posted', sourceType: 'AR Invoice', auto: true,
    narrative: [{ label: 'Source', value: 'AR invoice INV-2028-03-0005' }, { label: 'Counterparty', value: 'Mahakam Gas Processing (Client C)' }, { label: 'Project', value: 'HL-2027-021' }, { label: 'Description', value: 'Module M-13 SPMT transport & set — rate card CTR-2027-016 v1' }],
    trace: [arInv('INV-2028-03-0005'), sk('SK-2028-03-0005'), { kind: 'Contract', ref: 'CTR-2027-016', to: '/contracts/CTR-2027-016' }, project('HL-2027-021')],
    createdBy: e('0022'), approvedBy: e('0028'), postedAt: '2028-03-04T10:31',
    lines: [
      L('1103.01', 'HL-2027-021', 316_350_000, 0, 'Receivable incl. PPN'),
      L('1103.03', 'HL-2027-021', 0, 285_000_000, 'Clear unbilled revenue — SK-2028-03-0005'),
      L('2104.01', 'HL-2027-021', 0, 31_350_000, 'PPN output 11%'),
    ],
  },
  {
    id: 'JV-2028-03-0005', date: '2028-03-05', period: '2028-03', status: 'Posted', sourceType: 'Payment Run', auto: true,
    narrative: [{ label: 'Source', value: 'Payment run PAY-2028-03-01' }, { label: 'Bank', value: 'Mandiri H2H' }, { label: 'Description', value: '2 invoices paid, PPh 23 withheld automatically (PROC-21)' }],
    trace: [{ kind: 'Payment run', ref: 'PAY-2028-03-01', to: '/finance/ap/payments' }, loket('LKT-2028-02-0121'), loket('LKT-2028-02-0126'), { kind: 'e-Bupot', ref: 'BP23-2028-03-00017', to: '/finance/tax' }],
    createdBy: e('0009'), approvedBy: e('0002'), postedAt: '2028-03-05T13:02',
    lines: [
      L('2101', 'HL-2027-014.01', 1_243_200_000, 0, 'CV Borneo Trans Mandiri — BTM/INV/II/2028/017'),
      L('2101', 'GEN-BPN', 42_735_000, 0, 'PT Limbah Aman Lestari — LAL/0228/044'),
      L('2104.03', 'HL-2027-014.01', 0, 22_400_000, 'PPh 23 2% × 1,120,000,000'),
      L('2104.03', 'GEN-BPN', 0, 770_000, 'PPh 23 2% × 38,500,000'),
      L('1102.01', 'GEN-HO', 0, 1_262_765_000, 'Bank Mandiri 137-00-1188-2044', 'CC-110'),
    ],
  },
  {
    id: 'JV-2028-03-0006', date: '2028-03-05', period: '2028-03', status: 'Posted', sourceType: 'Customer Receipt', auto: true,
    narrative: [{ label: 'Source', value: 'Customer receipt RCP-2028-03-0009' }, { label: 'Counterparty', value: 'Borneo Coal Mining (Client A)' }, { label: 'Project', value: 'HL-2027-014.01' }, { label: 'Description', value: 'Settlement of INV-2028-02-0014 net of PPh 23 withheld by customer' }],
    trace: [{ kind: 'Bank statement', ref: 'BCA 05-Mar-2028 line 14', to: '/finance/cash' }, arInv('INV-2028-02-0014'), project('HL-2027-014.01')],
    createdBy: 'SYSTEM', approvedBy: e('0028'), postedAt: '2028-03-05T17:10',
    lines: [
      L('1102.02', 'HL-2027-014.01', 659_755_200, 0, 'BCA collections'),
      L('1106.02', 'HL-2027-014.01', 12_105_600, 0, 'PPh 23 withheld — bukti potong pending'),
      L('1103.01', 'HL-2027-014.01', 0, 671_860_800, 'Clear receivable'),
    ],
  },
  {
    id: 'JV-2028-03-0007', date: '2028-03-06', period: '2028-03', status: 'Posted', sourceType: 'Payroll', auto: true,
    narrative: [{ label: 'Source', value: 'Payroll import PRL-2028-02' }, { label: 'Counterparty', value: 'Outsource Indonesia (payroll bureau)' }, { label: 'Description', value: 'February payroll charged to project codes on verified timesheets (HC-03/HC-04)' }],
    trace: [{ kind: 'Payroll batch', ref: 'PRL-2028-02', to: '/timesheets' }, { kind: 'Manpower allocation', ref: 'Feb 2028', to: '/manpower' }],
    createdBy: 'SYSTEM', approvedBy: e('0028'), postedAt: '2028-03-06T09:40',
    lines: [
      L('5103', 'HL-2027-014.01', 486_200_000, 0, 'Drivers & operators — 3,412 verified hours'),
      L('5103', 'HL-2027-014.02', 72_400_000, 0, 'Crane crew — 488 verified hours'),
      L('5103', 'HL-2027-021', 88_600_000, 0, 'Crane & SPMT crew — 596 verified hours'),
      L('5103', 'HL-2028-002', 64_300_000, 0, 'Lowbed crew & riggers — 431 verified hours'),
      L('5103', 'PS-2028-003', 318_900_000, 0, 'Catalyst technicians — 2,184 verified hours'),
      L('5103', 'GS-2027-008', 96_700_000, 0, 'Process engineers — 612 verified hours'),
      L('6101', 'GEN-HO', 612_500_000, 0, 'Head office staff'),
      L('6101', 'GEN-BPN', 208_400_000, 0, 'Balikpapan support staff'),
      L('2103.01', 'GEN-HO', 0, 1_948_000_000, 'Accrued payroll — paid via BNI 25 Mar', 'CC-110'),
    ],
  },
  {
    id: 'JV-2028-03-0008', date: '2028-03-06', period: '2028-03', status: 'Posted', sourceType: 'AP Invoice', auto: true,
    narrative: [{ label: 'Source', value: 'AP invoice TPK/0302/2028' }, { label: 'Counterparty', value: 'CV Tol & Perizinan Kaltim' }, { label: 'Project', value: 'HL-2027-014.02' }, { label: 'Description', value: 'Heavy haul road permits & escort Q1 — non-PKP vendor, no PPN' }],
    trace: [loket('LKT-2028-03-0140'), po('PO-2028-0183'), vendor('VND-00203'), project('HL-2027-014.02')],
    createdBy: e('0009'), approvedBy: e('0028'), postedAt: '2028-03-06T11:18',
    lines: [L('2102', 'HL-2027-014.02', 96_500_000, 0, 'Clear GR/IR — SES-2028-0071'), L('2101', 'HL-2027-014.02', 0, 96_500_000, 'Payable, due 05 Apr 2028')],
  },
  {
    id: 'JV-2028-03-0009', date: '2028-03-07', period: '2028-03', status: 'Reversed', sourceType: 'Goods Receipt', auto: true, reversedBy: 'JV-2028-03-0016', correctedBy: 'JV-2028-03-0017',
    narrative: [{ label: 'Source', value: 'Service entry SES-2028-0088' }, { label: 'Counterparty', value: 'PT Mitra Scaffolding Indonesia' }, { label: 'Project', value: 'PS-2028-003' }, { label: 'Description', value: 'Scaffolding erection & dismantle — reactor deck' }],
    trace: [{ kind: 'Service entry', ref: 'SES-2028-0088', to: '/procurement/receipts' }, po('PO-2028-0190'), project('PS-2028-003')],
    createdBy: e('0029'), approvedBy: e('0004'), postedAt: '2028-03-07T10:02',
    lines: [L('5102', 'PS-2028-003', 312_000_000, 0, 'Service accepted — BAST 06 Mar', 'CC-250'), L('2102', 'PS-2028-003', 0, 312_000_000, 'GR/IR clearing', 'CC-250')],
  },
  {
    id: 'JV-2028-03-0010', date: '2028-03-07', period: '2028-03', status: 'Posted', sourceType: 'Bank Statement', auto: true,
    narrative: [{ label: 'Source', value: 'Bank statement import' }, { label: 'Bank', value: 'Mandiri 137-00-1188-2044' }, { label: 'Description', value: 'Transfer & H2H transaction charges, 01–07 Mar' }],
    trace: [{ kind: 'Bank statement', ref: 'MDR-20280307', to: '/finance/cash' }],
    createdBy: 'SYSTEM', approvedBy: e('0028'), postedAt: '2028-03-08T06:15',
    lines: [L('7102', 'GEN-HO', 1_850_000, 0, 'Bank charges'), L('1102.01', 'GEN-HO', 0, 1_850_000, 'Bank Mandiri')],
  },
  {
    id: 'JV-2028-03-0011', date: '2028-03-08', period: '2028-03', status: 'Posted', sourceType: 'AP Invoice', auto: true,
    narrative: [{ label: 'Source', value: 'AP invoice GIN/28/0317' }, { label: 'Counterparty', value: 'PT Gas Industri Nitrogen' }, { label: 'Project', value: 'PS-2028-003' }, { label: 'Description', value: 'Liquid nitrogen — 18 tanker loads, three-way matched within tolerance' }],
    trace: [loket('LKT-2028-03-0139'), po('PO-2028-0181'), vendor('VND-00188'), project('PS-2028-003')],
    createdBy: e('0009'), approvedBy: e('0028'), postedAt: '2028-03-08T09:51',
    lines: [
      L('2102', 'PS-2028-003', 486_000_000, 0, 'Clear GR/IR'),
      L('1106.01', 'PS-2028-003', 53_460_000, 0, 'PPN input — Faktur 010.052-28.00003318'),
      L('2101', 'PS-2028-003', 0, 539_460_000, 'Payable, due 22 Apr 2028'),
    ],
  },
  {
    id: 'JV-2028-03-0012', date: '2028-03-08', period: '2028-03', status: 'Posted', sourceType: 'Late Cost', auto: true, attributionPeriod: '2027-12',
    narrative: [{ label: 'Source', value: 'Late cost LC-2028-0007' }, { label: 'Counterparty', value: 'CV Tol & Perizinan Kaltim' }, { label: 'Project', value: 'PS-2027-017' }, { label: 'Description', value: 'Toll & escort Dec 2027 received after close — posted to Mar 2028, attributed to PS-2027-017 (Dec 2027 stays locked)' }],
    trace: [{ kind: 'Late cost', ref: 'LC-2028-0007', to: '/costing/late-costs' }, loket('LKT-2028-03-0141'), vendor('VND-00203'), project('PS-2027-017')],
    createdBy: e('0009'), approvedBy: e('0028'), postedAt: '2028-03-08T15:37',
    lines: [L('5107', 'PS-2027-017', 14_650_000, 0, 'Toll Cilegon–Merak & escort, 14–19 Dec 2027'), L('2101', 'PS-2027-017', 0, 14_650_000, 'Payable, due 07 Apr 2028')],
  },
  {
    id: 'JV-2028-03-0013', date: '2028-03-08', period: '2028-03', status: 'Posted', sourceType: 'Payment Run', auto: false,
    narrative: [{ label: 'Source', value: 'Petty cash replenishment PCR-KTK-2028-03' }, { label: 'Site', value: 'Kutai Kartanegara' }, { label: 'Description', value: 'Replenish site imprest to IDR 50,000,000' }],
    trace: [{ kind: 'Cash request', ref: 'PCR-KTK-2028-03', to: '/finance/cash' }],
    createdBy: e('0007'), approvedBy: e('0028'), postedAt: '2028-03-08T16:02',
    lines: [L('1101', 'HL-2027-014', 25_000_000, 0, 'Kutai imprest'), L('1102.04', 'GEN-BPN', 0, 25_000_000, 'Bank BRI Balikpapan', 'CC-110')],
  },
  {
    id: 'JV-2028-03-0014', date: '2028-03-09', period: '2028-03', status: 'Posted', sourceType: 'Inventory Issue', auto: true,
    narrative: [{ label: 'Source', value: 'Goods issue GI-2028-0144' }, { label: 'Unit', value: 'DT-04' }, { label: 'Project', value: 'HL-2027-014.01' }, { label: 'Description', value: 'Brake chambers & air dryer issued to corrective work order' }],
    trace: [{ kind: 'Goods issue', ref: 'GI-2028-0144', to: '/inventory' }, { kind: 'Unit', ref: 'DT-04', to: '/fleet/units/DT-04' }, { kind: 'Work orders', ref: 'Corrective maintenance', to: '/maintenance/work-orders' }],
    createdBy: e('0024'), approvedBy: e('0012'), postedAt: '2028-03-09T08:44',
    lines: [L('5105', 'HL-2027-014.01', 18_420_000, 0, 'Moving average cost', 'CC-250'), L('1104.01', 'GEN-BPN', 0, 18_420_000, 'Balikpapan warehouse', 'CC-250')],
  },
  {
    id: 'JV-2028-03-0015', date: '2028-03-09', period: '2028-03', status: 'Pending Approval', sourceType: 'Manual Journal', auto: false,
    narrative: [{ label: 'Source', value: 'Manual journal' }, { label: 'Reason', value: 'Dimension correction' }, { label: 'Project', value: 'HL-2028-002' }, { label: 'Description', value: 'Reclass fuel for LV at Garut rig move charged to GEN-BPN in error — fuel log FL-GRT-0304' }],
    trace: [{ kind: 'Fuel log', ref: 'FL-GRT-0304', to: '/fleet/fuel' }, project('HL-2028-002')],
    createdBy: e('0028'), postedAt: undefined,
    lines: [L('5101', 'HL-2028-002', 8_640_000, 0, '630 L × IDR 13,714'), L('5101', 'GEN-BPN', 0, 8_640_000, 'Remove from overhead')],
  },
  {
    id: 'JV-2028-03-0016', date: '2028-03-09', period: '2028-03', status: 'Posted', sourceType: 'Reversal', auto: false, reversalOf: 'JV-2028-03-0009',
    narrative: [{ label: 'Source', value: 'Reversal of JV-2028-03-0009' }, { label: 'Reason', value: 'Wrong cost centre (CC-250 instead of CC-310)' }, { label: 'Project', value: 'PS-2028-003' }, { label: 'Description', value: 'Full reversal — original journal left intact' }],
    trace: [jv('JV-2028-03-0009', 'Reversed journal'), jv('JV-2028-03-0017', 'Corrected journal'), po('PO-2028-0190')],
    createdBy: e('0028'), approvedBy: e('0002'), postedAt: '2028-03-09T11:20',
    lines: [L('2102', 'PS-2028-003', 312_000_000, 0, 'Reverse GR/IR', 'CC-250'), L('5102', 'PS-2028-003', 0, 312_000_000, 'Reverse cost', 'CC-250')],
  },
  {
    id: 'JV-2028-03-0017', date: '2028-03-09', period: '2028-03', status: 'Posted', sourceType: 'Goods Receipt', auto: false,
    narrative: [{ label: 'Source', value: 'Service entry SES-2028-0088 (re-post)' }, { label: 'Counterparty', value: 'PT Mitra Scaffolding Indonesia' }, { label: 'Project', value: 'PS-2028-003' }, { label: 'Description', value: 'Re-post with correct cost centre CC-310 after reversal JV-2028-03-0016' }],
    trace: [{ kind: 'Service entry', ref: 'SES-2028-0088', to: '/procurement/receipts' }, jv('JV-2028-03-0009', 'Original journal'), po('PO-2028-0190'), project('PS-2028-003')],
    createdBy: e('0028'), approvedBy: e('0002'), postedAt: '2028-03-09T11:21',
    lines: [L('5102', 'PS-2028-003', 312_000_000, 0, 'Service accepted — BAST 06 Mar', 'CC-310'), L('2102', 'PS-2028-003', 0, 312_000_000, 'GR/IR clearing', 'CC-310')],
  },
  {
    id: 'JV-2028-03-0018', date: '2028-03-10', period: '2028-03', status: 'Posted', sourceType: 'Tax Payment', auto: true,
    narrative: [{ label: 'Source', value: 'SPT Masa PPN Feb 2028' }, { label: 'Reference', value: 'NTPN 7F3A21C9D04B8E16' }, { label: 'Description', value: 'Net PPN payable settled — output 1,084.6 m less creditable input 598.3 m' }],
    trace: [{ kind: 'Tax return', ref: 'SPT Masa PPN 2028-02', to: '/finance/tax' }, { kind: 'Bank statement', ref: 'MDR-20280310', to: '/finance/cash' }],
    createdBy: e('0023'), approvedBy: e('0002'), postedAt: '2028-03-10T08:12',
    lines: [
      L('2104.01', 'GEN-HO', 1_084_600_000, 0, 'PPN output Feb'),
      L('1106.01', 'GEN-HO', 0, 598_300_000, 'Creditable PPN input Feb'),
      L('1102.01', 'GEN-HO', 0, 486_300_000, 'Coretax billing code 0228 4113 1100 2044'),
    ],
  },
  {
    id: 'JV-2028-03-0019', date: '2028-03-10', period: '2028-03', status: 'Posted', sourceType: 'Tax Payment', auto: true,
    narrative: [{ label: 'Source', value: 'SPT Masa PPh 23 Feb 2028' }, { label: 'Reference', value: 'NTPN 29C0B7E1A4F65D38' }, { label: 'Description', value: 'Remit PPh 23 withheld from vendors in Feb — 31 e-Bupot certificates' }],
    trace: [{ kind: 'e-Bupot batch', ref: 'BP23 Feb 2028', to: '/finance/tax' }],
    createdBy: e('0023'), approvedBy: e('0002'), postedAt: '2028-03-10T08:14',
    lines: [L('2104.03', 'GEN-HO', 71_200_000, 0, 'PPh 23 payable Feb'), L('1102.01', 'GEN-HO', 0, 71_200_000, 'Bank Mandiri')],
  },
  {
    id: 'JV-2028-03-0020', date: '2028-03-10', period: '2028-03', status: 'Draft', sourceType: 'Manual Journal', auto: false,
    narrative: [{ label: 'Source', value: 'Manual journal' }, { label: 'Reason', value: 'Accrual' }, { label: 'Project', value: 'GS-2028-001' }, { label: 'Description', value: 'Legal review of CTR-2028-004 — engagement letter signed, invoice expected April' }],
    trace: [{ kind: 'Contract', ref: 'CTR-2028-004', to: '/contracts/CTR-2028-004' }, project('GS-2028-001')],
    createdBy: e('0028'),
    lines: [L('6106', 'GS-2028-001', 45_000_000, 0, 'Legal fees'), L('2103.02', 'GS-2028-001', 0, 45_000_000, 'Accrued professional fees')],
  },
]

// ─── Unknown id → deterministic generated journal (never crash on a deep link) ─
function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return Math.abs(h)
}

export function generateJournal(id: string): Journal {
  const h = hash(id)
  const m = /JV-(\d{4})-(\d{2})-/.exec(id)
  const year = m?.[1] ?? '2028'
  const month = m?.[2] ?? '03'
  const day = String((h % 27) + 1).padStart(2, '0')
  const p = purchaseOrders[h % purchaseOrders.length]
  const v = vendors.find((x) => x.id === p.vendorId)
  const dpp = Math.round((p.amount * (((h >> 3) % 30) + 10)) / 100 / 100_000) * 100_000
  const ppn = v?.pkp ? Math.round(dpp * 0.11) : 0
  const pcBl = getProject(p.projectCode)?.businessLine ?? 'CORP'
  const receipt = `LKT-${year}-${month}-0${String(100 + (h % 90))}`
  const lines: JournalLine[] = [L('2102', p.projectCode, dpp, 0, 'Clear GR/IR')]
  if (ppn) lines.push(L('1106.01', p.projectCode, ppn, 0, 'PPN input 11%'))
  lines.push(L('2101', p.projectCode, 0, dpp + ppn, 'Trade payable'))
  return {
    id,
    date: `${year}-${month}-${day}`,
    period: `${year}-${month}`,
    status: 'Posted',
    sourceType: 'AP Invoice',
    auto: true,
    narrative: [
      { label: 'Source', value: `AP invoice ${receipt}` },
      { label: 'Counterparty', value: v?.name ?? 'Vendor' },
      { label: 'Project', value: `${p.projectCode} (${pcBl})` },
      { label: 'Description', value: `${p.description} — partial invoice` },
    ],
    trace: [loket(receipt), po(p.id), vendor(p.vendorId), project(p.projectCode)],
    createdBy: e('0009'),
    approvedBy: e('0028'),
    postedAt: `${year}-${month}-${day}T10:${String(h % 60).padStart(2, '0')}`,
    lines,
  }
}

export const getJournal = (id: string): Journal => journals.find((j) => j.id === id) ?? generateJournal(id)
export const isKnownJournal = (id: string) => journals.some((j) => j.id === id)
