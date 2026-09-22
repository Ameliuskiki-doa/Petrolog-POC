/**
 * Operations data — M3 Job & Planning, M4 Fleet/Fuel/Driver, M5 Timesheet & Field Execution, HC manpower.
 * Builds on the shared master data in core.ts (jobs, units, employees, projects) so IDs line up across modules.
 */
import { employees, jobs as coreJobs, units, type Employee, type Job, type Unit } from './core'

// ─── Deterministic pseudo-random (so every reload shows the same data) ───────
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Additional field personnel (outsourced drivers held in Talenta) ─────────
export const opsEmployees: Employee[] = [
  { id: 'EMP-0031', name: 'Sugeng Widodo', position: 'Dump Truck Driver', department: 'Operations', location: 'Kutai Kartanegara', type: 'Direct', licence: { kind: 'SIM B2 Umum', number: 'B2U-6471-1502', expiry: '2029-03-30' } },
  { id: 'EMP-0032', name: 'Irfan Maulana', position: 'Dump Truck Driver', department: 'Operations', location: 'Kutai Kartanegara', type: 'Direct', licence: { kind: 'SIM B2 Umum', number: 'B2U-6471-1618', expiry: '2028-10-17' } },
  { id: 'EMP-0033', name: 'Wayan Sudarma', position: 'Water Truck Driver', department: 'Operations', location: 'Kutai Kartanegara', type: 'Direct', licence: { kind: 'SIM B2 Umum', number: 'B2U-6471-0877', expiry: '2029-12-05' } },
  { id: 'EMP-0034', name: 'Yoga Pratama', position: 'Field Supervisor — Hauling', department: 'Operations', location: 'Kutai Kartanegara', type: 'Direct' },
]

const allPeople = [...employees, ...opsEmployees]
const personMap = new Map(allPeople.map((e) => [e.id, e]))
export const getPerson = (id?: string) => (id ? personMap.get(id) : undefined)
export const personName = (id?: string) => getPerson(id)?.name ?? id ?? '—'

/** Licence status relative to demo today (10 Mar 2028) */
export function licenceState(e?: Employee): 'Valid' | 'Expiring' | 'Expired' | 'None' {
  if (!e?.licence) return 'None'
  const d = (new Date(e.licence.expiry).getTime() - new Date('2028-03-10').getTime()) / 86400000
  return d < 0 ? 'Expired' : d <= 30 ? 'Expiring' : 'Valid'
}
export function certState(u: Unit): 'Valid' | 'Expiring' | 'Expired' {
  const d = (new Date(u.cert.expiry).getTime() - new Date('2028-03-10').getTime()) / 86400000
  return d < 0 ? 'Expired' : d <= 30 ? 'Expiring' : 'Valid'
}

// ─── Jobs: core headers + additional operational jobs ────────────────────────
export const extraJobs: Job[] = [
  { id: 'JO-28-03-0417', projectCode: 'HL-2027-014.01', title: 'Coal hauling — shift B (Pit 3 → Jetty)', type: 'Hauling', status: 'Draft', date: '2028-03-11', unitIds: [], crewIds: [], origin: 'Pit 3 ROM', destination: 'Tanjung Jetty', qty: 1_250, basis: 'per tonne', rate: 48_500, recurring: true },
  { id: 'JO-28-03-0418', projectCode: 'HL-2027-014.01', title: 'Coal hauling — shift A (Pit 3 → Jetty)', type: 'Hauling', status: 'Draft', date: '2028-03-12', unitIds: [], crewIds: [], origin: 'Pit 3 ROM', destination: 'Tanjung Jetty', qty: 1_900, basis: 'per tonne', rate: 48_500, recurring: true },
  { id: 'JO-28-03-0419', projectCode: 'HL-2027-014.02', title: 'Dozer D85 lowbed mobilisation Pit 3 → Pit 4', type: 'Mobilisation', status: 'Draft', date: '2028-03-12', unitIds: [], crewIds: [], origin: 'Pit 3', destination: 'Pit 4', qty: 1, basis: 'per trip', rate: 18_750_000 },
  { id: 'JO-28-03-0420', projectCode: 'HL-2027-014.02', title: 'Crane 100T — crusher liner change lift', type: 'Lifting', status: 'Planned', date: '2028-03-11', unitIds: ['CR-100-01'], crewIds: ['EMP-0013'], origin: 'Pit 3 Workshop', destination: 'Crusher CR-1', qty: 6, basis: 'per hour', rate: 2_150_000 },
  { id: 'JO-28-03-0421', projectCode: 'HL-2028-002', title: 'Rig move — load 8 of 22', type: 'Rig Move', status: 'Planned', date: '2028-03-11', unitIds: ['PM-02', 'LB-01'], crewIds: ['EMP-0026', 'EMP-0018'], origin: 'Well Pad K-5', destination: 'Well Pad K-7', qty: 1, basis: 'per trip', rate: 22_500_000 },
  { id: 'JO-28-03-0422', projectCode: 'HL-2028-002', title: 'Rig move — load 9 of 22 (mud tanks)', type: 'Rig Move', status: 'Draft', date: '2028-03-12', unitIds: [], crewIds: [], origin: 'Well Pad K-5', destination: 'Well Pad K-7', qty: 1, basis: 'per trip', rate: 22_500_000 },
  { id: 'JO-28-03-0423', projectCode: 'HL-2027-021', title: 'Module M-15 SPMT transport & set', type: 'Lifting', status: 'Planned', date: '2028-03-14', unitIds: ['CR-200-01', 'SP-01'], crewIds: ['EMP-0017'], origin: 'Laydown Yard B', destination: 'Train 2 Pipe Rack', qty: 1, basis: 'per trip', rate: 285_000_000 },
  { id: 'JO-28-03-0424', projectCode: 'PS-2028-003', title: 'Reactor R-202 catalyst unloading', type: 'Turnaround', status: 'Planned', date: '2028-03-13', unitIds: ['CR-050-02', 'FL-01'], crewIds: ['EMP-0019', 'EMP-0020', 'EMP-0025'], origin: 'Reactor R-202', destination: 'Spent Catalyst Bay', qty: 1, basis: 'lump sum', rate: 0 },
  { id: 'JO-28-03-0425', projectCode: 'GS-2027-008', title: 'RO train skid lift & set', type: 'Installation', status: 'Draft', date: '2028-03-15', unitIds: [], crewIds: [], origin: 'Bontang Port', destination: 'RO Building', qty: 1, basis: 'lump sum', rate: 0 },
  { id: 'JO-28-03-0426', projectCode: 'HL-2027-014.02', title: 'Crane lift — pump barge pontoon at Jetty', type: 'Lifting', status: 'Draft', date: '2028-03-13', unitIds: [], crewIds: [], origin: 'Tanjung Jetty', destination: 'Tanjung Jetty', qty: 5, basis: 'per hour', rate: 2_150_000 },
  { id: 'JO-28-03-0395', projectCode: 'HL-2027-014.01', title: 'Coal hauling — shift B (Pit 3 → Jetty)', type: 'Hauling', status: 'Completed', date: '2028-03-09', unitIds: ['DT-01', 'DT-05'], crewIds: ['EMP-0031', 'EMP-0032'], origin: 'Pit 3 ROM', destination: 'Tanjung Jetty', qty: 1_205, basis: 'per tonne', rate: 48_500, recurring: true },
  { id: 'JO-28-03-0384', projectCode: 'HL-2027-014.01', title: 'Coal hauling — shift B (Pit 3 → Jetty)', type: 'Hauling', status: 'Verified', date: '2028-03-07', unitIds: ['DT-02', 'DT-05'], crewIds: ['EMP-0031', 'EMP-0032'], origin: 'Pit 3 ROM', destination: 'Tanjung Jetty', qty: 1_280, basis: 'per tonne', rate: 48_500, recurring: true },
  { id: 'JO-28-03-0362', projectCode: 'HL-2028-002', title: 'Rig move — load 5 of 22', type: 'Rig Move', status: 'Verified', date: '2028-03-06', unitIds: ['PM-02', 'LB-01'], crewIds: ['EMP-0026', 'EMP-0018'], origin: 'Well Pad K-5', destination: 'Well Pad K-7', qty: 1, basis: 'per trip', rate: 22_500_000 },
  { id: 'JO-28-02-0279', projectCode: 'HL-2028-002', title: 'Rig move — load 3 of 22', type: 'Rig Move', status: 'Billed', date: '2028-02-24', unitIds: ['PM-02', 'LB-01'], crewIds: ['EMP-0026', 'EMP-0018'], origin: 'Well Pad K-5', destination: 'Well Pad K-7', qty: 1, basis: 'per trip', rate: 22_500_000 },
  { id: 'JO-28-02-0266', projectCode: 'HL-2027-021', title: 'Module M-12 SPMT transport & set', type: 'Lifting', status: 'Billed', date: '2028-02-21', unitIds: ['CR-200-01', 'SP-01'], crewIds: ['EMP-0017'], origin: 'Laydown Yard B', destination: 'Train 2 Pipe Rack', qty: 1, basis: 'per trip', rate: 285_000_000 },
]

