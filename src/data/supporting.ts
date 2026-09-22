/**
 * Supporting modules — M14 Inventory & Warehouse (Stage 1B), M15 Maintenance / EAM (Stage 1A),
 * M16 HSE & Enviro Compliance (Stage 1A). IDs line up with core.ts (units, employees, projects, POs, vendors).
 */
import { employees, units, type Unit } from './core'
import { daysUntil } from '@/lib/format'

// ═══ M14 Inventory & Warehouse ══════════════════════════════════════════════

export interface Warehouse {
  id: string
  name: string
  kind: 'Central warehouse' | 'Site store' | 'Fuel tank'
  location: string
  keeperId: string
  /** Default charging code for stock held (issues carry the consuming project code) */
  defaultCode: string
  capacity?: string
}

export const warehouses: Warehouse[] = [
  { id: 'WH-BPN', name: 'Balikpapan Central Warehouse', kind: 'Central warehouse', location: 'Balikpapan Ops', keeperId: 'EMP-0024', defaultCode: 'GEN-BPN' },
  { id: 'WH-KTI', name: 'Kutai Pit 3 Site Store', kind: 'Site store', location: 'Kutai Kartanegara', keeperId: 'EMP-0006', defaultCode: 'HL-2027-014' },
  { id: 'WH-CLP', name: 'Cilacap Turnaround Store', kind: 'Site store', location: 'Cilacap', keeperId: 'EMP-0029', defaultCode: 'PS-2028-003' },
  { id: 'TNK-KTI-01', name: 'Kutai Fuel Tank T-01 (HSD)', kind: 'Fuel tank', location: 'Kutai Kartanegara', keeperId: 'EMP-0006', defaultCode: 'HL-2027-014.01', capacity: '50,000 L' },
  { id: 'TNK-JTY-01', name: 'Tanjung Jetty Fuel Tank (HSD)', kind: 'Fuel tank', location: 'Kutai Kartanegara', keeperId: 'EMP-0006', defaultCode: 'HL-2027-014.01', capacity: '20,000 L' },
  { id: 'TNK-BPN-01', name: 'Balikpapan Yard Fuel Tank (HSD)', kind: 'Fuel tank', location: 'Balikpapan Ops', keeperId: 'EMP-0024', defaultCode: 'GEN-BPN', capacity: '30,000 L' },
]

export type ItemCategory = 'Spare Parts' | 'Filters' | 'Lubricants' | 'Fuel' | 'Tyres' | 'Consumables' | 'PPE' | 'Rigging'

export interface Item {
  id: string
  name: string
  category: ItemCategory
  uom: string
  /** Moving-average unit cost (IDR) */
  avgCost: number
  reorderPoint: number
  partNo?: string
  /** Units / models this part fits */
  fits?: string
  stock: Record<string, number>
}

export const items: Item[] = [
  { id: 'ITM-10021', name: 'Engine oil filter — Volvo D13', category: 'Filters', uom: 'pcs', avgCost: 685_000, reorderPoint: 12, partNo: 'VOE 21707134', fits: 'PM-01, PM-03', stock: { 'WH-BPN': 18, 'WH-KTI': 6 } },
  { id: 'ITM-10022', name: 'Fuel filter kit — Scania DC13', category: 'Filters', uom: 'kit', avgCost: 1_240_000, reorderPoint: 10, partNo: 'SCN 2020803', fits: 'DT-01, DT-02, DT-05, DT-06', stock: { 'WH-BPN': 9, 'WH-KTI': 4 } },
  { id: 'ITM-10035', name: 'Air filter element — Hino FM', category: 'Filters', uom: 'pcs', avgCost: 910_000, reorderPoint: 6, partNo: 'HNO 17801-E0010', fits: 'DT-03, DT-04, WT-01', stock: { 'WH-BPN': 5, 'WH-KTI': 2 } },
  { id: 'ITM-10048', name: 'PM 1000 hr service kit — Tadano/Kato crane', category: 'Spare Parts', uom: 'kit', avgCost: 14_850_000, reorderPoint: 2, partNo: 'PMK-CR100-1000', fits: 'CR-100-01, CR-100-02', stock: { 'WH-BPN': 3 } },
  { id: 'ITM-10052', name: 'Wire rope 22 mm × 250 m (hoist)', category: 'Rigging', uom: 'roll', avgCost: 48_500_000, reorderPoint: 1, partNo: 'WR-22-35x7', fits: 'CR-100-01, CR-100-02', stock: { 'WH-BPN': 1 } },
  { id: 'ITM-10060', name: 'Brake chamber type 30/30', category: 'Spare Parts', uom: 'pcs', avgCost: 2_750_000, reorderPoint: 8, partNo: 'BC-3030-SP', fits: 'Dump truck fleet', stock: { 'WH-BPN': 4, 'WH-KTI': 2 } },
  { id: 'ITM-10061', name: 'Air dryer cartridge', category: 'Spare Parts', uom: 'pcs', avgCost: 1_180_000, reorderPoint: 6, partNo: 'AD-4324102227', fits: 'Dump truck & prime mover fleet', stock: { 'WH-BPN': 3, 'WH-KTI': 1 } },
  { id: 'ITM-10074', name: 'Turbocharger assy — Volvo D13', category: 'Spare Parts', uom: 'pcs', avgCost: 38_900_000, reorderPoint: 0, partNo: 'VOE 22479125', fits: 'PM-01, PM-03', stock: { 'WH-BPN': 0 } },
  { id: 'ITM-20011', name: 'Engine oil SAE 15W-40 (drum 209 L)', category: 'Lubricants', uom: 'drum', avgCost: 9_650_000, reorderPoint: 6, fits: 'Fleet', stock: { 'WH-BPN': 11, 'WH-KTI': 4, 'WH-CLP': 1 } },
  { id: 'ITM-20014', name: 'Hydraulic oil ISO VG 46 (drum 209 L)', category: 'Lubricants', uom: 'drum', avgCost: 8_900_000, reorderPoint: 4, fits: 'Cranes, excavator', stock: { 'WH-BPN': 6, 'WH-KTI': 2 } },
  { id: 'ITM-30001', name: 'HSD / B40 biodiesel', category: 'Fuel', uom: 'L', avgCost: 13_700, reorderPoint: 15_000, fits: 'Fleet', stock: { 'TNK-KTI-01': 31_640, 'TNK-JTY-01': 8_450, 'TNK-BPN-01': 12_880 } },
  { id: 'ITM-40002', name: 'Tyre 12.00R24 (mining lug)', category: 'Tyres', uom: 'pcs', avgCost: 7_950_000, reorderPoint: 8, fits: 'Dump truck fleet', stock: { 'WH-BPN': 6, 'WH-KTI': 4 } },
  { id: 'ITM-50010', name: 'Ceramic support balls 1/4" (bag 25 kg)', category: 'Consumables', uom: 'bag', avgCost: 1_850_000, reorderPoint: 40, fits: 'Catalyst loading', stock: { 'WH-CLP': 64 } },
  { id: 'ITM-50014', name: 'Nitrogen-rated breathing air hose 30 m', category: 'Consumables', uom: 'pcs', avgCost: 4_200_000, reorderPoint: 6, fits: 'Catalyst loading (inert entry)', stock: { 'WH-CLP': 8 } },
  { id: 'ITM-60003', name: 'Coverall FR + reflective (size mix)', category: 'PPE', uom: 'pcs', avgCost: 485_000, reorderPoint: 40, fits: 'All sites', stock: { 'WH-BPN': 52, 'WH-KTI': 18, 'WH-CLP': 22 } },
  { id: 'ITM-60009', name: 'Full-body harness + double lanyard', category: 'PPE', uom: 'set', avgCost: 2_350_000, reorderPoint: 10, fits: 'All sites', stock: { 'WH-BPN': 7, 'WH-KTI': 6, 'WH-CLP': 12 } },
]

export const totalStock = (it: Item) => Object.values(it.stock).reduce((a, b) => a + b, 0)
export const stockValue = (it: Item) => totalStock(it) * it.avgCost
export const getItem = (id?: string) => items.find((i) => i.id === id)
export const getWarehouse = (id?: string) => warehouses.find((w) => w.id === id)

export type MovementType = 'Receipt' | 'Issue' | 'Transfer' | 'Adjustment' | 'Return'

export interface Movement {
  id: string
  date: string
  type: MovementType
  itemId: string
  warehouseId: string
  toWarehouseId?: string
  qty: number
  unitCost: number
  /** Every receipt and issue carries a project code (FAT-18) */
  projectCode: string
  /** PO for receipts, WO / job for issues, count for adjustments */
  ref: string
  byId: string
  /** Moving average after this movement (receipts recompute it) */
  avgAfter: number
  journal?: string
}

