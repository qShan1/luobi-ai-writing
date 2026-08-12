import { type CSSProperties, type ReactNode } from 'react'
import { useEffectsStore } from '../../stores/effects-store'
import { cn } from '../../lib/utils'

/**
 * 玻璃表面 — backdrop-filter 磨砂 + 高光层。
 *
 * 不使用 SVG 滤镜（位移折射 / 色差），因为它们在强色彩背景上
 * 会产生严重的 RGB 通道分离（彩虹重影 / 花屏）。
 * 玻璃质感靠 CSS backdrop-filter: blur + saturate 实现。
 */
interface GlassSurfaceProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** 圆角，默认 14px */
  cornerRadius?: number
  /** 内边距，默认 18px 22px */
  padding?: string
  /** 是否为浅色背景上的玻璃（自动调亮阴影/高光） */
  overLight?: boolean
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
  onClick,
  title,
  role,
  tabIndex,
  onKeyDown,
}: GlassSurfaceProps) {
  const enabled = useEffectsStore((s) => s.enabled)
  const blurAmount = useEffectsStore((s) => s.blurAmount)
  const saturation = useEffectsStore((s) => s.saturation)

  if (!enabled) {
    return (
      <div
        className={className}
        style={{ borderRadius: cornerRadius, padding, ...style }}
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

  const blur = (overLight ? 10 : 6) + blurAmount * 160

  return (
    <div
      className={cn('relative', onClick && 'cursor-pointer', className)}
      style={{ position: 'relative', ...style }}
    >
      {/* 玻璃主体 */}
      <div
        style={{
          borderRadius: cornerRadius,
          padding,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: overLight
            ? '0 10px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.55)'
            : '0 10px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12)',
          backdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
          WebkitBackdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
        }}
        onClick={onClick}
        title={title}
        role={role}
        tabIndex={tabIndex}
        onKeyDown={onKeyDown}
      >
        {/* 顶部高光 */}
        <span
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: '55%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 100%)',
          }}
        />
        {/* 用户内容保持清晰 */}
        <div className="relative z-[1]">{children}</div>
      </div>
    </div>
  )
}
