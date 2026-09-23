import { useSyncExternalStore } from 'react'
import { contracts, type Contract } from '@/data/core'
import { contractExtras, type ContractExtra } from '@/data/commercial'
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

/** Contracts registered in this session (BDS-01) — kept beside the seeded ones. */
export const draftContractStore = createStore<{ contract: Contract; extra: ContractExtra }[]>([])

export const useDraftContracts = () => draftContractStore.useStore()

/** Seeded contracts plus anything registered during the demo */
export function useAllContracts(): Contract[] {
  const drafts = useDraftContracts()
  return [...drafts.map((d) => d.contract), ...contracts]
}

/** Register a contract from a won opportunity: it starts Pending Approval with its project code reserved. */
export function registerContract(contract: Contract, extra: ContractExtra, opportunityId?: string) {
  draftContractStore.set((s) => [{ contract, extra }, ...s])
  contractStore.set((s) => ({ ...s, [contract.id]: { status: contract.status } }))
  oppStore.set((s) => s.map((o) => (o.contractId || !opportunityId || o.id !== opportunityId ? o : { ...o, contractId: contract.id, projectCode: contract.projectCode })))
}

/** Next free contract id, e.g. CTR-2028-007 */
export function nextContractId(all: Contract[]): string {
  const year = 2028
  const n = Math.max(0, ...all.filter((c) => c.id.startsWith(`CTR-${year}-`)).map((c) => Number(c.id.slice(-3)))) + 1
  return `CTR-${year}-${String(n).padStart(3, '0')}`
}

/** Next project code for a business line, e.g. HL-2028-004 */
export function nextProjectCode(bl: string, existing: string[]): string {
  const year = 2028
  const n = Math.max(0, ...existing.filter((c) => c.startsWith(`${bl}-${year}-`)).map((c) => Number(c.split('-')[2]))) + 1
  return `${bl}-${year}-${String(n).padStart(3, '0')}`
}

/** Seeded contract detail plus the detail of contracts registered in this session */
export function useContractExtras(): Record<string, ContractExtra> {
  const drafts = useDraftContracts()
  return { ...contractExtras, ...Object.fromEntries(drafts.map((d) => [d.contract.id, d.extra])) }
}
