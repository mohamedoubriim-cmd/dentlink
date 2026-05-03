import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Download, CheckCircle2, Clock } from 'lucide-react'
import Card from '../../components/ui/Card'
import { PageSpinner } from '../../components/ui/Spinner'
import { getMyInvoices } from '../../lib/api'
import { downloadInvoicePdf } from '../../lib/invoicePdf'
import type { Invoice } from '../../types'
import { useRTL } from '../../contexts/RTLContext'

// Dentisten ser aldrig brouillon (RLS blockerar det). envoyee visas som Impayée.
function StatusPill({ status }: { status: Invoice['status'] }) {
  if (status === 'payee') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <CheckCircle2 size={11} /> Payée
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <Clock size={11} /> Impayée
    </span>
  )
}

export default function PortalInvoices() {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMyInvoices()
      .then((data) => {
        // Visa bara fakturor som skickats (sent_at sätts av sendInvoice)
        setInvoices(data.filter((i) => i.sent_at != null))
        setLoading(false)
      })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [])

  const totalUnpaid = invoices
    .filter((i) => i.status === 'envoyee')
    .reduce((s, i) => s + i.total, 0)

  const fmt = (n: number) => n.toLocaleString('fr-MA', { minimumFractionDigits: 2 })
  const fmtDate = (s: string) => new Date(s).toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Mes factures</h1>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Erreur: {error}
        </div>
      )}

      {/* Summary */}
      {totalUnpaid > 0 && (
        <div className={`flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            Solde dû : <span className="font-bold">{fmt(totalUnpaid)} MAD</span>
          </p>
        </div>
      )}

      {invoices.length === 0 ? (
        <Card>
          <div className="py-16 text-center text-slate-400">
            <FileText size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Aucune facture pour le moment</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="hover:shadow-md transition-shadow">
              <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {/* Icon */}
                <div className={`p-3 rounded-xl shrink-0 ${inv.status === 'payee' ? 'bg-green-50' : 'bg-amber-50'}`}>
                  <FileText size={20} className={inv.status === 'payee' ? 'text-green-600' : 'text-amber-500'} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm font-semibold text-slate-800">{inv.invoice_number}</span>
                    <StatusPill status={inv.status} />
                  </div>
                  <div className={`flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span>Émise le {fmtDate(inv.date)}</span>
                    <span>·</span>
                    <span>Échéance {fmtDate(inv.due_date)}</span>
                  </div>
                  {inv.notes && (
                    <p className="text-xs text-slate-400 mt-1 truncate">{inv.notes}</p>
                  )}
                </div>

                {/* Amount + download */}
                <div className={`flex items-center gap-3 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={isRTL ? 'text-left' : 'text-right'}>
                    <p className="text-base font-bold text-slate-800">{fmt(inv.total)}</p>
                    <p className="text-xs text-slate-400">MAD TTC</p>
                  </div>
                  <button
                    onClick={() => downloadInvoicePdf(inv)}
                    className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                    title="Télécharger PDF"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
