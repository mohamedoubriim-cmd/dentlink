import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { createDentist } from '../lib/api'
import { useRTL } from '../contexts/RTLContext'

const moroccanCities = [
  'Casablanca', 'Rabat', 'Fès', 'Marrakech', 'Agadir', 'Tanger', 'Meknès',
  'Oujda', 'Kenitra', 'Tétouan', 'Safi', 'El Jadida', 'Béni Mellal', 'Nador',
]

export default function NewDentist() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    name: '',
    clinic: '',
    phone: '',
    email: '',
    address: '',
    city: 'Casablanca',
    balance: '0',
  })

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('common.required_field')
    if (!form.clinic.trim()) e.clinic = t('common.required_field')
    if (!form.phone.trim()) e.phone = t('common.required_field')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setSubmitError(null)
    try {
      await createDentist({
        name: form.name,
        clinic: form.clinic,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        balance: parseFloat(form.balance) || 0,
      })
      navigate('/dentists')
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
        >
          <ArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">{t('dentists.new_dentist')}</h1>
      </div>

      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <strong>Erreur:</strong> {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
            {t('dentists.name')} / {t('dentists.clinic')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('dentists.name')}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
              error={errors.name}
              placeholder="Dr. Ahmed Bennani"
            />
            <Input
              label={t('dentists.clinic')}
              value={form.clinic}
              onChange={(e) => set('clinic', e.target.value)}
              required
              error={errors.clinic}
              placeholder="Cabinet Dentaire..."
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
            {t('dentists.phone')} / {t('dentists.email')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('dentists.phone')}
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              required
              error={errors.phone}
              placeholder="+212 6 XX XX XX XX"
            />
            <Input
              label={t('dentists.email')}
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="dr@example.ma"
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
            {t('dentists.address')} / {t('dentists.city')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('dentists.address')}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="15 Rue Hassan II"
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">{t('dentists.city')}</label>
              <select
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {moroccanCities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button type="submit" loading={loading} size="lg">{t('common.save')}</Button>
          <Button type="button" variant="outline" size="lg" onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
        </div>
      </form>
    </div>
  )
}
