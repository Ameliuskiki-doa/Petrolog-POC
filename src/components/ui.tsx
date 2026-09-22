import { clsx } from 'clsx'
import { X, ChevronRight, Search, Inbox } from 'lucide-react'
import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { getProject } from '@/data/core'

export { clsx as cx }

// ─── Layout primitives ───────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  module,
  crumbs,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  /** e.g. "M7 · Project Costing" — shown as a small tag above the title */
  module?: string
  crumbs?: { label: string; to?: string }[]
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && (
          <nav className="mb-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {c.to ? (
                  <Link to={c.to} className="hover:text-slate-800 hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span>{c.label}</span>
                )}
                {i < crumbs.length - 1 && <ChevronRight size={12} />}
              </span>
            ))}
          </nav>
        )}
        {module && <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-700">{module}</div>}
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className, padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return <div className={clsx('rounded-xl border border-slate-200 bg-white shadow-sm', padded && 'p-4', className)}>{children}</div>
}

export function CardHeader({ title, subtitle, actions, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={clsx('mb-3 flex flex-wrap items-start justify-between gap-2', className)}>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Grid({ children, cols = 4, className }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 | 6; className?: string }) {
  const map = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-5',
    6: 'sm:grid-cols-3 lg:grid-cols-6',
  }
  return <div className={clsx('grid grid-cols-1 gap-4', map[cols], className)}>{children}</div>
}

// ─── Buttons & inputs ────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md'; icon?: ReactNode }) {
  const v = {
    primary: 'bg-ink-900 text-white hover:bg-ink-800 border-ink-900',
    secondary: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border-transparent',
    danger: 'bg-red-600 text-white hover:bg-red-700 border-red-600',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600',
  }[variant]
  const s = size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm'
  return (
    <button
      className={clsx('inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition disabled:cursor-not-allowed disabled:opacity-50', v, s, className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx('h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200', className)}
      {...rest}
    />
  )
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx('h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200', className)}
      {...rest}
    >
      {children}
    </select>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={clsx('relative', className)}>
      <Search size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-8" />
    </div>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-slate-600">{children}</label>
}

export function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

// ─── Badges & status ─────────────────────────────────────────────────────────

export type Tone = 'slate' | 'blue' | 'amber' | 'green' | 'red' | 'violet' | 'sky' | 'orange'

const toneClass: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
}

export function Badge({ tone = 'slate', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset', toneClass[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Maps common status words to a tone so every module colours statuses the same way. */
const statusTones: Record<string, Tone> = {
  // neutral / early
  draft: 'slate', planning: 'slate', prospective: 'slate', new: 'slate', open: 'blue', idle: 'slate', closed: 'slate', archived: 'slate', 'not started': 'slate',
  // in flight
  planned: 'sky', dispatched: 'sky', submitted: 'sky', 'in progress': 'blue', active: 'green', operating: 'green', 'in review': 'violet', received: 'blue', 'partially received': 'sky',
  pending: 'amber', 'pending approval': 'amber', 'awaiting approval': 'amber', 'awaiting verification': 'amber', review: 'violet', negotiation: 'violet', proposal: 'sky', qualified: 'sky', lead: 'slate',
  // done
  completed: 'blue', verified: 'green', approved: 'green', billed: 'violet', invoiced: 'violet', paid: 'green', matched: 'green', won: 'green', reconciled: 'green', valid: 'green', posted: 'green', locked: 'slate', issued: 'green', done: 'green',
  // warning / bad
  closing: 'amber', 'on hold': 'amber', maintenance: 'amber', expiring: 'amber', 'expiring soon': 'amber', warning: 'amber', variance: 'orange', exception: 'orange', overdue: 'red', suspended: 'orange',
  expired: 'red', breakdown: 'red', blocked: 'red', rejected: 'red', lost: 'red', critical: 'red', failed: 'red', high: 'red', medium: 'amber', low: 'green', 'over budget': 'red',
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = statusTones[status.toLowerCase()] ?? 'slate'
  return (
    <Badge tone={tone} dot className={className}>
      {status}
    </Badge>
  )
}

/** Stage tag used on modules delivered in Stage 1A / 1B / 2 */
export function StageTag({ stage }: { stage: '1A' | '1B' | '2' }) {
  return <Badge tone={stage === '1A' ? 'amber' : stage === '1B' ? 'sky' : 'violet'}>Stage {stage}</Badge>
}

/** Clickable project code chip — the connector of the whole cost chain. */
export function ProjectCodeChip({ code, showName = false, className }: { code: string; showName?: boolean; className?: string }) {
  const p = getProject(code)
  const isGen = code.startsWith('GEN')
  return (
    <Link
      to={`/projects/${code}`}
      onClick={(e) => e.stopPropagation()}
      className={clsx(
        'inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium ring-1 ring-inset hover:underline',
        isGen ? 'bg-slate-100 text-slate-700 ring-slate-300' : 'bg-brand-50 text-brand-700 ring-brand-200',
        className,
      )}
      title={p?.name}
    >
      {code}
      {showName && p && <span className="truncate font-sans font-normal text-slate-600">{p.name}</span>}
    </Link>
  )
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx('font-mono text-[12px]', className)}>{children}</span>
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ width: size, height: size, background: `hsl(${hue} 45% 45%)` }}
    >
      {initials}
    </span>
  )
}

// ─── Data display ────────────────────────────────────────────────────────────

