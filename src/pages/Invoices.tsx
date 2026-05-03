import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, FileText, CheckCircle2, Clock, Download, Send, Eye, Trash2 } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'
import { PageSpinner } from '../components/ui/Spinner'
import { getInvoices, getDentists, createInvoice, updateInvoiceStatus, sendInvoice, deleteInvoice } from '../lib/api'
import { downloadInvoicePdf } from '../lib/invoicePdf'
import type { Invoice, Dentist, InvoiceStatus } from '../types'
import { useRTL } from '../contexts/RTLContext'
import { useAuth } from '../contexts/AuthContext'

type FilterTab = 'all' | 'impayees' | 'payee' | 'annulee'

// Affiche uniquement Impayée / Payée / Annulée — brouillon et envoyée sont fusionnées en "Impayée"
function DisplayBadge({ status }: { status: InvoiceStatus }) {
  if (status === 'payee') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <CheckCircle2 size={11} /> Payée
    </span>
  )
  if (status === 'annulee') return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
      Annulée
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <Clock size={11} /> Impayée
    </span>
  )
}

export default function Invoices() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const { role } = useAuth()
  const canManage = role === 'lab_admin' || role === 'lab_staff'
  const isAdmin   = role === 'lab_admin'

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [dentists, setDentists] = useState<Dentist[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sendDialog, setSendDialog] = useState<Invoice | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<Invoice | null>(null)

  const [form, setForm] = useState({
    dentist_id: '',
    date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount: '',
    notes: '',
  })

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const openPrint = (id: string) =>
    window.open(`/invoices/${id}/print`, '_blank')

  useEffect(() => {
    Promise.all([getInvoices(), getDentists()]).then(([inv, d]) => {
      setInvoices(inv)
      setDentists(d)
      setLoading(false)
    })
  }, [])

  // Impayées = brouillon + envoyee (brouillon invisible au dentiste, envoyee visible)
  const counts: Record<FilterTab, number> = {
    all:      invoices.length,
    impayees: invoices.filter(i => i.status === 'brouillon' || i.status === 'envoyee').length,
    payee:    invoices.filter(i => i.status === 'payee').length,
    annulee:  invoices.filter(i => i.status === 'annulee').length,
  }

  const filtered = invoices.filter(inv => {
    const matchFilter =
      filter === 'impayees' ? inv.status === 'brouillon' || inv.status === 'envoyee' :
      filter === 'payee'    ? inv.status === 'payee'    :
      filter === 'annulee'  ? inv.status === 'annulee'  :
      true
    if (!matchFilter) return false
    if (!search) return true
    return (
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.dentist?.name ?? '').toLowerCase().includes(search.toLowerCase())
    )
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.dentist_id || !form.amount || !form.due_date) return
    setSaving(true)
    setCreateError(null)
    try {
      const amount = parseFloat(form.amount) || 0
      const tax    = amount * 0.2
      const created = await createInvoice({
        dentist_id: form.dentist_id,
        date:       form.date,
        due_date:   form.due_date,
        amount,
        tax,
        total: amount + tax,
        status: 'brouillon',
        notes: form.notes,
      })
      setInvoices(prev => [created, ...prev])
      setShowNew(false)
      setForm({ dentist_id: '', date: new Date().toISOString().split('T')[0], due_date: '', amount: '', notes: '' })
      showToast('Facture créée')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  const handleSendConfirm = async () => {
    if (!sendDialog) return
    const inv = sendDialog
    setSendDialog(null)
    setActionLoading(inv.id + '-send')
    try {
      await sendInvoice(inv.id)
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'envoyee' } : i))
      showToast('Facture envoyée')
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkPaid = async (inv: Invoice) => {
    setActionLoading(inv.id + '-paid')
    try {
      await updateInvoiceStatus(inv.id, 'payee')
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'payee' } : i))
      showToast('Facture marquée payée')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (inv: Invoice) => {
    setActionLoading(inv.id + '-cancel')
    try {
      await updateInvoiceStatus(inv.id, 'annulee')
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'annulee' } : i))
      showToast('Facture annulée')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return
    const inv = deleteDialog
    setDeleteDialog(null)
    setActionLoading(inv.id + '-delete')
    try {
      await deleteInvoice(inv.id)
      setInvoices(prev => prev.filter(i => i.id !== inv.id))
      showToast('Facture supprimée')
    } finally {
      setActionLoading(null)
    }
  }

  const totalPayee  = invoices.filter(i => i.status === 'payee').reduce((s, i) => s + i.total, 0)
  const totalUnpaid = invoices.filter(i => i.status === 'brouillon' || i.status === 'envoyee').reduce((s, i) => s + i.total, 0)

  if (loading) return <PageSpinner />

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all',      label: 'Toutes'   },
    { key: 'impayees', label: 'Impayées' },
    { key: 'payee',    label: 'Payées'   },
    { key: 'annulee',  label: 'Annulées' },
  ]

  // Actions pour une ligne de facture
  // Flux: brouillon → marquer payée (d'abord) → envoyer au dentiste (ensuite, comme reçu)
  const RowActions = ({ inv }: { inv: Invoice }) => {
    const busy = !!actionLoading

    if (inv.status === 'brouillon') return (
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => handleMarkPaid(inv)}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {actionLoading === inv.id + '-paid'
            ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <CheckCircle2 size={13} />
          }
          Payée
        </button>
        <button
          onClick={() => setSendDialog(inv)}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {actionLoading === inv.id + '-send'
            ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <Send size={13} />
          }
          Envoyer
        </button>
        <button onClick={() => openPrint(inv.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="Voir">
          <Eye size={15} />
        </button>
        {isAdmin && (
          <button
            onClick={() => handleCancel(inv)}
            disabled={busy}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            Annuler
          </button>
        )}
      </div>
    )

    if (inv.status === 'envoyee') return (
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => handleMarkPaid(inv)}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {actionLoading === inv.id + '-paid'
            ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <CheckCircle2 size={13} />
          }
          Payée
        </button>
        <button onClick={() => openPrint(inv.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="Voir">
          <Eye size={15} />
        </button>
        {isAdmin && (
          <button
            onClick={() => handleCancel(inv)}
            disabled={busy}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            Annuler
          </button>
        )}
      </div>
    )

    if (inv.status === 'payee') return (
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => setSendDialog(inv)}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-40 transition-colors whitespace-nowrap"
          title="Envoyer comme reçu au dentiste"
        >
          {actionLoading === inv.id + '-send'
            ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <Send size={13} />
          }
          Envoyer
        </button>
        <button onClick={() => downloadInvoicePdf(inv)} className="p-1.5 rounded-lg text-slate-400 hover:bg-primary-50 hover:text-primary-600 transition-colors" title="Télécharger PDF">
          <Download size={15} />
        </button>
        <button onClick={() => openPrint(inv.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="Voir">
          <Eye size={15} />
        </button>
        {isAdmin && (
          <button onClick={() => setDeleteDialog(inv)} disabled={busy} className="p-1.5 rounded-lg text-red-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors" title="Supprimer définitivement">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    )

    // annulee
    return (
      <div className="flex items-center justify-end gap-1.5">
        {isAdmin && (
          <button onClick={() => setDeleteDialog(inv)} disabled={busy} className="p-1.5 rounded-lg text-red-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors" title="Supprimer définitivement">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm px-5 py-2.5 rounded-xl shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-slate-800">{t('invoices.title')}</h1>
        {canManage && (
          <Button icon={<Plus size={16} />} onClick={() => setShowNew(true)}>
            {t('invoices.new_invoice')}
          </Button>
        )}
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2.5 rounded-xl bg-green-50 text-green-600 shrink-0"><CheckCircle2 size={22} /></div>
            <div className={isRTL ? 'text-right' : ''}>
              <p className="text-2xl font-bold text-slate-800">{totalPayee.toLocaleString()} <span className="text-base font-normal text-slate-500">{t('common.currency')}</span></p>
              <p className="text-sm text-slate-500">Total encaissé</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0"><Clock size={22} /></div>
            <div className={isRTL ? 'text-right' : ''}>
              <p className="text-2xl font-bold text-slate-800">{totalUnpaid.toLocaleString()} <span className="text-base font-normal text-slate-500">{t('common.currency')}</span></p>
              <p className="text-sm text-slate-500">{t('invoices.unpaid')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres + recherche */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {filterTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
              {counts[key] > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  filter === key ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'
                }`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={15} className={`absolute inset-y-0 my-auto text-slate-400 ${isRTL ? 'end-3' : 'start-3'}`} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('invoices.search_placeholder')}
            className={`w-full border border-slate-300 rounded-lg text-sm py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'pe-4 ps-9' : 'ps-9 pe-4'}`}
          />
        </div>
      </div>

      <Card padding={false}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">{t('invoices.no_invoices')}</p>
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map(inv => (
                <div key={inv.id} className={`p-4 space-y-3 ${inv.status === 'annulee' ? 'opacity-60' : ''}`}>
                  <div className={`flex items-start justify-between gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <p className="font-medium text-slate-800">{inv.dentist?.name ?? '—'}</p>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{inv.invoice_number}</p>
                    </div>
                    <DisplayBadge status={inv.status} />
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>{new Date(inv.date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')} → {new Date(inv.due_date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}</p>
                    <p className="font-semibold text-slate-700 text-sm">{inv.total.toLocaleString()} {t('common.currency')}</p>
                  </div>
                  {canManage && <RowActions inv={inv} />}
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {[t('invoices.invoice_number'), t('invoices.dentist'), t('invoices.date'), t('invoices.due_date'), t('invoices.total'), t('invoices.status'), ''].map((h, i) => (
                      <th key={i} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(inv => (
                    <tr key={inv.id} className={`hover:bg-slate-50 transition-colors ${inv.status === 'annulee' ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{inv.invoice_number}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{inv.dentist?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(inv.date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(inv.due_date).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{inv.total.toLocaleString()} {t('common.currency')}</td>
                      <td className="px-4 py-3"><DisplayBadge status={inv.status} /></td>
                      <td className="px-4 py-3">{canManage && <RowActions inv={inv} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Modal: nouvelle facture */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title={t('invoices.new_invoice')} maxWidth="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label={t('invoices.dentist')}
            value={form.dentist_id}
            onChange={e => setForm(p => ({ ...p, dentist_id: e.target.value }))}
            required
            placeholder={t('common.select')}
            options={dentists.map(d => ({ value: d.id, label: d.name }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('invoices.date')} type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
            <Input label={t('invoices.due_date')} type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} required />
          </div>
          <Input
            label={`${t('invoices.amount')} (${t('common.currency')})`}
            type="number" min="0" step="0.01"
            value={form.amount}
            onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
            required
            hint="TVA 20% calculée automatiquement"
          />
          <label className="block text-sm font-medium text-slate-700">{t('orders.notes')}</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            rows={2}
            className="w-full border border-slate-300 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          {createError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{createError}</p>}
          <div className={`flex gap-3 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button type="submit" loading={saving} className="flex-1">{t('common.save')}</Button>
            <Button type="button" variant="outline" onClick={() => setShowNew(false)} className="flex-1">{t('common.cancel')}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: confirmer envoi */}
      {sendDialog && (
        <Modal open={!!sendDialog} onClose={() => setSendDialog(null)} title="Envoyer la facture" maxWidth="sm">
          <p className="text-sm text-slate-600 mb-1">
            Envoyer la facture <strong>{sendDialog.invoice_number}</strong> au dentiste ?
          </p>
          <p className="text-xs text-slate-400 mb-6">
            Le dentiste pourra la consulter dans son portail dès l'envoi.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setSendDialog(null)} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button onClick={handleSendConfirm} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors">
              Envoyer
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: confirmer suppression */}
      {deleteDialog && (
        <Modal open={!!deleteDialog} onClose={() => setDeleteDialog(null)} title="Supprimer définitivement" maxWidth="sm">
          <p className="text-sm text-slate-600 mb-6">
            Supprimer définitivement la facture <strong>{deleteDialog.invoice_number}</strong> ? Cette action est irréversible.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteDialog(null)} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button onClick={handleDeleteConfirm} className="flex-1 px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors">
              Supprimer
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
