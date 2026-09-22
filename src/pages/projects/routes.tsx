import type { RouteObject } from 'react-router-dom'
import ProjectList from './ProjectList'
import ProjectDetail from './ProjectDetail'
import GenAllocation from './GenAllocation'
import FuelActualisation from './FuelActualisation'
import LateCosts from './LateCosts'
import FppControl from './FppControl'

export const routes: RouteObject[] = [
  { path: '/projects', element: <ProjectList /> },
  { path: '/projects/:code', element: <ProjectDetail /> },
  { path: '/costing/allocation', element: <GenAllocation /> },
  { path: '/costing/fuel-actualisation', element: <FuelActualisation /> },
  { path: '/costing/late-costs', element: <LateCosts /> },
  { path: '/costing/fpp', element: <FppControl /> },
]
