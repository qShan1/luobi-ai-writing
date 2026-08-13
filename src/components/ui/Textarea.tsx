import * as React from 'react'
import { cn } from '../../lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 py-1.5 text-xs text-[var(--color-text)]',
          'placeholder:text-[var(--color-text-muted)]',
          'transition-[border-color,box-shadow,background-color] duration-150 ease-[var(--ease-out)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 focus:ring-offset-[var(--color-bg)]',
          'focus:border-[var(--color-accent)]',
          'hover:border-[var(--color-text-muted)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-y min-h-[60px]',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
