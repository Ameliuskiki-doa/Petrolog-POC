/**
 * Vendor Portal demo data (§2.8.1 Vendor Portal; PROC-02, PROC-10, PROC-19, PROC-20, FAT-12).
 * Vendors, project codes and the headline POs line up with core.ts (PO-2028-0187, PO-2027-0911).
 * Extra POs, GRs, RFQs and invoices are portal-side records in the same ID formats.
 */
import { vendors, getPO } from './core'

export const PORTAL_VENDORS = ['VND-00112', 'VND-00145'] as const
export type PortalVendorId = (typeof PORTAL_VENDORS)[number]

export interface VendorProfile {
  vendorId: PortalVendorId
  legalForm: string
  address: string
  contactName: string
  contactRole: string
  email: string
  phone: string
  bank: { bank: string; account: string; holder: string; branch: string }
  categories: string[]
  since: string
  paymentTermDays: number
  /** PPh 23 rate applied on payment (services); 0 for goods */
  pph23Pct: number
}

export const vendorProfiles: Record<PortalVendorId, VendorProfile> = {
  'VND-00112': {
    vendorId: 'VND-00112',
    legalForm: 'CV (limited partnership)',
    address: 'Jl. Ir. H. Juanda No. 88, Samarinda 75124, Kalimantan Timur',
    contactName: 'Hendro Gunadi',
    contactRole: 'Director',
    email: 'admin@borneotrans.co.id',
    phone: '+62 541 741 220',
    bank: { bank: 'Bank Mandiri', account: '148-00-1122334-5', holder: 'CV BORNEO TRANS MANDIRI', branch: 'KC Samarinda Pahlawan' },
    categories: ['Haulage subcontractor', 'Dump truck rental', 'Water truck rental'],
    since: '2019-04-11',
    paymentTermDays: 30,
    pph23Pct: 2,
  },
  'VND-00145': {
    vendorId: 'VND-00145',
    legalForm: 'PT (limited liability company)',
    address: 'Kawasan Industri Rungkut Blok C-12, Surabaya 60293, Jawa Timur',
    contactName: 'Linda Wijayanti',
    contactRole: 'Sales & Contract Manager',
    email: 'contracts@aquamembran.co.id',
    phone: '+62 31 870 4455',
    bank: { bank: 'Bank Central Asia (BCA)', account: '088-301-7766', holder: 'PT AQUA MEMBRAN TEKNIK', branch: 'KCU Rungkut' },
    categories: ['Water treatment equipment', 'Membranes & filtration spares', 'Commissioning services'],
    since: '2021-08-02',
    paymentTermDays: 45,
    pph23Pct: 0,
  },
}

export const portalVendor = (id: PortalVendorId) => ({ ...vendors.find((v) => v.id === id)!, ...vendorProfiles[id] })

// ─── Documents ────────────────────────────────────────────────────────────────
export interface VendorDoc {
  id: string
  vendorId: PortalVendorId
  group: 'Legal' | 'Tax' | 'Compliance' | 'Operational'
  name: string
  number: string
  issuer: string
  issued: string
  /** undefined = no expiry */
  expiry?: string
  file: string
}

