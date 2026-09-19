import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

type Kind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  message: string
  kind: Kind
}

const Ctx = createContext<(message: string, kind?: Kind) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((message: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-2), { id, message, kind }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-sheet flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2.5 text-sm text-canvas shadow-lg"
          >
            <Icon
              name={t.kind === 'error' ? 'alert' : t.kind === 'success' ? 'check' : 'sync'}
              size={16}
              className={t.kind === 'error' ? 'text-bad' : t.kind === 'success' ? 'text-ok' : ''}
            />
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
