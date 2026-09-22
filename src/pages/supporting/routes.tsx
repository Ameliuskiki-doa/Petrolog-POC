import type { RouteObject } from 'react-router-dom'
import Inventory from './Inventory'
import WorkOrders from './WorkOrders'
import WorkOrderDetail from './WorkOrderDetail'
import MaintenanceSchedule from './MaintenanceSchedule'
import Certifications from './Certifications'
import Incidents from './Incidents'
import IncidentDetail from './IncidentDetail'
import Permits from './Permits'
import WasteManifests from './WasteManifests'

export const routes: RouteObject[] = [
  { path: '/inventory', element: <Inventory /> },
  { path: '/maintenance/work-orders', element: <WorkOrders /> },
  { path: '/maintenance/work-orders/:id', element: <WorkOrderDetail /> },
  { path: '/maintenance/schedule', element: <MaintenanceSchedule /> },
  { path: '/maintenance/certifications', element: <Certifications /> },
  { path: '/hse/incidents', element: <Incidents /> },
  { path: '/hse/incidents/:id', element: <IncidentDetail /> },
  { path: '/hse/permits', element: <Permits /> },
  { path: '/hse/waste', element: <WasteManifests /> },
]
