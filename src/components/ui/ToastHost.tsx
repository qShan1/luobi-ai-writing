/* eslint-disable react-refresh/only-export-components */
import { createRoot } from 'react-dom/client'
import { useCallback, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Info, Sparkles, X } from 'lucide-react'
import i18n from '../../i18n'
import { Button } from './Button'
import { IconBtn } from './IconBtn'

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'ai'

export interface ToastAction {
  label: string
  onClick?: () => void | Promise<void>
  variant?: 'primary' | 'ghost'
}

export interface ToastHostPayload {
  type: ToastType
  title?: string
  message: string
  actions?: ToastAction[]
  duration: number
}

interface ToastItem extends ToastHostPayload {
  id: number
}

const EXIT_MS = 150

let _counter = 0
let _add: ((item: ToastItem) => void) | null = null
let _remove: ((id: number) => void) | null = null

function ensureHost() {
  if (document.getElementById('luobi-toast-root')) return
  const container = document.createElement('div')
  container.id = 'luobi-toast-root'
  document.body.appendChild(container)
  createRoot(container).render(<ToastHost />)
}

export function toastHost(payload: ToastHostPayload) {
  ensureHost()
  const item: ToastItem = { id: ++_counter, ...payload }
  requestAnimationFrame(() => _add?.(item))
}

export function dismissToast(id: number) {
  _remove?.(id)
}

function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    _add = (item) => setItems(prev => [item, ...prev])
    _remove = (id) => setItems(prev => prev.filter(t => t.id !== id))
    return () => { _add = null; _remove = null }
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {items.map(item => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  )
}

const TYPE_STYLE: Record<ToastType, { accent: string; icon: React.ReactNode }> = {
  success: {
    accent: 'var(--color-success)',
    icon: <CheckCircle2 size={15} style={{ color: 'var(--color-success)', flexShrink: 0 }} />,
  },
  error: {
    accent: 'var(--color-error)',
    icon: <AlertTriangle size={15} style={{ color: 'var(--color-error)', flexShrink: 0 }} />,
  },
  warning: {
    accent: 'var(--color-warning)',
    icon: <AlertTriangle size={15} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />,
  },
  info: {
    accent: 'var(--color-info)',
    icon: <Info size={15} style={{ color: 'var(--color-info)', flexShrink: 0 }} />,
  },
  ai: {
    accent: 'var(--color-accent)',
    icon: <Sparkles size={15} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />,
  },
}

function ToastCard({ item }: { item: ToastItem }) {
  const [isExiting, setIsExiting] = useState(false)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (item.duration <= 0) return
    const t1 = setTimeout(() => setIsExiting(true), item.duration - EXIT_MS)
    const t2 = setTimeout(() => dismissToast(item.id), item.duration)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [item.id, item.duration])

  const dismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => dismissToast(item.id), EXIT_MS)
  }, [item.id])

  const handleAction = async (action: ToastAction) => {
    if (action.onClick) await action.onClick()
    dismiss()
  }

  const { accent, icon } = TYPE_STYLE[item.type]

  return (
    <motion.div layout={!reduce} transition={{ layout: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } }}>
      <div
        className={`toast-card ${isExiting ? 'toast-card--exit' : 'toast-card--enter'}`}
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          minWidth: 280,
          maxWidth: 400,
          padding: '12px 14px',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'color-mix(in srgb, var(--color-panel) 80%, transparent)',
          backdropFilter: 'blur(24px) saturate(1.3)',
          border: '1px solid color-mix(in srgb, var(--color-border) 80%, transparent)',
          borderLeft: `3px solid ${accent}`,
          boxShadow: 'var(--shadow-popover)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span
            className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
            style={{ backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)` }}
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div className="min-w-0">
                {item.title && (
                  <div className="text-sm font-medium leading-snug" style={{ color: 'var(--color-text)' }}>
                    {item.title}
                  </div>
                )}
                <div
                  className={item.title ? 'text-xs leading-relaxed' : 'text-sm font-medium leading-snug'}
                  style={{
                    color: item.title ? 'var(--color-text-secondary)' : 'var(--color-text)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {item.message}
                </div>
              </div>
              <IconBtn size={18} onClick={dismiss} title={i18n.t('close', { ns: 'common', defaultValue: '关闭' })}>
                <X size={13} />
              </IconBtn>
            </div>
            {item.actions && item.actions.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 10 }}>
                {item.actions.map(action => (
                  <Button
                    key={action.label}
                    variant={action.variant === 'ghost' ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => handleAction(action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
