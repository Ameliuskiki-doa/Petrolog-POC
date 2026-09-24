/**
 * Platform services — MDM, Document Management, BI, Identity & Access, Integration Layer, Audit Trail, Configuration.
 * (Technical proposal §2.8.1 and Part III §3.)
 */

// ═══ MDM ════════════════════════════════════════════════════════════════════

export interface MdmEntity {
  key: string
  name: string
  records: number
  identifier: string
  steward: string
  source: string
  completeness: number
  duplicatesOpen: number
  pendingChanges: number
  lastChange: string
}

export const mdmEntities: MdmEntity[] = [
  { key: 'vendor', name: 'Vendors', records: 412, identifier: 'NPWP (16-digit NIK/NPWP)', steward: 'EMP-0008', source: 'Vendor portal self-registration; migrated from SAP B1', completeness: 96.4, duplicatesOpen: 2, pendingChanges: 3, lastChange: '2028-03-10T08:12' },
  { key: 'customer', name: 'Customers', records: 38, identifier: 'NPWP', steward: 'EMP-0011', source: 'CRM (M1) on contract award', completeness: 99.1, duplicatesOpen: 1, pendingChanges: 1, lastChange: '2028-03-07T15:40' },
  { key: 'item', name: 'Items & spare parts', records: 3_184, identifier: 'OEM part number + manufacturer', steward: 'EMP-0012', source: 'Migrated from SAP B1 item master; new items via request', completeness: 91.8, duplicatesOpen: 7, pendingChanges: 4, lastChange: '2028-03-09T11:05' },
  { key: 'unit', name: 'Units (fleet & equipment)', records: 187, identifier: 'Chassis / serial number', steward: 'EMP-0012', source: 'Fixed asset register (M11)', completeness: 98.9, duplicatesOpen: 0, pendingChanges: 1, lastChange: '2028-03-06T09:30' },
  { key: 'employee', name: 'Employees', records: 624, identifier: 'NIK (KTP)', steward: 'EMP-0027', source: 'Personnel master — golden record maintained here', completeness: 100, duplicatesOpen: 0, pendingChanges: 0, lastChange: '2028-03-10T02:00' },
  { key: 'coa', name: 'Chart of accounts', records: 486, identifier: 'Account code', steward: 'EMP-0028', source: 'Designed at Stage 1B; dimensional (BL · location · project code)', completeness: 100, duplicatesOpen: 0, pendingChanges: 1, lastChange: '2028-02-27T16:20' },
  { key: 'project', name: 'Project codes', records: 164, identifier: 'Project code (BL-YYYY-NNN[.NN])', steward: 'EMP-0028', source: 'Issued from contract award (M2); GEN codes by Finance', completeness: 100, duplicatesOpen: 0, pendingChanges: 2, lastChange: '2028-03-08T10:45' },
]

export interface DuplicateCandidate {
  id: string
  entity: string
  identifier: string
  score: number
  a: { id: string; name: string; city: string; created: string; txns: number }
  b: { id: string; name: string; city: string; created: string; txns: number }
  reason: string
}

export const duplicates: DuplicateCandidate[] = [
  { id: 'DUP-0041', entity: 'Vendor', identifier: '71.234.001.1-722.000', score: 100, a: { id: 'VND-00112', name: 'CV Borneo Trans Mandiri', city: 'Samarinda', created: '2027-03-04', txns: 214 }, b: { id: 'VND-00231', name: 'CV. Borneo Trans Mandiri (Cab. Tenggarong)', city: 'Tenggarong', created: '2028-03-09', txns: 0 }, reason: 'Identical NPWP — branch registered as a new vendor via portal' },
  { id: 'DUP-0040', entity: 'Vendor', identifier: '77.888.101.4-721.000', score: 92, a: { id: 'VND-00224', name: 'PT Ban Mulia Sentosa', city: 'Balikpapan', created: '2028-02-19', txns: 0 }, b: { id: 'VND-00229', name: 'PT Ban Mulia Sentosa Abadi', city: 'Balikpapan', created: '2028-03-02', txns: 0 }, reason: 'Same NPWP, name similarity 0.92' },
  { id: 'DUP-0038', entity: 'Customer', identifier: '02.456.789.0-722.000', score: 97, a: { id: 'CUS-003', name: 'Mahakam Gas Processing (Client C)', city: 'Bekapai', created: '2027-04-01', txns: 58 }, b: { id: 'CUS-011', name: 'Mahakam Gas Proc. — Train 2 Project', city: 'Bekapai', created: '2028-02-26', txns: 0 }, reason: 'Identical NPWP — project entity requested as customer' },
  { id: 'DUP-0036', entity: 'Item', identifier: 'VOE 21707134', score: 88, a: { id: 'ITM-10021', name: 'Engine oil filter — Volvo D13', city: '—', created: '2027-01-12', txns: 96 }, b: { id: 'ITM-18804', name: 'Filter oli Volvo FMX', city: '—', created: '2028-03-01', txns: 2 }, reason: 'Same OEM part number, different description language' },
]

export interface ChangeRequest {
  id: string
  entity: string
  recordId: string
  recordName: string
  field: string
  before: string
  after: string
  requesterId: string
  requested: string
  effectiveFrom?: string
  status: 'Pending Approval' | 'Approved' | 'Rejected'
  approverRole: string
}

