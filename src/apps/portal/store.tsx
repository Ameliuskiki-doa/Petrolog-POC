import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { TODAY } from '@/lib/format'
import { portalPOs, portalInvoices, rfqs, vendorDocs, type PortalVendorId, type PortalPO, type PortalInvoice, type Rfq, type VendorDoc, type ThreadMsg } from '@/data/portal'

interface Quote {
  at: string
  version: number
  hash: string
  prices: number[]
  leadTimeDays: number
  validityDays: number
  remarks: string
}

interface Persisted {
  vendorId: PortalVendorId
  acks: Record<string, string>
  quotes: Record<string, Quote>
  newInvoices: PortalInvoice[]
  replies: Record<string, ThreadMsg[]>
  renewals: Record<string, { expiry: string; file: string; at: string }>
  loketSeq: number
}

const KEY = 'pl-portal-v1'

const initial: Persisted = { vendorId: 'VND-00112', acks: {}, quotes: {}, newInvoices: [], replies: {}, renewals: {}, loketSeq: 23 }

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...initial, ...(JSON.parse(raw) as Partial<Persisted>) }
  } catch {
    /* storage unavailable */
  }
  return initial
}

const LOADED_AT = Date.now()
/** Demo clock: 10 Mar 2028 09:00 WIB + real time elapsed since the page loaded */
export function demoNow(): number {
  return TODAY.getTime() + (Date.now() - LOADED_AT)
}
export function demoIso(): string {
  const d = new Date(demoNow() + 7 * 3600_000)
  return d.toISOString().slice(0, 19) + '+07:00'
}

export function useDemoNow(interval = 1000) {
  const [n, setN] = useState(demoNow)
  useEffect(() => {
    const i = window.setInterval(() => setN(demoNow()), interval)
    return () => window.clearInterval(i)
  }, [interval])
  return n
}

/** WIB wall-clock formatting of an ISO string with offset */
export function wib(iso: string, withTime = true): string {
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000)
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const s = `${String(d.getUTCDate()).padStart(2, '0')} ${M[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  return withTime ? `${s}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} WIB` : s
}

export function countdown(ms: number): string {
  if (ms <= 0) return 'Closed'
  const d = Math.floor(ms / 86400_000)
  const h = Math.floor((ms % 86400_000) / 3600_000)
  const m = Math.floor((ms % 3600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return d > 0 ? `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s` : `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

interface Ctx {
  vendorId: PortalVendorId
  setVendor: (v: PortalVendorId) => void
  pos: PortalPO[]
  invoices: PortalInvoice[]
  rfqs: (Rfq & { quote?: Quote })[]
  docs: (VendorDoc & { renewal?: { expiry: string; file: string; at: string } })[]
  acknowledge: (poId: string) => void
  submitQuote: (rfqId: string, q: Omit<Quote, 'at' | 'version' | 'hash'>) => Quote
  submitInvoice: (inv: Omit<PortalInvoice, 'loketNo' | 'receivedAt' | 'status' | 'history' | 'id'>) => PortalInvoice
  reply: (invId: string, msg: ThreadMsg) => void
  renew: (docId: string, expiry: string, file: string) => void
  reset: () => void
}

const PortalCtx = createContext<Ctx | null>(null)

function hash() {
  const h = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  return `${h.slice(0, 4)}…${h.slice(4)}`
}

