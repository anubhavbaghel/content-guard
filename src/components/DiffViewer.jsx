export default function DiffViewer({ diff, onClose }) {
  const { field, expected, actual, hint } = diff

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="diff-overlay" onClick={handleOverlayClick}>
      <div className="glass-card diff-modal">
        {/* Header */}
        <div className="diff-modal-header">
          <div>
            <div className="diff-modal-title">Content Mismatch Detected</div>
            <div className="diff-modal-field">{field}</div>
          </div>
          <button className="diff-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Panels */}
        <div className="diff-panels">
          {/* Expected — from doc */}
          <div className="diff-panel expected">
            <div className="diff-panel-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Expected (from doc)
            </div>
            {expected
              ? <div className="diff-panel-content">{expected}</div>
              : <div className="diff-panel-empty">No value in document</div>
            }
          </div>

          {/* Actual — from website */}
          <div className="diff-panel actual">
            <div className="diff-panel-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
              Found on website
            </div>
            {actual && actual !== '✗ Not found'
              ? <div className="diff-panel-content">{actual}</div>
              : <div className="diff-panel-empty">Not found on the page</div>
            }
          </div>
        </div>

        {/* Hint */}
        {hint && (
          <div className="diff-hint">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {hint}
          </div>
        )}
      </div>
    </div>
  )
}