export const allJobs: Job[] = [...coreJobs, ...extraJobs]

export type Shift = 'Day' | 'Night' | 'Full day'
export interface JobMeta {
  endDate?: string
  shift: Shift
  supervisorId: string
  contractId?: string
  /** Reasons the ops admin is holding the job at the verification gate */
  held?: string[]
  dispatchedAt?: string
  acknowledgedAt?: string
}

const supFor = (j: Job) => (j.projectCode.startsWith('PS') ? 'EMP-0029' : j.projectCode.startsWith('GS') ? 'EMP-0005' : j.projectCode === 'HL-2028-002' ? 'EMP-0003' : j.projectCode === 'HL-2027-021' ? 'EMP-0003' : 'EMP-0034')

const metaOverrides: Record<string, Partial<JobMeta>> = {
  'JO-28-03-0413': { shift: 'Night' },
  'JO-28-03-0417': { shift: 'Night' },
  'JO-28-03-0391': { shift: 'Night', held: ['Weighbridge ticket WB-0308-117 missing for 2 trips'] },
  'JO-28-03-0395': { shift: 'Night', held: ['Tonnage 1,205 t vs weighbridge 1,168 t (−3.1%) exceeds 2% tolerance', 'Timesheet EMP-0032 awaiting supervisor approval'] },
  'JO-28-03-0384': { shift: 'Night' },
  'JO-28-03-0398': { held: ['Toll receipt photo unreadable (Samarinda–Balikpapan toll)'] },
  'JO-28-03-0401': { held: [] },
  'JO-28-03-0408': { held: ['Client lift sign-off (Train 2 area authority) not yet attached'] },
  'JO-28-03-0409': { endDate: '2028-03-12', shift: 'Full day' },
  'JO-28-03-0424': { endDate: '2028-03-15', shift: 'Full day' },
  'JO-28-03-0410': { endDate: '2028-03-14', shift: 'Full day' },
  'JO-28-03-0425': { endDate: '2028-03-16', shift: 'Full day' },
  'JO-28-03-0423': { shift: 'Full day' },
  'JO-28-03-0415': { shift: 'Day' },
  'JO-28-03-0420': { shift: 'Day' },
}

export function jobMeta(j: Job): JobMeta {
  const o = metaOverrides[j.id] ?? {}
  const shift: Shift = o.shift ?? (j.type === 'Hauling' ? (j.title.includes('shift B') ? 'Night' : 'Day') : 'Full day')
  const past = ['Dispatched', 'In Progress', 'Completed', 'Verified', 'Billed'].includes(j.status)
  return {
    shift,
    supervisorId: supFor(j),
    dispatchedAt: past ? `${prevDay(j.date)}T17:${String(10 + (j.id.charCodeAt(12) % 40)).padStart(2, '0')}` : undefined,
    acknowledgedAt: past ? `${prevDay(j.date)}T18:${String(5 + (j.id.charCodeAt(12) % 50)).padStart(2, '0')}` : undefined,
    ...o,
  }
}

