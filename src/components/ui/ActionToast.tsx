/* eslint-disable react-refresh/only-export-components */
import { createRoot } from 'react-dom/client'
import { useEffect, useState, useCallback } from 'react'
import { X, CheckCircle2, AlertTriangle, Info, Sparkles } from 'lucide-react'
import i18n from '../../i18n'
import { Button } from './Button'
import { IconBtn } from './IconBtn'

export type ActionToastType = 'success' | 'info' | 'warning' | 'ai'

export interface ActionToastAction {
  label: string
  onClick?: () => void | Promise<void>
  variant?: 'primary' | 'ghost'
}

export interface ActionToastOptions {
  type?: ActionToastType
  message: string
  actions?: ActionToastAction[]
  duration?: number
}

interface ActionToastItem extends ActionToastOptions {
  id: number
}

let _counter = 0
let _addItem: ((item: ActionToastItem) => void) | null = null

function ensureContainer() {
  if (document.getElementById('luobi-action-toast-root')) return
  const container = document.createElement('div')
  container.id = 'luobi-action-toast-root'
  document.body.appendChild(container)
  createRoot(container).render(<ActionToastContainer />)
}

function ActionToastContainer() {
  const [items, setItems] = useState<ActionToastItem[]>([])

  useEffect(() => {
    _addItem = (item) => {
      setItems(prev => [...prev, item])
    }
    return () => { _addItem = null }
  }, [])

  const remove = useCallback((id: number) => {
    setItems(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 48,
        right: 20,
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {items.map(item => (
        <ActionToastCard key={item.id} item={item} onRemove={remove} />
      ))}
    </div>
  )
}

const TYPE_STYLE: Record<ActionToastType, { accent: string; icon: React.ReactNode }> = {
  success: {
    accent: 'var(--color-success)',
    icon: <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />,
  },
  info: {
    accent: 'var(--color-info)',
    icon: <Info size={16} style={{ color: 'var(--color-info)', flexShrink: 0 }} />,
  },
  warning: {
    accent: 'var(--color-warning)',
    icon: <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />,
  },
  ai: {
    accent: 'var(--color-accent)',
    icon: <Sparkles size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />,
  },
}

function ActionToastCard({ item, onRemove }: { item: ActionToastItem; onRemove: (id: number) => void }) {
  const [isExiting, setIsExiting] = useState(false)
  const duration = item.duration ?? 8000

  useEffect(() => {
    let t2: ReturnType<typeof setTimeout>
    let t3: ReturnType<typeof setTimeout>
    if (duration > 0) {
      t2 = setTimeout(() => setIsExiting(true), duration - 300)
      t3 = setTimeout(() => onRemove(item.id), duration)
    }
    return () => {
      if (t2) clearTimeout(t2)
      if (t3) clearTimeout(t3)
    }
  }, [item.id, duration, onRemove])

  const dismiss = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(item.id), 250)
  }

  const handleAction = async (action: ActionToastAction) => {
    if (action.onClick) {
      await action.onClick()
    }
    dismiss()
  }

  const { accent, icon } = TYPE_STYLE[item.type || 'info']

  return (
    <div
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 14px',
        borderRadius: 'var(--radius-xl)',
        backgroundColor: `color-mix(in srgb, var(--color-sidebar) 90%, ${accent})`,
        backdropFilter: 'blur(24px)',
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${accent}`,
        boxShadow: 'var(--shadow-popover)',
        maxWidth: 400,
        minWidth: 260,
        animation: isExiting
          ? 'toast-exit 0.25s var(--ease-out) both'
          : 'toast-enter 0.3s var(--ease-out) both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {icon}
        <span
          style={{
            flex: 1,
            fontSize: 12,
            lineHeight: 1.6,
            color: 'var(--color-text)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {item.message}
        </span>
        <IconBtn
          size={18}
          onClick={dismiss}
          title={i18n.t('common.close', '关闭')}
        >
          <X size={12} />
        </IconBtn>
      </div>

      {item.actions && item.actions.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          {item.actions.map((action, i) => (
            <Button
              key={i}
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
  )
}

export const actionToast = {
  show: (options: ActionToastOptions) => {
    ensureContainer()
    const item: ActionToastItem = { id: ++_counter, ...options }
    requestAnimationFrame(() => _addItem?.(item))
  },

  workflowComplete: (message: string, openAction?: () => void | Promise<void>) => {
    ensureContainer()
    const actions: ActionToastAction[] = []
    if (openAction) {
      actions.push({ label: i18n.t('common.openAndView', '打开查看'), onClick: openAction })
      actions.push({ label: i18n.t('common.ignore', '忽略'), variant: 'ghost' })
    }
    const item: ActionToastItem = {
      id: ++_counter,
      type: 'ai',
      message,
      actions,
      duration: openAction ? 10000 : 6000,
    }
    requestAnimationFrame(() => _addItem?.(item))
  },
}