export const changeRequests: ChangeRequest[] = [
  { id: 'MCR-2028-0119', entity: 'Vendor', recordId: 'VND-00131', recordName: 'PT Katalis Prima Service', field: 'Bank account', before: 'BNI 0213 •••• 881', after: 'Mandiri 1370 •••• 204', requesterId: 'EMP-0009', requested: '2028-03-09T14:20', status: 'Pending Approval', approverRole: 'Finance Director (dual control on bank data)' },
  { id: 'MCR-2028-0118', entity: 'Project code', recordId: 'HL-2027-014.03', recordName: 'Kutai Pit 4 extension (new child code)', field: 'Create child code', before: '—', after: 'HL-2027-014.03 under HL-2027-014', requesterId: 'EMP-0003', requested: '2028-03-08T10:45', effectiveFrom: '2028-03-15', status: 'Pending Approval', approverRole: 'Accounting Manager' },
  { id: 'MCR-2028-0117', entity: 'Item', recordId: 'ITM-10074', recordName: 'Turbocharger assy — Volvo D13', field: 'Reorder point', before: '0', after: '1', requesterId: 'EMP-0012', requested: '2028-03-09T17:02', status: 'Pending Approval', approverRole: 'Procurement Manager' },
  { id: 'MCR-2028-0116', entity: 'Customer', recordId: 'CUS-004', recordName: 'Sumatra Petrochem (Client D)', field: 'Payment term', before: '45 days', after: '60 days', requesterId: 'EMP-0011', requested: '2028-03-07T15:40', effectiveFrom: '2028-04-01', status: 'Approved', approverRole: 'Finance Director' },
  { id: 'MCR-2028-0114', entity: 'Chart of accounts', recordId: '6-2140', recordName: 'Certification & inspection fees', field: 'Create account', before: '—', after: '6-2140 under 6-2100 Maintenance', requesterId: 'EMP-0028', requested: '2028-02-27T16:20', status: 'Approved', approverRole: 'Finance Director' },
  { id: 'MCR-2028-0112', entity: 'Project code', recordId: 'PS-2027-017', recordName: 'Unit 3 Boiler Overhaul', field: 'Status', before: 'Closed', after: 'Active (reopen for late cost)', requesterId: 'EMP-0004', requested: '2028-02-20T09:15', status: 'Rejected', approverRole: 'Finance Director — use controlled late-cost posting instead' },
]

export interface EffectiveRecord {
  id: string
  kind: 'Rate card' | 'Tax rate' | 'Depreciation parameter' | 'Fuel price' | 'Labour rate'
  subject: string
  value: string
  from: string
  to?: string
  status: 'Current' | 'Future' | 'Superseded'
  ref: string
}

export const effectiveRecords: EffectiveRecord[] = [
  { id: 'EFF-001', kind: 'Rate card', subject: 'CTR-2027-011 · Coal hauling ≤ 42 km (per tonne)', value: 'IDR 48,500', from: '2028-01-01', status: 'Current', ref: 'CTR-2027-011 v3' },
  { id: 'EFF-002', kind: 'Rate card', subject: 'CTR-2027-011 · Coal hauling ≤ 42 km (per tonne)', value: 'IDR 46,000', from: '2027-07-01', to: '2027-12-31', status: 'Superseded', ref: 'CTR-2027-011 v1' },
  { id: 'EFF-003', kind: 'Tax rate', subject: 'PPN (VAT) — standard', value: '12% (DPP nilai lain 11/12)', from: '2025-01-01', status: 'Current', ref: 'PMK 131/2024' },
  { id: 'EFF-004', kind: 'Tax rate', subject: 'PPh 23 — services', value: '2%', from: '2009-01-01', status: 'Current', ref: 'UU PPh 36/2008' },
  { id: 'EFF-005', kind: 'Tax rate', subject: 'PPh 23 — services (no NPWP)', value: '4%', from: '2009-01-01', status: 'Current', ref: 'UU PPh 36/2008' },
  { id: 'EFF-006', kind: 'Depreciation parameter', subject: 'Group II — heavy equipment (cranes, prime movers)', value: 'Straight line · 8 years · by operating hours for allocation', from: '2028-01-01', status: 'Current', ref: 'Accounting policy AP-11' },
  { id: 'EFF-007', kind: 'Depreciation parameter', subject: 'Group I — light vehicles', value: 'Straight line · 4 years', from: '2028-01-01', status: 'Current', ref: 'Accounting policy AP-11' },
  { id: 'EFF-008', kind: 'Fuel price', subject: 'HSD B40 — Kaltim industrial (per litre)', value: 'IDR 13,700', from: '2028-03-01', status: 'Current', ref: 'PO-2028-0195' },
  { id: 'EFF-009', kind: 'Fuel price', subject: 'HSD B40 — Kaltim industrial (per litre)', value: 'IDR 14,050', from: '2028-04-01', status: 'Future', ref: 'Supplier notice 05 Mar' },
  { id: 'EFF-010', kind: 'Labour rate', subject: 'Internal mechanic rate (per hour)', value: 'IDR 185,000', from: '2028-01-01', status: 'Current', ref: 'Cost study 2028' },
]

// ═══ Documents ══════════════════════════════════════════════════════════════

export interface DocRecord {
  id: string
  name: string
  type: 'Contract' | 'Purchase order' | 'Proof of delivery' | 'Vendor invoice' | 'Tax invoice' | 'Certificate' | 'Surat Konversi' | 'Report' | 'Permit'
  boundTo: { kind: string; id: string; to?: string }
  projectCode?: string
  version: number
  size: string
  uploadedBy: string
  uploaded: string
  retention: string
  tags: string[]
  versions?: { v: number; date: string; by: string; note: string }[]
}

