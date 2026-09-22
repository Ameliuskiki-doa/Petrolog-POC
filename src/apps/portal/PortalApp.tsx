import { useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate, NavLink, Link, useLocation } from 'react-router-dom'
import { Store, ChevronDown, Check, LogOut, UserPlus, ArrowLeft, RotateCcw, Home as HomeIcon, FileSearch, FileCheck2, Receipt, FolderOpen, LifeBuoy } from 'lucide-react'
import { cx, Avatar } from '@/components/ui'
import { PORTAL_VENDORS } from '@/data/portal'
import { PortalProvider, usePortal } from './store'
import { vendorName } from './bits'
import Home from './screens/Home'
import Rfqs from './screens/Rfqs'
import RfqDetail from './screens/RfqDetail'
import Orders from './screens/Orders'
import OrderDetail from './screens/OrderDetail'
import Invoices from './screens/Invoices'
import InvoiceNew from './screens/InvoiceNew'
import InvoiceDetail from './screens/InvoiceDetail'
import Documents from './screens/Documents'
import Register from './screens/Register'

function Brand() {
  return (
    <Link to="/portal" className="flex shrink-0 items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-400 text-ink-900">
        <Store size={20} strokeWidth={2.3} />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-bold text-white">Petrolog Vendor Portal</span>
        <span className="block text-[11px] text-slate-400">PT Petrolog Indah · Procurement & Loket Invoice</span>
      </span>
    </Link>
  )
}

function VendorSwitch() {
  const { vendorId, setVendor, reset } = usePortal()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const on = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    window.addEventListener('mousedown', on)
    return () => window.removeEventListener('mousedown', on)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/10">
        <Avatar name={vendorName(vendorId)} size={30} />
        <span className="hidden leading-tight sm:block">
          <span className="block max-w-[200px] truncate text-[13px] font-semibold text-white">{vendorName(vendorId)}</span>
          <span className="block font-mono text-[11px] text-slate-400">{vendorId}</span>
        </span>
        <ChevronDown size={15} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Switch vendor (demo)</div>
          {PORTAL_VENDORS.map((v) => (
            <button
              key={v}
              onClick={() => {
                setVendor(v)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50"
            >
              <Avatar name={vendorName(v)} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">{vendorName(v)}</span>
                <span className="block font-mono text-[11px] text-slate-500">{v}</span>
              </span>
              {v === vendorId && <Check size={16} className="text-emerald-600" />}
            </button>
          ))}
          <div className="border-t border-slate-100">
            <button
              onClick={() => {
                reset()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw size={15} /> Reset demo data
            </button>
            <Link to="/" className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
              <LogOut size={15} /> Sign out · back to Petrolog back office
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function TopNav() {
  const { rfqs, pos, invoices, docs } = usePortal()
  const openRfq = rfqs.filter((r) => r.status === 'Open').length
  const toAck = pos.filter((p) => p.status === 'Awaiting acknowledgement').length
  const exceptions = invoices.filter((i) => i.status === 'Exception').length
  const docIssues = docs.filter((d) => !d.renewal && d.expiry && d.expiry < '2028-05-10').length
  const items = [
    { to: '/portal', label: 'Home', icon: HomeIcon, end: true },
    { to: '/portal/rfq', label: 'RFQs', icon: FileSearch, badge: openRfq },
    { to: '/portal/orders', label: 'Purchase orders', icon: FileCheck2, badge: toAck },
    { to: '/portal/invoices', label: 'Invoices', icon: Receipt, badge: exceptions, warn: true },
    { to: '/portal/documents', label: 'Documents', icon: FolderOpen, badge: docIssues, warn: true },
  ]
  return (
    <header className="sticky top-0 z-30 bg-ink-900 shadow">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />
        <div className="flex items-center gap-1">
          <Link to="/" className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-white/10 hover:text-white md:flex">
            <ArrowLeft size={14} /> Back office
          </Link>
          <VendorSwitch />
        </div>
      </div>
      <nav className="scrollbar-thin border-t border-white/10 bg-ink-800">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 sm:px-5">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) =>
                cx('flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap', isActive ? 'border-brand-400 text-white' : 'border-transparent text-slate-400 hover:text-white')
              }
            >
              <i.icon size={16} />
              {i.label}
              {!!i.badge && <span className={cx('rounded-full px-1.5 text-[11px] font-semibold', i.warn ? 'bg-red-500 text-white' : 'bg-brand-400 text-ink-900')}>{i.badge}</span>}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-slate-500 sm:px-6">
        <span>© 2028 PT Petrolog Indah · Vendor Portal · every submission is time-stamped and receipted — no more quotations or invoices by email.</span>
        <span className="flex items-center gap-1.5">
          <LifeBuoy size={14} /> vendor.support@petrolog.co.id · +62 21 5790 2200
        </span>
      </div>
    </footer>
  )
}

function Shell() {
  const loc = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [loc.pathname])
  if (loc.pathname.startsWith('/portal/register')) {
    return (
      <div className="min-h-screen bg-slate-100">
        <header className="bg-ink-900">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Brand />
            <Link to="/portal" className="text-sm text-slate-300 hover:text-white">
              Already registered? Sign in
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <Register />
        </main>
        <Footer />
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-slate-100">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Routes>
          <Route index element={<Home />} />
          <Route path="rfq" element={<Rfqs />} />
          <Route path="rfq/:id" element={<RfqDetail />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/new" element={<InvoiceNew />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="documents" element={<Documents />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </main>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Link to="/portal/register" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800">
          <UserPlus size={14} /> Not yet a Petrolog vendor? Register your company
        </Link>
      </div>
      <Footer />
    </div>
  )
}

export default function PortalApp() {
  return (
    <PortalProvider>
      <Shell />
    </PortalProvider>
  )
}