function prevDay(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// ─── Recurring schedules (OPS-02) ─────────────────────────────────────────────
export interface RecurringSchedule {
  id: string
  contractId: string
  projectCode: string
  pattern: string
  template: string
  qty: number
  basis: Job['basis']
  rate: number
  shift: Shift
  days: number[] // 0=Sun
  nextRun: string
  generatedTo: string
}

export const recurringSchedules: RecurringSchedule[] = [
  { id: 'RS-011-A', contractId: 'CTR-2027-011', projectCode: 'HL-2027-014.01', pattern: 'Daily · shift A 06:00–18:00', template: 'Coal hauling — shift A (Pit 3 → Jetty)', qty: 1_900, basis: 'per tonne', rate: 48_500, shift: 'Day', days: [0, 1, 2, 3, 4, 5, 6], nextRun: '2028-03-13', generatedTo: '2028-03-12' },
  { id: 'RS-011-B', contractId: 'CTR-2027-011', projectCode: 'HL-2027-014.01', pattern: 'Daily · shift B 18:00–06:00', template: 'Coal hauling — shift B (Pit 3 → Jetty)', qty: 1_250, basis: 'per tonne', rate: 48_500, shift: 'Night', days: [0, 1, 2, 3, 4, 5, 6], nextRun: '2028-03-12', generatedTo: '2028-03-11' },
  { id: 'RS-002-L', contractId: 'CTR-2028-002', projectCode: 'HL-2028-002', pattern: 'Mon · Wed · Fri lowbed trip', template: 'Lowbed trip — Garut area', qty: 1, basis: 'per trip', rate: 22_500_000, shift: 'Day', days: [1, 3, 5], nextRun: '2028-03-13', generatedTo: '2028-03-12' },
]

// ─── Cost & charges outside the base rate (OPS-07) ───────────────────────────
export type ChargeType = 'Toll' | 'Parking' | 'Overtime' | 'Standby' | 'Demurrage' | 'Escort' | 'Meals'
export interface JobCharge {
  id: string
  jobId: string
  type: ChargeType
  description: string
  qty: number
  unitCost: number
  rechargeable: boolean
  source: 'Mobile app' | 'Ops admin' | 'Fuel card' | 'e-Toll card'
  receipt: boolean
}

export const jobCharges: JobCharge[] = [
  { id: 'CH-24011', jobId: 'JO-28-03-0412', type: 'Standby', description: 'Queue at Jetty conveyor — client-caused (barge change)', qty: 1.5, unitCost: 950_000, rechargeable: true, source: 'Mobile app', receipt: false },
  { id: 'CH-24012', jobId: 'JO-28-03-0412', type: 'Meals', description: 'Crew meal allowance shift A (3 pax)', qty: 3, unitCost: 45_000, rechargeable: false, source: 'Mobile app', receipt: true },
  { id: 'CH-23980', jobId: 'JO-28-03-0398', type: 'Toll', description: 'Samarinda–Balikpapan toll (service run to workshop)', qty: 1, unitCost: 118_500, rechargeable: false, source: 'e-Toll card', receipt: true },
  { id: 'CH-23981', jobId: 'JO-28-03-0398', type: 'Overtime', description: 'Driver overtime 2 hrs × 2 (extended loading)', qty: 4, unitCost: 62_500, rechargeable: false, source: 'Mobile app', receipt: false },
  { id: 'CH-23982', jobId: 'JO-28-03-0398', type: 'Standby', description: 'Pit 3 ROM flooding — loader unavailable (client)', qty: 2, unitCost: 950_000, rechargeable: true, source: 'Mobile app', receipt: false },
  { id: 'CH-23910', jobId: 'JO-28-03-0391', type: 'Overtime', description: 'Night shift extension 1.5 hrs', qty: 1.5, unitCost: 62_500, rechargeable: false, source: 'Mobile app', receipt: false },
  { id: 'CH-23950', jobId: 'JO-28-03-0395', type: 'Standby', description: 'Weighbridge down 22:10–23:40 (client)', qty: 1.5, unitCost: 950_000, rechargeable: true, source: 'Mobile app', receipt: false },
  { id: 'CH-24010', jobId: 'JO-28-03-0401', type: 'Escort', description: 'Police escort — oversize load, Garut–Kamojang road', qty: 1, unitCost: 1_750_000, rechargeable: true, source: 'Ops admin', receipt: true },
  { id: 'CH-24013', jobId: 'JO-28-03-0401', type: 'Parking', description: 'Overnight parking, Samarang rest area', qty: 1, unitCost: 75_000, rechargeable: false, source: 'Mobile app', receipt: true },
  { id: 'CH-24014', jobId: 'JO-28-03-0401', type: 'Toll', description: 'Cipularang toll (return empty)', qty: 1, unitCost: 214_000, rechargeable: false, source: 'e-Toll card', receipt: true },
  { id: 'CH-24080', jobId: 'JO-28-03-0408', type: 'Demurrage', description: 'Module set delayed 6 hrs — area permit not issued by client', qty: 6, unitCost: 1_450_000, rechargeable: true, source: 'Ops admin', receipt: false },
  { id: 'CH-24081', jobId: 'JO-28-03-0408', type: 'Overtime', description: 'Rigging crew overtime 3 hrs × 4', qty: 12, unitCost: 78_000, rechargeable: false, source: 'Mobile app', receipt: false },
  { id: 'CH-23770', jobId: 'JO-28-03-0377', type: 'Overtime', description: 'Driver overtime 2 hrs × 2', qty: 4, unitCost: 62_500, rechargeable: false, source: 'Mobile app', receipt: false },
  { id: 'CH-23500', jobId: 'JO-28-03-0350', type: 'Escort', description: 'Pilot vehicle & flagman, haul road crossing', qty: 1, unitCost: 650_000, rechargeable: false, source: 'Ops admin', receipt: true },
  { id: 'CH-23501', jobId: 'JO-28-03-0350', type: 'Standby', description: 'Waiting for client clearance at Pit 4 gate', qty: 2, unitCost: 950_000, rechargeable: true, source: 'Mobile app', receipt: false },
  { id: 'CH-24050', jobId: 'JO-28-03-0405', type: 'Toll', description: 'Cileunyi toll gate', qty: 1, unitCost: 96_000, rechargeable: false, source: 'e-Toll card', receipt: true },
  { id: 'CH-23840', jobId: 'JO-28-03-0384', type: 'Overtime', description: 'Night shift extension 1 hr × 2', qty: 2, unitCost: 62_500, rechargeable: false, source: 'Mobile app', receipt: false },
]
export const chargeAmount = (c: JobCharge) => c.qty * c.unitCost

// ─── POD & documents (OPS-08/09) ──────────────────────────────────────────────
export interface JobDoc {
  id: string
  kind: 'Cargo photo' | 'Signature' | 'Delivery note' | 'Weighbridge ticket' | 'Lift plan' | 'Receipt'
  name: string
  capturedAt: string
  syncedAt: string
  offline: boolean
  by: string
}

export function jobDocuments(j: Job): JobDoc[] {
  const idx = ['Draft', 'Planned', 'Dispatched', 'In Progress', 'Completed', 'Verified', 'Billed'].indexOf(j.status)
  if (idx < 3) return j.type === 'Lifting' ? [{ id: `${j.id}-LP`, kind: 'Lift plan', name: `Lift plan rev.2 — ${j.destination}.pdf`, capturedAt: `${prevDay(j.date)}T14:20`, syncedAt: `${prevDay(j.date)}T14:20`, offline: false, by: 'EMP-0007' }] : []
  const driver = j.crewIds[0] ?? 'EMP-0034'
  const d = j.date
  const docs: JobDoc[] = [
    { id: `${j.id}-P1`, kind: 'Cargo photo', name: `Loaded — ${j.origin}`, capturedAt: `${d}T06:48`, syncedAt: `${d}T06:49`, offline: false, by: driver },
  ]
  if (idx >= 4) {
    const offline = j.id.endsWith('5') || j.id.endsWith('1') || j.type === 'Rig Move'
    docs.push(
      { id: `${j.id}-P2`, kind: 'Cargo photo', name: `Unloaded — ${j.destination}`, capturedAt: `${d}T15:32`, syncedAt: offline ? `${d}T17:05` : `${d}T15:33`, offline, by: driver },
      { id: `${j.id}-DN`, kind: 'Delivery note', name: `Delivery note DN-${j.id.slice(-4)}`, capturedAt: `${d}T15:36`, syncedAt: offline ? `${d}T17:05` : `${d}T15:37`, offline, by: driver },
      { id: `${j.id}-SG`, kind: 'Signature', name: `Receiver signature — ${j.type === 'Hauling' ? 'Jetty checker' : 'Client area authority'}`, capturedAt: `${d}T15:38`, syncedAt: offline ? `${d}T17:05` : `${d}T15:38`, offline, by: driver },
    )
    if (j.type === 'Hauling') docs.push({ id: `${j.id}-WB`, kind: 'Weighbridge ticket', name: `Weighbridge summary WB-${j.date.slice(5).replace('-', '')}`, capturedAt: `${d}T18:02`, syncedAt: `${d}T18:02`, offline: false, by: 'EMP-0034' })
  }
  if (j.type === 'Lifting') docs.unshift({ id: `${j.id}-LP`, kind: 'Lift plan', name: `Lift plan rev.2 — ${j.destination}.pdf`, capturedAt: `${prevDay(j.date)}T14:20`, syncedAt: `${prevDay(j.date)}T14:20`, offline: false, by: 'EMP-0007' })
  return docs
}

// ─── Field check-in timeline with geofence stamps (OPS-18) ───────────────────
export interface CheckIn {
  stage: 'Loading check-in' | 'Depart' | 'Unloading check-in' | 'POD captured'
  time: string
  geofence: string
  coords: string
  source: 'GPS geofence' | 'Manual (mobile)'
}

export function jobCheckins(j: Job): CheckIn[] {
  const idx = ['Draft', 'Planned', 'Dispatched', 'In Progress', 'Completed', 'Verified', 'Billed'].indexOf(j.status)
  if (idx < 3) return []
  const night = jobMeta(j).shift === 'Night'
  const d = j.date
  const t = (h: number, m: number) => `${d}T${String(night ? (h + 12) % 24 : h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  const out: CheckIn[] = [
    { stage: 'Loading check-in', time: t(6, 12), geofence: `GF · ${j.origin}`, coords: '-0.4412, 117.0931', source: 'GPS geofence' },
    { stage: 'Depart', time: t(7, 3), geofence: `GF · ${j.origin} (exit)`, coords: '-0.4398, 117.1004', source: 'GPS geofence' },
  ]
  if (idx >= 4) {
    out.push(
      { stage: 'Unloading check-in', time: t(15, 18), geofence: `GF · ${j.destination}`, coords: '-0.5127, 117.2366', source: j.type === 'Rig Move' ? 'Manual (mobile)' : 'GPS geofence' },
      { stage: 'POD captured', time: t(15, 38), geofence: `GF · ${j.destination}`, coords: '-0.5129, 117.2371', source: 'Manual (mobile)' },
    )
  }
  return out
}

// ─── Timesheets (OPS-10/11/12, HC-02) ────────────────────────────────────────
export type HourCategory = 'Normal' | 'Overtime' | 'Standby' | 'Travel' | 'Public Holiday'
export type TimesheetStatus = 'Draft' | 'Submitted' | 'Supervisor Approved' | 'Approved' | 'Rejected'
export interface TimesheetEntry {
  id: string
  date: string
  employeeId: string
  projectCode: string
  jobId?: string
  category: HourCategory
  hours: number
  channel: 'Mobile' | 'Web'
  status: TimesheetStatus
  supervisorId: string
  /** deadline for the current approval step */
  deadline: string
  talenta: 'Synced' | 'Pending' | 'Error' | 'Not sent'
  note?: string
}

function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function buildTimesheets(): TimesheetEntry[] {
  const r = rng(72026)
  const out: TimesheetEntry[] = []
  let n = 5100
  const push = (e: Omit<TimesheetEntry, 'id' | 'status' | 'deadline' | 'talenta'> & Partial<Pick<TimesheetEntry, 'status'>>) => {
    const age = (new Date('2028-03-10').getTime() - new Date(e.date).getTime()) / 86400000
    let status: TimesheetStatus = e.status ?? (age >= 3 ? 'Approved' : age === 2 ? (r() < 0.6 ? 'Supervisor Approved' : 'Submitted') : age === 1 ? (r() < 0.25 ? 'Supervisor Approved' : 'Submitted') : r() < 0.15 ? 'Draft' : 'Submitted')
    if (e.hours > 3 && e.category === 'Overtime' && age === 1 && r() < 0.3) status = 'Rejected'
    const deadline = status === 'Submitted' ? addDays(e.date, 1) : status === 'Supervisor Approved' ? addDays(e.date, 3) : addDays(e.date, 3)
    const talenta = status === 'Approved' ? (r() < 0.06 ? 'Error' : 'Synced') : status === 'Supervisor Approved' ? 'Pending' : 'Not sent'
    out.push({ ...e, id: `TS-${n++}`, status, deadline, talenta })
  }
  const window = allJobs.filter((j) => j.date >= '2028-03-04' && j.date <= '2028-03-10' && j.crewIds.length > 0 && j.status !== 'Planned' && j.status !== 'Draft')
  for (const j of window) {
    const meta = jobMeta(j)
    const days = j.id === 'JO-28-03-0409' ? ['2028-03-09', '2028-03-10'] : [j.date]
    for (const d of days) {
      for (const p of j.crewIds) {
        const ch = r() < 0.82 ? 'Mobile' : 'Web'
        push({ date: d, employeeId: p, projectCode: j.projectCode, jobId: j.id, category: 'Normal', hours: 8, channel: ch, supervisorId: meta.supervisorId })
        const ot = j.type === 'Hauling' ? (r() < 0.6 ? 2 : 0) : j.type === 'Rig Move' ? 3 : r() < 0.5 ? 2 : 0
        if (ot) push({ date: d, employeeId: p, projectCode: j.projectCode, jobId: j.id, category: 'Overtime', hours: ot + (r() < 0.2 ? 2 : 0), channel: ch, supervisorId: meta.supervisorId })
        if (j.type === 'Rig Move' && r() < 0.6) push({ date: d, employeeId: p, projectCode: j.projectCode, jobId: j.id, category: 'Travel', hours: 2, channel: ch, supervisorId: meta.supervisorId, note: 'Garut base → Well Pad K-5' })
        if (jobCharges.some((c) => c.jobId === j.id && c.type === 'Standby') && p === j.crewIds[0]) push({ date: d, employeeId: p, projectCode: j.projectCode, jobId: j.id, category: 'Standby', hours: 1.5, channel: ch, supervisorId: meta.supervisorId, note: 'Client-caused standby' })
      }
    }
  }
  // Indirect / split personnel
  for (let i = 0; i < 7; i++) {
    const d = addDays('2028-03-04', i)
    if (i === 1) continue // Sunday
    push({ date: d, employeeId: 'EMP-0007', projectCode: 'GEN-BPN', category: 'Normal', hours: 8, channel: 'Web', supervisorId: 'EMP-0003' })
    push({ date: d, employeeId: 'EMP-0006', projectCode: 'HL-2027-014.01', category: 'Normal', hours: 6, channel: 'Mobile', supervisorId: 'EMP-0003' })
    push({ date: d, employeeId: 'EMP-0006', projectCode: 'HL-2027-014.02', category: 'Normal', hours: 2, channel: 'Mobile', supervisorId: 'EMP-0003' })
    push({ date: d, employeeId: 'EMP-0024', projectCode: 'GEN-BPN', category: 'Normal', hours: 8, channel: 'Web', supervisorId: 'EMP-0012' })
    push({ date: d, employeeId: 'EMP-0034', projectCode: 'HL-2027-014.01', category: 'Normal', hours: 8, channel: 'Mobile', supervisorId: 'EMP-0006' })
  }
  // Rostered rest-day work, paid at the public-holiday category rate
  push({ date: '2028-03-05', employeeId: 'EMP-0016', projectCode: 'HL-2027-014.01', category: 'Public Holiday', hours: 8, channel: 'Mobile', supervisorId: 'EMP-0034', note: 'Sunday roster — rest-day rate' })
  push({ date: '2028-03-05', employeeId: 'EMP-0015', projectCode: 'HL-2027-014.01', category: 'Public Holiday', hours: 8, channel: 'Mobile', supervisorId: 'EMP-0034', note: 'Sunday roster — rest-day rate' })
  return out.sort((a, b) => (a.date === b.date ? a.employeeId.localeCompare(b.employeeId) : b.date.localeCompare(a.date)))
}
export const timesheets: TimesheetEntry[] = buildTimesheets()

export const hourCategories: { key: HourCategory; multiplier: string; rule: string }[] = [
  { key: 'Normal', multiplier: '1.0×', rule: 'Up to 8 hrs/day, 40 hrs/week' },
  { key: 'Overtime', multiplier: '1.5× first hr, 2.0× after', rule: 'Per PP 35/2021; max 4 hrs/day, 18 hrs/week' },
  { key: 'Standby', multiplier: '0.75×', rule: 'Client-caused standby is rechargeable per rate card' },
  { key: 'Travel', multiplier: '1.0×', rule: 'Base-to-site travel outside shift' },
  { key: 'Public Holiday', multiplier: '2.0× / 3.0×', rule: 'National holidays & rostered rest days' },
]

// ─── Fuel (OPS-13/14/15) ──────────────────────────────────────────────────────
export type FuelChannel = 'Manual' | 'Fuel card' | 'GPS fuel stick'
export interface FuelEntry {
  id: string
  time: string
  unitId: string
  jobId?: string
  projectCode: string
  litres: number
  channel: FuelChannel
  meter: number
  location: string
  status: 'Accepted' | 'Duplicate — merged' | 'Pending review'
  duplicateOf?: string
  by?: string
}

export const fuelEntries: FuelEntry[] = [
  { id: 'FE-28031', time: '2028-03-10T05:42', unitId: 'DT-01', jobId: 'JO-28-03-0412', projectCode: 'HL-2027-014.01', litres: 212, channel: 'Fuel card', meter: 246_702, location: 'Pit 3 fuel station', status: 'Accepted' },
  { id: 'FE-28032', time: '2028-03-10T05:43', unitId: 'DT-01', jobId: 'JO-28-03-0412', projectCode: 'HL-2027-014.01', litres: 209.4, channel: 'GPS fuel stick', meter: 246_702, location: 'Pit 3 fuel station', status: 'Duplicate — merged', duplicateOf: 'FE-28031' },
  { id: 'FE-28033', time: '2028-03-10T05:55', unitId: 'DT-02', jobId: 'JO-28-03-0412', projectCode: 'HL-2027-014.01', litres: 205, channel: 'Fuel card', meter: 251_118, location: 'Pit 3 fuel station', status: 'Accepted' },
  { id: 'FE-28034', time: '2028-03-10T06:04', unitId: 'DT-05', jobId: 'JO-28-03-0412', projectCode: 'HL-2027-014.01', litres: 198, channel: 'Fuel card', meter: 98_233, location: 'Pit 3 fuel station', status: 'Accepted' },
  { id: 'FE-28035', time: '2028-03-10T06:10', unitId: 'EX-01', projectCode: 'HL-2027-014.01', litres: 290, channel: 'Manual', meter: 12_421, location: 'Fuel bowser FB-02 (in-pit)', status: 'Accepted', by: 'EMP-0030' },
  { id: 'FE-28036', time: '2028-03-10T07:30', unitId: 'PM-02', jobId: 'JO-28-03-0405', projectCode: 'HL-2028-002', litres: 180, channel: 'Fuel card', meter: 401_104, location: 'SPBU 34.441.07 Garut', status: 'Accepted' },
  { id: 'FE-28037', time: '2028-03-10T08:12', unitId: 'CR-050-02', jobId: 'JO-28-03-0409', projectCode: 'PS-2028-003', litres: 96, channel: 'Manual', meter: 4_114, location: 'Refinery contractor fuel point', status: 'Accepted', by: 'EMP-0019' },
  { id: 'FE-28038', time: '2028-03-10T08:40', unitId: 'DT-03', jobId: 'JO-28-03-0413', projectCode: 'HL-2027-014.01', litres: 238, channel: 'GPS fuel stick', meter: 337_986, location: 'Pit 3 fuel station', status: 'Pending review' },
  { id: 'FE-28039', time: '2028-03-10T08:41', unitId: 'DT-03', jobId: 'JO-28-03-0413', projectCode: 'HL-2027-014.01', litres: 150, channel: 'Manual', meter: 337_986, location: 'Pit 3 fuel station', status: 'Pending review', by: 'EMP-0015' },
  { id: 'FE-28021', time: '2028-03-09T05:40', unitId: 'DT-01', jobId: 'JO-28-03-0398', projectCode: 'HL-2027-014.01', litres: 214, channel: 'Fuel card', meter: 246_540, location: 'Pit 3 fuel station', status: 'Accepted' },
  { id: 'FE-28022', time: '2028-03-09T05:52', unitId: 'DT-02', jobId: 'JO-28-03-0398', projectCode: 'HL-2027-014.01', litres: 207, channel: 'Fuel card', meter: 250_960, location: 'Pit 3 fuel station', status: 'Accepted' },
  { id: 'FE-28023', time: '2028-03-09T06:01', unitId: 'DT-03', jobId: 'JO-28-03-0398', projectCode: 'HL-2027-014.01', litres: 246, channel: 'Fuel card', meter: 337_812, location: 'Pit 3 fuel station', status: 'Accepted' },
  { id: 'FE-28024', time: '2028-03-09T06:01', unitId: 'DT-03', jobId: 'JO-28-03-0398', projectCode: 'HL-2027-014.01', litres: 244.1, channel: 'GPS fuel stick', meter: 337_812, location: 'Pit 3 fuel station', status: 'Duplicate — merged', duplicateOf: 'FE-28023' },
  { id: 'FE-28025', time: '2028-03-09T06:30', unitId: 'WT-01', projectCode: 'HL-2027-014.01', litres: 120, channel: 'Manual', meter: 205_210, location: 'Pit 3 fuel station', status: 'Accepted', by: 'EMP-0033' },
  { id: 'FE-28026', time: '2028-03-09T07:05', unitId: 'PM-02', jobId: 'JO-28-03-0401', projectCode: 'HL-2028-002', litres: 175, channel: 'Fuel card', meter: 400_890, location: 'SPBU 34.441.07 Garut', status: 'Accepted' },
  { id: 'FE-28027', time: '2028-03-09T09:20', unitId: 'CR-100-01', projectCode: 'HL-2027-014.02', litres: 140, channel: 'Manual', meter: 11_832, location: 'Pit 3 Workshop', status: 'Accepted', by: 'EMP-0013' },
  { id: 'FE-28028', time: '2028-03-09T18:10', unitId: 'DT-05', jobId: 'JO-28-03-0395', projectCode: 'HL-2027-014.01', litres: 201, channel: 'Fuel card', meter: 98_050, location: 'Pit 3 fuel station', status: 'Accepted' },
  { id: 'FE-28029', time: '2028-03-09T18:20', unitId: 'DT-01', jobId: 'JO-28-03-0395', projectCode: 'HL-2027-014.01', litres: 188, channel: 'GPS fuel stick', meter: 246_620, location: 'Pit 3 fuel station', status: 'Accepted' },
  { id: 'FE-28011', time: '2028-03-08T06:05', unitId: 'CR-200-01', jobId: 'JO-28-03-0408', projectCode: 'HL-2027-021', litres: 310, channel: 'Manual', meter: 6_402, location: 'Bekapai laydown fuel tank', status: 'Accepted', by: 'EMP-0017' },
  { id: 'FE-28012', time: '2028-03-08T06:40', unitId: 'SP-01', jobId: 'JO-28-03-0408', projectCode: 'HL-2027-021', litres: 145, channel: 'Manual', meter: 2_136, location: 'Bekapai laydown fuel tank', status: 'Accepted', by: 'EMP-0017' },
  { id: 'FE-28013', time: '2028-03-08T07:15', unitId: 'LV-07', projectCode: 'GEN-BPN', litres: 55, channel: 'Fuel card', meter: 84_120, location: 'SPBU 64.751.03 Tenggarong', status: 'Accepted' },
  { id: 'FE-28014', time: '2028-03-08T13:02', unitId: 'FL-01', jobId: 'JO-28-03-0409', projectCode: 'PS-2028-003', litres: 38, channel: 'Manual', meter: 5_604, location: 'Refinery contractor fuel point', status: 'Accepted', by: 'EMP-0025' },
]

export interface FuelRatio {
  unitId: string
  jobId?: string
  projectCode: string
  basis: 'km/L' | 'L/hr'
  distanceOrHours: number
  litres: number
  baseline: number
}
export const fuelRatios: FuelRatio[] = [
  { unitId: 'DT-01', jobId: 'JO-28-03-0398', projectCode: 'HL-2027-014.01', basis: 'km/L', distanceOrHours: 338, litres: 214, baseline: 1.6 },
  { unitId: 'DT-02', jobId: 'JO-28-03-0398', projectCode: 'HL-2027-014.01', basis: 'km/L', distanceOrHours: 331, litres: 207, baseline: 1.6 },
  { unitId: 'DT-03', jobId: 'JO-28-03-0398', projectCode: 'HL-2027-014.01', basis: 'km/L', distanceOrHours: 334, litres: 246, baseline: 1.6 },
  { unitId: 'DT-05', jobId: 'JO-28-03-0395', projectCode: 'HL-2027-014.01', basis: 'km/L', distanceOrHours: 327, litres: 201, baseline: 1.6 },
  { unitId: 'DT-06', projectCode: 'HL-2027-014.01', basis: 'km/L', distanceOrHours: 162, litres: 99, baseline: 1.6 },
  { unitId: 'WT-01', projectCode: 'HL-2027-014.01', basis: 'km/L', distanceOrHours: 142, litres: 120, baseline: 1.25 },
  { unitId: 'PM-01', jobId: 'JO-28-03-0350', projectCode: 'HL-2027-014.02', basis: 'km/L', distanceOrHours: 96, litres: 58, baseline: 1.8 },
  { unitId: 'PM-02', jobId: 'JO-28-03-0401', projectCode: 'HL-2028-002', basis: 'km/L', distanceOrHours: 214, litres: 175, baseline: 1.35 },
  { unitId: 'LV-07', projectCode: 'GEN-BPN', basis: 'km/L', distanceOrHours: 412, litres: 55, baseline: 7.8 },
  { unitId: 'EX-01', projectCode: 'HL-2027-014.01', basis: 'L/hr', distanceOrHours: 11, litres: 290, baseline: 27 },
  { unitId: 'CR-100-01', projectCode: 'HL-2027-014.02', basis: 'L/hr', distanceOrHours: 10, litres: 140, baseline: 14.5 },
  { unitId: 'CR-200-01', jobId: 'JO-28-03-0408', projectCode: 'HL-2027-021', basis: 'L/hr', distanceOrHours: 14, litres: 310, baseline: 21 },
  { unitId: 'CR-050-02', jobId: 'JO-28-03-0409', projectCode: 'PS-2028-003', basis: 'L/hr', distanceOrHours: 9, litres: 96, baseline: 9.5 },
  { unitId: 'SP-01', jobId: 'JO-28-03-0408', projectCode: 'HL-2027-021', basis: 'L/hr', distanceOrHours: 6, litres: 145, baseline: 26 },
  { unitId: 'FL-01', jobId: 'JO-28-03-0409', projectCode: 'PS-2028-003', basis: 'L/hr', distanceOrHours: 7.5, litres: 38, baseline: 4.8 },
]
/** Actual ratio and consumption deviation vs baseline (positive = burning more fuel) */
export function ratioStats(r: FuelRatio) {
  const actual = r.basis === 'km/L' ? r.distanceOrHours / r.litres : r.litres / r.distanceOrHours
  const consumptionDev = r.basis === 'km/L' ? (r.baseline / actual - 1) * 100 : (actual / r.baseline - 1) * 100
  return { actual, consumptionDev }
}

export const fuelThresholds: { category: Unit['category']; basis: 'km/L' | 'L/hr'; baseline: number; tolerance: number }[] = [
  { category: 'Dump Truck', basis: 'km/L', baseline: 1.6, tolerance: 10 },
  { category: 'Prime Mover', basis: 'km/L', baseline: 1.6, tolerance: 12 },
  { category: 'Water Truck', basis: 'km/L', baseline: 1.25, tolerance: 15 },
  { category: 'Light Vehicle', basis: 'km/L', baseline: 7.8, tolerance: 15 },
  { category: 'Excavator', basis: 'L/hr', baseline: 27, tolerance: 12 },
  { category: 'Crane', basis: 'L/hr', baseline: 14.5, tolerance: 15 },
  { category: 'SPMT', basis: 'L/hr', baseline: 26, tolerance: 15 },
  { category: 'Forklift', basis: 'L/hr', baseline: 4.8, tolerance: 15 },
]

export interface FuelAnomaly {
  id: string
  unitId: string
  detected: string
  metric: string
  deviation: number
  threshold: number
  status: 'Open' | 'Investigating' | 'Closed — explained' | 'Closed — loss confirmed'
  assignee: string
  note: string
}
export const fuelAnomalies: FuelAnomaly[] = [
  { id: 'FA-2028-031', unitId: 'DT-03', detected: '2028-03-09T21:00', metric: 'km/L (7-day rolling)', deviation: 18, threshold: 10, status: 'Open', assignee: 'EMP-0007', note: '1.36 km/L vs 1.60 baseline. Same route & payload as DT-01/02. Two conflicting entries on 10 Mar (stick 238 L vs manual 150 L).' },
  { id: 'FA-2028-030', unitId: 'PM-02', detected: '2028-03-08T21:00', metric: 'km/L (per job)', deviation: 13.5, threshold: 12, status: 'Investigating', assignee: 'EMP-0003', note: 'Gradient on Kamojang access road with 58 t substructure — likely explained; awaiting route comparison.' },
  { id: 'FA-2028-027', unitId: 'SP-01', detected: '2028-03-05T21:00', metric: 'L/hr (per job)', deviation: -6, threshold: 15, status: 'Closed — explained', assignee: 'EMP-0007', note: 'Idle power pack hours logged as operating; hour meter corrected.' },
  { id: 'FA-2028-022', unitId: 'DT-04', detected: '2028-02-26T21:00', metric: 'km/L (7-day rolling)', deviation: 22, threshold: 10, status: 'Closed — loss confirmed', assignee: 'EMP-0012', note: 'Injector #4 leak found (WO-2028-0147). Fuel loss 310 L charged to maintenance.' },
]

// ─── Driver behaviour (OPS-16/17) ─────────────────────────────────────────────
export type DriverEventType = 'Overspeed' | 'Harsh braking' | 'Harsh acceleration' | 'Idling'
export interface DriverEvent {
  id: string
  time: string
  driverId: string
  unitId: string
  type: DriverEventType
  detail: string
  location: string
  source: 'GPS' | 'Dashcam'
  clip: boolean
}

export const drivers: { id: string; unitId: string; kmMTD: number }[] = [
  { id: 'EMP-0015', unitId: 'DT-03', kmMTD: 3_120 },
  { id: 'EMP-0016', unitId: 'DT-02', kmMTD: 2_980 },
  { id: 'EMP-0014', unitId: 'PM-01', kmMTD: 1_420 },
  { id: 'EMP-0031', unitId: 'DT-01', kmMTD: 3_260 },
  { id: 'EMP-0032', unitId: 'DT-05', kmMTD: 3_340 },
  { id: 'EMP-0033', unitId: 'WT-01', kmMTD: 1_310 },
  { id: 'EMP-0026', unitId: 'PM-02', kmMTD: 2_210 },
  { id: 'EMP-0006', unitId: 'LV-07', kmMTD: 2_870 },
]

function buildDriverEvents(): DriverEvent[] {
  const r = rng(1607)
  // relative propensity per driver per event type
  const profile: Record<string, [number, number, number, number]> = {
    'EMP-0015': [6, 4, 3, 5],
    'EMP-0016': [9, 6, 5, 3],
    'EMP-0014': [1, 1, 1, 2],
    'EMP-0031': [2, 2, 1, 3],
    'EMP-0032': [3, 1, 2, 2],
    'EMP-0033': [1, 0, 1, 6],
    'EMP-0026': [2, 3, 1, 1],
    'EMP-0006': [3, 1, 2, 4],
  }
  const types: DriverEventType[] = ['Overspeed', 'Harsh braking', 'Harsh acceleration', 'Idling']
  const locs: Record<string, string[]> = {
    'EMP-0026': ['Kamojang access road km 4', 'Garut–Samarang road', 'Well Pad K-7 gate'],
    default: ['Haul road km 12', 'Haul road km 27 (downhill)', 'Pit 3 ramp', 'Tanjung Jetty queue', 'Haul road km 35 junction', 'Workshop yard'],
  }
  const out: DriverEvent[] = []
  let n = 8800
  for (const d of drivers) {
    const p = profile[d.id]
    types.forEach((t, ti) => {
      for (let i = 0; i < p[ti]; i++) {
        const day = 1 + Math.floor(r() * 10)
        const h = 5 + Math.floor(r() * 16)
        const m = Math.floor(r() * 60)
        const loc = (locs[d.id] ?? locs.default)[Math.floor(r() * (locs[d.id] ?? locs.default).length)]
        const detail =
          t === 'Overspeed' ? `${48 + Math.floor(r() * 18)} km/h in 40 km/h zone` : t === 'Harsh braking' ? `−${(0.42 + r() * 0.2).toFixed(2)} g` : t === 'Harsh acceleration' ? `+${(0.35 + r() * 0.15).toFixed(2)} g` : `${12 + Math.floor(r() * 40)} min engine idle`
        out.push({
          id: `DE-${n++}`,
          time: `2028-03-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          driverId: d.id,
          unitId: d.unitId,
          type: t,
          detail,
          location: loc,
          source: t === 'Idling' || t === 'Overspeed' ? 'GPS' : 'Dashcam',
          clip: t === 'Harsh braking' || (t === 'Harsh acceleration' && r() < 0.5),
        })
      }
    })
  }
  return out.sort((a, b) => b.time.localeCompare(a.time))
}
export const driverEvents: DriverEvent[] = buildDriverEvents()

