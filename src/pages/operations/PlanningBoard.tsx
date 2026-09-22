import { useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, GripVertical, Lock, Send, Users, Truck } from 'lucide-react'
import { Badge, Button, Callout, Card, CardHeader, Grid, PageHeader, ProjectCodeChip, Select, Stat, cx } from '@/components/ui'
import { businessLines, employees, getProject, getUnit, units, type Unit } from '@/data/core'
import { certState, crewBlock, getPerson, jobMeta, licenceState, opsEmployees, unitBlock } from '@/data/operations'
import { date } from '@/lib/format'
import { useToast } from '@/lib/app-state'
import { Legend } from '@/lib/chart'
import { updateJob, useJobs, type JobState } from './store'
import { OPS_MODULE } from './shared'

const DAYS = ['2028-03-09', '2028-03-10', '2028-03-11', '2028-03-12', '2028-03-13', '2028-03-14', '2028-03-15', '2028-03-16']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const dayIdx = (iso: string) => DAYS.indexOf(iso)
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const diffDays = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)

type ResType = 'unit' | 'crew'
interface Bar {
  key: string
  job: JobState
  resType: ResType
  resId: string
  start: string
  end: string
  shift: string
}

const endOf = (j: JobState) => j.endDate ?? jobMeta(j).endDate ?? j.date
const shiftsOverlap = (a: string, b: string) => a === 'Full day' || b === 'Full day' || a === b

const crewPool = [...employees, ...opsEmployees].filter((e) => e.licence && e.department === 'Operations')

