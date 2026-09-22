/**
 * Finance master data: cost centres and the dimensional chart of accounts (M8).
 * Account structure follows Indonesian SAK practice (1 Assets … 8 Income tax), labels in English.
 */
import { getProject, type BusinessLine } from '@/data/core'
import { assetClassAccount, assetTotals, type AssetClass } from './assets'

export const SAP_ARCHIVE_NOTE = 'SAP Business One — read-only archive since 01 Jan 2028'
export const CUTOVER_DATE = '2028-01-01'

// ─── Cost centres ─────────────────────────────────────────────────────────────
export interface CostCentre {
  code: string
  name: string
  location: string
  businessLine: BusinessLine
  ownerId: string
}

export const costCentres: CostCentre[] = [
  { code: 'CC-110', name: 'Finance & Accounting', location: 'Jakarta HO', businessLine: 'CORP', ownerId: 'EMP-0028' },
  { code: 'CC-120', name: 'General Administration & IT', location: 'Jakarta HO', businessLine: 'CORP', ownerId: 'EMP-0027' },
  { code: 'CC-130', name: 'Commercial & Business Development', location: 'Jakarta HO', businessLine: 'CORP', ownerId: 'EMP-0011' },
  { code: 'CC-140', name: 'Procurement', location: 'Jakarta HO', businessLine: 'CORP', ownerId: 'EMP-0008' },
  { code: 'CC-210', name: 'HL Operations — Kutai', location: 'Kutai Kartanegara', businessLine: 'HL', ownerId: 'EMP-0006' },
  { code: 'CC-220', name: 'HL Operations — Bekapai', location: 'Bekapai', businessLine: 'HL', ownerId: 'EMP-0003' },
  { code: 'CC-230', name: 'HL Operations — Garut', location: 'Garut', businessLine: 'HL', ownerId: 'EMP-0003' },
  { code: 'CC-250', name: 'Fleet Workshop — Balikpapan', location: 'Balikpapan Ops', businessLine: 'HL', ownerId: 'EMP-0012' },
  { code: 'CC-310', name: 'Plant Services — Cilacap', location: 'Cilacap', businessLine: 'PS', ownerId: 'EMP-0004' },
  { code: 'CC-320', name: 'Plant Services — Cilegon', location: 'Cilegon', businessLine: 'PS', ownerId: 'EMP-0004' },
  { code: 'CC-410', name: 'Green Solutions — Bontang', location: 'Bontang', businessLine: 'GS', ownerId: 'EMP-0005' },
  { code: 'CC-420', name: 'Green Solutions — Dumai', location: 'Dumai', businessLine: 'GS', ownerId: 'EMP-0005' },
  { code: 'CC-510', name: 'HSE', location: 'Balikpapan Ops', businessLine: 'CORP', ownerId: 'EMP-0010' },
]
export const getCostCentre = (code?: string) => costCentres.find((c) => c.code === code)

/** Default cost centre for a project code */
export function ccForProject(code: string): string {
  if (code.startsWith('HL-2027-014')) return 'CC-210'
  if (code === 'HL-2027-021') return 'CC-220'
  if (code === 'HL-2028-002') return 'CC-230'
  if (code === 'PS-2028-003') return 'CC-310'
  if (code === 'PS-2027-017') return 'CC-320'
  if (code === 'GS-2027-008') return 'CC-410'
  if (code === 'GS-2028-001') return 'CC-420'
  if (code === 'GEN-BPN') return 'CC-250'
  return 'CC-110'
}

export const blForProject = (code: string): BusinessLine => getProject(code)?.businessLine ?? 'CORP'

// ─── Chart of accounts ────────────────────────────────────────────────────────
export type AccountClass = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Cost of Revenue' | 'Operating Expense' | 'Other Income & Expense' | 'Income Tax'
export type ProjectRule = 'Mandatory' | 'Mandatory · GEN allowed' | 'Optional' | 'Not used'

