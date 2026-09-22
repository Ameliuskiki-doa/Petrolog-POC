/** Aggregates and time series used by the role dashboards. Figures are consistent with core.ts. */
export interface MonthlyBL {
  month: string // 'Apr 27'
  HL: number
  PS: number
  GS: number
}

/** Revenue by business line, trailing 12 months (IDR) */
export const revenueByMonth: MonthlyBL[] = [
  { month: 'Apr 27', HL: 2.61e9, PS: 1.12e9, GS: 0.64e9 },
  { month: 'May 27', HL: 2.74e9, PS: 0.98e9, GS: 0.71e9 },
  { month: 'Jun 27', HL: 2.88e9, PS: 1.36e9, GS: 0.69e9 },
  { month: 'Jul 27', HL: 3.35e9, PS: 0.84e9, GS: 0.8e9 },
  { month: 'Aug 27', HL: 3.52e9, PS: 0.77e9, GS: 0.88e9 },
  { month: 'Sep 27', HL: 3.61e9, PS: 1.05e9, GS: 1.42e9 },
  { month: 'Oct 27', HL: 3.94e9, PS: 2.18e9, GS: 1.31e9 },
  { month: 'Nov 27', HL: 4.12e9, PS: 2.46e9, GS: 1.55e9 },
  { month: 'Dec 27', HL: 4.08e9, PS: 2.05e9, GS: 1.49e9 },
  { month: 'Jan 28', HL: 4.36e9, PS: 3.12e9, GS: 1.62e9 },
  { month: 'Feb 28', HL: 4.52e9, PS: 4.38e9, GS: 1.71e9 },
  { month: 'Mar 28', HL: 1.46e9, PS: 1.46e9, GS: 0.52e9 },
]

/** Gross margin % by business line, trailing 12 months */
export const marginByMonth: MonthlyBL[] = [
  { month: 'Apr 27', HL: 17.2, PS: 14.1, GS: 19.4 },
  { month: 'May 27', HL: 16.8, PS: 12.6, GS: 18.8 },
  { month: 'Jun 27', HL: 18.1, PS: 15.3, GS: 20.1 },
  { month: 'Jul 27', HL: 17.5, PS: 13.8, GS: 19.9 },
  { month: 'Aug 27', HL: 16.9, PS: 11.9, GS: 21.2 },
  { month: 'Sep 27', HL: 17.8, PS: 14.4, GS: 20.6 },
  { month: 'Oct 27', HL: 18.4, PS: 13.2, GS: 21.8 },
  { month: 'Nov 27', HL: 18.9, PS: 12.1, GS: 20.9 },
  { month: 'Dec 27', HL: 18.2, PS: 9.8, GS: 21.4 },
  { month: 'Jan 28', HL: 19.1, PS: 10.6, GS: 20.2 },
  { month: 'Feb 28', HL: 18.7, PS: 8.9, GS: 20.7 },
  { month: 'Mar 28', HL: 19.4, PS: 7.6, GS: 21.1 },
]

export const pipelineByStage = [
  { stage: 'Lead', value: 18.4e9, count: 6 },
  { stage: 'Qualified', value: 31.2e9, count: 5 },
  { stage: 'Review', value: 22.6e9, count: 3 },
  { stage: 'Proposal', value: 27.9e9, count: 4 },
  { stage: 'Negotiation', value: 14.1e9, count: 2 },
]

export const fleetUtilisation = [
  { category: 'Crane', operating: 71, idle: 17, maintenance: 12 },
  { category: 'Prime Mover', operating: 68, idle: 16, maintenance: 16 },
  { category: 'Dump Truck', operating: 79, idle: 14, maintenance: 7 },
  { category: 'Excavator', operating: 89, idle: 11, maintenance: 0 },
  { category: 'Support', operating: 62, idle: 38, maintenance: 0 },
]

export const arAgeing = [
  { bucket: 'Current', amount: 14.62e9 },
  { bucket: '1–30', amount: 5.18e9 },
  { bucket: '31–60', amount: 2.34e9 },
  { bucket: '61–90', amount: 0.91e9 },
  { bucket: '> 90', amount: 0.38e9 },
]

export const closeTasksMar = [
  { task: 'Fuel actualisation', owner: 'Siti Nurhaliza', status: 'Pending' },
  { task: 'Depreciation by operating hours', owner: 'Sri Mulyani Putri', status: 'Pending' },
  { task: 'GEN allocation', owner: 'Sri Mulyani Putri', status: 'Pending' },
  { task: 'Bank reconciliation', owner: 'Maya Anggraini', status: 'In Progress' },
  { task: 'Tax reconciliation', owner: 'Taufik Rahman', status: 'In Progress' },
]

export interface Approval {
  id: string
  type: 'Purchase Requisition' | 'Purchase Order' | 'Timesheet batch' | 'RAB revision' | 'Payment run' | 'Job verification' | 'Contract' | 'Master data change' | 'Late cost' | 'Work order' | 'Incident CAPA' | 'Award'
  ref: string
  title: string
  projectCode?: string
  amount?: number
  requester: string
  submitted: string
  due: string
  to: string
  /** Roles whose inbox shows this item */
  roles: string[]
  flag?: string
}