export function PortalProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Persisted>(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* ignore */
    }
  }, [s])

  const setVendor = useCallback((v: PortalVendorId) => setS((p) => ({ ...p, vendorId: v })), [])

  const acknowledge = useCallback((poId: string) => setS((p) => ({ ...p, acks: { ...p.acks, [poId]: demoIso() } })), [])

  const submitQuote: Ctx['submitQuote'] = useCallback(
    (rfqId, q) => {
      const base = rfqs.find((r) => r.id === rfqId)?.submitted?.version ?? 0
      const out: Quote = { ...q, at: demoIso(), version: (s.quotes[rfqId]?.version ?? base) + 1, hash: hash() }
      setS((p) => ({ ...p, quotes: { ...p.quotes, [rfqId]: out } }))
      return out
    },
    [s.quotes],
  )

  const submitInvoice: Ctx['submitInvoice'] = useCallback(
    (inv) => {
      const at = demoIso()
      const seq = s.loketSeq + 1
      const loketNo = `LI-2028-03-${String(seq).padStart(4, '0')}`
      const full: PortalInvoice = {
        ...inv,
        id: `AP-2028-${String(430 + seq).padStart(4, '0')}`,
        loketNo,
        receivedAt: at,
        status: 'Received',
        history: [{ at, label: `Received at Loket Invoice — ${loketNo}`, by: 'Portal' }],
      }
      setS((p) => ({ ...p, loketSeq: seq, newInvoices: [full, ...p.newInvoices] }))
      return full
    },
    [s.loketSeq],
  )

  const reply = useCallback((invId: string, msg: ThreadMsg) => setS((p) => ({ ...p, replies: { ...p.replies, [invId]: [...(p.replies[invId] ?? []), msg] } })), [])
  const renew = useCallback((docId: string, expiry: string, file: string) => setS((p) => ({ ...p, renewals: { ...p.renewals, [docId]: { expiry, file, at: demoIso() } } })), [])
  const reset = useCallback(() => setS({ ...initial }), [])

  const value = useMemo<Ctx>(() => {
    const v = s.vendorId
    const pos = portalPOs
      .filter((p) => p.vendorId === v)
      .map((p) => {
        const ack = s.acks[p.id]
        const invoicedGr = new Set(s.newInvoices.flatMap((i) => i.grIds))
        return {
          ...p,
          status: ack && p.status === 'Awaiting acknowledgement' ? ('Acknowledged' as const) : p.status,
          acknowledgedAt: p.acknowledgedAt ?? ack,
          receipts: p.receipts.map((r) => (invoicedGr.has(r.id) ? { ...r, invoiced: true } : r)),
          milestones: p.milestones.map((m) => (m.status === 'Ready to invoice' && p.receipts.some((r) => invoicedGr.has(r.id) && m.trigger.includes(r.id)) ? { ...m, status: 'Invoiced' as const } : m)),
        }
      })
    const invoices = [...s.newInvoices.filter((i) => i.vendorId === v), ...portalInvoices.filter((i) => i.vendorId === v)].map((i) => (s.replies[i.id] ? { ...i, thread: [...(i.thread ?? []), ...s.replies[i.id]] } : i))
    return {
      vendorId: v,
      setVendor,
      pos,
      invoices,
      rfqs: rfqs.filter((r) => r.invited.includes(v)).map((r) => ({ ...r, quote: s.quotes[r.id] })),
      docs: vendorDocs.filter((d) => d.vendorId === v).map((d) => ({ ...d, renewal: s.renewals[d.id] })),
      acknowledge,
      submitQuote,
      submitInvoice,
      reply,
      renew,
      reset,
    }
  }, [s, setVendor, acknowledge, submitQuote, submitInvoice, reply, renew, reset])

  return <PortalCtx.Provider value={value}>{children}</PortalCtx.Provider>
}

export function usePortal(): Ctx {
  const c = useContext(PortalCtx)
  if (!c) throw new Error('usePortal outside provider')
  return c
}

/** Days from the demo date to an ISO date */
export function docState(expiry?: string, renewed?: boolean): { label: 'Valid' | 'Expiring soon' | 'Expired' | 'No expiry' | 'Under review'; days?: number } {
  if (renewed) return { label: 'Under review' }
  if (!expiry) return { label: 'No expiry' }
  const days = Math.round((new Date(expiry + 'T00:00:00+07:00').getTime() - new Date('2028-03-10T00:00:00+07:00').getTime()) / 86400_000)
  if (days < 0) return { label: 'Expired', days }
  if (days <= 60) return { label: 'Expiring soon', days }
  return { label: 'Valid', days }
}

/** Payment due date from the Loket Invoice receipt date (FAT-12 SLA clock) */
export function slaDue(i: Pick<PortalInvoice, 'receivedAt'>, termDays: number) {
  const d = new Date(new Date(i.receivedAt).getTime() + termDays * 86400_000 + 7 * 3600_000)
  const iso = d.toISOString().slice(0, 10)
  const left = Math.round((new Date(iso + 'T00:00:00+07:00').getTime() - new Date('2028-03-10T00:00:00+07:00').getTime()) / 86400_000)
  return { iso, left }
}

