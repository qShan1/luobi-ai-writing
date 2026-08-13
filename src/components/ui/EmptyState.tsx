import React from 'react'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  message: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyState({ icon, message, description, action, className, style, children, ...props }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center h-full gap-2.5 px-6 text-center ${className || ''}`}
      style={style}
      {...props}
    >
      {icon && (
        <div
          className="flex items-center justify-center mb-1 flex-shrink-0"
          style={{
            width: 52,
            height: 52,
            borderRadius: 'var(--radius-xl)',
            backgroundColor: 'var(--color-skeleton)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {icon}
        </div>
      )}
      <span className="text-title-panel">{message}</span>
      {description && (
        <span className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </span>
      )}
      {action && <div className="mt-2">{action}</div>}
      {children}
    </div>
  )
}
