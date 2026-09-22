import type { RouteObject } from 'react-router-dom'
import Pipeline from './Pipeline'
import OpportunityDetail from './OpportunityDetail'
import Tenders from './Tenders'
import Correspondence from './Correspondence'
import Contracts from './Contracts'
import ContractDetail from './ContractDetail'

export const routes: RouteObject[] = [
  { path: '/crm/pipeline', element: <Pipeline /> },
  { path: '/crm/opportunities/:id', element: <OpportunityDetail /> },
  { path: '/crm/tenders', element: <Tenders /> },
  { path: '/crm/correspondence', element: <Correspondence /> },
  { path: '/contracts', element: <Contracts /> },
  { path: '/contracts/:id', element: <ContractDetail /> },
]
