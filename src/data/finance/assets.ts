/**
 * M11 Fixed Asset & Depreciation — asset register (loaded from SAP B1 under CUT-02),
 * commercial vs fiscal books (FAT-27) and the operating-hours depreciation allocation (FAT-26).
 */
import { units, type Unit } from '@/data/core'

export type AssetClass = 'Heavy Equipment' | 'Trucks & Trailers' | 'Light Vehicles' | 'Buildings' | 'IT & Office Equipment'

export const assetClassAccount: Record<AssetClass, { cost: string; accum: string; expense: string }> = {
  'Heavy Equipment': { cost: '1201.01', accum: '1202.01', expense: '5104' },
  'Trucks & Trailers': { cost: '1201.02', accum: '1202.02', expense: '5104' },
  'Light Vehicles': { cost: '1201.03', accum: '1202.03', expense: '5104' },
  Buildings: { cost: '1201.04', accum: '1202.04', expense: '6103' },
  'IT & Office Equipment': { cost: '1201.05', accum: '1202.05', expense: '6103' },
}

export interface FixedAsset {
  id: string
  name: string
  cls: AssetClass
  unitId?: string
  location: string
  costCentre: string
  /** First day of acquisition month */
  acquired: string
  cost: number
  status: 'In use' | 'Idle' | 'Under maintenance' | 'Breakdown'
  sapAssetNo: string
  commercial: { method: 'Straight line'; lifeYears: number; residualPct: number }
  fiscal: { group: string; method: 'Declining balance' | 'Straight line'; ratePct: number; lifeYears: number }
  /** Default project code where the asset's charge lands when not unit-driven */
  defaultProject: string
}

const fiscalFor = (cat: Unit['category']): FixedAsset['fiscal'] => {
  if (cat === 'Crane' || cat === 'SPMT' || cat === 'Excavator') return { group: 'Kelompok 3', method: 'Declining balance', ratePct: 12.5, lifeYears: 16 }
  return { group: 'Kelompok 2', method: 'Declining balance', ratePct: 25, lifeYears: 8 }
}
const lifeFor = (cat: Unit['category']): FixedAsset['commercial'] => {
  if (cat === 'Crane' || cat === 'SPMT') return { method: 'Straight line', lifeYears: 15, residualPct: 10 }
  if (cat === 'Excavator') return { method: 'Straight line', lifeYears: 10, residualPct: 10 }
  if (cat === 'Trailer') return { method: 'Straight line', lifeYears: 10, residualPct: 5 }
  if (cat === 'Light Vehicle') return { method: 'Straight line', lifeYears: 5, residualPct: 10 }
  return { method: 'Straight line', lifeYears: 8, residualPct: 10 }
}
const classFor = (cat: Unit['category']): AssetClass =>
  cat === 'Crane' || cat === 'SPMT' || cat === 'Excavator' || cat === 'Forklift' ? 'Heavy Equipment' : cat === 'Light Vehicle' ? 'Light Vehicles' : 'Trucks & Trailers'

const ccForLocation: Record<string, string> = {
  'Kutai Kartanegara': 'CC-210',
  Bekapai: 'CC-220',
  Garut: 'CC-230',
  'Balikpapan Ops': 'CC-250',
  Cilacap: 'CC-310',
  Bontang: 'CC-410',
  'Jakarta HO': 'CC-120',
}

const acqMonth = [3, 7, 5, 10, 2, 8, 11, 4, 6, 1, 9, 12, 5, 3, 7, 2, 10, 6, 4]

const unitAssets: FixedAsset[] = units.map((u, i) => ({
  id: `FA-${u.id}`,
  name: `${u.type} — ${u.make}`,
  cls: classFor(u.category),
  unitId: u.id,
  location: u.location,
  costCentre: ccForLocation[u.location] ?? 'CC-250',
  acquired: `${u.year}-${String(acqMonth[i % acqMonth.length]).padStart(2, '0')}-01`,
  cost: u.acquisitionValue,
  status: u.status === 'Operating' ? 'In use' : u.status === 'Idle' ? 'Idle' : u.status === 'Maintenance' ? 'Under maintenance' : 'Breakdown',
  sapAssetNo: `1000${String(214 + i * 3)}`,
  commercial: lifeFor(u.category),
  fiscal: u.category === 'Light Vehicle' ? { group: 'Kelompok 2', method: 'Declining balance', ratePct: 25, lifeYears: 8 } : fiscalFor(u.category),
  defaultProject: 'GEN-BPN',
}))

