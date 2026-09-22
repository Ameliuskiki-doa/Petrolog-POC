/**
 * Shared master data. Every module reads from here so that IDs line up across screens
 * (a PO opened from Project P/L is the same PO shown in Procurement and Loket Invoice).
 * All names are fictional; client names are placeholders per Clause 7.1.
 */

export type BusinessLine = 'HL' | 'PS' | 'GS' | 'CORP'

export const businessLines: Record<BusinessLine, { name: string; short: string; color: string }> = {
  HL: { name: 'Heavy Equipment & Logistics', short: 'Heavy Logistics', color: '#eb6834' },
  PS: { name: 'Plant Services', short: 'Plant Services', color: '#2a78d6' },
  GS: { name: 'Green Solutions', short: 'Green Solutions', color: '#1baf7a' },
  CORP: { name: 'Corporate / Overhead', short: 'Corporate', color: '#94a3b8' },
}

export const locations = ['Jakarta HO', 'Balikpapan Ops', 'Kutai Kartanegara', 'Cilacap', 'Bontang', 'Dumai', 'Garut', 'Bekapai'] as const

// ─── Customers ────────────────────────────────────────────────────────────────
export interface Customer {
  id: string
  name: string
  sector: 'Mining' | 'Oil & Gas' | 'Geothermal' | 'Petrochemical' | 'Power' | 'Fertilizer'
  city: string
  npwp: string
  paymentTermDays: number
}

export const customers: Customer[] = [
  { id: 'CUS-001', name: 'Borneo Coal Mining (Client A)', sector: 'Mining', city: 'Kutai Kartanegara', npwp: '01.234.567.8-721.000', paymentTermDays: 30 },
  { id: 'CUS-002', name: 'Pertiwi Refinery Unit (Client B)', sector: 'Oil & Gas', city: 'Cilacap', npwp: '01.345.678.9-521.000', paymentTermDays: 45 },
  { id: 'CUS-003', name: 'Mahakam Gas Processing (Client C)', sector: 'Oil & Gas', city: 'Bekapai', npwp: '02.456.789.0-722.000', paymentTermDays: 30 },
  { id: 'CUS-004', name: 'Sumatra Petrochem (Client D)', sector: 'Petrochemical', city: 'Dumai', npwp: '02.567.890.1-212.000', paymentTermDays: 60 },
  { id: 'CUS-005', name: 'Java Geothermal Energy (Client E)', sector: 'Geothermal', city: 'Garut', npwp: '03.678.901.2-443.000', paymentTermDays: 30 },
  { id: 'CUS-006', name: 'Nusantara Fertilizer (Client F)', sector: 'Fertilizer', city: 'Bontang', npwp: '03.789.012.3-724.000', paymentTermDays: 45 },
  { id: 'CUS-007', name: 'Selat Power Generation (Client G)', sector: 'Power', city: 'Cilegon', npwp: '04.890.123.4-417.000', paymentTermDays: 30 },
]

// ─── Employees ────────────────────────────────────────────────────────────────
export interface Employee {
  id: string
  name: string
  position: string
  department: 'Operations' | 'Plant Services' | 'Green Solutions' | 'Finance' | 'Procurement' | 'HSE' | 'Commercial' | 'Maintenance' | 'Management' | 'IT'
  location: string
  type: 'Direct' | 'Indirect'
  /** Operator licence (SIO) number & expiry for operators and drivers */
  licence?: { kind: string; number: string; expiry: string }
}

