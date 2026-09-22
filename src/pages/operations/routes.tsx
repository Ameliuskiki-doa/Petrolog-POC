import type { RouteObject } from 'react-router-dom'
import JobsList from './JobsList'
import JobDetail from './JobDetail'
import PlanningBoard from './PlanningBoard'
import FleetUnits from './FleetUnits'
import UnitDetail from './UnitDetail'
import FuelMonitoring from './FuelMonitoring'
import DriverBehaviour from './DriverBehaviour'
import LiveTracking from './LiveTracking'
import Timesheets from './Timesheets'
import Manpower from './Manpower'

export const routes: RouteObject[] = [
  { path: '/ops/jobs', element: <JobsList /> },
  { path: '/ops/jobs/:id', element: <JobDetail /> },
  { path: '/ops/planning', element: <PlanningBoard /> },
  { path: '/fleet/units', element: <FleetUnits /> },
  { path: '/fleet/units/:id', element: <UnitDetail /> },
  { path: '/fleet/fuel', element: <FuelMonitoring /> },
  { path: '/fleet/drivers', element: <DriverBehaviour /> },
  { path: '/fleet/tracking', element: <LiveTracking /> },
  { path: '/timesheets', element: <Timesheets /> },
  { path: '/manpower', element: <Manpower /> },
]