export const documents: DocRecord[] = [
  { id: 'DOC-000981', name: 'CTR-2027-011 Coal Hauling Agreement v3 (signed).pdf', type: 'Contract', boundTo: { kind: 'Contract', id: 'CTR-2027-011', to: '/contracts/CTR-2027-011' }, projectCode: 'HL-2027-014', version: 3, size: '4.8 MB', uploadedBy: 'EMP-0011', uploaded: '2028-01-04T10:12', retention: '10 years after contract end', tags: ['signed', 'amendment 2'],
    versions: [{ v: 3, date: '2028-01-04', by: 'Putri Maharani', note: 'Amendment 2 — 2028 rate escalation' }, { v: 2, date: '2027-10-02', by: 'Putri Maharani', note: 'Amendment 1 — added crane rates' }, { v: 1, date: '2027-06-20', by: 'Putri Maharani', note: 'Original signed' }] },
  { id: 'DOC-001204', name: 'POD JO-28-03-0398 — 1,925 t (signed by client checker).jpg', type: 'Proof of delivery', boundTo: { kind: 'Job', id: 'JO-28-03-0398', to: '/ops/jobs/JO-28-03-0398' }, projectCode: 'HL-2027-014.01', version: 1, size: '1.2 MB', uploadedBy: 'EMP-0015', uploaded: '2028-03-09T18:44', retention: '10 years (tax)', tags: ['mobile', 'geotagged'] },
  { id: 'DOC-001198', name: 'PO-2028-0187 Haulage subcontract March.pdf', type: 'Purchase order', boundTo: { kind: 'PO', id: 'PO-2028-0187', to: '/procurement/orders/PO-2028-0187' }, projectCode: 'HL-2027-014.01', version: 2, size: '310 KB', uploadedBy: 'EMP-0008', uploaded: '2028-02-27T16:02', retention: '10 years (tax)', tags: ['approved'],
    versions: [{ v: 2, date: '2028-02-27', by: 'Rudi Hartono', note: 'Qty revised 5 → 4 DT' }, { v: 1, date: '2028-02-26', by: 'Rudi Hartono', note: 'Draft' }] },
  { id: 'DOC-001187', name: 'INV-SEK-2028-0214 Solar Energi Kaltim — Feb fuel.pdf', type: 'Vendor invoice', boundTo: { kind: 'PO', id: 'PO-2028-0172', to: '/procurement/orders/PO-2028-0172' }, projectCode: 'HL-2027-014.01', version: 1, size: '640 KB', uploadedBy: 'EMP-0009', uploaded: '2028-03-02T09:30', retention: '10 years (tax)', tags: ['Loket Invoice', '3-way matched'] },
  { id: 'DOC-001186', name: 'Faktur Pajak 010.000-28.00012345 (e-Faktur).pdf', type: 'Tax invoice', boundTo: { kind: 'PO', id: 'PO-2028-0172', to: '/procurement/orders/PO-2028-0172' }, projectCode: 'HL-2027-014.01', version: 1, size: '98 KB', uploadedBy: 'EMP-0009', uploaded: '2028-03-02T09:31', retention: '10 years (tax)', tags: ['Coretax validated'] },
  { id: 'DOC-001175', name: 'Surat Konversi Feb 2028 — Pit 3 hauling (12,480 t).pdf', type: 'Surat Konversi', boundTo: { kind: 'Job', id: 'JO-28-02-0288', to: '/ops/jobs/JO-28-02-0288' }, projectCode: 'HL-2027-014.01', version: 1, size: '720 KB', uploadedBy: 'EMP-0022', uploaded: '2028-03-01T11:10', retention: '10 years (tax)', tags: ['client signed'] },
  { id: 'DOC-001166', name: 'SILO-K3-2027-0188 CR-100-02.pdf', type: 'Certificate', boundTo: { kind: 'Unit', id: 'CR-100-02', to: '/fleet/units/CR-100-02' }, version: 1, size: '1.9 MB', uploadedBy: 'EMP-0012', uploaded: '2027-03-23T08:00', retention: 'Life of asset + 5 years', tags: ['SILO', 'expires 22 Mar 2028'] },
  { id: 'DOC-001121', name: 'Reactor R-201 catalyst loading report (interim).pdf', type: 'Report', boundTo: { kind: 'Project', id: 'PS-2028-003', to: '/projects/PS-2028-003' }, projectCode: 'PS-2028-003', version: 4, size: '6.3 MB', uploadedBy: 'EMP-0019', uploaded: '2028-03-09T20:05', retention: '10 years after project close', tags: ['client deliverable'],
    versions: [{ v: 4, date: '2028-03-09', by: 'Slamet Riyadi', note: 'Day 24 progress' }, { v: 3, date: '2028-03-02', by: 'Slamet Riyadi', note: 'Day 17 progress' }] },
  { id: 'DOC-001098', name: 'TPS LB3 permit Kutai SK-DLH-KK-503-2023-118.pdf', type: 'Permit', boundTo: { kind: 'Permit', id: 'PMT-005', to: '/hse/permits' }, version: 1, size: '2.2 MB', uploadedBy: 'EMP-0010', uploaded: '2023-04-14T10:00', retention: 'Validity + 5 years', tags: ['DLH', 'renewal submitted'] },
  { id: 'DOC-001071', name: 'PO-2027-0911 UF membrane skid + RO train.pdf', type: 'Purchase order', boundTo: { kind: 'PO', id: 'PO-2027-0911', to: '/procurement/orders/PO-2027-0911' }, projectCode: 'GS-2027-008', version: 1, size: '540 KB', uploadedBy: 'EMP-0008', uploaded: '2027-11-15T14:30', retention: '10 years (tax)', tags: ['partially received'] },
]

// ═══ BI & reports ═══════════════════════════════════════════════════════════

export const dashboards = [
  { id: 'DB-01', name: 'Executive overview — BL P/L & pipeline', roles: ['Executive'], refresh: 'Every 15 min', owner: 'EMP-0001', views: 412 },
  { id: 'DB-02', name: 'Project P/L — RAB vs actual vs commitment', roles: ['Project Manager', 'Finance'], refresh: 'Real time', owner: 'EMP-0003', views: 1_086 },
  { id: 'DB-03', name: 'Fleet utilisation & availability', roles: ['Executive', 'Site Leader', 'Maintenance'], refresh: 'Every 15 min', owner: 'EMP-0012', views: 688 },
  { id: 'DB-04', name: 'Fuel consumption & anomalies', roles: ['Site Leader', 'Finance'], refresh: 'Hourly', owner: 'EMP-0006', views: 530 },
  { id: 'DB-05', name: 'AP ageing & Loket Invoice SLA', roles: ['Finance'], refresh: 'Real time', owner: 'EMP-0009', views: 377 },
  { id: 'DB-06', name: 'HSE statistics & open CAPA', roles: ['HSE', 'Executive'], refresh: 'Real time', owner: 'EMP-0010', views: 241 },
  { id: 'DB-07', name: 'Procurement cycle time & vendor score', roles: ['Procurement'], refresh: 'Daily', owner: 'EMP-0008', views: 198 },
  { id: 'DB-08', name: 'Certification expiry heat map', roles: ['HSE', 'Maintenance', 'Site Leader'], refresh: 'Daily', owner: 'EMP-0010', views: 164 },
]

export const scheduledReports = [
  { id: 'SR-01', name: 'Weekly project P/L pack (all active codes)', schedule: 'Mon 07:00', format: 'PDF + XLSX', recipients: 'BOD, PMs, Finance Director', last: '2028-03-06T07:00', status: 'Delivered' },
  { id: 'SR-02', name: 'Daily fleet availability & breakdowns', schedule: 'Daily 06:00', format: 'PDF', recipients: 'Ops Director, Site Leaders', last: '2028-03-10T06:00', status: 'Delivered' },
  { id: 'SR-03', name: 'Monthly management accounts', schedule: 'WD+5 08:00', format: 'XLSX', recipients: 'BOD, Commissioners', last: '2028-03-07T08:00', status: 'Delivered' },
  { id: 'SR-04', name: 'Certification & permit expiry digest', schedule: 'Mon 06:30', format: 'E-mail', recipients: 'HSE, Maintenance, Site Leaders', last: '2028-03-06T06:30', status: 'Delivered' },
  { id: 'SR-05', name: 'Fuel anomaly exceptions', schedule: 'Daily 07:00', format: 'E-mail', recipients: 'Site Leaders, Cost Control', last: '2028-03-10T07:00', status: 'Failed' },
]