export const employees: Employee[] = [
  { id: 'EMP-0001', name: 'Hendra Wijaya', position: 'Chief Executive Officer', department: 'Management', location: 'Jakarta HO', type: 'Indirect' },
  { id: 'EMP-0002', name: 'Ratna Sari Dewi', position: 'Finance Director', department: 'Finance', location: 'Jakarta HO', type: 'Indirect' },
  { id: 'EMP-0003', name: 'Bambang Prasetyo', position: 'Project Manager — Heavy Logistics', department: 'Operations', location: 'Balikpapan Ops', type: 'Indirect' },
  { id: 'EMP-0004', name: 'Dewi Kartika', position: 'Project Manager — Plant Services', department: 'Plant Services', location: 'Cilacap', type: 'Indirect' },
  { id: 'EMP-0005', name: 'Agus Salim', position: 'Project Manager — Green Solutions', department: 'Green Solutions', location: 'Bontang', type: 'Indirect' },
  { id: 'EMP-0006', name: 'Yusuf Hamdani', position: 'Site Leader — Kutai', department: 'Operations', location: 'Kutai Kartanegara', type: 'Direct' },
  { id: 'EMP-0007', name: 'Siti Nurhaliza', position: 'Operations Admin', department: 'Operations', location: 'Balikpapan Ops', type: 'Indirect' },
  { id: 'EMP-0008', name: 'Rudi Hartono', position: 'Procurement Manager', department: 'Procurement', location: 'Jakarta HO', type: 'Indirect' },
  { id: 'EMP-0009', name: 'Maya Anggraini', position: 'AP Officer', department: 'Finance', location: 'Jakarta HO', type: 'Indirect' },
  { id: 'EMP-0010', name: 'Fajar Nugroho', position: 'HSE Manager', department: 'HSE', location: 'Balikpapan Ops', type: 'Indirect' },
  { id: 'EMP-0011', name: 'Putri Maharani', position: 'Business Development Manager', department: 'Commercial', location: 'Jakarta HO', type: 'Indirect' },
  { id: 'EMP-0012', name: 'Joko Susilo', position: 'Maintenance Superintendent', department: 'Maintenance', location: 'Balikpapan Ops', type: 'Indirect' },
  { id: 'EMP-0013', name: 'Andi Saputra', position: 'Crane Operator', department: 'Operations', location: 'Kutai Kartanegara', type: 'Direct', licence: { kind: 'SIO Crane Class I', number: 'SIO/KMN/2025/11873', expiry: '2028-03-28' } },
  { id: 'EMP-0014', name: 'Budi Santoso', position: 'Prime Mover Driver', department: 'Operations', location: 'Kutai Kartanegara', type: 'Direct', licence: { kind: 'SIM B2 Umum', number: 'B2U-6471-0923', expiry: '2029-06-14' } },
  { id: 'EMP-0015', name: 'Eko Prasetya', position: 'Dump Truck Driver', department: 'Operations', location: 'Kutai Kartanegara', type: 'Direct', licence: { kind: 'SIM B2 Umum', number: 'B2U-6471-1187', expiry: '2028-11-02' } },
  { id: 'EMP-0016', name: 'Rahmat Hidayat', position: 'Dump Truck Driver', department: 'Operations', location: 'Kutai Kartanegara', type: 'Direct', licence: { kind: 'SIM B2 Umum', number: 'B2U-6471-1440', expiry: '2028-02-20' } },
  { id: 'EMP-0017', name: 'Wahyu Kurniawan', position: 'Crane Operator', department: 'Operations', location: 'Bekapai', type: 'Direct', licence: { kind: 'SIO Crane Class I', number: 'SIO/KMN/2024/09342', expiry: '2029-01-15' } },
  { id: 'EMP-0018', name: 'Dedi Kurnia', position: 'Rigger', department: 'Operations', location: 'Garut', type: 'Direct', licence: { kind: 'SIO Rigger', number: 'SIO/RGR/2025/02211', expiry: '2028-08-30' } },
  { id: 'EMP-0019', name: 'Slamet Riyadi', position: 'Catalyst Technician Lead', department: 'Plant Services', location: 'Cilacap', type: 'Direct' },
  { id: 'EMP-0020', name: 'Hari Setiawan', position: 'Catalyst Technician', department: 'Plant Services', location: 'Cilacap', type: 'Direct' },
  { id: 'EMP-0021', name: 'Nanda Pratama', position: 'Process Engineer', department: 'Green Solutions', location: 'Bontang', type: 'Direct' },
  { id: 'EMP-0022', name: 'Lestari Wulandari', position: 'Billing Officer', department: 'Finance', location: 'Jakarta HO', type: 'Indirect' },
  { id: 'EMP-0023', name: 'Taufik Rahman', position: 'Tax Manager', department: 'Finance', location: 'Jakarta HO', type: 'Indirect' },
  { id: 'EMP-0024', name: 'Indra Gunawan', position: 'Mechanic', department: 'Maintenance', location: 'Balikpapan Ops', type: 'Direct' },
  { id: 'EMP-0025', name: 'Arif Budiman', position: 'Forklift Operator', department: 'Operations', location: 'Cilacap', type: 'Direct', licence: { kind: 'SIO Forklift', number: 'SIO/FRK/2023/07715', expiry: '2028-04-05' } },
  { id: 'EMP-0026', name: 'Gilang Ramadhan', position: 'Lowbed Driver', department: 'Operations', location: 'Garut', type: 'Direct', licence: { kind: 'SIM B2 Umum', number: 'B2U-3205-0381', expiry: '2030-02-11' } },
  { id: 'EMP-0027', name: 'Kevin Tanoto', position: 'IT & Systems Lead', department: 'IT', location: 'Jakarta HO', type: 'Indirect' },
  { id: 'EMP-0028', name: 'Sri Mulyani Putri', position: 'Accounting Manager', department: 'Finance', location: 'Jakarta HO', type: 'Indirect' },
  { id: 'EMP-0029', name: 'Rizky Firmansyah', position: 'Site Leader — Cilacap Turnaround', department: 'Plant Services', location: 'Cilacap', type: 'Direct' },
  { id: 'EMP-0030', name: 'Teguh Santoso', position: 'Excavator Operator', department: 'Operations', location: 'Kutai Kartanegara', type: 'Direct', licence: { kind: 'SIO Excavator', number: 'SIO/EXC/2024/05520', expiry: '2029-09-09' } },
]

// ─── Contracts ────────────────────────────────────────────────────────────────
export type RateBasis = 'per trip' | 'per hour' | 'per tonne' | 'per unit-month' | 'lump sum' | 'per man-day'

export interface Contract {
  id: string
  title: string
  customerId: string
  businessLine: BusinessLine
  projectCode: string
  status: 'Draft' | 'Pending Approval' | 'Active' | 'Expired' | 'Closed'
  start: string
  end: string
  value: number
  version: number
  paymentTermDays: number
  retentionPct: number
  rateCard: { item: string; basis: RateBasis; rate: number; effectiveFrom: string }[]
}

