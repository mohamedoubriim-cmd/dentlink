import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import OrdersTable from '../../components/ui/OrdersTable'
import { PageSpinner } from '../../components/ui/Spinner'
import { getOrders, hideOrderForDentist } from '../../lib/api'
import type { Order } from '../../types'
import { useRTL } from '../../contexts/RTLContext'

export default function PortalOrders() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [hideId, setHideId] = useState<string | null>(null)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    getOrders().then((data) => { setOrders(data); setLoading(false) })
  }, [])

  const counts = {
    total:       orders.length,
    pending:     orders.filter((o) => o.status === 'pending').length,
    in_progress: orders.filter((o) => o.status === 'in_progress').length,
    ready:       orders.filter((o) => o.status === 'ready').length,
  }

  const handleHide = async () => {
    if (!hideId) return
    const id = hideId
    setHideId(null)
    // Optimistic UI : retirer immédiatement la ligne
    const snapshot = orders
    setOrders((prev) => prev.filter((o) => o.id !== id))
    try {
      await hideOrderForDentist(id)
      setToast(true)
      setTimeout(() => setToast(false), 3000)
    } catch {
      // Rollback si l'appel échoue
      setOrders(snapshot)
    }
  }

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm px-5 py-2.5 rounded-xl shadow-lg pointer-events-none">
          Commande masquée
        </div>
      )}

      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-xl font-bold text-slate-800">{t('orders.title')}</h1>
        <Link to="/portal/new">
          <Button icon={<Plus size={15} />} size="sm">{t('orders.new_order')}</Button>
        </Link>
      </div>

      {/* Résumé par statut */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',                    value: counts.total,       color: 'bg-slate-100 text-slate-700'  },
          { label: t('status.pending'),        value: counts.pending,     color: 'bg-amber-100 text-amber-700'  },
          { label: t('status.in_progress'),    value: counts.in_progress, color: 'bg-blue-100 text-blue-700'    },
          { label: t('status.ready'),          value: counts.ready,       color: 'bg-purple-100 text-purple-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <OrdersTable
        orders={orders}
        showDentistColumn={false}
        detailBasePath="/portal/orders"
        onTrashClick={(id) => setHideId(id)}
      />

      {/* Modal confirmation "Masquer" */}
      <Modal
        open={!!hideId}
        onClose={() => setHideId(null)}
        title="Masquer cette commande ?"
        maxWidth="sm"
      >
        <p className="text-sm text-slate-600 mb-6">
          Cette commande sera retirée de votre liste mais restera visible pour le laboratoire.
        </p>
        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button variant="danger" onClick={handleHide} className="flex-1">
            Masquer
          </Button>
          <Button variant="outline" onClick={() => setHideId(null)} className="flex-1">
            Annuler
          </Button>
        </div>
      </Modal>
    </div>
  )
}
