import { type CSSProperties, type ReactNode } from 'react'
import { useEffectsStore } from '../../stores/effects-store'
import { cn } from '../../lib/utils'
import './glass-surface.css'

/**
 * 液态玻璃表面 — 纯 CSS 实现。
 *
 * 多层 box-shadow（内凹质感）+ 45° 渐变（玻璃反射）+ ::before / ::after 伪元素（光圈）。
 * 不使用 SVG 滤镜（色差/位移）或 backdrop-filter，避免花屏/色偏。
 */
interface GlassSurfaceProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** 圆角，默认 14px */
  cornerRadius?: number
  /** 内边距，默认 18px 22px */
  padding?: string
  /** 是否为浅色背景上的玻璃（调亮阴影） */
  overLight?: boolean
  /** 是否显示 45° 斜向高光渐变（玻璃反射） */
  highlight?: boolean
  onClick?: () => void
  title?: string
  role?: string
  tabIndex?: number
  onKeyDown?: (e: React.KeyboardEvent) => void
}

export default function GlassSurface({
  children,
  className,
  style,
  cornerRadius = 14,
  padding = '18px 22px',
  overLight = false,
  highlight = false,
  onClick,
  title,
  role,
  tabIndex,
  onKeyDown,
}: GlassSurfaceProps) {
  const enabled = useEffectsStore((s) => s.enabled)

  if (!enabled) {
    return (
      <div
        className={className}
        style={{
          borderRadius: cornerRadius,
          padding,
          // 关闭玻璃后提供正常面板质感，避免卡片纯白突兀
          backgroundColor: 'var(--color-panel)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          ...style,
        }}
        onClick={onClick}
        title={title}
        role={role}
        tabIndex={tabIndex}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    )
  }

  const isRound = cornerRadius >= 50

  return (
    <div
      className={cn(
        'luobi-glass',
        isRound ? 'luobi-glass--round' : 'luobi-glass--rect',
        highlight && 'luobi-glass--highlight',
        onClick && 'cursor-pointer',
        className,
      )}
      style={{
        borderRadius: isRound ? '50%' : cornerRadius,
        padding,
        boxShadow: overLight
          ? [
              'inset 2px -2px 1px -1px rgba(255,255,255,0.9)',
              'inset -2px 2px 1px -1px rgba(255,255,255,0.9)',
              'inset 6px -6px 1px -6px rgba(255,255,255,0.55)',
              'inset -6px 6px 1px -6px rgba(255,255,255,0.55)',
              'inset 0 0 2px rgba(0,0,0,0.5)',
              '0 4px 8px rgba(0,0,0,0.15)',
            ].join(', ')
          : [
              'inset 2px -2px 1px -1px rgba(255,255,255,0.65)',
              'inset -2px 2px 1px -1px rgba(255,255,255,0.65)',
              'inset 6px -6px 1px -6px rgba(255,255,255,0.35)',
              'inset -6px 6px 1px -6px rgba(255,255,255,0.35)',
              'inset 0 0 2px rgba(0,0,0,0.8)',
              '0 4px 8px rgba(0,0,0,0.2)',
            ].join(', '),
        border: '1px solid rgba(255,255,255,0.12)',
        ...style,
      }}
      onClick={onClick}
      title={title}
      role={role}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
    >
      {/* 用户内容（z-index 在伪元素之上） */}
      <div className="relative z-[3]">{children}</div>
    </div>
  )
}