export const contracts: Contract[] = [
  {
    id: 'CTR-2027-011', title: 'Coal & Equipment Hauling Services — Kutai Pit 3', customerId: 'CUS-001', businessLine: 'HL', projectCode: 'HL-2027-014',
    status: 'Active', start: '2027-07-01', end: '2028-12-31', value: 38_500_000_000, version: 3, paymentTermDays: 30, retentionPct: 5,
    rateCard: [
      { item: 'Coal hauling, pit to port (≤ 42 km)', basis: 'per tonne', rate: 48_500, effectiveFrom: '2028-01-01' },
      { item: 'Coal hauling, pit to port (≤ 42 km)', basis: 'per tonne', rate: 46_000, effectiveFrom: '2027-07-01' },
      { item: 'Prime mover + lowbed mobilisation', basis: 'per trip', rate: 18_750_000, effectiveFrom: '2027-07-01' },
      { item: 'Crane 100T with operator', basis: 'per hour', rate: 2_150_000, effectiveFrom: '2027-07-01' },
      { item: 'Standby (client-caused)', basis: 'per hour', rate: 950_000, effectiveFrom: '2027-07-01' },
    ],
  },
  {
    id: 'CTR-2027-019', title: 'Catalyst Change-out — CDU/NHT Turnaround 2028', customerId: 'CUS-002', businessLine: 'PS', projectCode: 'PS-2028-003',
    status: 'Active', start: '2028-01-15', end: '2028-04-15', value: 12_800_000_000, version: 1, paymentTermDays: 45, retentionPct: 10,
    rateCard: [
      { item: 'Catalyst unloading & loading (lump sum)', basis: 'lump sum', rate: 9_600_000_000, effectiveFrom: '2028-01-15' },
      { item: 'Additional technician', basis: 'per man-day', rate: 3_200_000, effectiveFrom: '2028-01-15' },
      { item: 'Nitrogen purge standby', basis: 'per hour', rate: 1_450_000, effectiveFrom: '2028-01-15' },
    ],
  },
  {
    id: 'CTR-2027-014', title: 'Water Treatment Package — Cooling Tower Blowdown Recovery', customerId: 'CUS-006', businessLine: 'GS', projectCode: 'GS-2027-008',
    status: 'Active', start: '2027-09-01', end: '2028-08-31', value: 21_400_000_000, version: 2, paymentTermDays: 45, retentionPct: 10,
    rateCard: [
      { item: 'Engineering & design (milestone)', basis: 'lump sum', rate: 2_140_000_000, effectiveFrom: '2027-09-01' },
      { item: 'Equipment supply (milestone)', basis: 'lump sum', rate: 12_840_000_000, effectiveFrom: '2027-09-01' },
      { item: 'Installation & commissioning (milestone)', basis: 'lump sum', rate: 6_420_000_000, effectiveFrom: '2027-09-01' },
    ],
  },
  {
    id: 'CTR-2027-016', title: 'Heavy Lift & Module Transport — Train 2 Debottlenecking', customerId: 'CUS-003', businessLine: 'HL', projectCode: 'HL-2027-021',
    status: 'Active', start: '2027-10-01', end: '2028-03-31', value: 9_600_000_000, version: 1, paymentTermDays: 30, retentionPct: 5,
    rateCard: [
      { item: 'Crane 200T with operator & rigger', basis: 'per hour', rate: 4_850_000, effectiveFrom: '2027-10-01' },
      { item: 'SPMT module move', basis: 'per trip', rate: 285_000_000, effectiveFrom: '2027-10-01' },
    ],
  },
  {
    id: 'CTR-2027-009', title: 'Boiler Maintenance — Unit 3 Overhaul', customerId: 'CUS-007', businessLine: 'PS', projectCode: 'PS-2027-017',
    status: 'Closed', start: '2027-10-10', end: '2027-12-20', value: 6_350_000_000, version: 1, paymentTermDays: 30, retentionPct: 5,
    rateCard: [{ item: 'Boiler overhaul (lump sum)', basis: 'lump sum', rate: 6_350_000_000, effectiveFrom: '2027-10-10' }],
  },
  {
    id: 'CTR-2028-002', title: 'Rig Move & Equipment Mobilisation — Well Pad K-7', customerId: 'CUS-005', businessLine: 'HL', projectCode: 'HL-2028-002',
    status: 'Active', start: '2028-02-01', end: '2028-06-30', value: 7_200_000_000, version: 1, paymentTermDays: 30, retentionPct: 5,
    rateCard: [
      { item: 'Rig move (complete)', basis: 'lump sum', rate: 4_200_000_000, effectiveFrom: '2028-02-01' },
      { item: 'Lowbed trip, Garut area', basis: 'per trip', rate: 22_500_000, effectiveFrom: '2028-02-01' },
    ],
  },
  {
    id: 'CTR-2028-004', title: 'Produced Water Treatment Skid — Design & Build', customerId: 'CUS-004', businessLine: 'GS', projectCode: 'GS-2028-001',
    status: 'Pending Approval', start: '2028-04-01', end: '2029-01-31', value: 16_900_000_000, version: 1, paymentTermDays: 60, retentionPct: 10,
    rateCard: [{ item: 'Design, supply & commissioning (milestone)', basis: 'lump sum', rate: 16_900_000_000, effectiveFrom: '2028-04-01' }],
  },
]

// ─── Project codes ────────────────────────────────────────────────────────────
export type ProjectStatus = 'Planning' | 'Active' | 'Closing' | 'Closed' | 'On Hold'

export interface Project {
  code: string
  parent?: string
  name: string
  businessLine: BusinessLine
  customerId?: string
  contractId?: string
  pmId: string
  site: string
  status: ProjectStatus
  start: string
  end: string
  contractValue: number
  /** Current approved RAB (budget) */
  rab: number
  /** Original RAB baseline (v1) */
  rabBaseline: number
  rabVersion: number
  /** Open PR + PO commitments not yet cost */
  committed: number
  /** Actual cost to date */
  actual: number
  /** Revenue recognised to date */
  revenue: number
  /** % physical progress */
  progress: number
}

