/**
 * Project codes issued during the demo (from a contract approved in this session).
 * They start without a budget: costs are blocked until RAB v1 is approved (FAT-07).
 */
import { createStore } from '@/lib/store'
import { TODAY_ISO } from '@/lib/format'
import { getEmployee, type Contract, type Project } from '@/data/core'

export interface RabLine {
  category: string
  amount: number
}

export interface NewProject {
  project: Project
  /** Empty until RAB v1 is prepared and submitted for approval */
  rabLines: RabLine[]
  rabStatus: 'Not prepared' | 'Pending approval' | 'Approved'
  preparedBy?: string
  preparedOn?: string
  rationale?: string
  sourceOpportunityId?: string
}

const store = createStore<NewProject[]>([])

export const useNewProjects = () => store.useStore()
export const getNewProject = (code: string) => store.get().find((p) => p.project.code === code)

/** Called when a contract is approved: the project code is issued, still without a budget. */
export function issueProjectFromContract(c: Contract, pmId: string, opportunityId?: string) {
  if (getNewProject(c.projectCode)) return
  const project: Project = {
    code: c.projectCode,
    name: c.title,
    businessLine: c.businessLine,
    customerId: c.customerId,
    contractId: c.id,
    pmId,
    site: getEmployee(pmId)?.location ?? 'Balikpapan Ops',
    status: 'Planning',
    start: c.start,
    end: c.end,
    contractValue: c.value,
    rab: 0,
    rabBaseline: 0,
    rabVersion: 0,
    committed: 0,
    actual: 0,
    revenue: 0,
    progress: 0,
  }
  store.set((s) => [{ project, rabLines: [], rabStatus: 'Not prepared', sourceOpportunityId: opportunityId }, ...s])
}

/** Submit RAB v1 for approval (Project Manager) */
export function submitRabV1(code: string, lines: RabLine[], rationale: string, preparedBy: string) {
  const total = lines.reduce((s, l) => s + l.amount, 0)
  store.set((s) =>
    s.map((n) =>
      n.project.code !== code
        ? n
        : { ...n, rabLines: lines, rabStatus: 'Pending approval', rationale, preparedBy, preparedOn: TODAY_ISO, project: { ...n.project, rab: total, rabBaseline: total, rabVersion: 1 } },
    ),
  )
}

/** Approve RAB v1 (Finance Director) — the code opens for requisitions, jobs and timesheets */
export function approveRabV1(code: string) {
  store.set((s) => s.map((n) => (n.project.code !== code ? n : { ...n, rabStatus: 'Approved', project: { ...n.project, status: 'Active' } })))
}
