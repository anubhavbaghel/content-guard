import { useState } from 'react'

const hasElectronAPI = typeof window !== 'undefined' && !!window.electronAPI

export default function InputPanel({ docUrl, siteUrl, onDocUrlChange, onSiteUrlChange, onRun, error, onClearError }) {
  const [running, setRunning] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!docUrl.trim() || !siteUrl.trim()) return
    setRunning(true)
    try {
      await onRun(docUrl.trim(), siteUrl.trim())
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="input-panel">
      <div className="glass-card input-card">
        {/* Logo */}
        <div className="input-logo">
          <div className="input-logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="shield-g" x1="4" y1="2" x2="20" y2="22">
                  <stop stopColor="#4f8ef7"/>
                  <stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
              <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6L12 2z" fill="url(#shield-g)"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1>
            <span className="gradient-text">ContentGuard</span>
          </h1>
          <p>Paste your content doc and website URL to check for any missing or mismatched content.</p>
        </div>

        {/* Electron API Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 14px',
          borderRadius: 8,
          marginBottom: 20,
          fontSize: 12.5,
          fontWeight: 600,
          background: hasElectronAPI ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
          border: `1px solid ${hasElectronAPI ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
          color: hasElectronAPI ? '#10b981' : '#f43f5e',
        }}>
          <span>{hasElectronAPI ? '✓' : '✕'}</span>
          {hasElectronAPI
            ? 'Electron API connected — ready to run'
            : 'Electron API not found — open this in the Electron window, not a browser'}
        </div>

        {/* Error */}
        {error && (
          <div className="error-banner" onClick={onClearError} style={{ cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="input-fields">
            <div className="input-group">
              <label>Google Doc URL</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </span>
                <input
                  className="input-field"
                  type="url"
                  placeholder="https://docs.google.com/document/d/..."
                  value={docUrl}
                  onChange={e => { onDocUrlChange(e.target.value); onClearError?.() }}
                  required
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Website URL</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                  </svg>
                </span>
                <input
                  className="input-field"
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={siteUrl}
                  onChange={e => { onSiteUrlChange(e.target.value); onClearError?.() }}
                  required
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', fontSize: '15px', padding: '15px' }}
            disabled={running || !docUrl.trim() || !siteUrl.trim()}
          >
            {running ? (
              <>
                <SpinnerIcon />
                Starting QA Check…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Run QA Check
              </>
            )}
          </button>
        </form>

        <div className="divider" />

        <div className="input-footer">
          Make sure the Google Doc is shared as{' '}
          <strong style={{ color: 'var(--text-2)' }}>"Anyone with the link can view"</strong>
          <br />
          The tool will crawl all pages and check content field by field.
        </div>
      </div>
    </div>
  )
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
      <line x1="12" y1="2" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  )
}
