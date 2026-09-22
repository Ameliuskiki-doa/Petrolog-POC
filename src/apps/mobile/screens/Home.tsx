import { useNavigate } from 'react-router-dom'
import { BellRing, ChevronRight, ClipboardCheck, Receipt, TriangleAlert, Fuel, MapPin, CheckCircle2, ShieldAlert } from 'lucide-react'
import { Avatar, cx } from '@/components/ui'
import { TODAY_ISO, num, date } from '@/lib/format'
import { driverUnit } from '@/data/mobile'
import { useMobile, hhmm } from '../store'
import { MHeader, Section, PendingDot } from '../kit'
import { useAssignments, JobStatusPill, type Assignment } from '../helpers'

function greeting() {
  const h = new Date().getHours()
  return h < 11 ? 'Good morning' : h < 15 ? 'Good afternoon' : h < 19 ? 'Good evening' : 'Good night'
}

function JobCard({ a }: { a: Assignment }) {
  const nav = useNavigate()
  const pct = Math.min(100, (a.tonnage / a.meta.targetTonnage) * 100)
  const next =
    !a.st.ack ? 'Acknowledge assignment' : a.st.status === 'Completed' ? null : a.st.phase === 'ready' ? `Check in at ${a.job.origin}` : a.st.phase === 'loading' ? 'Depart loaded' : a.st.phase === 'enroute' ? `Driving to ${a.job.destination}` : 'Capture proof of delivery'
  return (
    <button onClick={() => nav(`/mobile/jobs/${a.job.id}`)} className="block w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[13px] font-bold text-slate-500">{a.job.id}</div>
          <div className="text-[17px] leading-snug font-extrabold">{a.meta.shift} · {a.job.type}</div>
        </div>
        <JobStatusPill s={a.st.status} />
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[14px] font-semibold text-slate-700">
        <MapPin size={15} className="shrink-0 text-slate-400" />
        {a.job.origin} → {a.job.destination}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-700">{a.job.projectCode}</span>
        <span>{a.meta.window}</span>
        <PendingDot show={a.pendingItems.length > 0} />
      </div>
      {a.st.ack && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[12px] font-semibold text-slate-600">
            <span>
              {a.st.trips.length} trips · {num(a.tonnage, 1)} t
            </span>
            <span>target {num(a.meta.targetTonnage)} t</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      {next && (
        <div className={cx('mt-3 flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] font-bold', !a.st.ack ? 'bg-brand-400 text-ink-900' : 'bg-ink-900 text-white')}>
          Next: {next}
          <ChevronRight size={18} />
        </div>
      )}
    </button>
  )
}

export default function Home() {
  const nav = useNavigate()
  const { p2hAt, p2hFit } = useMobile()
  const all = useAssignments()
  const unit = driverUnit()
  const fresh = all.filter((a) => !a.st.ack && a.job.date >= TODAY_ISO)
  const today = all.filter((a) => a.job.date >= TODAY_ISO)
  const history = all.filter((a) => a.job.date < TODAY_ISO)

  const quick = [
    { label: 'P2H check', icon: ClipboardCheck, to: '/mobile/p2h' },
    { label: 'Fuel', icon: Fuel, to: '/mobile/fuel' },
    { label: 'Tolls & parking', icon: Receipt, to: '/mobile/charges' },
    { label: 'Report hazard', icon: TriangleAlert, to: '/mobile/incident', danger: true },
  ]

  return (
    <div className="pb-6">
      <MHeader title={`${greeting()}, Eko`} sub={`${unit.id} · ${unit.make} · ${unit.plate}`} right={<Avatar name="Eko Prasetya" size={38} />} />

      <Section>
        <button
          onClick={() => nav('/mobile/p2h')}
          className={cx(
            'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left',
            p2hFit ? 'bg-emerald-100 text-emerald-900 ring-2 ring-emerald-300' : 'bg-red-100 text-red-900 ring-2 ring-red-300',
          )}
        >
          {p2hFit ? <CheckCircle2 size={24} className="shrink-0" /> : <ShieldAlert size={24} className="shrink-0" />}
          <span className="flex-1">
            <span className="block text-[15px] font-extrabold">{p2hFit ? 'P2H done — fit to operate' : 'P2H failed — do not operate'}</span>
            <span className="block text-[12px] font-semibold opacity-80">
              {unit.id} pre-start check at {hhmm(p2hAt)} · {date(TODAY_ISO)}
            </span>
          </span>
          <ChevronRight size={18} />
        </button>
      </Section>

      {fresh.map((a) => (
        <Section key={a.job.id}>
          <button onClick={() => nav(`/mobile/jobs/${a.job.id}`)} className="flex w-full items-center gap-3 rounded-2xl bg-brand-400 px-4 py-4 text-left text-ink-900 shadow-md active:bg-brand-500">
            <span className="flex h-11 w-11 shrink-0 animate-pulse items-center justify-center rounded-full bg-ink-900 text-brand-400">
              <BellRing size={22} />
            </span>
            <span className="flex-1">
              <span className="block text-[16px] font-extrabold">New assignment — tap to acknowledge</span>
              <span className="block text-[13px] font-semibold">
                {a.job.id} · {a.meta.shift} {a.meta.window}
              </span>
            </span>
            <ChevronRight size={20} />
          </button>
        </Section>
      ))}

      <Section title="Today's assignments" right={<span className="text-[12px] font-bold text-slate-500">{date(TODAY_ISO)}</span>}>
        <div className="space-y-3">
          {today.map((a) => (
            <JobCard key={a.job.id} a={a} />
          ))}
        </div>
      </Section>

      <Section title="Quick actions">
        <div className="grid grid-cols-4 gap-2">
          {quick.map((q) => (
            <button key={q.label} onClick={() => nav(q.to)} className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-slate-200 bg-white px-1 py-3 active:bg-slate-50">
              <span className={cx('flex h-11 w-11 items-center justify-center rounded-full', q.danger ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-ink-900')}>
                <q.icon size={22} />
              </span>
              <span className="text-center text-[11px] leading-tight font-bold text-slate-700">{q.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Recent jobs">
        <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white">
          {history.map((a, i) => (
            <button
              key={a.job.id}
              onClick={() => nav(`/mobile/jobs/${a.job.id}`)}
              className={cx('flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50', i > 0 && 'border-t border-slate-100')}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[13px] font-bold">{a.job.id}</span>
                <span className="block truncate text-[12px] text-slate-500">
                  {date(a.job.date)} · {a.job.title}
                </span>
              </span>
              <JobStatusPill s={a.st.status} />
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}
