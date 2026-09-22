/**
 * M12 Tax Management — e-Faktur / Coretax (FAT-35), e-Bupot (FAT-36), rule-based tax determination (FAT-34),
 * tax risk register and GL reconciliation (FAT-32/33).
 */

export interface FakturRow {
  fakturNo: string
  direction: 'Output' | 'Input'
  date: string
  counterpartyId: string
  docRef: string
  docLink?: string
  dpp: number
  ppn: number
  status: 'Approved' | 'Uploaded' | 'Pending upload' | 'Rejected' | 'Credited'
  coretaxRef?: string
  message?: string
}

export const fakturs: FakturRow[] = [
  { fakturNo: '010.028-28.00041188', direction: 'Output', date: '2028-03-04', counterpartyId: 'CUS-003', docRef: 'INV-2028-03-0005', docLink: '/finance/ar?open=INV-2028-03-0005', dpp: 285_000_000, ppn: 31_350_000, status: 'Approved', coretaxRef: 'CTX-OUT-7781204' },
  { fakturNo: '010.028-28.00041171', direction: 'Output', date: '2028-03-02', counterpartyId: 'CUS-005', docRef: 'INV-2028-03-0004', docLink: '/finance/ar?open=INV-2028-03-0004', dpp: 1_260_000_000, ppn: 138_600_000, status: 'Approved', coretaxRef: 'CTX-OUT-7779931' },
  { fakturNo: '010.028-28.00041127', direction: 'Output', date: '2028-02-26', counterpartyId: 'CUS-001', docRef: 'INV-2028-02-0014', docLink: '/finance/ar?open=INV-2028-02-0014', dpp: 605_280_000, ppn: 66_580_800, status: 'Approved', coretaxRef: 'CTX-OUT-7741020' },
  { fakturNo: '010.028-28.00041092', direction: 'Output', date: '2028-02-15', counterpartyId: 'CUS-002', docRef: 'INV-2028-02-0012', docLink: '/finance/ar?open=INV-2028-02-0012', dpp: 84_100_000, ppn: 9_251_000, status: 'Approved', coretaxRef: 'CTX-OUT-7712388' },
  { fakturNo: '010.028-28.00041066', direction: 'Output', date: '2028-02-10', counterpartyId: 'CUS-003', docRef: 'INV-2028-02-0009', docLink: '/finance/ar?open=INV-2028-02-0009', dpp: 911_800_000, ppn: 100_298_000, status: 'Approved', coretaxRef: 'CTX-OUT-7701655' },
  { fakturNo: '010.028-28.00041031', direction: 'Output', date: '2028-02-05', counterpartyId: 'CUS-002', docRef: 'INV-2028-02-0004', docLink: '/finance/ar?open=INV-2028-02-0004', dpp: 3_840_000_000, ppn: 422_400_000, status: 'Approved', coretaxRef: 'CTX-OUT-7690214' },
  { fakturNo: '010.028-28.00041201', direction: 'Output', date: '2028-03-10', counterpartyId: 'CUS-001', docRef: 'Proforma PF-2028-03-0008 (on approval)', dpp: 564_540_000, ppn: 62_099_400, status: 'Pending upload', message: 'Queued — issued automatically when AR invoice is posted' },
  { fakturNo: '010.041-28.00013402', direction: 'Input', date: '2028-03-10', counterpartyId: 'VND-00118', docRef: 'LKT-2028-03-0151', docLink: '/finance/loket?open=LKT-2028-03-0151', dpp: 685_000_000, ppn: 75_350_000, status: 'Uploaded', coretaxRef: 'CTX-IN-5520981', message: 'Awaiting prepopulated match in Coretax' },
  { fakturNo: '010.022-28.00001968', direction: 'Input', date: '2028-03-06', counterpartyId: 'VND-00131', docRef: 'LKT-2028-03-0146', docLink: '/finance/loket?open=LKT-2028-03-0146', dpp: 1_175_000_000, ppn: 129_250_000, status: 'Approved', coretaxRef: 'CTX-IN-5519044' },
  { fakturNo: '010.027-28.00000512', direction: 'Input', date: '2028-03-05', counterpartyId: 'VND-00194', docRef: 'LKT-2028-03-0145', docLink: '/finance/loket?open=LKT-2028-03-0145', dpp: 346_320_000, ppn: 38_095_200, status: 'Rejected', message: 'DPP differs from matched GR value — credit on hold until replacement faktur (pembetulan) is issued' },
  { fakturNo: '010.001-28.00092231', direction: 'Input', date: '2028-03-04', counterpartyId: 'VND-00177', docRef: 'LKT-2028-03-0144', docLink: '/finance/loket?open=LKT-2028-03-0144', dpp: 214_000_000, ppn: 23_540_000, status: 'Credited', coretaxRef: 'CTX-IN-5516310' },
  { fakturNo: '010.052-28.00003318', direction: 'Input', date: '2028-03-02', counterpartyId: 'VND-00188', docRef: 'LKT-2028-03-0139', docLink: '/finance/loket?open=LKT-2028-03-0139', dpp: 486_000_000, ppn: 53_460_000, status: 'Credited', coretaxRef: 'CTX-IN-5513872' },
  { fakturNo: '010.041-28.00012873', direction: 'Input', date: '2028-03-01', counterpartyId: 'VND-00118', docRef: 'LKT-2028-03-0138', docLink: '/finance/loket?open=LKT-2028-03-0138', dpp: 1_644_000_000, ppn: 180_840_000, status: 'Credited', coretaxRef: 'CTX-IN-5512207' },
  { fakturNo: '010.019-28.00000734', direction: 'Input', date: '2028-03-07', counterpartyId: 'VND-00210', docRef: 'LKT-2028-03-0147', docLink: '/finance/loket?open=LKT-2028-03-0147', dpp: 230_400_000, ppn: 25_344_000, status: 'Uploaded', coretaxRef: 'CTX-IN-5519377', message: 'Not creditable until invoice clears exception queue' },
]

