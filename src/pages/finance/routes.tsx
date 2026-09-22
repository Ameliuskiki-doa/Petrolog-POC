import type { RouteObject } from 'react-router-dom'
import GeneralLedger from './GeneralLedger'
import JournalDetail from './JournalDetail'
import ChartOfAccounts from './ChartOfAccounts'
import PeriodClose from './PeriodClose'
import LoketInvoice from './LoketInvoice'
import ThreeWayMatch from './ThreeWayMatch'
import Payments from './Payments'
import Billing from './Billing'
import KonversiReconciliation from './KonversiReconciliation'
import Receivables from './Receivables'
import FixedAssets from './FixedAssets'
import Tax from './Tax'
import CashBank from './CashBank'

export const routes: RouteObject[] = [
  { path: '/finance/gl', element: <GeneralLedger /> },
  { path: '/finance/gl/:id', element: <JournalDetail /> },
  { path: '/finance/coa', element: <ChartOfAccounts /> },
  { path: '/finance/close', element: <PeriodClose /> },
  { path: '/finance/loket', element: <LoketInvoice /> },
  { path: '/finance/ap/match', element: <ThreeWayMatch /> },
  { path: '/finance/ap/payments', element: <Payments /> },
  { path: '/finance/billing', element: <Billing /> },
  { path: '/finance/billing/reconciliation', element: <KonversiReconciliation /> },
  { path: '/finance/ar', element: <Receivables /> },
  { path: '/finance/assets', element: <FixedAssets /> },
  { path: '/finance/tax', element: <Tax /> },
  { path: '/finance/cash', element: <CashBank /> },
]
