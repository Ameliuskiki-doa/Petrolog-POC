import { lazy, Suspense } from 'react'
import { useRoutes, type RouteObject } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Dashboard from '@/pages/dashboard/Dashboard'
import Inbox from '@/pages/dashboard/Inbox'
import NotFound from '@/pages/NotFound'
import { routes as commercial } from '@/pages/commercial/routes'
import { routes as operations } from '@/pages/operations/routes'
import { routes as procurement } from '@/pages/procurement/routes'
import { routes as projects } from '@/pages/projects/routes'
import { routes as finance } from '@/pages/finance/routes'
import { routes as supporting } from '@/pages/supporting/routes'
import { routes as platform } from '@/pages/platform/routes'

const MobileApp = lazy(() => import('@/apps/mobile/MobileApp'))
const PortalApp = lazy(() => import('@/apps/portal/PortalApp'))

const loading = <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading…</div>

const tree: RouteObject[] = [
  { path: '/mobile/*', element: <ErrorBoundary><Suspense fallback={loading}><MobileApp /></Suspense></ErrorBoundary> },
  { path: '/portal/*', element: <ErrorBoundary><Suspense fallback={loading}><PortalApp /></Suspense></ErrorBoundary> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: '/inbox', element: <Inbox /> },
      ...commercial,
      ...operations,
      ...procurement,
      ...projects,
      ...finance,
      ...supporting,
      ...platform,
      { path: '*', element: <NotFound /> },
    ],
  },
]

export default function App() {
  return useRoutes(tree)
}