export interface BupotRow {
  no: string
  type: 'Issued' | 'Received'
  date: string
  counterpartyId: string
  npwp: string
  object: string
  dpp: number
  rate: number
  pph: number
  paymentRef: string
  status: 'Issued' | 'Draft' | 'Uploaded' | 'Received' | 'Awaiting from customer'
}

export const bupots: BupotRow[] = [
  { no: 'BP23-2028-03-00017', type: 'Issued', date: '2028-03-05', counterpartyId: 'VND-00112', npwp: '71.234.001.1-722.000', object: '24-104-14 Jasa angkutan / haulage', dpp: 1_120_000_000, rate: 2, pph: 22_400_000, paymentRef: 'PAY-2028-03-01', status: 'Issued' },
  { no: 'BP23-2028-03-00018', type: 'Issued', date: '2028-03-05', counterpartyId: 'VND-00219', npwp: '77.888.100.3-724.000', object: '24-104-40 Jasa pengelolaan limbah', dpp: 38_500_000, rate: 2, pph: 770_000, paymentRef: 'PAY-2028-03-01', status: 'Issued' },
  { no: 'BP23-2028-03-00019', type: 'Issued', date: '2028-03-12', counterpartyId: 'VND-00203', npwp: '76.123.450.1-722.000', object: '24-104-30 Jasa perizinan / agent', dpp: 96_500_000, rate: 2, pph: 1_930_000, paymentRef: 'PAY-2028-03-02', status: 'Draft' },
  { no: 'BP23-2028-03-00020', type: 'Issued', date: '2028-03-12', counterpartyId: 'VND-00203', npwp: '76.123.450.1-722.000', object: '24-104-30 Jasa perizinan / agent', dpp: 14_650_000, rate: 2, pph: 293_000, paymentRef: 'PAY-2028-03-02', status: 'Draft' },
  { no: 'BP23-2028-02-00029', type: 'Issued', date: '2028-02-26', counterpartyId: 'VND-00131', npwp: '72.111.301.3-521.000', object: '24-104-21 Jasa teknik', dpp: 1_175_000_000, rate: 2, pph: 23_500_000, paymentRef: 'PAY-2028-02-04', status: 'Uploaded' },
  { no: 'BP23-2028-02-00030', type: 'Issued', date: '2028-02-26', counterpartyId: 'VND-00194', npwp: '75.444.202.0-521.000', object: '24-104-21 Jasa teknik', dpp: 89_000_000, rate: 2, pph: 1_780_000, paymentRef: 'PAY-2028-02-04', status: 'Uploaded' },
  { no: '1601-2028-03-000412', type: 'Received', date: '2028-03-05', counterpartyId: 'CUS-001', npwp: '01.234.567.8-721.000', object: '24-104-14 Jasa angkutan', dpp: 605_280_000, rate: 2, pph: 12_105_600, paymentRef: 'RCP-2028-03-0009', status: 'Awaiting from customer' },
  { no: '1601-2028-02-000377', type: 'Received', date: '2028-03-01', counterpartyId: 'CUS-001', npwp: '01.234.567.8-721.000', object: '24-104-14 Jasa angkutan', dpp: 3_412_000_000, rate: 2, pph: 68_240_000, paymentRef: 'RCP-2028-03-0002', status: 'Received' },
]

