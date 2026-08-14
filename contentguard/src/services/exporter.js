/**
 * exporter.js — PDF and CSV report generation
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ──────────────────────────────────────────────────────────
// CSV Export
// ──────────────────────────────────────────────────────────
export function generateCSV(pageResults) {
  const rows = [
    ['Page', 'Web URL', 'Check', 'Expected', 'Actual', 'Status'],
  ]

  for (const { docPage, webPage, checks } of pageResults) {
    for (const check of checks) {
      rows.push([
        docPage.name,
        webPage?.url || 'Not found',
        check.field,
        truncate(check.expected, 120),
        truncate(check.actual, 120),
        check.pass ? 'PASS' : 'FAIL',
      ])
    }
  }

  return rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n')
}

// ──────────────────────────────────────────────────────────
// PDF Export
// ──────────────────────────────────────────────────────────
export async function generatePDF(pageResults, summary, siteUrl) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ── Title page ──────────────────────────────────────────
  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, 297, 210, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(37, 99, 235)
  doc.setFontSize(28)
  doc.text('ContentGuard', 148, 70, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.setFontSize(12)
  doc.text('Content QA Report', 148, 82, { align: 'center' })

  doc.setTextColor(148, 163, 184)
  doc.setFontSize(10)
  doc.text(siteUrl, 148, 94, { align: 'center' })
  doc.text(`Generated: ${new Date().toLocaleString()}`, 148, 102, { align: 'center' })

  // Summary box
  const sx = 74, sy = 118, sw = 150, sh = 40
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(sx, sy, sw, sh, 4, 4, 'FD')
  doc.setTextColor(5, 150, 105)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text(String(summary.passedChecks), sx + 25, sy + 24, { align: 'center' })
  doc.setTextColor(220, 38, 38)
  doc.text(String(summary.failedChecks), sx + 75, sy + 24, { align: 'center' })
  doc.setTextColor(37, 99, 235)
  doc.text(String(summary.totalChecks), sx + 125, sy + 24, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('PASSED', sx + 25, sy + 34, { align: 'center' })
  doc.text('FAILED', sx + 75, sy + 34, { align: 'center' })
  doc.text('TOTAL', sx + 125, sy + 34, { align: 'center' })

  // ── Per-page tables ──────────────────────────────────────
  for (const { docPage, webPage, checks } of pageResults) {
    doc.addPage()
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 297, 210, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(14)
    doc.text(docPage.name, 14, 18)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(9)
    doc.text(webPage?.url || 'Page not found', 14, 26)

    const passCount = checks.filter(c => c.pass).length
    const failCount = checks.filter(c => !c.pass).length

    doc.setTextColor(failCount > 0 ? 220 : 5, failCount > 0 ? 38 : 150, failCount > 0 ? 38 : 105)
    doc.text(`${passCount} passed / ${failCount} failed`, 283, 18, { align: 'right' })

    autoTable(doc, {
      startY: 32,
      margin: { left: 14, right: 14 },
      head: [['Check', 'Expected', 'Status']],
      body: checks.map(c => [
        c.field,
        truncate(c.expected, 80),
        c.pass ? '✓ PASS' : '✕ FAIL',
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
        fillColor: [255, 255, 255],
        textColor: [71, 85, 105],
        lineColor: [226, 232, 240],
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [37, 99, 235],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 180 },
        2: { cellWidth: 25, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.column.index === 2 && data.section === 'body') {
          const val = data.cell.raw
          if (val && val.includes('PASS')) data.cell.styles.textColor = [5, 150, 105]
          if (val && val.includes('FAIL')) data.cell.styles.textColor = [220, 38, 38]
        }
      },
    })
  }

  return doc.output('datauristring').split(',')[1]
}

function truncate(str, len) {
  if (!str) return ''
  return str.length > len ? str.substring(0, len) + '…' : str
}
