import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Send } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import FileUpload, { type PendingFile } from '../../components/ui/FileUpload'
import { getDentists, createOrderAsDentist, uploadOrderFile, getPatients } from '../../lib/api'
import type { Dentist, Patient, WorkType, Material } from '../../types'
import { useRTL } from '../../contexts/RTLContext'

export default function PortalNewOrder() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const navigate = useNavigate()
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [files, setFiles] = useState<PendingFile[]>([])
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
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
    price: '0',
    notes: '',
    exocad_notes: '',
  })

  useEffect(() => {
    Promise.all([getDentists(), getPatients()]).then(([d, p]) => {
      setDentists(d)
      setPatients(p)
    })
  }, [])

  const workTypes: WorkType[] = ['crown', 'bridge', 'denture', 'implant', 'veneer', 'inlay', 'night_guard', 'retainer', 'other']
  const materials: Material[] = ['metal_ceramic', 'full_ceramic', 'zirconia', 'resin', 'metal', 'composite', 'other']

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }))
    setErrors((p) => ({ ...p, [field]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.patient_name.trim()) e.patient_name = t('common.required_field')
    if (!form.work_type) e.work_type = t('common.required_field')
    if (!form.material) e.material = t('common.required_field')
    if (!form.due_date) e.due_date = t('common.required_field')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setSubmitError(null)

    try {
      const notes = [form.notes, form.exocad_notes ? `[Exocad] ${form.exocad_notes}` : '']
        .filter(Boolean)
        .join('\n\n')

      const order = await createOrderAsDentist({
        dentist_id: form.dentist_id,
        patient_name: form.patient_name,
        work_type: form.work_type as WorkType,
        material: form.material as Material,
        shade: form.shade,
        tooth_numbers: form.tooth_numbers,
        received_date: form.received_date,
        due_date: form.due_date,
        price: parseFloat(form.price) || 0,
        notes,
        status: 'pending',
        payment_status: 'inte_betald',
      })

      // Upload files
      if (files.length > 0) {
        for (const pf of files) {
          setUploadProgress((p) => ({ ...p, [pf.id]: 10 }))
          try {
            await uploadOrderFile(order.id, pf.file)
            setUploadProgress((p) => ({ ...p, [pf.id]: 100 }))
          } catch {
            setUploadProgress((p) => ({ ...p, [pf.id]: -1 }))
          }
        }
        await new Promise((r) => setTimeout(r, 500))
      }

      navigate(`/portal/orders/${order.id}`)
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">{t('orders.new_order')}</h1>

      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <strong>Erreur:</strong> {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Patient */}
        <Card>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Patient
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('orders.patient')}
              value={form.patient_name}
              onChange={(e) => set('patient_name', e.target.value)}
              required
              error={errors.patient_name}
              placeholder="Sélectionner un patient"
              options={patients.map((p) => ({
                value: p.name,
                label: `${p.name} — ${p.age} ans`,
              }))}
            />
            {dentists.length > 0 && (
              <Select
                label={t('orders.dentist')}
                value={form.dentist_id}
                onChange={(e) => set('dentist_id', e.target.value)}
                placeholder={t('common.select')}
                options={dentists.map((d) => ({ value: d.id, label: d.name }))}
              />
            )}
          </div>
        </Card>

        {/* Work type */}
        <Card>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Travail prothétique
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
              placeholder="A1, A2, B1, BL1..."
            />
            <Input
              label={t('orders.tooth_numbers')}
              value={form.tooth_numbers}
              onChange={(e) => set('tooth_numbers', e.target.value)}
              placeholder="14, 15, 16..."
            />
          </div>
        </Card>

        {/* Date */}
        <Card>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Date de livraison souhaitée
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
        </Card>

        {/* Instructions */}
        <Card>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Instructions
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('orders.notes')}
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={2}
                placeholder="Instructions générales..."
                className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Instructions Exocad
              </label>
              <textarea
                value={form.exocad_notes}
                onChange={(e) => set('exocad_notes', e.target.value)}
                rows={2}
                placeholder="Paramètres spécifiques pour la conception Exocad (occlusion, contacts proximaux, espace de ciment...)"
                className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 ring-offset-0 border-purple-200 focus:border-purple-400 resize-none"
              />
              <p className="text-xs text-purple-600 mt-1">Visible par le technicien prothésiste</p>
            </div>
          </div>
        </Card>

        {/* Files */}
        <Card>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Fichiers & Scans
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Photos cliniques · Empreintes numériques (.STL, .PLY, .OBJ) · Radios
          </p>
          <FileUpload
            files={files}
            onChange={setFiles}
            uploading={loading}
            uploadProgress={uploadProgress}
          />
        </Card>

        {/* Submit */}
        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            type="submit"
            loading={loading}
            size="lg"
            icon={<Send size={16} />}
          >
            {loading
              ? files.length > 0
                ? `Envoi des fichiers... (${Object.values(uploadProgress).filter((p) => p === 100).length}/${files.length})`
                : 'Envoi...'
              : 'Envoyer la commande'}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => navigate('/portal')}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
