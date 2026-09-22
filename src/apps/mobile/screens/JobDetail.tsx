import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { CheckCircle2, MapPin, Truck, Navigation, Camera, Flag, PackageCheck, Phone, Clock, Fuel, Receipt, TriangleAlert, Radar, Hourglass, ShieldCheck, FileText, Info } from 'lucide-react'
import { cx } from '@/components/ui'
import { num, date } from '@/lib/format'
import { getEmployee } from '@/data/core'
import { sites, routeKm, DRIVER_UNIT } from '@/data/mobile'
import { useMobile, useSaved, stamp, hhmm, gpsFix, fmtGeo } from '../store'
import { MHeader, Section, Panel, BigButton, PendingDot } from '../kit'
import { PhoneOverlay } from '../media'
import { useAssignments, JobStatusPill } from '../helpers'

function StepRow({ done, active, icon, title, time, sub, last }: { done: boolean; active: boolean; icon: ReactNode; title: string; time?: string; sub?: string; last?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cx(
            'flex h-10 w-10 items-center justify-center rounded-full ring-2',
            done ? 'bg-emerald-600 text-white ring-emerald-600' : active ? 'bg-brand-400 text-ink-900 ring-brand-500' : 'bg-white text-slate-400 ring-slate-300',
          )}
        >
          {done ? <CheckCircle2 size={20} /> : icon}
        </span>
        {!last && <span className="w-0.5 flex-1 bg-slate-200" />}
      </div>
      <div className="min-w-0 flex-1 pb-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cx('text-[15px] font-bold', !done && !active && 'text-slate-400')}>{title}</span>
          {time && <span className="num font-mono text-[13px] font-bold text-slate-600">{time}</span>}
        </div>
        {sub && <div className="text-[12px] text-slate-500">{sub}</div>}
      </div>
    </div>
  )
}

