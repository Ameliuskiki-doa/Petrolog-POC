import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { Card, EmptyState, PageHeader } from '@/components/ui'

export function Placeholder({ title }: { title?: string }) {
  const loc = useLocation()
  return (
    <>
      <PageHeader title={title ?? 'Coming soon'} subtitle={loc.pathname} />
      <Card>
        <EmptyState icon={<Construction size={36} />} title="Screen under construction" body="This screen is part of the prototype build plan." />
      </Card>
    </>
  )
}