export const vendorDocs: VendorDoc[] = [
  { id: 'D-112-01', vendorId: 'VND-00112', group: 'Legal', name: 'NIB (Business Identification Number)', number: '9120 0034 5567 1', issuer: 'OSS RBA', issued: '2019-03-20', file: 'NIB_BorneoTrans.pdf' },
  { id: 'D-112-02', vendorId: 'VND-00112', group: 'Legal', name: 'Deed of establishment & amendments', number: 'Akta No. 14/2019, No. 07/2025', issuer: 'Notary Rini Kusuma, S.H.', issued: '2025-02-14', file: 'Akta_BTM_2025.pdf' },
  { id: 'D-112-03', vendorId: 'VND-00112', group: 'Tax', name: 'NPWP & PKP confirmation', number: '71.234.001.1-722.000', issuer: 'KPP Pratama Samarinda Ulu', issued: '2019-04-02', file: 'NPWP_PKP_BTM.pdf' },
  { id: 'D-112-04', vendorId: 'VND-00112', group: 'Legal', name: 'Freight transport business licence', number: '551.21/0917/DISHUB-KT/2023', issuer: 'Dinas Perhubungan Kaltim', issued: '2023-09-30', expiry: '2028-09-30', file: 'Izin_Angkutan_2023.pdf' },
  { id: 'D-112-05', vendorId: 'VND-00112', group: 'Compliance', name: 'SMK3 certificate (OHS management system)', number: 'SMK3/KT/2025/0442', issuer: 'Kemnaker RI', issued: '2025-06-18', expiry: '2028-06-18', file: 'SMK3_BTM.pdf' },
  { id: 'D-112-06', vendorId: 'VND-00112', group: 'Compliance', name: 'BPJS Ketenagakerjaan clearance', number: 'BPJS-TK/SMD/2027/11873', issuer: 'BPJS Ketenagakerjaan Samarinda', issued: '2027-03-01', expiry: '2028-02-29', file: 'BPJS_TK_2027.pdf' },
  { id: 'D-112-07', vendorId: 'VND-00112', group: 'Operational', name: 'KIR — dump truck KT 9021 AE', number: 'KIR/SMD/2027/8815', issuer: 'Dishub Samarinda', issued: '2027-09-28', expiry: '2028-03-28', file: 'KIR_KT9021AE.pdf' },
  { id: 'D-112-08', vendorId: 'VND-00112', group: 'Operational', name: 'Third-party liability insurance', number: 'POL/ASK/2027/771201', issuer: 'PT Asuransi Sinar Kaltim', issued: '2027-10-01', expiry: '2028-09-30', file: 'Polis_TPL_2027.pdf' },
  { id: 'D-145-01', vendorId: 'VND-00145', group: 'Legal', name: 'NIB (Business Identification Number)', number: '8120 1177 0021 4', issuer: 'OSS RBA', issued: '2021-07-05', file: 'NIB_AMT.pdf' },
  { id: 'D-145-02', vendorId: 'VND-00145', group: 'Tax', name: 'NPWP & PKP confirmation', number: '73.555.020.4-609.000', issuer: 'KPP Madya Surabaya', issued: '2021-07-12', file: 'NPWP_PKP_AMT.pdf' },
  { id: 'D-145-03', vendorId: 'VND-00145', group: 'Legal', name: 'SBU — mechanical installation (KL.009)', number: 'SBU/1-3578-KL009/2025', issuer: 'LPJK', issued: '2025-11-01', expiry: '2028-11-01', file: 'SBU_AMT.pdf' },
  { id: 'D-145-04', vendorId: 'VND-00145', group: 'Compliance', name: 'ISO 9001:2015 certificate', number: 'QMS-ID-21-7712', issuer: 'TÜV Rheinland Indonesia', issued: '2025-04-02', expiry: '2028-04-02', file: 'ISO9001_AMT.pdf' },
  { id: 'D-145-05', vendorId: 'VND-00145', group: 'Compliance', name: 'SMK3 certificate', number: 'SMK3/JT/2026/0118', issuer: 'Kemnaker RI', issued: '2026-01-20', expiry: '2029-01-20', file: 'SMK3_AMT.pdf' },
  { id: 'D-145-06', vendorId: 'VND-00145', group: 'Operational', name: 'OEM distributor letter (membranes)', number: 'DL/APAC/2027/034', issuer: 'Membrane OEM — APAC', issued: '2027-01-15', expiry: '2029-01-14', file: 'OEM_Letter_2027.pdf' },
]

// ─── RFQs ─────────────────────────────────────────────────────────────────────
export interface RfqLine {
  no: number
  description: string
  spec: string
  qty: number
  uom: string
}

export interface Rfq {
  id: string
  title: string
  projectCode: string
  buyer: string
  issued: string
  /** ISO datetime (WIB) */
  closing: string
  invited: PortalVendorId[]
  invitedCount: number
  status: 'Open' | 'Under evaluation' | 'Awarded' | 'Not awarded'
  lines: RfqLine[]
  delivery: string
  paymentTerms: string
  awardedPo?: string
  /** Quotation already submitted by the vendor (sealed) */
  submitted?: { vendorId: PortalVendorId; at: string; version: number; hash: string; prices: number[] }
}