export default function JobDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { updateJob, record, notify, conn } = useMobile()
  const saved = useSaved()
  const a = useAssignments().find((x) => x.job.id === id)
  const [km, setKm] = useState<number | null>(null)
  const [confirm, setConfirm] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearInterval(timer.current), [])

  if (!a) return <Navigate to="/mobile" replace />
  const { job, st, meta } = a
  const load = sites[job.origin]
  const unload = sites[job.destination]
  const tripNo = st.trips.length + 1
  const closed = st.status === 'Completed' || st.status === 'Verified' || st.status === 'Billed'
  const base = { projectCode: job.projectCode, jobId: job.id }

  function ack() {
    updateJob(job.id, (j) => ({ ...j, ack: true, ackAt: stamp() }))
    record({ ...base, kind: 'ack', title: 'Assignment acknowledged', detail: `${job.id} · ${meta.shift} ${meta.window}`, sizeKb: 1 })
    saved('Assignment acknowledged')
  }
  function checkIn() {
    const g = gpsFix(load?.geo ?? { lat: -0.42, lng: 116.98 })
    updateJob(job.id, (j) => ({ ...j, phase: 'loading', checkInAt: stamp(), departAt: undefined, arriveAt: undefined, status: 'In Progress' }))
    record({ ...base, kind: 'checkin', title: `Check-in at loading — trip ${tripNo}`, detail: `${job.origin} · ${fmtGeo(g)}`, sizeKb: 1 })
    saved(`Checked in at ${job.origin}`)
  }
  function depart() {
    updateJob(job.id, (j) => ({ ...j, phase: 'enroute', departAt: stamp() }))
    record({ ...base, kind: 'depart', title: `Departed loaded — trip ${tripNo}`, detail: `${job.origin} → ${job.destination} · ${DRIVER_UNIT}`, sizeKb: 1 })
    saved('Departure recorded')
  }
  function arrive() {
    const g = gpsFix(unload?.geo ?? { lat: -0.52, lng: 117.14 })
    updateJob(job.id, (j) => ({ ...j, phase: 'arrived', arriveAt: stamp() }))
    record({ ...base, kind: 'arrive', title: `Geofence check-in — ${job.destination}`, detail: `Trip ${tripNo} · auto timestamp inside ${unload?.geofenceM ?? 250} m fence · ${fmtGeo(g)}`, sizeKb: 1 })
    notify(`Arrived at ${job.destination} — timestamped automatically by geofence`, conn === 'offline' ? 'queued' : 'ok')
  }
  function drive() {
    let left = routeKm
    setKm(left)
    window.clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      left -= 1.35
      if (left <= 0.25) {
        window.clearInterval(timer.current)
        setKm(0)
        arrive()
        return
      }
      setKm(left)
    }, 160)
  }
  function complete() {
    updateJob(job.id, (j) => ({ ...j, status: 'Completed', completedAt: stamp() }))
    record({ ...base, kind: 'complete', title: 'Job completed by driver', detail: `${job.id} · ${st.trips.length} trips · ${num(a!.tonnage, 1)} t`, sizeKb: 2 })
    setConfirm(false)
    saved('Job marked completed')
  }

  const opsAdmin = getEmployee('EMP-0007')

  return (
    <div className="pb-8">
      <MHeader back="/mobile" title={job.id} sub={job.title} right={<JobStatusPill s={st.status} />} />

      <Section>
        <Panel>
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-1">
              <span className="h-3 w-3 rounded-full bg-ink-900" />
              <span className="my-1 h-8 w-0.5 bg-slate-300" />
              <MapPin size={16} className="text-red-600" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="text-[12px] font-bold text-slate-500 uppercase">Load</div>
                <div className="text-[16px] font-extrabold">{load?.name ?? job.origin}</div>
                <div className="text-[12px] text-slate-500">{meta.loadingBay}</div>
              </div>
              <div>
                <div className="text-[12px] font-bold text-slate-500 uppercase">Unload · {routeKm} km</div>
                <div className="text-[16px] font-extrabold">{unload?.name ?? job.destination}</div>
                <div className="text-[12px] text-slate-500">{unload?.contact}</div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-[13px]">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Project code</div>
              <div className="font-mono font-bold">{job.projectCode}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Unit</div>
              <div className="font-bold">{DRIVER_UNIT} · 40 t</div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Shift</div>
              <div className="font-bold">
                {meta.shift} · {meta.window}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">My target</div>
              <div className="font-bold">{num(meta.targetTonnage)} t</div>
            </div>
          </div>
        </Panel>
      </Section>

      {/* ── Not yet acknowledged (OPS-05) ── */}
      {!st.ack && (
        <Section title="Dispatcher instructions">
          <Panel>
            <ul className="space-y-2">
              {meta.instructions.map((t) => (
                <li key={t} className="flex gap-2 text-[14px] font-semibold text-slate-800">
                  <Info size={16} className="mt-0.5 shrink-0 text-sky-600" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-3 text-[12px] text-slate-500">
              Dispatched by {meta.dispatchedBy} · {date(meta.dispatchedAt.slice(0, 10))} {meta.dispatchedAt.slice(11, 16)}
            </div>
          </Panel>
          <div className="mt-4 space-y-2">
            <BigButton onClick={ack} icon={<CheckCircle2 />} sub="Tells dispatch you have read the job">
              Acknowledge assignment
            </BigButton>
            <BigButton variant="light" icon={<Phone size={20} />} onClick={() => notify('Calling pit dispatcher (radio ch. 4 / +62 541 7720 114)…')}>
              Call dispatcher
            </BigButton>
          </div>
        </Section>
      )}

      {/* ── Trip cycle ── */}
      {st.ack && !closed && (
        <Section title={`Trip ${tripNo}`} right={<PendingDot show={a.pendingItems.length > 0} />}>
          <Panel>
            <div>
              <StepRow done={st.phase !== 'ready'} active={st.phase === 'ready'} icon={<Truck size={18} />} title={`Check in at ${job.origin}`} time={st.phase !== 'ready' ? hhmm(st.checkInAt) : undefined} sub="Site check-in with GPS" />
              <StepRow done={st.phase === 'enroute' || st.phase === 'arrived'} active={st.phase === 'loading'} icon={<Navigation size={18} />} title="Depart loaded" time={st.departAt && st.phase !== 'loading' ? hhmm(st.departAt) : undefined} />
              <StepRow done={st.phase === 'arrived'} active={st.phase === 'enroute'} icon={<Radar size={18} />} title={`Arrive ${job.destination}`} time={st.phase === 'arrived' ? hhmm(st.arriveAt) : undefined} sub="Automatic geofence timestamp" />
              <StepRow done={false} active={st.phase === 'arrived'} icon={<Camera size={18} />} last title="Proof of delivery" sub="Photo · signature · delivery note · tonnage" />
            </div>

            {st.phase === 'enroute' && (
              <div className="mb-3 rounded-xl bg-slate-900 p-3 text-white">
                <div className="flex items-center justify-between text-[13px] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Radar size={16} className="text-brand-400" /> Geofence {unload?.geofenceM ?? 250} m
                  </span>
                  <span className="num font-mono">{km === null ? `${routeKm.toFixed(1)} km` : `${km.toFixed(1)} km`} to go</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-brand-400 transition-all" style={{ width: `${km === null ? 0 : ((routeKm - km) / routeKm) * 100}%` }} />
                </div>
                <div className="mt-2 text-[12px] text-slate-300">No tap needed on arrival: the app timestamps check-in when {DRIVER_UNIT} enters the fence — also offline, from the phone's GPS.</div>
              </div>
            )}

            {st.phase === 'ready' && (
              <BigButton onClick={checkIn} icon={<Truck />} sub={`${load?.name ?? job.origin} · GPS captured`}>
                Check in at loading
              </BigButton>
            )}
            {st.phase === 'loading' && (
              <BigButton onClick={depart} icon={<Navigation />} sub="Loaded and leaving the pit">
                Depart loaded
              </BigButton>
            )}
            {st.phase === 'enroute' && (
              <BigButton variant="dark" onClick={drive} disabled={km !== null} icon={<Navigation />} sub="Demo: fast-forward the haul road">
                {km === null ? 'Simulate drive to jetty' : 'Driving…'}
              </BigButton>
            )}
            {st.phase === 'arrived' && (
              <BigButton onClick={() => nav(`/mobile/jobs/${job.id}/pod`)} icon={<Camera />} sub={`At ${job.destination} since ${hhmm(st.arriveAt)}`}>
                Capture proof of delivery
              </BigButton>
            )}
          </Panel>
        </Section>
      )}

      {/* ── Completed / verified states ── */}
      {closed && (
        <Section>
          <div className={cx('rounded-2xl p-4 ring-2', st.status === 'Completed' ? 'bg-blue-50 text-blue-950 ring-blue-200' : 'bg-emerald-50 text-emerald-950 ring-emerald-200')}>
            <div className="flex items-center gap-2 text-[16px] font-extrabold">
              {st.status === 'Completed' ? <Hourglass size={20} /> : <ShieldCheck size={20} />}
              {st.status === 'Completed' ? 'Completed — awaiting verification by operations admin' : st.status === 'Verified' ? 'Verified by operations admin' : 'Verified and billed'}
            </div>
            <p className="mt-1 text-[13px] font-medium opacity-80">
              {st.status === 'Completed'
                ? `${opsAdmin?.name} checks POD and tonnage before cost and billing flow to the project. You will be notified if anything needs correcting.`
                : st.status === 'Verified'
                  ? 'Cost has flowed to the project and the work is now billable.'
                  : 'Included in the Surat Konversi issued to the client.'}
            </p>
            <div className="mt-3 space-y-1.5 text-[13px]">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600" /> Completed by you {st.completedAt ? `at ${hhmm(st.completedAt)}` : `on ${date(job.date)}`}
              </div>
              <div className={cx('flex items-center gap-2', st.status === 'Completed' && 'opacity-50')}>
                {st.status === 'Completed' ? <Clock size={15} /> : <CheckCircle2 size={15} className="text-emerald-600" />} Verified by {opsAdmin?.name}
              </div>
              <div className={cx('flex items-center gap-2', st.status !== 'Billed' && 'opacity-50')}>
                {st.status === 'Billed' ? <CheckCircle2 size={15} className="text-emerald-600" /> : <FileText size={15} />} Billed via Surat Konversi
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ── Trips delivered ── */}
      {(st.trips.length > 0 || closed) && (
        <Section title={`Delivered · ${st.trips.length ? `${st.trips.length} trips · ${num(a.tonnage, 1)} t` : `crew total ${num(job.qty)} t`}`}>
          {st.trips.length === 0 ? (
            <Panel className="text-[13px] text-slate-600">Trip-level POD for this job is archived on the server. Crew total delivered: {num(job.qty)} t.</Panel>
          ) : (
            <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white">
              {[...st.trips].reverse().map((t, i) => {
                const pend = t.local && a.pendingItems.some((q) => q.kind === 'pod' && q.detail.includes(`trip ${t.no} `))
                return (
                  <div key={t.no} className={cx('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-slate-100')}>
                    {t.photos?.[0] ? (
                      <img src={t.photos[0]} alt="" className="h-11 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        <PackageCheck size={20} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[14px] font-bold">
                        Trip {t.no} · {num(t.tonnage, 1)} t
                      </div>
                      <div className="truncate font-mono text-[11px] text-slate-500">
                        {t.dn} · {t.loadedAt}–{t.arrivedAt}
                      </div>
                    </div>
                    {pend ? <PendingDot show /> : <CheckCircle2 size={18} className="text-emerald-600" />}
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      )}

      {st.ack && !closed && (
        <>
          <Section title="On this job">
            <div className="grid grid-cols-4 gap-2">
              {[
                { l: 'Timesheet', i: Clock, to: `/mobile/timesheet?job=${job.id}` },
                { l: 'Fuel', i: Fuel, to: `/mobile/fuel?job=${job.id}` },
                { l: 'Tolls', i: Receipt, to: `/mobile/charges?job=${job.id}` },
                { l: 'Hazard', i: TriangleAlert, to: `/mobile/incident?job=${job.id}` },
              ].map((q) => (
                <button key={q.l} onClick={() => nav(q.to)} className="flex flex-col items-center gap-1 rounded-2xl border-2 border-slate-200 bg-white py-3 text-[12px] font-bold active:bg-slate-50">
                  <q.i size={21} />
                  {q.l}
                </button>
              ))}
            </div>
          </Section>
          <Section>
            <BigButton variant="light" icon={<Flag size={20} />} disabled={st.trips.length === 0 || st.phase !== 'ready'} onClick={() => setConfirm(true)} sub={st.phase !== 'ready' ? 'Finish the current trip first' : 'End of shift'}>
              Complete job
            </BigButton>
          </Section>
        </>
      )}

      {confirm && (
        <PhoneOverlay>
          <div className="absolute inset-0 z-[60] flex flex-col justify-end bg-black/50">
            <div className="rounded-t-3xl bg-white p-5 pb-8">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />
              <h3 className="text-[20px] font-extrabold">Complete {job.id}?</h3>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-100 py-2">
                  <div className="text-[20px] font-extrabold">{st.trips.length}</div>
                  <div className="text-[11px] font-bold text-slate-500">trips</div>
                </div>
                <div className="rounded-xl bg-slate-100 py-2">
                  <div className="text-[20px] font-extrabold">{num(a.tonnage, 1)}</div>
                  <div className="text-[11px] font-bold text-slate-500">tonnes</div>
                </div>
                <div className="rounded-xl bg-slate-100 py-2">
                  <div className="text-[20px] font-extrabold">{st.trips.filter((t) => t.signature || !t.local).length}</div>
                  <div className="text-[11px] font-bold text-slate-500">signed POD</div>
                </div>
              </div>
              <p className="mt-3 text-[13px] text-slate-600">
                The job becomes <b>Completed</b>. Operations admin then verifies it — only verified work flows to project cost and billing.
              </p>
              <div className="mt-4 space-y-2">
                <BigButton variant="success" icon={<Flag />} onClick={complete}>
                  Yes, complete job
                </BigButton>
                <BigButton variant="light" onClick={() => setConfirm(false)}>
                  Not yet
                </BigButton>
              </div>
            </div>
          </div>
        </PhoneOverlay>
      )}
    </div>
  )
}
