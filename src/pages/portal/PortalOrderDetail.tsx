import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, FileImage, Box, File, Paperclip, Truck } from 'lucide-react'
import Card from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { getOrder, getFileDownloadUrl } from '../../lib/api'
import type { Order, OrderFile } from '../../types'
import { useRTL } from '../../contexts/RTLContext'

function fileIcon(mimeType: string, name: string) {
  if (mimeType?.startsWith('image/')) return <FileImage size={16} className="text-blue-500" />
  const ext = name.split('.').pop()?.toLowerCase()
  if (['stl', 'ply', 'obj', '3oxz'].includes(ext ?? '')) return <Box size={16} className="text-purple-500" />
  return <File size={16} className="text-slate-400" />
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function PortalOrderDetail() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) getOrder(id).then((d) => { setOrder(d); setLoading(false) })
  }, [id])

  const handleDownload = async (file: OrderFile) => {
    const url = await getFileDownloadUrl(file.storage_path)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
  }

  if (loading) return <PageSpinner />
  if (!order) return <div className="text-center py-16 text-slate-400">{t('orders.no_orders')}</div>

  return (
    <div className="space-y-5">
      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Link to="/portal" className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors">
          <ArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{order.patient_name}</h1>
          <p className="text-xs text-slate-400 font-mono">#{order.order_number}</p>
        </div>
        <div className="ms-auto">
          <StatusBadge status={order.status} label={t(`status.${order.status}`)} />
        </div>
      </div>

      {/* Status timeline */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Suivi de commande</h3>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {(['pending', 'in_progress', 'ready', 'delivered'] as const).map((s, i, arr) => {
            const statuses = ['pending', 'in_progress', 'ready', 'delivered', 'cancelled']
            const currentIdx = statuses.indexOf(order.status)
            const stepIdx = statuses.indexOf(s)
            const isActive = stepIdx === currentIdx
            const isDone = stepIdx < currentIdx && order.status !== 'cancelled'
            return (
              <div key={s} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''} ${i < arr.length - 1 ? 'flex-1' : ''}`}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isActive ? 'bg-primary-600 text-white' :
                    isDone ? 'bg-green-500 text-white' :
                    'bg-slate-200 text-slate-400'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs text-center whitespace-nowrap ${isActive ? 'text-primary-700 font-medium' : 'text-slate-400'}`}>
                    {t(`status.${s}`)}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-5 ${isDone ? 'bg-green-400' : 'bg-slate-200'}`} />
                )}
              </div>
            )
          })}
        </div>
        {order.status === 'cancelled' && (
          <p className="mt-3 text-xs text-red-500 text-center">Commande annulée</p>
        )}
      </Card>

      {/* Tracking number */}
      {order.tracking_number && (
        <div className={`flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Truck size={20} className="text-blue-600 shrink-0" />
          <div>
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Numéro de suivi</p>
            <p className="text-base font-bold text-blue-800">{order.tracking_number}</p>
          </div>
        </div>
      )}

      {/* Details */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Détails</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: t('orders.work_type'), value: t(`work_types.${order.work_type}`) },
            { label: t('orders.material'), value: t(`materials.${order.material}`) },
            { label: t('orders.shade'), value: order.shade || '—' },
            { label: t('orders.tooth_numbers'), value: order.tooth_numbers || '—' },
            { label: t('orders.due_date'), value: new Date(order.due_date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR') },
            { label: t('orders.received_date'), value: new Date(order.received_date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR') },
          ].map(({ label, value }) => (
            <div key={label} className={isRTL ? 'text-right' : ''}>
              <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-medium text-slate-700 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
        {order.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{t('orders.notes')}</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}
      </Card>

      {/* Files */}
      {(order.files?.length ?? 0) > 0 && (
        <Card>
          <div className={`flex items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Paperclip size={15} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">
              Fichiers joints ({order.files?.length})
            </h3>
          </div>
          <div className="space-y-2">
            {order.files?.map((file) => (
              <div
                key={file.id}
                className={`flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <div className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  {fileIcon(file.mime_type, file.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                </div>
                <button
                  onClick={() => handleDownload(file)}
                  className="p-1.5 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors shrink-0"
                  title="Télécharger"
                >
                  <Download size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
