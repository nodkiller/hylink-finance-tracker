export type SheetRow = (string | number | null)[]

export interface ExportSheet {
  name: string
  headers: string[]
  rows: SheetRow[]
}

export async function exportToExcel(sheets: ExportSheet[], filename: string) {
  const { utils, writeFile } = await import('xlsx')
  const wb = utils.book_new()
  for (const sheet of sheets) {
    const wsData = [sheet.headers, ...sheet.rows]
    const ws = utils.aoa_to_sheet(wsData)
    // Auto column widths
    const colWidths = sheet.headers.map((h, i) => ({
      wch: Math.max(h.length, ...sheet.rows.map(r => String(r[i] ?? '').length)) + 2,
    }))
    ws['!cols'] = colWidths
    utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31))
  }
  writeFile(wb, `${filename}.xlsx`)
}

export async function exportToPDF(
  title: string,
  headers: string[],
  rows: SheetRow[],
  filename: string
) {
  const { default: jsPDF } = await import('jspdf')
  const autotableModule = await import('jspdf-autotable')
  const autoTable = autotableModule.default ?? autotableModule

  const doc = new jsPDF({ orientation: rows[0]?.length > 6 ? 'landscape' : 'portrait' })

  // Title
  doc.setFontSize(14)
  doc.setTextColor(30, 64, 175) // #1e40af per DESIGN.md
  doc.text(title, 14, 16)
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22)

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows.map(r => r.map(v => v ?? '—')),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 249, 249] },
    margin: { left: 14, right: 14 },
  })

  doc.save(`${filename}.pdf`)
}