export const defaultWeights: Record<DriverEventType, number> = { Overspeed: 5, 'Harsh braking': 4, 'Harsh acceleration': 3, Idling: 1 }

/** Weekly driver score history (Feb–Mar), used for periodic report trend */
export const driverScoreTrend = [
  { week: 'W06', fleet: 84, best: 97, worst: 70 },
  { week: 'W07', fleet: 85, best: 96, worst: 68 },
  { week: 'W08', fleet: 83, best: 97, worst: 64 },
  { week: 'W09', fleet: 86, best: 98, worst: 71 },
  { week: 'W10', fleet: 82, best: 96, worst: 62 },
]

// ─── Tracking (OPS-18/20) ────────────────────────────────────────────────────
export interface Geofence {
  id: string
  name: string
  kind: 'Client site' | 'Own site' | 'Checkpoint'
  x: number
  y: number
  r: number
}
export const geofences: Geofence[] = [
  { id: 'GF-P3', name: 'Pit 3 ROM', kind: 'Client site', x: 150, y: 360, r: 46 },
  { id: 'GF-P4', name: 'Pit 4', kind: 'Client site', x: 95, y: 190, r: 36 },
  { id: 'GF-CR', name: 'Crusher CR-1', kind: 'Client site', x: 285, y: 300, r: 26 },
  { id: 'GF-WS', name: 'Pit 3 Workshop', kind: 'Own site', x: 250, y: 440, r: 28 },
  { id: 'GF-KM27', name: 'Haul road km 27 checkpoint', kind: 'Checkpoint', x: 520, y: 230, r: 18 },
  { id: 'GF-JT', name: 'Tanjung Jetty', kind: 'Client site', x: 735, y: 120, r: 44 },
]

