import { useState } from 'react'
import { RefreshCw, Wifi, WifiOff, Signal, ShieldCheck, ChevronDown, Truck, Navigation, Radar, Camera, Flag, Clock, Fuel, Receipt, TriangleAlert, ClipboardCheck, CheckCircle2, KeyRound, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cx } from '@/components/ui'
import { seededSyncHistory } from '@/data/mobile'
import { useMobile, type QItem } from '../store'
import { MHeader, Section, QBadge } from '../kit'
import { kindIcon } from '../helpers'

const icons: Record<string, LucideIcon> = {
  ack: CheckCircle2,
  checkin: Truck,
  depart: Navigation,
  arrive: Radar,
  pod: Camera,
  complete: Flag,
  timesheet: Clock,
  fuel: Fuel,
  charge: Receipt,
  incident: TriangleAlert,
  p2h: ClipboardCheck,
}

function Row({ q }: { q: QItem }) {
  const Icon = icons[q.kind] ?? Info
  return (
    <div className={cx('px-4 py-3 transition-colors', q.state === 'Sending' && 'bg-sky-50')}>
      <div className="flex items-start gap-3">
        <span className={cx('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full', q.state === 'Queued' ? 'bg-amber-100 text-amber-800' : q.state === 'Sending' ? 'bg-sky-100 text-sky-800' : q.state === 'Conflict resolved' ? 'bg-violet-100 text-violet-800' : 'bg-emerald-100 text-emerald-800')}>
          <Icon size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[14px] leading-tight font-bold">{q.title}</div>
            <QBadge state={q.state} attempts={q.attempts} />
          </div>
          <div className="mt-0.5 text-[12px] leading-snug text-slate-600">{q.detail}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
            <span>{kindIcon[q.kind]}</span>
            <span>· saved {q.createdAt}</span>
            {q.syncedAt && <span>· delivered {q.syncedAt}</span>}
            <span>· {q.sizeKb} KB</span>
            {q.projectCode && <span className="font-mono font-bold text-slate-600">· {q.projectCode}</span>}
          </div>
          <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-slate-500">
            <KeyRound size={11} /> {q.idem}
          </div>
          {q.note && <div className={cx('mt-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold', q.state === 'Conflict resolved' ? 'bg-violet-50 text-violet-900' : q.state === 'Queued' ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700')}>{q.note}</div>}
        </div>
      </div>
    </div>
  )
}

export default function SyncQueue() {
  const { queue, conn, pending, retryNow, notify } = useMobile()
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [how, setHow] = useState(false)
  const conflicts = queue.filter((q) => q.state === 'Conflict resolved').length
  const delivered = queue.filter((q) => q.state === 'Synced' || q.state === 'Conflict resolved')
  const lastSync = delivered.map((q) => q.syncedAt ?? '').sort().pop() || seededSyncHistory[0].at
  const shown = queue.filter((q) => (filter === 'all' ? true : filter === 'pending' ? q.state === 'Queued' || q.state === 'Sending' : q.state === 'Synced' || q.state === 'Conflict resolved'))

  const head = {
    online: { icon: Wifi, cls: 'bg-emerald-600', t: pending ? 'Syncing…' : 'All changes synced', s: pending ? `${pending} item${pending > 1 ? 's' : ''} being delivered` : `Last sync ${lastSync}` },
    weak: { icon: Signal, cls: 'bg-amber-500', t: 'Weak signal', s: pending ? `${pending} pending · small items first, media retried` : `Last sync ${lastSync}` },
    offline: { icon: WifiOff, cls: 'bg-red-600', t: 'Offline', s: pending ? `${pending} item${pending > 1 ? 's' : ''} safe on this phone` : 'Nothing waiting — you can keep working' },
  }[conn]

  return (
    <div className="pb-8">
      <MHeader title="Sync queue" sub="Everything you record is saved on the phone first" />

      <Section>
        <div className={cx('rounded-2xl p-4 text-white', head.cls)}>
          <div className="flex items-center gap-3">
            <head.icon size={28} />
            <div className="flex-1">
              <div className="text-[18px] font-extrabold">{head.t}</div>
              <div className="text-[13px] font-semibold opacity-90">{head.s}</div>
            </div>
            {pending > 0 && conn !== 'offline' && <RefreshCw size={22} className="animate-spin" />}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { v: pending, l: 'Pending' },
              { v: delivered.length + seededSyncHistory.length, l: 'Delivered today' },
              { v: conflicts, l: 'Conflicts resolved' },
            ].map((x) => (
              <div key={x.l} className="rounded-xl bg-black/15 py-2">
                <div className="text-[22px] leading-none font-extrabold">{x.v}</div>
                <div className="mt-1 text-[11px] font-bold opacity-90">{x.l}</div>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => (conn === 'offline' ? notify('No signal — the queue retries automatically when signal returns', 'queued') : (retryNow(), notify('Sync started')))}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white text-[15px] font-bold active:bg-slate-50"
        >
          <RefreshCw size={18} /> {conn === 'offline' ? 'Waiting for signal — auto retry on' : 'Sync now'}
        </button>
      </Section>

      <Section>
        <button onClick={() => setHow((h) => !h)} className="flex w-full items-center justify-between rounded-2xl bg-ink-900 px-4 py-3 text-left text-white">
          <span className="flex items-center gap-2 text-[14px] font-bold">
            <ShieldCheck size={18} className="text-brand-400" /> How sync protects your data
          </span>
          <ChevronDown size={18} className={cx('transition', how && 'rotate-180')} />
        </button>
        {how && (
          <div className="mt-2 space-y-2 rounded-2xl bg-white p-4 text-[13px] text-slate-700 ring-2 ring-slate-200">
            <p>
              <b>1. Device first.</b> Every action is written to encrypted storage on this phone before anything else. Closing the app or losing signal loses nothing.
            </p>
            <p>
              <b>2. Delivered in order, retried until confirmed.</b> Oldest first; an item is only marked Synced when the server confirms it.
            </p>
            <p>
              <b>3. Idempotency key.</b> Each item carries a unique key. If a retry arrives twice, the server recognises the key and does not create a second transaction.
            </p>
            <p>
              <b>4. Conflicts per data type.</b> Check-ins and POD are append-only · fuel is merged with fuel-card and fuel-stick readings · timesheets keep your latest draft until your
              supervisor approves · HSE reports are always added.
            </p>
            <p className="rounded-lg bg-amber-50 p-2 font-semibold text-amber-900">
              Honest note: this is eventual consistency. The office sees your work when this phone next has signal — not instantly — but nothing is lost.
            </p>
          </div>
        )}
      </Section>

      <Section
        title="Queue"
        right={
          <div className="flex rounded-full bg-slate-200 p-0.5">
            {(['all', 'pending', 'done'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cx('h-8 rounded-full px-3 text-[12px] font-bold capitalize', filter === f ? 'bg-white shadow' : 'text-slate-600')}>
                {f === 'done' ? 'Synced' : f}
              </button>
            ))}
          </div>
        }
      >
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white">
          {shown.map((q) => (
            <Row key={q.id} q={q} />
          ))}
          {shown.length === 0 && <div className="px-4 py-8 text-center text-[13px] font-semibold text-slate-500">{queue.length === 0 ? 'Nothing recorded in this session yet. Try acknowledging a job while offline.' : 'No items in this view.'}</div>}
        </div>
      </Section>

      <Section title="Earlier today">
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white">
          {seededSyncHistory.map((h) => {
            const Icon = icons[h.kind] ?? Info
            return (
              <div key={h.idem} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                  <Icon size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[14px] font-bold">{h.title}</div>
                    <QBadge state="Synced" />
                  </div>
                  <div className="text-[12px] text-slate-600">{h.detail}</div>
                  <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-slate-500">
                    <KeyRound size={11} /> {h.idem} · {h.at}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}