/** Sample report: project gross margin by business line & project (Feb 2028 YTD) */
export const marginReport = [
  { bl: 'HL', code: 'HL-2027-014.01', revenue: 15_380, cost: 12_940 },
  { bl: 'HL', code: 'HL-2027-014.02', revenue: 2_540, cost: 1_920 },
  { bl: 'HL', code: 'HL-2027-021', revenue: 9_120, cost: 7_010 },
  { bl: 'HL', code: 'HL-2028-002', revenue: 1_580, cost: 1_240 },
  { bl: 'PS', code: 'PS-2028-003', revenue: 8_960, cost: 8_240 },
  { bl: 'PS', code: 'PS-2027-017', revenue: 6_350, cost: 5_420 },
  { bl: 'GS', code: 'GS-2027-008', revenue: 8_980, cost: 7_120 },
]

// ═══ Identity & access ══════════════════════════════════════════════════════

export interface AppUser {
  id: string
  empId: string
  email: string
  roles: string[]
  scopeBL: string[]
  scopeLoc: string[]
  mfa: 'Enforced' | 'Enrolled' | 'Not required'
  sso: boolean
  status: 'Active' | 'Suspended' | 'Pending'
  lastLogin: string
  privileged: boolean
}

export const appUsers: AppUser[] = [
  { id: 'USR-001', empId: 'EMP-0001', email: 'hendra.wijaya@petrolog.co.id', roles: ['Executive Viewer'], scopeBL: ['All'], scopeLoc: ['All'], mfa: 'Enforced', sso: true, status: 'Active', lastLogin: '2028-03-10T07:42', privileged: true },
  { id: 'USR-002', empId: 'EMP-0002', email: 'ratna.dewi@petrolog.co.id', roles: ['Finance Director', 'Payment Approver'], scopeBL: ['All'], scopeLoc: ['All'], mfa: 'Enforced', sso: true, status: 'Active', lastLogin: '2028-03-10T08:05', privileged: true },
  { id: 'USR-003', empId: 'EMP-0003', email: 'bambang.prasetyo@petrolog.co.id', roles: ['Project Manager', 'PR Requester', 'PO Approver (≤ 500 m)'], scopeBL: ['HL'], scopeLoc: ['Balikpapan Ops', 'Kutai Kartanegara', 'Bekapai', 'Garut'], mfa: 'Enrolled', sso: true, status: 'Active', lastLogin: '2028-03-10T06:58', privileged: false },
  { id: 'USR-004', empId: 'EMP-0004', email: 'dewi.kartika@petrolog.co.id', roles: ['Project Manager', 'PR Requester'], scopeBL: ['PS'], scopeLoc: ['Cilacap', 'Cilegon'], mfa: 'Enrolled', sso: true, status: 'Active', lastLogin: '2028-03-09T21:14', privileged: false },
  { id: 'USR-007', empId: 'EMP-0007', email: 'siti.nurhaliza@petrolog.co.id', roles: ['Ops Admin (job verifier)'], scopeBL: ['HL'], scopeLoc: ['Balikpapan Ops', 'Kutai Kartanegara'], mfa: 'Not required', sso: true, status: 'Active', lastLogin: '2028-03-10T07:30', privileged: false },
  { id: 'USR-008', empId: 'EMP-0008', email: 'rudi.hartono@petrolog.co.id', roles: ['Procurement Manager', 'PO Creator'], scopeBL: ['All'], scopeLoc: ['All'], mfa: 'Enforced', sso: true, status: 'Active', lastLogin: '2028-03-10T08:20', privileged: true },
  { id: 'USR-009', empId: 'EMP-0009', email: 'maya.anggraini@petrolog.co.id', roles: ['AP Officer', 'Vendor Master Maintainer'], scopeBL: ['All'], scopeLoc: ['Jakarta HO'], mfa: 'Enforced', sso: true, status: 'Active', lastLogin: '2028-03-10T08:01', privileged: true },
  { id: 'USR-010', empId: 'EMP-0010', email: 'fajar.nugroho@petrolog.co.id', roles: ['HSE Manager'], scopeBL: ['All'], scopeLoc: ['All'], mfa: 'Enrolled', sso: true, status: 'Active', lastLogin: '2028-03-10T07:10', privileged: false },
  { id: 'USR-012', empId: 'EMP-0012', email: 'joko.susilo@petrolog.co.id', roles: ['Maintenance Superintendent', 'Stock Count Approver'], scopeBL: ['HL', 'CORP'], scopeLoc: ['Balikpapan Ops', 'Kutai Kartanegara'], mfa: 'Not required', sso: true, status: 'Active', lastLogin: '2028-03-10T06:45', privileged: false },
  { id: 'USR-022', empId: 'EMP-0022', email: 'lestari.wulandari@petrolog.co.id', roles: ['Billing Officer', 'Invoice Issuer'], scopeBL: ['All'], scopeLoc: ['Jakarta HO'], mfa: 'Enforced', sso: true, status: 'Active', lastLogin: '2028-03-10T08:15', privileged: true },
  { id: 'USR-023', empId: 'EMP-0023', email: 'taufik.rahman@petrolog.co.id', roles: ['Tax Manager'], scopeBL: ['All'], scopeLoc: ['All'], mfa: 'Enforced', sso: true, status: 'Active', lastLogin: '2028-03-09T17:40', privileged: true },
  { id: 'USR-027', empId: 'EMP-0027', email: 'kevin.tanoto@petrolog.co.id', roles: ['System Administrator'], scopeBL: ['All'], scopeLoc: ['All'], mfa: 'Enforced', sso: true, status: 'Active', lastLogin: '2028-03-10T08:30', privileged: true },
  { id: 'USR-028', empId: 'EMP-0028', email: 'sri.mulyani@petrolog.co.id', roles: ['Accounting Manager', 'Journal Approver', 'Period Close'], scopeBL: ['All'], scopeLoc: ['All'], mfa: 'Enforced', sso: true, status: 'Active', lastLogin: '2028-03-10T07:55', privileged: true },
  { id: 'USR-006', empId: 'EMP-0006', email: 'yusuf.hamdani@petrolog.co.id', roles: ['Site Leader', 'Timesheet Approver'], scopeBL: ['HL'], scopeLoc: ['Kutai Kartanegara'], mfa: 'Not required', sso: true, status: 'Active', lastLogin: '2028-03-10T05:50', privileged: false },
  { id: 'USR-016', empId: 'EMP-0016', email: 'rahmat.hidayat@petrolog.co.id', roles: ['Driver (mobile)'], scopeBL: ['HL'], scopeLoc: ['Kutai Kartanegara'], mfa: 'Not required', sso: true, status: 'Suspended', lastLogin: '2028-03-09T18:02', privileged: false },
]

