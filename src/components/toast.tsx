'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  closing: boolean
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  info:    Info,
}

const STYLES = {
  success: 'border-[#38A169]/30 text-[#38A169]',
  error:   'border-[#E53E3E]/30 text-[#E53E3E]',
  info:    'border-[#2B6CB0]/30 text-[#2B6CB0]',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type, closing: false }])

    // Start close animation at 2.7s
    setTimeout(() => {
      setToasts(prev =>
        prev.map(t => (t.id === id ? { ...t, closing: true } : t))
      )
    }, 2700)

    // Remove item at 3s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const dismiss = (id: string) => {
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, closing: true } : t)))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 220)
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast stack — fixed top-right */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: '22rem' }}
      >
        {toasts.map(t => {
          const Icon = ICONS[t.type]
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 pl-4 pr-3 py-3 rounded-xl bg-white border shadow-lg text-sm font-medium
                ${STYLES[t.type]}
                ${t.closing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
            >
              <Icon size={16} className="mt-0.5 shrink-0" />
              <span className="flex-1 text-gray-800 font-normal">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors mt-0.5"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
