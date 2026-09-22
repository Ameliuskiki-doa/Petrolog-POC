import { useSyncExternalStore } from 'react'
import type { Job, JobStatus } from '@/data/core'
import { allJobs } from '@/data/operations'

/**
 * Tiny in-memory store so a job verified on its detail page shows as Verified in the list and the
 * planning board (prototype only — no backend).
 */
export interface JobState extends Job {
  verifiedAt?: string
  verifiedBy?: string
  endDate?: string
}

let state: JobState[] = allJobs.map((j) => ({ ...j }))
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function useJobs(): JobState[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export function updateJob(id: string, patch: Partial<JobState>) {
  state = state.map((j) => (j.id === id ? { ...j, ...patch } : j))
  emit()
}

export function setStatus(id: string, status: JobStatus) {
  updateJob(id, { status })
}

export function addJobs(list: JobState[]) {
  state = [...list, ...state]
  emit()
}

export function nextJobId(date: string, offset = 0) {
  const [y, m] = date.split('-')
  const max = state.reduce((a, j) => Math.max(a, Number(j.id.slice(-4)) || 0), 0)
  return `JO-${y.slice(2)}-${m}-${String(max + 1 + offset).padStart(4, '0')}`
}

export const LIFECYCLE: JobStatus[] = ['Draft', 'Planned', 'Dispatched', 'In Progress', 'Completed', 'Verified', 'Billed']
