import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { jobs as coreJobs } from '@/data/core'
import { seededTrips, timesheetHistory, fuelHistory, type TripRecord, type TimesheetDay, type FuelRecord, type Geo } from '@/data/mobile'

// ─── Types ───────────────────────────────────────────────────────────────────

export type Conn = 'online' | 'weak' | 'offline'
export type QState = 'Queued' | 'Sending' | 'Synced' | 'Conflict resolved'
export type QKind = 'ack' | 'checkin' | 'depart' | 'arrive' | 'pod' | 'complete' | 'timesheet' | 'fuel' | 'charge' | 'incident' | 'p2h'

export interface QItem {
  id: string
  idem: string
  kind: QKind
  title: string
  detail: string
  projectCode?: string
  jobId?: string
  createdAt: string
  sizeKb: number
  state: QState
  attempts: number
  syncedAt?: string
  note?: string
  /** Server-side outcome applied when the item reaches the server (per-type conflict rule) */
  conflict?: string
}

export interface LocalTrip extends TripRecord {
  photos?: string[]
  signature?: string
  geo?: Geo
  local?: boolean
}

export type Phase = 'ready' | 'loading' | 'enroute' | 'arrived'

export interface JobState {
  ack: boolean
  ackAt?: string
  phase: Phase
  checkInAt?: string
  departAt?: string
  arriveAt?: string
  trips: LocalTrip[]
  status: 'Dispatched' | 'In Progress' | 'Completed' | 'Verified' | 'Billed' | 'Planned' | 'Draft'
  completedAt?: string
}

export interface ChargeRecord {
  at: string
  type: string
  amount: number
  jobId: string
  projectCode: string
  note: string
}

export interface IncidentRecord {
  ref: string
  at: string
  kind: string
  severity: string
  description: string
  jobId?: string
  projectCode: string
}

interface Persisted {
  signedIn: boolean
  conn: Conn
  queue: QItem[]
  jobs: Record<string, JobState>
  timesheets: TimesheetDay[]
  fuel: FuelRecord[]
  charges: ChargeRecord[]
  incidents: IncidentRecord[]
  p2hAt?: string
  p2hFit?: boolean
  seq: number
}

const KEY = 'pl-mobile-v1'

function initialJobs(): Record<string, JobState> {
  const out: Record<string, JobState> = {}
  for (const j of coreJobs.filter((x) => x.crewIds.includes('EMP-0015'))) {
    out[j.id] = { ack: j.status !== 'Dispatched', phase: 'ready', trips: [], status: j.status }
  }
  out['JO-28-03-0412'] = { ack: true, ackAt: '2028-03-09T17:26:00', phase: 'ready', trips: seededTrips.map((t) => ({ ...t })), status: 'In Progress' }
  return out
}

function initialState(): Persisted {
  return {
    signedIn: false,
    conn: 'online',
    queue: [],
    jobs: initialJobs(),
    timesheets: timesheetHistory.map((t) => ({ ...t })),
    fuel: fuelHistory.map((f) => ({ ...f })),
    charges: [],
    incidents: [],
    p2hAt: '2028-03-10T05:48:00',
    p2hFit: true,
    seq: 1,
  }
}

function load(): Persisted {
  const base = initialState()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const s = JSON.parse(raw) as Partial<Persisted>
    const merged: Persisted = { ...base, ...s, jobs: { ...base.jobs, ...(s.jobs ?? {}) } }
    // App was closed mid-delivery: nothing is lost, the item simply goes back to the queue.
    merged.queue = (merged.queue ?? []).map((q) => (q.state === 'Sending' ? { ...q, state: 'Queued', note: 'Resumed after app restart' } : q))
    return merged
  } catch {
    return base
  }
}

// ─── Clock (demo date 10 Mar 2028, real wall-clock time) ───────────────────

