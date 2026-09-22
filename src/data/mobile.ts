/**
 * Field mobile app demo data (proposal §2.9.3, Part III §3.6; OPS-05/07/09/10/13).
 * The signed-in driver is Eko Prasetya (EMP-0015), unit DT-01, project HL-2027-014.01.
 * Assignments are the core job headers in which EMP-0015 is on the crew — IDs line up with Operations.
 */
import { jobs, getEmployee, getUnit, type Job } from './core'

export const DRIVER_ID = 'EMP-0015'
export const DRIVER_UNIT = 'DT-01'
export const DRIVER_PROJECT = 'HL-2027-014.01'
export const DRIVER_EMAIL = 'eko.prasetya@petrolog.co.id'
export const SUPERVISOR_ID = 'EMP-0006' // Yusuf Hamdani — Site Leader Kutai
export const OPS_ADMIN_ID = 'EMP-0007' // Siti Nurhaliza — Operations Admin

export const driver = () => getEmployee(DRIVER_ID)!
export const driverUnit = () => getUnit(DRIVER_UNIT)!

/** Every job in which the driver is on the crew, newest first */
export const driverJobs = (): Job[] =>
  jobs.filter((j) => j.crewIds.includes(DRIVER_ID)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1))

export interface Geo {
  lat: number
  lng: number
}

export interface SiteInfo {
  name: string
  geo: Geo
  geofenceM: number
  contact: string
}

/** Loading & unloading points used by the Kutai hauling jobs */
export const sites: Record<string, SiteInfo> = {
  'Pit 3 ROM': { name: 'Pit 3 ROM stockpile', geo: { lat: -0.41872, lng: 116.98214 }, geofenceM: 300, contact: 'Pit dispatcher — ch. 4' },
  'Tanjung Jetty': { name: 'Tanjung Jetty coal yard', geo: { lat: -0.52631, lng: 117.14502 }, geofenceM: 250, contact: 'Jetty weighbridge — Pak Samsul' },
}

/** Route data per job (haul distance drives the simulated geofence approach) */
export const routeKm = 21.6

/** Per-job extra information the driver sees on the assignment card */
export interface AssignmentMeta {
  shift: string
  window: string
  loadingBay: string
  targetTonnage: number
  instructions: string[]
  dispatchedBy: string
  dispatchedAt: string
}

export const assignmentMeta: Record<string, AssignmentMeta> = {
  'JO-28-03-0412': {
    shift: 'Shift A',
    window: '06:00 – 18:00',
    loadingBay: 'ROM bay 2 (EX-01)',
    targetTonnage: 620,
    instructions: ['Max speed 40 km/h on haul road KM 6–11 (road works).', 'Use weighbridge lane 2 at the jetty.', 'Radio channel 4 for pit dispatcher.'],
    dispatchedBy: 'Siti Nurhaliza',
    dispatchedAt: '2028-03-09T17:12:00',
  },
  'JO-28-03-0413': {
    shift: 'Shift B',
    window: '18:00 – 06:00',
    loadingBay: 'ROM bay 1 (EX-01)',
    targetTonnage: 410,
    instructions: ['Night shift: light bar and reversing alarm check mandatory in P2H.', 'Fatigue break at KM 11 rest area after trip 3.', 'Jetty stockpile C is full — tip at stockpile D.'],
    dispatchedBy: 'Siti Nurhaliza',
    dispatchedAt: '2028-03-10T07:48:00',
  },
  'JO-28-03-0398': {
    shift: 'Shift A',
    window: '06:00 – 18:00',
    loadingBay: 'ROM bay 2 (EX-01)',
    targetTonnage: 640,
    instructions: ['Standard hauling cycle.'],
    dispatchedBy: 'Siti Nurhaliza',
    dispatchedAt: '2028-03-08T17:05:00',
  },
}

export const defaultMeta: AssignmentMeta = {
  shift: 'Shift A',
  window: '06:00 – 18:00',
  loadingBay: 'ROM bay 2',
  targetTonnage: 600,
  instructions: ['Standard hauling cycle.'],
  dispatchedBy: 'Siti Nurhaliza',
  dispatchedAt: '2028-03-01T17:00:00',
}

export interface TripRecord {
  no: number
  loadedAt: string
  arrivedAt: string
  tonnage: number
  dn: string
  recipient: string
}

/** Trips already delivered today on JO-28-03-0412 before the demo starts */
export const seededTrips: TripRecord[] = [
  { no: 1, loadedAt: '06:18', arrivedAt: '07:02', tonnage: 38.4, dn: 'DN-TJ-280310-0041', recipient: 'Samsul Arifin' },
  { no: 2, loadedAt: '07:31', arrivedAt: '08:14', tonnage: 39.1, dn: 'DN-TJ-280310-0056', recipient: 'Samsul Arifin' },
  { no: 3, loadedAt: '08:40', arrivedAt: '09:21', tonnage: 37.8, dn: 'DN-TJ-280310-0069', recipient: 'Samsul Arifin' },
]