export const movements: Movement[] = [
  { id: 'MV-28-03-0441', date: '2028-03-10', type: 'Issue', itemId: 'ITM-30001', warehouseId: 'TNK-KTI-01', qty: -3_860, unitCost: 13_700, projectCode: 'HL-2027-014.01', ref: 'JO-28-03-0412', byId: 'EMP-0006', avgAfter: 13_700, journal: 'JV-2028-03-0311' },
  { id: 'MV-28-03-0436', date: '2028-03-09', type: 'Issue', itemId: 'ITM-10060', warehouseId: 'WH-KTI', qty: -2, unitCost: 2_750_000, projectCode: 'HL-2027-014.01', ref: 'WO-2028-0147', byId: 'EMP-0024', avgAfter: 2_750_000, journal: 'JV-2028-03-0297' },
  { id: 'MV-28-03-0430', date: '2028-03-08', type: 'Receipt', itemId: 'ITM-30001', warehouseId: 'TNK-KTI-01', qty: 16_000, unitCost: 13_700, projectCode: 'HL-2027-014.01', ref: 'PO-2028-0195', byId: 'EMP-0006', avgAfter: 13_700, journal: 'JV-2028-03-0284' },
  { id: 'MV-28-03-0427', date: '2028-03-08', type: 'Issue', itemId: 'ITM-10048', warehouseId: 'WH-BPN', qty: -1, unitCost: 14_850_000, projectCode: 'GEN-BPN', ref: 'WO-2028-0142', byId: 'EMP-0024', avgAfter: 14_850_000, journal: 'JV-2028-03-0281' },
  { id: 'MV-28-03-0424', date: '2028-03-07', type: 'Issue', itemId: 'ITM-20014', warehouseId: 'WH-BPN', qty: -2, unitCost: 8_900_000, projectCode: 'GEN-BPN', ref: 'WO-2028-0142', byId: 'EMP-0024', avgAfter: 8_900_000, journal: 'JV-2028-03-0280' },
  { id: 'MV-28-03-0418', date: '2028-03-06', type: 'Transfer', itemId: 'ITM-10022', warehouseId: 'WH-BPN', toWarehouseId: 'WH-KTI', qty: 4, unitCost: 1_240_000, projectCode: 'HL-2027-014', ref: 'TR-2028-0031', byId: 'EMP-0024', avgAfter: 1_240_000 },
  { id: 'MV-28-03-0412', date: '2028-03-05', type: 'Issue', itemId: 'ITM-50010', warehouseId: 'WH-CLP', qty: -36, unitCost: 1_850_000, projectCode: 'PS-2028-003', ref: 'JO-28-03-0409', byId: 'EMP-0029', avgAfter: 1_850_000, journal: 'JV-2028-03-0262' },
  { id: 'MV-28-03-0405', date: '2028-03-04', type: 'Issue', itemId: 'ITM-60009', warehouseId: 'WH-CLP', qty: -6, unitCost: 2_350_000, projectCode: 'PS-2028-003', ref: 'JO-28-03-0409', byId: 'EMP-0029', avgAfter: 2_350_000, journal: 'JV-2028-03-0255' },
  { id: 'MV-28-03-0398', date: '2028-03-03', type: 'Receipt', itemId: 'ITM-30001', warehouseId: 'TNK-KTI-01', qty: 16_000, unitCost: 13_700, projectCode: 'HL-2027-014.01', ref: 'PO-2028-0195', byId: 'EMP-0006', avgAfter: 13_700, journal: 'JV-2028-03-0241' },
  { id: 'MV-28-03-0391', date: '2028-03-02', type: 'Issue', itemId: 'ITM-10035', warehouseId: 'WH-KTI', qty: -1, unitCost: 910_000, projectCode: 'HL-2027-014.01', ref: 'WO-2028-0136', byId: 'EMP-0024', avgAfter: 910_000, journal: 'JV-2028-03-0233' },
  { id: 'MV-28-02-0377', date: '2028-02-28', type: 'Adjustment', itemId: 'ITM-60003', warehouseId: 'WH-KTI', qty: -2, unitCost: 485_000, projectCode: 'HL-2027-014', ref: 'SC-2028-02-KTI', byId: 'EMP-0006', avgAfter: 485_000, journal: 'JV-2028-02-0911' },
  { id: 'MV-28-02-0360', date: '2028-02-24', type: 'Receipt', itemId: 'ITM-40002', warehouseId: 'WH-BPN', qty: 8, unitCost: 8_050_000, projectCode: 'GEN-BPN', ref: 'PO-2028-0176', byId: 'EMP-0024', avgAfter: 7_950_000, journal: 'JV-2028-02-0874' },
  { id: 'MV-28-02-0342', date: '2028-02-07', type: 'Receipt', itemId: 'ITM-10048', warehouseId: 'WH-BPN', qty: 4, unitCost: 14_850_000, projectCode: 'GEN-BPN', ref: 'PO-2028-0176', byId: 'EMP-0024', avgAfter: 14_850_000, journal: 'JV-2028-02-0402' },
  { id: 'MV-28-02-0341', date: '2028-02-07', type: 'Receipt', itemId: 'ITM-10021', warehouseId: 'WH-BPN', qty: 24, unitCost: 695_000, projectCode: 'GEN-BPN', ref: 'PO-2028-0176', byId: 'EMP-0024', avgAfter: 685_000, journal: 'JV-2028-02-0402' },
  { id: 'MV-28-02-0330', date: '2028-02-05', type: 'Return', itemId: 'ITM-50014', warehouseId: 'WH-CLP', qty: 2, unitCost: 4_200_000, projectCode: 'PS-2028-003', ref: 'JO-28-02-0266', byId: 'EMP-0029', avgAfter: 4_200_000, journal: 'JV-2028-02-0389' },
]

export interface StockCountLine {
  itemId: string
  system: number
  counted: number | null
}

export interface StockCount {
  id: string
  warehouseId: string
  date: string
  kind: 'Cycle count' | 'Full count' | 'Tank dip'
  status: 'Planned' | 'In Progress' | 'Pending Approval' | 'Posted'
  counterId: string
  lines: StockCountLine[]
}

export const stockCounts: StockCount[] = [
  {
    id: 'SC-2028-03-BPN', warehouseId: 'WH-BPN', date: '2028-03-10', kind: 'Cycle count', status: 'In Progress', counterId: 'EMP-0024',
    lines: [
      { itemId: 'ITM-10021', system: 18, counted: 18 },
      { itemId: 'ITM-10022', system: 9, counted: 8 },
      { itemId: 'ITM-10060', system: 4, counted: 4 },
      { itemId: 'ITM-10061', system: 3, counted: null },
      { itemId: 'ITM-20011', system: 11, counted: null },
      { itemId: 'ITM-40002', system: 6, counted: null },
    ],
  },
  {
    id: 'SC-2028-03-TNK', warehouseId: 'TNK-KTI-01', date: '2028-03-09', kind: 'Tank dip', status: 'Pending Approval', counterId: 'EMP-0006',
    lines: [{ itemId: 'ITM-30001', system: 35_500, counted: 35_180 }],
  },
  {
    id: 'SC-2028-02-KTI', warehouseId: 'WH-KTI', date: '2028-02-28', kind: 'Full count', status: 'Posted', counterId: 'EMP-0006',
    lines: [
      { itemId: 'ITM-60003', system: 20, counted: 18 },
      { itemId: 'ITM-10021', system: 6, counted: 6 },
      { itemId: 'ITM-20011', system: 4, counted: 4 },
    ],
  },
  { id: 'SC-2028-03-CLP', warehouseId: 'WH-CLP', date: '2028-03-14', kind: 'Cycle count', status: 'Planned', counterId: 'EMP-0029', lines: [] },
]

// ═══ M15 Maintenance / EAM ══════════════════════════════════════════════════

export type WOType = 'Preventive' | 'Corrective' | 'Breakdown' | 'Inspection'
export type WOStatus = 'Open' | 'Awaiting Approval' | 'Planned' | 'In Progress' | 'Awaiting Parts' | 'Completed' | 'Closed'

export interface WorkOrder {
  id: string
  unitId: string
  type: WOType
  title: string
  status: WOStatus
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  opened: string
  due: string
  closed?: string
  meterAtOpen: number
  assigneeId: string
  /** Maintenance cost goes to GEN-BPN (workshop) or the project the unit is committed to */
  projectCode: string
  downtimeStart?: string
  downtimeEnd?: string
  downtimeHrs: number
  pmPlan?: string
  symptom?: string
  cause?: string
  tasks: { text: string; done: boolean }[]
  parts: { itemId: string; qty: number; unitCost: number; issueRef?: string; status: 'Issued' | 'Reserved' | 'On order' }[]
  labour: { empId: string; hrs: number; rate: number }[]
  external?: { vendorId: string; po: string; amount: number; desc: string }
  log: { time: string; text: string; tone?: 'slate' | 'blue' | 'amber' | 'green' | 'red' }[]
}

