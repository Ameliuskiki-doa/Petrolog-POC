/**
 * M8 Period close — checklist, period status, first-close notes and parallel-run evidence (Nov–Dec 2027).
 */

export type CloseStatus = 'Done' | 'In progress' | 'Not started' | 'Blocked'

export interface CloseTask {
  id: string
  task: string
  detail: string
  ownerId: string
  due: string
  workday: string
  status: CloseStatus
  link?: string
  ref?: string
  dependsOn?: string[]
}

export const closeTasks: CloseTask[] = [
  { id: 'C-01', task: 'Cut-off notice to sites & vendors', detail: 'Late-cost cut-off 31 Mar 18:00 WITA; vendor portal banner published', ownerId: 'EMP-0028', due: '2028-03-10', workday: 'WD−15', status: 'Done' },
  { id: 'C-02', task: 'Verify all completed jobs & timesheets', detail: 'Completed ≠ Verified — ops admin validates PODs before billing & payroll cost', ownerId: 'EMP-0007', due: '2028-03-31', workday: 'WD 0', status: 'In progress', link: '/ops/jobs', ref: '4 jobs awaiting verification' },
  { id: 'C-03', task: 'Fuel actualisation', detail: 'Supplier actuals vs dipstick estimates; variances posted to consuming project (FAT-23/24)', ownerId: 'EMP-0028', due: '2028-04-01', workday: 'WD+1', status: 'Not started', link: '/costing/fuel-actualisation', dependsOn: ['C-02'] },
  { id: 'C-04', task: 'Depreciation run by operating hours', detail: 'Commercial & fiscal books; charge allocated to project codes by M15 unit hours, idle stays on GEN (FAT-25/26)', ownerId: 'EMP-0028', due: '2028-04-01', workday: 'WD+1', status: 'Not started', link: '/finance/assets', dependsOn: ['C-02'] },
  { id: 'C-05', task: 'Prepaid amortisation', detail: 'Insurance, SILO/KIR certificate fees, permits — schedule PPA-2028-03', ownerId: 'EMP-0028', due: '2028-04-01', workday: 'WD+1', status: 'Not started' },
  { id: 'C-06', task: 'Accruals — GR/IR, subcontract, payroll, utilities', detail: 'Received-not-invoiced review; auto-reversing accruals dated 31 Mar', ownerId: 'EMP-0009', due: '2028-04-02', workday: 'WD+2', status: 'Not started', link: '/finance/ap/match' },
  { id: 'C-07', task: 'Surat Konversi vs AR invoice reconciliation', detail: 'Every SK invoiced or accrued as unbilled revenue (FAT-16)', ownerId: 'EMP-0022', due: '2028-04-02', workday: 'WD+2', status: 'In progress', link: '/finance/billing/reconciliation', ref: '4 SK without invoice' },
  { id: 'C-08', task: 'GEN allocation run', detail: 'GEN-HO by revenue share, GEN-BPN by operating hours (FAT-21/22)', ownerId: 'EMP-0028', due: '2028-04-02', workday: 'WD+2', status: 'Not started', link: '/costing/allocation', dependsOn: ['C-03', 'C-04', 'C-06'] },
  { id: 'C-09', task: 'Bank reconciliation — all accounts', detail: 'Statements imported to 31 Mar; unmatched items cleared or explained', ownerId: 'EMP-0009', due: '2028-04-03', workday: 'WD+3', status: 'In progress', link: '/finance/cash', ref: '3 unmatched lines' },
  { id: 'C-10', task: 'Tax reconciliation', detail: 'e-Faktur & e-Bupot vs GL; SPT Masa PPN/PPh 23 prepared (FAT-33)', ownerId: 'EMP-0023', due: '2028-04-03', workday: 'WD+3', status: 'Not started', link: '/finance/tax' },
  { id: 'C-11', task: 'Project P/L review with PMs', detail: 'RAB vs actual + commitment; late costs attributed via controlled reopening', ownerId: 'EMP-0002', due: '2028-04-04', workday: 'WD+4', status: 'Not started', link: '/projects' },
  { id: 'C-12', task: 'Lock period Mar 2028', detail: 'Posting blocked; late costs thereafter charged via controlled reopening', ownerId: 'EMP-0002', due: '2028-04-05', workday: 'WD+5', status: 'Not started', dependsOn: ['C-07', 'C-08', 'C-09', 'C-10', 'C-11'] },
]

export interface PeriodRow {
  period: string
  status: 'Open' | 'Locked' | 'Future' | 'Archive (SAP B1)'
  closedOn?: string
  closedBy?: string
  workdays?: number
  journals: number
  lateCosts: number
  note?: string
}

