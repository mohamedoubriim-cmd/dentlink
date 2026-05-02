import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Trash2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import Modal from '../components/ui/Modal'
import { getOrders, deleteOrder } from '../lib/api'
import type { Order, OrderStatus } from '../types'
import { useRTL } from '../contexts/RTLContext'
import { useAuth } from '../contexts/AuthContext'

const ALL = 'all'

export default function Orders() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const { role } = useAuth()
  const canDelete = role === 'lab_admin'
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | typeof ALL>(ALL)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    getOrders().then((data) => {
      setOrders(data)
      setLoading(false)
    })
  }, [])

  const statusOptions: (OrderStatus | typeof ALL)[] = [
    ALL,
    'pending',
    'in_progress',
    'ready',
    'delivered',
    'cancelled',
  ]

  const statusLabel = (s: OrderStatus | typeof ALL) =>
    s === ALL ? t('orders.all_statuses') : t(`status.${s}`)

  const filtered = orders.filter((o) => {
    const matchSearch =
      !search ||
      o.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.dentist?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === ALL || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleDelete = async () => {
    if (!deleteId) return
    await deleteOrder(deleteId)
    setOrders((prev) => prev.filter((o) => o.id !== deleteId))
    setDeleteId(null)
  }

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-slate-800">{t('orders.title')}</h1>
        <Link to="/orders/new">
          <Button icon={<Plus size={16} />}>{t('orders.new_order')}</Button>
        </Link>
      </div>

      <Card padding={false}>
        {/* Filters */}
        <div className={`flex flex-col sm:flex-row gap-3 p-5 border-b border-slate-100 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          <div className="relative flex-1">
            <Search
              size={16}
              className={`absolute inset-y-0 my-auto text-slate-400 ${isRTL ? 'end-3' : 'start-3'}`}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('orders.search_placeholder')}
              className={`w-full border border-slate-300 rounded-lg text-sm py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'pe-4 ps-9' : 'ps-9 pe-4'}`}
            />
          </div>
          <div className={`flex gap-1.5 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {statusLabel(s)}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <ClipboardListIcon />
            <p className="mt-2 text-sm">{t('orders.no_orders')}</p>
          </div>
        )}

        {/* Mobile cards */}
        {filtered.length > 0 && (
          <div className="md:hidden divide-y divide-slate-100">
            {filtered.map((order) => (
              <div key={order.id} className="p-4 space-y-2">
                <div className={`flex items-start justify-between gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div>
                    <p className="font-medium text-slate-800">{order.patient_name}</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">#{order.order_number}</p>
                  </div>
                  <StatusBadge status={order.status} label={t(`status.${order.status}`)} />
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  {order.dentist?.name && <p>{order.dentist.name}</p>}
                  <p>{t(`work_types.${order.work_type}`)} · {new Date(order.due_date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}</p>
                  <p className="font-semibold text-slate-700">{order.price.toLocaleString()} {t('common.currency')}</p>
                </div>
                <div className={`flex gap-2 pt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Link to={`/orders/${order.id}`}>
                    <button className="p-2 rounded-lg bg-primary-50 text-primary-600">
                      <Eye size={15} />
                    </button>
                  </Link>
                  {canDelete && (
                    <button
                      onClick={() => setDeleteId(order.id)}
                      className="p-2 rounded-lg bg-red-50 text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Desktop table */}
        {filtered.length > 0 && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {[
                    t('orders.order_number'),
                    t('orders.patient'),
                    t('orders.dentist'),
                    t('orders.work_type'),
                    t('orders.due_date'),
                    t('orders.price'),
                    t('orders.status'),
                    t('common.actions'),
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className={`px-4 py-3 font-mono text-xs text-slate-500 ${isRTL ? 'text-right' : ''}`}>
                      {order.order_number}
                    </td>
                    <td className={`px-4 py-3 font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>
                      {order.patient_name}
                    </td>
                    <td className={`px-4 py-3 text-slate-600 ${isRTL ? 'text-right' : ''}`}>
                      {order.dentist?.name ?? '—'}
                    </td>
                    <td className={`px-4 py-3 text-slate-600 ${isRTL ? 'text-right' : ''}`}>
                      {t(`work_types.${order.work_type}`)}
                    </td>
                    <td className={`px-4 py-3 text-slate-600 ${isRTL ? 'text-right' : ''}`}>
                      {new Date(order.due_date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}
                    </td>
                    <td className={`px-4 py-3 font-semibold text-slate-700 ${isRTL ? 'text-right' : ''}`}>
                      {order.price.toLocaleString()} {t('common.currency')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} label={t(`status.${order.status}`)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Link to={`/orders/${order.id}`}>
                          <button className="p-1.5 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors">
                            <Eye size={15} />
                          </button>
                        </Link>
                        {canDelete && (
                          <button
                            onClick={() => setDeleteId(order.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            {t('common.showing')} {filtered.length} {t('common.results')}
          </div>
        )}
      </Card>

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title={t('orders.delete_confirm')}
        maxWidth="sm"
      >
        <p className="text-sm text-slate-600 mb-6">{t('orders.delete_confirm')}</p>
        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button variant="danger" onClick={handleDelete} className="flex-1">
            {t('common.delete')}
          </Button>
          <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function ClipboardListIcon() {
  return (
    <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}