// ─── Timesheet ────────────────────────────────────────────────────────────────
export const hourCategories = ['Normal', 'Overtime', 'Standby', 'Travel', 'Public holiday'] as const
export type HourCategory = (typeof hourCategories)[number]

export interface TimesheetDay {
  date: string
  jobId: string
  projectCode: string
  hours: Partial<Record<HourCategory, number>>
  status: 'Submitted' | 'Supervisor approved' | 'Approved' | 'Queued on device'
}

export const timesheetHistory: TimesheetDay[] = [
  { date: '2028-03-09', jobId: 'JO-28-03-0398', projectCode: 'HL-2027-014.01', hours: { Normal: 8, Overtime: 2.5 }, status: 'Supervisor approved' },
  { date: '2028-03-08', jobId: 'JO-28-03-0391', projectCode: 'HL-2027-014.01', hours: { Normal: 8, Standby: 1.5 }, status: 'Approved' },
  { date: '2028-03-07', jobId: 'JO-28-03-0377', projectCode: 'HL-2027-014.01', hours: { Normal: 8, Overtime: 2 }, status: 'Approved' },
  { date: '2028-03-06', jobId: 'JO-28-03-0377', projectCode: 'HL-2027-014.01', hours: { Normal: 8, Overtime: 1 }, status: 'Approved' },
]

// ─── Fuel ─────────────────────────────────────────────────────────────────────
export const fuelStations = ['Pit 3 fuel station (FS-03)', 'Mobile fuel truck FT-02', 'Jetty fuel point (FS-05)'] as const

export interface FuelRecord {
  at: string
  station: string
  litres: number
  odometer: number
  projectCode: string
  channel: 'Mobile app' | 'Fuel card' | 'Fuel stick (GPS)'
}

export const fuelHistory: FuelRecord[] = [
  { at: '2028-03-09T05:41:00', station: 'Pit 3 fuel station (FS-03)', litres: 212, odometer: 246_880, projectCode: 'HL-2027-014.01', channel: 'Mobile app' },
  { at: '2028-03-08T05:37:00', station: 'Pit 3 fuel station (FS-03)', litres: 205, odometer: 246_402, projectCode: 'HL-2027-014.01', channel: 'Fuel card' },
  { at: '2028-03-07T05:50:00', station: 'Mobile fuel truck FT-02', litres: 218, odometer: 245_921, projectCode: 'HL-2027-014.01', channel: 'Mobile app' },
]
export const lastOdometer = 246_880

// ─── Charges ──────────────────────────────────────────────────────────────────
export const chargeTypes = ['Toll', 'Parking', 'Weighbridge fee', 'Port pass', 'Meal allowance (overtime)'] as const

// ─── P2H pre-start checklist ────────────────────────────────────────────────
export const p2hItems: { key: string; label: string; critical: boolean }[] = [
  { key: 'brakes', label: 'Service & parking brakes', critical: true },
  { key: 'tyres', label: 'Tyres, wheel nuts & pressure', critical: true },
  { key: 'steering', label: 'Steering play', critical: true },
  { key: 'lights', label: 'Head, brake & light bar', critical: true },
  { key: 'alarm', label: 'Reversing alarm & horn', critical: true },
  { key: 'seatbelt', label: 'Seatbelt & cabin', critical: true },
  { key: 'fluids', label: 'Engine oil, coolant, hydraulic', critical: false },
  { key: 'leaks', label: 'No oil / air leaks', critical: false },
  { key: 'mirrors', label: 'Mirrors & wipers', critical: false },
  { key: 'apar', label: 'Fire extinguisher (APAR) tagged', critical: false },
  { key: 'dumpbody', label: 'Dump body & tailgate locks', critical: false },
  { key: 'radio', label: 'Radio & GPS device powered', critical: false },
]

// ─── Driver score (telematics + operational) ───────────────────────────────
export const driverScore = {
  overall: 87,
  rank: '4 of 22 drivers · Kutai',
  parts: [
    { label: 'Safe driving (telematics)', value: 91, note: '2 harsh-brake events in 30 days' },
    { label: 'On-time trips', value: 88, note: '146 of 166 within cycle target' },
    { label: 'POD completeness', value: 96, note: 'Photo + signature + DN on 159 of 166' },
    { label: 'Fuel efficiency', value: 74, note: '1.82 km/L vs fleet 1.91 km/L' },
  ],
}

// ─── Seeded synced history for the sync screen ─────────────────────────────
export interface SeedSync {
  kind: string
  title: string
  detail: string
  at: string
  idem: string
}

export const seededSyncHistory: SeedSync[] = [
  { kind: 'pod', title: 'POD — trip 3', detail: 'JO-28-03-0412 · 37.8 t · 2 photos + signature', at: '09:24', idem: 'ek15-0412-pod-03-9c1f' },
  { kind: 'arrive', title: 'Geofence check-in — Tanjung Jetty', detail: 'JO-28-03-0412 · trip 3', at: '09:21', idem: 'ek15-0412-arr-03-41d2' },
  { kind: 'p2h', title: 'P2H pre-start — DT-01', detail: '12 of 12 items OK · fit to operate', at: '05:48', idem: 'ek15-dt01-p2h-0310-a07b' },
]
