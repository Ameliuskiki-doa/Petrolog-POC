/**
 * M13 Cash & Bank — accounts, statement import, reconciliation and 13-week cash forecast.
 */

export interface BankAccount {
  id: string
  bank: string
  number: string
  purpose: string
  glAccount: string
  balance: number
  statementBalance: number
  lastImport: string
  channel: 'H2H' | 'MT940 SFTP' | 'Manual upload'
  reconciledTo: string
}

export const bankAccounts: BankAccount[] = [
  { id: 'BA-MDR-01', bank: 'Bank Mandiri', number: '137-00-1188-2044', purpose: 'Operating — vendor payments (H2H)', glAccount: '1102.01', balance: 18_642_300_000, statementBalance: 18_613_150_000, lastImport: '2028-03-10T06:00', channel: 'H2H', reconciledTo: '2028-03-07' },
  { id: 'BA-BCA-01', bank: 'Bank BCA', number: '546-078-9921', purpose: 'Collections — customer receipts', glAccount: '1102.02', balance: 6_418_900_000, statementBalance: 6_418_900_000, lastImport: '2028-03-10T06:00', channel: 'MT940 SFTP', reconciledTo: '2028-03-09' },
  { id: 'BA-BNI-01', bank: 'Bank BNI', number: '0921-554-017', purpose: 'Payroll', glAccount: '1102.03', balance: 1_215_000_000, statementBalance: 1_215_000_000, lastImport: '2028-03-09T06:00', channel: 'MT940 SFTP', reconciledTo: '2028-03-08' },
  { id: 'BA-BRI-01', bank: 'Bank BRI', number: '0342-01-000871-30-5', purpose: 'Balikpapan operations & site imprest', glAccount: '1102.04', balance: 842_600_000, statementBalance: 867_600_000, lastImport: '2028-03-08T18:10', channel: 'Manual upload', reconciledTo: '2028-03-07' },
]

export interface StatementLine {
  id: string
  accountId: string
  date: string
  description: string
  amount: number
  status: 'Auto-matched' | 'Suggested' | 'Unmatched' | 'Manually matched'
  matchRef?: string
  matchLink?: string
  rule?: string
}