export interface TaxRule {
  id: string
  transaction: string
  counterparty: string
  ppn: string
  pph: string
  objectCode: string
  effectiveFrom: string
  active: boolean
}

export const taxRules: TaxRule[] = [
  { id: 'TR-OUT-01', transaction: 'Sales — logistics & equipment services', counterparty: 'Customer PKP, NPWP valid', ppn: 'PPN 12% × DPP nilai lain 11/12 (eff. 11%)', pph: 'Customer withholds PPh 23 2% → prepaid 1106.02', objectCode: '24-104-14', effectiveFrom: '2025-01-01', active: true },
  { id: 'TR-OUT-02', transaction: 'Sales — plant maintenance (construction services)', counterparty: 'Customer PKP', ppn: 'PPN 12% × 11/12', pph: 'PPh 4(2) final 2.65% (certified contractor)', objectCode: '28-409-07', effectiveFrom: '2025-01-01', active: true },
  { id: 'TR-OUT-03', transaction: 'Sales to KKKS under PSC (VAT collector)', counterparty: 'Customer designated VAT collector', ppn: 'PPN collected by customer (kode 030)', pph: 'PPh 23 2%', objectCode: '24-104-14', effectiveFrom: '2025-01-01', active: true },
  { id: 'TR-IN-01', transaction: 'Purchase — services (haulage, technical, rental)', counterparty: 'Vendor PKP, NPWP valid', ppn: 'Creditable input VAT', pph: 'Withhold PPh 23 2% on payment → e-Bupot', objectCode: '24-104-xx', effectiveFrom: '2025-01-01', active: true },
  { id: 'TR-IN-02', transaction: 'Purchase — services', counterparty: 'Vendor without NPWP', ppn: '—', pph: 'Withhold PPh 23 4% (100% surcharge)', objectCode: '24-104-xx', effectiveFrom: '2025-01-01', active: true },
  { id: 'TR-IN-03', transaction: 'Purchase — services', counterparty: 'Vendor non-PKP with NPWP', ppn: 'No PPN charged', pph: 'Withhold PPh 23 2%', objectCode: '24-104-xx', effectiveFrom: '2025-01-01', active: true },
  { id: 'TR-IN-04', transaction: 'Purchase — construction subcontract', counterparty: 'Certified contractor (SBU)', ppn: 'Creditable input VAT', pph: 'PPh 4(2) final 2.65%', objectCode: '28-409-07', effectiveFrom: '2025-01-01', active: true },
  { id: 'TR-IN-05', transaction: 'Purchase — goods (fuel, spare parts, materials)', counterparty: 'Vendor PKP', ppn: 'Creditable input VAT', pph: 'No withholding', objectCode: '—', effectiveFrom: '2025-01-01', active: true },
  { id: 'TR-IN-06', transaction: 'Rental of land/building', counterparty: 'Any', ppn: 'Creditable if PKP', pph: 'PPh 4(2) final 10%', objectCode: '28-403-01', effectiveFrom: '2025-01-01', active: true },
  { id: 'TR-IN-07', transaction: 'Purchase — services', counterparty: 'Foreign vendor (P3B/DGT form on file)', ppn: 'Self-assessed PPN (SSP)', pph: 'PPh 26 per treaty rate', objectCode: '27-100-99', effectiveFrom: '2025-01-01', active: true },
]

export interface TaxRisk {
  id: string
  title: string
  taxType: 'PPN' | 'PPh 23' | 'PPh 4(2)' | 'PPh 21' | 'Corporate income tax' | 'Transfer pricing'
  classification: 'Compliance' | 'Interpretation' | 'Documentation' | 'Process'
  likelihood: 'Low' | 'Medium' | 'High'
  impact: number
  mitigation: string
  owner: string
  status: 'Open' | 'Mitigating' | 'Closed'
  reviewed: string
}