export const allRoles = [
  'Executive Viewer', 'Finance Director', 'Project Manager', 'PR Requester', 'PR Approver', 'PO Creator', 'PO Approver (≤ 500 m)', 'PO Approver (> 500 m)', 'Procurement Manager',
  'Goods Receiver', 'AP Officer', 'Invoice Issuer', 'Billing Officer', 'Payment Approver', 'Payment Releaser', 'Vendor Master Maintainer', 'Journal Poster', 'Journal Approver',
  'Accounting Manager', 'Period Close', 'Tax Manager', 'Ops Admin (job verifier)', 'Site Leader', 'Timesheet Approver', 'Maintenance Superintendent', 'Stock Count Approver',
  'Store Keeper', 'HSE Manager', 'Driver (mobile)', 'System Administrator',
]

/** Segregation of Duties — pairs of roles that may not be held by the same individual (§3.9.2) */
export const sodRules: { a: string; b: string; risk: string; control: string }[] = [
  { a: 'PO Creator', b: 'PO Approver (≤ 500 m)', risk: 'Self-approved purchases', control: 'Procurement' },
  { a: 'PO Creator', b: 'PO Approver (> 500 m)', risk: 'Self-approved purchases', control: 'Procurement' },
  { a: 'PR Requester', b: 'PR Approver', risk: 'Self-approved requisitions bypassing budget owner', control: 'Procurement' },
  { a: 'Invoice Issuer', b: 'Payment Approver', risk: 'Revenue and cash controlled by one person', control: 'Finance' },
  { a: 'AP Officer', b: 'Payment Approver', risk: 'Fictitious invoice paid by the person who entered it', control: 'Finance' },
  { a: 'Vendor Master Maintainer', b: 'Payment Releaser', risk: 'Bank details changed and payment released by one person', control: 'Finance' },
  { a: 'Vendor Master Maintainer', b: 'Payment Approver', risk: 'Bank details changed and payment approved by one person', control: 'Finance' },
  { a: 'Goods Receiver', b: 'AP Officer', risk: 'Receipt confirmed by the person matching the invoice', control: 'Finance' },
  { a: 'Journal Poster', b: 'Journal Approver', risk: 'Unreviewed manual journals', control: 'Accounting' },
  { a: 'Store Keeper', b: 'Stock Count Approver', risk: 'Stock variances written off by custodian', control: 'Inventory' },
  { a: 'Ops Admin (job verifier)', b: 'Billing Officer', risk: 'Job verification and billing basis by one person', control: 'Billing' },
  { a: 'System Administrator', b: 'Journal Approver', risk: 'Privileged access to financial approvals', control: 'IT' },
]

export function sodConflict(roles: string[], candidate: string) {
  return sodRules.find((r) => (r.a === candidate && roles.includes(r.b)) || (r.b === candidate && roles.includes(r.a)))
}

// ═══ Integrations ═══════════════════════════════════════════════════════════

export interface Connector {
  id: string
  name: string
  system: string
  direction: 'Inbound' | 'Outbound' | 'Bidirectional'
  mechanism: string
  status: 'Healthy' | 'Degraded' | 'Down' | 'Standby'
  lastSync: string
  throughput24h: number
  errors24h: number
  latencyMs: number
  since: string
  notes: string
}

export const connectors: Connector[] = [
  { id: 'CON-PAY', name: 'Payroll bureau', system: 'Monthly payroll result file (Outsource Indonesia)', direction: 'Inbound', mechanism: 'Secure file drop · monthly', status: 'Healthy', lastSync: '2028-03-10T08:30', throughput24h: 4_812, errors24h: 0, latencyMs: 420, since: 'Stage 1A', notes: 'Employees, attendance, payroll results by project code' },
  { id: 'CON-GPS', name: 'GPS & dashcam telematics', system: 'Fleet telematics provider (A-02)', direction: 'Inbound', mechanism: 'Device API · streaming (1 min)', status: 'Healthy', lastSync: '2028-03-10T08:59', throughput24h: 268_440, errors24h: 14, latencyMs: 180, since: 'Stage 1A', notes: 'Position, odometer, engine hours, harsh events, video clips' },
  { id: 'CON-FUEL', name: 'Fuel stick sensors (via GPS)', system: 'Tank level sensors', direction: 'Inbound', mechanism: 'Device API · 5 min', status: 'Degraded', lastSync: '2028-03-10T08:10', throughput24h: 5_904, errors24h: 212, latencyMs: 2_400, since: 'Stage 1A', notes: '3 units offline in Pit 3 blind spot — readings backfilled on reconnect' },
  { id: 'CON-IDP', name: 'Identity provider', system: 'OIDC / SAML IdP (SSO for web, mobile & vendor portal)', direction: 'Bidirectional', mechanism: 'OIDC · SCIM provisioning', status: 'Healthy', lastSync: '2028-03-10T08:58', throughput24h: 1_906, errors24h: 3, latencyMs: 95, since: 'Stage 1A', notes: 'Account lifecycle follows employment status in the personnel master' },
  { id: 'CON-EFK', name: 'e-Faktur / Coretax', system: 'DJP tax authority', direction: 'Bidirectional', mechanism: 'Coretax API (PJAP)', status: 'Healthy', lastSync: '2028-03-10T08:40', throughput24h: 64, errors24h: 1, latencyMs: 1_350, since: 'Stage 1B (1 Jan 2028)', notes: 'Output VAT upload, NSFP, input VAT validation' },
  { id: 'CON-BPT', name: 'e-Bupot Unifikasi', system: 'DJP tax authority', direction: 'Bidirectional', mechanism: 'Coretax API (PJAP)', status: 'Healthy', lastSync: '2028-03-10T07:15', throughput24h: 38, errors24h: 0, latencyMs: 1_120, since: 'Stage 1B (1 Jan 2028)', notes: 'PPh 23 / PPh 4(2) withholding slips' },
  { id: 'CON-H2H', name: 'Bank host-to-host', system: 'Bank Mandiri & BNI', direction: 'Bidirectional', mechanism: 'H2H SFTP (ISO 20022 pain.001 / camt.053)', status: 'Down', lastSync: '2028-03-10T06:02', throughput24h: 212, errors24h: 4, latencyMs: 0, since: 'Stage 1B (1 Jan 2028)', notes: 'BNI SFTP certificate rotation pending — statements queued, Mandiri OK' },
  { id: 'CON-SAP', name: 'SAP Business One archive', system: 'Legacy ERP (read-only since cut-over)', direction: 'Inbound', mechanism: 'Read-only SQL view', status: 'Standby', lastSync: '2028-01-02T01:00', throughput24h: 0, errors24h: 0, latencyMs: 0, since: 'Archive', notes: 'Historic drill-down only; no transactions' },
]