/** Haul road polyline, Pit 3 → Crusher → km 27 → Jetty */
export const haulRoad: [number, number][] = [
  [150, 360], [205, 335], [285, 300], [350, 292], [410, 270], [470, 250], [520, 230], [580, 205], [630, 170], [690, 140], [735, 120],
]
export const pitAccess: [number, number][] = [[150, 360], [130, 300], [110, 245], [95, 190]]
export const workshopSpur: [number, number][] = [[205, 335], [230, 390], [250, 440]]

export interface TrackedUnit {
  unitId: string
  driverId?: string
  route: 'haul' | 'pit' | 'workshop'
  /** starting phase 0..1 along route (ping-pong) */
  phase: number
  speed: number
}
export const trackedUnits: TrackedUnit[] = [
  { unitId: 'DT-01', driverId: 'EMP-0031', route: 'haul', phase: 0.12, speed: 0.011 },
  { unitId: 'DT-02', driverId: 'EMP-0016', route: 'haul', phase: 0.46, speed: 0.01 },
  { unitId: 'DT-05', driverId: 'EMP-0032', route: 'haul', phase: 0.78, speed: 0.012 },
  { unitId: 'DT-03', driverId: 'EMP-0015', route: 'haul', phase: 1.3, speed: 0.009 },
  { unitId: 'WT-01', driverId: 'EMP-0033', route: 'haul', phase: 0.3, speed: 0.006 },
  { unitId: 'EX-01', driverId: 'EMP-0030', route: 'pit', phase: 0.1, speed: 0.004 },
  { unitId: 'LV-07', driverId: 'EMP-0006', route: 'workshop', phase: 0.5, speed: 0.015 },
  { unitId: 'CR-100-01', driverId: 'EMP-0013', route: 'workshop', phase: 0.02, speed: 0 },
]