export const projects: Project[] = [
  { code: 'HL-2027-014', name: 'Kutai Pit 3 Coal Hauling', businessLine: 'HL', customerId: 'CUS-001', contractId: 'CTR-2027-011', pmId: 'EMP-0003', site: 'Kutai Kartanegara', status: 'Active', start: '2027-07-01', end: '2028-12-31', contractValue: 38_500_000_000, rab: 31_200_000_000, rabBaseline: 30_400_000_000, rabVersion: 2, committed: 2_140_000_000, actual: 14_860_000_000, revenue: 17_920_000_000, progress: 46 },
  { code: 'HL-2027-014.01', parent: 'HL-2027-014', name: 'Coal hauling operations', businessLine: 'HL', customerId: 'CUS-001', contractId: 'CTR-2027-011', pmId: 'EMP-0003', site: 'Kutai Kartanegara', status: 'Active', start: '2027-07-01', end: '2028-12-31', contractValue: 33_000_000_000, rab: 27_000_000_000, rabBaseline: 26_200_000_000, rabVersion: 2, committed: 1_690_000_000, actual: 12_940_000_000, revenue: 15_380_000_000, progress: 45 },
  { code: 'HL-2027-014.02', parent: 'HL-2027-014', name: 'Heavy equipment mobilisation & lifting', businessLine: 'HL', customerId: 'CUS-001', contractId: 'CTR-2027-011', pmId: 'EMP-0003', site: 'Kutai Kartanegara', status: 'Active', start: '2027-07-01', end: '2028-12-31', contractValue: 5_500_000_000, rab: 4_200_000_000, rabBaseline: 4_200_000_000, rabVersion: 1, committed: 450_000_000, actual: 1_920_000_000, revenue: 2_540_000_000, progress: 52 },
  { code: 'PS-2028-003', name: 'Refinery CDU/NHT Catalyst Change-out', businessLine: 'PS', customerId: 'CUS-002', contractId: 'CTR-2027-019', pmId: 'EMP-0004', site: 'Cilacap', status: 'Active', start: '2028-01-15', end: '2028-04-15', contractValue: 12_800_000_000, rab: 10_100_000_000, rabBaseline: 9_700_000_000, rabVersion: 3, committed: 1_380_000_000, actual: 8_240_000_000, revenue: 8_960_000_000, progress: 71 },
  { code: 'GS-2027-008', name: 'Cooling Tower Blowdown Recovery WTP', businessLine: 'GS', customerId: 'CUS-006', contractId: 'CTR-2027-014', pmId: 'EMP-0005', site: 'Bontang', status: 'Active', start: '2027-09-01', end: '2028-08-31', contractValue: 21_400_000_000, rab: 17_300_000_000, rabBaseline: 17_300_000_000, rabVersion: 1, committed: 6_950_000_000, actual: 7_120_000_000, revenue: 8_980_000_000, progress: 42 },
  { code: 'HL-2027-021', name: 'Train 2 Heavy Lift & Module Transport', businessLine: 'HL', customerId: 'CUS-003', contractId: 'CTR-2027-016', pmId: 'EMP-0003', site: 'Bekapai', status: 'Closing', start: '2027-10-01', end: '2028-03-31', contractValue: 9_600_000_000, rab: 7_450_000_000, rabBaseline: 7_450_000_000, rabVersion: 1, committed: 120_000_000, actual: 7_010_000_000, revenue: 9_120_000_000, progress: 96 },
  { code: 'PS-2027-017', name: 'Unit 3 Boiler Overhaul', businessLine: 'PS', customerId: 'CUS-007', contractId: 'CTR-2027-009', pmId: 'EMP-0004', site: 'Cilegon', status: 'Closed', start: '2027-10-10', end: '2027-12-20', contractValue: 6_350_000_000, rab: 5_150_000_000, rabBaseline: 5_150_000_000, rabVersion: 1, committed: 0, actual: 5_420_000_000, revenue: 6_350_000_000, progress: 100 },
  { code: 'HL-2028-002', name: 'Well Pad K-7 Rig Move', businessLine: 'HL', customerId: 'CUS-005', contractId: 'CTR-2028-002', pmId: 'EMP-0003', site: 'Garut', status: 'Active', start: '2028-02-01', end: '2028-06-30', contractValue: 7_200_000_000, rab: 5_600_000_000, rabBaseline: 5_600_000_000, rabVersion: 1, committed: 910_000_000, actual: 1_240_000_000, revenue: 1_580_000_000, progress: 22 },
  { code: 'GS-2028-001', name: 'Produced Water Treatment Skid', businessLine: 'GS', customerId: 'CUS-004', contractId: 'CTR-2028-004', pmId: 'EMP-0005', site: 'Dumai', status: 'Planning', start: '2028-04-01', end: '2029-01-31', contractValue: 16_900_000_000, rab: 13_700_000_000, rabBaseline: 13_700_000_000, rabVersion: 1, committed: 0, actual: 0, revenue: 0, progress: 0 },
  { code: 'GEN-HO', name: 'General — Head Office overhead', businessLine: 'CORP', pmId: 'EMP-0002', site: 'Jakarta HO', status: 'Active', start: '2028-01-01', end: '2028-12-31', contractValue: 0, rab: 9_600_000_000, rabBaseline: 9_600_000_000, rabVersion: 1, committed: 210_000_000, actual: 1_780_000_000, revenue: 0, progress: 0 },
  { code: 'GEN-BPN', name: 'General — Balikpapan operations overhead', businessLine: 'CORP', pmId: 'EMP-0003', site: 'Balikpapan Ops', status: 'Active', start: '2028-01-01', end: '2028-12-31', contractValue: 0, rab: 6_200_000_000, rabBaseline: 6_200_000_000, rabVersion: 1, committed: 145_000_000, actual: 1_060_000_000, revenue: 0, progress: 0 },
]

// ─── Units (fleet & equipment) ────────────────────────────────────────────────
export type UnitStatus = 'Operating' | 'Idle' | 'Maintenance' | 'Breakdown'

export interface Unit {
  id: string
  type: string
  category: 'Crane' | 'Prime Mover' | 'Trailer' | 'Dump Truck' | 'Excavator' | 'Forklift' | 'Light Vehicle' | 'Water Truck' | 'SPMT'
  make: string
  year: number
  plate?: string
  status: UnitStatus
  location: string
  projectCode?: string
  /** Hour meter or odometer */
  meter: number
  meterUnit: 'hrs' | 'km'
  hoursMTD: { operating: number; idle: number; maintenance: number }
  /** Statutory inspection certificate (SILO / Riksa Uji) */
  cert: { number: string; expiry: string }
  acquisitionValue: number
}

