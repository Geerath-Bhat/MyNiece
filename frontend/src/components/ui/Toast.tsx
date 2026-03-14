import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : AlertCircle
  const iconColor = type === 'success' ? 'text-emerald-400' : type === 'error' ? 'text-red-400' : 'text-violet-400'
  const borderColor = type === 'success' ? 'rgba(52,211,153,0.25)' : type === 'error' ? 'rgba(248,113,113,0.25)' : 'rgba(167,139,250,0.25)'

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl max-w-xs"
      style={{
        background: '#1a1630',
        border: `1px solid ${borderColor}`,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
      <p className="text-sm text-slate-200 flex-1">{message}</p>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300) }}>
        <X className="w-4 h-4 text-slate-500 hover:text-slate-300 transition-colors" />
      </button>
    </div>
  )
}

// ── Toast container + hook ────────────────────────────────────────
interface ToastItem { id: string; message: string; type: ToastType }

let _setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null

export function toast(message: string, type: ToastType = 'info') {
  _setToasts?.(prev => [...prev, { id: Date.now().toString(), message, type }])
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  _setToasts = setToasts

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <Toast
            message={t.message}
            type={t.type}
            onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          />
        </div>
      ))}
    </div>
  )
}
