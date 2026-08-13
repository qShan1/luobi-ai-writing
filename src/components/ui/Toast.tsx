/* eslint-disable react-refresh/only-export-components */
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { IconBtn } from './IconBtn'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  type: ToastType
  message: string
  duration: number
}

let _toastCounter = 0
let _addToast: ((item: ToastItem) => void) | null = null

function ensureContainer() {
  if (document.getElementById('luobi-toast-root')) return
  const container = document.createElement('div')
  container.id = 'luobi-toast-root'
  document.body.appendChild(container)
  createRoot(container).render(<ToastContainer />)
}

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    _addToast = (item) => {
      setToasts(prev => [...prev, item])
    }
    return () => { _addToast = null }
  }, [])

  const remove = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="fixed bottom-10 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <ToastItemView key={t.id} item={t} onRemove={remove} />
      ))}
    </div>
  )
}

const TOAST_STYLE: Record<ToastType, { accent: string; icon: React.ReactNode }> = {
  success: {
    accent: 'var(--color-success)',
    icon: <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
  },
  error: {
    accent: 'var(--color-error)',
    icon: <AlertTriangle size={16} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
  },
  warning: {
    accent: 'var(--color-warning)',
    icon: <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
  },
  info: {
    accent: 'var(--color-info)',
    icon: <Info size={16} style={{ color: 'var(--color-info)', flexShrink: 0 }} />
  },
}

function ToastItemView({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const t2 = setTimeout(() => setIsExiting(true), item.duration - 300)
    const t3 = setTimeout(() => onRemove(item.id), item.duration)
    return () => { clearTimeout(t2); clearTimeout(t3) }
  }, [item.id, item.duration, onRemove])

  const { accent, icon } = TOAST_STYLE[item.type]

  return (
    <div
      className="pointer-events-auto flex items-start gap-3 px-4 py-3"
      style={{
        borderRadius: 'var(--radius-xl)',
        backgroundColor: `color-mix(in srgb, var(--color-sidebar) 90%, ${accent})`,
        backdropFilter: 'blur(24px)',
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${accent}`,
        boxShadow: 'var(--shadow-popover)',
        maxWidth: 380,
        minWidth: 260,
        animation: isExiting
          ? 'toast-exit 0.25s var(--ease-out) both'
          : 'toast-enter 0.3s var(--ease-out) both',
      }}
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <span
        className="flex-1 text-xs leading-relaxed"
        style={{
          color: 'var(--color-text)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {item.message}
      </span>
      <IconBtn size={18} onClick={() => onRemove(item.id)} title="关闭">
        <X size={13} />
      </IconBtn>
    </div>
  )
}

function show(message: string, type: ToastType = 'info', duration = 4000) {
  ensureContainer()
  const item: ToastItem = { id: ++_toastCounter, type, message, duration }
  requestAnimationFrame(() => _addToast?.(item))
}

export const toast = {
  success: (msg: string, duration = 3500) => show(msg, 'success', duration),
  error:   (msg: string, duration = 5000) => show(msg, 'error', duration),
  warning: (msg: string, duration = 4500) => show(msg, 'warning', duration),
  info:    (msg: string, duration = 4000) => show(msg, 'info', duration),
}
