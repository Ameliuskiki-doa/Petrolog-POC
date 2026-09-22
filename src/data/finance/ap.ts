/**
 * M9 Accounts Payable & Loket Invoice — invoice intake (FAT-12/13), three-way match (PROC-18/19),
 * payment runs with automatic PPh 23 withholding (PROC-21) and e-Bupot issuance (FAT-36).
 */
import { getPO } from '@/data/core'

export type LoketStatus = 'Received' | 'Document check' | 'Matching' | 'Exception' | 'Approved for payment' | 'Paid'
export const loketStatuses: LoketStatus[] = ['Received', 'Document check', 'Matching', 'Exception', 'Approved for payment', 'Paid']
export type Channel = 'Vendor portal' | 'Counter' | 'Email'

export const docChecklist = [
  { key: 'invoice', label: 'Original invoice (signed & stamped)' },
  { key: 'faktur', label: 'Faktur Pajak (e-Faktur / Coretax)' },
  { key: 'po', label: 'PO reference / copy' },
  { key: 'receipt', label: 'GRN or BAST (service acceptance)' },
  { key: 'support', label: 'Delivery notes / timesheets / POD' },
  { key: 'bank', label: 'Bank account letter (matches vendor master)' },
] as const
export type DocKey = (typeof docChecklist)[number]['key']

export interface LoketInvoice {
  receiptNo: string
  receivedAt: string
  channel: Channel
  vendorId: string
  vendorInvoiceNo: string
  fakturNo?: string
  poId?: string
  /** PO number for historical POs not held in the core register */
  poRef?: string
  projectCode: string
  description: string
  dpp: number
  ppn: number
  termDays: number
  status: LoketStatus
  docs: Partial<Record<DocKey, boolean>>
  /** Items not applicable for this invoice (e.g. Faktur for non-PKP vendor) */
  na?: DocKey[]
  handler: string
  journalId?: string
  paymentRun?: string
  exception?: string
  note?: string
}

const all = { invoice: true, faktur: true, po: true, receipt: true, support: true, bank: true }

