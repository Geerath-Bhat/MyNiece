import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded-xl bg-slate-800 border border-slate-600 text-slate-100',
            'px-4 py-3 text-base outline-none transition-colors',
            'focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
            'placeholder:text-slate-500',
            error ? 'border-red-500' : '',
            className,
          ].join(' ')}
          {...rest}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