export default function PlanningBoard() {
  const jobs = useJobs()
  const nav = useNavigate()
  const toast = useToast()
  const [cat, setCat] = useState('')
  const [site, setSite] = useState('')
  const [hover, setHover] = useState<string | null>(null)

  const inRange = (j: JobState) => endOf(j) >= DAYS[0] && j.date <= DAYS[DAYS.length - 1]

  const bars: Bar[] = useMemo(
    () =>
      jobs.filter(inRange).flatMap((j) => {
        const shift = jobMeta(j).shift
        return [
          ...j.unitIds.map((u) => ({ key: `${j.id}:u:${u}`, job: j, resType: 'unit' as const, resId: u, start: j.date, end: endOf(j), shift })),
          ...j.crewIds.map((c) => ({ key: `${j.id}:c:${c}`, job: j, resType: 'crew' as const, resId: c, start: j.date, end: endOf(j), shift })),
        ]
      }),
    [jobs],
  )

  const conflicts = useMemo(() => {
    const s = new Set<string>()
    for (const a of bars)
      for (const b of bars)
        if (a.key < b.key && a.resType === b.resType && a.resId === b.resId && a.start <= b.end && b.start <= a.end && shiftsOverlap(a.shift, b.shift)) {
          s.add(a.key)
          s.add(b.key)
        }
    return s
  }, [bars])

  const blockedBars = bars.filter((b) => (b.resType === 'unit' ? unitBlock(getUnit(b.resId)!) : crewBlock(getPerson(b.resId))) && !['Completed', 'Verified', 'Billed', 'In Progress'].includes(b.job.status))

  const pool = jobs.filter((j) => j.status === 'Draft' && j.unitIds.length === 0 && j.date <= DAYS[DAYS.length - 1]).sort((a, b) => a.date.localeCompare(b.date))

  const unitRows = units.filter((u) => (!cat || u.category === cat) && (!site || u.location === site))

  // ─── Drag & drop ──
  const onDragStart = (e: DragEvent, payload: { kind: 'job' | 'bar'; jobId: string; resId?: string; resType?: ResType }) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = (e: DragEvent, resType: ResType, resId: string, day: string) => {
    e.preventDefault()
    setHover(null)
    let p: { kind: 'job' | 'bar'; jobId: string; resId?: string; resType?: ResType }
    try {
      p = JSON.parse(e.dataTransfer.getData('text/plain'))
    } catch {
      return
    }
    const job = jobs.find((j) => j.id === p.jobId)
    if (!job) return
    const reason = resType === 'unit' ? unitBlock(getUnit(resId)!) : crewBlock(getPerson(resId))
    const label = resType === 'unit' ? resId : getPerson(resId)?.name
    if (reason) {
      toast(`Cannot assign ${label} to ${job.id}: ${reason}`, 'error')
      return
    }
    const len = diffDays(job.date, endOf(job))
    const patch: Partial<JobState> = { date: day, endDate: addDays(day, len) }
    const key = resType === 'unit' ? 'unitIds' : 'crewIds'
    let list = [...job[key]]
    if (p.kind === 'bar' && p.resType === resType && p.resId) list = list.filter((x) => x !== p.resId)
    if (!list.includes(resId)) list.push(resId)
    patch[key] = list
    if (job.status === 'Draft') patch.status = 'Planned'
    updateJob(job.id, patch)

    // conflict check after assignment
    const shift = jobMeta(job).shift
    const clash = bars.find((b) => b.job.id !== job.id && b.resType === resType && b.resId === resId && b.start <= addDays(day, len) && day <= b.end && shiftsOverlap(b.shift, shift))
    if (clash) toast(`Schedule conflict: ${label} is already on ${clash.job.id} (${date(clash.start)}). Highlighted in red.`, 'warning')
    else toast(`${label} assigned to ${job.id} on ${date(day)}${job.status === 'Draft' ? ' — status Planned' : ''}`, 'success')
  }

  const plannedTomorrow = jobs.filter((j) => j.status === 'Planned' && j.date === '2028-03-11')
  const totalUnitDays = unitRows.length * DAYS.length
  const bookedUnitDays = unitRows.reduce((a, u) => a + DAYS.filter((d) => bars.some((b) => b.resType === 'unit' && b.resId === u.id && b.start <= d && d <= b.end)).length, 0)

  return (
    <>
      <PageHeader
        module={OPS_MODULE}
        title="Planning Board"
        subtitle="Drag unassigned jobs onto a unit or crew member. Availability is read from maintenance (M15); units with lapsed SILO/KIR and operators with lapsed SIO/SIM cannot be assigned — the control operates at planning, not at audit."
        crumbs={[{ label: 'Operations' }, { label: 'Planning Board' }]}
        actions={
          <Button
            variant="primary"
            icon={<Send size={15} />}
            disabled={!plannedTomorrow.length}
            onClick={() => {
              plannedTomorrow.forEach((j) => updateJob(j.id, { status: 'Dispatched' }))
              toast(`${plannedTomorrow.length} jobs for 11 Mar dispatched to the driver app`, 'success')
            }}
          >
            Dispatch 11 Mar ({plannedTomorrow.length})
          </Button>
        }
      />

      <Grid cols={4} className="mb-4">
        <Stat label="Unassigned jobs" value={pool.length} sub="Drag from the tray onto the board" tone={pool.length ? 'warn' : 'good'} />
        <Stat label="Schedule conflicts" value={new Set([...conflicts].map((k) => k.split(':').slice(1).join(':'))).size} sub="Double-booked units / crew" tone={conflicts.size ? 'bad' : 'good'} />
        <Stat label="Certification blocks" value={units.filter((u) => certState(u) === 'Expired').length + crewPool.filter((e) => licenceState(e) === 'Expired').length} sub="Units & operators not assignable" tone="bad" to="/maintenance/certifications" />
        <Stat label="Unit load (week)" value={`${Math.round((bookedUnitDays / Math.max(1, totalUnitDays)) * 100)}%`} sub={`${bookedUnitDays} of ${totalUnitDays} unit-days booked`} />
      </Grid>

      {blockedBars.length > 0 && (
        <div className="mb-4">
          <Callout tone="red" icon={<AlertTriangle size={16} />} title={`${blockedBars.length} planned assignment(s) now violate availability or certification`}>
            {blockedBars.map((b) => (
              <div key={b.key}>
                <button className="font-mono underline" onClick={() => nav(`/ops/jobs/${b.job.id}`)}>
                  {b.job.id}
                </button>{' '}
                uses {b.resType === 'unit' ? b.resId : getPerson(b.resId)?.name} — {b.resType === 'unit' ? unitBlock(getUnit(b.resId)!) : crewBlock(getPerson(b.resId))}. Drag the bar to an available resource.
              </div>
            ))}
          </Callout>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <Card className="h-fit xl:sticky xl:top-4">
          <CardHeader title="Unassigned jobs" subtitle="Drafts incl. recurring jobs generated from contracts" />
          <div className="space-y-2">
            {pool.length === 0 && <div className="py-6 text-center text-xs text-slate-400">All jobs assigned</div>}
            {pool.map((j) => {
              const bl = getProject(j.projectCode)?.businessLine ?? 'HL'
              return (
                <div
                  key={j.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, { kind: 'job', jobId: j.id })}
                  className="cursor-grab rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-brand-300 active:cursor-grabbing"
                  style={{ borderLeft: `4px solid ${businessLines[bl].color}` }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[11px] font-semibold text-slate-700">{j.id}</span>
                    <GripVertical size={14} className="text-slate-300" />
                  </div>
                  <div className="text-xs text-slate-800">{j.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <ProjectCodeChip code={j.projectCode} />
                    <span>{date(j.date)}</span>
                    <span>· {jobMeta(j).shift}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <Legend
              items={[
                { label: 'Heavy Logistics', color: businessLines.HL.color },
                { label: 'Plant Services', color: businessLines.PS.color },
                { label: 'Green Solutions', color: businessLines.GS.color },
                { label: 'Conflict', color: '#dc2626', dashed: true },
              ]}
            />
            <p className="text-[11px] text-slate-500">Hatched rows are not assignable. Hover the lock for the reason. Day and night shifts on the same unit are not a conflict.</p>
          </div>
        </Card>

        <Card padded={false} className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-3">
            <div className="text-sm font-semibold text-slate-800">9 – 16 Mar 2028</div>
            <div className="flex flex-wrap gap-2">
              <Select value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">All unit types</option>
                {[...new Set(units.map((u) => u.category))].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              <Select value={site} onChange={(e) => setSite(e.target.value)}>
                <option value="">All sites</option>
                {[...new Set(units.map((u) => u.location))].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="scrollbar-thin overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase" style={{ gridTemplateColumns: '210px repeat(8, minmax(92px, 1fr))' }}>
                <div className="px-3 py-2">Resource</div>
                {DAYS.map((d) => (
                  <div key={d} className={cx('border-l border-slate-200 px-2 py-2 text-center', d === '2028-03-10' && 'bg-brand-50 text-brand-700')}>
                    {DOW[new Date(d + 'T00:00:00Z').getUTCDay()]} {d.slice(8)}
                    {d === '2028-03-10' && <span className="ml-1 normal-case">today</span>}
                  </div>
                ))}
              </div>

              <SectionLabel icon={<Truck size={13} />} label={`Units (${unitRows.length})`} />
              {unitRows.map((u) => (
                <Row
                  key={u.id}
                  resType="unit"
                  resId={u.id}
                  label={<UnitLabel u={u} load={DAYS.filter((d) => bars.some((b) => b.resType === 'unit' && b.resId === u.id && b.start <= d && d <= b.end)).length} />}
                  blocked={unitBlock(u)}
                  bars={bars.filter((b) => b.resType === 'unit' && b.resId === u.id)}
                  conflicts={conflicts}
                  hover={hover}
                  setHover={setHover}
                  onDrop={onDrop}
                  onDragStart={onDragStart}
                  onOpen={(id) => nav(`/ops/jobs/${id}`)}
                />
              ))}

              <SectionLabel icon={<Users size={13} />} label={`Crew — operators & drivers (${crewPool.length})`} />
              {crewPool.map((e) => {
                const ls = licenceState(e)
                return (
                  <Row
                    key={e.id}
                    resType="crew"
                    resId={e.id}
                    label={
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-slate-800">{e.name}</div>
                        <div className="truncate text-[10px] text-slate-500">
                          {e.position} · {ls === 'Expiring' ? <span className="text-amber-600">licence exp. {date(e.licence!.expiry)}</span> : e.licence!.kind}
                        </div>
                      </div>
                    }
                    blocked={crewBlock(e)}
                    bars={bars.filter((b) => b.resType === 'crew' && b.resId === e.id)}
                    conflicts={conflicts}
                    hover={hover}
                    setHover={setHover}
                    onDrop={onDrop}
                    onDragStart={onDragStart}
                    onOpen={(id) => nav(`/ops/jobs/${id}`)}
                  />
                )
              })}
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}

function SectionLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100/70 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
      {icon}
      {label}
    </div>
  )
}

function UnitLabel({ u, load }: { u: Unit; load: number }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs font-semibold text-slate-800">{u.id}</span>
        {u.status !== 'Operating' && u.status !== 'Idle' && <Badge tone={u.status === 'Breakdown' ? 'red' : 'amber'}>{u.status}</Badge>}
      </div>
      <div className="truncate text-[10px] text-slate-500">
        {u.type} · {u.location}
      </div>
      <div className="mt-0.5 flex items-center gap-1">
        <div className="h-1 w-16 overflow-hidden rounded bg-slate-200">
          <div className="h-full bg-sky-500" style={{ width: `${(load / DAYS.length) * 100}%` }} />
        </div>
        <span className="text-[9px] text-slate-400">{load}/8 d</span>
      </div>
    </div>
  )
}

function Row({
  resType,
  resId,
  label,
  blocked,
  bars,
  conflicts,
  hover,
  setHover,
  onDrop,
  onDragStart,
  onOpen,
}: {
  resType: ResType
  resId: string
  label: ReactNode
  blocked?: string
  bars: Bar[]
  conflicts: Set<string>
  hover: string | null
  setHover: (k: string | null) => void
  onDrop: (e: DragEvent, t: ResType, id: string, day: string) => void
  onDragStart: (e: DragEvent, p: { kind: 'job' | 'bar'; jobId: string; resId?: string; resType?: ResType }) => void
  onOpen: (id: string) => void
}) {
  // lanes for overlapping bars
  const sorted = [...bars].sort((a, b) => a.start.localeCompare(b.start))
  const laneEnds: string[] = []
  const laneOf = new Map<string, number>()
  for (const b of sorted) {
    let l = laneEnds.findIndex((e) => e < b.start)
    if (l === -1) {
      l = laneEnds.length
      laneEnds.push(b.end)
    } else laneEnds[l] = b.end
    laneOf.set(b.key, l)
  }
  const lanes = Math.max(1, laneEnds.length)
  return (
    <div
      className={cx('relative grid border-b border-slate-100', blocked && 'bg-[repeating-linear-gradient(135deg,#f8fafc_0,#f8fafc_6px,#fee2e2_6px,#fee2e2_7px)]')}
      style={{ gridTemplateColumns: '210px repeat(8, minmax(92px, 1fr))', gridTemplateRows: `repeat(${lanes}, minmax(34px, auto))` }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ gridColumn: 1, gridRow: `1 / span ${lanes}` }}>
        <div className="min-w-0 flex-1">{label}</div>
        {blocked && (
          <span className="group relative shrink-0">
            <Lock size={14} className="text-red-500" />
            <span className="pointer-events-none absolute top-5 left-0 z-20 hidden w-64 rounded-md bg-ink-900 px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-lg group-hover:block">{blocked}</span>
          </span>
        )}
      </div>
      {DAYS.map((d, i) => {
        const k = `${resId}|${d}`
        return (
          <div
            key={d}
            title={blocked}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = blocked ? 'none' : 'move'
              if (hover !== k) setHover(k)
            }}
            onDragLeave={() => hover === k && setHover(null)}
            onDrop={(e) => onDrop(e, resType, resId, d)}
            className={cx('border-l border-slate-100', d === '2028-03-10' && 'bg-brand-50/40', hover === k && (blocked ? 'bg-red-100' : 'bg-sky-100'))}
            style={{ gridColumn: i + 2, gridRow: `1 / span ${lanes}` }}
          />
        )
      })}
      {bars.map((b) => {
        const s = Math.max(0, dayIdx(b.start) === -1 ? 0 : dayIdx(b.start))
        const eIdx = dayIdx(b.end) === -1 ? DAYS.length - 1 : dayIdx(b.end)
        const bl = getProject(b.job.projectCode)?.businessLine ?? 'HL'
        const conflict = conflicts.has(b.key)
        const done = ['Completed', 'Verified', 'Billed'].includes(b.job.status)
        const invalid = blocked && !done && b.job.status !== 'In Progress'
        return (
          <div
            key={b.key}
            draggable={!done}
            onDragStart={(e) => onDragStart(e, { kind: 'bar', jobId: b.job.id, resId: b.resId, resType: b.resType })}
            onClick={() => onOpen(b.job.id)}
            title={`${b.job.id} · ${b.job.title} · ${b.shift}${conflict ? ' · CONFLICT' : ''}${invalid ? ' · ' + blocked : ''}`}
            className={cx(
              'relative z-10 mx-0.5 my-1 flex cursor-pointer items-center gap-1 overflow-hidden rounded-md px-1.5 text-[11px] leading-tight text-white shadow-sm',
              done && 'opacity-60',
              (conflict || invalid) && 'ring-2 ring-red-600 ring-offset-1',
            )}
            style={{ gridColumn: `${s + 2} / ${eIdx + 3}`, gridRow: (laneOf.get(b.key) ?? 0) + 1, background: businessLines[bl].color }}
          >
            {(conflict || invalid) && <AlertTriangle size={11} className="shrink-0" />}
            <span className="font-mono font-semibold">{b.job.id.slice(-4)}</span>
            <span className="truncate">{b.shift === 'Night' ? 'Night · ' : ''}{b.job.title}</span>
          </div>
        )
      })}
    </div>
  )
}