export const periods: PeriodRow[] = [
  { period: '2028-04', status: 'Future', journals: 0, lateCosts: 0 },
  { period: '2028-03', status: 'Open', journals: 20, lateCosts: 1, note: 'Current period · close scheduled WD+5 (05 Apr 2028)' },
  { period: '2028-02', status: 'Locked', closedOn: '2028-03-06', closedBy: 'EMP-0002', workdays: 4, journals: 612, lateCosts: 0, note: 'Closed in 4 working days' },
  { period: '2028-01', status: 'Locked', closedOn: '2028-02-08', closedBy: 'EMP-0002', workdays: 6, journals: 587, lateCosts: 2, note: 'First close on the platform — 6 working days (target 5)' },
  { period: '2027-12', status: 'Archive (SAP B1)', journals: 0, lateCosts: 3, note: 'Book of record: SAP B1 (read-only). Late costs attributed via controlled reopening' },
  { period: '2027-11', status: 'Archive (SAP B1)', journals: 0, lateCosts: 0, note: 'Parallel run period 1' },
]

export interface ParallelRow {
  area: string
  sap: number
  platform: number
  explanation: string
}

export const parallelRun: { period: string; signedOn: string; signedBy: string[]; rows: ParallelRow[] }[] = [
  {
    period: '2027-11', signedOn: '2027-12-14', signedBy: ['Ratna Sari Dewi — Finance Director, PT Petrolog Indah', 'Implementation Lead — provider'],
    rows: [
      { area: 'Revenue', sap: 6_842_000_000, platform: 6_842_000_000, explanation: 'Line-by-line match' },
      { area: 'Cost of revenue', sap: 5_214_600_000, platform: 5_211_900_000, explanation: 'Rounding on fuel actualisation (L to KL conversion) — rule corrected' },
      { area: 'Operating expenses', sap: 1_086_400_000, platform: 1_086_400_000, explanation: 'Line-by-line match' },
      { area: 'Trade receivables', sap: 19_104_000_000, platform: 19_104_000_000, explanation: 'Document-level match' },
      { area: 'Trade payables', sap: 8_012_300_000, platform: 8_012_300_000, explanation: 'Document-level match' },
      { area: 'Fixed assets (NBV)', sap: 71_386_000_000, platform: 71_381_400_000, explanation: 'Depreciation start-month convention aligned (CUT-02 rehearsal)' },
      { area: 'Cash & bank', sap: 26_904_000_000, platform: 26_904_000_000, explanation: 'Statement-level match' },
    ],
  },
  {
    period: '2027-12', signedOn: '2028-01-12', signedBy: ['Ratna Sari Dewi — Finance Director, PT Petrolog Indah', 'Implementation Lead — provider'],
    rows: [
      { area: 'Revenue', sap: 8_127_000_000, platform: 8_127_000_000, explanation: 'Line-by-line match' },
      { area: 'Cost of revenue', sap: 6_402_800_000, platform: 6_402_800_000, explanation: 'Line-by-line match' },
      { area: 'Operating expenses', sap: 1_152_900_000, platform: 1_152_900_000, explanation: 'Line-by-line match' },
      { area: 'Trade receivables', sap: 19_860_000_000, platform: 19_860_000_000, explanation: 'Document-level match — loaded as CUT-01 open items' },
      { area: 'Trade payables', sap: 8_420_000_000, platform: 8_420_000_000, explanation: 'Document-level match — loaded as CUT-01 open items' },
      { area: 'Fixed assets (NBV)', sap: 70_148_000_000, platform: 70_148_000_000, explanation: 'Register loaded (CUT-02)' },
      { area: 'Cash & bank', sap: 27_322_000_000, platform: 27_322_000_000, explanation: 'Statement-level match' },
    ],
  },
]

export const cutoverChecklist = [
  { id: 'CUT-01', label: 'Opening balances & open items (GL, AP, AR, open POs, cash & bank)', status: 'Done', evidence: 'JV-2028-01-0001 · variance report signed 12 Jan 2028' },
  { id: 'CUT-02', label: 'Fixed asset register load (commercial & fiscal parameters)', status: 'Done', evidence: 'Rehearsed Nov 2027; 27 assets loaded' },
  { id: 'CUT-03', label: 'SAP Business One set to read-only', status: 'Done', evidence: 'Write access withdrawn 01 Jan 2028 00:00' },
  { id: 'CUT-04', label: 'Historical transactions (5 years) to archive', status: 'Planned', evidence: 'Stage 2 — reconciliation criteria agreed' },
]
