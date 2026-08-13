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
  const badgeColorResolved = badgeColor || (badgeDone ? 'var(--color-success)' : 'var(--color-text-muted)')
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
          className="text-[0.65rem] font-medium leading-none px-1.5 py-1 rounded-full flex-shrink-0 ml-1"
          style={{
            color: badgeColorResolved,
            backgroundColor: `color-mix(in srgb, ${badgeColorResolved} 12%, transparent)`,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}
