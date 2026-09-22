import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, CloudOff, Loader2, CheckCircle2, GitMerge, Clock3 } from 'lucide-react'
import { cx } from '@/components/ui'
import type { QState } from './store'

/** Sticky screen header inside the phone */
export function MHeader({ title, sub, back, right }: { title: ReactNode; sub?: ReactNode; back?: string | true; right?: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="sticky top-0 z-20 flex min-h-14 items-center gap-2 bg-ink-900 px-3 py-2 text-white">
      {back && (
        <button
          aria-label="Back"
          onClick={() => (back === true ? nav(-1) : nav(back))}
          className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:bg-white/15"
        >
          <ChevronLeft size={26} />
        </button>
      )}
      <div className={cx('min-w-0 flex-1', !back && 'pl-1')}>
        <div className="truncate text-[17px] leading-tight font-bold">{title}</div>
        {sub && <div className="truncate text-[12px] text-slate-300">{sub}</div>}
      </div>
      {right}
    </div>
  )
}

type BigVariant = 'primary' | 'dark' | 'light' | 'success' | 'danger'

export function BigButton({ variant = 'primary', icon, children, className, sub, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BigVariant; icon?: ReactNode; sub?: ReactNode }) {
  const v = {
    primary: 'bg-brand-400 text-ink-900 active:bg-brand-500',
    dark: 'bg-ink-900 text-white active:bg-ink-800',
    light: 'bg-white text-ink-900 ring-2 ring-slate-300 active:bg-slate-100',
    success: 'bg-emerald-600 text-white active:bg-emerald-700',
    danger: 'bg-red-600 text-white active:bg-red-700',
  }[variant]
  return (
    <button
      className={cx(
        'flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl px-4 py-3 text-[17px] font-bold shadow-sm transition select-none disabled:opacity-40',
        v,
        className,
      )}
      {...rest}
    >
      {icon}
      <span className="flex flex-col items-center leading-tight">
        {children}
        {sub && <span className="text-[12px] font-medium opacity-80">{sub}</span>}
      </span>
    </button>
  )
}

export function Section({ title, children, right, className }: { title?: ReactNode; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={cx('px-4 pt-4', className)}>
      {(title || right) && (
        <div className="mb-2 flex items-center justify-between">
          {title && <h2 className="text-[13px] font-bold tracking-wide text-slate-500 uppercase">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

export function Panel({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cx('rounded-2xl border-2 border-slate-200 bg-white p-4', onClick && 'cursor-pointer active:bg-slate-50', className)}>
      {children}
    </div>
  )
}

export function MLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[14px] font-bold text-slate-800">{children}</span>
      {hint && <span className="text-[12px] text-slate-500">{hint}</span>}
    </div>
  )
}

export function MInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'h-14 w-full rounded-xl border-2 border-slate-300 bg-white px-4 text-[18px] font-semibold text-ink-900 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-brand-500',
        className,
      )}
      {...rest}
    />
  )
}

/** Big segmented choice (touch friendly) */
export function Choice<T extends string>({ options, value, onChange, cols = 2 }: { options: readonly T[]; value: T | undefined; onChange: (v: T) => void; cols?: 2 | 3 }) {
  return (
    <div className={cx('grid gap-2', cols === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cx(
            'min-h-12 rounded-xl border-2 px-2 py-2 text-[14px] font-bold transition',
            value === o ? 'border-ink-900 bg-ink-900 text-white' : 'border-slate-300 bg-white text-slate-700 active:bg-slate-100',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

/** Locked value (e.g. project code taken from the parent job) */
export function Locked({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-2.5">
      <div className="text-[12px] font-semibold text-slate-500">{label}</div>
      <div className="font-mono text-[16px] font-bold text-ink-900">{value}</div>
      {note && <div className="text-[11px] text-slate-500">{note}</div>}
    </div>
  )
}

export function QBadge({ state, attempts }: { state: QState; attempts?: number }) {
  const map: Record<QState, { cls: string; icon: ReactNode }> = {
    Queued: { cls: 'bg-amber-100 text-amber-900 ring-amber-300', icon: attempts ? <Clock3 size={13} /> : <CloudOff size={13} /> },
    Sending: { cls: 'bg-sky-100 text-sky-900 ring-sky-300', icon: <Loader2 size={13} className="animate-spin" /> },
    Synced: { cls: 'bg-emerald-100 text-emerald-900 ring-emerald-300', icon: <CheckCircle2 size={13} /> },
    'Conflict resolved': { cls: 'bg-violet-100 text-violet-900 ring-violet-300', icon: <GitMerge size={13} /> },
  }
  const m = map[state]
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ring-1 ring-inset', m.cls)}>
      {m.icon}
      {state}
      {state === 'Queued' && attempts ? ` · retry ${attempts}` : ''}
    </span>
  )
}

/** Pending marker used on cards whose last action has not reached the server yet */
export function PendingDot({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 ring-1 ring-amber-300 ring-inset">
      <CloudOff size={12} /> Pending sync
    </span>
  )
}

export function Stepper({ value, onChange, step = 0.5, max = 16 }: { value: number; onChange: (v: number) => void; step?: number; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, +(value - step).toFixed(1)))}
        className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-2xl font-bold text-ink-900 active:bg-slate-100"
      >
        −
      </button>
      <div className="num w-14 text-center text-[20px] font-extrabold text-ink-900">{value}</div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, +(value + step).toFixed(1)))}
        className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink-900 bg-ink-900 text-2xl font-bold text-white active:bg-ink-800"
      >
        +
      </button>
    </div>
  )
}