const otherAssets: FixedAsset[] = [
  { id: 'FA-BD-001', name: 'Balikpapan workshop & yard building', cls: 'Buildings', location: 'Balikpapan Ops', costCentre: 'CC-250', acquired: '2016-07-01', cost: 6_800_000_000, status: 'In use', sapAssetNo: '2000011', commercial: { method: 'Straight line', lifeYears: 30, residualPct: 0 }, fiscal: { group: 'Permanent building', method: 'Straight line', ratePct: 5, lifeYears: 20 }, defaultProject: 'GEN-BPN' },
  { id: 'FA-BD-002', name: 'Jakarta HO office fit-out (leasehold improvement)', cls: 'Buildings', location: 'Jakarta HO', costCentre: 'CC-120', acquired: '2021-03-01', cost: 1_240_000_000, status: 'In use', sapAssetNo: '2000019', commercial: { method: 'Straight line', lifeYears: 8, residualPct: 0 }, fiscal: { group: 'Non-permanent building', method: 'Straight line', ratePct: 10, lifeYears: 10 }, defaultProject: 'GEN-HO' },
  { id: 'FA-BD-003', name: 'Kutai site office & fuel bay (container units)', cls: 'Buildings', location: 'Kutai Kartanegara', costCentre: 'CC-210', acquired: '2027-06-01', cost: 865_000_000, status: 'In use', sapAssetNo: '2000024', commercial: { method: 'Straight line', lifeYears: 5, residualPct: 0 }, fiscal: { group: 'Non-permanent building', method: 'Straight line', ratePct: 10, lifeYears: 10 }, defaultProject: 'HL-2027-014' },
  { id: 'FA-IT-001', name: 'ERP DR server & storage array', cls: 'IT & Office Equipment', location: 'Jakarta HO', costCentre: 'CC-120', acquired: '2027-06-01', cost: 640_000_000, status: 'In use', sapAssetNo: '3000142', commercial: { method: 'Straight line', lifeYears: 4, residualPct: 0 }, fiscal: { group: 'Kelompok 1', method: 'Declining balance', ratePct: 50, lifeYears: 4 }, defaultProject: 'GEN-HO' },
  { id: 'FA-IT-002', name: 'Laptops & workstations — 2026 refresh (48 units)', cls: 'IT & Office Equipment', location: 'Jakarta HO', costCentre: 'CC-120', acquired: '2026-02-01', cost: 578_000_000, status: 'In use', sapAssetNo: '3000118', commercial: { method: 'Straight line', lifeYears: 4, residualPct: 0 }, fiscal: { group: 'Kelompok 1', method: 'Declining balance', ratePct: 50, lifeYears: 4 }, defaultProject: 'GEN-HO' },
  { id: 'FA-IT-003', name: 'Telematics — GPS, dashcam & fuel stick devices (fleet)', cls: 'IT & Office Equipment', location: 'Balikpapan Ops', costCentre: 'CC-250', acquired: '2025-09-01', cost: 412_000_000, status: 'In use', sapAssetNo: '3000097', commercial: { method: 'Straight line', lifeYears: 4, residualPct: 0 }, fiscal: { group: 'Kelompok 1', method: 'Declining balance', ratePct: 50, lifeYears: 4 }, defaultProject: 'GEN-BPN' },
  { id: 'FA-IT-004', name: 'Field tablets for mobile app (32 units)', cls: 'IT & Office Equipment', location: 'Balikpapan Ops', costCentre: 'CC-250', acquired: '2027-04-01', cost: 224_000_000, status: 'In use', sapAssetNo: '3000151', commercial: { method: 'Straight line', lifeYears: 3, residualPct: 0 }, fiscal: { group: 'Kelompok 1', method: 'Declining balance', ratePct: 50, lifeYears: 4 }, defaultProject: 'GEN-BPN' },
]