export const loketInvoices: LoketInvoice[] = [
  { receiptNo: 'LKT-2028-03-0151', receivedAt: '2028-03-10T08:42', channel: 'Vendor portal', vendorId: 'VND-00118', vendorInvoiceNo: 'SEK/INV/2028/0263', fakturNo: '010.041-28.00013402', poId: 'PO-2028-0195', projectCode: 'HL-2027-014.01', description: 'HSD fuel — March 1st delivery (50 KL)', dpp: 685_000_000, ppn: 75_350_000, termDays: 30, status: 'Received', docs: { invoice: true, faktur: true, po: true }, handler: 'EMP-0009' },
  { receiptNo: 'LKT-2028-03-0150', receivedAt: '2028-03-09T15:10', channel: 'Email', vendorId: 'VND-00219', vendorInvoiceNo: 'LAL/0328/051', fakturNo: '010.077-28.00000981', projectCode: 'GEN-BPN', description: 'B3 waste transport — Balikpapan workshop, 2 manifests', dpp: 36_800_000, ppn: 4_048_000, termDays: 30, status: 'Document check', docs: { invoice: true, faktur: true, support: true, bank: true }, na: ['po', 'receipt'], handler: 'EMP-0009', note: 'Service agreement SA-2027-019 (non-PO) — manifest numbers to be verified by HSE' },
  { receiptNo: 'LKT-2028-03-0149', receivedAt: '2028-03-09T10:05', channel: 'Counter', vendorId: 'VND-00145', vendorInvoiceNo: 'AMT/INV/03/2028/008', fakturNo: '010.063-28.00004411', poId: 'PO-2027-0911', projectCode: 'GS-2027-008', description: 'UF membrane skid — milestone 2 (delivery to site, 50%)', dpp: 3_210_000_000, ppn: 353_100_000, termDays: 45, status: 'Document check', docs: { invoice: true, faktur: true, po: true, bank: true }, handler: 'EMP-0009', note: 'BAST for skid delivery not yet signed by site — follow up with Agus Salim' },
  { receiptNo: 'LKT-2028-03-0148', receivedAt: '2028-03-08T13:30', channel: 'Vendor portal', vendorId: 'VND-00152', vendorInvoiceNo: 'HPN-2028-0077', poId: 'PO-2028-0158', projectCode: 'GS-2027-008', description: 'High-pressure pumps & VFD panels — advance payment 30%', dpp: 379_500_000, ppn: 41_745_000, termDays: 14, status: 'Document check', docs: { invoice: true, po: true, bank: true, support: true }, na: ['receipt'], handler: 'EMP-0009', note: 'Faktur Pajak missing — requested through portal 08 Mar' },
  { receiptNo: 'LKT-2028-03-0147', receivedAt: '2028-03-07T09:12', channel: 'Vendor portal', vendorId: 'VND-00210', vendorInvoiceNo: 'GRS/2028/III/004', fakturNo: '010.019-28.00000734', poId: 'PO-2028-0199', projectCode: 'HL-2028-002', description: 'Rig move support crew & tail cranes — loads 1–6', dpp: 230_400_000, ppn: 25_344_000, termDays: 30, status: 'Exception', docs: all, handler: 'EMP-0009', exception: 'PO not yet approved — invoice precedes commitment' },
  { receiptNo: 'LKT-2028-03-0146', receivedAt: '2028-03-06T14:48', channel: 'Vendor portal', vendorId: 'VND-00131', vendorInvoiceNo: 'KPS/INV/2028/019', fakturNo: '010.022-28.00001968', poId: 'PO-2028-0164', projectCode: 'PS-2028-003', description: 'Catalyst handling crew — progress 1 of 2', dpp: 1_175_000_000, ppn: 129_250_000, termDays: 30, status: 'Matching', docs: all, handler: 'EMP-0009' },
  { receiptNo: 'LKT-2028-03-0145', receivedAt: '2028-03-05T11:20', channel: 'Email', vendorId: 'VND-00194', vendorInvoiceNo: 'MSI-0305-2028', fakturNo: '010.027-28.00000512', poId: 'PO-2028-0190', projectCode: 'PS-2028-003', description: 'Scaffolding erection & dismantle — reactor deck', dpp: 346_320_000, ppn: 38_095_200, termDays: 30, status: 'Exception', docs: all, handler: 'EMP-0009', exception: 'Invoice 11.0% above PO/GR (rental 21 days vs 10 accepted) — tolerance 0% for Subcontract' },
  { receiptNo: 'LKT-2028-03-0144', receivedAt: '2028-03-04T10:02', channel: 'Vendor portal', vendorId: 'VND-00177', vendorInvoiceNo: 'UTP/28/0304/1187', fakturNo: '010.001-28.00092231', poId: 'PO-2028-0176', projectCode: 'GEN-BPN', description: 'Spare parts — PM 1000 hr kits (fleet)', dpp: 214_000_000, ppn: 23_540_000, termDays: 30, status: 'Approved for payment', docs: all, handler: 'EMP-0009', paymentRun: 'PAY-2028-03-02' },
  { receiptNo: 'LKT-2028-03-0141', receivedAt: '2028-03-03T09:30', channel: 'Counter', vendorId: 'VND-00203', vendorInvoiceNo: 'TPK/0303/2028', projectCode: 'PS-2027-017', description: 'Toll & escort Dec 2027 — late cost (controlled reopening)', dpp: 14_650_000, ppn: 0, termDays: 30, status: 'Approved for payment', docs: { invoice: true, receipt: true, support: true, bank: true }, na: ['faktur', 'po'], handler: 'EMP-0009', journalId: 'JV-2028-03-0012', paymentRun: 'PAY-2028-03-02', note: 'Non-PKP vendor · non-PO toll disbursement' },
  { receiptNo: 'LKT-2028-03-0140', receivedAt: '2028-03-02T16:05', channel: 'Counter', vendorId: 'VND-00203', vendorInvoiceNo: 'TPK/0302/2028', poId: 'PO-2028-0183', projectCode: 'HL-2027-014.02', description: 'Heavy haul road permits & escort — Q1', dpp: 96_500_000, ppn: 0, termDays: 30, status: 'Approved for payment', docs: { invoice: true, po: true, receipt: true, support: true, bank: true }, na: ['faktur'], handler: 'EMP-0009', journalId: 'JV-2028-03-0008', paymentRun: 'PAY-2028-03-02', note: 'Non-PKP vendor — no PPN' },
  { receiptNo: 'LKT-2028-03-0139', receivedAt: '2028-03-02T08:55', channel: 'Vendor portal', vendorId: 'VND-00188', vendorInvoiceNo: 'GIN/28/0317', fakturNo: '010.052-28.00003318', poId: 'PO-2028-0181', projectCode: 'PS-2028-003', description: 'Liquid nitrogen — 18 tanker loads', dpp: 486_000_000, ppn: 53_460_000, termDays: 45, status: 'Approved for payment', docs: all, handler: 'EMP-0009', journalId: 'JV-2028-03-0011' },
  { receiptNo: 'LKT-2028-03-0138', receivedAt: '2028-03-01T10:14', channel: 'Vendor portal', vendorId: 'VND-00118', vendorInvoiceNo: 'SEK/INV/2028/0211', fakturNo: '010.041-28.00012873', poId: 'PO-2028-0172', projectCode: 'HL-2027-014.01', description: 'HSD fuel supply — February 2028 (120 KL)', dpp: 1_644_000_000, ppn: 180_840_000, termDays: 30, status: 'Approved for payment', docs: all, handler: 'EMP-0009', journalId: 'JV-2028-03-0002', paymentRun: 'PAY-2028-03-02' },
  { receiptNo: 'LKT-2028-02-0129', receivedAt: '2028-02-27T14:20', channel: 'Email', vendorId: 'VND-00171', vendorInvoiceNo: 'TDM/II/28/112', projectCode: 'HL-2027-014.01', poRef: 'PO-2028-0142', description: 'Wheel hub bearings — DT fleet (non-stock)', dpp: 42_800_000, ppn: 0, termDays: 30, status: 'Exception', docs: { invoice: true, po: true, support: true, bank: true }, na: ['faktur'], handler: 'EMP-0009', exception: 'Goods receipt quantity 18 vs invoiced 24 — partial delivery' },
  { receiptNo: 'LKT-2028-02-0126', receivedAt: '2028-02-20T09:40', channel: 'Email', vendorId: 'VND-00219', vendorInvoiceNo: 'LAL/0228/044', fakturNo: '010.077-28.00000902', projectCode: 'GEN-BPN', description: 'B3 waste transport — Feb manifests', dpp: 38_500_000, ppn: 4_235_000, termDays: 14, status: 'Paid', docs: all, na: ['po'], handler: 'EMP-0009', paymentRun: 'PAY-2028-03-01' },
  { receiptNo: 'LKT-2028-02-0121', receivedAt: '2028-02-05T10:30', channel: 'Vendor portal', vendorId: 'VND-00112', vendorInvoiceNo: 'BTM/INV/II/2028/017', fakturNo: '010.012-28.00000418', poRef: 'PO-2028-0126', projectCode: 'HL-2027-014.01', description: 'Haulage subcontract — January 2028 (4 DT)', dpp: 1_120_000_000, ppn: 123_200_000, termDays: 30, status: 'Paid', docs: all, handler: 'EMP-0009', paymentRun: 'PAY-2028-03-01' },
  { receiptNo: 'LKT-2028-02-0108', receivedAt: '2028-02-01T13:15', channel: 'Counter', vendorId: 'VND-00160', vendorInvoiceNo: 'SCS/2028/01/009', fakturNo: '010.031-28.00000155', poRef: 'PO-2027-0874', projectCode: 'HL-2027-021', description: 'Crane 80T rental — Dec 2027 (vendor suspended since Feb)', dpp: 186_000_000, ppn: 20_460_000, termDays: 30, status: 'Exception', docs: { invoice: true, faktur: true, po: true, receipt: true, support: true }, handler: 'EMP-0009', exception: 'Vendor suspended & bank letter expired — payment blocked pending procurement review' },
]

