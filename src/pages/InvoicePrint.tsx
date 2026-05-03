import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getInvoice } from '../lib/api'
import type { Invoice } from '../types'

export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    if (id) getInvoice(id).then(setInvoice)
  }, [id])

  if (!invoice) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#64748b' }}>
      Chargement...
    </div>
  )

  const fmt = (n: number) => n.toLocaleString('fr-MA', { minimumFractionDigits: 2 })
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; }
        @media print {
          @page { margin: 15mm 15mm 15mm 15mm; size: A4; }
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      {/* Print button — hidden on print */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 999, display: 'flex', gap: 8 }}>
        <button
          onClick={() => window.print()}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          ⬇ Télécharger PDF
        </button>
        <button
          onClick={() => window.close()}
          style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Fermer
        </button>
      </div>

      {/* Invoice */}
      <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src="/IMG-20260425-WA0004.jpg" alt="logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', letterSpacing: -0.5 }}>Laboratoire Oubriim</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Laboratoire de Prothèse Dentaire</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb', letterSpacing: -1 }}>FACTURE</div>
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>N° {invoice.invoice_number}</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 2, background: 'linear-gradient(to right, #2563eb, #e2e8f0)', borderRadius: 2, marginBottom: 32 }} />

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          {/* Bill to */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Facturé à
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{invoice.dentist?.name ?? '—'}</div>
            {invoice.dentist?.clinic   && <div style={{ fontSize: 13, color: '#475569', marginTop: 3  }}>{invoice.dentist.clinic}</div>}
            {invoice.dentist?.address  && <div style={{ fontSize: 13, color: '#475569', marginTop: 2  }}>{invoice.dentist.address}</div>}
            {invoice.dentist?.city     && <div style={{ fontSize: 13, color: '#475569', marginTop: 2  }}>{invoice.dentist.city}</div>}
            {invoice.dentist?.phone    && <div style={{ fontSize: 13, color: '#475569', marginTop: 2  }}>{invoice.dentist.phone}</div>}
            {invoice.dentist?.email    && <div style={{ fontSize: 13, color: '#475569', marginTop: 2  }}>{invoice.dentist.email}</div>}
          </div>

          {/* Dates */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Détails
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Date', value: fmtDate(invoice.date) },
                { label: 'Échéance', value: fmtDate(invoice.due_date) },
                { label: 'Statut', value: invoice.status === 'payee' ? '✅ Payée' : invoice.status === 'annulee' ? '❌ Annulée' : invoice.status === 'envoyee' ? '⏳ Envoyée' : '📄 Brouillon' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#94a3b8' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#1e293b' }}>
              {['Description', 'Montant HT', 'TVA (20%)', 'Total TTC'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Description' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: '#f8fafc' }}>
              <td style={{ padding: '14px 16px', fontSize: 14, color: '#1e293b', fontWeight: 500 }}>
                Travaux de prothèse dentaire
                {invoice.notes ? <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{invoice.notes}</div> : null}
              </td>
              <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 14, color: '#1e293b' }}>{fmt(invoice.amount)} MAD</td>
              <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 14, color: '#1e293b' }}>{fmt(invoice.tax)} MAD</td>
              <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{fmt(invoice.total)} MAD</td>
            </tr>
          </tbody>
        </table>

        {/* Total box */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: '20px 28px', minWidth: 260 }}>
            {[
              { label: 'Montant HT', value: fmt(invoice.amount) },
              { label: 'TVA 20%', value: fmt(invoice.tax) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
                <span>{label}</span>
                <span>{value} MAD</span>
              </div>
            ))}
            <div style={{ height: 1, background: '#334155', margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#fff' }}>
              <span>Total TTC</span>
              <span>{fmt(invoice.total)} MAD</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Laboratoire Oubriim — Laboratoire de Prothèse Dentaire · Maroc</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{invoice.invoice_number}</div>
        </div>
      </div>
    </>
  )
}
