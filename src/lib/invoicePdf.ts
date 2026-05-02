import { jsPDF } from 'jspdf'
import type { Invoice } from '../types'

async function loadImageAsBase64(src: string): Promise<string> {
  const res = await fetch(src)
  const blob = await res.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

export async function downloadInvoicePdf(invoice: Invoice) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const M = 15
  let y = 20

  const fmt = (n: number) => n.toLocaleString('fr-MA', { minimumFractionDigits: 2 }) + ' MAD'
  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  // ── Header ────────────────────────────────────────────────────────────────
  try {
    const logoBase64 = await loadImageAsBase64('/IMG-20260425-WA0004.jpg')
    doc.addImage(logoBase64, 'JPEG', M, y - 6, 14, 14)
  } catch {
    // logo not critical, continue without it
  }

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('Laboratoire Oubriim', M + 16, y - 1)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Laboratoire de Prothèse Dentaire', M + 16, y + 5)

  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(37, 99, 235)
  doc.text('FACTURE', W - M, y, { align: 'right' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(`N° ${invoice.invoice_number}`, W - M, y + 7, { align: 'right' })

  y += 16

  // Divider
  doc.setDrawColor(37, 99, 235)
  doc.setLineWidth(0.7)
  doc.line(M, y, W - M, y)
  y += 8

  // ── Info grid ─────────────────────────────────────────────────────────────
  const colW = (W - M * 2 - 6) / 2
  const col2 = M + colW + 6

  // Beräkna höjden dynamiskt baserat på antal dentist-fält
  const dentistLines = [
    invoice.dentist?.clinic,
    invoice.dentist?.address,
    invoice.dentist?.city,
    invoice.dentist?.phone,
    invoice.dentist?.email,
  ].filter(Boolean)
  const boxH = 16 + dentistLines.length * 5

  // "Facturé à" box
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(M, y, colW, boxH, 3, 3, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(148, 163, 184)
  doc.text('FACTURÉ À', M + 4, y + 6)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(invoice.dentist?.name ?? '—', M + 4, y + 13)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  let infoY = y + 19
  if (invoice.dentist?.clinic)  { doc.text(invoice.dentist.clinic,  M + 4, infoY); infoY += 5 }
  if (invoice.dentist?.address) { doc.text(invoice.dentist.address, M + 4, infoY); infoY += 5 }
  if (invoice.dentist?.city)    { doc.text(invoice.dentist.city,    M + 4, infoY); infoY += 5 }
  if (invoice.dentist?.phone)   { doc.text(invoice.dentist.phone,   M + 4, infoY); infoY += 5 }
  if (invoice.dentist?.email)   { doc.text(invoice.dentist.email,   M + 4, infoY) }

  // "Détails" box — samma höjd som Facturé à
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(col2, y, colW, boxH, 3, 3, 'F')
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(148, 163, 184)
  doc.text('DÉTAILS', col2 + 4, y + 6)

  const details = [
    { label: 'Date', value: fmtDate(invoice.date) },
    { label: 'Échéance', value: fmtDate(invoice.due_date) },
    {
      label: 'Statut',
      value: invoice.status === 'paid' ? 'Payée' : invoice.status === 'partial' ? 'Partiel' : 'Impayée',
    },
  ]
  doc.setFontSize(9)
  details.forEach(({ label, value }, i) => {
    const dy = y + 14 + i * 7
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.text(label, col2 + 4, dy)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(value, col2 + colW - 4, dy, { align: 'right' })
  })

  y += boxH + 8

  // ── Table ─────────────────────────────────────────────────────────────────
  const tableW = W - M * 2
  const cols = { desc: M + 4, ht: M + tableW * 0.58, tva: M + tableW * 0.74, ttc: W - M - 2 }

  doc.setFillColor(30, 41, 59)
  doc.rect(M, y, tableW, 9, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Description', cols.desc, y + 6)
  doc.text('Montant HT', cols.ht, y + 6, { align: 'right' })
  doc.text('TVA (20%)', cols.tva, y + 6, { align: 'right' })
  doc.text('Total TTC', cols.ttc, y + 6, { align: 'right' })
  y += 9

  const rowH = invoice.notes ? 16 : 12
  doc.setFillColor(248, 250, 252)
  doc.rect(M, y, tableW, rowH, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)
  doc.text('Travaux de prothèse dentaire', cols.desc, y + 7)
  if (invoice.notes) {
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(invoice.notes, cols.desc, y + 12)
  }
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)
  doc.text(fmt(invoice.amount), cols.ht, y + 7, { align: 'right' })
  doc.text(fmt(invoice.tax), cols.tva, y + 7, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.text(fmt(invoice.total), cols.ttc, y + 7, { align: 'right' })
  y += rowH + 10

  // ── Total box ─────────────────────────────────────────────────────────────
  const boxW = 72
  const boxX = W - M - boxW
  doc.setFillColor(30, 41, 59)
  doc.roundedRect(boxX, y, boxW, 34, 4, 4, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('Montant HT', boxX + 5, y + 9)
  doc.text(fmt(invoice.amount), boxX + boxW - 5, y + 9, { align: 'right' })
  doc.text('TVA 20%', boxX + 5, y + 16)
  doc.text(fmt(invoice.tax), boxX + boxW - 5, y + 16, { align: 'right' })

  doc.setDrawColor(51, 65, 85)
  doc.setLineWidth(0.4)
  doc.line(boxX + 4, y + 20, boxX + boxW - 4, y + 20)

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Total TTC', boxX + 5, y + 28)
  doc.text(fmt(invoice.total), boxX + boxW - 5, y + 28, { align: 'right' })

  y += 44

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.4)
  doc.line(M, y, W - M, y)
  y += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('Laboratoire Oubriim', M, y)
  doc.text(invoice.invoice_number, W - M, y, { align: 'right' })

  doc.save(`Facture-${invoice.invoice_number}.pdf`)
}