export interface Account {
  code: string
  name: string
  parent?: string
  cls: AccountClass
  posting: boolean
  /** Natural-side balance at 10 Mar 2028 (contra accounts negative) */
  balance?: number
  /** Opening balance 01 Jan 2028 migrated from SAP B1 (CUT-01) */
  opening?: number
  sapCode?: string
  projectRule?: ProjectRule
  ccRule?: 'Mandatory' | 'Optional'
  note?: string
}

const at = assetTotals()
const cls = (c: AssetClass) => at.get(c) ?? { cost: 0, accum: 0, fiscalAccum: 0 }

// Opening (1 Jan 2028) of fixed-asset accounts: Feb accumulated less two months charge ≈ Dec 2027 position
const faAcc = (c: AssetClass, kind: 'cost' | 'accum') => (kind === 'cost' ? cls(c).cost : -cls(c).accum)

const raw: Account[] = [
  { code: '1', name: 'Assets', cls: 'Asset', posting: false },
  { code: '11', name: 'Current assets', parent: '1', cls: 'Asset', posting: false },
  { code: '1101', name: 'Cash on hand & petty cash', parent: '11', cls: 'Asset', posting: true, balance: 186_500_000, opening: 142_000_000, sapCode: '11110000' },
  { code: '1102', name: 'Cash at bank', parent: '11', cls: 'Asset', posting: false },
  { code: '1102.01', name: 'Bank Mandiri — operating (H2H)', parent: '1102', cls: 'Asset', posting: true, balance: 18_642_300_000, opening: 21_380_000_000, sapCode: '11120100' },
  { code: '1102.02', name: 'Bank BCA — collections', parent: '1102', cls: 'Asset', posting: true, balance: 6_418_900_000, opening: 4_210_000_000, sapCode: '11120200' },
  { code: '1102.03', name: 'Bank BNI — payroll', parent: '1102', cls: 'Asset', posting: true, balance: 1_215_000_000, opening: 980_000_000, sapCode: '11120300' },
  { code: '1102.04', name: 'Bank BRI — Balikpapan operations', parent: '1102', cls: 'Asset', posting: true, balance: 842_600_000, opening: 610_000_000, sapCode: '11120400' },
  { code: '1103', name: 'Trade receivables', parent: '11', cls: 'Asset', posting: false },
  { code: '1103.01', name: 'Trade receivables — invoiced', parent: '1103', cls: 'Asset', posting: true, balance: 23_746_000_000, opening: 19_860_000_000, sapCode: '11310000', projectRule: 'Mandatory' },
  { code: '1103.02', name: 'Retention receivable', parent: '1103', cls: 'Asset', posting: true, balance: 3_184_500_000, opening: 2_712_000_000, sapCode: '11320000', projectRule: 'Mandatory' },
  { code: '1103.03', name: 'Unbilled revenue (Surat Konversi issued)', parent: '1103', cls: 'Asset', posting: true, balance: 1_238_300_000, opening: 964_000_000, sapCode: '11330000', projectRule: 'Mandatory', note: 'Cleared when the AR invoice is issued — reconciled on the Konversi vs Invoice screen' },
  { code: '1103.09', name: 'Allowance for expected credit loss', parent: '1103', cls: 'Asset', posting: true, balance: -412_000_000, opening: -412_000_000, sapCode: '11390000' },
  { code: '1104', name: 'Inventories', parent: '11', cls: 'Asset', posting: false },
  { code: '1104.01', name: 'Spare parts & consumables', parent: '1104', cls: 'Asset', posting: true, balance: 2_864_000_000, opening: 2_655_000_000, sapCode: '11410000' },
  { code: '1104.02', name: 'Fuel stock (site tanks)', parent: '1104', cls: 'Asset', posting: true, balance: 318_000_000, opening: 402_000_000, sapCode: '11420000' },
  { code: '1105', name: 'Prepaid expenses & advances', parent: '11', cls: 'Asset', posting: false },
  { code: '1105.01', name: 'Prepaid insurance', parent: '1105', cls: 'Asset', posting: true, balance: 1_146_000_000, opening: 1_528_000_000, sapCode: '11510000' },
  { code: '1105.02', name: 'Prepaid certification & permits (SILO, KIR)', parent: '1105', cls: 'Asset', posting: true, balance: 284_000_000, opening: 312_000_000, sapCode: '11520000' },
  { code: '1105.03', name: 'Advances to vendors', parent: '1105', cls: 'Asset', posting: true, balance: 379_500_000, opening: 0, sapCode: '11530000', projectRule: 'Mandatory' },
  { code: '1106', name: 'Prepaid taxes', parent: '11', cls: 'Asset', posting: false },
  { code: '1106.01', name: 'PPN input (VAT in)', parent: '1106', cls: 'Asset', posting: true, balance: 894_200_000, opening: 1_102_000_000, sapCode: '11610000' },
  { code: '1106.02', name: 'Prepaid PPh 23 (withheld by customers)', parent: '1106', cls: 'Asset', posting: true, balance: 1_318_400_000, opening: 846_000_000, sapCode: '11620000' },
  { code: '1106.03', name: 'Prepaid PPh 25 instalments', parent: '1106', cls: 'Asset', posting: true, balance: 1_440_000_000, opening: 960_000_000, sapCode: '11630000' },
  { code: '12', name: 'Non-current assets', parent: '1', cls: 'Asset', posting: false },
  { code: '1201', name: 'Property, plant & equipment — cost', parent: '12', cls: 'Asset', posting: false },
  { code: '1201.01', name: 'Heavy equipment (cranes, SPMT, excavators, forklifts)', parent: '1201', cls: 'Asset', posting: true, balance: faAcc('Heavy Equipment', 'cost'), opening: faAcc('Heavy Equipment', 'cost'), sapCode: '12110000' },
  { code: '1201.02', name: 'Trucks, prime movers & trailers', parent: '1201', cls: 'Asset', posting: true, balance: faAcc('Trucks & Trailers', 'cost'), opening: faAcc('Trucks & Trailers', 'cost'), sapCode: '12120000' },
  { code: '1201.03', name: 'Light vehicles', parent: '1201', cls: 'Asset', posting: true, balance: faAcc('Light Vehicles', 'cost'), opening: faAcc('Light Vehicles', 'cost'), sapCode: '12130000' },
  { code: '1201.04', name: 'Buildings & site facilities', parent: '1201', cls: 'Asset', posting: true, balance: faAcc('Buildings', 'cost'), opening: faAcc('Buildings', 'cost'), sapCode: '12140000' },
  { code: '1201.05', name: 'IT, telematics & office equipment', parent: '1201', cls: 'Asset', posting: true, balance: faAcc('IT & Office Equipment', 'cost'), opening: faAcc('IT & Office Equipment', 'cost'), sapCode: '12150000' },
  { code: '1202', name: 'Accumulated depreciation', parent: '12', cls: 'Asset', posting: false },
  { code: '1202.01', name: 'Acc. depreciation — heavy equipment', parent: '1202', cls: 'Asset', posting: true, balance: faAcc('Heavy Equipment', 'accum'), sapCode: '12210000' },
  { code: '1202.02', name: 'Acc. depreciation — trucks & trailers', parent: '1202', cls: 'Asset', posting: true, balance: faAcc('Trucks & Trailers', 'accum'), sapCode: '12220000' },
  { code: '1202.03', name: 'Acc. depreciation — light vehicles', parent: '1202', cls: 'Asset', posting: true, balance: faAcc('Light Vehicles', 'accum'), sapCode: '12230000' },
  { code: '1202.04', name: 'Acc. depreciation — buildings', parent: '1202', cls: 'Asset', posting: true, balance: faAcc('Buildings', 'accum'), sapCode: '12240000' },
  { code: '1202.05', name: 'Acc. depreciation — IT & office', parent: '1202', cls: 'Asset', posting: true, balance: faAcc('IT & Office Equipment', 'accum'), sapCode: '12250000' },

  { code: '2', name: 'Liabilities', cls: 'Liability', posting: false },
  { code: '21', name: 'Current liabilities', parent: '2', cls: 'Liability', posting: false },
  { code: '2101', name: 'Trade payables', parent: '21', cls: 'Liability', posting: true, balance: 9_864_200_000, opening: 8_420_000_000, sapCode: '21110000' },
  { code: '2102', name: 'GR/IR clearing (received, not invoiced)', parent: '21', cls: 'Liability', posting: true, balance: 3_412_700_000, opening: 2_960_000_000, sapCode: '21120000', projectRule: 'Mandatory', note: 'Cleared by three-way match on invoice posting' },
  { code: '2103', name: 'Accrued expenses', parent: '21', cls: 'Liability', posting: false },
  { code: '2103.01', name: 'Accrued payroll', parent: '2103', cls: 'Liability', posting: true, balance: 2_160_000_000, opening: 1_980_000_000, sapCode: '21310000' },
  { code: '2103.02', name: 'Accrued subcontract & other costs', parent: '2103', cls: 'Liability', posting: true, balance: 846_000_000, opening: 1_214_000_000, sapCode: '21320000', projectRule: 'Mandatory' },
  { code: '2104', name: 'Taxes payable', parent: '21', cls: 'Liability', posting: false },
  { code: '2104.01', name: 'PPN output (VAT out)', parent: '2104', cls: 'Liability', posting: true, balance: 1_382_600_000, opening: 1_146_000_000, sapCode: '21410000' },
  { code: '2104.02', name: 'PPh 21 payable', parent: '2104', cls: 'Liability', posting: true, balance: 412_300_000, opening: 398_000_000, sapCode: '21420000' },
  { code: '2104.03', name: 'PPh 23 payable (withheld from vendors)', parent: '2104', cls: 'Liability', posting: true, balance: 96_800_000, opening: 71_200_000, sapCode: '21430000' },
  { code: '2104.04', name: 'PPh 4(2) payable', parent: '2104', cls: 'Liability', posting: true, balance: 38_400_000, opening: 29_600_000, sapCode: '21440000' },
  { code: '2105', name: 'Customer advances', parent: '21', cls: 'Liability', posting: true, balance: 1_690_000_000, opening: 1_690_000_000, sapCode: '21500000', projectRule: 'Mandatory' },
  { code: '2106', name: 'Current portion of bank loans', parent: '21', cls: 'Liability', posting: true, balance: 4_800_000_000, opening: 4_800_000_000, sapCode: '21600000' },
  { code: '22', name: 'Non-current liabilities', parent: '2', cls: 'Liability', posting: false },
  { code: '2201', name: 'Bank loan — equipment financing (Mandiri)', parent: '22', cls: 'Liability', posting: true, balance: 28_400_000_000, opening: 29_600_000_000, sapCode: '22110000' },
  { code: '2202', name: 'Finance lease liabilities', parent: '22', cls: 'Liability', posting: true, balance: 3_960_000_000, opening: 4_320_000_000, sapCode: '22120000' },
  { code: '2203', name: 'Post-employment benefit obligation', parent: '22', cls: 'Liability', posting: true, balance: 2_740_000_000, opening: 2_740_000_000, sapCode: '22130000' },

  { code: '3', name: 'Equity', cls: 'Equity', posting: false },
  { code: '3101', name: 'Share capital', parent: '3', cls: 'Equity', posting: true, balance: 40_000_000_000, opening: 40_000_000_000, sapCode: '31000000' },
  { code: '3102', name: 'Additional paid-in capital', parent: '3', cls: 'Equity', posting: true, balance: 5_000_000_000, opening: 5_000_000_000, sapCode: '32000000' },
  { code: '3201', name: 'Retained earnings', parent: '3', cls: 'Equity', posting: true, balance: 0, opening: 0, sapCode: '33000000' },
  { code: '3301', name: 'Current year profit (from P/L)', parent: '3', cls: 'Equity', posting: false, note: 'Computed — closed to retained earnings at year end' },

  { code: '4', name: 'Revenue', cls: 'Revenue', posting: false },
  { code: '4101', name: 'Revenue — Heavy Equipment & Logistics', parent: '4', cls: 'Revenue', posting: true, balance: 12_284_000_000, sapCode: '41000000', projectRule: 'Mandatory' },
  { code: '4102', name: 'Revenue — Plant Services', parent: '4', cls: 'Revenue', posting: true, balance: 8_960_000_000, sapCode: '42000000', projectRule: 'Mandatory' },
  { code: '4103', name: 'Revenue — Green Solutions', parent: '4', cls: 'Revenue', posting: true, balance: 3_146_000_000, sapCode: '43000000', projectRule: 'Mandatory' },

  { code: '5', name: 'Cost of revenue', cls: 'Cost of Revenue', posting: false },
  { code: '5101', name: 'Fuel & lubricants', parent: '5', cls: 'Cost of Revenue', posting: true, balance: 4_982_000_000, sapCode: '51100000', projectRule: 'Mandatory' },
  { code: '5102', name: 'Subcontract services', parent: '5', cls: 'Cost of Revenue', posting: true, balance: 5_214_000_000, sapCode: '51200000', projectRule: 'Mandatory' },
  { code: '5103', name: 'Direct labour', parent: '5', cls: 'Cost of Revenue', posting: true, balance: 3_386_000_000, sapCode: '51300000', projectRule: 'Mandatory' },
  { code: '5104', name: 'Depreciation — operating equipment', parent: '5', cls: 'Cost of Revenue', posting: true, balance: 1_210_000_000, sapCode: '51400000', projectRule: 'Mandatory · GEN allowed', note: 'Allocated by operating hours (FAT-26); idle capacity stays on GEN-BPN' },
  { code: '5105', name: 'Spare parts & maintenance', parent: '5', cls: 'Cost of Revenue', posting: true, balance: 1_126_000_000, sapCode: '51500000', projectRule: 'Mandatory · GEN allowed' },
  { code: '5106', name: 'Materials & consumables', parent: '5', cls: 'Cost of Revenue', posting: true, balance: 942_000_000, sapCode: '51600000', projectRule: 'Mandatory' },
  { code: '5107', name: 'Permits, tolls & escort', parent: '5', cls: 'Cost of Revenue', posting: true, balance: 318_000_000, sapCode: '51700000', projectRule: 'Mandatory' },
  { code: '5108', name: 'Equipment rental', parent: '5', cls: 'Cost of Revenue', posting: true, balance: 264_000_000, sapCode: '51800000', projectRule: 'Mandatory' },
  { code: '5109', name: 'Allocated overhead (from GEN)', parent: '5', cls: 'Cost of Revenue', posting: true, balance: 1_412_000_000, sapCode: '—', projectRule: 'Mandatory', note: 'New account at cut-over — receives GEN allocation (FAT-21)' },

  { code: '6', name: 'Operating expenses', cls: 'Operating Expense', posting: false },
  { code: '6101', name: 'Indirect salaries & benefits', parent: '6', cls: 'Operating Expense', posting: true, balance: 2_184_000_000, sapCode: '61100000', projectRule: 'Mandatory · GEN allowed' },
  { code: '6102', name: 'Office & site rent', parent: '6', cls: 'Operating Expense', posting: true, balance: 486_000_000, sapCode: '61200000', projectRule: 'Mandatory · GEN allowed' },
  { code: '6103', name: 'Depreciation — buildings & IT', parent: '6', cls: 'Operating Expense', posting: true, balance: 112_000_000, sapCode: '61300000', projectRule: 'Mandatory · GEN allowed' },
  { code: '6104', name: 'IT, telematics & communications', parent: '6', cls: 'Operating Expense', posting: true, balance: 318_000_000, sapCode: '61400000', projectRule: 'Mandatory · GEN allowed' },
  { code: '6105', name: 'Travel & accommodation', parent: '6', cls: 'Operating Expense', posting: true, balance: 226_000_000, sapCode: '61500000', projectRule: 'Mandatory · GEN allowed' },
  { code: '6106', name: 'Professional fees', parent: '6', cls: 'Operating Expense', posting: true, balance: 184_000_000, sapCode: '61600000', projectRule: 'Mandatory · GEN allowed' },
  { code: '6107', name: 'Insurance', parent: '6', cls: 'Operating Expense', posting: true, balance: 382_000_000, sapCode: '61700000', projectRule: 'Mandatory · GEN allowed' },
  { code: '6108', name: 'HSE & certification', parent: '6', cls: 'Operating Expense', posting: true, balance: 146_000_000, sapCode: '61800000', projectRule: 'Mandatory · GEN allowed' },
  { code: '6199', name: 'Overhead allocated to projects (contra)', parent: '6', cls: 'Operating Expense', posting: true, balance: -1_412_000_000, sapCode: '—', projectRule: 'Mandatory · GEN allowed', note: 'Credit side of the GEN allocation run' },

  { code: '7', name: 'Other income & expenses', cls: 'Other Income & Expense', posting: false },
  { code: '7101', name: 'Interest expense', parent: '7', cls: 'Other Income & Expense', posting: true, balance: 486_000_000, sapCode: '71100000', projectRule: 'Mandatory · GEN allowed' },
  { code: '7102', name: 'Bank charges', parent: '7', cls: 'Other Income & Expense', posting: true, balance: 18_400_000, sapCode: '71200000', projectRule: 'Mandatory · GEN allowed' },
  { code: '7201', name: 'Interest income', parent: '7', cls: 'Other Income & Expense', posting: true, balance: -62_000_000, sapCode: '72100000', projectRule: 'Mandatory · GEN allowed' },

  { code: '8', name: 'Income tax', cls: 'Income Tax', posting: false },
  { code: '8101', name: 'Income tax expense (estimate)', parent: '8', cls: 'Income Tax', posting: true, balance: 580_000_000, sapCode: '81000000', projectRule: 'Mandatory · GEN allowed' },
]

