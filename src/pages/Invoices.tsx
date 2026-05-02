import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, FileText, CheckCircle2, Clock, Download } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'
import { InvoiceStatusBadge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import { getInvoices, getDentists, createInvoice, updateInvoiceStatus } from '../lib/api'
import { downloadInvoicePdf } from '../lib/invoicePdf'
import type { Invoice, Dentist } from '../types'
import { useRTL } from '../contexts/RTLContext'
import { useAuth } from '../contexts/AuthContext'

export default function Invoices() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const { role } = useAuth()
  const canManage = role === 'lab_admin' || role === 'lab_staff'
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    dentist_id: '',
    date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount: '',
    notes: '',
  })

  useEffect(() => {
    Promise.all([getInvoices(), getDentists()]).then(([inv, d]) => {
      setInvoices(inv)
      setDentists(d)
      setLoading(false)
    })
  }, [])

  const filtered = invoices.filter(
    (inv) =>
      !search ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.dentist?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.dentist_id || !form.amount || !form.due_date) return
    setSaving(true)
    const amount = parseFloat(form.amount) || 0
    const tax = amount * 0.2
    const created = await createInvoice({
      dentist_id: form.dentist_id,
      date: form.date,
      due_date: form.due_date,
      amount,
      tax,
      total: amount + tax,
      status: 'unpaid',
      notes: form.notes,
    })
    setInvoices((prev) => [created, ...prev])
    setShowNew(false)
    setSaving(false)
    setForm({ dentist_id: '', date: new Date().toISOString().split('T')[0], due_date: '', amount: '', notes: '' })
  }

  const handleTogglePaid = async (inv: Invoice) => {
    const newStatus = inv.status === 'paid' ? 'unpaid' : 'paid'
    setTogglingId(inv.id)
    await updateInvoiceStatus(inv.id, newStatus)
    setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, status: newStatus } : i))
    setTogglingId(null)
  }

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const totalUnpaid = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.total, 0)

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-5">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-slate-800">{t('invoices.title')}</h1>
        {canManage && (
          <Button icon={<Plus size={16} />} onClick={() => setShowNew(true)}>
            {t('invoices.new_invoice')}
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2.5 rounded-xl bg-green-50 text-green-600 shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div className={isRTL ? 'text-right' : ''}>
              <p className="text-2xl font-bold text-slate-800">{totalPaid.toLocaleString()} <span className="text-base font-normal text-slate-500">{t('common.currency')}</span></p>
              <p className="text-sm text-slate-500">Total encaissé</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <Clock size={22} />
            </div>
            <div className={isRTL ? 'text-right' : ''}>
              <p className="text-2xl font-bold text-slate-800">{totalUnpaid.toLocaleString()} <span className="text-base font-normal text-slate-500">{t('common.currency')}</span></p>
              <p className="text-sm text-slate-500">{t('invoices.unpaid')}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className={`absolute inset-y-0 my-auto text-slate-400 ${isRTL ? 'end-3' : 'start-3'}`} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('invoices.search_placeholder')}
          className={`w-full border border-slate-300 rounded-lg text-sm py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'pe-4 ps-9' : 'ps-9 pe-4'}`}
        />
      </div>

      <Card padding={false}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">{t('invoices.no_invoices')}</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((inv) => (
                <div key={inv.id} className={`p-4 space-y-3 ${inv.status === 'paid' ? 'opacity-70' : ''}`}>
                  <div className={`flex items-start justify-between gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <p className="font-medium text-slate-800">{inv.dentist?.name ?? '—'}</p>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{inv.invoice_number}</p>
                    </div>
                    <InvoiceStatusBadge status={inv.status} label={t(`invoices.${inv.status}`)} />
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>{new Date(inv.date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')} → {new Date(inv.due_date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}</p>
                    <p className="font-semibold text-slate-700 text-sm">{inv.total.toLocaleString()} {t('common.currency')}</p>
                  </div>
                  <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button
                      onClick={() => downloadInvoicePdf(inv)}
                      className="p-2 rounded-lg bg-primary-50 text-primary-600"
                      title="Télécharger PDF"
                    >
                      <Download size={15} />
                    </button>
                    {canManage && (
                      <button
                        onClick={() => handleTogglePaid(inv)}
                        disabled={togglingId === inv.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          inv.status === 'paid'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-green-50 text-green-700 border border-green-200'
                        }`}
                      >
                        {togglingId === inv.id
                          ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : <CheckCircle2 size={13} />
                        }
                        {inv.status === 'paid' ? 'Marquer impayé' : 'Marquer payé'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {[
                      t('invoices.invoice_number'),
                      t('invoices.dentist'),
                      t('invoices.date'),
                      t('invoices.due_date'),
                      t('invoices.amount'),
                      t('invoices.total'),
                      t('invoices.status'),
                      '',
                      '',
                    ].map((h, i) => (
                      <th key={i} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((inv) => (
                    <tr key={inv.id} className={`hover:bg-slate-50 transition-colors ${inv.status === 'paid' ? 'opacity-70' : ''}`}>
                      <td className={`px-4 py-3 font-mono text-xs text-slate-500 ${isRTL ? 'text-right' : ''}`}>
                        {inv.invoice_number}
                      </td>
                      <td className={`px-4 py-3 font-medium text-slate-700 ${isRTL ? 'text-right' : ''}`}>
                        {inv.dentist?.name ?? '—'}
                      </td>
                      <td className={`px-4 py-3 text-slate-600 ${isRTL ? 'text-right' : ''}`}>
                        {new Date(inv.date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}
                      </td>
                      <td className={`px-4 py-3 text-slate-600 ${isRTL ? 'text-right' : ''}`}>
                        {new Date(inv.due_date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}
                      </td>
                      <td className={`px-4 py-3 text-slate-600 ${isRTL ? 'text-right' : ''}`}>
                        {inv.amount.toLocaleString()} {t('common.currency')}
                      </td>
                      <td className={`px-4 py-3 font-semibold text-slate-700 ${isRTL ? 'text-right' : ''}`}>
                        {inv.total.toLocaleString()} {t('common.currency')}
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceStatusBadge status={inv.status} label={t(`invoices.${inv.status}`)} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => downloadInvoicePdf(inv)}
                          className="p-1.5 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors"
                          title="Télécharger PDF"
                        >
                          <Download size={15} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {canManage && (
                          <button
                            onClick={() => handleTogglePaid(inv)}
                            disabled={togglingId === inv.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                              inv.status === 'paid'
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                            }`}
                          >
                            {togglingId === inv.id ? (
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckCircle2 size={13} />
                            )}
                            {inv.status === 'paid' ? 'Marquer impayé' : 'Marquer payé'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Modal open={showNew} onClose={() => setShowNew(false)} title={t('invoices.new_invoice')} maxWidth="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label={t('invoices.dentist')}
            value={form.dentist_id}
            onChange={(e) => setForm((p) => ({ ...p, dentist_id: e.target.value }))}
            required
            placeholder={t('common.select')}
            options={dentists.map((d) => ({ value: d.id, label: d.name }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('invoices.date')}
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              required
            />
            <Input
              label={t('invoices.due_date')}
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
              required
            />
          </div>
          <Input
            label={`${t('invoices.amount')} (${t('common.currency')})`}
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            required
            hint="TVA 20% calculée automatiquement"
          />
          <label className="block text-sm font-medium text-slate-700">{t('orders.notes')}</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            rows={2}
            className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
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