export const getLoket = (id?: string) => loketInvoices.find((i) => i.receiptNo === id)
export const invTotal = (i: Pick<LoketInvoice, 'dpp' | 'ppn'>) => i.dpp + i.ppn
export const poOf = (i: LoketInvoice) => i.poId ?? i.poRef

export function ageingBucket(days: number) {
  if (days <= 7) return '0–7 days'
  if (days <= 14) return '8–14 days'
  if (days <= 30) return '15–30 days'
  return '> 30 days'
}
export const ageingBuckets = ['0–7 days', '8–14 days', '15–30 days', '> 30 days'] as const

// ─── Three-way match ─────────────────────────────────────────────────────────
export interface Tolerance {
  category: string
  qtyPct: number
  pricePct: number
  absIdr: number
  note: string
}

export const tolerances: Tolerance[] = [
  { category: 'Fuel', qtyPct: 2, pricePct: 0.5, absIdr: 5_000_000, note: 'Flowmeter vs dipstick variance; price follows Pertamina index' },
  { category: 'Subcontract', qtyPct: 0, pricePct: 0, absIdr: 0, note: 'Must match BAST exactly — changes via PO amendment' },
  { category: 'Materials', qtyPct: 5, pricePct: 2, absIdr: 10_000_000, note: 'Bulk delivery tolerance' },
  { category: 'Equipment', qtyPct: 0, pricePct: 0, absIdr: 0, note: 'Milestone-based — exact match to milestone value' },
  { category: 'Spare Parts', qtyPct: 0, pricePct: 2, absIdr: 2_500_000, note: 'Price rounding & freight' },
  { category: 'Permits & Tolls', qtyPct: 0, pricePct: 0, absIdr: 500_000, note: 'Pass-through; receipts attached' },
]