const pad = (n: number) => String(n).padStart(2, '0')
export function clock(withSeconds = false): string {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}${withSeconds ? ':' + pad(d.getSeconds()) : ''}`
}
export function stamp(): string {
  return `2028-03-10T${clock(true)}`
}
export function hhmm(iso?: string): string {
  return iso ? iso.slice(11, 16) : '—'
}

function hex(n: number) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface Snack {
  id: number
  text: string
  tone: 'ok' | 'queued' | 'warn'
}

interface Ctx extends Persisted {
  setConn: (c: Conn) => void
  signIn: () => void
  signOut: () => void
  resetDemo: () => void
  /** Record a field action. It is always written to the device first, then delivered by the sync engine. */
  record: (item: Omit<QItem, 'id' | 'idem' | 'createdAt' | 'state' | 'attempts'>) => QItem
  updateJob: (id: string, fn: (j: JobState) => JobState) => void
  update: (fn: (s: Persisted) => Persisted) => void
  pending: number
  snack?: Snack
  notify: (text: string, tone?: Snack['tone']) => void
  retryNow: () => void
}

const MobileCtx = createContext<Ctx | null>(null)

export function MobileProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Persisted>(load)
  const [snack, setSnack] = useState<Snack>()
  const snackTimer = useRef<number | undefined>(undefined)

  // persist every change (encrypted local storage on the real device)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* storage full or unavailable — state stays in memory */
    }
  }, [s])

  const notify = useCallback((text: string, tone: Snack['tone'] = 'ok') => {
    window.clearTimeout(snackTimer.current)
    setSnack({ id: Date.now(), text, tone })
    snackTimer.current = window.setTimeout(() => setSnack(undefined), 3200)
  }, [])

  const update = useCallback((fn: (s: Persisted) => Persisted) => setS((prev) => fn(prev)), [])

  const record: Ctx['record'] = useCallback(
    (item) => {
      const q: QItem = {
        ...item,
        id: `q-${Date.now()}-${hex(4)}`,
        idem: `ek15-${item.kind}-${hex(4)}-${hex(4)}`,
        createdAt: clock(true),
        state: 'Queued',
        attempts: 0,
      }
      setS((prev) => ({ ...prev, queue: [q, ...prev.queue], seq: prev.seq + 1 }))
      return q
    },
    [],
  )

  const updateJob = useCallback((id: string, fn: (j: JobState) => JobState) => {
    setS((prev) => ({ ...prev, jobs: { ...prev.jobs, [id]: fn(prev.jobs[id] ?? { ack: false, phase: 'ready', trips: [], status: 'Dispatched' }) } }))
  }, [])

  const setConn = useCallback((c: Conn) => setS((prev) => ({ ...prev, conn: c })), [])

  // ─── Sync engine: one item at a time, oldest first, retried until delivered ───
  const sending = s.queue.find((q) => q.state === 'Sending')
  const nextQueued = [...s.queue].reverse().find((q) => q.state === 'Queued')

  useEffect(() => {
    if (s.conn === 'offline') {
      if (sending) {
        setS((prev) => ({
          ...prev,
          queue: prev.queue.map((q) => (q.id === sending.id ? { ...q, state: 'Queued', attempts: q.attempts + 1, note: 'Signal lost during delivery — kept on device, will retry' } : q)),
        }))
      }
      return
    }
    if (sending) {
      const delay = s.conn === 'weak' ? 1900 + sending.sizeKb * 2 : 650 + sending.sizeKb
      const t = window.setTimeout(() => {
        setS((prev) => ({
          ...prev,
          queue: prev.queue.map((q) => {
            if (q.id !== sending.id) return q
            if (prev.conn === 'weak' && q.sizeKb >= 150 && q.attempts === 0) {
              return { ...q, state: 'Queued', attempts: 1, note: 'Timed out on weak signal — media compressed, retrying automatically' }
            }
            return q.conflict
              ? { ...q, state: 'Conflict resolved', syncedAt: clock(true), note: q.conflict }
              : { ...q, state: 'Synced', syncedAt: clock(true), note: q.attempts > 0 ? `Delivered on attempt ${q.attempts + 1} · server confirmed idempotency key` : undefined }
          }),
        }))
      }, Math.min(delay, 4200))
      return () => window.clearTimeout(t)
    }
    if (nextQueued) {
      const t = window.setTimeout(
        () => setS((prev) => ({ ...prev, queue: prev.queue.map((q) => (q.id === nextQueued.id ? { ...q, state: 'Sending' } : q)) })),
        s.conn === 'weak' ? 500 : 220,
      )
      return () => window.clearTimeout(t)
    }
  }, [s.conn, sending, nextQueued])

  const retryNow = useCallback(() => {
    setS((prev) => ({ ...prev, queue: prev.queue.map((q) => (q.state === 'Queued' ? { ...q, note: undefined } : q)) }))
  }, [])

  const pending = s.queue.filter((q) => q.state === 'Queued' || q.state === 'Sending').length

  const value = useMemo<Ctx>(
    () => ({
      ...s,
      setConn,
      signIn: () => setS((p) => ({ ...p, signedIn: true })),
      signOut: () => setS((p) => ({ ...p, signedIn: false })),
      resetDemo: () => setS({ ...initialState(), signedIn: true }),
      record,
      updateJob,
      update,
      pending,
      snack,
      notify,
      retryNow,
    }),
    [s, setConn, record, updateJob, update, pending, snack, notify, retryNow],
  )

  return <MobileCtx.Provider value={value}>{children}</MobileCtx.Provider>
}

export function useMobile(): Ctx {
  const c = useContext(MobileCtx)
  if (!c) throw new Error('useMobile outside provider')
  return c
}

/** Standard confirmation after any field action — honest about where the data is. */
export function useSaved() {
  const { conn, notify } = useMobile()
  return useCallback(
    (what: string) => {
      if (conn === 'offline') notify(`${what} — saved on device, will sync when signal returns`, 'queued')
      else if (conn === 'weak') notify(`${what} — saved, sending on weak signal`, 'queued')
      else notify(`${what} — saved and syncing`, 'ok')
    },
    [conn, notify],
  )
}

/** Simulated GPS fix around a site with small jitter */
export function gpsFix(base: Geo): Geo {
  return { lat: +(base.lat + (Math.random() - 0.5) * 0.0008).toFixed(5), lng: +(base.lng + (Math.random() - 0.5) * 0.0008).toFixed(5) }
}
export function fmtGeo(g: Geo): string {
  return `${Math.abs(g.lat).toFixed(5)}°${g.lat < 0 ? 'S' : 'N'}, ${g.lng.toFixed(5)}°E`
}
