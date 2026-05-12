import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { MonthlySummary } from './api'
import { formatCurrency, MONTHS } from './utils'

export function generateMonthlyReport(summary: MonthlySummary) {
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()
  const title = `Relatório Financeiro — ${MONTHS[summary.month - 1]} ${summary.year}`

  // Header
  doc.setFillColor(79, 70, 229) // indigo-600
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 12)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 21)

  // KPI cards
  doc.setTextColor(30, 30, 30)
  let y = 40

  const kpis = [
    { label: 'Despesas', value: formatCurrency(summary.totalExpenses), color: [239, 68, 68] as [number,number,number] },
    { label: 'Receitas', value: formatCurrency(summary.totalIncome), color: [16, 185, 129] as [number,number,number] },
    { label: 'Saldo', value: formatCurrency(summary.balance), color: summary.balance >= 0 ? [16, 185, 129] as [number,number,number] : [239, 68, 68] as [number,number,number] },
  ]

  const cardW = (pageW - 28) / 3
  kpis.forEach(({ label, value, color }, i) => {
    const x = 14 + i * (cardW + 4)
    doc.setDrawColor(220, 220, 220)
    doc.setFillColor(248, 249, 250)
    doc.roundedRect(x, y, cardW, 22, 3, 3, 'FD')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(label, x + 6, y + 8)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...color)
    doc.text(value, x + 6, y + 18)
    doc.setFont('helvetica', 'normal')
  })

  y += 32

  // Category table
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Gastos por categoria', 14, y)
  y += 4

  autoTable(doc, {
    startY: y,
    head: [['Categoria', 'Transações', 'Total', '% do total']],
    body: summary.byCategory.map(c => [
      c.name,
      String(c.count),
      formatCurrency(c.total),
      summary.totalExpenses > 0
        ? `${((c.total / summary.totalExpenses) * 100).toFixed(1)}%`
        : '0%',
    ]),
    foot: [['Total', String(summary.transactionCount), formatCurrency(summary.totalExpenses), '100%']],
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    footStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 249, 250] },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  })

  // Daily evolution table
  if (summary.dailyEvolution.length > 0) {
    const afterTable = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Evolução diária', 14, afterTable)

    autoTable(doc, {
      startY: afterTable + 4,
      head: [['Data', 'Movimentação']],
      body: summary.dailyEvolution.map(d => [
        new Date(d.date).toLocaleDateString('pt-BR'),
        formatCurrency(d.amount),
      ]),
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
  }

  // Footer
  const pageCount = (doc.internal as any).getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    )
  }

  doc.save(`relatorio-${MONTHS[summary.month - 1].toLowerCase()}-${summary.year}.pdf`)
}
