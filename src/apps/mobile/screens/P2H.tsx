import { useState } from 'react'
import { Check, X, Send, ShieldCheck, ShieldAlert, Wrench } from 'lucide-react'
import { cx } from '@/components/ui'
import { num } from '@/lib/format'
import { p2hItems, driverUnit } from '@/data/mobile'
import { useMobile, useSaved, stamp, hhmm } from '../store'
import { MHeader, Section, BigButton, MLabel, MInput } from '../kit'

type Ans = 'ok' | 'fail'

export default function P2H() {
  const { p2hAt, p2hFit, update, record } = useMobile()
  const saved = useSaved()
  const unit = driverUnit()
  const [ans, setAns] = useState<Record<string, Ans>>({})
  const [odo, setOdo] = useState('')
  const [result, setResult] = useState<'fit' | 'unfit'>()
  const answered = Object.keys(ans).length
  const fails = p2hItems.filter((i) => ans[i.key] === 'fail')
  const criticalFail = fails.some((f) => f.critical)

  function submit() {
    if (answered < p2hItems.length) return
    const fit = !criticalFail
    update((s) => ({ ...s, p2hAt: stamp(), p2hFit: fit }))
    record({
      kind: 'p2h',
      projectCode: unit.projectCode,
      title: `P2H pre-start — ${unit.id}`,
      detail: fit ? `${p2hItems.length - fails.length} of ${p2hItems.length} OK${fails.length ? ` · minor: ${fails.map((f) => f.label).join(', ')}` : ''} · fit to operate` : `NOT FIT · ${fails.map((f) => f.label).join(', ')} · maintenance request raised`,
      sizeKb: 3,
    })
    saved(fit ? 'P2H submitted — fit to operate' : 'P2H submitted — unit not fit')
    setResult(fit ? 'fit' : 'unfit')
  }

  if (result) {
    const fit = result === 'fit'
    return (
      <div className="pb-8">
        <MHeader back="/mobile" title="P2H result" sub={`${unit.id} · ${unit.plate}`} />
        <Section>
          <div className={cx('rounded-2xl p-5 text-center ring-2', fit ? 'bg-emerald-50 ring-emerald-300' : 'bg-red-50 ring-red-300')}>
            {fit ? <ShieldCheck size={52} className="mx-auto text-emerald-600" /> : <ShieldAlert size={52} className="mx-auto text-red-600" />}
            <div className="mt-2 text-[22px] font-extrabold">{fit ? 'Fit to operate' : 'Do not operate'}</div>
            <p className="mt-1 text-[14px] text-slate-700">
              {fit
                ? fails.length
                  ? 'Minor defects recorded — workshop will schedule a fix. You may start your shift.'
                  : 'All items OK. Have a safe shift.'
                : `Critical defect on ${fails
                    .filter((f) => f.critical)
                    .map((f) => f.label.toLowerCase())
                    .join(', ')}. ${unit.id} is blocked from dispatch and a maintenance request goes to the workshop when this syncs.`}
            </p>
          </div>
          {!fit && (
            <div className="mt-3 flex gap-2 rounded-xl bg-white p-3 text-[13px] font-semibold text-slate-700 ring-2 ring-slate-200">
              <Wrench size={17} className="mt-0.5 shrink-0" /> Workshop Balikpapan (Joko Susilo) is notified. Units under an open work order are not offered for planning.
            </div>
          )}
          <div className="mt-4">
            <BigButton variant="light" onClick={() => setResult(undefined)}>
              Redo checklist
            </BigButton>
          </div>
        </Section>
      </div>
    )
  }

  return (
    <div className="pb-8">
      <MHeader back title="P2H pre-start check" sub={`${unit.id} · ${unit.make} · ${unit.plate}`} />
      <Section>
        <div className={cx('rounded-xl px-3 py-2 text-[13px] font-bold', p2hFit ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900')}>
          Last check today {hhmm(p2hAt)} — {p2hFit ? 'fit to operate' : 'not fit'}
        </div>
      </Section>
      <Section title={`Checklist · ${answered}/${p2hItems.length}`} right={<button onClick={() => setAns(Object.fromEntries(p2hItems.map((i) => [i.key, 'ok' as Ans])))} className="h-9 rounded-full bg-slate-200 px-3 text-[12px] font-bold">All OK</button>}>
        <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white">
          {p2hItems.map((i, k) => (
            <div key={i.key} className={cx('flex items-center gap-2 px-3 py-2.5', k > 0 && 'border-t border-slate-100', ans[i.key] === 'fail' && 'bg-red-50')}>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] leading-tight font-bold">{i.label}</div>
                {i.critical && <div className="text-[10px] font-extrabold text-red-600 uppercase">Critical</div>}
              </div>
              <button
                aria-label={`${i.label} OK`}
                onClick={() => setAns((a) => ({ ...a, [i.key]: 'ok' }))}
                className={cx('flex h-12 w-12 items-center justify-center rounded-xl border-2', ans[i.key] === 'ok' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-slate-400')}
              >
                <Check size={24} strokeWidth={3} />
              </button>
              <button
                aria-label={`${i.label} not OK`}
                onClick={() => setAns((a) => ({ ...a, [i.key]: 'fail' }))}
                className={cx('flex h-12 w-12 items-center justify-center rounded-xl border-2', ans[i.key] === 'fail' ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300 text-slate-400')}
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      </Section>
      <Section>
        <MLabel hint={`last ${num(unit.meter)} km`}>Odometer (optional)</MLabel>
        <MInput value={odo} onChange={(e) => setOdo(e.target.value)} inputMode="numeric" placeholder={String(unit.meter + 460)} />
      </Section>
      <Section>
        <BigButton onClick={submit} disabled={answered < p2hItems.length} variant={criticalFail ? 'danger' : 'primary'} icon={<Send />} sub={answered < p2hItems.length ? `${p2hItems.length - answered} items left` : undefined}>
          Submit P2H
        </BigButton>
      </Section>
    </div>
  )
}