// Opening accumulated depreciation ≈ Feb position less two months of charge
for (const a of raw) if (a.code.startsWith('1202.') && a.balance !== undefined) a.opening = Math.round(a.balance * 0.955)

const leafSum = (pred: (a: Account) => boolean, key: 'balance' | 'opening' = 'balance') => raw.filter((a) => a.posting && pred(a)).reduce((s, a) => s + (a[key] ?? 0), 0)

export const currentYearProfit = () =>
  leafSum((a) => a.cls === 'Revenue') - leafSum((a) => ['Cost of Revenue', 'Operating Expense', 'Other Income & Expense', 'Income Tax'].includes(a.cls))

// Retained earnings is the balancing figure of the migrated opening position
{
  const re = raw.find((a) => a.code === '3201')!
  const assets = leafSum((a) => a.cls === 'Asset')
  const liab = leafSum((a) => a.cls === 'Liability')
  const eqOther = leafSum((a) => a.cls === 'Equity' && a.code !== '3201')
  re.balance = assets - liab - eqOther - currentYearProfit()
  const oAssets = leafSum((a) => a.cls === 'Asset', 'opening')
  const oLiab = leafSum((a) => a.cls === 'Liability', 'opening')
  re.opening = oAssets - oLiab - eqOther
}

for (const a of raw) {
  if (!a.projectRule) a.projectRule = a.cls === 'Asset' || a.cls === 'Liability' || a.cls === 'Equity' ? 'Optional' : 'Mandatory'
  if (!a.ccRule) a.ccRule = ['Revenue', 'Cost of Revenue', 'Operating Expense'].includes(a.cls) ? 'Mandatory' : 'Optional'
}

export const accounts: Account[] = raw
export const getAccount = (code?: string) => accounts.find((a) => a.code === code)

/** Balance of any account incl. headers (sum of leaves) */
export function accountBalance(code: string, key: 'balance' | 'opening' = 'balance'): number {
  if (code === '3301') return key === 'balance' ? currentYearProfit() : 0
  const a = getAccount(code)
  if (!a) return 0
  if (a.posting) return a[key] ?? 0
  return accounts.filter((c) => c.parent === code).reduce((s, c) => s + accountBalance(c.code, key), 0)
}

export const accountLabel = (code: string) => {
  const a = getAccount(code)
  return a ? `${a.code} · ${a.name}` : code
}

export { assetClassAccount }
