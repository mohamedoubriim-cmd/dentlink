import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export default function Select({ label, error, options, placeholder, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {props.required && <span className="text-red-500 ms-1">*</span>}
        </label>
      )}
      <select
        {...props}
        className={`
          w-full border border-slate-300 rounded-lg text-sm text-slate-900 bg-white
          px-3 py-2.5 appearance-none
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          disabled:bg-slate-50 disabled:cursor-not-allowed
          transition-colors
          ${error ? 'border-red-400 focus:ring-red-400' : ''}
          ${className}
        `}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
