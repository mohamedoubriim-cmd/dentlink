import type { ReactNode } from 'react'
import type { OrderStatus } from '../../types'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
}

const variants = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
}

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
}

export default function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  )
}

const statusConfig: Record<OrderStatus, { variant: BadgeProps['variant']; dot: string }> = {
  pending: { variant: 'warning', dot: 'bg-amber-400' },
  in_progress: { variant: 'info', dot: 'bg-blue-400' },
  ready: { variant: 'purple', dot: 'bg-purple-400' },
  delivered: { variant: 'success', dot: 'bg-green-400' },
  cancelled: { variant: 'danger', dot: 'bg-red-400' },
}

export function StatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  const cfg = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
        variants[cfg.variant ?? 'default']
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  )
}

export function PaymentBadge({ status }: { status: 'inte_betald' | 'betald' }) {
  if (status === 'betald') return <Badge variant="success">Payé</Badge>
  return <Badge variant="warning">Non payé</Badge>
}
