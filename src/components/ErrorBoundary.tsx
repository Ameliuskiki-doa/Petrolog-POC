import { Component, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

/** Keeps one broken screen from blanking the whole prototype. Reset by changing `resetKey` (the pathname). */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null; key?: string }> {
  state: { error: Error | null; key?: string } = { error: null, key: this.props.resetKey }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  static getDerivedStateFromProps(props: { resetKey?: string }, state: { error: Error | null; key?: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null
  }

  componentDidCatch(error: Error) {
    console.error('[screen-error]', error.message)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-2 text-amber-500" size={32} />
        <div className="text-sm font-semibold text-slate-800">This screen could not be displayed</div>
        <div className="mt-1 font-mono text-xs text-slate-400">{this.state.error.message}</div>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }
}
