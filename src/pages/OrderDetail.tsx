import { useEffect, useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, User, Stethoscope, Package, Palette, Hash, Banknote, FileText, Download, FileImage, Box, File, Paperclip } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import Select from '../components/ui/Select'
import { PageSpinner } from '../components/ui/Spinner'
import { getOrder, updateOrderStatus, updateTrackingNumber, getFileDownloadUrl } from '../lib/api'
import type { Order, OrderStatus, OrderFile } from '../types'
import { useRTL } from '../contexts/RTLContext'

export default function OrderDetail() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState<OrderStatus>('pending')
  const [saving, setSaving] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [savingTracking, setSavingTracking] = useState(false)

  useEffect(() => {
    if (id) {
      getOrder(id).then((data) => {
        setOrder(data)
        if (data) {
          setNewStatus(data.status)
          setTrackingNumber(data.tracking_number ?? '')
        }
        setLoading(false)
      })
    }
  }, [id])

  const handleStatusUpdate = async () => {
    if (!order) return
    setSaving(true)
    await updateOrderStatus(order.id, newStatus)
    setOrder((prev) => prev ? { ...prev, status: newStatus } : prev)
    setSaving(false)
  }

  const handleSaveTracking = async () => {
    if (!order) return
    setSavingTracking(true)
    await updateTrackingNumber(order.id, trackingNumber)
    setOrder((prev) => prev ? { ...prev, tracking_number: trackingNumber } : prev)
    setSavingTracking(false)
  }

  const statusOptions: OrderStatus[] = ['pending', 'in_progress', 'ready', 'delivered', 'cancelled']

  if (loading) return <PageSpinner />
  if (!order) return (
    <div className="text-center py-20 text-slate-400">
      {t('orders.no_orders')}
    </div>
  )

  const DetailRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
      <div className="p-2 bg-slate-100 rounded-lg text-slate-500 shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-sm font-medium text-slate-700 mt-0.5">{value}</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{t('orders.order_details')}</h1>
            <p className="text-sm text-slate-400 font-mono">{order.order_number}</p>
          </div>
        </div>
        <StatusBadge status={order.status} label={t(`status.${order.status}`)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Info */}
        <Card className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <DetailRow
              icon={<User size={16} />}
              label={t('orders.patient')}
              value={order.patient_name}
            />
            <DetailRow
              icon={<Stethoscope size={16} />}
              label={t('orders.dentist')}
              value={order.dentist?.name ?? '—'}
            />
            <DetailRow
              icon={<Package size={16} />}
              label={t('orders.work_type')}
              value={t(`work_types.${order.work_type}`)}
            />
            <DetailRow
              icon={<Package size={16} />}
              label={t('orders.material')}
              value={t(`materials.${order.material}`)}
            />
            <DetailRow
              icon={<Palette size={16} />}
              label={t('orders.shade')}
              value={order.shade || '—'}
            />
            <DetailRow
              icon={<Hash size={16} />}
              label={t('orders.tooth_numbers')}
              value={order.tooth_numbers || '—'}
            />
            <DetailRow
              icon={<Calendar size={16} />}
              label={t('orders.received_date')}
              value={new Date(order.received_date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}
            />
            <DetailRow
              icon={<Calendar size={16} />}
              label={t('orders.due_date')}
              value={new Date(order.due_date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}
            />
            {order.delivery_date && (
              <DetailRow
                icon={<Calendar size={16} />}
                label={t('orders.delivery_date')}
                value={new Date(order.delivery_date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}
              />
            )}
            <DetailRow
              icon={<Banknote size={16} />}
              label={t('orders.price')}
              value={`${order.price.toLocaleString()} ${t('common.currency')}`}
            />
          </div>

          {order.notes && (
            <div className={`pt-4 border-t border-slate-100 ${isRTL ? 'text-right' : ''}`}>
              <div className={`flex items-center gap-2 mb-2 text-slate-500 text-xs uppercase tracking-wide font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                <FileText size={14} />
                {t('orders.notes')}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{order.notes}</p>
            </div>
          )}
        </Card>

        {/* Status Update */}
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('orders.update_status')}</h3>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
              options={statusOptions.map((s) => ({ value: s, label: t(`status.${s}`) }))}
            />
            <Button
              onClick={handleStatusUpdate}
              loading={saving}
              className="w-full mt-3"
              disabled={newStatus === order.status}
            >
              {t('common.save')}
            </Button>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Numéro de suivi</h3>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Ex: 6123456789"
              className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Button
              onClick={handleSaveTracking}
              loading={savingTracking}
              variant="outline"
              className="w-full mt-2"
              disabled={trackingNumber === (order.tracking_number ?? '')}
            >
              Enregistrer
            </Button>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('orders.dentist')}</h3>
            {order.dentist ? (
              <div className={`space-y-1.5 text-sm ${isRTL ? 'text-right' : ''}`}>
                <p className="font-medium text-slate-700">{order.dentist.name}</p>
                <p className="text-slate-500">{order.dentist.clinic}</p>
                <p className="text-slate-500">{order.dentist.phone}</p>
                <p className="text-slate-500">{order.dentist.city}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">—</p>
            )}
          </Card>
        </div>
      </div>

      {/* Files */}
      {(order.files?.length ?? 0) > 0 && (
        <Card>
          <div className={`flex items-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Paperclip size={15} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">
              Fichiers joints ({order.files?.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {order.files?.map((file) => (
              <FileRow key={file.id} file={file} isRTL={isRTL} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

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

function FileRow({ file, isRTL }: { file: OrderFile; isRTL: boolean }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const handleClick = async () => {
    if (file.mime_type?.startsWith('image/') && !previewUrl) {
      setLoadingPreview(true)
      const url = await getFileDownloadUrl(file.storage_path)
      setPreviewUrl(url)
      setLoadingPreview(false)
    }
  }

  const handleDownload = async () => {
    const url = await getFileDownloadUrl(file.storage_path)
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = file.name
    a.click()
    URL.revokeObjectURL(blobUrl)
  }

  return (
    <div className={`flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200`}>
      {previewUrl && (
        <img src={previewUrl} alt={file.name} className="w-full h-40 object-cover rounded-md" />
      )}
      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div
          className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0 cursor-pointer"
          onClick={handleClick}
        >
          {loadingPreview
            ? <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            : fileIcon(file.mime_type, file.name)
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
          <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
        </div>
        <button
          onClick={handleDownload}
          className="p-1.5 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors shrink-0"
          title="Télécharger"
        >
          <Download size={14} />
        </button>
      </div>
    </div>
  )
}