export const units: Unit[] = [
  { id: 'CR-100-01', type: 'Mobile Crane 100T', category: 'Crane', make: 'Tadano GR-1000XL', year: 2019, status: 'Operating', location: 'Kutai Kartanegara', projectCode: 'HL-2027-014.02', meter: 11_842, meterUnit: 'hrs', hoursMTD: { operating: 118, idle: 22, maintenance: 0 }, cert: { number: 'SILO/K3/2027/0412', expiry: '2028-09-14' }, acquisitionValue: 14_500_000_000 },
  { id: 'CR-100-02', type: 'Mobile Crane 100T', category: 'Crane', make: 'Kato KR-100', year: 2017, status: 'Maintenance', location: 'Balikpapan Ops', meter: 16_230, meterUnit: 'hrs', hoursMTD: { operating: 12, idle: 8, maintenance: 44 }, cert: { number: 'SILO/K3/2027/0188', expiry: '2028-03-22' }, acquisitionValue: 12_800_000_000 },
  { id: 'CR-200-01', type: 'Crawler Crane 200T', category: 'Crane', make: 'Sany SCC2000', year: 2021, status: 'Operating', location: 'Bekapai', projectCode: 'HL-2027-021', meter: 6_410, meterUnit: 'hrs', hoursMTD: { operating: 96, idle: 30, maintenance: 0 }, cert: { number: 'SILO/K3/2027/0655', expiry: '2028-11-30' }, acquisitionValue: 24_600_000_000 },
  { id: 'CR-050-01', type: 'Rough Terrain Crane 50T', category: 'Crane', make: 'Tadano GR-500EX', year: 2020, status: 'Idle', location: 'Balikpapan Ops', meter: 8_915, meterUnit: 'hrs', hoursMTD: { operating: 0, idle: 64, maintenance: 0 }, cert: { number: 'SILO/K3/2026/1123', expiry: '2028-02-28' }, acquisitionValue: 7_900_000_000 },
  { id: 'CR-050-02', type: 'Rough Terrain Crane 50T', category: 'Crane', make: 'Kato SR-500', year: 2022, status: 'Operating', location: 'Cilacap', projectCode: 'PS-2028-003', meter: 4_120, meterUnit: 'hrs', hoursMTD: { operating: 142, idle: 10, maintenance: 0 }, cert: { number: 'SILO/K3/2027/0901', expiry: '2029-01-05' }, acquisitionValue: 8_400_000_000 },
  { id: 'PM-01', type: 'Prime Mover 6x4', category: 'Prime Mover', make: 'Volvo FMX 480', year: 2020, plate: 'KT 8812 AB', status: 'Operating', location: 'Kutai Kartanegara', projectCode: 'HL-2027-014.02', meter: 312_450, meterUnit: 'km', hoursMTD: { operating: 131, idle: 26, maintenance: 0 }, cert: { number: 'KIR/KT/2027/5521', expiry: '2028-07-19' }, acquisitionValue: 2_950_000_000 },
  { id: 'PM-02', type: 'Prime Mover 6x4', category: 'Prime Mover', make: 'Mercedes Actros 4043', year: 2019, plate: 'KT 8830 AB', status: 'Operating', location: 'Garut', projectCode: 'HL-2028-002', meter: 401_220, meterUnit: 'km', hoursMTD: { operating: 104, idle: 41, maintenance: 0 }, cert: { number: 'KIR/KT/2027/5588', expiry: '2028-05-02' }, acquisitionValue: 2_700_000_000 },
  { id: 'PM-03', type: 'Prime Mover 6x4', category: 'Prime Mover', make: 'Volvo FMX 480', year: 2022, plate: 'KT 8901 AC', status: 'Breakdown', location: 'Kutai Kartanegara', meter: 188_904, meterUnit: 'km', hoursMTD: { operating: 38, idle: 4, maintenance: 30 }, cert: { number: 'KIR/KT/2027/6014', expiry: '2028-10-11' }, acquisitionValue: 3_100_000_000 },
  { id: 'LB-01', type: 'Lowbed Trailer 60T', category: 'Trailer', make: 'Tunggal Idaman 3-axle', year: 2018, plate: 'KT 9120 AB', status: 'Operating', location: 'Garut', projectCode: 'HL-2028-002', meter: 0, meterUnit: 'km', hoursMTD: { operating: 104, idle: 41, maintenance: 0 }, cert: { number: 'KIR/KT/2027/5590', expiry: '2028-05-02' }, acquisitionValue: 850_000_000 },
  { id: 'DT-01', type: 'Dump Truck 40T', category: 'Dump Truck', make: 'Scania P410', year: 2021, plate: 'KT 8114 AD', status: 'Operating', location: 'Kutai Kartanegara', projectCode: 'HL-2027-014.01', meter: 246_880, meterUnit: 'km', hoursMTD: { operating: 162, idle: 18, maintenance: 0 }, cert: { number: 'KIR/KT/2027/4410', expiry: '2028-08-21' }, acquisitionValue: 2_200_000_000 },
  { id: 'DT-02', type: 'Dump Truck 40T', category: 'Dump Truck', make: 'Scania P410', year: 2021, plate: 'KT 8115 AD', status: 'Operating', location: 'Kutai Kartanegara', projectCode: 'HL-2027-014.01', meter: 251_302, meterUnit: 'km', hoursMTD: { operating: 158, idle: 21, maintenance: 0 }, cert: { number: 'KIR/KT/2027/4411', expiry: '2028-08-21' }, acquisitionValue: 2_200_000_000 },
  { id: 'DT-03', type: 'Dump Truck 40T', category: 'Dump Truck', make: 'Hino FM 350', year: 2019, plate: 'KT 8007 AC', status: 'Operating', location: 'Kutai Kartanegara', projectCode: 'HL-2027-014.01', meter: 338_115, meterUnit: 'km', hoursMTD: { operating: 149, idle: 35, maintenance: 0 }, cert: { number: 'KIR/KT/2027/4390', expiry: '2028-06-30' }, acquisitionValue: 1_750_000_000 },
  { id: 'DT-04', type: 'Dump Truck 40T', category: 'Dump Truck', make: 'Hino FM 350', year: 2019, plate: 'KT 8008 AC', status: 'Maintenance', location: 'Kutai Kartanegara', meter: 342_740, meterUnit: 'km', hoursMTD: { operating: 88, idle: 12, maintenance: 36 }, cert: { number: 'KIR/KT/2027/4391', expiry: '2028-06-30' }, acquisitionValue: 1_750_000_000 },
  { id: 'DT-05', type: 'Dump Truck 40T', category: 'Dump Truck', make: 'Scania P410', year: 2023, plate: 'KT 8233 AE', status: 'Operating', location: 'Kutai Kartanegara', projectCode: 'HL-2027-014.01', meter: 98_410, meterUnit: 'km', hoursMTD: { operating: 171, idle: 9, maintenance: 0 }, cert: { number: 'KIR/KT/2027/4502', expiry: '2028-12-02' }, acquisitionValue: 2_450_000_000 },
  { id: 'DT-06', type: 'Dump Truck 40T', category: 'Dump Truck', make: 'Scania P410', year: 2023, plate: 'KT 8234 AE', status: 'Idle', location: 'Kutai Kartanegara', meter: 97_120, meterUnit: 'km', hoursMTD: { operating: 60, idle: 82, maintenance: 0 }, cert: { number: 'KIR/KT/2027/4503', expiry: '2028-12-02' }, acquisitionValue: 2_450_000_000 },
  { id: 'EX-01', type: 'Excavator 30T', category: 'Excavator', make: 'Komatsu PC300', year: 2020, status: 'Operating', location: 'Kutai Kartanegara', projectCode: 'HL-2027-014.01', meter: 12_430, meterUnit: 'hrs', hoursMTD: { operating: 155, idle: 20, maintenance: 0 }, cert: { number: 'SILO/K3/2027/0733', expiry: '2028-10-01' }, acquisitionValue: 3_800_000_000 },
  { id: 'FL-01', type: 'Forklift 5T', category: 'Forklift', make: 'Toyota 8FD50', year: 2021, status: 'Operating', location: 'Cilacap', projectCode: 'PS-2028-003', meter: 5_610, meterUnit: 'hrs', hoursMTD: { operating: 120, idle: 30, maintenance: 0 }, cert: { number: 'SILO/K3/2027/0870', expiry: '2028-04-02' }, acquisitionValue: 620_000_000 },
  { id: 'SP-01', type: 'SPMT 6-axle line', category: 'SPMT', make: 'Goldhofer PST/SL-E', year: 2021, status: 'Operating', location: 'Bekapai', projectCode: 'HL-2027-021', meter: 2_140, meterUnit: 'hrs', hoursMTD: { operating: 38, idle: 70, maintenance: 0 }, cert: { number: 'SILO/K3/2027/0689', expiry: '2028-12-15' }, acquisitionValue: 9_800_000_000 },
  { id: 'WT-01', type: 'Water Truck 10KL', category: 'Water Truck', make: 'Hino FM 260', year: 2018, plate: 'KT 8450 AB', status: 'Operating', location: 'Kutai Kartanegara', projectCode: 'HL-2027-014.01', meter: 205_330, meterUnit: 'km', hoursMTD: { operating: 110, idle: 40, maintenance: 0 }, cert: { number: 'KIR/KT/2027/4630', expiry: '2028-04-18' }, acquisitionValue: 980_000_000 },
  { id: 'LV-07', type: 'Light Vehicle 4x4', category: 'Light Vehicle', make: 'Toyota Hilux D-Cab', year: 2022, plate: 'KT 1127 PL', status: 'Operating', location: 'Kutai Kartanegara', projectCode: 'GEN-BPN', meter: 84_200, meterUnit: 'km', hoursMTD: { operating: 90, idle: 60, maintenance: 0 }, cert: { number: 'KIR/KT/2027/7001', expiry: '2028-09-01' }, acquisitionValue: 540_000_000 },
]