export interface MatchLine {
  item: string
  uom: string
  poQty: number
  poPrice: number
  grQty: number
  invQty: number
  invPrice: number
}

export interface MatchCase {
  receiptNo: string
  category: string
  grRefs: string[]
  lines: MatchLine[]
  clarification?: { at: string; from: 'Petrolog' | 'Vendor'; name: string; text: string }[]
}

export const matchCases: MatchCase[] = [
  {
    receiptNo: 'LKT-2028-03-0146', category: 'Subcontract', grRefs: ['SES-2028-0079'],
    lines: [
      { item: 'Catalyst handling crew (lump sum, progress 1 of 2)', uom: 'LS', poQty: 0.5, poPrice: 2_350_000_000, grQty: 0.5, invQty: 0.5, invPrice: 2_350_000_000 },
    ],
  },
  {
    receiptNo: 'LKT-2028-03-0145', category: 'Subcontract', grRefs: ['SES-2028-0088'],
    lines: [
      { item: 'Scaffold erection — reactor deck', uom: 'm³', poQty: 1_200, poPrice: 180_000, grQty: 1_200, invQty: 1_200, invPrice: 180_000 },
      { item: 'Scaffold rental', uom: 'day', poQty: 10, poPrice: 3_120_000, grQty: 10, invQty: 21, invPrice: 3_120_000 },
      { item: 'Dismantle', uom: 'm³', poQty: 1_200, poPrice: 54_000, grQty: 1_200, invQty: 1_200, invPrice: 54_000 },
    ],
    clarification: [
      { at: '2028-03-06T09:15', from: 'Petrolog', name: 'Maya Anggraini', text: 'Invoice bills 21 rental days; BAST SES-2028-0088 accepts 10 days. Please confirm or issue a credit note.' },
      { at: '2028-03-07T14:02', from: 'Vendor', name: 'PT Mitra Scaffolding Indonesia', text: 'Scaffold remained on reactor deck until 05 Mar at client request. Extension letter from site attached.' },
      { at: '2028-03-08T10:40', from: 'Petrolog', name: 'Rizky Firmansyah', text: 'Confirmed extension was requested by Pertiwi (Client B). Raising PO amendment for 11 days; cost is client-recoverable under standby rate.' },
    ],
  },
  {
    receiptNo: 'LKT-2028-03-0147', category: 'Subcontract', grRefs: ['SES-2028-0091', 'SES-2028-0094'],
    lines: [
      { item: 'Rig move support crew — per load', uom: 'load', poQty: 22, poPrice: 26_500_000, grQty: 6, invQty: 6, invPrice: 26_500_000 },
      { item: 'Tail crane 50T — per day', uom: 'day', poQty: 22, poPrice: 11_900_000, grQty: 6, invQty: 6, invPrice: 11_900_000 },
    ],
    clarification: [{ at: '2028-03-07T11:30', from: 'Petrolog', name: 'Maya Anggraini', text: 'Invoice received against PO-2028-0199 which is still pending approval. Held in exception until the PO is released — no action needed from you.' }],
  },
  {
    receiptNo: 'LKT-2028-02-0129', category: 'Spare Parts', grRefs: ['GRN-2028-0233'],
    lines: [{ item: 'Wheel hub bearing set, Hino FM', uom: 'set', poQty: 24, poPrice: 1_783_333, grQty: 18, invQty: 24, invPrice: 1_783_333 }],
    clarification: [
      { at: '2028-02-28T10:00', from: 'Petrolog', name: 'Maya Anggraini', text: 'Only 18 sets received at Balikpapan warehouse. Please invoice delivered quantity or confirm delivery date for the remaining 6.' },
      { at: '2028-03-01T08:21', from: 'Vendor', name: 'CV Teknik Diesel Mandiri', text: 'Remaining 6 sets ship 12 Mar. We will re-issue the invoice for 18 sets.' },
    ],
  },
  {
    receiptNo: 'LKT-2028-03-0139', category: 'Materials', grRefs: ['GRN-2028-0258', 'GRN-2028-0272'],
    lines: [{ item: 'Liquid nitrogen, tanker load (≈ 20 t)', uom: 'load', poQty: 18, poPrice: 27_000_000, grQty: 18, invQty: 18, invPrice: 27_000_000 }],
  },
  {
    receiptNo: 'LKT-2028-03-0138', category: 'Fuel', grRefs: ['GRN-2028-0244', 'GRN-2028-0251', 'GRN-2028-0263'],
    lines: [{ item: 'HSD B40 — delivered Kutai site tank', uom: 'L', poQty: 120_000, poPrice: 13_700, grQty: 119_620, invQty: 120_000, invPrice: 13_700 }],
  },
  {
    receiptNo: 'LKT-2028-03-0144', category: 'Spare Parts', grRefs: ['GRN-2028-0219'],
    lines: [{ item: 'PM 1000 hr service kit (filters, belts, seals)', uom: 'kit', poQty: 20, poPrice: 10_700_000, grQty: 20, invQty: 20, invPrice: 10_700_000 }],
  },
]
export const getMatchCase = (id: string) => matchCases.find((m) => m.receiptNo === id)