export const workOrders: WorkOrder[] = [
  {
    id: 'WO-2028-0142', unitId: 'CR-100-02', type: 'Preventive', title: 'PM 1000 hr service + pre-SILO inspection readiness', status: 'In Progress', priority: 'High',
    opened: '2028-03-06', due: '2028-03-15', meterAtOpen: 16_218, assigneeId: 'EMP-0012', projectCode: 'GEN-BPN', downtimeStart: '2028-03-06T07:00', downtimeHrs: 44, pmPlan: 'PM-CR-1000',
    symptom: 'Scheduled service at 16,000 hr interval (+218 hr overrun). SILO re-inspection due 22 Mar 2028 — unit must pass load test.',
    tasks: [
      { text: 'Replace engine oil, oil & fuel filters', done: true },
      { text: 'Replace hydraulic return filters; sample hydraulic oil', done: true },
      { text: 'Inspect hoist wire rope — measure diameter & broken wires', done: true },
      { text: 'Replace hoist wire rope (diameter reduction 7.2% > 5% limit)', done: false },
      { text: 'Check LMI / overload limiter calibration', done: false },
      { text: 'Boom slide pads & pin lubrication', done: true },
      { text: 'Prepare load-test weights for Riksa Uji inspector (22 Mar)', done: false },
    ],
    parts: [
      { itemId: 'ITM-10048', qty: 1, unitCost: 14_850_000, issueRef: 'MV-28-03-0427', status: 'Issued' },
      { itemId: 'ITM-20014', qty: 2, unitCost: 8_900_000, issueRef: 'MV-28-03-0424', status: 'Issued' },
      { itemId: 'ITM-10052', qty: 1, unitCost: 48_500_000, status: 'Reserved' },
    ],
    labour: [
      { empId: 'EMP-0024', hrs: 26, rate: 185_000 },
      { empId: 'EMP-0012', hrs: 6, rate: 310_000 },
    ],
    log: [
      { time: '2028-03-06T07:00', text: 'WO generated automatically by PM plan PM-CR-1000 at meter 16,218 hr', tone: 'blue' },
      { time: '2028-03-06T07:05', text: 'Unit status set to Maintenance — removed from planning board availability', tone: 'amber' },
      { time: '2028-03-07T14:20', text: 'Hydraulic oil issued (2 drums) from WH-BPN', tone: 'slate' },
      { time: '2028-03-08T10:10', text: 'Wire rope measured 20.4 mm (7.2% reduction) — replacement required', tone: 'red' },
      { time: '2028-03-08T10:40', text: 'Wire rope reserved from WH-BPN stock', tone: 'slate' },
    ],
  },
  {
    id: 'WO-2028-0151', unitId: 'PM-03', type: 'Breakdown', title: 'Turbocharger replacement — loss of power & black smoke', status: 'Awaiting Approval', priority: 'Critical',
    opened: '2028-03-08', due: '2028-03-13', meterAtOpen: 188_904, assigneeId: 'EMP-0024', projectCode: 'GEN-BPN', downtimeStart: '2028-03-08T13:40', downtimeHrs: 44,
    symptom: 'Driver reported via mobile app: loss of power on incline KM 18, black smoke, boost pressure warning. Unit towed to Kutai workshop.',
    cause: 'Turbocharger compressor wheel damaged — bearing wear; intercooler hose split, exhaust manifold gasket blown. Intake hose clamp found loose (possible dust ingress).',
    tasks: [
      { text: 'Tow unit to Kutai field workshop', done: true },
      { text: 'Diagnostic scan — fault codes & boost pressure test', done: true },
      { text: 'Remove turbocharger, inspect intake tract & intercooler', done: true },
      { text: 'Install new turbocharger assy (OEM field service)', done: false },
      { text: 'Replace intercooler hoses & exhaust manifold gaskets', done: false },
      { text: 'Replace intake hose clamps; check air filter housing seal', done: false },
      { text: 'Road test 20 km loaded', done: false },
    ],
    parts: [
      { itemId: 'ITM-10074', qty: 1, unitCost: 38_900_000, status: 'On order' },
      { itemId: 'ITM-10021', qty: 1, unitCost: 685_000, status: 'Reserved' },
    ],
    labour: [{ empId: 'EMP-0024', hrs: 9, rate: 185_000 }],
    external: { vendorId: 'VND-00177', po: 'PR-2028-0258', amount: 104_750_000, desc: 'OEM field service — turbo, intercooler & exhaust manifold replacement (quotation Q-UTP-28-0311)' },
    log: [
      { time: '2028-03-08T13:40', text: 'Breakdown reported by driver from mobile app (offline, synced 13:52)', tone: 'red' },
      { time: '2028-03-08T14:05', text: 'WO created by Site Leader; unit set to Breakdown', tone: 'amber' },
      { time: '2028-03-08T14:06', text: 'Planning board: JO-28-03-0415 support move reassigned to PM-01', tone: 'slate' },
      { time: '2028-03-09T11:20', text: 'Diagnosis complete — estimate IDR 146.0 m (parts, labour, OEM field service)', tone: 'slate' },
      { time: '2028-03-09T16:00', text: 'Estimate above IDR 100 m workshop limit — routed to Maintenance Superintendent & Finance Director for approval', tone: 'amber' },
    ],
  },
  {
    id: 'WO-2028-0147', unitId: 'DT-04', type: 'Corrective', title: 'Air brake pressure drop — replace brake chambers & air dryer', status: 'In Progress', priority: 'High',
    opened: '2028-03-09', due: '2028-03-11', meterAtOpen: 342_740, assigneeId: 'EMP-0024', projectCode: 'HL-2027-014.01', downtimeStart: '2028-03-09T06:30', downtimeHrs: 27,
    symptom: 'P2H pre-start check failed: air pressure build-up > 3 min, audible leak at rear axle.',
    cause: 'Rear brake chamber diaphragms ruptured (2); air dryer cartridge saturated.',
    tasks: [
      { text: 'Leak test & locate', done: true },
      { text: 'Replace 2 × rear brake chambers', done: true },
      { text: 'Replace air dryer cartridge', done: false },
      { text: 'Brake performance test & P2H re-check', done: false },
    ],
    parts: [
      { itemId: 'ITM-10060', qty: 2, unitCost: 2_750_000, issueRef: 'MV-28-03-0436', status: 'Issued' },
      { itemId: 'ITM-10061', qty: 1, unitCost: 1_180_000, status: 'Reserved' },
    ],
    labour: [{ empId: 'EMP-0024', hrs: 7, rate: 185_000 }],
    log: [
      { time: '2028-03-09T06:30', text: 'P2H checklist failed on mobile app — WO auto-raised', tone: 'red' },
      { time: '2028-03-09T06:31', text: 'DT-04 removed from shift A dispatch (JO-28-03-0412)', tone: 'amber' },
      { time: '2028-03-09T11:15', text: 'Brake chambers issued from Kutai site store', tone: 'slate' },
    ],
  },
  {
    id: 'WO-2028-0146', unitId: 'CR-050-01', type: 'Inspection', title: 'SILO re-certification (Riksa Uji) — expired 28 Feb 2028', status: 'Planned', priority: 'High',
    opened: '2028-03-01', due: '2028-03-16', meterAtOpen: 8_915, assigneeId: 'EMP-0012', projectCode: 'GEN-BPN', downtimeHrs: 0,
    symptom: 'SILO certificate SILO/K3/2026/1123 lapsed. Unit blocked from assignment until the PJK3 inspection passes.',
    tasks: [
      { text: 'Book PJK3 inspector (PT Riksa Uji Nusantara)', done: true },
      { text: 'Pre-inspection checklist & load chart verification', done: false },
      { text: 'Load test at 125% SWL', done: false },
      { text: 'Upload new certificate & update registry', done: false },
    ],
    parts: [],
    labour: [{ empId: 'EMP-0012', hrs: 2, rate: 310_000 }],
    external: { vendorId: 'VND-00203', po: 'PO-2028-0183', amount: 18_500_000, desc: 'PJK3 inspection & Disnaker filing fee' },
    log: [
      { time: '2028-02-01T08:00', text: '30-day expiry alert sent to Maintenance Superintendent & HSE Manager', tone: 'amber' },
      { time: '2028-02-28T23:59', text: 'Certificate expired — unit set to Blocked for assignment', tone: 'red' },
      { time: '2028-03-01T09:12', text: 'Inspection WO created; inspector booked for 16 Mar', tone: 'blue' },
    ],
  },
  {
    id: 'WO-2028-0136', unitId: 'DT-03', type: 'Preventive', title: 'PM service 10,000 km — Hino FM 350', status: 'Closed', priority: 'Medium',
    opened: '2028-03-01', due: '2028-03-02', closed: '2028-03-02', meterAtOpen: 336_980, assigneeId: 'EMP-0024', projectCode: 'HL-2027-014.01', downtimeStart: '2028-03-02T05:00', downtimeEnd: '2028-03-02T11:00', downtimeHrs: 6, pmPlan: 'PM-DT-10K',
    tasks: [
      { text: 'Engine oil & filter change', done: true },
      { text: 'Replace air filter element', done: true },
      { text: 'Grease all points; check tyre pressure', done: true },
    ],
    parts: [
      { itemId: 'ITM-10035', qty: 1, unitCost: 910_000, issueRef: 'MV-28-03-0391', status: 'Issued' },
      { itemId: 'ITM-20011', qty: 0.1, unitCost: 9_650_000, status: 'Issued' },
    ],
    labour: [{ empId: 'EMP-0024', hrs: 5, rate: 185_000 }],
    log: [
      { time: '2028-03-01T18:00', text: 'WO generated by PM plan at 336,980 km', tone: 'blue' },
      { time: '2028-03-02T11:00', text: 'Completed; unit returned to Operating', tone: 'green' },
    ],
  },
  {
    id: 'WO-2028-0131', unitId: 'EX-01', type: 'Preventive', title: 'PM 500 hr service — Komatsu PC300', status: 'Closed', priority: 'Medium',
    opened: '2028-02-22', due: '2028-02-24', closed: '2028-02-23', meterAtOpen: 12_000, assigneeId: 'EMP-0024', projectCode: 'HL-2027-014.01', downtimeStart: '2028-02-23T06:00', downtimeEnd: '2028-02-23T14:00', downtimeHrs: 8, pmPlan: 'PM-EX-500',
    tasks: [
      { text: 'Engine oil, filters & hydraulic filter', done: true },
      { text: 'Swing circle greasing, track tension', done: true },
    ],
    parts: [{ itemId: 'ITM-20014', qty: 1, unitCost: 8_900_000, status: 'Issued' }],
    labour: [{ empId: 'EMP-0024', hrs: 7, rate: 185_000 }],
    log: [{ time: '2028-02-23T14:00', text: 'Completed; meter 12,006 hr', tone: 'green' }],
  },
  {
    id: 'WO-2028-0127', unitId: 'CR-200-01', type: 'Corrective', title: 'Slew brake adjustment & hydraulic hose replacement', status: 'Closed', priority: 'High',
    opened: '2028-02-15', due: '2028-02-16', closed: '2028-02-16', meterAtOpen: 6_302, assigneeId: 'EMP-0012', projectCode: 'HL-2027-021', downtimeStart: '2028-02-15T10:00', downtimeEnd: '2028-02-16T09:00', downtimeHrs: 23,
    cause: 'Hose chafing at slew ring guard.',
    tasks: [{ text: 'Replace hose & add chafe guard', done: true }, { text: 'Adjust slew brake; functional test', done: true }],
    parts: [],
    labour: [{ empId: 'EMP-0012', hrs: 10, rate: 310_000 }],
    log: [{ time: '2028-02-16T09:00', text: 'Completed; client notified of standby hours', tone: 'green' }],
  },
  {
    id: 'WO-2028-0149', unitId: 'FL-01', type: 'Inspection', title: 'SILO renewal inspection — forklift (expires 02 Apr)', status: 'Open', priority: 'Medium',
    opened: '2028-03-03', due: '2028-03-25', meterAtOpen: 5_600, assigneeId: 'EMP-0012', projectCode: 'PS-2028-003', downtimeHrs: 0,
    tasks: [{ text: 'Schedule inspector at Cilacap site (outside shift)', done: false }, { text: 'Upload certificate', done: false }],
    parts: [], labour: [],
    log: [{ time: '2028-03-03T08:00', text: '30-day tier alert → inspection WO raised automatically', tone: 'amber' }],
  },
  {
    id: 'WO-2028-0150', unitId: 'DT-01', type: 'Preventive', title: 'PM service 10,000 km — Scania P410', status: 'Planned', priority: 'Medium',
    opened: '2028-03-09', due: '2028-03-13', meterAtOpen: 246_880, assigneeId: 'EMP-0024', projectCode: 'HL-2027-014.01', downtimeHrs: 0, pmPlan: 'PM-DT-10K',
    tasks: [{ text: 'Engine oil & fuel filter kit', done: false }, { text: 'Brake & tyre inspection', done: false }],
    parts: [{ itemId: 'ITM-10022', qty: 1, unitCost: 1_240_000, status: 'Reserved' }, { itemId: 'ITM-20011', qty: 0.2, unitCost: 9_650_000, status: 'Reserved' }],
    labour: [],
    log: [{ time: '2028-03-09T18:00', text: 'Generated at 90% of interval (246,880 km); slotted into Sunday shift gap', tone: 'blue' }],
  },
]