export const rfqs: Rfq[] = [
  {
    id: 'RFQ-2028-0042',
    title: 'Haulage subcontract — April 2028 (4–6 dump trucks)',
    projectCode: 'HL-2027-014.01',
    buyer: 'Rudi Hartono',
    issued: '2028-03-07',
    closing: '2028-03-14T16:00:00+07:00',
    invited: ['VND-00112'],
    invitedCount: 4,
    status: 'Open',
    delivery: 'Kutai Pit 3 — 1 to 30 Apr 2028, two shifts',
    paymentTerms: 'Net 30 days from Loket Invoice receipt; semi-monthly service receipt',
    lines: [
      { no: 1, description: 'Coal hauling Pit 3 ROM → Tanjung Jetty (≤ 22 km), 40 t DT with driver & fuel', spec: 'Min. 4 units, max. 6 · unit age ≤ 8 yrs · KIR valid', qty: 32_000, uom: 't' },
      { no: 2, description: 'Standby (client-caused), per unit', spec: 'Only when instructed by site leader', qty: 60, uom: 'unit-hr' },
      { no: 3, description: 'Mobilisation & demobilisation', spec: 'Samarinda → Kutai Pit 3', qty: 2, uom: 'unit' },
      { no: 4, description: 'Night-shift supervisor', spec: 'SIO holder, 12 h shift', qty: 30, uom: 'man-day' },
    ],
  },
  {
    id: 'RFQ-2028-0039',
    title: 'Lowbed & escort — Well Pad K-7 rig move (loads 12–22)',
    projectCode: 'HL-2028-002',
    buyer: 'Rudi Hartono',
    issued: '2028-03-04',
    closing: '2028-03-12T12:00:00+07:00',
    invited: ['VND-00112'],
    invitedCount: 3,
    status: 'Open',
    delivery: 'Garut — Well Pad K-5 → K-7, 18 to 29 Mar 2028',
    paymentTerms: 'Net 30 days from Loket Invoice receipt',
    lines: [
      { no: 1, description: 'Lowbed 60 t trip incl. prime mover & driver', spec: 'Route survey attached · max 14 km', qty: 11, uom: 'trip' },
      { no: 2, description: 'Pilot/escort vehicle with flagman', spec: 'Per trip, day-light moves only', qty: 11, uom: 'trip' },
    ],
    submitted: { vendorId: 'VND-00112', at: '2028-03-08T10:14:00+07:00', version: 1, hash: '7c1e…a94f', prices: [21_400_000, 1_650_000] },
  },
  {
    id: 'RFQ-2028-0031',
    title: 'Water truck rental — dust suppression Pit 3',
    projectCode: 'HL-2027-014.01',
    buyer: 'Rudi Hartono',
    issued: '2028-02-24',
    closing: '2028-03-06T16:00:00+07:00',
    invited: ['VND-00112'],
    invitedCount: 3,
    status: 'Under evaluation',
    delivery: 'Kutai Pit 3 haul road, Mar–Jun 2028',
    paymentTerms: 'Net 30 days',
    lines: [{ no: 1, description: 'Water truck 10 KL with driver', spec: '12 h/day', qty: 4, uom: 'unit-month' }],
    submitted: { vendorId: 'VND-00112', at: '2028-03-05T15:02:00+07:00', version: 2, hash: '19bd…0c2e', prices: [118_000_000] },
  },
  {
    id: 'RFQ-2028-0027',
    title: 'Haulage subcontract — March 2028 (4 dump trucks)',
    projectCode: 'HL-2027-014.01',
    buyer: 'Rudi Hartono',
    issued: '2028-02-12',
    closing: '2028-02-20T16:00:00+07:00',
    invited: ['VND-00112'],
    invitedCount: 4,
    status: 'Awarded',
    delivery: 'Kutai Pit 3 — March 2028',
    paymentTerms: 'Net 30 days',
    lines: [{ no: 1, description: 'Coal hauling Pit 3 → Tanjung Jetty, 40 t DT with driver & fuel', spec: '4 units', qty: 29_500, uom: 't' }],
    awardedPo: 'PO-2028-0187',
    submitted: { vendorId: 'VND-00112', at: '2028-02-19T11:40:00+07:00', version: 2, hash: 'e44a…71b0', prices: [40_000] },
  },
  {
    id: 'RFQ-2028-0044',
    title: 'RO membrane elements & cartridge filters — 2028 spares',
    projectCode: 'GS-2027-008',
    buyer: 'Rudi Hartono',
    issued: '2028-03-08',
    closing: '2028-03-17T15:00:00+07:00',
    invited: ['VND-00145'],
    invitedCount: 3,
    status: 'Open',
    delivery: 'DDP Bontang site — within 6 weeks of PO',
    paymentTerms: 'Net 45 days from Loket Invoice receipt',
    lines: [
      { no: 1, description: 'RO membrane element 8" × 40", brackish water, 400 ft²', spec: 'Rejection ≥ 99.5 % · compatible with installed pressure vessels', qty: 24, uom: 'pc' },
      { no: 2, description: 'Cartridge filter 5 µm, 40" PP melt-blown', spec: 'Box of 25', qty: 12, uom: 'box' },
      { no: 3, description: 'UF module O-ring & seal kit', spec: 'EPDM, per module', qty: 18, uom: 'kit' },
    ],
  },
  {
    id: 'RFQ-2028-0036',
    title: 'Chemical dosing skid — antiscalant & NaOCl',
    projectCode: 'GS-2027-008',
    buyer: 'Rudi Hartono',
    issued: '2028-03-01',
    closing: '2028-03-11T10:00:00+07:00',
    invited: ['VND-00145'],
    invitedCount: 4,
    status: 'Open',
    delivery: 'DDP Bontang site — 8 weeks',
    paymentTerms: '30 % on delivery, 60 % on commissioning, 10 % retention',
    lines: [
      { no: 1, description: 'Dosing skid, 2 × 100 % pumps per chemical, 1 m³ tanks', spec: 'SS316 frame · VFD · local panel', qty: 1, uom: 'set' },
      { no: 2, description: 'Installation & commissioning', spec: 'Incl. SAT with client', qty: 1, uom: 'lot' },
    ],
  },
  {
    id: 'RFQ-2027-0188',
    title: 'UF membrane skid + RO train (2 × 50 m³/h)',
    projectCode: 'GS-2027-008',
    buyer: 'Rudi Hartono',
    issued: '2027-10-10',
    closing: '2027-10-31T16:00:00+07:00',
    invited: ['VND-00145'],
    invitedCount: 3,
    status: 'Awarded',
    delivery: 'DDP Bontang',
    paymentTerms: 'Milestone',
    lines: [{ no: 1, description: 'UF skid + RO train, design, supply, supervision', spec: '2 × 50 m³/h', qty: 1, uom: 'lot' }],
    awardedPo: 'PO-2027-0911',
    submitted: { vendorId: 'VND-00145', at: '2027-10-30T14:22:00+07:00', version: 3, hash: '5f02…c3d8', prices: [6_420_000_000] },
  },
]