export interface DeviceStatus {
  unitId: string
  gps: 'Online' | 'Delayed' | 'Offline' | 'n/a'
  dashcam: 'Online' | 'Delayed' | 'Offline' | 'n/a'
  fuelStick: 'Online' | 'Delayed' | 'Offline' | 'n/a'
  lastPing: string
  adapter: string
}
export const deviceStatus: DeviceStatus[] = units.map((u, i) => {
  const vehicle = ['Dump Truck', 'Prime Mover', 'Water Truck', 'Light Vehicle'].includes(u.category)
  const tracked = u.category !== 'Trailer'
  const off = u.status === 'Breakdown'
  const delayed = u.location === 'Garut' || u.location === 'Bekapai' || i % 7 === 3
  return {
    unitId: u.id,
    gps: !tracked ? 'n/a' : off ? 'Offline' : delayed ? 'Delayed' : 'Online',
    dashcam: vehicle ? (off ? 'Offline' : u.id === 'DT-06' ? 'Offline' : 'Online') : 'n/a',
    fuelStick: ['Dump Truck', 'Prime Mover', 'Excavator', 'Crane'].includes(u.category) ? (off ? 'Offline' : 'Online') : 'n/a',
    lastPing: off ? '2028-03-08T16:42' : delayed ? '2028-03-10T08:31' : '2028-03-10T08:59',
    adapter: vehicle ? 'GPS/dashcam vendor REST API (webhook)' : tracked ? 'GPS tracker REST API (polling 60 s)' : '—',
  }
})