export const getWorkOrder = (id?: string) => workOrders.find((w) => w.id === id)
export const woPartsCost = (w: WorkOrder) => w.parts.reduce((a, p) => a + p.qty * p.unitCost, 0)
export const woLabourCost = (w: WorkOrder) => w.labour.reduce((a, l) => a + l.hrs * l.rate, 0)
export const woTotalCost = (w: WorkOrder) => woPartsCost(w) + woLabourCost(w) + (w.external?.amount ?? 0)

export interface PmPlan {
  id: string
  unitId: string
  name: string
  basis: 'hrs' | 'km' | 'days'
  interval: number
  lastMeter: number
  lastDate: string
  /** Estimated usage per day for due-date projection */
  dailyUsage: number
  taskList: string
}

export const pmPlans: PmPlan[] = [
  { id: 'PM-CR-250', unitId: 'CR-100-01', name: 'Crane 250 hr service', basis: 'hrs', interval: 250, lastMeter: 11_750, lastDate: '2028-02-14', dailyUsage: 5.5, taskList: 'Engine oil top-up, grease boom & hook block, wire rope visual' },
  { id: 'PM-CR-1000', unitId: 'CR-100-02', name: 'Crane 1000 hr service', basis: 'hrs', interval: 1000, lastMeter: 15_000, lastDate: '2027-08-19', dailyUsage: 5, taskList: 'Full oil & filter set, hydraulic sampling, wire rope measure, LMI calibration' },
  { id: 'PM-CR200-500', unitId: 'CR-200-01', name: 'Crawler crane 500 hr service', basis: 'hrs', interval: 500, lastMeter: 6_000, lastDate: '2027-12-18', dailyUsage: 4.6, taskList: 'Engine & swing gearbox oil, track tension, boom inspection' },
  { id: 'PM-CR50-500', unitId: 'CR-050-02', name: 'RT crane 500 hr service', basis: 'hrs', interval: 500, lastMeter: 3_700, lastDate: '2028-01-12', dailyUsage: 6.2, taskList: 'Oil & filters, outrigger cylinders, slew bearing grease' },
  { id: 'PM-EX-250', unitId: 'EX-01', name: 'Excavator 250 hr service', basis: 'hrs', interval: 250, lastMeter: 12_250, lastDate: '2028-03-01', dailyUsage: 6.8, taskList: 'Grease, engine oil level, bucket teeth' },
  { id: 'PM-EX-500', unitId: 'EX-01', name: 'Excavator 500 hr service', basis: 'hrs', interval: 500, lastMeter: 12_000, lastDate: '2028-02-23', dailyUsage: 6.8, taskList: 'Engine oil & filters, hydraulic return filter' },
  { id: 'PM-FL-250', unitId: 'FL-01', name: 'Forklift 250 hr service', basis: 'hrs', interval: 250, lastMeter: 5_340, lastDate: '2028-02-06', dailyUsage: 5.2, taskList: 'Engine oil, mast chains, forks inspection' },
  { id: 'PM-SP-500', unitId: 'SP-01', name: 'SPMT 500 hr service', basis: 'hrs', interval: 500, lastMeter: 2_000, lastDate: '2028-01-25', dailyUsage: 2.1, taskList: 'Power pack oil, suspension cylinders, steering' },
  { id: 'PM-PM-15K', unitId: 'PM-01', name: 'Prime mover 15,000 km service', basis: 'km', interval: 15_000, lastMeter: 300_200, lastDate: '2028-01-20', dailyUsage: 240, taskList: 'Oil & filters, fifth-wheel, brake adjust' },
  { id: 'PM-PM2-15K', unitId: 'PM-02', name: 'Prime mover 15,000 km service', basis: 'km', interval: 15_000, lastMeter: 387_000, lastDate: '2028-01-05', dailyUsage: 210, taskList: 'Oil & filters, fifth-wheel, brake adjust' },
  { id: 'PM-DT-10K', unitId: 'DT-01', name: 'Dump truck 10,000 km service', basis: 'km', interval: 10_000, lastMeter: 237_000, lastDate: '2028-02-05', dailyUsage: 280, taskList: 'Oil & fuel filters, brakes, tyres' },
  { id: 'PM-DT2-10K', unitId: 'DT-02', name: 'Dump truck 10,000 km service', basis: 'km', interval: 10_000, lastMeter: 241_000, lastDate: '2028-02-04', dailyUsage: 280, taskList: 'Oil & fuel filters, brakes, tyres' },
  { id: 'PM-DT3-10K', unitId: 'DT-03', name: 'Dump truck 10,000 km service', basis: 'km', interval: 10_000, lastMeter: 336_980, lastDate: '2028-03-02', dailyUsage: 270, taskList: 'Oil & fuel filters, brakes, tyres' },
  { id: 'PM-DT5-10K', unitId: 'DT-05', name: 'Dump truck 10,000 km service', basis: 'km', interval: 10_000, lastMeter: 90_100, lastDate: '2028-02-12', dailyUsage: 290, taskList: 'Oil & fuel filters, brakes, tyres' },
  { id: 'PM-WT-10K', unitId: 'WT-01', name: 'Water truck 10,000 km service', basis: 'km', interval: 10_000, lastMeter: 195_800, lastDate: '2028-01-30', dailyUsage: 210, taskList: 'Oil & filters, pump & spray bar' },
  { id: 'PM-LB-90D', unitId: 'LB-01', name: 'Lowbed 90-day inspection', basis: 'days', interval: 90, lastMeter: 0, lastDate: '2027-12-20', dailyUsage: 1, taskList: 'Axles, king pin, deck, lights, tyres' },
  { id: 'PM-CR-90D', unitId: 'CR-050-02', name: 'Crane 90-day wire rope inspection', basis: 'days', interval: 90, lastMeter: 0, lastDate: '2027-12-28', dailyUsage: 1, taskList: 'Wire rope, hook, sheaves — documented for client audit' },
]

