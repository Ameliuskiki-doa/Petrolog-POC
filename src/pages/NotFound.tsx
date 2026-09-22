import { Link } from 'react-router-dom'
import { Card, EmptyState } from '@/components/ui'

export default function NotFound() {
  return (
    <Card>
      <EmptyState title="Page not found" body="This screen is not part of the prototype." />
      <div className="pb-6 text-center">
        <Link to="/" className="text-sm font-medium text-brand-700 hover:underline">
          Back to dashboard
        </Link>
      </div>
    </Card>
  )
}