export interface OutboxEvent {
  id: string
  topic: string
  aggregate: string
  created: string
  status: 'Delivered' | 'Pending' | 'Retrying' | 'Dead-letter'
  attempts: number
  consumer: string
  error?: string
  idempotencyKey: string
}

export const outboxEvents: OutboxEvent[] = [
  { id: 'EVT-8841203', topic: 'job.verified', aggregate: 'JO-28-03-0377', created: '2028-03-10T08:58:12', status: 'Delivered', attempts: 1, consumer: 'billing.basis-builder', idempotencyKey: 'job.verified:JO-28-03-0377:v3' },
  { id: 'EVT-8841202', topic: 'stock.issued', aggregate: 'MV-28-03-0441', created: '2028-03-10T08:57:40', status: 'Delivered', attempts: 1, consumer: 'gl.journal-generator', idempotencyKey: 'stock.issued:MV-28-03-0441' },
  { id: 'EVT-8841199', topic: 'unit.availability.changed', aggregate: 'DT-04', created: '2028-03-10T08:55:03', status: 'Delivered', attempts: 1, consumer: 'ops.planning-board', idempotencyKey: 'unit.avail:DT-04:20280310T0855' },
  { id: 'EVT-8841195', topic: 'payment.instruction.created', aggregate: 'PAY-2028-0311', created: '2028-03-10T08:50:44', status: 'Retrying', attempts: 4, consumer: 'bank.h2h-bni', error: 'SFTP auth failed: host key changed', idempotencyKey: 'pay:PAY-2028-0311' },
  { id: 'EVT-8841190', topic: 'po.approved', aggregate: 'PO-2028-0187', created: '2028-03-10T08:44:19', status: 'Delivered', attempts: 1, consumer: 'vendor-portal.notifier', idempotencyKey: 'po.approved:PO-2028-0187:v2' },
  { id: 'EVT-8841188', topic: 'fuel.reading.received', aggregate: 'TNK-KTI-01', created: '2028-03-10T08:40:02', status: 'Pending', attempts: 0, consumer: 'fuel.reconciler', idempotencyKey: 'fuel:TNK-KTI-01:20280310T0840' },
  { id: 'EVT-8840977', topic: 'invoice.issued', aggregate: 'INV-2028-0092', created: '2028-03-09T16:20:31', status: 'Dead-letter', attempts: 8, consumer: 'tax.efaktur-upload', error: 'Coretax 422: NPWP pembeli tidak valid (buyer NPWP format — 15 vs 16 digit)', idempotencyKey: 'invoice.issued:INV-2028-0092' },
  { id: 'EVT-8840612', topic: 'timesheet.approved', aggregate: 'TS-2028-W10-0412', created: '2028-03-09T11:05:12', status: 'Dead-letter', attempts: 8, consumer: 'payroll.bureau-export', error: 'Bureau file endpoint 404: employee EMP-0031 not found (joined 08 Mar, not yet synced)', idempotencyKey: 'ts.approved:TS-2028-W10-0412' },
  { id: 'EVT-8840533', topic: 'payment.instruction.created', aggregate: 'PAY-2028-0306', created: '2028-03-09T09:12:00', status: 'Dead-letter', attempts: 8, consumer: 'bank.h2h-bni', error: 'SFTP auth failed: host key changed', idempotencyKey: 'pay:PAY-2028-0306' },
]

export interface MobileDevice {
  id: string
  user: string
  empId: string
  site: string
  appVersion: string
  lastSync: string
  pending: number
  pendingMedia: number
  battery: number
  status: 'Online' | 'Offline' | 'Syncing'
}

export const mobileDevices: MobileDevice[] = [
  { id: 'DEV-A112', user: 'Eko Prasetya', empId: 'EMP-0015', site: 'Kutai Kartanegara', appVersion: '2.8.1', lastSync: '2028-03-10T08:57', pending: 0, pendingMedia: 0, battery: 71, status: 'Online' },
  { id: 'DEV-A118', user: 'Budi Santoso', empId: 'EMP-0014', site: 'Kutai Kartanegara', appVersion: '2.8.1', lastSync: '2028-03-10T07:12', pending: 6, pendingMedia: 4, battery: 44, status: 'Offline' },
  { id: 'DEV-A121', user: 'Rahmat Hidayat', empId: 'EMP-0016', site: 'Kutai Kartanegara', appVersion: '2.8.0', lastSync: '2028-03-09T18:02', pending: 0, pendingMedia: 0, battery: 0, status: 'Offline' },
  { id: 'DEV-A130', user: 'Gilang Ramadhan', empId: 'EMP-0026', site: 'Garut', appVersion: '2.8.1', lastSync: '2028-03-10T08:31', pending: 3, pendingMedia: 2, battery: 58, status: 'Syncing' },
  { id: 'DEV-A134', user: 'Andi Saputra', empId: 'EMP-0013', site: 'Kutai Kartanegara', appVersion: '2.8.1', lastSync: '2028-03-10T08:50', pending: 0, pendingMedia: 0, battery: 83, status: 'Online' },
  { id: 'DEV-A140', user: 'Wahyu Kurniawan', empId: 'EMP-0017', site: 'Bekapai', appVersion: '2.8.1', lastSync: '2028-03-10T08:46', pending: 1, pendingMedia: 0, battery: 66, status: 'Online' },
  { id: 'DEV-A145', user: 'Rizky Firmansyah', empId: 'EMP-0029', site: 'Cilacap', appVersion: '2.8.1', lastSync: '2028-03-10T08:55', pending: 0, pendingMedia: 0, battery: 90, status: 'Online' },
  { id: 'DEV-A151', user: 'Yusuf Hamdani', empId: 'EMP-0006', site: 'Kutai Kartanegara', appVersion: '2.8.1', lastSync: '2028-03-10T08:58', pending: 0, pendingMedia: 0, battery: 77, status: 'Online' },
  { id: 'DEV-A156', user: 'Arif Budiman', empId: 'EMP-0025', site: 'Cilacap', appVersion: '2.7.4', lastSync: '2028-03-10T05:20', pending: 11, pendingMedia: 9, battery: 23, status: 'Offline' },
]