// ─── Vendors ──────────────────────────────────────────────────────────────────
export type VendorStatus = 'Prospective' | 'Active' | 'Suspended' | 'Blocked'

export interface Vendor {
  id: string
  name: string
  category: string
  status: VendorStatus
  city: string
  npwp: string
  /** 0–100 composite score (timeliness, quality, document compliance) */
  score: number
  /** Earliest expiry across legal documents (NIB, SIUJK, ISO, etc.) */
  docsExpiry: string
  pkp: boolean
}

export const vendors: Vendor[] = [
  { id: 'VND-00112', name: 'CV Borneo Trans Mandiri', category: 'Haulage subcontractor', status: 'Active', city: 'Samarinda', npwp: '71.234.001.1-722.000', score: 84, docsExpiry: '2028-09-30', pkp: true },
  { id: 'VND-00118', name: 'PT Solar Energi Kaltim', category: 'Fuel supplier', status: 'Active', city: 'Balikpapan', npwp: '71.234.002.2-721.000', score: 91, docsExpiry: '2028-12-31', pkp: true },
  { id: 'VND-00131', name: 'PT Katalis Prima Service', category: 'Catalyst handling', status: 'Active', city: 'Cilacap', npwp: '72.111.301.3-521.000', score: 78, docsExpiry: '2028-06-15', pkp: true },
  { id: 'VND-00145', name: 'PT Aqua Membran Teknik', category: 'Water treatment equipment', status: 'Active', city: 'Surabaya', npwp: '73.555.020.4-609.000', score: 88, docsExpiry: '2028-11-01', pkp: true },
  { id: 'VND-00152', name: 'PT Hydro Pompa Nusantara', category: 'Pumps & rotating equipment', status: 'Active', city: 'Jakarta', npwp: '73.555.021.5-014.000', score: 72, docsExpiry: '2028-03-31', pkp: true },
  { id: 'VND-00160', name: 'PT Sarana Crane Sewa', category: 'Equipment rental', status: 'Suspended', city: 'Balikpapan', npwp: '74.010.112.6-721.000', score: 49, docsExpiry: '2028-01-31', pkp: true },
  { id: 'VND-00171', name: 'CV Teknik Diesel Mandiri', category: 'Spare parts', status: 'Active', city: 'Balikpapan', npwp: '74.010.113.7-721.000', score: 81, docsExpiry: '2028-08-08', pkp: false },
  { id: 'VND-00177', name: 'PT United Tractors Parts (Dealer)', category: 'Spare parts (OEM)', status: 'Active', city: 'Jakarta', npwp: '01.308.524.8-092.000', score: 93, docsExpiry: '2029-02-28', pkp: true },
  { id: 'VND-00188', name: 'PT Gas Industri Nitrogen', category: 'Industrial gas', status: 'Active', city: 'Cilacap', npwp: '75.444.201.9-521.000', score: 86, docsExpiry: '2028-10-20', pkp: true },
  { id: 'VND-00194', name: 'PT Mitra Scaffolding Indonesia', category: 'Scaffolding services', status: 'Active', city: 'Cilacap', npwp: '75.444.202.0-521.000', score: 69, docsExpiry: '2028-05-05', pkp: true },
  { id: 'VND-00203', name: 'CV Tol & Perizinan Kaltim', category: 'Permits & tolls agent', status: 'Active', city: 'Samarinda', npwp: '76.123.450.1-722.000', score: 75, docsExpiry: '2028-07-01', pkp: false },
  { id: 'VND-00210', name: 'PT Geo Rig Support', category: 'Rig move subcontractor', status: 'Active', city: 'Bandung', npwp: '76.123.451.2-423.000', score: 80, docsExpiry: '2028-09-12', pkp: true },
  { id: 'VND-00219', name: 'PT Limbah Aman Lestari', category: 'Waste transporter (B3)', status: 'Active', city: 'Bontang', npwp: '77.888.100.3-724.000', score: 87, docsExpiry: '2028-06-01', pkp: true },
  { id: 'VND-00224', name: 'PT Ban Mulia Sentosa', category: 'Tyres', status: 'Prospective', city: 'Balikpapan', npwp: '77.888.101.4-721.000', score: 0, docsExpiry: '2029-01-10', pkp: true },
  { id: 'VND-00226', name: 'CV Karya Las Abadi', category: 'Fabrication', status: 'Blocked', city: 'Cilegon', npwp: '78.321.654.5-417.000', score: 31, docsExpiry: '2027-11-30', pkp: false },
]

// ─── Jobs (headers — detail lives in Operations) ─────────────────────────────
export type JobStatus = 'Draft' | 'Planned' | 'Dispatched' | 'In Progress' | 'Completed' | 'Verified' | 'Billed'

export interface Job {
  id: string
  projectCode: string
  title: string
  type: 'Hauling' | 'Mobilisation' | 'Lifting' | 'Rig Move' | 'Turnaround' | 'Installation'
  status: JobStatus
  date: string
  unitIds: string[]
  crewIds: string[]
  origin: string
  destination: string
  /** Billable quantity & basis from the contract rate card */
  qty: number
  basis: RateBasis
  rate: number
  recurring?: boolean
}

