import { useSyncExternalStore } from 'react'
import type { POStatus, VendorStatus } from '@/data/core'
import { allPurchaseOrders, receipts, registrations, requisitions, rfqs, type PurchaseRequisition, type Receipt, type Registration, type RFQ } from '@/data/procurement'

/** Tiny module-level store so prototype actions survive navigation between screens. */
function createStore<T>(initial: T) {
  let state = initial
  const subs = new Set<() => void>()
  const subscribe = (cb: () => void) => {
    subs.add(cb)
    return () => {
      subs.delete(cb)
    }
  }
  return {
    get: () => state,
    set: (fn: (s: T) => T) => {
      state = fn(state)
      subs.forEach((s) => s())
    },
    useStore: () => useSyncExternalStore(subscribe, () => state),
  }
}

export const prStore = createStore<PurchaseRequisition[]>(requisitions)
export const rfqStore = createStore<RFQ[]>(rfqs)
export const receiptStore = createStore<Receipt[]>(receipts)
export const regStore = createStore<Registration[]>(registrations)

/** PO status & approval progress overrides (prototype actions) */
export const poStore = createStore<Record<string, { status: POStatus; approvedSteps?: number }>>(Object.fromEntries(allPurchaseOrders.map((p) => [p.id, { status: p.status }])))
export const vendorStatusStore = createStore<Record<string, VendorStatus>>({})

export const usePRs = () => prStore.useStore()
export const useRFQs = () => rfqStore.useStore()
export const useReceipts = () => receiptStore.useStore()
export const useRegs = () => regStore.useStore()
export const usePOState = () => poStore.useStore()
export const useVendorStatus = () => vendorStatusStore.useStore()
