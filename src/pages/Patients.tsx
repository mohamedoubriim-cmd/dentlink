import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, UserPlus, User } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { PageSpinner } from '../components/ui/Spinner'
import { getPatients, getDentists, createPatient } from '../lib/api'
import type { Patient, Dentist } from '../types'
import { useRTL } from '../contexts/RTLContext'

export default function Patients() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const [patients, setPatients] = useState<Patient[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ name: '', age: '', gender: 'male' as 'male' | 'female', dentist_id: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([getPatients(), getDentists()]).then(([p, d]) => {
      setPatients(p)
      setDentists(d)
      setLoading(false)
    })
  }, [])

  const filtered = patients.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = t('common.required_field')
    if (!form.age || isNaN(parseInt(form.age))) errs.age = t('common.required_field')
    if (!form.dentist_id) errs.dentist_id = t('common.required_field')
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    const created = await createPatient({
      name: form.name,
      age: parseInt(form.age),
      gender: form.gender,
      dentist_id: form.dentist_id,
    })
    setPatients((prev) => [...prev, created])
    setForm({ name: '', age: '', gender: 'male', dentist_id: '' })
    setShowNew(false)
    setSaving(false)
  }

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-5">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-slate-800">{t('patients.title')}</h1>
        <Button icon={<UserPlus size={16} />} onClick={() => setShowNew(true)}>
          {t('patients.new_patient')}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className={`absolute inset-y-0 my-auto text-slate-400 ${isRTL ? 'end-3' : 'start-3'}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('patients.search_placeholder')}
          className={`w-full border border-slate-300 rounded-lg text-sm py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'pe-4 ps-9' : 'ps-9 pe-4'}`}
        />
      </div>

      <Card padding={false}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">{t('patients.no_patients')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {[t('patients.name'), t('patients.age'), t('patients.gender'), t('patients.dentist')].map((h) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className={`px-4 py-3 ${isRTL ? 'text-right' : ''}`}>
                    <div className={`flex items-center gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                        <User size={13} className="text-slate-400" />
                      </div>
                      <span className="font-medium text-slate-700">{p.name}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-slate-600 ${isRTL ? 'text-right' : ''}`}>{p.age}</td>
                  <td className={`px-4 py-3 text-slate-600 ${isRTL ? 'text-right' : ''}`}>
                    {t(`patients.${p.gender}`)}
                  </td>
                  <td className={`px-4 py-3 text-slate-600 ${isRTL ? 'text-right' : ''}`}>
                    {p.dentist?.name ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={showNew} onClose={() => setShowNew(false)} title={t('patients.new_patient')} maxWidth="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label={t('patients.name')}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
            error={errors.name}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('patients.age')}
              type="number"
              min="0"
              max="120"
              value={form.age}
              onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
              required
              error={errors.age}
            />
            <Select
              label={t('patients.gender')}
              value={form.gender}
              onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value as 'male' | 'female' }))}
              options={[
                { value: 'male', label: t('patients.male') },
                { value: 'female', label: t('patients.female') },
              ]}
            />
          </div>
          <Select
            label={t('patients.dentist')}
            value={form.dentist_id}
            onChange={(e) => setForm((p) => ({ ...p, dentist_id: e.target.value }))}
            required
            error={errors.dentist_id}
            placeholder={t('common.select')}
            options={dentists.map((d) => ({ value: d.id, label: d.name }))}
          />
          <div className={`flex gap-3 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button type="submit" loading={saving} className="flex-1">{t('common.save')}</Button>
            <Button type="button" variant="outline" onClick={() => setShowNew(false)} className="flex-1">{t('common.cancel')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
