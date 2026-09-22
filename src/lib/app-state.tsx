import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import { roles, type RoleKey } from '@/data/core'

// ─── Role (demo login) ───────────────────────────────────────────────────────

interface RoleCtx {
  role: RoleKey
  setRole: (r: RoleKey) => void
}

const RoleContext = createContext<RoleCtx>({ role: 'executive', setRole: () => {} })

function initialRole(): RoleKey {
  try {
    const r = localStorage.getItem('pl-role') as RoleKey | null
    if (r && r in roles) return r
  } catch {
    /* storage unavailable */
  }
  return 'executive'
}

// ─── Toasts ──────────────────────────────────────────────────────────────────

type ToastKind = 'success' | 'info' | 'warning' | 'error'
interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {})

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<RoleKey>(initialRole)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const setRole = useCallback((r: RoleKey) => {
    setRoleState(r)
    try {
      localStorage.setItem('pl-role', r)
    } catch {
      /* storage unavailable */
    }
  }, [])

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      <ToastContext.Provider value={toast}>
        {children}
        <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
          {toasts.map((t) => {
            const Icon = { success: CheckCircle2, info: Info, warning: AlertTriangle, error: XCircle }[t.kind]
            const color = { success: 'text-emerald-400', info: 'text-sky-400', warning: 'text-amber-400', error: 'text-red-400' }[t.kind]
            return (
              <div key={t.id} className="pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-lg bg-ink-900 px-4 py-3 text-sm text-white shadow-lg">
                <Icon size={18} className={`mt-0.5 shrink-0 ${color}`} />
                <span>{t.message}</span>
              </div>
            )
          })}
        </div>
      </ToastContext.Provider>
    </RoleContext.Provider>
  )
}

export const useRole = () => useContext(RoleContext)
/** `toast('PO approved')` — shows a transient confirmation. Prototype actions use this instead of a backend. */
export const useToast = () => useContext(ToastContext)
