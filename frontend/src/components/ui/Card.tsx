import type { HTMLAttributes } from 'react'

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={['bg-slate-800 rounded-2xl p-4 border border-slate-700', className].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
