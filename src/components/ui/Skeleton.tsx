import * as React from 'react'
import { cn } from '../../lib/utils'

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('rounded-[var(--radius-md)]', className)}
        style={{
          backgroundColor: 'var(--color-skeleton)',
          animation: 'skeleton-pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          ...props.style,
        }}
        {...props}
      />
    )
  }
)
Skeleton.displayName = 'Skeleton'

export { Skeleton }