export function Stat({
  label,
  value,
  sub,
  tone,
  icon,
  to,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'good' | 'bad' | 'warn'
  icon?: ReactNode
  to?: string
}) {
  const body = (
    <Card className={clsx('h-full', to && 'transition hover:border-brand-300 hover:shadow')}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="num mt-1.5 text-2xl font-semibold text-slate-900">{value}</div>
      {sub && (
        <div className={clsx('mt-1 text-xs', tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-slate-500')}>{sub}</div>
      )}
    </Card>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  width?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty = 'No records',
  dense,
  footer,
  rowClassName,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  empty?: ReactNode
  dense?: boolean
  footer?: ReactNode
  rowClassName?: (row: T) => string | undefined
}) {
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width }}
                className={clsx('px-3 py-2 whitespace-nowrap', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-slate-400">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={clsx('border-b border-slate-100 last:border-0', onRowClick && 'cursor-pointer hover:bg-brand-50/40', rowClassName?.(r))}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={clsx('px-3 align-middle', dense ? 'py-1.5' : 'py-2.5', c.align === 'right' && 'num text-right', c.align === 'center' && 'text-center', c.className)}
                >
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold">{footer}</tfoot>}
      </table>
    </div>
  )
}

export function Tabs<K extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { key: K; label: ReactNode; count?: number }[]
  value: K
  onChange: (k: K) => void
  className?: string
}) {
  return (
    <div className={clsx('scrollbar-thin mb-4 flex gap-1 overflow-x-auto border-b border-slate-200', className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={clsx(
            '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition',
            value === t.key ? 'border-brand-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded bg-slate-100 px-1.5 text-[11px] text-slate-600">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Progress({ value, tone = 'brand', className, max = 100 }: { value: number; tone?: 'brand' | 'green' | 'red' | 'blue' | 'amber'; className?: string; max?: number }) {
  const w = Math.max(0, Math.min(100, (value / max) * 100))
  const c = { brand: 'bg-brand-500', green: 'bg-emerald-500', red: 'bg-red-500', blue: 'bg-sky-500', amber: 'bg-amber-500' }[tone]
  return (
    <div className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-slate-200', className)}>
      <div className={clsx('h-full rounded-full', c)} style={{ width: `${w}%` }} />
    </div>
  )
}

/** Label/value pairs for detail headers */
export function DescList({ items, cols = 3 }: { items: { label: string; value: ReactNode }[]; cols?: 2 | 3 | 4 }) {
  const map = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }
  return (
    <dl className={clsx('grid grid-cols-1 gap-x-6 gap-y-3', map[cols])}>
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-xs text-slate-500">{i.label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-slate-800">{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Horizontal lifecycle stepper, e.g. Draft → Planned → … → Verified */
export function Stepper({ steps, current }: { steps: string[]; current: string }) {
  const idx = steps.indexOf(current)
  return (
    <ol className="scrollbar-thin flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          <span
            className={clsx(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
              i < idx && 'bg-emerald-50 text-emerald-700',
              i === idx && 'bg-ink-900 text-white',
              i > idx && 'bg-slate-100 text-slate-400',
            )}
          >
            <span className={clsx('flex h-4 w-4 items-center justify-center rounded-full text-[10px]', i <= idx ? 'bg-white/20' : 'bg-slate-200')}>{i + 1}</span>
            {s}
          </span>
          {i < steps.length - 1 && <span className={clsx('h-px w-4', i < idx ? 'bg-emerald-300' : 'bg-slate-200')} />}
        </li>
      ))}
    </ol>
  )
}

export function Timeline({ items }: { items: { time: string; title: ReactNode; body?: ReactNode; tone?: Tone }[] }) {
  return (
    <ol className="relative ml-2 border-l border-slate-200">
      {items.map((it, i) => (
        <li key={i} className="mb-4 ml-4 last:mb-0">
          <span
            className={clsx(
              'absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white',
              { slate: 'bg-slate-400', blue: 'bg-blue-500', sky: 'bg-sky-500', amber: 'bg-amber-500', orange: 'bg-orange-500', green: 'bg-emerald-500', red: 'bg-red-500', violet: 'bg-violet-500' }[it.tone ?? 'slate'],
            )}
          />
          <div className="text-[11px] text-slate-400">{it.time}</div>
          <div className="text-sm font-medium text-slate-800">{it.title}</div>
          {it.body && <div className="mt-0.5 text-xs text-slate-500">{it.body}</div>}
        </li>
      ))}
    </ol>
  )
}

export function Callout({ tone = 'blue', title, children, icon }: { tone?: Tone; title?: ReactNode; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className={clsx('flex gap-3 rounded-lg px-3.5 py-3 text-sm ring-1 ring-inset', toneClass[tone])}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={clsx(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ title, body, icon }: { title: string; body?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-2 text-slate-300">{icon ?? <Inbox size={36} />}</div>
      <div className="text-sm font-medium text-slate-700">{title}</div>
      {body && <div className="mt-1 max-w-sm text-xs text-slate-500">{body}</div>}
    </div>
  )
}

// ─── Overlays ────────────────────────────────────────────────────────────────

export function Drawer({ open, onClose, title, children, footer, width = 'max-w-xl' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className={clsx('relative flex h-full w-full flex-col bg-white shadow-xl', width)}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

/** Simple local filter-state hook used by list pages */
export function useFilter<T>(rows: T[], text: (row: T) => string) {
  const [q, setQ] = useState('')
  const filtered = q ? rows.filter((r) => text(r).toLowerCase().includes(q.toLowerCase())) : rows
  return { q, setQ, filtered }
}