/** Evaluate variances against tolerance */
export function evaluateMatch(mc: MatchCase, tol: Tolerance[] = tolerances) {
  const t = tol.find((x) => x.category === mc.category) ?? tol[0]
  const lines = mc.lines.map((l) => {
    const qtyVar = l.grQty ? ((l.invQty - l.grQty) / l.grQty) * 100 : 0
    const priceVar = l.poPrice ? ((l.invPrice - l.poPrice) / l.poPrice) * 100 : 0
    const amtVar = l.invQty * l.invPrice - l.grQty * l.poPrice
    const ok = (Math.abs(qtyVar) <= t.qtyPct && Math.abs(priceVar) <= t.pricePct) || Math.abs(amtVar) <= t.absIdr
    return { ...l, qtyVar, priceVar, amtVar, ok }
  })
  return { tolerance: t, lines, ok: lines.every((l) => l.ok) }
}

// ─── Payment runs ─────────────────────────────────────────────────────────────
export interface PaymentItem {
  receiptNo: string
  vendorId: string
  gross: number
  /** PPh 23 base (service portion); 0 for goods */
  pphBase: number
  pphRate: number
  bupotNo?: string
}

export interface PaymentRun {
  id: string
  date: string
  bank: string
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Sent to bank' | 'Executed'
  preparedBy: string
  approvals: { role: string; by: string; at?: string }[]
  bankFile?: string
  journalId?: string
  items: PaymentItem[]
}