// ─── Purchase orders (portal view) ───────────────────────────────────────────
export interface Milestone {
  name: string
  pct: number
  trigger: string
  status: 'Paid' | 'Approved for payment' | 'Invoiced' | 'Ready to invoice' | 'Not yet due'
}

export interface GoodsReceipt {
  id: string
  date: string
  description: string
  qty: number
  uom: string
  amount: number
  invoiced: boolean
}

export interface PortalPO {
  id: string
  vendorId: PortalVendorId
  projectCode: string
  description: string
  date: string
  amount: number
  status: 'Awaiting acknowledgement' | 'Acknowledged' | 'Partially received' | 'Received' | 'Closed'
  buyer: string
  deliverTo: string
  rfqId?: string
  lines: { description: string; qty: number; uom: string; unitPrice: number }[]
  milestones: Milestone[]
  receipts: GoodsReceipt[]
  acknowledgedAt?: string
}

const core0187 = getPO('PO-2028-0187')!
const core0911 = getPO('PO-2027-0911')!

export const portalPOs: PortalPO[] = [
  {
    id: core0187.id,
    vendorId: 'VND-00112',
    projectCode: core0187.projectCode,
    description: core0187.description,
    date: core0187.date,
    amount: core0187.amount,
    status: 'Awaiting acknowledgement',
    buyer: 'Rudi Hartono',
    deliverTo: 'Kutai Pit 3 — site leader Yusuf Hamdani',
    rfqId: 'RFQ-2028-0027',
    lines: [{ description: 'Coal hauling Pit 3 → Tanjung Jetty, 40 t DT with driver & fuel (4 units)', qty: 29_500, uom: 't', unitPrice: 40_000 }],
    milestones: [
      { name: 'Progress claim 1 (1–15 Mar)', pct: 50, trigger: 'Service receipt signed by site leader', status: 'Not yet due' },
      { name: 'Progress claim 2 (16–31 Mar)', pct: 50, trigger: 'Service receipt signed by site leader', status: 'Not yet due' },
    ],
    receipts: [],
  },
  {
    id: 'PO-2028-0162',
    vendorId: 'VND-00112',
    projectCode: 'HL-2027-014.01',
    description: 'Weekend surge hauling & standby — February 2028',
    date: '2028-02-09',
    amount: 142_500_000,
    status: 'Received',
    buyer: 'Rudi Hartono',
    deliverTo: 'Kutai Pit 3',
    lines: [
      { description: 'Surge hauling, weekends 10–25 Feb (2 units)', qty: 2_950, uom: 't', unitPrice: 40_000 },
      { description: 'Standby (client-caused)', qty: 28, uom: 'unit-hr', unitPrice: 875_000 },
    ],
    milestones: [{ name: 'Single payment on completion', pct: 100, trigger: 'Service receipt GR-2028-0359', status: 'Ready to invoice' }],
    receipts: [{ id: 'GR-2028-0359', date: '2028-03-02', description: 'Surge hauling 2,950 t + 28 standby hrs (BAST signed)', qty: 1, uom: 'lot', amount: 142_500_000, invoiced: false }],
    acknowledgedAt: '2028-02-09T15:20:00+07:00',
  },
  {
    id: 'PO-2028-0148',
    vendorId: 'VND-00112',
    projectCode: 'HL-2027-014.02',
    description: 'Dump truck rental — Pit 4 overburden trial (Feb)',
    date: '2028-02-01',
    amount: 96_000_000,
    status: 'Received',
    buyer: 'Rudi Hartono',
    deliverTo: 'Kutai Pit 4',
    lines: [{ description: 'Dump truck 40 t with driver, 12 h/day', qty: 2, uom: 'unit-month', unitPrice: 48_000_000 }],
    milestones: [{ name: 'Monthly rental', pct: 100, trigger: 'Service receipt GR-2028-0338', status: 'Invoiced' }],
    receipts: [{ id: 'GR-2028-0338', date: '2028-03-01', description: 'Rental Feb 2028, 2 units (timesheets attached)', qty: 2, uom: 'unit-month', amount: 96_000_000, invoiced: true }],
    acknowledgedAt: '2028-02-01T16:05:00+07:00',
  },
  {
    id: 'PO-2028-0134',
    vendorId: 'VND-00112',
    projectCode: 'HL-2027-014.01',
    description: 'Haulage subcontract — February 2028 (4 DT)',
    date: '2028-01-28',
    amount: 1_120_000_000,
    status: 'Received',
    buyer: 'Rudi Hartono',
    deliverTo: 'Kutai Pit 3',
    rfqId: 'RFQ-2028-0012',
    lines: [{ description: 'Coal hauling Pit 3 → Tanjung Jetty, 40 t DT with driver & fuel', qty: 28_000, uom: 't', unitPrice: 40_000 }],
    milestones: [
      { name: 'Progress claim 1 (1–15 Feb)', pct: 50, trigger: 'Service receipt GR-2028-0311', status: 'Paid' },
      { name: 'Progress claim 2 (16–29 Feb)', pct: 50, trigger: 'Service receipt GR-2028-0346', status: 'Invoiced' },
    ],
    receipts: [
      { id: 'GR-2028-0311', date: '2028-02-16', description: 'Hauling 1–15 Feb — 14,120 t', qty: 14_120, uom: 't', amount: 564_800_000, invoiced: true },
      { id: 'GR-2028-0346', date: '2028-03-01', description: 'Hauling 16–29 Feb — 13,880 t', qty: 13_880, uom: 't', amount: 555_200_000, invoiced: true },
    ],
    acknowledgedAt: '2028-01-28T14:42:00+07:00',
  },
  {
    id: 'PO-2028-0089',
    vendorId: 'VND-00112',
    projectCode: 'HL-2027-014.01',
    description: 'Haulage subcontract — January 2028 (4 DT)',
    date: '2027-12-27',
    amount: 1_090_000_000,
    status: 'Closed',
    buyer: 'Rudi Hartono',
    deliverTo: 'Kutai Pit 3',
    lines: [{ description: 'Coal hauling Pit 3 → Tanjung Jetty', qty: 27_250, uom: 't', unitPrice: 40_000 }],
    milestones: [
      { name: 'Progress claim 1 (1–15 Jan)', pct: 50, trigger: 'Service receipt GR-2028-0104', status: 'Paid' },
      { name: 'Progress claim 2 (16–31 Jan)', pct: 50, trigger: 'Service receipt GR-2028-0198', status: 'Paid' },
    ],
    receipts: [
      { id: 'GR-2028-0104', date: '2028-01-16', description: 'Hauling 1–15 Jan', qty: 13_500, uom: 't', amount: 540_000_000, invoiced: true },
      { id: 'GR-2028-0198', date: '2028-02-01', description: 'Hauling 16–31 Jan', qty: 13_750, uom: 't', amount: 550_000_000, invoiced: true },
    ],
    acknowledgedAt: '2027-12-27T10:12:00+07:00',
  },
  {
    id: core0911.id,
    vendorId: 'VND-00145',
    projectCode: core0911.projectCode,
    description: core0911.description,
    date: core0911.date,
    amount: core0911.amount,
    status: 'Partially received',
    buyer: 'Rudi Hartono',
    deliverTo: 'Bontang — Cooling Tower Area (Nusantara Fertilizer site)',
    rfqId: 'RFQ-2027-0188',
    lines: [
      { description: 'UF membrane skid 2 × 50 m³/h incl. CIP system', qty: 1, uom: 'set', unitPrice: 2_890_000_000 },
      { description: 'RO train 2 × 50 m³/h incl. HP pumps & instrumentation', qty: 1, uom: 'set', unitPrice: 2_890_000_000 },
      { description: 'Installation supervision & commissioning', qty: 1, uom: 'lot', unitPrice: 640_000_000 },
    ],
    milestones: [
      { name: 'Advance payment (against advance bond)', pct: 20, trigger: 'PO acknowledgement + advance payment bond', status: 'Paid' },
      { name: 'Delivery — UF skid', pct: 30, trigger: 'Goods receipt GR-2028-0215 at site', status: 'Approved for payment' },
      { name: 'Delivery — RO train', pct: 30, trigger: 'Goods receipt GR-2028-0377 at site', status: 'Ready to invoice' },
      { name: 'Commissioning & SAT', pct: 10, trigger: 'Signed SAT certificate', status: 'Not yet due' },
      { name: 'Retention release', pct: 10, trigger: '12 months after SAT', status: 'Not yet due' },
    ],
    receipts: [
      { id: 'GR-2028-0215', date: '2028-02-06', description: 'UF membrane skid delivered to site (packing list PL-AMT-0907)', qty: 1, uom: 'set', amount: 1_926_000_000, invoiced: true },
      { id: 'GR-2028-0377', date: '2028-03-05', description: 'RO train delivered to site (packing list PL-AMT-0931)', qty: 1, uom: 'set', amount: 1_926_000_000, invoiced: false },
    ],
    acknowledgedAt: '2027-11-15T17:30:00+07:00',
  },
  {
    id: 'PO-2028-0169',
    vendorId: 'VND-00145',
    projectCode: 'GS-2027-008',
    description: 'Antiscalant & CIP chemicals — initial fill',
    date: '2028-02-15',
    amount: 186_000_000,
    status: 'Acknowledged',
    buyer: 'Rudi Hartono',
    deliverTo: 'Bontang site warehouse',
    lines: [
      { description: 'Antiscalant, 200 L drum', qty: 20, uom: 'drum', unitPrice: 6_300_000 },
      { description: 'CIP cleaning chemical set (acid + alkaline)', qty: 6, uom: 'set', unitPrice: 10_000_000 },
    ],
    milestones: [{ name: 'Payment on delivery', pct: 100, trigger: 'Goods receipt at site', status: 'Not yet due' }],
    receipts: [],
    acknowledgedAt: '2028-02-16T09:10:00+07:00',
  },
]

