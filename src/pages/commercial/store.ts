import { useSyncExternalStore } from 'react'
import { contracts, type Contract } from '@/data/core'
import { bidBonds, opportunities, type BidBond, type Opportunity } from '@/data/commercial'

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

export const oppStore = createStore<Opportunity[]>(opportunities)
export const bondStore = createStore<BidBond[]>(bidBonds)

export interface ContractState {
  status: Contract['status']
  codeIssuedAt?: string
}

export const contractStore = createStore<Record<string, ContractState>>(Object.fromEntries(contracts.map((c) => [c.id, { status: c.status }])))

export const useOpps = () => oppStore.useStore()
export const useBonds = () => bondStore.useStore()
export const useContractState = () => contractStore.useStore()