// ═══ Audit trail ════════════════════════════════════════════════════════════

export interface AuditEntry {
  id: string
  time: string
  actor: string
  actorId?: string
  action: 'Create' | 'Update' | 'Approve' | 'Reject' | 'Delete (soft)' | 'Login' | 'Post' | 'Config change' | 'Role assignment'
  entity: string
  entityId: string
  field?: string
  before?: string
  after?: string
  source: 'Web' | 'Mobile' | 'API' | 'System job' | 'Vendor portal'
  ip: string
}

export const auditLog: AuditEntry[] = [
  { id: 'AUD-99120841', time: '2028-03-10T08:58:12', actor: 'Siti Nurhaliza', actorId: 'EMP-0007', action: 'Update', entity: 'Job', entityId: 'JO-28-03-0377', field: 'status', before: 'Completed', after: 'Verified', source: 'Web', ip: '10.20.4.17' },
  { id: 'AUD-99120830', time: '2028-03-10T08:57:40', actor: 'Yusuf Hamdani', actorId: 'EMP-0006', action: 'Post', entity: 'Stock movement', entityId: 'MV-28-03-0441', field: 'qty', before: '—', after: '-3,860 L HSD → HL-2027-014.01', source: 'Mobile', ip: '100.64.12.9' },
  { id: 'AUD-99120811', time: '2028-03-10T08:52:03', actor: 'Kevin Tanoto', actorId: 'EMP-0027', action: 'Role assignment', entity: 'User', entityId: 'USR-009', field: 'roles', before: 'AP Officer, Vendor Master Maintainer', after: 'REJECTED: + Payment Approver (SoD rule AP Officer × Payment Approver)', source: 'Web', ip: '10.20.1.5' },
  { id: 'AUD-99120790', time: '2028-03-10T08:44:19', actor: 'Ratna Sari Dewi', actorId: 'EMP-0002', action: 'Approve', entity: 'Purchase order', entityId: 'PO-2028-0187', field: 'status', before: 'Pending Approval', after: 'Approved', source: 'Web', ip: '10.20.1.22' },
  { id: 'AUD-99120764', time: '2028-03-10T08:30:00', actor: 'system', action: 'Update', entity: 'Employee', entityId: 'EMP-0016', field: 'app access', before: 'Active', after: 'Suspended (licence expired)', source: 'System job', ip: '—' },
  { id: 'AUD-99120702', time: '2028-03-10T08:12:44', actor: 'PT Borneo Trans Mandiri (portal)', action: 'Create', entity: 'Vendor', entityId: 'VND-00231', field: 'record', before: '—', after: 'Branch registration — flagged DUP-0041 (NPWP match)', source: 'Vendor portal', ip: '182.1.44.210' },
  { id: 'AUD-99120655', time: '2028-03-10T07:55:10', actor: 'Sri Mulyani Putri', actorId: 'EMP-0028', action: 'Config change', entity: 'Approval limit', entityId: 'CFG-APL-PO-02', field: 'max amount', before: 'IDR 500,000,000', after: 'IDR 750,000,000', source: 'Web', ip: '10.20.1.31' },
  { id: 'AUD-99120612', time: '2028-03-10T07:42:05', actor: 'Hendra Wijaya', actorId: 'EMP-0001', action: 'Login', entity: 'Session', entityId: 'SSO-7f3a', field: 'MFA', before: '—', after: 'OIDC + TOTP success', source: 'Web', ip: '36.72.18.4' },
  { id: 'AUD-99120588', time: '2028-03-10T07:30:22', actor: 'Maya Anggraini', actorId: 'EMP-0009', action: 'Update', entity: 'Vendor', entityId: 'VND-00131', field: 'bank account', before: 'BNI 0213 •••• 881', after: 'change request MCR-2028-0119 (pending dual approval)', source: 'Web', ip: '10.20.1.40' },
  { id: 'AUD-99120501', time: '2028-03-10T06:31:00', actor: 'system', action: 'Update', entity: 'Unit', entityId: 'DT-04', field: 'status', before: 'Operating', after: 'Maintenance (WO-2028-0147)', source: 'System job', ip: '—' },
  { id: 'AUD-99120433', time: '2028-03-09T22:30:11', actor: 'Fajar Nugroho', actorId: 'EMP-0010', action: 'Update', entity: 'Incident', entityId: 'INC-2028-031', field: 'client notified', before: '—', after: '09 Mar 2028 22:30', source: 'Mobile', ip: '100.64.9.2' },
  { id: 'AUD-99120390', time: '2028-03-09T17:02:40', actor: 'Joko Susilo', actorId: 'EMP-0012', action: 'Create', entity: 'Master change request', entityId: 'MCR-2028-0117', field: 'reorder point', before: '0', after: '1', source: 'Web', ip: '10.30.2.14' },
  { id: 'AUD-99120302', time: '2028-03-09T16:20:31', actor: 'Lestari Wulandari', actorId: 'EMP-0022', action: 'Post', entity: 'Customer invoice', entityId: 'INV-2028-0092', field: 'status', before: 'Draft', after: 'Issued (IDR 605,412,500)', source: 'Web', ip: '10.20.1.44' },
  { id: 'AUD-99120122', time: '2028-03-09T11:05:12', actor: 'Yusuf Hamdani', actorId: 'EMP-0006', action: 'Approve', entity: 'Timesheet', entityId: 'TS-2028-W10-0412', field: 'status', before: 'Submitted', after: 'Approved', source: 'Mobile', ip: '100.64.12.9' },
  { id: 'AUD-99119870', time: '2028-03-08T10:40:02', actor: 'Rudi Hartono', actorId: 'EMP-0008', action: 'Reject', entity: 'Purchase requisition', entityId: 'PR-2028-0255', field: 'status', before: 'Submitted', after: 'Rejected — exceeds remaining budget of HL-2027-014.02', source: 'Web', ip: '10.20.1.18' },
  { id: 'AUD-99119512', time: '2028-03-07T15:40:09', actor: 'Ratna Sari Dewi', actorId: 'EMP-0002', action: 'Approve', entity: 'Master change request', entityId: 'MCR-2028-0116', field: 'payment term', before: '45 days', after: '60 days (effective 01 Apr 2028)', source: 'Web', ip: '10.20.1.22' },
  { id: 'AUD-99118004', time: '2028-03-01T00:00:05', actor: 'system', action: 'Update', entity: 'Accounting period', entityId: '2028-02', field: 'status', before: 'Open', after: 'Locked', source: 'System job', ip: '—' },
]