export const statementLines: StatementLine[] = [
  { id: 'SL-0301', accountId: 'BA-MDR-01', date: '2028-03-05', description: 'MCM H2H BATCH 20280305-01 (2 TRF)', amount: -1_262_765_000, status: 'Auto-matched', matchRef: 'PAY-2028-03-01 · JV-2028-03-0005', matchLink: '/finance/gl/JV-2028-03-0005', rule: 'Payment run batch ID' },
  { id: 'SL-0302', accountId: 'BA-MDR-01', date: '2028-03-07', description: 'BIAYA TRANSAKSI H2H 01-07 MAR', amount: -1_850_000, status: 'Auto-matched', matchRef: 'JV-2028-03-0010', matchLink: '/finance/gl/JV-2028-03-0010', rule: 'Bank charge rule → 7102' },
  { id: 'SL-0303', accountId: 'BA-MDR-01', date: '2028-03-10', description: 'MPN G3 PPN 0228 NTPN 7F3A21C9D04B8E16', amount: -486_300_000, status: 'Auto-matched', matchRef: 'JV-2028-03-0018', matchLink: '/finance/gl/JV-2028-03-0018', rule: 'NTPN reference' },
  { id: 'SL-0304', accountId: 'BA-MDR-01', date: '2028-03-10', description: 'MPN G3 PPH23 0228 NTPN 29C0B7E1A4F65D38', amount: -71_200_000, status: 'Auto-matched', matchRef: 'JV-2028-03-0019', matchLink: '/finance/gl/JV-2028-03-0019', rule: 'NTPN reference' },
  { id: 'SL-0305', accountId: 'BA-MDR-01', date: '2028-03-08', description: 'BUNGA JASA GIRO FEB 2028', amount: 18_450_000, status: 'Unmatched', rule: 'No rule — propose journal to 7201 Interest income' },
  { id: 'SL-0306', accountId: 'BA-MDR-01', date: '2028-03-09', description: 'PAJAK BUNGA GIRO', amount: -3_690_000, status: 'Unmatched', rule: 'No rule — propose journal to 1106.03 / 8101' },
  { id: 'SL-0307', accountId: 'BA-MDR-01', date: '2028-03-09', description: 'TRF KE 0342-01-000871 BRI BPN — DROPPING OPS', amount: -500_000_000, status: 'Suggested', matchRef: 'Inter-bank transfer → BA-BRI-01 (in transit)', rule: 'Inter-account transfer, amount & date ±1 day' },
  { id: 'SL-0308', accountId: 'BA-BCA-01', date: '2028-03-05', description: 'TRF DR BORNEO COAL MINING INV 2028-02-0014', amount: 659_755_200, status: 'Auto-matched', matchRef: 'INV-2028-02-0014 · JV-2028-03-0006', matchLink: '/finance/gl/JV-2028-03-0006', rule: 'Invoice number in narrative, net of PPh 23' },
  { id: 'SL-0309', accountId: 'BA-BCA-01', date: '2028-03-01', description: 'TRF DR BORNEO COAL MINING JAN HAULING', amount: 3_719_080_000, status: 'Auto-matched', matchRef: 'INV-2028-01-0007', matchLink: '/finance/ar?open=INV-2028-01-0007', rule: 'Customer + amount net of PPh 23' },
  { id: 'SL-0310', accountId: 'BA-BCA-01', date: '2028-03-09', description: 'TRF DR SELAT POWER GEN — PARTIAL', amount: 1_000_000_000, status: 'Suggested', matchRef: 'INV-2027-12-0041 (partial, migrated open item)', matchLink: '/finance/ar?open=INV-2027-12-0041', rule: 'Customer match, partial amount' },
  { id: 'SL-0311', accountId: 'BA-BRI-01', date: '2028-03-08', description: 'TARIK TUNAI IMPREST KUTAI', amount: -25_000_000, status: 'Manually matched', matchRef: 'JV-2028-03-0013', matchLink: '/finance/gl/JV-2028-03-0013' },
  { id: 'SL-0312', accountId: 'BA-BRI-01', date: '2028-03-08', description: 'SETORAN TUNAI — REFUND DEPOSIT MESS KARYAWAN', amount: 25_000_000, status: 'Unmatched', rule: 'Unidentified deposit — hold in suspense pending site confirmation' },
]

/** 13-week cash forecast from 13 Mar 2028 (week commencing) — IDR */
export const cashForecast = [
  { week: 'W11 · 13 Mar', inflow: 4_262_400_000, outflow: 2_420_000_000 },
  { week: 'W12 · 20 Mar', inflow: 2_375_400_000, outflow: 3_860_000_000 },
  { week: 'W13 · 27 Mar', inflow: 1_012_100_000, outflow: 5_140_000_000 },
  { week: 'W14 · 03 Apr', inflow: 1_714_950_000, outflow: 2_310_000_000 },
  { week: 'W15 · 10 Apr', inflow: 3_140_000_000, outflow: 1_980_000_000 },
  { week: 'W16 · 17 Apr', inflow: 2_880_000_000, outflow: 2_640_000_000 },
  { week: 'W17 · 24 Apr', inflow: 1_960_000_000, outflow: 4_920_000_000 },
  { week: 'W18 · 01 May', inflow: 3_420_000_000, outflow: 2_150_000_000 },
  { week: 'W19 · 08 May', inflow: 4_210_000_000, outflow: 2_480_000_000 },
  { week: 'W20 · 15 May', inflow: 2_060_000_000, outflow: 2_720_000_000 },
  { week: 'W21 · 22 May', inflow: 1_840_000_000, outflow: 4_860_000_000 },
  { week: 'W22 · 29 May', inflow: 3_960_000_000, outflow: 2_210_000_000 },
  { week: 'W23 · 05 Jun', inflow: 2_740_000_000, outflow: 2_390_000_000 },
]
export const OPENING_CASH = bankAccounts.reduce((s, a) => s + a.balance, 0) + 186_500_000
export const MIN_CASH = 15_000_000_000
