import React from 'react'
import { renderIcon } from './SidebarSharedUtils'

export function LeafItem({
  iconName,
  label,
  desc,
  badge,
  badgeDone,
  badgeColor,
  onClick,
  onContextMenu,
}: {
  iconName: string
  label: string
  desc?: string
  badge?: string
  badgeDone?: boolean
  badgeColor?: string
  onClick?: () => void
  onContextMenu?: (event: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      className="tree-item gap-1.5 cursor-pointer select-none w-full bg-transparent border-none py-0 text-left"
      style={{ paddingLeft: 10 }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={desc}
    >
      <span style={{ width: 12, flexShrink: 0 }} />
      <span className="flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{renderIcon(iconName, 14)}</span>
      <span className="text-sm font-medium flex-1 min-w-0 truncate" style={{ color: 'var(--color-text)' }}>{label}</span>
      {badge && (
        <span
          className="text-[0.7rem] flex-shrink-0 ml-1"
          style={{ color: badgeColor || (badgeDone ? 'var(--color-success)' : 'var(--color-text-muted)') }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}
