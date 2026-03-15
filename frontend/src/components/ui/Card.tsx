import type { HTMLAttributes } from 'react'

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={['glass-strong rounded-2xl p-4', className].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
