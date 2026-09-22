import { useSearchParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cx } from '@/components/ui'
import { TODAY_ISO } from '@/lib/format'
import { driverJobs, assignmentMeta, defaultMeta } from '@/data/mobile'
import type { Job } from '@/data/core'
import { useMobile, type JobState, type QItem } from './store'

export interface Assignment {
  job: Job
  st: JobState
  meta: typeof defaultMeta
  pendingItems: QItem[]
  tonnage: number
}

export function useAssignments(): Assignment[] {
  const { jobs, queue } = useMobile()
  return driverJobs().map((job) => {
    const st = jobs[job.id] ?? { ack: true, phase: 'ready' as const, trips: [], status: job.status }
    return {
      job,
      st,
      meta: assignmentMeta[job.id] ?? defaultMeta,
      pendingItems: queue.filter((q) => q.jobId === job.id && (q.state === 'Queued' || q.state === 'Sending')),
      tonnage: st.trips.reduce((a, t) => a + t.tonnage, 0),
    }
  })
}

/** Active jobs (today, acknowledged, not completed) that time, fuel and charges can be booked against */
export function useBookableJobs() {
  return useAssignments().filter((a) => a.job.date >= TODAY_ISO && a.st.ack && (a.st.status === 'In Progress' || a.st.status === 'Dispatched'))
}

export function driverStatus(s: JobState['status']): string {
  if (s === 'Dispatched') return 'Dispatched'
  if (s === 'Completed') return 'Completed — awaiting verification'
  return s
}

export function statusTone(s: JobState['status']): string {
  return (
    {
      Dispatched: 'bg-sky-100 text-sky-900 ring-sky-300',
      'In Progress': 'bg-brand-100 text-amber-900 ring-brand-300',
      Completed: 'bg-blue-100 text-blue-900 ring-blue-300',
      Verified: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
      Billed: 'bg-violet-100 text-violet-900 ring-violet-300',
      Planned: 'bg-slate-100 text-slate-800 ring-slate-300',
      Draft: 'bg-slate-100 text-slate-800 ring-slate-300',
    } as Record<string, string>
  )[s]
}

export function JobStatusPill({ s }: { s: JobState['status'] }) {
  return <span className={cx('inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ring-1 ring-inset', statusTone(s))}>{driverStatus(s)}</span>
}

/** Radio list of bookable jobs — the project code follows the chosen job automatically */
export function JobPicker({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const list = useBookableJobs()
  return (
    <div className="space-y-2">
      {list.map((a) => (
        <button
          key={a.job.id}
          type="button"
          onClick={() => onChange(a.job.id)}
          className={cx(
            'flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left',
            value === a.job.id ? 'border-ink-900 bg-ink-900 text-white' : 'border-slate-300 bg-white text-ink-900 active:bg-slate-50',
          )}
        >
          <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', value === a.job.id ? 'border-brand-400' : 'border-slate-400')}>
            {value === a.job.id && <span className="h-2.5 w-2.5 rounded-full bg-brand-400" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[13px] font-bold">{a.job.id}</span>
            <span className={cx('block truncate text-[12px]', value === a.job.id ? 'text-slate-300' : 'text-slate-500')}>
              {a.meta.shift} · {a.job.origin} → {a.job.destination}
            </span>
          </span>
          <ChevronRight size={16} className="opacity-40" />
        </button>
      ))}
      {list.length === 0 && <div className="rounded-xl bg-slate-200 px-3 py-3 text-[13px] font-semibold text-slate-600">No active assignment. Acknowledge a job first.</div>}
    </div>
  )
}

export function useDefaultJob(): [string | undefined, (id: string) => void, Assignment | undefined] {
  const [params, setParams] = useSearchParams()
  const list = useBookableJobs()
  const fromUrl = params.get('job') ?? undefined
  const id = list.find((a) => a.job.id === fromUrl)?.job.id ?? list.find((a) => a.st.status === 'In Progress')?.job.id ?? list[0]?.job.id
  const set = (v: string) => setParams({ job: v }, { replace: true })
  return [id, set, list.find((a) => a.job.id === id)]
}

export const kindIcon: Record<string, string> = {
  ack: 'Acknowledgement',
  checkin: 'Check-in',
  depart: 'Departure',
  arrive: 'Geofence arrival',
  pod: 'Proof of delivery',
  complete: 'Job completion',
  timesheet: 'Timesheet',
  fuel: 'Fuel entry',
  charge: 'Cost & charge',
  incident: 'HSE report',
  p2h: 'P2H checklist',
}
