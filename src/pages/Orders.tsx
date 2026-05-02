import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import OrdersTable from '../components/ui/OrdersTable'
import { PageSpinner } from '../components/ui/Spinner'
import { getOrders, deleteOrder } from '../lib/api'
import type { Order } from '../types'
import { useRTL } from '../contexts/RTLContext'
import { useAuth } from '../contexts/AuthContext'

export default function Orders() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const { role } = useAuth()
  const canDelete = role === 'lab_admin'
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    getOrders().then((data) => { setOrders(data); setLoading(false) })
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    await deleteOrder(deleteId)
    setOrders((prev) => prev.filter((o) => o.id !== deleteId))
    setDeleteId(null)
  }

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-5">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-slate-800">{t('orders.title')}</h1>
        <Link to="/orders/new">
          <Button icon={<Plus size={16} />}>{t('orders.new_order')}</Button>
        </Link>
      </div>

      <OrdersTable
        orders={orders}
        detailBasePath="/orders"
        onTrashClick={canDelete ? (id) => setDeleteId(id) : undefined}
      />

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
