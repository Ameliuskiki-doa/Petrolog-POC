import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Routes, Route, Navigate, NavLink, Link, useLocation } from 'react-router-dom'
import { ClipboardList, Clock, Fuel, RefreshCw, UserRound, Wifi, WifiOff, Signal, ArrowLeft, ShieldCheck, Database, KeyRound, GitMerge, CloudOff, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cx } from '@/components/ui'
import { MobileProvider, useMobile, clock, type Conn } from './store'
import { OverlayProvider } from './media'
import Login from './screens/Login'
import Home from './screens/Home'
import JobDetail from './screens/JobDetail'
import Pod from './screens/Pod'
import Timesheet from './screens/Timesheet'
import FuelEntry from './screens/FuelEntry'
import Charges from './screens/Charges'
import Incident from './screens/Incident'
import P2H from './screens/P2H'
import SyncQueue from './screens/SyncQueue'
import Profile from './screens/Profile'

function useIsPhone() {
  const q = '(max-width: 499px)'
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(q).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return m
}

function useClock() {
  const [t, setT] = useState(clock())
  useEffect(() => {
    const i = window.setInterval(() => setT(clock()), 10_000)
    return () => window.clearInterval(i)
  }, [])
  return t
}

function useFrameScale() {
  const [s, setS] = useState(1)
  useEffect(() => {
    const on = () => setS(Math.min(1, (window.innerHeight - 32) / 872))
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return s
}

// ─── Status bar (inside the frame) ─────────────────────────────────────────

function SignalBars({ conn }: { conn: Conn }) {
  const lit = conn === 'online' ? 4 : conn === 'weak' ? 1 : 0
  return (
    <span className="flex items-end gap-[2px]" aria-label={`Signal ${conn}`}>
      {[5, 7, 9, 11].map((h, i) => (
        <span key={i} className={cx('w-[3px] rounded-[1px]', i < lit ? 'bg-current' : 'bg-current opacity-25')} style={{ height: h }} />
      ))}
    </span>
  )
}

function StatusBar() {
  const { conn } = useMobile()
  const t = useClock()
  return (
    <div className="relative flex h-[46px] shrink-0 items-center justify-between bg-ink-900 px-7 pt-1 text-[15px] font-semibold text-white">
      <span className="num w-16">{t}</span>
      <span className="absolute top-[9px] left-1/2 h-[30px] w-[112px] -translate-x-1/2 rounded-full bg-black" />
      <span className="flex items-center gap-1.5">
        <SignalBars conn={conn} />
        {conn === 'offline' ? <span className="text-[11px] font-bold">No service</span> : <span className="text-[12px] font-bold">{conn === 'weak' ? 'E' : '4G'}</span>}
        <span className="ml-1 flex items-center">
          <span className="relative flex h-[12px] w-[24px] items-center rounded-[4px] border border-white/60 p-[1.5px]">
            <span className="h-full rounded-[2px] bg-white" style={{ width: '78%' }} />
          </span>
          <span className="ml-[1px] h-[4px] w-[2px] rounded-r bg-white/60" />
        </span>
      </span>
    </div>
  )
}

const connMeta: Record<Conn, { label: string; icon: ReactNode; on: string }> = {
  online: { label: 'Online', icon: <Wifi size={14} />, on: 'bg-emerald-500 text-white' },
  weak: { label: 'Weak signal', icon: <Signal size={14} />, on: 'bg-amber-400 text-ink-900' },
  offline: { label: 'Offline', icon: <WifiOff size={14} />, on: 'bg-red-600 text-white' },
}

export function ConnToggle({ dark = true }: { dark?: boolean }) {
  const { conn, setConn } = useMobile()
  return (
    <div className={cx('flex rounded-full p-0.5', dark ? 'bg-white/10' : 'bg-slate-200')} role="radiogroup" aria-label="Connectivity (demo)">
      {(Object.keys(connMeta) as Conn[]).map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={conn === c}
          onClick={() => setConn(c)}
          className={cx(
            'flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-bold transition',
            conn === c ? connMeta[c].on : dark ? 'text-slate-300' : 'text-slate-600',
          )}
        >
          {connMeta[c].icon}
          {connMeta[c].label}
        </button>
      ))}
    </div>
  )
}

