import { useSyncExternalStore } from 'react'

/** Tiny module-level store so prototype actions survive navigation between screens. */
export function createStore<T>(initial: T) {
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
