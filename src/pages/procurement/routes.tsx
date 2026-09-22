import type { RouteObject } from 'react-router-dom'
import Requisitions from './Requisitions'
import RequisitionDetail from './RequisitionDetail'
import RfqList from './RfqList'
import RfqDetail from './RfqDetail'
import Orders from './Orders'
import OrderDetail from './OrderDetail'
import Receipts from './Receipts'
import Vendors from './Vendors'
import VendorDetail from './VendorDetail'

export const routes: RouteObject[] = [
  { path: '/procurement/requisitions', element: <Requisitions /> },
  { path: '/procurement/requisitions/:id', element: <RequisitionDetail /> },
  { path: '/procurement/rfq', element: <RfqList /> },
  { path: '/procurement/rfq/:id', element: <RfqDetail /> },
  { path: '/procurement/orders', element: <Orders /> },
  { path: '/procurement/orders/:id', element: <OrderDetail /> },
  { path: '/procurement/receipts', element: <Receipts /> },
  { path: '/vendors', element: <Vendors /> },
  { path: '/vendors/:id', element: <VendorDetail /> },
]