function NetStrip({ framed }: { framed: boolean }) {
  const { conn, pending } = useMobile()
  return (
    <div className={cx('shrink-0 bg-ink-900 px-3 pb-2', !framed && 'pt-[max(env(safe-area-inset-top),8px)]')}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Network · demo</span>
        <ConnToggle />
      </div>
      {conn !== 'online' && (
        <div className={cx('mt-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-bold', conn === 'offline' ? 'bg-red-600/20 text-red-200' : 'bg-amber-400/20 text-amber-200')}>
          {conn === 'offline' ? <CloudOff size={15} /> : <Signal size={15} />}
          {conn === 'offline'
            ? `Offline — everything is saved on this phone${pending ? ` · ${pending} waiting to sync` : ''}`
            : `Weak signal — sending slowly, media deferred${pending ? ` · ${pending} pending` : ''}`}
        </div>
      )}
    </div>
  )
}

function TabBar() {
  const { pending } = useMobile()
  const tabs = [
    { to: '/mobile', label: 'Jobs', icon: ClipboardList, end: true },
    { to: '/mobile/timesheet', label: 'Timesheet', icon: Clock },
    { to: '/mobile/fuel', label: 'Fuel', icon: Fuel },
    { to: '/mobile/sync', label: 'Sync', icon: RefreshCw, badge: pending },
    { to: '/mobile/profile', label: 'Profile', icon: UserRound },
  ]
  const loc = useLocation()
  return (
    <nav className="flex shrink-0 border-t-2 border-slate-200 bg-white pb-[max(env(safe-area-inset-bottom),6px)]">
      {tabs.map((t) => {
        const active = t.end ? loc.pathname === '/mobile' || loc.pathname === '/mobile/' || loc.pathname.startsWith('/mobile/jobs') : loc.pathname.startsWith(t.to)
        return (
          <NavLink key={t.to} to={t.to} className={cx('relative flex min-h-[60px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold', active ? 'text-ink-900' : 'text-slate-400')}>
            {active && <span className="absolute top-0 h-1 w-10 rounded-b-full bg-brand-400" />}
            <span className="relative">
              <t.icon size={25} strokeWidth={active ? 2.5 : 2} />
              {!!t.badge && (
                <span className="absolute -top-1.5 -right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-extrabold text-white ring-2 ring-white">
                  {t.badge}
                </span>
              )}
            </span>
            {t.label}
          </NavLink>
        )
      })}
    </nav>
  )
}

function SnackBar() {
  const { snack } = useMobile()
  if (!snack) return null
  return (
    <div className="pointer-events-none absolute right-3 bottom-[84px] left-3 z-50 flex justify-center">
      <div
        key={snack.id}
        className={cx(
          'flex items-start gap-2 rounded-xl px-4 py-3 text-[14px] font-semibold shadow-xl',
          snack.tone === 'ok' && 'bg-ink-900 text-white',
          snack.tone === 'queued' && 'bg-amber-400 text-ink-900',
          snack.tone === 'warn' && 'bg-red-600 text-white',
        )}
      >
        {snack.tone === 'ok' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" /> : snack.tone === 'queued' ? <CloudOff size={18} className="mt-0.5 shrink-0" /> : <AlertTriangle size={18} className="mt-0.5 shrink-0" />}
        {snack.text}
      </div>
    </div>
  )
}

// ─── App screen (routes) ───────────────────────────────────────────────────

function Screen({ framed }: { framed: boolean }) {
  const { signedIn } = useMobile()
  const loc = useLocation()
  const scroller = useRef<HTMLDivElement>(null)
  const [overlay, setOverlay] = useState<HTMLElement | null>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [loc.pathname])

  return (
    <OverlayProvider value={overlay}>
      <div className="relative flex h-full flex-col overflow-hidden bg-slate-100 text-ink-900">
        {framed && <StatusBar />}
        <NetStrip framed={framed} />
        <div ref={scroller} className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          {!signedIn ? (
            <Login />
          ) : (
            <Routes>
              <Route index element={<Home />} />
              <Route path="jobs/:id" element={<JobDetail />} />
              <Route path="jobs/:id/pod" element={<Pod />} />
              <Route path="timesheet" element={<Timesheet />} />
              <Route path="fuel" element={<FuelEntry />} />
              <Route path="charges" element={<Charges />} />
              <Route path="incident" element={<Incident />} />
              <Route path="p2h" element={<P2H />} />
              <Route path="sync" element={<SyncQueue />} />
              <Route path="profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/mobile" replace />} />
            </Routes>
          )}
        </div>
        {signedIn && <TabBar />}
        <SnackBar />
        <div ref={setOverlay} />
        {framed && <div className="pointer-events-none absolute bottom-[5px] left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-ink-900/80" />}
      </div>
    </OverlayProvider>
  )
}

