import type { InputHTMLAttributes, ReactNode } from 'react'
import { useRTL } from '../../contexts/RTLContext'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
}

export default function Input({ label, error, hint, icon, className = '', ...props }: InputProps) {
  const { isRTL } = useRTL()
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="text-red-500 ms-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div
            className={`absolute inset-y-0 flex items-center pointer-events-none text-slate-400 ${
              isRTL ? 'end-3' : 'start-3'
            }`}
          >
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`
            w-full border border-slate-300 rounded-lg text-sm text-slate-900 bg-white
            placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
            transition-colors
            ${icon ? (isRTL ? 'pe-10' : 'ps-10') : 'px-3'} py-2.5
            ${error ? 'border-red-400 focus:ring-red-400' : ''}
            ${className}
          `}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
