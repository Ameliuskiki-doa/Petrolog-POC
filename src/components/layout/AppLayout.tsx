import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Menu, Search, X, ChevronDown, CalendarDays, ExternalLink } from 'lucide-react'
import { nav } from '@/nav'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { cx, Avatar } from '@/components/ui'
import { useRole } from '@/lib/app-state'
import { roles, getEmployee, projects, purchaseOrders, jobs, vendors, contracts, units, type RoleKey } from '@/data/core'
import { date, TODAY_ISO } from '@/lib/format'

export const APP_NAME = 'Petrolog ERP'

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="7" fill="#1e293b" />
        <path d="M9 23V9h8a5 5 0 0 1 0 10h-4v4z" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-white">{APP_NAME}</div>
        <div className="text-[10px] tracking-wide text-slate-400 uppercase">Integrated Operations Platform</div>
      </div>
    </div>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-ink-900">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Logo />
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2.5 pb-6">
        {nav.map((g) => (
          <div key={g.label} className="mt-4">
            <div className="mb-1 flex items-center justify-between px-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              <span>{g.label}</span>
              {g.modules && <span className="font-mono normal-case">{g.modules}</span>}
            </div>
            {g.items.map((it) => {
              const external = it.to === '/mobile' || it.to === '/portal'
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === '/' || it.to === '/finance/billing'}
                  target={external ? '_blank' : undefined}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cx(
                      'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition',
                      isActive && !external ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                    )
                  }
                >
                  <it.icon size={15} className="shrink-0 text-slate-400 group-hover:text-brand-400" />
                  <span className="flex-1 truncate">{it.label}</span>
                  {external && <ExternalLink size={12} className="text-slate-500" />}
                  {it.stage === '1B' && <span className="rounded bg-sky-500/15 px-1 text-[9px] font-semibold text-sky-300">1B</span>}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-4 py-3 text-[10px] leading-relaxed text-slate-500">
        Clickable prototype · dummy data
        <br />
        Stage 1A live · Stage 1B cut-over 01 Jan 2028
      </div>
    </div>
  )
}

interface SearchHit {
  label: string
  sub: string
  to: string
  kind: string
}

function useSearchIndex(): SearchHit[] {
  return useMemo(
    () => [
      ...projects.map((p) => ({ label: p.code, sub: p.name, to: `/projects/${p.code}`, kind: 'Project' })),
      ...contracts.map((c) => ({ label: c.id, sub: c.title, to: `/contracts/${c.id}`, kind: 'Contract' })),
      ...jobs.map((j) => ({ label: j.id, sub: j.title, to: `/ops/jobs/${j.id}`, kind: 'Job' })),
      ...purchaseOrders.map((p) => ({ label: p.id, sub: p.description, to: `/procurement/orders/${p.id}`, kind: 'PO' })),
      ...vendors.map((v) => ({ label: v.name, sub: v.id, to: `/vendors/${v.id}`, kind: 'Vendor' })),
      ...units.map((u) => ({ label: u.id, sub: u.type, to: `/fleet/units/${u.id}`, kind: 'Unit' })),
    ],
    [],
  )
}

function GlobalSearch() {
  const index = useSearchIndex()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const hits = q.length < 2 ? [] : index.filter((h) => (h.label + ' ' + h.sub).toLowerCase().includes(q.toLowerCase())).slice(0, 8)

  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search project code, PO, job, vendor, unit…"
        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
      />
      {open && hits.length > 0 && (
        <div className="absolute top-11 left-0 z-40 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {hits.map((h) => (
            <button
              key={h.kind + h.to}
              onClick={() => {
                nav(h.to)
                setOpen(false)
                setQ('')
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
            >
              <span className="w-14 shrink-0 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{h.kind}</span>
              <span className="min-w-0">
                <span className="block truncate font-mono text-xs font-medium text-slate-800">{h.label}</span>
                <span className="block truncate text-xs text-slate-500">{h.sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const notifications = [
  { title: 'Crane CR-050-01 SILO certificate expired', body: 'Unit is blocked from job assignment', to: '/maintenance/certifications', tone: 'bg-red-500', time: '2h' },
  { title: 'PR-2028-0256 exceeds remaining RAB', body: 'GS-2027-008 · escalated to Finance Director', to: '/procurement/requisitions/PR-2028-0256', tone: 'bg-amber-500', time: '3h' },
  { title: '3 Surat Konversi without AR invoice > 14 days', body: 'Revenue leakage check', to: '/finance/billing/reconciliation', tone: 'bg-orange-500', time: '5h' },
  { title: 'Late toll invoice charged to PS-2027-017', body: 'Controlled reopening — period Dec 2027 stays locked', to: '/costing/late-costs', tone: 'bg-sky-500', time: '1d' },
  { title: 'Fuel anomaly: DT-03 consumption +18%', body: 'Investigation queue', to: '/fleet/fuel', tone: 'bg-amber-500', time: '1d' },
]

function Notifications() {
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold">Notifications</div>
            {notifications.map((n) => (
              <button
                key={n.title}
                onClick={() => {
                  setOpen(false)
                  nav(n.to)
                }}
                className="flex w-full gap-3 border-b border-slate-50 px-4 py-2.5 text-left last:border-0 hover:bg-slate-50"
              >
                <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.tone)} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-slate-800">{n.title}</span>
                  <span className="block text-xs text-slate-500">{n.body}</span>
                </span>
                <span className="text-[11px] text-slate-400">{n.time}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RoleSwitcher() {
  const { role, setRole } = useRole()
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const user = getEmployee(roles[role].userId)!
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg py-1 pr-2 pl-1 hover:bg-slate-100">
        <Avatar name={user.name} />
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-[13px] font-medium text-slate-800">{user.name}</span>
          <span className="block text-[11px] text-slate-500">{roles[role].label}</span>
        </span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-4 py-2.5">
              <div className="text-sm font-semibold">Switch demo role</div>
              <div className="text-xs text-slate-500">Dashboard and approvals follow the role</div>
            </div>
            {(Object.keys(roles) as RoleKey[]).map((k) => {
              const u = getEmployee(roles[k].userId)!
              return (
                <button
                  key={k}
                  onClick={() => {
                    setRole(k)
                    setOpen(false)
                    nav('/')
                  }}
                  className={cx('flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50', k === role && 'bg-brand-50')}
                >
                  <Avatar name={u.name} size={26} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-slate-800">{roles[k].label}</span>
                    <span className="block truncate text-[11px] text-slate-500">{u.name}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const loc = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [loc.pathname])

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 lg:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
            <button onClick={() => setMobileOpen(false)} className="absolute top-3 -right-10 rounded bg-white p-1.5">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <button onClick={() => setMobileOpen(true)} className="rounded p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden">
            <Menu size={20} />
          </button>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1">
            <span className="mr-2 hidden items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600 xl:flex" title="The prototype is staged on this date">
              <CalendarDays size={13} /> {date(TODAY_ISO)}
            </span>
            <Notifications />
            <RoleSwitcher />
          </div>
        </header>
        <main ref={mainRef} className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
            <ErrorBoundary resetKey={loc.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
