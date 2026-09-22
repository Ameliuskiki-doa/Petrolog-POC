import type { ReactNode } from 'react'
import { IdCard, Truck, Clock, Award, Smartphone, LogOut, RotateCcw, ShieldCheck, Lock, Trash2, KeyRound } from 'lucide-react'
import { Avatar, cx } from '@/components/ui'
import { TODAY_ISO, date, daysUntil, num } from '@/lib/format'
import { driver, driverUnit, driverScore, DRIVER_EMAIL } from '@/data/mobile'
import { useMobile } from '../store'
import { MHeader, Section, Panel } from '../kit'
import { useAssignments } from '../helpers'

function Row({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[13px] text-slate-500">{label}</span>
      <span className={cx('text-right text-[14px] font-bold', mono && 'font-mono text-[13px]')}>{value}</span>
    </div>
  )
}

export default function Profile() {
  const { signOut, resetDemo, timesheets, queue } = useMobile()
  const emp = driver()
  const unit = driverUnit()
  const lic = emp.licence!
  const licDays = daysUntil(lic.expiry)
  const kirDays = daysUntil(unit.cert.expiry)
  const today = useAssignments().filter((a) => a.job.date === TODAY_ISO)
  const trips = today.reduce((s, a) => s + a.st.trips.length, 0)
  const tonnes = today.reduce((s, a) => s + a.tonnage, 0)
  const ts = timesheets.find((t) => t.date === TODAY_ISO)
  const tsHours = ts ? Object.values(ts.hours).reduce((a, b) => a + (b ?? 0), 0) : undefined
  const pending = queue.filter((q) => q.state === 'Queued' || q.state === 'Sending').length
  const R = 42
  const C = 2 * Math.PI * R

  return (
    <div className="pb-8">
      <MHeader title="Profile" />
      <Section>
        <div className="flex items-center gap-4">
          <Avatar name={emp.name} size={64} />
          <div className="min-w-0">
            <div className="text-[20px] font-extrabold">{emp.name}</div>
            <div className="text-[13px] font-semibold text-slate-600">
              {emp.position} · {emp.location}
            </div>
            <div className="font-mono text-[12px] text-slate-500">
              {emp.id} · {DRIVER_EMAIL}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Today">
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: String(trips), l: 'trips' },
            { v: num(tonnes, 1), l: 'tonnes' },
            { v: tsHours !== undefined ? `${tsHours} h` : '—', l: tsHours !== undefined ? 'hours logged' : 'hours not yet logged' },
          ].map((x) => (
            <div key={x.l} className="rounded-2xl border-2 border-slate-200 bg-white py-3 text-center">
              <div className="text-[22px] leading-none font-extrabold">{x.v}</div>
              <div className="mt-1 text-[11px] font-bold text-slate-500">{x.l}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Driver score">
        <Panel>
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r={R} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle cx="50" cy="50" r={R} fill="none" stroke="#f59e0b" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(driverScore.overall / 100) * C} ${C}`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[26px] leading-none font-extrabold">{driverScore.overall}</span>
                <span className="text-[10px] font-bold text-slate-500">/ 100</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[15px] font-extrabold">
                <Award size={17} className="text-brand-600" /> Good
              </div>
              <div className="text-[12px] text-slate-500">{driverScore.rank}</div>
              <div className="text-[12px] text-slate-500">Last 30 days · telematics + job data</div>
            </div>
          </div>
          <div className="mt-3 space-y-2.5">
            {driverScore.parts.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between text-[13px] font-bold">
                  <span>{p.label}</span>
                  <span>{p.value}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className={cx('h-full rounded-full', p.value >= 85 ? 'bg-emerald-500' : p.value >= 75 ? 'bg-brand-400' : 'bg-orange-500')} style={{ width: `${p.value}%` }} />
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">{p.note}</div>
              </div>
            ))}
          </div>
        </Panel>
      </Section>

      <Section title="Licence">
        <Panel>
          <div className="mb-1 flex items-center gap-2 text-[15px] font-extrabold">
            <IdCard size={18} /> {lic.kind}
            <span className={cx('ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold', licDays < 60 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900')}>
              {licDays < 0 ? 'Expired' : licDays < 60 ? 'Renew soon' : 'Valid'}
            </span>
          </div>
          <Row label="Number" value={lic.number} mono />
          <Row label="Expires" value={`${date(lic.expiry)} · ${licDays} days`} />
          <Row label="Reminder" value="HR notifies 60 days before expiry" />
        </Panel>
      </Section>

      <Section title="Assigned unit">
        <Panel>
          <div className="mb-1 flex items-center gap-2 text-[15px] font-extrabold">
            <Truck size={18} /> {unit.id} · {unit.type}
          </div>
          <Row label="Make / plate" value={`${unit.make} · ${unit.plate}`} />
          <Row label="Odometer" value={`${num(unit.meter)} km`} />
          <Row label="KIR certificate" value={`${date(unit.cert.expiry)} · ${kirDays} d`} />
          <Row label="Project" value={unit.projectCode ?? '—'} mono />
        </Panel>
      </Section>

      <Section title="Device & security">
        <Panel>
          <Row label="Sign-in" value={<span className="flex items-center gap-1"><KeyRound size={13} /> Petrolog ID (SSO)</span>} />
          <Row label="Session valid until" value="22:00 today" />
          <Row label="Local storage" value={<span className="flex items-center gap-1"><Lock size={13} /> Encrypted (AES-256)</span>} />
          <Row label="Remote wipe" value={<span className="flex items-center gap-1"><Trash2 size={13} /> Enabled</span>} />
          <Row label="Pending on device" value={`${pending} item${pending === 1 ? '' : 's'}`} />
          <Row label="App" value={<span className="flex items-center gap-1"><Smartphone size={13} /> v2.4.1 (318)</span>} />
          <div className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck size={13} className="mt-0.5 shrink-0" /> Signing out keeps unsynced items on the device until they are delivered.
          </div>
        </Panel>
      </Section>

      <Section>
        <div className="space-y-2">
          <button onClick={resetDemo} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white text-[15px] font-bold active:bg-slate-50">
            <RotateCcw size={17} /> Reset demo data
          </button>
          <button onClick={signOut} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-200 text-[15px] font-bold text-red-700 active:bg-slate-300">
            <LogOut size={17} /> Sign out
          </button>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1 text-center text-[11px] text-slate-400">
          <Clock size={11} /> Demo date {date(TODAY_ISO)}
        </p>
      </Section>
    </div>
  )
}