// ─── Invoices (Loket Invoice) ────────────────────────────────────────────────
export type InvoiceStatus = 'Received' | 'Document check' | 'Matching' | 'Exception' | 'Approved for payment' | 'Paid'
export const invoiceFlow: InvoiceStatus[] = ['Received', 'Document check', 'Matching', 'Approved for payment', 'Paid']

export interface ThreadMsg {
  from: 'vendor' | 'petrolog'
  name: string
  at: string
  text: string
  attachment?: string
}

export interface PortalInvoice {
  id: string
  vendorId: PortalVendorId
  vendorInvNo: string
  poId: string
  grIds: string[]
  fakturNo: string
  invoiceDate: string
  dpp: number
  ppnPct: number
  pph23Pct: number
  loketNo: string
  receivedAt: string
  status: InvoiceStatus
  scheduledPay?: string
  paidAt?: string
  bupotNo?: string
  attachments: string[]
  exception?: string
  thread?: ThreadMsg[]
  history: { at: string; label: string; by?: string }[]
}

export const portalInvoices: PortalInvoice[] = [
  {
    id: 'AP-2028-0412',
    vendorId: 'VND-00112',
    vendorInvNo: 'BTM/INV/2028/03/004',
    poId: 'PO-2028-0134',
    grIds: ['GR-2028-0346'],
    fakturNo: '010.000-28.41127704',
    invoiceDate: '2028-03-02',
    dpp: 561_200_000,
    ppnPct: 11,
    pph23Pct: 2,
    loketNo: 'LI-2028-03-0017',
    receivedAt: '2028-03-02T14:08:00+07:00',
    status: 'Exception',
    attachments: ['Invoice_BTM_2028-03-004.pdf', 'Faktur_010.000-28.41127704.pdf', 'BAST_16-29Feb.pdf', 'Weighbridge_summary_Feb2.xlsx'],
    exception: 'Quantity variance: invoice 14,030 t vs service receipt GR-2028-0346 13,880 t (+1.08 %; tolerance for subcontract haulage 0.5 %).',
    thread: [
      { from: 'petrolog', name: 'Maya Anggraini · AP Officer', at: '2028-03-04T10:21:00+07:00', text: 'Invoice quantity is 14,030 t but the signed service receipt shows 13,880 t. Please send a credit note for 150 t or evidence that the extra loads were accepted by site.' },
      { from: 'vendor', name: 'Hendro Gunadi · CV Borneo Trans Mandiri', at: '2028-03-05T08:47:00+07:00', text: 'The 150 t is the 27–28 Feb night loads (4 trips) — weighbridge tickets attached. Could site confirm?', attachment: 'Weighbridge_tickets_27-28Feb.pdf' },
      { from: 'petrolog', name: 'Maya Anggraini · AP Officer', at: '2028-03-06T13:02:00+07:00', text: 'Site leader confirms only 2 of the 4 trips (75 t) belong to PO-2028-0134; the other 2 were charged to the Pit 4 trial. Please re-issue the invoice for 13,955 t or send a credit note.' },
    ],
    history: [
      { at: '2028-03-02T14:08:00+07:00', label: 'Received at Loket Invoice — LI-2028-03-0017', by: 'Portal' },
      { at: '2028-03-03T09:30:00+07:00', label: 'Document check passed (4 of 4 documents)', by: 'Maya Anggraini' },
      { at: '2028-03-04T10:15:00+07:00', label: 'Three-way match: quantity exception', by: 'System' },
    ],
  },
  {
    id: 'AP-2028-0398',
    vendorId: 'VND-00112',
    vendorInvNo: 'BTM/INV/2028/03/001',
    poId: 'PO-2028-0148',
    grIds: ['GR-2028-0338'],
    fakturNo: '010.000-28.41127688',
    invoiceDate: '2028-03-01',
    dpp: 96_000_000,
    ppnPct: 11,
    pph23Pct: 2,
    loketNo: 'LI-2028-03-0009',
    receivedAt: '2028-03-01T16:40:00+07:00',
    status: 'Matching',
    attachments: ['Invoice_BTM_2028-03-001.pdf', 'Faktur_010.000-28.41127688.pdf', 'Timesheets_Feb_DT.pdf'],
    history: [
      { at: '2028-03-01T16:40:00+07:00', label: 'Received at Loket Invoice — LI-2028-03-0009', by: 'Portal' },
      { at: '2028-03-06T11:05:00+07:00', label: 'Document check passed (3 of 3 documents)', by: 'Maya Anggraini' },
      { at: '2028-03-06T11:06:00+07:00', label: 'Three-way match in progress (PO · GR · invoice)', by: 'System' },
    ],
  },
  {
    id: 'AP-2028-0301',
    vendorId: 'VND-00112',
    vendorInvNo: 'BTM/INV/2028/02/019',
    poId: 'PO-2028-0134',
    grIds: ['GR-2028-0311'],
    fakturNo: '010.000-28.41127512',
    invoiceDate: '2028-02-16',
    dpp: 564_800_000,
    ppnPct: 11,
    pph23Pct: 2,
    loketNo: 'LI-2028-02-0041',
    receivedAt: '2028-02-17T09:12:00+07:00',
    status: 'Paid',
    paidAt: '2028-03-08',
    bupotNo: 'BPU-2028-03-000871',
    attachments: ['Invoice_BTM_2028-02-019.pdf', 'Faktur_010.000-28.41127512.pdf', 'BAST_1-15Feb.pdf'],
    history: [
      { at: '2028-02-17T09:12:00+07:00', label: 'Received at Loket Invoice — LI-2028-02-0041', by: 'Portal' },
      { at: '2028-02-19T10:00:00+07:00', label: 'Document check passed', by: 'Maya Anggraini' },
      { at: '2028-02-19T10:01:00+07:00', label: 'Three-way match passed', by: 'System' },
      { at: '2028-02-23T15:30:00+07:00', label: 'Approved for payment', by: 'Ratna Sari Dewi' },
      { at: '2028-03-08T10:00:00+07:00', label: 'Paid — bank transfer, e-Bupot PPh 23 issued', by: 'Treasury' },
    ],
  },
  {
    id: 'AP-2028-0165',
    vendorId: 'VND-00112',
    vendorInvNo: 'BTM/INV/2028/02/004',
    poId: 'PO-2028-0089',
    grIds: ['GR-2028-0198'],
    fakturNo: '010.000-28.41127301',
    invoiceDate: '2028-02-02',
    dpp: 550_000_000,
    ppnPct: 11,
    pph23Pct: 2,
    loketNo: 'LI-2028-02-0006',
    receivedAt: '2028-02-02T11:20:00+07:00',
    status: 'Paid',
    paidAt: '2028-02-29',
    bupotNo: 'BPU-2028-02-000544',
    attachments: ['Invoice_BTM_2028-02-004.pdf', 'Faktur_010.000-28.41127301.pdf', 'BAST_16-31Jan.pdf'],
    history: [
      { at: '2028-02-02T11:20:00+07:00', label: 'Received at Loket Invoice — LI-2028-02-0006', by: 'Portal' },
      { at: '2028-02-05T09:00:00+07:00', label: 'Document check & matching passed', by: 'Maya Anggraini' },
      { at: '2028-02-12T14:00:00+07:00', label: 'Approved for payment', by: 'Ratna Sari Dewi' },
      { at: '2028-02-29T10:00:00+07:00', label: 'Paid', by: 'Treasury' },
    ],
  },
  {
    id: 'AP-2028-0212',
    vendorId: 'VND-00145',
    vendorInvNo: 'AMT/INV/2028/02/027',
    poId: 'PO-2027-0911',
    grIds: ['GR-2028-0215'],
    fakturNo: '010.000-28.52200418',
    invoiceDate: '2028-02-08',
    dpp: 1_926_000_000,
    ppnPct: 11,
    pph23Pct: 0,
    loketNo: 'LI-2028-02-0024',
    receivedAt: '2028-02-09T10:05:00+07:00',
    status: 'Approved for payment',
    scheduledPay: '2028-03-24',
    attachments: ['Invoice_AMT_2028-02-027.pdf', 'Faktur_010.000-28.52200418.pdf', 'Packing_list_PL-AMT-0907.pdf', 'GR-2028-0215.pdf'],
    history: [
      { at: '2028-02-09T10:05:00+07:00', label: 'Received at Loket Invoice — LI-2028-02-0024', by: 'Portal' },
      { at: '2028-02-12T09:40:00+07:00', label: 'Document check passed', by: 'Maya Anggraini' },
      { at: '2028-02-12T09:41:00+07:00', label: 'Milestone match passed (30 % — UF skid delivered)', by: 'System' },
      { at: '2028-03-07T16:20:00+07:00', label: 'Approved for payment — scheduled 24 Mar 2028', by: 'Ratna Sari Dewi' },
    ],
  },
  {
    id: 'AP-2027-1188',
    vendorId: 'VND-00145',
    vendorInvNo: 'AMT/INV/2027/11/112',
    poId: 'PO-2027-0911',
    grIds: [],
    fakturNo: '010.000-27.52199870',
    invoiceDate: '2027-11-20',
    dpp: 1_284_000_000,
    ppnPct: 11,
    pph23Pct: 0,
    loketNo: 'LI-2027-11-0063',
    receivedAt: '2027-11-21T13:30:00+07:00',
    status: 'Paid',
    paidAt: '2027-12-19',
    attachments: ['Invoice_AMT_2027-11-112.pdf', 'Faktur_010.000-27.52199870.pdf', 'Advance_bond_BG-8812.pdf'],
    history: [
      { at: '2027-11-21T13:30:00+07:00', label: 'Received at Loket Invoice — LI-2027-11-0063', by: 'Loket (walk-in, pre-portal)' },
      { at: '2027-11-24T10:00:00+07:00', label: 'Document check passed — advance bond verified', by: 'Maya Anggraini' },
      { at: '2027-12-05T15:00:00+07:00', label: 'Approved for payment', by: 'Ratna Sari Dewi' },
      { at: '2027-12-19T10:00:00+07:00', label: 'Paid', by: 'Treasury' },
    ],
  },
]