export const paymentRuns: PaymentRun[] = [
  {
    id: 'PAY-2028-03-02', date: '2028-03-12', bank: 'Bank Mandiri — operating (H2H)', status: 'Pending Approval', preparedBy: 'EMP-0009',
    approvals: [
      { role: 'Accounting Manager', by: 'EMP-0028', at: '2028-03-10T08:05' },
      { role: 'Finance Director', by: 'EMP-0002' },
    ],
    items: [
      { receiptNo: 'LKT-2028-03-0138', vendorId: 'VND-00118', gross: 1_824_840_000, pphBase: 0, pphRate: 0 },
      { receiptNo: 'LKT-2028-03-0144', vendorId: 'VND-00177', gross: 237_540_000, pphBase: 0, pphRate: 0 },
      { receiptNo: 'LKT-2028-03-0140', vendorId: 'VND-00203', gross: 96_500_000, pphBase: 96_500_000, pphRate: 2 },
      { receiptNo: 'LKT-2028-03-0141', vendorId: 'VND-00203', gross: 14_650_000, pphBase: 14_650_000, pphRate: 2 },
    ],
  },
  {
    id: 'PAY-2028-03-01', date: '2028-03-05', bank: 'Bank Mandiri — operating (H2H)', status: 'Executed', preparedBy: 'EMP-0009', bankFile: 'MCM_H2H_20280305_01.txt', journalId: 'JV-2028-03-0005',
    approvals: [
      { role: 'Accounting Manager', by: 'EMP-0028', at: '2028-03-04T16:20' },
      { role: 'Finance Director', by: 'EMP-0002', at: '2028-03-05T08:47' },
    ],
    items: [
      { receiptNo: 'LKT-2028-02-0121', vendorId: 'VND-00112', gross: 1_243_200_000, pphBase: 1_120_000_000, pphRate: 2, bupotNo: 'BP23-2028-03-00017' },
      { receiptNo: 'LKT-2028-02-0126', vendorId: 'VND-00219', gross: 42_735_000, pphBase: 38_500_000, pphRate: 2, bupotNo: 'BP23-2028-03-00018' },
    ],
  },
  {
    id: 'PAY-2028-02-04', date: '2028-02-26', bank: 'Bank Mandiri — operating (H2H)', status: 'Executed', preparedBy: 'EMP-0009', bankFile: 'MCM_H2H_20280226_01.txt',
    approvals: [
      { role: 'Accounting Manager', by: 'EMP-0028', at: '2028-02-25T15:02' },
      { role: 'Finance Director', by: 'EMP-0002', at: '2028-02-26T09:10' },
    ],
    items: [
      { receiptNo: 'LKT-2028-02-0097', vendorId: 'VND-00131', gross: 1_304_250_000, pphBase: 1_175_000_000, pphRate: 2, bupotNo: 'BP23-2028-02-00029' },
      { receiptNo: 'LKT-2028-02-0101', vendorId: 'VND-00194', gross: 98_790_000, pphBase: 89_000_000, pphRate: 2, bupotNo: 'BP23-2028-02-00030' },
      { receiptNo: 'LKT-2028-02-0102', vendorId: 'VND-00118', gross: 1_698_060_000, pphBase: 0, pphRate: 0 },
    ],
  },
]

export const itemPph = (i: PaymentItem) => Math.round((i.pphBase * i.pphRate) / 100)
export const itemNet = (i: PaymentItem) => i.gross - itemPph(i)
export const runTotals = (r: PaymentRun) => ({
  gross: r.items.reduce((s, i) => s + i.gross, 0),
  pph: r.items.reduce((s, i) => s + itemPph(i), 0),
  net: r.items.reduce((s, i) => s + itemNet(i), 0),
})

export const poCategory = (poId?: string) => getPO(poId)?.costCategory
