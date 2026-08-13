/**
 * 通用图标按钮
 * 统一替换 AgentHeader.HeaderIconBtn 和 AgentConversation.ToolbarIconBtn
 *
 * 尺寸规范：
 * - 22: 活动栏图标 (22x22px)
 * - 18: 工具窗口栏图标 (18x18px)
 * - 14: 树形项目图标 (14x14px)
 * - 12: 状态栏图标 (12x12px)
 */
export interface IconBtnProps {
  children: React.ReactNode
  title: string
  onClick?: () => void
  disabled?: boolean
  /** 高亮激活态（背景 + 颜色加深） */
  active?: boolean
  /** 数字徽标（>0 时显示蓝色小圆点） */
  badge?: number
  /** 图标按钮尺寸 (px)，默认为 22 */
  size?: 12 | 18 | 22
}

export function IconBtn({ children, title, onClick, disabled, active, badge, size = 22 }: IconBtnProps) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`group relative flex items-center justify-center rounded-[var(--radius-sm)] transition-[background-color,color,transform,box-shadow] duration-200 ease-out hover:bg-[var(--color-hover)] hover:text-[var(--color-text)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg)] focus-visible:ring-[var(--color-accent)] disabled:pointer-events-none cursor-pointer ${
        active ? 'bg-[var(--color-hover)] text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'
      }`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
      {/* 数字徽标小圆点 */}
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full"
          style={{ backgroundColor: 'var(--color-accent)' }}
        />
      )}
    </button>
  )
}