/** Remaining until due (in the plan's basis) and projected due date */
export function pmDue(p: PmPlan): { remaining: number; dueDate: string; status: 'Overdue' | 'Due soon' | 'Scheduled' } {
  const u = units.find((x) => x.id === p.unitId)
  let remaining: number
  if (p.basis === 'days') {
    remaining = p.interval + daysUntil(p.lastDate)
  } else {
    remaining = p.lastMeter + p.interval - (u?.meter ?? 0)
  }
  const days = p.basis === 'days' ? remaining : Math.round(remaining / p.dailyUsage)
  const d = new Date('2028-03-10T00:00:00')
  d.setDate(d.getDate() + days)
  const dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const threshold = p.basis === 'days' ? 14 : p.interval * 0.1
  const status = remaining < 0 ? 'Overdue' : remaining <= threshold ? 'Due soon' : 'Scheduled'
  return { remaining, dueDate, status }
}

export interface MeterReading {
  unitId: string
  time: string
  value: number
  source: 'Telematics (GPS)' | 'Mobile P2H' | 'Workshop'
}

export const meterReadings: MeterReading[] = [
  { unitId: 'CR-100-02', time: '2028-03-06T06:40', value: 16_218, source: 'Mobile P2H' },
  { unitId: 'CR-100-02', time: '2028-03-09T15:10', value: 16_230, source: 'Workshop' },
  { unitId: 'PM-03', time: '2028-03-08T13:38', value: 188_904, source: 'Telematics (GPS)' },
  { unitId: 'PM-03', time: '2028-03-07T18:00', value: 188_640, source: 'Telematics (GPS)' },
  { unitId: 'DT-04', time: '2028-03-09T06:25', value: 342_740, source: 'Mobile P2H' },
  { unitId: 'DT-04', time: '2028-03-08T18:10', value: 342_512, source: 'Telematics (GPS)' },
  { unitId: 'CR-050-01', time: '2028-02-26T16:00', value: 8_915, source: 'Mobile P2H' },
  { unitId: 'DT-03', time: '2028-03-02T05:00', value: 336_980, source: 'Workshop' },
  { unitId: 'EX-01', time: '2028-03-10T06:00', value: 12_430, source: 'Mobile P2H' },
  { unitId: 'DT-01', time: '2028-03-10T06:00', value: 246_880, source: 'Telematics (GPS)' },
  { unitId: 'FL-01', time: '2028-03-09T17:00', value: 5_600, source: 'Mobile P2H' },
]

// ─── Certification (proposal §2.5.5) ─────────────────────────────────────────

export type CertTier = 'Expired' | '≤ 30 days' | '≤ 60 days' | '≤ 90 days' | 'Valid'

export function certTier(expiry: string): CertTier {
  const d = daysUntil(expiry)
  if (d < 0) return 'Expired'
  if (d <= 30) return '≤ 30 days'
  if (d <= 60) return '≤ 60 days'
  if (d <= 90) return '≤ 90 days'
  return 'Valid'
}

export const tierTone: Record<CertTier, 'red' | 'orange' | 'amber' | 'sky' | 'green'> = {
  Expired: 'red',
  '≤ 30 days': 'orange',
  '≤ 60 days': 'amber',
  '≤ 90 days': 'sky',
  Valid: 'green',
}

export interface EquipmentCert {
  unitId: string
  kind: 'SILO (Riksa Uji K3)' | 'KIR (uji berkala)'
  number: string
  issued: string
  expiry: string
  issuer: string
  documents: string[]
  renewal?: string
}

