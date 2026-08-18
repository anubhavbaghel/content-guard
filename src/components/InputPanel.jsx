import { useState } from 'react'

const hasElectronAPI = typeof window !== 'undefined' && !!window.electronAPI

export default function InputPanel({ docUrl, siteUrl, onDocUrlChange, onSiteUrlChange, onRun, error, onClearError }) {
  const [running, setRunning] = useState(false)
  const [docInputType, setDocInputType] = useState('url') // 'url' | 'file'
  const [localFileText, setLocalFileText] = useState('')
  const [localFileName, setLocalFileName] = useState('')

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLocalFileName(file.name)

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target.result
      if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        const parser = new DOMParser()
        const doc = parser.parseFromString(content, 'text/html')
        const scripts = doc.querySelectorAll('script, style')
        scripts.forEach(s => s.remove())
        const plainText = doc.body.innerText || doc.body.textContent || ''
        setLocalFileText(plainText)
      } else {
        setLocalFileText(content)
      }
      onClearError?.()
    }
    reader.readAsText(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!siteUrl.trim()) return

    if (docInputType === 'url') {
      if (!docUrl.trim()) return
      setRunning(true)
      try {
        await onRun(docUrl.trim(), siteUrl.trim(), false)
      } finally {
        setRunning(false)
      }
    } else {
      if (!localFileText.trim()) return
      setRunning(true)
      try {
        await onRun(localFileText.trim(), siteUrl.trim(), true)
      } finally {
        setRunning(false)
      }
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
          <p>Paste your content doc or upload a file and input the website URL to run QA checks.</p>
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
              <label>Content Document</label>
              
              {/* Tab Selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => { setDocInputType('url'); onClearError?.() }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: docInputType === 'url' ? 'var(--blue-dim)' : 'transparent',
                    color: docInputType === 'url' ? 'var(--blue)' : 'var(--text-2)',
                    border: `1px solid ${docInputType === 'url' ? 'rgba(37,99,235,0.2)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    transition: 'all 200ms'
                  }}
                >
                  Google Doc URL
                </button>
                <button
                  type="button"
                  onClick={() => { setDocInputType('file'); onClearError?.() }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: docInputType === 'file' ? 'var(--blue-dim)' : 'transparent',
                    color: docInputType === 'file' ? 'var(--blue)' : 'var(--text-2)',
                    border: `1px solid ${docInputType === 'file' ? 'rgba(37,99,235,0.2)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    transition: 'all 200ms'
                  }}
                >
                  Local File (.html / .txt)
                </button>
              </div>

              {docInputType === 'url' ? (
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
                    required={docInputType === 'url'}
                    spellCheck={false}
                  />
                </div>
              ) : (
                <div style={{
                  border: '1.5px dashed var(--border-bright)',
                  borderRadius: 'var(--r-md)',
                  padding: '20px 16px',
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.01)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 200ms'
                }}>
                  <input
                    type="file"
                    accept=".txt,.html"
                    onChange={handleFileChange}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-3)', marginBottom: 8 }}>
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-1)' }}>
                    {localFileName ? `Selected: ${localFileName}` : 'Choose an HTML or TXT file'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: 4 }}>
                    {localFileName ? 'Click or drag to replace' : 'Download from Google Docs as Web Page (.html) or Plain Text (.txt)'}
                  </div>
                </div>
              )}
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
            style={{ width: '100%', fontSize: '15px', padding: '15px', marginTop: '8px' }}
            disabled={running || (docInputType === 'url' ? !docUrl.trim() : !localFileText.trim()) || !siteUrl.trim()}
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