// ─── Fleet: unit extensions (utilisation trend, maintenance, depreciation) ───
export interface UnitOps {
  unitId: string
  currentJobId?: string
  openWorkOrder?: { id: string; title: string; eta: string }
  usefulLifeYears: number
  depreciationBasis: string
  fuelBasis: 'km/L' | 'L/hr'
  utilTrend: { month: string; operating: number; idle: number; maintenance: number }[]
}

const WO: Record<string, { id: string; title: string; eta: string }> = {
  'CR-100-02': { id: 'WO-2028-0142', title: 'Boom hoist winch overhaul', eta: '2028-03-14' },
  'PM-03': { id: 'WO-2028-0151', title: 'Breakdown — gearbox failure on haul road km 19', eta: '2028-03-18' },
  'DT-04': { id: 'WO-2028-0147', title: 'PM 1000 hr service + injector replacement', eta: '2028-03-11' },
}

export const unitOps: UnitOps[] = units.map((u, i) => {
  const r = rng(300 + i)
  const months = ['Oct 27', 'Nov 27', 'Dec 27', 'Jan 28', 'Feb 28']
  const base = u.hoursMTD
  const scale = 3 // MTD covers 10 days; a full month ≈ 3×
  const utilTrend = months.map((m) => {
    const op = Math.round((base.operating || 80) * scale * (0.75 + r() * 0.35))
    const idle = Math.round((base.idle || 20) * scale * (0.6 + r() * 0.6))
    const mt = Math.round((r() < 0.25 ? 40 + r() * 60 : r() * 18) + (base.maintenance > 30 ? 30 : 0))
    return { month: m, operating: op, idle, maintenance: mt }
  })
  utilTrend.push({ month: 'Mar 28 (MTD)', ...base })
  const cur = allJobs.find((j) => j.unitIds.includes(u.id) && (j.status === 'In Progress' || j.status === 'Dispatched'))
  const life = u.category === 'Crane' || u.category === 'SPMT' ? 16 : u.category === 'Light Vehicle' || u.category === 'Forklift' ? 8 : 10
  return {
    unitId: u.id,
    currentJobId: cur?.id,
    openWorkOrder: WO[u.id],
    usefulLifeYears: life,
    depreciationBasis: `Straight-line over ${life} years, 10% residual (commercial). Fiscal: Group ${life >= 16 ? '4 (20 yrs, 5%)' : life >= 10 ? '3 (16 yrs, 6.25%)' : '2 (8 yrs, 12.5%)'}. Operating hours feed the unit-hour cost rate charged to project codes.`,
    fuelBasis: u.meterUnit === 'km' ? 'km/L' : 'L/hr',
    utilTrend,
  }
})
export const getUnitOps = (id?: string) => unitOps.find((x) => x.unitId === id)

/** Unit availability for planning (OPS-04 + §2.5.5 assignment blocking) */
export function unitBlock(u: Unit): string | undefined {
  if (u.status === 'Breakdown') return `Breakdown — open work order ${WO[u.id]?.id ?? ''} (M15)`.trim()
  if (u.status === 'Maintenance') return `In maintenance — ${WO[u.id]?.id ?? 'open WO'} until ${WO[u.id]?.eta ?? 'TBC'} (M15)`
  if (certState(u) === 'Expired') return `${u.cert.number.startsWith('SILO') ? 'SILO' : 'KIR'} ${u.cert.number} expired ${u.cert.expiry} — assignment blocked (§2.5.5)`
  return undefined
}
export function crewBlock(e?: Employee): string | undefined {
  if (!e?.licence) return undefined
  if (licenceState(e) === 'Expired') return `${e.licence.kind} ${e.licence.number} expired ${e.licence.expiry} — assignment blocked (§2.5.5)`
  return undefined
}

