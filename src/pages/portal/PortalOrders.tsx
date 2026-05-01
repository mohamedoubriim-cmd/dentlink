import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Eye, Paperclip, Plus } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { StatusBadge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { getOrders } from '../../lib/api'
import type { Order, OrderStatus } from '../../types'
import { useRTL } from '../../contexts/RTLContext'

export default function PortalOrders() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getOrders().then((data) => { setOrders(data); setLoading(false) })
  }, [])

  const statusLabels: Record<OrderStatus, string> = {
    pending: t('status.pending'),
    in_progress: t('status.in_progress'),
    ready: t('status.ready'),
    delivered: t('status.delivered'),
    cancelled: t('status.cancelled'),
  }

  const counts = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    in_progress: orders.filter((o) => o.status === 'in_progress').length,
    ready: orders.filter((o) => o.status === 'ready').length,
  }

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-5">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-xl font-bold text-slate-800">{t('orders.title')}</h1>
        <Link to="/portal/new">
          <Button icon={<Plus size={15} />} size="sm">{t('orders.new_order')}</Button>
        </Link>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, color: 'bg-slate-100 text-slate-700' },
          { label: t('status.pending'), value: counts.pending, color: 'bg-amber-100 text-amber-700' },
          { label: t('status.in_progress'), value: counts.in_progress, color: 'bg-blue-100 text-blue-700' },
          { label: t('status.ready'), value: counts.ready, color: 'bg-purple-100 text-purple-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <Card padding={false}>
        {orders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm space-y-3">
            <p>{t('orders.no_orders')}</p>
            <Link to="/portal/new">
              <Button size="sm">{t('orders.new_order')}</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/portal/orders/${order.id}`}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="font-medium text-slate-800 text-sm">{order.patient_name}</span>
                    <span className="text-xs text-slate-400 font-mono">#{order.order_number}</span>
                    {(order.files?.length ?? 0) > 0 && (
                      <span className={`inline-flex items-center gap-1 text-xs text-primary-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Paperclip size={11} />
                        {order.files?.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t(`work_types.${order.work_type}`)} · {t(`materials.${order.material}`)}
                    {order.shade ? ` · ${order.shade}` : ''}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('orders.due_date')}: {new Date(order.due_date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}
                  </p>
                </div>
                <div className={`flex items-center gap-3 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <StatusBadge status={order.status} label={statusLabels[order.status]} />
                  <Eye size={15} className="text-slate-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