export const taxRisks: TaxRisk[] = [
  { id: 'TXR-001', title: 'PPh 23 vs PPh 4(2) classification of plant maintenance with construction elements', taxType: 'PPh 4(2)', classification: 'Interpretation', likelihood: 'Medium', impact: 412_000_000, mitigation: 'Service classification captured per contract line; tax rules TR-OUT-02 / TR-IN-04 applied by contract type; opinion from tax consultant on file', owner: 'EMP-0023', status: 'Mitigating', reviewed: '2028-03-01' },
  { id: 'TXR-002', title: 'Input VAT credited on invoices later rejected in three-way match', taxType: 'PPN', classification: 'Process', likelihood: 'Medium', impact: 186_000_000, mitigation: 'Input VAT credited only after match approval; exception queue blocks crediting (see LKT-2028-03-0145)', owner: 'EMP-0023', status: 'Mitigating', reviewed: '2028-03-08' },
  { id: 'TXR-003', title: 'Customer bukti potong PPh 23 not received — prepaid tax not creditable', taxType: 'PPh 23', classification: 'Documentation', likelihood: 'High', impact: 96_400_000, mitigation: 'Automatic follow-up 14 days after receipt; collections officer escalates; reconciliation of 1106.02 monthly', owner: 'EMP-0022', status: 'Open', reviewed: '2028-03-05' },
  { id: 'TXR-004', title: 'Late e-Faktur upload for proformas converted after month end', taxType: 'PPN', classification: 'Compliance', likelihood: 'Low', impact: 42_000_000, mitigation: 'Faktur generated on AR invoice posting, not on proforma; Coretax queue monitored daily', owner: 'EMP-0023', status: 'Closed', reviewed: '2028-02-20' },
  { id: 'TXR-005', title: 'Fiscal vs commercial depreciation — deferred tax on heavy equipment', taxType: 'Corporate income tax', classification: 'Compliance', likelihood: 'Low', impact: 1_240_000_000, mitigation: 'Dual books in M11 (FAT-27); temporary difference reported monthly from the asset register', owner: 'EMP-0028', status: 'Mitigating', reviewed: '2028-03-02' },
  { id: 'TXR-006', title: 'Migrated SAP B1 open items without faktur reference (Nov–Dec 2027)', taxType: 'PPN', classification: 'Documentation', likelihood: 'Medium', impact: 64_500_000, mitigation: 'CUT-01 open-item register cross-checked with e-Faktur archive; 3 items pending replacement documents', owner: 'EMP-0023', status: 'Open', reviewed: '2028-02-28' },
]

export interface TaxRecon {
  item: string
  account: string
  taxSource: string
  taxAmount: number
  glAmount: number
  explanation: string
}

/** February 2028 (locked period) — taxable items vs GL */
export const taxRecon: TaxRecon[] = [
  { item: 'PPN output', account: '2104.01', taxSource: 'e-Faktur output (Coretax, approved)', taxAmount: 1_084_600_000, glAmount: 1_084_600_000, explanation: 'Reconciled' },
  { item: 'PPN input — creditable', account: '1106.01', taxSource: 'e-Faktur input (credited)', taxAmount: 598_300_000, glAmount: 636_395_200, explanation: 'LKT-2028-03-0145 scaffolding faktur rejected — 38.1 m held until replacement faktur' },
  { item: 'PPh 23 withheld from vendors', account: '2104.03', taxSource: 'e-Bupot issued (31 certificates)', taxAmount: 71_200_000, glAmount: 71_200_000, explanation: 'Reconciled' },
  { item: 'PPh 23 withheld by customers', account: '1106.02', taxSource: 'Bukti potong received', taxAmount: 1_222_000_000, glAmount: 1_318_400_000, explanation: '96.4 m bukti potong outstanding from customers (TXR-003)' },
  { item: 'Revenue vs DPP output', account: '4101–4103', taxSource: 'DPP on e-Faktur output', taxAmount: 9_860_000_000, glAmount: 9_913_400_000, explanation: 'Unbilled revenue (SK issued, invoice pending) 53.4 m — timing difference' },
  { item: 'PPh 4(2) final', account: '2104.04', taxSource: 'e-Bupot unifikasi 4(2)', taxAmount: 29_600_000, glAmount: 29_600_000, explanation: 'Reconciled' },
]
