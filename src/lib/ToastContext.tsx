/* eslint-disable react-refresh/only-export-components -- context + hook intentionally co-located */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error'
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastItem['type']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function ToastEntry({
  toast,
  onRemove,
}: {
  toast: ToastItem
  onRemove: (id: string) => void
}) {
  const [visible, setVisible] = useState(false)
  const { id } = toast

  useEffect(() => {
    const enter = setTimeout(() => setVisible(true), 10)
    const startExit = setTimeout(() => setVisible(false), 3500)
    const remove = setTimeout(() => onRemove(id), 3800)
    return () => {
      clearTimeout(enter)
      clearTimeout(startExit)
      clearTimeout(remove)
    }
  }, [id, onRemove])

  return (
    <div
      className={[
        'flex min-w-[220px] items-center rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-lg',
        'border-l-4',
        toast.type === 'error' ? 'border-l-red-500' : 'border-l-green-500',
        'transition-all duration-300',
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
      ].join(' ')}
    >
      <span className="text-sm font-medium text-gray-900">{toast.message}</span>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback(
    (message: string, type: ToastItem['type'] = 'success') => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { id, message, type }])
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {toasts.map((toast) => (
          <ToastEntry key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
