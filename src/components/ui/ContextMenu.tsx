import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/** 单条菜单项定义 */
export interface ContextMenuItem {
  /** 唯一 key */
  key: string
  /** 显示标签 */
  label: string
  /** 左侧图标（可选） */
  icon?: React.ReactNode
  /** 右侧快捷键提示（可选） */
  shortcut?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 是否显示为危险操作（红色） */
  danger?: boolean
  /** 点击回调 */
  onClick?: () => void
}

/** 分割线 */
export interface ContextMenuDivider {
  key: string
  type: 'divider'
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuDivider

interface ContextMenuProps {
  /** 菜单项列表 */
  items: ContextMenuEntry[]
  /** 像素位置（clientX / clientY） */
  position: { x: number; y: number }
  /** 请求关闭菜单 */
  onClose: () => void
}

/**
 * 通用右键菜单组件
 * - 自动检测边界、防止溢出屏幕
 * - 点击外部或按 Esc 关闭
 */
export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  /** 打开时聚焦第一个可用菜单项 */
  useEffect(() => {
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])')
    items?.[0]?.focus()
  }, [])

  /** 箭头键导航 */
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    const all = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
    const enabled = all.filter(i => !i.disabled)
    if (enabled.length === 0) return
    const idx = enabled.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      enabled[(idx + 1) % enabled.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      enabled[(idx - 1 + enabled.length) % enabled.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      enabled[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      enabled[enabled.length - 1]?.focus()
    }
  }

  /** 点击外部关闭 */
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleMouseDown, true)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  /** 计算防溢出的最终位置 */
  const MENU_W = 200
  const APPROX_ITEM_H = 28
  const MENU_H = items.length * APPROX_ITEM_H + 16 // 粗略估算菜单高度

  const left = Math.min(position.x, window.innerWidth - MENU_W - 8)
  const top = Math.min(position.y, window.innerHeight - MENU_H - 8)

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      className="liquid-glass-menu fixed z-[var(--z-popover)] py-1 select-none"
      style={{
        left,
        top,
        minWidth: MENU_W,
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-popover)',
      }}
      onContextMenu={e => e.preventDefault()}
      onKeyDown={handleMenuKeyDown}
    >
      {items.map(entry => {
        /* 分割线 */
        if ('type' in entry && entry.type === 'divider') {
          return (
            <div
              key={entry.key}
              style={{
                height: 1,
                margin: '4px 8px',
                backgroundColor: 'var(--color-border)',
              }}
            />
          )
        }

        /* 菜单项 */
        const item = entry as ContextMenuItem
        return (
          <button
            key={item.key}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return
              onClose()
              item.onClick?.()
            }}
            className={[
              'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors',
              'rounded-[var(--radius-sm)]',
              'focus-visible:outline-none focus-visible:bg-[var(--color-hover)]',
              item.disabled
                ? 'cursor-not-allowed'
                : 'cursor-pointer active:scale-[0.99] hover:bg-[var(--color-hover)]',
              item.danger &&
                !item.disabled &&
                'hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]',
            ].join(' ')}
            style={{
              color: item.disabled
                ? 'var(--color-text-muted)'
                : item.danger
                  ? 'var(--color-error)'
                  : 'var(--color-text)',
              opacity: item.disabled ? 0.45 : 1,
              fontSize: 12,
            }}
          >
            {/* 图标 */}
            {item.icon && (
              <span
                style={{
                  color: item.disabled
                    ? 'var(--color-text-muted)'
                    : item.danger
                      ? 'var(--color-error)'
                      : 'var(--color-text-secondary)',
                  width: 14,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {item.icon}
              </span>
            )}
            {/* 标签 */}
            <span className="flex-1">{item.label}</span>
            {/* 快捷键 */}
            {item.shortcut && (
              <span
                className="font-mono text-[10px] opacity-40 ml-2 flex-shrink-0"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {item.shortcut}
              </span>
            )}
          </button>
        )
      })}
    </div>,
    document.body,
  )
}