// ─── Desktop demo stage ────────────────────────────────────────────────────

function DemoPanel() {
  const { pending, queue, conn, resetDemo, signedIn } = useMobile()
  const synced = queue.filter((q) => q.state === 'Synced' || q.state === 'Conflict resolved').length
  const points = [
    { icon: CloudOff, title: 'Offline is the normal condition', body: 'The whole driver flow — acknowledgement, check-ins, POD, timesheet, fuel — runs with no signal. Toggle the network above the screen.' },
    { icon: Database, title: 'Device-first write, sync queue', body: 'Every action is written to encrypted storage on the phone first, then delivered oldest-first and retried until the server confirms.' },
    { icon: KeyRound, title: 'No-data-loss, no duplicates', body: 'Each action carries an idempotency key, so a retry after a dropped connection never creates a second transaction.' },
    { icon: GitMerge, title: 'Conflicts handled per data type', body: 'POD and check-ins are append-only; fuel is merged with fuel-card data; timesheets keep the latest driver draft until a supervisor approves.' },
  ]
  return (
    <aside className="w-full max-w-sm text-slate-300">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15">
        <ArrowLeft size={16} /> Open back office
      </Link>
      <div className="text-[11px] font-semibold tracking-wider text-brand-400 uppercase">Mobile application · §2.9.3 · Part III §3.6</div>
      <h1 className="mt-1 text-2xl font-semibold text-white">Petrolog Field — driver app</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        Signed in as <span className="font-semibold text-slate-200">Eko Prasetya (EMP-0015)</span>, dump truck driver on unit DT-01, project HL-2027-014.01. Assignments come from the
        same job orders the operations team plans in the back office.
      </p>
      <div className="mt-5 space-y-3.5">
        {points.map((p) => (
          <div key={p.title} className="flex gap-3">
            <p.icon size={18} className="mt-0.5 shrink-0 text-brand-400" />
            <div>
              <div className="text-sm font-semibold text-white">{p.title}</div>
              <div className="text-[13px] leading-snug text-slate-400">{p.body}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase">Connectivity</span>
          <span className="text-xs text-slate-400">
            {pending} pending · {synced} delivered
          </span>
        </div>
        <ConnToggle />
        <p className="mt-3 text-[12px] leading-snug text-slate-400">
          {conn === 'offline'
            ? 'Try it: complete a trip or a fuel entry now, then switch back to Online and open the Sync tab.'
            : 'Switch to Offline, keep working, then come back Online and watch the queue drain item by item.'}
        </p>
      </div>
      <p className="mt-4 flex gap-2 text-[12px] leading-snug text-slate-500">
        <ShieldCheck size={15} className="mt-0.5 shrink-0" />
        We state openly: this is eventual consistency with a no-data-loss guarantee, not instantaneous update. The back office sees field data when the phone next has signal.
      </p>
      {signedIn && (
        <button onClick={resetDemo} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white">
          <RotateCcw size={13} /> Reset demo data
        </button>
      )}
    </aside>
  )
}

function Stage() {
  const phone = useIsPhone()
  const scale = useFrameScale()
  if (phone) {
    return (
      <div className="h-[100dvh] w-full">
        <Screen framed={false} />
      </div>
    )
  }
  return (
    <div className="flex min-h-screen w-full items-center justify-center gap-14 overflow-auto bg-[radial-gradient(ellipse_at_top,#1e293b_0%,#0b1120_60%)] px-6 py-4">
      <div className="hidden lg:block">
        <DemoPanel />
      </div>
      <div style={{ width: 390 * scale + 24 * scale, height: 844 * scale + 24 * scale }} className="shrink-0">
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
          className="h-[868px] w-[414px] rounded-[62px] bg-[#1a1a1c] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.6),inset_0_0_0_2px_#3a3a3e]"
        >
          <div className="h-[844px] w-[390px] overflow-hidden rounded-[50px] bg-black">
            <Screen framed />
          </div>
        </div>
      </div>
      <div className="fixed top-4 left-4 lg:hidden">
        <Link to="/" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15">
          <ArrowLeft size={16} /> Back office
        </Link>
      </div>
    </div>
  )
}

export default function MobileApp() {
  return (
    <MobileProvider>
      <Stage />
    </MobileProvider>
  )
}
