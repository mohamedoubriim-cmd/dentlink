import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { getDentists, createOrder } from '../lib/api'
import type { Dentist, WorkType, Material } from '../types'
import { useRTL } from '../contexts/RTLContext'

export default function NewOrder() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const navigate = useNavigate()
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    dentist_id: '',
    patient_name: '',
    work_type: '' as WorkType | '',
    material: '' as Material | '',
    shade: '',
    tooth_numbers: '',
    received_date: new Date().toISOString().split('T')[0],
    due_date: '',
    price: '',
    notes: '',
    status: 'pending' as const,
  })

  useEffect(() => {
    getDentists().then(setDentists)
  }, [])

  const workTypes: WorkType[] = ['crown', 'bridge', 'denture', 'implant', 'veneer', 'inlay', 'night_guard', 'retainer', 'other']
  const materials: Material[] = ['metal_ceramic', 'full_ceramic', 'zirconia', 'resin', 'metal', 'composite', 'other']

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.patient_name.trim()) e.patient_name = t('common.required_field')
    if (!form.work_type) e.work_type = t('common.required_field')
    if (!form.material) e.material = t('common.required_field')
    if (!form.due_date) e.due_date = t('common.required_field')
    if (!form.price) e.price = t('common.required_field')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setSubmitError(null)
    try {
      const order = await createOrder({
        dentist_id: form.dentist_id,
        patient_name: form.patient_name,
        work_type: form.work_type as WorkType,
        material: form.material as Material,
        shade: form.shade,
        tooth_numbers: form.tooth_numbers,
        received_date: form.received_date,
        due_date: form.due_date,
        price: parseFloat(form.price) || 0,
        notes: form.notes,
        status: form.status,
      })
      navigate(`/orders/${order.id}`)
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
        >
          <ArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">{t('orders.new_order')}</h1>
      </div>

      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <strong>Erreur:</strong> {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Patient & Dentist */}
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
            {t('orders.patient')} / {t('orders.dentist')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('orders.dentist')}
              value={form.dentist_id}
              onChange={(e) => set('dentist_id', e.target.value)}
              required
              error={errors.dentist_id}
              placeholder={t('common.select')}
              options={dentists.map((d) => ({ value: d.id, label: `${d.name} — ${d.clinic}` }))}
            />
            <Input
              label={t('orders.patient')}
              value={form.patient_name}
              onChange={(e) => set('patient_name', e.target.value)}
              required
              error={errors.patient_name}
              placeholder="Nom du patient"
            />
          </div>
        </Card>

        {/* Work Details */}
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
            {t('orders.work_type')} / {t('orders.material')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('orders.work_type')}
              value={form.work_type}
              onChange={(e) => set('work_type', e.target.value)}
              required
              error={errors.work_type}
              placeholder={t('common.select')}
              options={workTypes.map((w) => ({ value: w, label: t(`work_types.${w}`) }))}
            />
            <Select
              label={t('orders.material')}
              value={form.material}
              onChange={(e) => set('material', e.target.value)}
              required
              error={errors.material}
              placeholder={t('common.select')}
              options={materials.map((m) => ({ value: m, label: t(`materials.${m}`) }))}
            />
            <Input
              label={t('orders.shade')}
              value={form.shade}
              onChange={(e) => set('shade', e.target.value)}
              placeholder="A1, A2, B1..."
            />
            <Input
              label={t('orders.tooth_numbers')}
              value={form.tooth_numbers}
              onChange={(e) => set('tooth_numbers', e.target.value)}
              placeholder="11, 12, 21..."
            />
          </div>
        </Card>

        {/* Dates & Price */}
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
            {t('orders.due_date')} / {t('orders.price')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={t('orders.received_date')}
              type="date"
              value={form.received_date}
              onChange={(e) => set('received_date', e.target.value)}
            />
            <Input
              label={t('orders.due_date')}
              type="date"
              value={form.due_date}
              onChange={(e) => set('due_date', e.target.value)}
              required
              error={errors.due_date}
            />
            <Input
              label={`${t('orders.price')} (${t('common.currency')})`}
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              required
              error={errors.price}
              placeholder="0"
            />
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {t('orders.notes')}
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            placeholder={t('orders.notes')}
            className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </Card>

        {/* Actions */}
        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button type="submit" loading={loading} size="lg">
            {t('common.save')}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => navigate(-1)}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
