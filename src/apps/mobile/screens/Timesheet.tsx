import { useState } from 'react'
import { Send, UserCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cx } from '@/components/ui'
import { TODAY_ISO, date } from '@/lib/format'
import { getEmployee } from '@/data/core'
import { hourCategories, type HourCategory, SUPERVISOR_ID, OPS_ADMIN_ID } from '@/data/mobile'
import { useMobile, useSaved } from '../store'
import { MHeader, Section, Panel, BigButton, Locked, Stepper } from '../kit'
import { JobPicker, useDefaultJob } from '../helpers'

const catNote: Record<HourCategory, string> = {
  Normal: 'Max 8 h per day',
  Overtime: 'Above 8 h · needs supervisor OK',
  Standby: 'Waiting caused by client / queue',
  Travel: 'Mess ↔ site transfer',
  'Public holiday': 'Worked on a gazetted holiday',
}

export default function Timesheet() {
  const { timesheets, update, record } = useMobile()
  const saved = useSaved()
  const [jobId, setJobId, a] = useDefaultJob()
  const [hours, setHours] = useState<Record<HourCategory, number>>({ Normal: 8, Overtime: 0, Standby: 0, Travel: 0, 'Public holiday': 0 })
  const total = Object.values(hours).reduce((x, y) => x + y, 0)
  const errors: string[] = []
  if (hours.Normal > 8) errors.push('Normal hours are capped at 8 per day — book the rest as Overtime.')
  if (total > 16) errors.push('More than 16 hours in one day is not allowed (fatigue rule).')
  if (total === 0) errors.push('Enter at least one hour.')
  const existing = timesheets.find((t) => t.date === TODAY_ISO)
  const sup = getEmployee(SUPERVISOR_ID)
  const adm = getEmployee(OPS_ADMIN_ID)

  function submit() {
    if (errors.length || !a) return
    const entry = { date: TODAY_ISO, jobId: a.job.id, projectCode: a.job.projectCode, hours: Object.fromEntries(Object.entries(hours).filter(([, v]) => v > 0)), status: 'Submitted' as const }
    update((s) => ({ ...s, timesheets: [entry, ...s.timesheets.filter((t) => t.date !== TODAY_ISO)] }))
    record({
      kind: 'timesheet',
      jobId: a.job.id,
      projectCode: a.job.projectCode,
      title: `Timesheet ${date(TODAY_ISO)} — ${total} h`,
      detail: Object.entries(hours)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k} ${v} h`)
        .join(' · '),
      sizeKb: 1,
      conflict: existing ? 'Same day already on server — newer driver draft replaced it (driver-owned until supervisor approval). Version 2 kept in audit trail.' : undefined,
    })
    saved(existing ? 'Timesheet updated' : 'Timesheet submitted')
  }

  const fmt = (h: Partial<Record<HourCategory, number>>) =>
    Object.entries(h)
      .map(([k, v]) => `${k === 'Public holiday' ? 'PH' : k} ${v}`)
      .join(' · ')
  const sum = (h: Partial<Record<HourCategory, number>>) => Object.values(h).reduce((x, y) => x + (y ?? 0), 0)

  return (
    <div className="pb-8">
      <MHeader title="Timesheet" sub={`Friday, ${date(TODAY_ISO)}`} />

      <Section title="Job">
        <JobPicker value={jobId} onChange={setJobId} />
        {a && (
          <div className="mt-2">
            <Locked label="Project code (from parent job)" value={a.job.projectCode} note="Cannot be changed here — every hour lands on the job's project" />
          </div>
        )}
      </Section>

      <Section title="Hours by category" right={<span className={cx('text-[15px] font-extrabold', total > 16 ? 'text-red-600' : 'text-ink-900')}>{total} h</span>}>
        <Panel className="divide-y divide-slate-100 p-0">
          {hourCategories.map((c) => (
            <div key={c} className="flex items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[15px] font-bold">{c}</div>
                <div className="text-[11px] text-slate-500">{catNote[c]}</div>
              </div>
              <Stepper value={hours[c]} onChange={(v) => setHours((h) => ({ ...h, [c]: v }))} />
            </div>
          ))}
        </Panel>
        {errors.length > 0 && total > 0 && (
          <div className="mt-2 space-y-1">
            {errors.map((e) => (
              <div key={e} className="flex gap-1.5 text-[13px] font-bold text-red-600">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                {e}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section>
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-[12px] font-semibold text-sky-900 ring-1 ring-sky-200">
          <UserCheck size={16} className="mt-0.5 shrink-0" />
          <span>
            Approval: {sup?.name} (field supervisor) → {adm?.name} (operations admin). Escalates automatically after 24 h.
          </span>
        </div>
        {existing && (
          <div className="mb-3 text-[12px] font-bold text-amber-700">Today already submitted ({sum(existing.hours)} h). Submitting again replaces it until the supervisor approves.</div>
        )}
        <BigButton onClick={submit} disabled={!!errors.length || !a} icon={<Send />}>
          {existing ? 'Resubmit today' : 'Submit today'}
        </BigButton>
      </Section>

      <Section title="This week">
        <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white">
          {timesheets.map((t, i) => (
            <div key={t.date} className={cx('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-slate-100')}>
              <div className="w-14 shrink-0 text-center">
                <div className="text-[20px] leading-none font-extrabold">{t.date.slice(8)}</div>
                <div className="text-[11px] font-bold text-slate-500">Mar</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold">{sum(t.hours)} h</div>
                <div className="truncate text-[11px] text-slate-500">
                  {fmt(t.hours)} · <span className="font-mono">{t.projectCode}</span>
                </div>
              </div>
              <span
                className={cx(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset',
                  t.status === 'Approved' ? 'bg-emerald-100 text-emerald-900 ring-emerald-300' : t.status === 'Supervisor approved' ? 'bg-sky-100 text-sky-900 ring-sky-300' : 'bg-amber-100 text-amber-900 ring-amber-300',
                )}
              >
                {t.status === 'Approved' && <CheckCircle2 size={12} />}
                {t.status}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