export const fixedAssets: FixedAsset[] = [...unitAssets, ...otherAssets]
export const getAsset = (id?: string) => fixedAssets.find((a) => a.id === id)

// ─── Depreciation maths ───────────────────────────────────────────────────────

/** Months of depreciation charged up to and including the given period (YYYY-MM). Starts the month after acquisition. */
function monthsElapsed(acquired: string, periodYm: string) {
  const [ay, am] = acquired.split('-').map(Number)
  const [py, pm] = periodYm.split('-').map(Number)
  return Math.max(0, (py - ay) * 12 + (pm - am))
}

export const monthlyCommercial = (a: FixedAsset) => {
  const months = a.commercial.lifeYears * 12
  const used = monthsElapsed(a.acquired, '2028-03')
  if (used > months) return 0
  return Math.round((a.cost * (1 - a.commercial.residualPct / 100)) / months)
}

export function commercialAccum(a: FixedAsset, periodYm = '2028-02') {
  const months = Math.min(monthsElapsed(a.acquired, periodYm), a.commercial.lifeYears * 12)
  return Math.round(((a.cost * (1 - a.commercial.residualPct / 100)) / (a.commercial.lifeYears * 12)) * months)
}

export function fiscalAccum(a: FixedAsset, periodYm = '2028-02') {
  const [ay, am] = a.acquired.split('-').map(Number)
  const [py, pm] = periodYm.split('-').map(Number)
  if (a.fiscal.method === 'Straight line') {
    const months = Math.min(monthsElapsed(a.acquired, periodYm) + 1, a.fiscal.lifeYears * 12)
    return Math.round((a.cost * a.fiscal.ratePct) / 100 / 12 * months)
  }
  let nbv = a.cost
  for (let y = ay; y <= py; y++) {
    const months = y === ay && y === py ? pm - am + 1 : y === ay ? 13 - am : y === py ? pm : 12
    if (y - ay >= a.fiscal.lifeYears - 1 && y !== py) {
      nbv = 0
      break
    }
    nbv -= (nbv * a.fiscal.ratePct) / 100 * (months / 12)
  }
  return Math.round(a.cost - Math.max(0, nbv))
}

export const monthlyFiscal = (a: FixedAsset) => fiscalAccum(a, '2028-03') - fiscalAccum(a, '2028-02')

// ─── FAT-26 allocation by operating hours ─────────────────────────────────────

/** Standard available hours per unit per month — depreciation per hour = monthly charge / standard hours */
export const STANDARD_HOURS = 200

/** February 2028 operating hours per unit per project code (locked from M15 hour meters / telematics on 29 Feb) */
export const febHours: Record<string, { hours: Record<string, number>; idle: number; maintenance: number }> = {
  'CR-100-01': { hours: { 'HL-2027-014.02': 124 }, idle: 46, maintenance: 0 },
  'CR-100-02': { hours: { 'HL-2027-021': 58 }, idle: 70, maintenance: 30 },
  'CR-200-01': { hours: { 'HL-2027-021': 168 }, idle: 22, maintenance: 0 },
  'CR-050-01': { hours: {}, idle: 186, maintenance: 0 },
  'CR-050-02': { hours: { 'PS-2028-003': 176 }, idle: 14, maintenance: 0 },
  'PM-01': { hours: { 'HL-2027-014.02': 118, 'HL-2028-002': 22 }, idle: 38, maintenance: 0 },
  'PM-02': { hours: { 'HL-2028-002': 132 }, idle: 44, maintenance: 8 },
  'PM-03': { hours: { 'HL-2027-014.02': 88 }, idle: 30, maintenance: 12 },
  'LB-01': { hours: { 'HL-2028-002': 132 }, idle: 50, maintenance: 0 },
  'DT-01': { hours: { 'HL-2027-014.01': 170 }, idle: 16, maintenance: 0 },
  'DT-02': { hours: { 'HL-2027-014.01': 168 }, idle: 18, maintenance: 0 },
  'DT-03': { hours: { 'HL-2027-014.01': 160 }, idle: 20, maintenance: 6 },
  'DT-04': { hours: { 'HL-2027-014.01': 142 }, idle: 12, maintenance: 30 },
  'DT-05': { hours: { 'HL-2027-014.01': 174 }, idle: 10, maintenance: 0 },
  'DT-06': { hours: { 'HL-2027-014.01': 64 }, idle: 118, maintenance: 0 },
  'EX-01': { hours: { 'HL-2027-014.01': 162, 'HL-2027-014.02': 12 }, idle: 14, maintenance: 0 },
  'FL-01': { hours: { 'PS-2028-003': 148 }, idle: 36, maintenance: 0 },
  'SP-01': { hours: { 'HL-2027-021': 64 }, idle: 120, maintenance: 0 },
  'WT-01': { hours: { 'HL-2027-014.01': 120 }, idle: 60, maintenance: 0 },
  'LV-07': { hours: { 'GEN-BPN': 150 }, idle: 30, maintenance: 0 },
}

