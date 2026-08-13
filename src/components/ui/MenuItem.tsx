/**
 * 通用菜单项按钮
 * 统一替换 AgentHeader.MoreMenuItem 和 ActivityBar.MenuAction
 */
import { useTranslation } from 'react-i18next'

export interface MenuItemProps {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  shortcut?: string
  disabled?: boolean
  danger?: boolean
}

export function MenuItem({ label, onClick, icon, shortcut, disabled, danger }: MenuItemProps) {
  const { t } = useTranslation()
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={[
        'w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
        'rounded-[var(--radius-sm)]',
        'focus-visible:outline-none focus-visible:bg-[var(--color-hover)]',
        disabled
          ? 'cursor-not-allowed'
          : 'cursor-pointer active:scale-[0.99] hover:bg-[var(--color-hover)]',
        danger && !disabled && 'hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]',
      ].join(' ')}
      style={{
        color: danger
          ? 'var(--color-error)'
          : disabled
          ? 'var(--color-text-muted)'
          : 'var(--color-text)',
      }}
    >
      {icon && (
        <span style={{ color: danger ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
          {icon}
        </span>
      )}
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-[0.7rem] opacity-40 font-mono ml-2 flex-shrink-0">{shortcut}</span>
      )}
      {disabled && (
        <span className="ml-auto text-[0.7rem] opacity-40">{t('comingSoon')}</span>
      )}
    </button>
  )
}
