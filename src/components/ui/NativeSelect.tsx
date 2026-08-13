import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

/** 原生 select 的统一样式封装（轻量替代 Radix Select） */
const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className={cn('relative', className)}>
        <select
          className={cn(
            'flex h-7 w-full cursor-pointer appearance-none rounded-md border border-[var(--color-border)] bg-[var(--color-panel)] py-1 pl-2 pr-8 text-xs text-[var(--color-text)]',
            'transition-[border-color,box-shadow] duration-200 ease-out',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 focus:ring-offset-[var(--color-bg)] focus:border-[var(--color-accent)]',
            'hover:border-[var(--color-text-muted)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]"
        />
      </div>
    )
  }
)
NativeSelect.displayName = 'NativeSelect'

export { NativeSelect }