// ═══ Configuration (ADR-08) ═════════════════════════════════════════════════

export interface ApprovalLimit {
  id: string
  txn: string
  from: number
  to: number | null
  approvers: string
  sla: number
}

export const approvalLimits: ApprovalLimit[] = [
  { id: 'CFG-APL-PR-01', txn: 'Purchase requisition', from: 0, to: 50_000_000, approvers: 'Project Manager', sla: 24 },
  { id: 'CFG-APL-PR-02', txn: 'Purchase requisition', from: 50_000_000, to: null, approvers: 'Project Manager → BL Director', sla: 48 },
  { id: 'CFG-APL-PO-01', txn: 'Purchase order', from: 0, to: 100_000_000, approvers: 'Procurement Manager', sla: 24 },
  { id: 'CFG-APL-PO-02', txn: 'Purchase order', from: 100_000_000, to: 750_000_000, approvers: 'Procurement Manager → Finance Director', sla: 48 },
  { id: 'CFG-APL-PO-03', txn: 'Purchase order', from: 750_000_000, to: null, approvers: 'Procurement Manager → Finance Director → CEO', sla: 72 },
  { id: 'CFG-APL-PAY-01', txn: 'Vendor payment', from: 0, to: 250_000_000, approvers: 'Finance Director', sla: 24 },
  { id: 'CFG-APL-PAY-02', txn: 'Vendor payment', from: 250_000_000, to: null, approvers: 'Finance Director + CEO (parallel)', sla: 48 },
  { id: 'CFG-APL-RAB-01', txn: 'RAB revision', from: 0, to: null, approvers: 'Project Manager → BL Director → Finance Director', sla: 72 },
  { id: 'CFG-APL-JV-01', txn: 'Manual journal', from: 0, to: null, approvers: 'Accounting Manager', sla: 24 },
]

export const taxRates = [
  { code: 'PPN-STD', name: 'PPN — standard (DPP nilai lain 11/12 × 12%)', rate: 12, from: '2025-01-01', to: '', ref: 'PMK 131/2024' },
  { code: 'PPN-OLD', name: 'PPN — standard', rate: 11, from: '2022-04-01', to: '2024-12-31', ref: 'UU HPP' },
  { code: 'PPH23-SVC', name: 'PPh 23 — services / rental', rate: 2, from: '2009-01-01', to: '', ref: 'UU PPh' },
  { code: 'PPH23-NONPWP', name: 'PPh 23 — without NPWP', rate: 4, from: '2009-01-01', to: '', ref: 'UU PPh' },
  { code: 'PPH42-CONS', name: 'PPh 4(2) — construction services (qualified)', rate: 2.65, from: '2022-02-21', to: '', ref: 'PP 9/2022' },
  { code: 'PPH15-SHIP', name: 'PPh 15 — domestic shipping', rate: 1.2, from: '1996-01-01', to: '', ref: 'KMK 416/1996' },
]

export const allocationDrivers = [
  { pool: 'GEN-HO', driver: 'Revenue share (month)', basis: 'Recognised revenue by project code', frequency: 'Monthly', status: 'Active' },
  { pool: 'GEN-BPN', driver: 'Unit operating hours', basis: 'Telematics engine hours by project code', frequency: 'Monthly', status: 'Active' },
  { pool: 'GEN-BPN · workshop', driver: 'Work order labour hours', basis: 'M15 labour booked by project code', frequency: 'Monthly', status: 'Active' },
  { pool: 'GEN-HO · IT', driver: 'Headcount', basis: 'Headcount from approved timesheets, by business line', frequency: 'Quarterly', status: 'Draft' },
]

export const workingHourCategories = [
  { code: 'OPR', name: 'Operating', billable: true, payroll: 'Normal', notes: 'Counts to utilisation' },
  { code: 'STB-C', name: 'Standby — client caused', billable: true, payroll: 'Normal', notes: 'Billed at standby rate' },
  { code: 'STB-I', name: 'Standby — internal', billable: false, payroll: 'Normal', notes: 'Idle cost to project' },
  { code: 'MNT', name: 'Maintenance / breakdown', billable: false, payroll: 'Normal', notes: 'Feeds M15 downtime' },
  { code: 'OT1', name: 'Overtime — weekday', billable: true, payroll: '1.5× first hour, 2× after', notes: 'Kepmenaker 102/2004' },
  { code: 'OT2', name: 'Overtime — rest day / holiday', billable: true, payroll: '2× / 3× / 4×', notes: 'Kepmenaker 102/2004' },
  { code: 'TRV', name: 'Travel / mobilisation', billable: true, payroll: 'Normal', notes: 'Per contract' },
]

export const fuelThresholds = [
  { key: 'ratio-dt', label: 'Dump truck consumption deviation (L/km vs baseline)', value: 12, unit: '%' },
  { key: 'ratio-crane', label: 'Crane consumption deviation (L/hr vs baseline)', value: 15, unit: '%' },
  { key: 'drop', label: 'Sudden tank level drop while engine off', value: 20, unit: 'L' },
  { key: 'refuel-gap', label: 'Refuel vs sensor delta', value: 5, unit: '%' },
  { key: 'idle', label: 'Excess idle per shift', value: 45, unit: 'min' },
]

export const notificationThresholds = [
  { key: 'cert-t1', label: 'Certificate / licence — first reminder', value: 90, unit: 'days before expiry' },
  { key: 'cert-t2', label: 'Certificate / licence — renewal task', value: 60, unit: 'days before expiry' },
  { key: 'cert-t3', label: 'Certificate / licence — escalation & auto WO', value: 30, unit: 'days before expiry' },
  { key: 'budget', label: 'Project budget consumption alert', value: 85, unit: '% of RAB' },
  { key: 'loket', label: 'Loket Invoice SLA breach', value: 5, unit: 'working days' },
  { key: 'pod', label: 'Job without POD after completion', value: 24, unit: 'hours' },
  { key: 'tps', label: 'B3 waste in TPS', value: 90, unit: 'days' },
]
