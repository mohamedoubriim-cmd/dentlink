import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ClipboardList,
  Clock,
  TrendingUp,
  DollarSign,
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Card, { CardHeader, CardTitle } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'
import { getOrders, getStatsResetAt, resetDashboardStats } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import type { Order, OrderStatus } from '../types'
import { useRTL } from '../contexts/RTLContext'

interface StatCard {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  bg: string
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const { role } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [resetAt, setResetAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    Promise.all([getOrders(), getStatsResetAt()]).then(([o, r]) => {
      setOrders(o)
      setResetAt(r)
      setLoading(false)
    })
  }, [])

  if (loading) return <PageSpinner />

  const thisMonth = new Date().toISOString().slice(0, 7)

  const totalOrders = orders.length
  const pendingOrders = orders.filter((o) => o.status === 'pending').length
  const inProgressOrders = orders.filter((o) => o.status === 'in_progress').length

  // Betald sedan nollställning
  const paidSinceReset = orders.filter(
    (o) => o.payment_status === 'betald' && (!resetAt || (o.paid_at ?? o.updated_at) >= resetAt)
  )

  const totalEarned = paidSinceReset.reduce((sum, o) => sum + (o.price ?? 0), 0)

  const monthlyEarned = paidSinceReset
    .filter((o) => (o.paid_at ?? o.updated_at).startsWith(thisMonth))
    .reduce((sum, o) => sum + (o.price ?? 0), 0)

  const handleReset = async () => {
    setResetting(true)
    try {
      await resetDashboardStats()
      setResetAt(new Date().toISOString())
    } finally {
      setResetting(false)
      setShowResetDialog(false)
    }
  }

  const stats: StatCard[] = [
    {
      label: t('dashboard.total_orders'),
      value: totalOrders,
      icon: <ClipboardList size={22} />,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      label: t('dashboard.pending_orders'),
      value: pendingOrders,
      icon: <Clock size={22} />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: t('dashboard.in_progress_orders'),
      value: inProgressOrders,
      icon: <TrendingUp size={22} />,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: `Encaissé ce mois`,
      value: `${monthlyEarned.toLocaleString()} ${t('common.currency')}`,
      icon: <DollarSign size={22} />,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ]

  const recentOrders = orders.slice(0, 5)

  // Periodeintäkter + ej betalda — visas bara för lab_admin
  const todayStr = new Date().toISOString().slice(0, 10)
  const monday = new Date()
  monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1))
  const startOfWeekStr = monday.toISOString().slice(0, 10)

  const paidAll = orders.filter((o) => o.payment_status === 'betald')
  const revenueToday = paidAll.filter((o) => (o.paid_at ?? '').slice(0, 10) === todayStr).reduce((s, o) => s + (o.price ?? 0), 0)
  const revenueWeek  = paidAll.filter((o) => (o.paid_at ?? '').slice(0, 10) >= startOfWeekStr).reduce((s, o) => s + (o.price ?? 0), 0)
  const revenueMonth = paidAll.filter((o) => (o.paid_at ?? '').startsWith(thisMonth)).reduce((s, o) => s + (o.price ?? 0), 0)

  const unpaidOrders = orders
    .filter((o) => o.payment_status === 'inte_betald' && o.status === 'delivered')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)

  const statusLabels: Record<OrderStatus, string> = {
    pending: t('status.pending'),
    in_progress: t('status.in_progress'),
    ready: t('status.ready'),
    delivered: t('status.delivered'),
    cancelled: t('status.cancelled'),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('dashboard.title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
                {stat.icon}
              </div>
              <div className={isRTL ? 'text-right' : ''}>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card padding={false} className="lg:col-span-2">
          <CardHeader className="px-6 pt-5 pb-0 mb-0">
            <CardTitle>{t('dashboard.recent_orders')}</CardTitle>
            <Link
              to="/orders"
              className={`flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium ${
                isRTL ? 'flex-row-reverse' : ''
              }`}
            >
              {t('dashboard.view_all')}
              <ArrowRight size={14} className={isRTL ? 'rotate-180' : ''} />
            </Link>
          </CardHeader>

          <div className="mt-4 divide-y divide-slate-100">
            {recentOrders.length === 0 ? (
              <p className="px-6 py-8 text-center text-slate-400 text-sm">{t('orders.no_orders')}</p>
            ) : (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className={`flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors ${
                    isRTL ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {order.patient_name}
                      </span>
                      <span className="text-xs text-slate-400">#{order.order_number}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {order.dentist?.name ?? ''} · {t(`work_types.${order.work_type}`)}
                    </p>
                  </div>
                  <div className={`flex items-center gap-3 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <StatusBadge status={order.status} label={statusLabels[order.status]} />
                    <span className="text-sm font-semibold text-slate-700">
                      {(order.price ?? 0).toLocaleString()} {t('common.currency')}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Finances + Quick Actions */}
        <div className="space-y-4">
          <Card>
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <CheckCircle2 size={16} className="text-green-600" />
                <h3 className="text-sm font-semibold text-slate-700">Total encaissé</h3>
              </div>
              {role === 'lab_admin' && (
                <button
                  onClick={() => setShowResetDialog(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Remettre à zéro"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>

            <p className="text-3xl font-bold text-green-700">{totalEarned.toLocaleString()}</p>
            <p className="text-sm text-slate-500 mt-0.5">{t('common.currency')} — factures payées</p>

            {resetAt && (
              <p className="text-xs text-slate-400 mt-1">
                Depuis le {format(new Date(resetAt), 'd MMM yyyy', { locale: fr })}
              </p>
            )}

            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">Ce mois-ci</p>
              <p className="text-lg font-semibold text-slate-700 mt-0.5">
                {monthlyEarned.toLocaleString()} {t('common.currency')}
              </p>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardTitle className="mb-5">{t('dashboard.quick_actions')}</CardTitle>
            <div className="space-y-3">
              <Link to="/dentists/new" className="block">
                <button className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 transition-all group ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                    <Stethoscope size={18} />
                  </div>
                  <span className="font-medium text-sm">{t('dashboard.manage_dentists')}</span>
                </button>
              </Link>
              <Link to="/orders" className="block">
                <button className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 transition-all group ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                    <ClipboardList size={18} />
                  </div>
                  <span className="font-medium text-sm">{t('dashboard.new_order')}</span>
                </button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Periodeintäkter + Obetalda fakturor — bara lab_admin */}
      {role === 'lab_admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* A: Revenus par période */}
          <Card padding={false}>
            <div className="px-5 pt-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Revenus par période</h3>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "Aujourd'hui", value: revenueToday },
                  { label: 'Cette semaine', value: revenueWeek  },
                  { label: 'Ce mois',       value: revenueMonth },
                ].map(({ label, value }) => (
                  <tr key={label} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3.5 text-slate-500">{label}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                      {value.toLocaleString()} {t('common.currency')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* B: Commandes livrées non payées */}
          <Card padding={false}>
            <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Commandes non payées</h3>
              <Link to="/orders" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                Voir toutes →
              </Link>
            </div>
            {unpaidOrders.length === 0 ? (
              <p className="px-5 py-8 text-center text-slate-400 text-sm">Aucune commande non payée</p>
            ) : (
              <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                {unpaidOrders.map((order) => {
                  const days = daysSince(order.created_at)
                  return (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700">{order.order_number}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">{order.dentist?.name ?? '—'} · {order.patient_name}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-700 shrink-0">
                        {(order.price ?? 0).toLocaleString()} {t('common.currency')}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        days > 30 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {days}j
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </Card>

        </div>
      )}

      {/* Dialog: bekräfta nollställning */}
      <Modal
        open={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        title="Remettre les statistiques à zéro"
        maxWidth="sm"
      >
        <p className="text-sm text-slate-600 mb-6">
          Le total encaissé sera remis à zéro. Les commandes existantes ne seront pas modifiées.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowResetDialog(false)}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <Button
            variant="danger"
            loading={resetting}
            onClick={handleReset}
            className="flex-1"
          >
            Remettre à zéro
          </Button>
        </div>
      </Modal>
    </div>
  )
}
