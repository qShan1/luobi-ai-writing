import { createPortal } from 'react-dom'
import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react'

interface PopoverProps {
  open: boolean
  triggerRef: RefObject<HTMLElement | null>
  /** 放置方向：above = 在触发器上方展开，below = 在触发器下方展开 */
  placement?: 'above' | 'below'
  /** 水平对齐：start = 对齐触发器起始边，end = 对齐触发器结束边 */
  align?: 'start' | 'end'
  /** 与触发器的间距（px） */
  gap?: number
  /** 点击触发器与浮层之外时关闭（不传则不监听外部点击） */
  onClose?: () => void
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * 通用浮层容器：Portal 到 body 的 fixed 定位，避免被祖先
 * overflow-hidden / 滚动容器 / backdrop-filter 创建的 stacking context 裁剪或遮挡。
 * 打开时监听 scroll / resize / 触发器尺寸变化自动重定位。
 */
export default function Popover({
  open,
  triggerRef,
  placement = 'above',
  align = 'start',
  gap = 8,
  onClose,
  className,
  style,
  children,
}: PopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const apply = useCallback(() => {
    const el = triggerRef.current
    const box = containerRef.current
    if (!el || !box) return
    const r = el.getBoundingClientRect()
    box.style.left = ''
    box.style.right = ''
    box.style.top = ''
    box.style.bottom = ''
    if (align === 'end') box.style.right = `${window.innerWidth - r.right}px`
    else box.style.left = `${r.left}px`
    if (placement === 'above') box.style.bottom = `${window.innerHeight - r.top + gap}px`
    else box.style.top = `${r.bottom + gap}px`
  }, [triggerRef, placement, align, gap])

  useLayoutEffect(() => {
    if (!open) return
    apply()
    window.addEventListener('resize', apply)
    window.addEventListener('scroll', apply, true)
    const el = triggerRef.current
    const ro = el ? new ResizeObserver(apply) : null
    if (ro && el) ro.observe(el)
    return () => {
      window.removeEventListener('resize', apply)
      window.removeEventListener('scroll', apply, true)
      ro?.disconnect()
    }
  }, [open, apply, triggerRef])

  useEffect(() => {
    if (!open || !onClose) return
    const listener = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (containerRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [open, onClose, triggerRef])

  if (!open) return null

  return createPortal(
    <div ref={containerRef} className={className} style={{ position: 'fixed', ...style }}>
      {children}
    </div>,
    document.body,
  )
}