// ─── Manpower allocation (HC-01/05/06/07) ────────────────────────────────────
export interface Allocation {
  employeeId: string
  period: string
  kind: 'Direct' | 'Indirect'
  splits: { projectCode: string; pct: number }[]
  monthlyCost: number
}
export const allocations: Allocation[] = [
  { employeeId: 'EMP-0006', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'HL-2027-014.01', pct: 75 }, { projectCode: 'HL-2027-014.02', pct: 25 }], monthlyCost: 21_500_000 },
  { employeeId: 'EMP-0013', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'HL-2027-014.02', pct: 100 }], monthlyCost: 14_800_000 },
  { employeeId: 'EMP-0014', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'HL-2027-014.01', pct: 60 }, { projectCode: 'HL-2027-014.02', pct: 40 }], monthlyCost: 11_200_000 },
  { employeeId: 'EMP-0015', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'HL-2027-014.01', pct: 100 }], monthlyCost: 9_600_000 },
  { employeeId: 'EMP-0016', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'HL-2027-014.01', pct: 100 }], monthlyCost: 9_600_000 },
  { employeeId: 'EMP-0031', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'HL-2027-014.01', pct: 100 }], monthlyCost: 9_400_000 },
  { employeeId: 'EMP-0032', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'HL-2027-014.01', pct: 100 }], monthlyCost: 9_400_000 },
  { employeeId: 'EMP-0033', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'HL-2027-014.01', pct: 100 }], monthlyCost: 8_900_000 },
  { employeeId: 'EMP-0034', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'HL-2027-014.01', pct: 100 }], monthlyCost: 15_600_000 },
  { employeeId: 'EMP-0030', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'HL-2027-014.01', pct: 70 }, { projectCode: 'HL-2027-014.02', pct: 30 }], monthlyCost: 12_300_000 },
  { employeeId: 'EMP-0017', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'HL-2027-021', pct: 100 }], monthlyCost: 15_100_000 },
  { employeeId: 'EMP-0018', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'HL-2028-002', pct: 80 }, { projectCode: 'HL-2027-021', pct: 20 }], monthlyCost: 10_800_000 },
  { employeeId: 'EMP-0026', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'HL-2028-002', pct: 100 }], monthlyCost: 10_200_000 },
  { employeeId: 'EMP-0019', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'PS-2028-003', pct: 100 }], monthlyCost: 16_400_000 },
  { employeeId: 'EMP-0020', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'PS-2028-003', pct: 100 }], monthlyCost: 11_700_000 },
  { employeeId: 'EMP-0025', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'PS-2028-003', pct: 100 }], monthlyCost: 9_300_000 },
  { employeeId: 'EMP-0029', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'PS-2028-003', pct: 90 }, { projectCode: 'GEN-BPN', pct: 10 }], monthlyCost: 22_800_000 },
  { employeeId: 'EMP-0021', period: '2028-03', kind: 'Direct', splits: [{ projectCode: 'GS-2027-008', pct: 70 }, { projectCode: 'GS-2028-001', pct: 30 }], monthlyCost: 19_600_000 },
  { employeeId: 'EMP-0003', period: '2028-03', kind: 'Indirect', splits: [{ projectCode: 'GEN-BPN', pct: 100 }], monthlyCost: 42_000_000 },
  { employeeId: 'EMP-0007', period: '2028-03', kind: 'Indirect', splits: [{ projectCode: 'GEN-BPN', pct: 100 }], monthlyCost: 11_500_000 },
  { employeeId: 'EMP-0012', period: '2028-03', kind: 'Indirect', splits: [{ projectCode: 'GEN-BPN', pct: 100 }], monthlyCost: 28_500_000 },
  { employeeId: 'EMP-0024', period: '2028-03', kind: 'Indirect', splits: [{ projectCode: 'GEN-BPN', pct: 100 }], monthlyCost: 10_900_000 },
  { employeeId: 'EMP-0010', period: '2028-03', kind: 'Indirect', splits: [{ projectCode: 'GEN-BPN', pct: 100 }], monthlyCost: 36_000_000 },
  { employeeId: 'EMP-0009', period: '2028-03', kind: 'Indirect', splits: [{ projectCode: 'GEN-HO', pct: 100 }], monthlyCost: 14_200_000 },
  { employeeId: 'EMP-0022', period: '2028-03', kind: 'Indirect', splits: [{ projectCode: 'GEN-HO', pct: 100 }], monthlyCost: 13_800_000 },
]

export const labourUtilisation: { projectCode: string; available: number; billable: number; nonBillable: number }[] = [
  { projectCode: 'HL-2027-014.01', available: 1_760, billable: 1_452, nonBillable: 188 },
  { projectCode: 'HL-2027-014.02', available: 420, billable: 286, nonBillable: 74 },
  { projectCode: 'HL-2028-002', available: 360, billable: 318, nonBillable: 30 },
  { projectCode: 'HL-2027-021', available: 220, billable: 168, nonBillable: 36 },
  { projectCode: 'PS-2028-003', available: 780, billable: 712, nonBillable: 44 },
  { projectCode: 'GS-2027-008', available: 140, billable: 92, nonBillable: 38 },
  { projectCode: 'GS-2028-001', available: 60, billable: 18, nonBillable: 36 },
]

export interface PayrollBatch {
  id: string
  period: string
  source: string
  status: 'Imported & charged' | 'Imported — awaiting verified timesheets' | 'Awaiting file' | 'Validation error'
  headcount: number
  gross: number
  receivedAt?: string
  chargedDirect: number
  heldOnGen: number
  unallocated: number
}
export const payrollBatches: PayrollBatch[] = [
  { id: 'PAY-2028-03', period: '2028-03', source: 'Outsource Indonesia (SFTP, CSV)', status: 'Awaiting file', headcount: 0, gross: 0, chargedDirect: 0, heldOnGen: 0, unallocated: 0 },
  { id: 'PAY-2028-02', period: '2028-02', source: 'Outsource Indonesia (SFTP, CSV)', status: 'Imported & charged', headcount: 412, gross: 5_184_000_000, receivedAt: '2028-02-26T10:14', chargedDirect: 3_612_000_000, heldOnGen: 1_553_000_000, unallocated: 19_000_000 },
  { id: 'PAY-2028-01', period: '2028-01', source: 'Outsource Indonesia (SFTP, CSV)', status: 'Imported & charged', headcount: 405, gross: 5_090_000_000, receivedAt: '2028-01-27T09:40', chargedDirect: 3_498_000_000, heldOnGen: 1_592_000_000, unallocated: 0 },
  { id: 'PAY-2027-12', period: '2027-12', source: 'Outsource Indonesia (SFTP, CSV)', status: 'Imported & charged', headcount: 398, gross: 5_402_000_000, receivedAt: '2027-12-22T15:02', chargedDirect: 3_705_000_000, heldOnGen: 1_697_000_000, unallocated: 0 },
]

/** Feb 2028 payroll charged by verified timesheet hours (HC-04) — sample of the direct workforce */
export const payrollCharging: { employeeId: string; gross: number; hours: { projectCode: string; hrs: number }[] }[] = [
  { employeeId: 'EMP-0006', gross: 21_500_000, hours: [{ projectCode: 'HL-2027-014.01', hrs: 142 }, { projectCode: 'HL-2027-014.02', hrs: 58 }] },
  { employeeId: 'EMP-0014', gross: 12_860_000, hours: [{ projectCode: 'HL-2027-014.01', hrs: 96 }, { projectCode: 'HL-2027-014.02', hrs: 112 }] },
  { employeeId: 'EMP-0015', gross: 11_340_000, hours: [{ projectCode: 'HL-2027-014.01', hrs: 214 }] },
  { employeeId: 'EMP-0016', gross: 10_920_000, hours: [{ projectCode: 'HL-2027-014.01', hrs: 206 }] },
  { employeeId: 'EMP-0018', gross: 12_450_000, hours: [{ projectCode: 'HL-2028-002', hrs: 128 }, { projectCode: 'HL-2027-021', hrs: 64 }] },
  { employeeId: 'EMP-0030', gross: 13_100_000, hours: [{ projectCode: 'HL-2027-014.01', hrs: 118 }, { projectCode: 'HL-2027-014.02', hrs: 74 }] },
  { employeeId: 'EMP-0019', gross: 19_250_000, hours: [{ projectCode: 'PS-2028-003', hrs: 224 }] },
  { employeeId: 'EMP-0021', gross: 19_600_000, hours: [{ projectCode: 'GS-2027-008', hrs: 132 }, { projectCode: 'GS-2028-001', hrs: 44 }] },
]
