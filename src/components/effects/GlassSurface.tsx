import { type CSSProperties, type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react'
import { GlassFilter } from '../../vendor/liquid-glass/LiquidGlass'
import { useEffectsStore } from '../../stores/effects-store'
import { cn } from '../../lib/utils'

/**
 * 液态玻璃表面（流内布局版）。
 *
 * 基于 liquid-glass-react（MIT）的 SVG 位移折射 + 背景磨砂 + 边缘高光实现，
 * 改造为可直接嵌入布局的普通块级元素（无居中定位副作用）。
 *
 * 参数均读取全局效果设置（useEffectsStore），可在设置面板调节。
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
  const displacementScale = useEffectsStore((s) => s.displacementScale)
  const blurAmount = useEffectsStore((s) => s.blurAmount)
  const saturation = useEffectsStore((s) => s.saturation)
  const aberrationIntensity = useEffectsStore((s) => s.aberrationIntensity)
  const elasticity = useEffectsStore((s) => s.elasticity)
  const mode = useEffectsStore((s) => s.mode)

  const filterId = useId()
  const glassRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)
  const [active, setActive] = useState(false)

  // 追踪自身尺寸，供 SVG filter 的 displacement map 使用
  useEffect(() => {
    const el = glassRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      setSize((prev) =>
        Math.abs(prev.width - r.width) > 1 || Math.abs(prev.height - r.height) > 1
          ? { width: r.width, height: r.height }
          : prev,
      )
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 鼠标进入时平滑过渡位移映射
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = glassRef.current?.getBoundingClientRect()
    if (!rect) return
    setMouse({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    })
  }, [])

  if (!enabled) {
    return (
      <div
        ref={glassRef}
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

  // 弹性：鼠标越靠近元素中心，位移越柔和
  const ease = hovered || active ? 1 : 0.4
  const scale = 1 + (active ? -0.02 : hovered ? 0.012 : 0) + Math.max(0, 0.6 - Math.hypot(mouse.x - 0.5, mouse.y - 0.5) * 1.2) * elasticity * ease * 0.12

  return (
    <div
      className={cn('relative', onClick && 'cursor-pointer', className)}
      style={{ position: 'relative', ...style }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
    >
      {/* 折射 + 色差滤镜层 */}
      <GlassFilter
        mode={mode}
        id={filterId}
        displacementScale={displacementScale}
        aberrationIntensity={aberrationIntensity}
        width={size.width || 300}
        height={size.height || 80}
      />

      {/* 玻璃主体 */}
      <div
        ref={glassRef}
        style={{
          borderRadius: cornerRadius,
          padding,
          position: 'relative',
          overflow: 'hidden',
          transform: `scale(${scale.toFixed(4)})`,
          transformOrigin: `${mouse.x * 100}% ${mouse.y * 100}%`,
          transition: 'transform 200ms ease-out',
          boxShadow: overLight
            ? '0 10px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.55)'
            : '0 10px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12)',
          filter: `url(#${filterId})`,
          backdropFilter: `blur(${(overLight ? 10 : 6) + blurAmount * 160}px) saturate(${saturation}%)`,
          WebkitBackdropFilter: `blur(${(overLight ? 10 : 6) + blurAmount * 160}px) saturate(${saturation}%)`,
        }}
        onClick={onClick}
        onMouseDown={() => setActive(true)}
        onMouseUp={() => setActive(false)}
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