export const jobs: Job[] = [
  { id: 'JO-28-03-0412', projectCode: 'HL-2027-014.01', title: 'Coal hauling — shift A (Pit 3 → Jetty)', type: 'Hauling', status: 'In Progress', date: '2028-03-10', unitIds: ['DT-01', 'DT-02', 'DT-05'], crewIds: ['EMP-0015', 'EMP-0016', 'EMP-0014'], origin: 'Pit 3 ROM', destination: 'Tanjung Jetty', qty: 1_860, basis: 'per tonne', rate: 48_500, recurring: true },
  { id: 'JO-28-03-0413', projectCode: 'HL-2027-014.01', title: 'Coal hauling — shift B (Pit 3 → Jetty)', type: 'Hauling', status: 'Dispatched', date: '2028-03-10', unitIds: ['DT-03', 'DT-05'], crewIds: ['EMP-0015'], origin: 'Pit 3 ROM', destination: 'Tanjung Jetty', qty: 1_240, basis: 'per tonne', rate: 48_500, recurring: true },
  { id: 'JO-28-03-0415', projectCode: 'HL-2027-014.02', title: 'Crane 100T — conveyor section lift', type: 'Lifting', status: 'Planned', date: '2028-03-11', unitIds: ['CR-100-01'], crewIds: ['EMP-0013'], origin: 'Pit 3 Workshop', destination: 'Crusher CV-2', qty: 10, basis: 'per hour', rate: 2_150_000 },
  { id: 'JO-28-03-0398', projectCode: 'HL-2027-014.01', title: 'Coal hauling — shift A (Pit 3 → Jetty)', type: 'Hauling', status: 'Completed', date: '2028-03-09', unitIds: ['DT-01', 'DT-02', 'DT-03'], crewIds: ['EMP-0015', 'EMP-0016'], origin: 'Pit 3 ROM', destination: 'Tanjung Jetty', qty: 1_925, basis: 'per tonne', rate: 48_500, recurring: true },
  { id: 'JO-28-03-0391', projectCode: 'HL-2027-014.01', title: 'Coal hauling — shift B (Pit 3 → Jetty)', type: 'Hauling', status: 'Completed', date: '2028-03-08', unitIds: ['DT-02', 'DT-05'], crewIds: ['EMP-0016'], origin: 'Pit 3 ROM', destination: 'Tanjung Jetty', qty: 1_310, basis: 'per tonne', rate: 48_500, recurring: true },
  { id: 'JO-28-03-0377', projectCode: 'HL-2027-014.01', title: 'Coal hauling — shift A (Pit 3 → Jetty)', type: 'Hauling', status: 'Verified', date: '2028-03-07', unitIds: ['DT-01', 'DT-02', 'DT-03'], crewIds: ['EMP-0015', 'EMP-0016'], origin: 'Pit 3 ROM', destination: 'Tanjung Jetty', qty: 1_890, basis: 'per tonne', rate: 48_500, recurring: true },
  { id: 'JO-28-03-0350', projectCode: 'HL-2027-014.02', title: 'Excavator mobilisation to Pit 4', type: 'Mobilisation', status: 'Verified', date: '2028-03-04', unitIds: ['PM-01', 'EX-01'], crewIds: ['EMP-0014', 'EMP-0030'], origin: 'Pit 3', destination: 'Pit 4', qty: 1, basis: 'per trip', rate: 18_750_000 },
  { id: 'JO-28-02-0288', projectCode: 'HL-2027-014.01', title: 'Coal hauling — February batch 4', type: 'Hauling', status: 'Billed', date: '2028-02-26', unitIds: ['DT-01', 'DT-02', 'DT-03', 'DT-05'], crewIds: ['EMP-0015', 'EMP-0016'], origin: 'Pit 3 ROM', destination: 'Tanjung Jetty', qty: 12_480, basis: 'per tonne', rate: 48_500 },
  { id: 'JO-28-03-0405', projectCode: 'HL-2028-002', title: 'Rig substructure move — load 7 of 22', type: 'Rig Move', status: 'In Progress', date: '2028-03-10', unitIds: ['PM-02', 'LB-01'], crewIds: ['EMP-0026', 'EMP-0018'], origin: 'Well Pad K-5', destination: 'Well Pad K-7', qty: 1, basis: 'per trip', rate: 22_500_000 },
  { id: 'JO-28-03-0401', projectCode: 'HL-2028-002', title: 'Rig move — load 6 of 22', type: 'Rig Move', status: 'Completed', date: '2028-03-09', unitIds: ['PM-02', 'LB-01'], crewIds: ['EMP-0026', 'EMP-0018'], origin: 'Well Pad K-5', destination: 'Well Pad K-7', qty: 1, basis: 'per trip', rate: 22_500_000 },
  { id: 'JO-28-03-0408', projectCode: 'HL-2027-021', title: 'Module M-14 SPMT transport & set', type: 'Lifting', status: 'Completed', date: '2028-03-08', unitIds: ['CR-200-01', 'SP-01'], crewIds: ['EMP-0017'], origin: 'Laydown Yard B', destination: 'Train 2 Pipe Rack', qty: 1, basis: 'per trip', rate: 285_000_000 },
  { id: 'JO-28-03-0409', projectCode: 'PS-2028-003', title: 'Reactor R-201 catalyst loading', type: 'Turnaround', status: 'In Progress', date: '2028-03-10', unitIds: ['CR-050-02', 'FL-01'], crewIds: ['EMP-0019', 'EMP-0020', 'EMP-0025'], origin: 'Catalyst Warehouse', destination: 'Reactor R-201', qty: 1, basis: 'lump sum', rate: 0 },
  { id: 'JO-28-03-0410', projectCode: 'GS-2027-008', title: 'UF membrane skid delivery & set', type: 'Installation', status: 'Planned', date: '2028-03-13', unitIds: ['CR-050-01'], crewIds: ['EMP-0021'], origin: 'Bontang Port', destination: 'Cooling Tower Area', qty: 1, basis: 'lump sum', rate: 0 },
  { id: 'JO-28-03-0416', projectCode: 'HL-2027-014.01', title: 'Coal hauling — shift A (Pit 3 → Jetty)', type: 'Hauling', status: 'Draft', date: '2028-03-11', unitIds: [], crewIds: [], origin: 'Pit 3 ROM', destination: 'Tanjung Jetty', qty: 1_900, basis: 'per tonne', rate: 48_500, recurring: true },
]

// ─── Purchase orders (headers — detail lives in Procurement) ─────────────────
export type POStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Partially Received' | 'Received' | 'Invoiced' | 'Closed'

export interface PurchaseOrder {
  id: string
  prId: string
  vendorId: string
  projectCode: string
  description: string
  amount: number
  status: POStatus
  date: string
  costCategory: string
}