export const invoiceTotals = (i: Pick<PortalInvoice, 'dpp' | 'ppnPct' | 'pph23Pct'>) => {
  const ppn = Math.round((i.dpp * i.ppnPct) / 100)
  const pph = Math.round((i.dpp * i.pph23Pct) / 100)
  return { ppn, gross: i.dpp + ppn, pph, net: i.dpp + ppn - pph }
}

/** Categories offered in the self-registration wizard */
export const vendorCategories = [
  'Haulage subcontractor',
  'Equipment rental',
  'Spare parts',
  'Fuel supplier',
  'Industrial gas',
  'Catalyst handling',
  'Scaffolding services',
  'Water treatment equipment',
  'Pumps & rotating equipment',
  'Fabrication',
  'Waste transporter (B3)',
  'Permits & tolls agent',
  'Tyres',
  'Civil works',
  'IT & office supplies',
] as const

export const regions = ['Kalimantan Timur', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'Riau', 'DKI Jakarta', 'Banten'] as const

export const banks = ['Bank Mandiri', 'Bank Central Asia (BCA)', 'Bank Rakyat Indonesia (BRI)', 'Bank Negara Indonesia (BNI)', 'Bank Kaltimtara', 'CIMB Niaga'] as const

export const requiredRegistrationDocs: { key: string; name: string; expires: boolean }[] = [
  { key: 'nib', name: 'NIB (OSS)', expires: false },
  { key: 'akta', name: 'Deed of establishment & latest amendment', expires: false },
  { key: 'npwp', name: 'NPWP card / PKP confirmation', expires: false },
  { key: 'licence', name: 'Sector licence (SBU / SIUJK / transport licence)', expires: true },
  { key: 'smk3', name: 'SMK3 or ISO 45001 certificate', expires: true },
  { key: 'bank', name: 'Bank account reference letter', expires: false },
]