export interface AllocationRow {
  assetId: string
  unitId?: string
  monthly: number
  ratePerHour: number
  operating: number
  idle: number
  split: { projectCode: string; hours: number; amount: number }[]
  unabsorbed: number
}

/** Allocate each asset's monthly depreciation to project codes by operating hours. Unused capacity stays on GEN-BPN and is not pushed to projects. */
export function allocationFor(periodYm: '2028-02' | '2028-03'): AllocationRow[] {
  return fixedAssets.map((a) => {
    const monthly = monthlyCommercial(a)
    if (!a.unitId) {
      return { assetId: a.id, monthly, ratePerHour: 0, operating: 0, idle: 0, split: [{ projectCode: a.defaultProject, hours: 0, amount: monthly }], unabsorbed: 0 }
    }
    let hours: Record<string, number>
    let idle: number
    if (periodYm === '2028-02') {
      const h = febHours[a.unitId] ?? { hours: {}, idle: 0, maintenance: 0 }
      hours = h.hours
      idle = h.idle
    } else {
      const u = units.find((x) => x.id === a.unitId)!
      hours = u.projectCode && u.hoursMTD.operating ? { [u.projectCode]: u.hoursMTD.operating } : {}
      idle = u.hoursMTD.idle
      if (!u.projectCode && u.hoursMTD.operating) idle += u.hoursMTD.operating
    }
    const total = Object.values(hours).reduce((s, x) => s + x, 0)
    const rate = monthly / Math.max(STANDARD_HOURS, total)
    const split = Object.entries(hours).map(([projectCode, h]) => ({ projectCode, hours: h, amount: Math.round(h * rate) }))
    const allocated = split.reduce((s, x) => s + x.amount, 0)
    return { assetId: a.id, unitId: a.unitId, monthly, ratePerHour: Math.round(rate), operating: total, idle, split, unabsorbed: monthly - allocated }
  })
}

/** Totals per project code (plus idle capacity bucket) */
export function allocationByProject(periodYm: '2028-02' | '2028-03') {
  const rows = allocationFor(periodYm)
  const map = new Map<string, number>()
  let idle = 0
  for (const r of rows) {
    for (const s of r.split) map.set(s.projectCode, (map.get(s.projectCode) ?? 0) + s.amount)
    idle += r.unabsorbed
  }
  return { byProject: [...map.entries()].map(([projectCode, amount]) => ({ projectCode, amount })).sort((a, b) => b.amount - a.amount), idle }
}

export const assetTotals = () => {
  const byClass = new Map<AssetClass, { cost: number; accum: number; fiscalAccum: number }>()
  for (const a of fixedAssets) {
    const c = byClass.get(a.cls) ?? { cost: 0, accum: 0, fiscalAccum: 0 }
    c.cost += a.cost
    c.accum += commercialAccum(a)
    c.fiscalAccum += fiscalAccum(a)
    byClass.set(a.cls, c)
  }
  return byClass
}