export const purchaseOrders: PurchaseOrder[] = [
  { id: 'PO-2028-0187', prId: 'PR-2028-0231', vendorId: 'VND-00112', projectCode: 'HL-2027-014.01', description: 'Haulage subcontract — March 2028 (4 DT)', amount: 1_180_000_000, status: 'Approved', date: '2028-02-27', costCategory: 'Subcontract' },
  { id: 'PO-2028-0172', prId: 'PR-2028-0209', vendorId: 'VND-00118', projectCode: 'HL-2027-014.01', description: 'HSD fuel supply — February 2028 (120 KL)', amount: 1_644_000_000, status: 'Invoiced', date: '2028-02-01', costCategory: 'Fuel' },
  { id: 'PO-2028-0195', prId: 'PR-2028-0244', vendorId: 'VND-00118', projectCode: 'HL-2027-014.01', description: 'HSD fuel supply — March 2028 (125 KL)', amount: 1_712_500_000, status: 'Partially Received', date: '2028-03-01', costCategory: 'Fuel' },
  { id: 'PO-2028-0164', prId: 'PR-2028-0198', vendorId: 'VND-00131', projectCode: 'PS-2028-003', description: 'Catalyst handling crew & dense loading equipment', amount: 2_350_000_000, status: 'Received', date: '2028-01-20', costCategory: 'Subcontract' },
  { id: 'PO-2028-0181', prId: 'PR-2028-0222', vendorId: 'VND-00188', projectCode: 'PS-2028-003', description: 'Liquid nitrogen — 18 tanker loads', amount: 486_000_000, status: 'Invoiced', date: '2028-02-12', costCategory: 'Materials' },
  { id: 'PO-2028-0190', prId: 'PR-2028-0236', vendorId: 'VND-00194', projectCode: 'PS-2028-003', description: 'Scaffolding erection & dismantle — reactor deck', amount: 312_000_000, status: 'Received', date: '2028-02-20', costCategory: 'Subcontract' },
  { id: 'PO-2027-0911', prId: 'PR-2027-1102', vendorId: 'VND-00145', projectCode: 'GS-2027-008', description: 'UF membrane skid + RO train (2 x 50 m³/h)', amount: 6_420_000_000, status: 'Partially Received', date: '2027-11-15', costCategory: 'Equipment' },
  { id: 'PO-2028-0158', prId: 'PR-2028-0190', vendorId: 'VND-00152', projectCode: 'GS-2027-008', description: 'High-pressure pumps & VFD panels', amount: 1_265_000_000, status: 'Approved', date: '2028-01-11', costCategory: 'Equipment' },
  { id: 'PO-2028-0199', prId: 'PR-2028-0250', vendorId: 'VND-00210', projectCode: 'HL-2028-002', description: 'Rig move support crew & tail cranes', amount: 845_000_000, status: 'Pending Approval', date: '2028-03-06', costCategory: 'Subcontract' },
  { id: 'PO-2028-0176', prId: 'PR-2028-0214', vendorId: 'VND-00177', projectCode: 'GEN-BPN', description: 'Spare parts — PM 1000 hr kits (fleet)', amount: 214_000_000, status: 'Received', date: '2028-02-06', costCategory: 'Spare Parts' },
  { id: 'PO-2028-0183', prId: 'PR-2028-0227', vendorId: 'VND-00203', projectCode: 'HL-2027-014.02', description: 'Heavy haul road permits & escort — Q1', amount: 96_500_000, status: 'Invoiced', date: '2028-02-15', costCategory: 'Permits & Tolls' },
  { id: 'PO-2028-0201', prId: 'PR-2028-0253', vendorId: 'VND-00171', projectCode: 'HL-2027-014.01', description: 'Brake chambers & air dryers — DT fleet', amount: 58_700_000, status: 'Draft', date: '2028-03-09', costCategory: 'Spare Parts' },
]

// ─── Users & roles (demo login) ───────────────────────────────────────────────
export type RoleKey = 'executive' | 'pm' | 'site' | 'admin' | 'finance' | 'procurement' | 'hse'

export const roles: Record<RoleKey, { label: string; userId: string; description: string }> = {
  executive: { label: 'Executive', userId: 'EMP-0001', description: 'Business line & project P/L, pipeline, fleet utilisation' },
  pm: { label: 'Project Manager', userId: 'EMP-0003', description: 'RAB vs actuals, open commitments, running margin' },
  site: { label: 'Site Leader', userId: 'EMP-0006', description: "Today's jobs, available units, timesheets awaiting approval" },
  admin: { label: 'Site / HO Admin', userId: 'EMP-0007', description: 'Jobs held at verification, POD completeness, cost entry' },
  finance: { label: 'Finance', userId: 'EMP-0002', description: 'Invoice ageing, period close status, billing variances' },
  procurement: { label: 'Procurement', userId: 'EMP-0008', description: 'Open RFQs, POs awaiting approval, vendor performance' },
  hse: { label: 'HSE', userId: 'EMP-0010', description: 'Open incidents, permits & certificates approaching expiry' },
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────
const byId = <T, K extends keyof T>(list: T[], key: K) => new Map(list.map((x) => [x[key] as unknown as string, x]))

const customerMap = byId(customers, 'id')
const employeeMap = byId(employees, 'id')
const contractMap = byId(contracts, 'id')
const projectMap = byId(projects, 'code')
const unitMap = byId(units, 'id')
const vendorMap = byId(vendors, 'id')
const jobMap = byId(jobs, 'id')
const poMap = byId(purchaseOrders, 'id')

export const getCustomer = (id?: string) => (id ? customerMap.get(id) : undefined)
export const getEmployee = (id?: string) => (id ? employeeMap.get(id) : undefined)
export const getContract = (id?: string) => (id ? contractMap.get(id) : undefined)
export const getProject = (code?: string) => (code ? projectMap.get(code) : undefined)
export const getUnit = (id?: string) => (id ? unitMap.get(id) : undefined)
export const getVendor = (id?: string) => (id ? vendorMap.get(id) : undefined)
export const getJob = (id?: string) => (id ? jobMap.get(id) : undefined)
export const getPO = (id?: string) => (id ? poMap.get(id) : undefined)

/** Top-level (non-child) project codes */
export const rootProjects = () => projects.filter((p) => !p.parent)
export const childProjects = (code: string) => projects.filter((p) => p.parent === code)

/** Remaining budget = RAB − actuals − commitments (proposal §2.7.3) */
export const remainingBudget = (p: Project) => p.rab - p.actual - p.committed
/** Running margin on revenue recognised to date */
export const runningMargin = (p: Project) => (p.revenue ? ((p.revenue - p.actual) / p.revenue) * 100 : 0)