export const approvals: Approval[] = [
  { id: 'AP-1', type: 'Purchase Requisition', ref: 'PR-2028-0256', title: 'Additional RO membrane elements — exceeds remaining RAB line', projectCode: 'GS-2027-008', amount: 780_000_000, requester: 'Nanda Pratama', submitted: '2028-03-08T10:12', due: '2028-03-10T17:00', to: '/procurement/requisitions/PR-2028-0256', roles: ['finance', 'pm', 'executive'], flag: 'Budget escalation' },
  { id: 'AP-2', type: 'Purchase Order', ref: 'PO-2028-0199', title: 'PT Geo Rig Support — rig move support', projectCode: 'HL-2028-002', amount: 845_000_000, requester: 'Rudi Hartono', submitted: '2028-03-06T15:40', due: '2028-03-11T17:00', to: '/procurement/orders/PO-2028-0199', roles: ['procurement', 'executive'], flag: 'Tier 3 (> IDR 500 m)' },
  { id: 'AP-3', type: 'Timesheet batch', ref: 'TS-W10-KUT', title: 'Kutai site — week 10, 38 entries', projectCode: 'HL-2027-014.01', requester: 'Yusuf Hamdani', submitted: '2028-03-09T18:05', due: '2028-03-11T12:00', to: '/timesheets', roles: ['site', 'admin'] },
  { id: 'AP-4', type: 'Job verification', ref: 'JO-28-03-0398', title: 'Coal hauling shift A — 09 Mar, POD complete', projectCode: 'HL-2027-014.01', amount: 1_925 * 48_500, requester: 'Eko Prasetya', submitted: '2028-03-09T19:22', due: '2028-03-10T19:22', to: '/ops/jobs/JO-28-03-0398', roles: ['admin', 'site'] },
  { id: 'AP-5', type: 'Job verification', ref: 'JO-28-03-0408', title: 'Module M-14 SPMT transport & set', projectCode: 'HL-2027-021', amount: 285_000_000, requester: 'Wahyu Kurniawan', submitted: '2028-03-08T21:40', due: '2028-03-09T21:40', to: '/ops/jobs/JO-28-03-0408', roles: ['admin'], flag: 'Overdue' },
  { id: 'AP-6', type: 'RAB revision', ref: 'PS-2028-003 v4', title: 'Add nitrogen standby & scaffolding extension', projectCode: 'PS-2028-003', amount: 420_000_000, requester: 'Dewi Kartika', submitted: '2028-03-08T09:15', due: '2028-03-12T17:00', to: '/projects/PS-2028-003', roles: ['executive', 'finance', 'pm'] },
  { id: 'AP-7', type: 'Payment run', ref: 'PAY-2028-03-02', title: 'Payment run 12 Mar — 14 invoices', amount: 3_864_000_000, requester: 'Maya Anggraini', submitted: '2028-03-09T16:00', due: '2028-03-11T12:00', to: '/finance/ap/payments', roles: ['finance'] },
  { id: 'AP-8', type: 'Late cost', ref: 'LC-2028-0007', title: 'Deferred toll invoice — period Dec 2027 locked', projectCode: 'PS-2027-017', amount: 38_400_000, requester: 'Maya Anggraini', submitted: '2028-03-07T11:30', due: '2028-03-14T17:00', to: '/costing/late-costs', roles: ['finance', 'pm'] },
  { id: 'AP-9', type: 'Contract', ref: 'CTR-2028-004', title: 'Produced Water Treatment Skid — activate & issue project code', projectCode: 'GS-2028-001', amount: 16_900_000_000, requester: 'Putri Maharani', submitted: '2028-03-05T14:20', due: '2028-03-12T17:00', to: '/contracts/CTR-2028-004', roles: ['executive'] },
  { id: 'AP-10', type: 'Master data change', ref: 'MDM-CR-0142', title: 'Vendor bank account change — CV Borneo Trans Mandiri', requester: 'Rudi Hartono', submitted: '2028-03-09T08:45', due: '2028-03-13T17:00', to: '/mdm', roles: ['finance'], flag: 'Segregation of duties' },
  { id: 'AP-11', type: 'Award', ref: 'RFQ-2028-0041', title: 'Tyre supply Q2 — award to non-lowest bidder (justification attached)', projectCode: 'GEN-BPN', amount: 612_000_000, requester: 'Rudi Hartono', submitted: '2028-03-08T13:10', due: '2028-03-12T17:00', to: '/procurement/rfq', roles: ['procurement'] },
  { id: 'AP-12', type: 'Work order', ref: 'WO-2028-0151', title: 'PM-03 turbocharger replacement — breakdown', projectCode: 'GEN-BPN', amount: 146_000_000, requester: 'Joko Susilo', submitted: '2028-03-09T10:05', due: '2028-03-10T17:00', to: '/maintenance/work-orders/WO-2028-0151', roles: ['site', 'pm'] },
  { id: 'AP-13', type: 'Incident CAPA', ref: 'INC-2028-031', title: 'Near miss — haul road KM 18: close corrective actions', projectCode: 'HL-2027-014.01', requester: 'Fajar Nugroho', submitted: '2028-03-08T07:30', due: '2028-03-15T17:00', to: '/hse/incidents/INC-2028-031', roles: ['hse', 'site'] },
]

export const hseStats = {
  daysWithoutLti: 412,
  ltifr: 0.0,
  trir: 0.42,
  manHoursYtd: 118_400,
  openIncidents: 4,
  openCapa: 9,
}