function minusMonths(iso: string, m: number) {
  const d = new Date(iso + 'T00:00:00')
  d.setMonth(d.getMonth() - m)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const renewals: Record<string, string> = {
  'CR-050-01': 'WO-2028-0146 — PJK3 inspection booked 16 Mar',
  'CR-100-02': 'WO-2028-0142 — load test with inspector 22 Mar',
  'FL-01': 'WO-2028-0149 — inspection to be scheduled',
}

export const equipmentCerts: EquipmentCert[] = units.map((u: Unit) => {
  const isKir = u.cert.number.startsWith('KIR')
  return {
    unitId: u.id,
    kind: isKir ? 'KIR (uji berkala)' : 'SILO (Riksa Uji K3)',
    number: u.cert.number,
    issued: minusMonths(u.cert.expiry, isKir ? 6 : 12),
    expiry: u.cert.expiry,
    issuer: isKir ? 'Dinas Perhubungan Kab. Kutai Kartanegara' : 'Disnaker Prov. Kaltim via PJK3 PT Riksa Uji Nusantara',
    documents: isKir
      ? [`${u.cert.number.replace(/\//g, '-')}.pdf`, 'Buku uji & kartu KIR (scan).pdf', 'STNK.pdf']
      : [`${u.cert.number.replace(/\//g, '-')}.pdf`, 'Load test report.pdf', 'NDT report — hook & boom.pdf', 'Load chart (stamped).pdf'],
    renewal: renewals[u.id],
  }
})

export interface OperatorCert {
  id: string
  empId: string
  kind: string
  number: string
  issued: string
  expiry: string
  issuer: string
  /** Licence (statutory) vs competency (training) */
  class: 'Licence' | 'Competency'
}

const licenceCerts: OperatorCert[] = employees
  .filter((e) => e.licence)
  .map((e, i) => ({
    id: `OC-${String(i + 1).padStart(3, '0')}`,
    empId: e.id,
    kind: e.licence!.kind,
    number: e.licence!.number,
    issued: minusMonths(e.licence!.expiry, e.licence!.kind.startsWith('SIM') ? 60 : 36),
    expiry: e.licence!.expiry,
    issuer: e.licence!.kind.startsWith('SIM') ? 'Polri — Satpas Kutai Kartanegara' : 'Kemnaker RI (SIO)',
    class: 'Licence' as const,
  }))

export const operatorCerts: OperatorCert[] = [
  ...licenceCerts,
  { id: 'OC-101', empId: 'EMP-0013', kind: 'Rigging & Signalling Level II', number: 'RIG-II/2026/0442', issued: '2026-05-10', expiry: '2029-05-10', issuer: 'LSP Migas', class: 'Competency' },
  { id: 'OC-102', empId: 'EMP-0017', kind: 'H2S Awareness & SCBA', number: 'H2S/PTM/27/1188', issued: '2027-04-18', expiry: '2028-04-18', issuer: 'PT Training Migas', class: 'Competency' },
  { id: 'OC-103', empId: 'EMP-0019', kind: 'Confined Space Entry (inert atmosphere)', number: 'CSE/2027/0231', issued: '2027-06-01', expiry: '2029-06-01', issuer: 'LSP K3', class: 'Competency' },
  { id: 'OC-104', empId: 'EMP-0020', kind: 'Confined Space Entry (inert atmosphere)', number: 'CSE/2027/0232', issued: '2027-06-01', expiry: '2029-06-01', issuer: 'LSP K3', class: 'Competency' },
  { id: 'OC-105', empId: 'EMP-0014', kind: 'Defensive Driving (mine road)', number: 'DDC/BCM/27/0917', issued: '2027-05-02', expiry: '2028-05-02', issuer: 'Client A site induction', class: 'Competency' },
  { id: 'OC-106', empId: 'EMP-0016', kind: 'Defensive Driving (mine road)', number: 'DDC/BCM/27/0919', issued: '2027-05-02', expiry: '2028-05-02', issuer: 'Client A site induction', class: 'Competency' },
  { id: 'OC-107', empId: 'EMP-0018', kind: 'Work at Height', number: 'WAH/2026/1170', issued: '2026-09-30', expiry: '2028-09-30', issuer: 'LSP K3', class: 'Competency' },
  { id: 'OC-108', empId: 'EMP-0010', kind: 'Ahli K3 Umum', number: 'AK3U/KEMNAKER/2025/3381', issued: '2025-02-14', expiry: '2028-02-14', issuer: 'Kemnaker RI', class: 'Competency' },
]

// ═══ M16 HSE & Enviro Compliance ════════════════════════════════════════════

export type IncidentClass = 'Near Miss' | 'First Aid' | 'Medical Treatment' | 'LTI' | 'Property Damage' | 'Environmental Spill'
export type IncidentStatus = 'Reported' | 'Under Investigation' | 'CAPA Open' | 'Closed'

export interface Capa {
  id: string
  action: string
  kind: 'Corrective' | 'Preventive'
  ownerId: string
  due: string
  status: 'Open' | 'In Progress' | 'Done' | 'Overdue'
}

export interface Incident {
  id: string
  time: string
  site: string
  projectCode: string
  classification: IncidentClass
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  title: string
  description: string
  reporterId: string
  channel: 'Mobile app (offline)' | 'Mobile app' | 'Web' | 'Hotline 24/7'
  status: IncidentStatus
  unitId?: string
  personId?: string
  lostDays?: number
  investigatorId: string
  rootCause?: string
  whys?: string[]
  immediateAction: string
  capa: Capa[]
  photos: number
  clientNotified?: string
  log: { time: string; text: string; tone?: 'slate' | 'blue' | 'amber' | 'green' | 'red' }[]
}

export const incidents: Incident[] = [
  {
    id: 'INC-2028-031', time: '2028-03-09T21:40', site: 'Kutai Kartanegara — Haul road KM 18', projectCode: 'HL-2027-014.01', classification: 'Near Miss', severity: 'High',
    title: 'Dump truck rolled back on ramp during night shift — no contact',
    description: 'DT-02 lost air pressure momentarily on the KM 18 ramp and rolled back approx. 2 m before the park brake engaged. Following LV was at safe distance. No injury, no damage.',
    reporterId: 'EMP-0015', channel: 'Mobile app (offline)', status: 'Under Investigation', unitId: 'DT-02', investigatorId: 'EMP-0010',
    immediateAction: 'Unit stood down, P2H re-done, brake system checked by mechanic; night-shift toolbox talk on ramp stopping.',
    whys: ['Air pressure dropped below cut-in on ramp', 'Compressor governor sticking (suspected)', 'Governor not in 10,000 km PM task list'],
    capa: [
      { id: 'CA-1', action: 'Inspect air governor on all Scania DT units', kind: 'Corrective', ownerId: 'EMP-0012', due: '2028-03-14', status: 'In Progress' },
      { id: 'CA-2', action: 'Add governor check to PM-DT-10K task list (config change)', kind: 'Preventive', ownerId: 'EMP-0012', due: '2028-03-20', status: 'Open' },
      { id: 'CA-3', action: 'Install ramp arrester bund at KM 18 (client road)', kind: 'Preventive', ownerId: 'EMP-0006', due: '2028-04-15', status: 'Open' },
    ],
    photos: 4, clientNotified: '2028-03-09T22:30',
    log: [
      { time: '2028-03-09T21:40', text: 'Captured on mobile app offline by Eko Prasetya (4 photos, GPS -0.5021, 117.1502)', tone: 'red' },
      { time: '2028-03-09T21:58', text: 'Synced to server; HSE on-call paged (24/7 roster)', tone: 'amber' },
      { time: '2028-03-09T22:30', text: 'Client A HSE notified per contract clause 14.3', tone: 'slate' },
      { time: '2028-03-10T07:30', text: 'Investigation opened — 5-Why started', tone: 'blue' },
    ],
  },
  {
    id: 'INC-2028-029', time: '2028-03-06T10:15', site: 'Cilacap — Reactor R-201 deck', projectCode: 'PS-2028-003', classification: 'First Aid', severity: 'Low',
    title: 'Hand laceration while opening catalyst drum band',
    description: 'Technician cut left palm on steel band while opening a catalyst drum. Treated on site by medic (cleaning & dressing). Returned to work same shift.',
    reporterId: 'EMP-0029', channel: 'Mobile app', status: 'CAPA Open', personId: 'EMP-0020', investigatorId: 'EMP-0010',
    rootCause: 'Band cutter not available at the drum staging area; worker used pliers. Cut-resistant gloves not specified in JSA for this task.',
    immediateAction: 'First aid given; band cutters issued from Cilacap store; JSA updated same day.',
    capa: [
      { id: 'CA-1', action: 'Update JSA-CAT-07 to require cut-resistant gloves (level D)', kind: 'Corrective', ownerId: 'EMP-0019', due: '2028-03-07', status: 'Done' },
      { id: 'CA-2', action: 'Stock band cutters & level-D gloves at each staging area', kind: 'Preventive', ownerId: 'EMP-0029', due: '2028-03-12', status: 'In Progress' },
    ],
    photos: 2,
    log: [
      { time: '2028-03-06T10:22', text: 'Reported via mobile app by Rizky Firmansyah', tone: 'amber' },
      { time: '2028-03-06T15:00', text: 'Classified First Aid — not recordable', tone: 'slate' },
      { time: '2028-03-07T09:00', text: 'Root cause agreed; 2 CAPA raised', tone: 'blue' },
    ],
  },
  {
    id: 'INC-2028-027', time: '2028-03-02T14:05', site: 'Kutai Kartanegara — Pit 3 fuel bay', projectCode: 'HL-2027-014.01', classification: 'Environmental Spill', severity: 'Medium',
    title: 'HSD spill ~60 L during refuelling — nozzle auto-shutoff failure',
    description: 'Auto-shutoff on dispensing nozzle failed while refuelling DT-05 from tank T-01. Approx. 60 L HSD spilled onto bunded pad; ~5 L escaped to adjacent soil.',
    reporterId: 'EMP-0006', channel: 'Mobile app', status: 'CAPA Open', unitId: 'DT-05', investigatorId: 'EMP-0010',
    rootCause: 'Nozzle not in inspection register; spring fatigue. Spill kit at bay was incomplete.',
    immediateAction: 'Spill contained with absorbent; contaminated soil (0.4 m³) excavated and stored as B3 waste (manifest pending).',
    capa: [
      { id: 'CA-1', action: 'Replace nozzle; add all nozzles to monthly inspection register', kind: 'Corrective', ownerId: 'EMP-0012', due: '2028-03-05', status: 'Done' },
      { id: 'CA-2', action: 'Dispose contaminated soil via licensed B3 transporter', kind: 'Corrective', ownerId: 'EMP-0010', due: '2028-03-16', status: 'In Progress' },
      { id: 'CA-3', action: 'Spill kit inventory added to weekly site inspection', kind: 'Preventive', ownerId: 'EMP-0006', due: '2028-03-09', status: 'Overdue' },
    ],
    photos: 6,
    log: [
      { time: '2028-03-02T14:12', text: 'Reported via mobile app', tone: 'red' },
      { time: '2028-03-02T16:40', text: 'Fuel loss (60 L) reconciled against tank dip — posted to fuel variance', tone: 'slate' },
      { time: '2028-03-03T10:00', text: 'Root cause agreed; 3 CAPA raised', tone: 'blue' },
    ],
  },
  {
    id: 'INC-2028-022', time: '2028-02-19T08:50', site: 'Bekapai — Laydown Yard B', projectCode: 'HL-2027-021', classification: 'Property Damage', severity: 'Medium',
    title: 'SPMT contact with pipe rack column during module positioning',
    description: 'While positioning module M-12, the SPMT rear axle line touched a pipe rack column protection. Paint damage only to client column; no structural damage.',
    reporterId: 'EMP-0017', channel: 'Web', status: 'Closed', unitId: 'SP-01', investigatorId: 'EMP-0010',
    rootCause: 'Spotter positioned on the wrong side of the load; radio channel congestion.',
    immediateAction: 'Move stopped; engineering check of column by client; move resumed after re-brief.',
    capa: [
      { id: 'CA-1', action: 'Two spotters mandatory for SPMT moves within 3 m of structures', kind: 'Preventive', ownerId: 'EMP-0003', due: '2028-02-22', status: 'Done' },
      { id: 'CA-2', action: 'Dedicated radio channel for lift/move operations', kind: 'Preventive', ownerId: 'EMP-0017', due: '2028-02-25', status: 'Done' },
    ],
    photos: 3,
    log: [
      { time: '2028-02-19T09:10', text: 'Reported', tone: 'amber' },
      { time: '2028-02-28T16:00', text: 'All CAPA verified effective — closed', tone: 'green' },
    ],
  },
  {
    id: 'INC-2028-018', time: '2028-02-07T15:30', site: 'Balikpapan Ops — Workshop', projectCode: 'GEN-BPN', classification: 'Medical Treatment', severity: 'Medium',
    title: 'Mechanic foot injury — dropped brake drum',
    description: 'Brake drum slipped from trolley during removal and struck the mechanic’s right foot (safety boot). X-ray negative; treated at clinic, returned to restricted duty next day.',
    reporterId: 'EMP-0012', channel: 'Web', status: 'Closed', personId: 'EMP-0024', investigatorId: 'EMP-0010',
    rootCause: 'Drum trolley without retaining strap; manual handling of 60 kg component by one person.',
    immediateAction: 'Clinic treatment; restricted duty 3 days.',
    capa: [{ id: 'CA-1', action: 'Purchase drum handling dolly with strap; two-person rule > 25 kg', kind: 'Corrective', ownerId: 'EMP-0012', due: '2028-02-20', status: 'Done' }],
    photos: 1,
    log: [{ time: '2028-02-26T11:00', text: 'Closed after effectiveness check', tone: 'green' }],
  },
  {
    id: 'INC-2027-114', time: '2027-11-21T02:10', site: 'Kutai Kartanegara — Pit 3 dump point', projectCode: 'HL-2027-014.01', classification: 'LTI', severity: 'High',
    title: 'Driver ankle fracture descending dump truck cab at night',
    description: 'Driver slipped on wet access ladder while descending DT-03 cab at the dump point. Ankle fracture; 21 days lost time.',
    reporterId: 'EMP-0006', channel: 'Hotline 24/7', status: 'Closed', unitId: 'DT-03', personId: 'EMP-0015', lostDays: 21, investigatorId: 'EMP-0010',
    rootCause: 'Worn anti-slip on ladder rungs; no ladder lighting; three-point contact not observed.',
    immediateAction: 'Evacuated to RS Kutai; site stand-down 30 min; ladder inspection of all DT units.',
    capa: [
      { id: 'CA-1', action: 'Retrofit ladder lights & anti-slip on all DT/WT units', kind: 'Corrective', ownerId: 'EMP-0012', due: '2027-12-15', status: 'Done' },
      { id: 'CA-2', action: 'Three-point contact campaign & observation cards', kind: 'Preventive', ownerId: 'EMP-0010', due: '2027-12-31', status: 'Done' },
    ],
    photos: 5,
    log: [{ time: '2028-01-10T10:00', text: 'Closed; reported to Disnaker (form KK2) & client', tone: 'green' }],
  },
  {
    id: 'INC-2028-030', time: '2028-03-08T07:20', site: 'Garut — Well Pad K-7 access road', projectCode: 'HL-2028-002', classification: 'Near Miss', severity: 'Medium',
    title: 'Lowbed load shift on downhill bend — lashing loosened',
    description: 'During rig load 5, one chain binder loosened on a downhill bend; load shifted ~10 cm. Escort stopped convoy; re-lashed.',
    reporterId: 'EMP-0026', channel: 'Mobile app (offline)', status: 'Reported', unitId: 'LB-01', investigatorId: 'EMP-0010',
    immediateAction: 'Convoy stopped, load re-secured and checked by rigger; lashing re-check point added at KM 6.',
    capa: [],
    photos: 3,
    log: [{ time: '2028-03-08T09:05', text: 'Synced from mobile after regaining signal (captured 07:20)', tone: 'amber' }],
  },
]

export const getIncident = (id?: string) => incidents.find((i) => i.id === id)

export interface HseMonth {
  month: string
  manHours: number
  lti: number
  recordables: number
  nearMiss: number
  firstAid: number
}

export const hseMonthly: HseMonth[] = [
  { month: '2027-04', manHours: 96_400, lti: 0, recordables: 1, nearMiss: 6, firstAid: 2 },
  { month: '2027-05', manHours: 101_200, lti: 0, recordables: 0, nearMiss: 9, firstAid: 3 },
  { month: '2027-06', manHours: 104_800, lti: 0, recordables: 1, nearMiss: 11, firstAid: 1 },
  { month: '2027-07', manHours: 118_600, lti: 0, recordables: 0, nearMiss: 14, firstAid: 2 },
  { month: '2027-08', manHours: 121_900, lti: 0, recordables: 1, nearMiss: 12, firstAid: 4 },
  { month: '2027-09', manHours: 126_300, lti: 0, recordables: 0, nearMiss: 15, firstAid: 2 },
  { month: '2027-10', manHours: 138_700, lti: 0, recordables: 1, nearMiss: 13, firstAid: 3 },
  { month: '2027-11', manHours: 142_100, lti: 1, recordables: 2, nearMiss: 10, firstAid: 2 },
  { month: '2027-12', manHours: 131_500, lti: 0, recordables: 0, nearMiss: 16, firstAid: 1 },
  { month: '2028-01', manHours: 139_800, lti: 0, recordables: 0, nearMiss: 18, firstAid: 3 },
  { month: '2028-02', manHours: 146_200, lti: 0, recordables: 1, nearMiss: 17, firstAid: 2 },
  { month: '2028-03', manHours: 48_900, lti: 0, recordables: 0, nearMiss: 6, firstAid: 1 },
]

export const LAST_LTI = '2027-11-21'

export interface Permit {
  id: string
  name: string
  category: 'Management system' | 'Environmental permit' | 'Operating licence' | 'Client site pass' | 'Waste permit'
  number: string
  issuer: string
  holder: string
  site: string
  issued: string
  expiry: string
  ownerId: string
  renewalStatus?: string
}

export const permits: Permit[] = [
  { id: 'PMT-001', name: 'ISO 45001:2018 — OH&S management system', category: 'Management system', number: 'ID-OHS-17742', issuer: 'Bureau Certification (accredited KAN)', holder: 'PT Petrolog Indah', site: 'All sites', issued: '2025-05-20', expiry: '2028-05-19', ownerId: 'EMP-0010', renewalStatus: 'Recertification audit booked 22–24 Apr' },
  { id: 'PMT-002', name: 'ISO 14001:2015 — Environmental management system', category: 'Management system', number: 'ID-EMS-17743', issuer: 'Bureau Certification (accredited KAN)', holder: 'PT Petrolog Indah', site: 'All sites', issued: '2025-05-20', expiry: '2028-05-19', ownerId: 'EMP-0010', renewalStatus: 'Combined with ISO 45001 audit' },
  { id: 'PMT-003', name: 'SMK3 certificate (Gold flag)', category: 'Management system', number: 'SMK3/KEMNAKER/2025/0918', issuer: 'Kemnaker RI', holder: 'PT Petrolog Indah', site: 'All sites', issued: '2025-09-01', expiry: '2028-08-31', ownerId: 'EMP-0010' },
  { id: 'PMT-004', name: 'ISO 9001:2015 — Quality management system', category: 'Management system', number: 'ID-QMS-12210', issuer: 'Bureau Certification (accredited KAN)', holder: 'PT Petrolog Indah', site: 'All sites', issued: '2026-11-10', expiry: '2029-11-09', ownerId: 'EMP-0010' },
  { id: 'PMT-005', name: 'B3 waste temporary storage permit (TPS LB3) — Kutai', category: 'Waste permit', number: 'SK-DLH/KK/503/2023/118', issuer: 'DLH Kab. Kutai Kartanegara', holder: 'PT Petrolog Indah', site: 'Kutai Kartanegara', issued: '2023-04-12', expiry: '2028-04-11', ownerId: 'EMP-0010', renewalStatus: 'Renewal application submitted 02 Feb (OSS-RBA)' },
  { id: 'PMT-006', name: 'B3 waste temporary storage permit (TPS LB3) — Balikpapan', category: 'Waste permit', number: 'SK-DLH/BPN/660/2024/072', issuer: 'DLH Kota Balikpapan', holder: 'PT Petrolog Indah', site: 'Balikpapan Ops', issued: '2024-07-01', expiry: '2029-06-30', ownerId: 'EMP-0010' },
  { id: 'PMT-007', name: 'Environmental approval (UKL-UPL) — Balikpapan workshop & yard', category: 'Environmental permit', number: 'PKPLH/BPN/2022/044', issuer: 'DLH Kota Balikpapan', holder: 'PT Petrolog Indah', site: 'Balikpapan Ops', issued: '2022-03-15', expiry: '2032-03-14', ownerId: 'EMP-0010' },
  { id: 'PMT-008', name: 'Fuel storage & dispensing permit (tank T-01)', category: 'Operating licence', number: 'IZN-BBM/KK/2026/031', issuer: 'ESDM Prov. Kaltim', holder: 'PT Petrolog Indah', site: 'Kutai Kartanegara', issued: '2026-06-01', expiry: '2028-05-31', ownerId: 'EMP-0006' },
  { id: 'PMT-009', name: 'Company site pass — Client A Pit 3 (contractor CSMS)', category: 'Client site pass', number: 'CSMS-BCM-2027-0112', issuer: 'Borneo Coal Mining (Client A)', holder: 'PT Petrolog Indah', site: 'Kutai Kartanegara', issued: '2027-06-20', expiry: '2028-06-19', ownerId: 'EMP-0006' },
  { id: 'PMT-010', name: 'Refinery contractor pass & CSMS — Client B', category: 'Client site pass', number: 'CSMS/PRU/28/0044', issuer: 'Pertiwi Refinery Unit (Client B)', holder: 'PT Petrolog Indah', site: 'Cilacap', issued: '2028-01-10', expiry: '2028-04-30', ownerId: 'EMP-0029' },
  { id: 'PMT-011', name: 'Contractor safety pre-qualification — Client C', category: 'Client site pass', number: 'CSMS-MGP-2026-311', issuer: 'Mahakam Gas Processing (Client C)', holder: 'PT Petrolog Indah', site: 'Bekapai', issued: '2026-03-01', expiry: '2028-02-29', ownerId: 'EMP-0003', renewalStatus: 'Re-assessment submitted 15 Feb — awaiting client' },
  { id: 'PMT-012', name: 'Heavy haul road dispensation (over-dimension) — Kaltim', category: 'Operating licence', number: 'DISP/DISHUB-KT/2028/019', issuer: 'Dishub Prov. Kaltim', holder: 'PT Petrolog Indah', site: 'Kutai Kartanegara', issued: '2028-01-02', expiry: '2028-03-31', ownerId: 'EMP-0003', renewalStatus: 'Q2 application via VND-00203' },
  { id: 'PMT-013', name: 'Radio frequency licence (ISR) — site handheld network', category: 'Operating licence', number: 'ISR/KOMINFO/2026/77120', issuer: 'Kominfo RI', holder: 'PT Petrolog Indah', site: 'Kutai Kartanegara', issued: '2026-10-01', expiry: '2028-09-30', ownerId: 'EMP-0027' },
]

export interface WasteManifest {
  id: string
  manifestNo: string
  wasteCode: string
  wasteName: string
  source: string
  projectCode: string
  qty: number
  uom: 'kg' | 'ton' | 'L' | 'm³'
  packaging: string
  transporterId: string
  vehicle: string
  receiver: string
  created: string
  status: 'Draft' | 'Stored (TPS)' | 'Picked Up' | 'In Transit' | 'Received by Processor' | 'Closed'
  steps: { label: string; time?: string }[]
  storedSince: string
}

const steps = (a?: string, b?: string, c?: string, d?: string, e?: string) => [
  { label: 'Manifest created (generator)', time: a },
  { label: 'Picked up by transporter', time: b },
  { label: 'In transit (GPS tracked)', time: c },
  { label: 'Received by processor', time: d },
  { label: 'Manifest closed & returned', time: e },
]

export const wasteManifests: WasteManifest[] = [
  { id: 'WM-2028-014', manifestNo: 'FST-2028-0314-KT-00219-0091', wasteCode: 'B107d', wasteName: 'Spent hydrotreating catalyst (NiMo/CoMo)', source: 'Reactor R-201 unloading — Cilacap', projectCode: 'PS-2028-003', qty: 42.6, uom: 'ton', packaging: '71 × flow bins (sealed, N₂ blanketed)', transporterId: 'VND-00219', vehicle: 'KT 9433 LB', receiver: 'PT Pengolah Katalis Nusantara (licensed recycler)', created: '2028-03-07', status: 'In Transit', steps: steps('2028-03-07T10:00', '2028-03-09T08:30', '2028-03-09T09:10'), storedSince: '2028-02-26' },
  { id: 'WM-2028-013', manifestNo: 'FST-2028-0305-KT-00219-0088', wasteCode: 'B105d', wasteName: 'Used lubricating oil', source: 'Balikpapan workshop', projectCode: 'GEN-BPN', qty: 3_150, uom: 'L', packaging: '15 × 210 L drums', transporterId: 'VND-00219', vehicle: 'KT 8871 LA', receiver: 'PT Daur Oli Kaltim (licensed processor)', created: '2028-03-04', status: 'Received by Processor', steps: steps('2028-03-04T09:00', '2028-03-05T13:00', '2028-03-05T13:30', '2028-03-06T10:20'), storedSince: '2028-01-18' },
  { id: 'WM-2028-015', manifestNo: 'FST-2028-0310-KT-00219-0094', wasteCode: 'A108d', wasteName: 'Soil contaminated with HSD (spill INC-2028-027)', source: 'Pit 3 fuel bay — Kutai', projectCode: 'HL-2027-014.01', qty: 0.4, uom: 'm³', packaging: '3 × lined 1 m³ bags', transporterId: 'VND-00219', vehicle: '—', receiver: 'PT Limbah Aman Lestari (processor)', created: '2028-03-10', status: 'Stored (TPS)', steps: steps('2028-03-10T08:15'), storedSince: '2028-03-03' },
  { id: 'WM-2028-011', manifestNo: 'FST-2028-0220-KT-00219-0079', wasteCode: 'B110d', wasteName: 'Used oil filters & contaminated rags', source: 'Kutai field workshop', projectCode: 'HL-2027-014', qty: 380, uom: 'kg', packaging: '4 × 200 L closed drums', transporterId: 'VND-00219', vehicle: 'KT 8871 LA', receiver: 'PT Limbah Aman Lestari (processor)', created: '2028-02-20', status: 'Closed', steps: steps('2028-02-20T09:00', '2028-02-21T10:00', '2028-02-21T10:20', '2028-02-22T15:00', '2028-03-01T09:00'), storedSince: '2027-12-02' },
  { id: 'WM-2028-010', manifestNo: 'FST-2028-0214-KT-00219-0074', wasteCode: 'B104d', wasteName: 'Used lead-acid batteries', source: 'Balikpapan workshop', projectCode: 'GEN-BPN', qty: 46, uom: 'kg', packaging: '1 × acid-resistant crate', transporterId: 'VND-00219', vehicle: 'KT 8871 LA', receiver: 'PT Daur Aki Indonesia', created: '2028-02-14', status: 'Closed', steps: steps('2028-02-14T09:00', '2028-02-15T09:00', '2028-02-15T09:30', '2028-02-15T16:00', '2028-02-24T11:00'), storedSince: '2027-11-20' },
  { id: 'WM-2028-016', manifestNo: '—', wasteCode: 'B105d', wasteName: 'Used lubricating oil', source: 'Kutai field workshop', projectCode: 'HL-2027-014', qty: 1_260, uom: 'L', packaging: '6 × 210 L drums', transporterId: 'VND-00219', vehicle: '—', receiver: 'PT Daur Oli Kaltim (licensed processor)', created: '2028-03-10', status: 'Draft', steps: steps(), storedSince: '2027-12-20' },
]
