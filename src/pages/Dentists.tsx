import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Plus, Search, Phone, Mail, MapPin, Trash2, ClipboardList } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { PageSpinner } from '../components/ui/Spinner'
import { getDentists, deleteDentist, getOrders } from '../lib/api'
import type { Dentist, Order } from '../types'
import { useRTL } from '../contexts/RTLContext'

export default function Dentists() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getDentists(), getOrders()]).then(([d, o]) => {
      setDentists(d)
      setOrders(o)
      setLoading(false)
    })
  }, [])

  const filtered = dentists.filter(
    (d) =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.clinic.toLowerCase().includes(search.toLowerCase()) ||
      d.city.toLowerCase().includes(search.toLowerCase())
  )

  const getOrderCount = (dentistId: string) =>
    orders.filter((o) => o.dentist_id === dentistId).length

  const getActiveOrderCount = (dentistId: string) =>
    orders.filter(
      (o) => o.dentist_id === dentistId && ['pending', 'in_progress', 'ready'].includes(o.status)
    ).length

  const handleDelete = async () => {
    if (!deleteId) return
    await deleteDentist(deleteId)
    setDentists((prev) => prev.filter((d) => d.id !== deleteId))
    setDeleteId(null)
  }

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-slate-800">{t('dentists.title')}</h1>
        <Link to="/dentists/new">
          <Button icon={<Plus size={16} />}>{t('dentists.new_dentist')}</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={16}
          className={`absolute inset-y-0 my-auto text-slate-400 ${isRTL ? 'end-3' : 'start-3'}`}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('dentists.search_placeholder')}
          className={`w-full border border-slate-300 rounded-lg text-sm py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'pe-4 ps-9' : 'ps-9 pe-4'}`}
        />
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-slate-400">
          <p>{t('dentists.no_dentists')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dentist) => {
            const totalOrders = getOrderCount(dentist.id)
            const activeOrders = getActiveOrderCount(dentist.id)
            return (
              <Card key={dentist.id} className="group hover:border-primary-200 transition-colors">
                <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm shrink-0">
                      {dentist.name.charAt(dentist.name.lastIndexOf(' ') + 1) || dentist.name.charAt(0)}
                    </div>
                    <div className={isRTL ? 'text-right' : ''}>
                      <p className="font-semibold text-slate-800 text-sm">{dentist.name}</p>
                      <p className="text-xs text-slate-500">{dentist.clinic}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteId(dentist.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  {dentist.phone && (
                    <div className={`flex items-center gap-2 text-xs text-slate-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Phone size={13} className="shrink-0" />
                      <span>{dentist.phone}</span>
                    </div>
                  )}
                  {dentist.email && (
                    <div className={`flex items-center gap-2 text-xs text-slate-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Mail size={13} className="shrink-0" />
                      <span className="truncate">{dentist.email}</span>
                    </div>
                  )}
                  <div className={`flex items-center gap-2 text-xs text-slate-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <MapPin size={13} className="shrink-0" />
                    <span>{dentist.city}</span>
                  </div>
                </div>

                <div className={`flex items-center justify-between pt-3 border-t border-slate-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center gap-1.5 text-xs text-slate-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <ClipboardList size={13} />
                    <span>{totalOrders} {t('dentists.total_orders')}</span>
                  </div>
                  {activeOrders > 0 && (
                    <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                      {activeOrders} {t('dentists.active_orders')}
                    </span>
                  )}
                </div>

                {dentist.balance > 0 && (
                  <div className={`mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-slate-500">{t('dentists.balance')}</span>
                    <span className="font-semibold text-amber-600">
                      {dentist.balance.toLocaleString()} {t('common.currency')}
                    </span>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title={t('dentists.delete_confirm')}
        maxWidth="sm"
      >
        <p className="text-sm text-slate-600 mb-6">{t('dentists.delete_confirm')}</p>
        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button variant="danger" onClick={handleDelete} className="flex-1">{t('common.delete')}</Button>
          <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">{t('common.cancel')}</Button>
        </div>
      </Modal>
    </div>
  )
}
