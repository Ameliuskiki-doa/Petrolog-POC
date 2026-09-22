import type { RouteObject } from 'react-router-dom'
import Mdm from './Mdm'
import Documents from './Documents'
import Reports from './Reports'
import Users from './Users'
import Integrations from './Integrations'
import Audit from './Audit'
import Config from './Config'

export const routes: RouteObject[] = [
  { path: '/mdm', element: <Mdm /> },
  { path: '/documents', element: <Documents /> },
  { path: '/reports', element: <Reports /> },
  { path: '/admin/users', element: <Users /> },
  { path: '/admin/integrations', element: <Integrations /> },
  { path: '/admin/audit', element: <Audit /> },
  { path: '/admin/config', element: <Config /> },
]
