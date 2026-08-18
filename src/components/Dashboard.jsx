import { useState } from 'react'
import PageCard from './PageCard'
import DiffViewer from './DiffViewer'
import { generateCSV, generatePDF } from '../services/exporter'

export default function Dashboard({ results, onNewCheck }) {
  const [diff, setDiff]       = useState(null) // { field, expected, actual, hint }
  const [filter, setFilter]   = useState('all') // all | fail | pass
  const [exporting, setExporting] = useState(null)

  const { matchResults, siteUrl, docUrl } = results
  const { pageResults, summary } = matchResults

  const filtered = filter === 'all' ? pageResults
    : filter === 'fail' ? pageResults.filter(p => p.failCount > 0)
    : pageResults.filter(p => p.failCount === 0)

  const passRate = summary.totalChecks > 0
    ? Math.round((summary.passedChecks / summary.totalChecks) * 100)
    : 0

  const handleExportCSV = async () => {
    setExporting('csv')
    try {
      const csv = generateCSV(pageResults)
      await window.electronAPI.exportCSV({ data: csv, filename: 'contentguard-report.csv' })
    } finally { setExporting(null) }
  }

  const handleExportPDF = async () => {
    setExporting('pdf')
    try {
      const pdfBase64 = await generatePDF(pageResults, summary, siteUrl)
      await window.electronAPI.exportPDF({ data: pdfBase64, filename: 'contentguard-report.pdf' })
    } finally { setExporting(null) }
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <div className="dashboard-header-title">
            QA Report — <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 13 }}>{siteUrl}</span>
          </div>
          <div className="dashboard-header-subtitle">
            {summary.totalPages} pages · {summary.totalChecks} checks · {passRate}% pass rate
          </div>
        </div>

        {/* Summary pills */}
        <div className="summary-pills">
          <div className="summary-pill pill-pass">
            <span className="pill-num">{summary.passedChecks}</span>
            <span>Passed</span>
          </div>
          <div className="summary-pill pill-fail">
            <span className="pill-num">{summary.failedChecks}</span>
            <span>Failed</span>
          </div>
          <div className="summary-pill pill-total">
            <span className="pill-num">{summary.totalChecks}</span>
            <span>Total</span>
          </div>
        </div>

        {/* Actions */}
        <div className="dashboard-actions">
          <button className="btn-secondary" onClick={handleExportCSV} disabled={!!exporting}>
            <CsvIcon />
            {exporting === 'csv' ? 'Saving…' : 'CSV'}
          </button>
          <button className="btn-secondary" onClick={handleExportPDF} disabled={!!exporting}>
            <PdfIcon />
            {exporting === 'pdf' ? 'Saving…' : 'PDF'}
          </button>
          <button className="btn-secondary" onClick={onNewCheck}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
            </svg>
            New Check
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '12px 28px 0', display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', background: 'var(--bg-1)' }}>
        {[
          { key: 'all',  label: `All Pages (${pageResults.length})` },
          { key: 'fail', label: `Issues (${pageResults.filter(p => p.failCount > 0).length})` },
          { key: 'pass', label: `Passed (${pageResults.filter(p => p.failCount === 0).length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '9px 16px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${filter === tab.key ? 'var(--blue)' : 'transparent'}`,
              color: filter === tab.key ? 'var(--text-1)' : 'var(--text-3)',
              cursor: 'pointer',
              font: '600 12.5px/1 Inter, sans-serif',
              letterSpacing: '0.02em',
              transition: 'all 200ms',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Page cards */}
      <div className="dashboard-body">
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
            No pages match this filter.
          </div>
        )}
        {filtered.map((result) => (
          <PageCard
            key={result.docPage.name}
            result={result}
            onShowDiff={setDiff}
          />
        ))}
      </div>

      {/* Diff modal */}
      {diff && (
        <DiffViewer diff={diff} onClose={() => setDiff(null)} />
      )}
    </div>
  )
}

function CsvIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="16" y2="17"/>
    </svg>
  )
}

function PdfIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
    </svg>
  )
}
