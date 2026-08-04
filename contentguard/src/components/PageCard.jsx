import { useState } from 'react'

export default function PageCard({ result, onShowDiff }) {
  const [open, setOpen] = useState(result.failCount > 0)

  const { docPage, webPage, checks, passCount, failCount } = result
  const allPass = failCount === 0

  return (
    <div className={`page-card ${open ? 'is-open' : ''}`}>
      {/* Header */}
      <div className="page-card-header" onClick={() => setOpen(o => !o)}>
        <div className={`page-card-icon ${allPass ? 'pass' : 'fail'}`}>
          {allPass ? '✓' : '!'}
        </div>

        <div className="page-card-info">
          <div className="page-card-name">{docPage.name}</div>
          <div className="page-card-url">
            {webPage ? webPage.url : '⚠ No matching page found'}
          </div>
        </div>

        <div className="page-card-stats">
          {passCount > 0 && (
            <span className="badge badge-pass">✓ {passCount}</span>
          )}
          {failCount > 0 && (
            <span className="badge badge-fail">✕ {failCount}</span>
          )}
        </div>

        <div className="page-card-chevron">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Body — check list */}
      {open && (
        <div className="page-card-body">
          <div className="checks-list">
            {checks.map((check, i) => (
              <CheckRow
                key={i}
                check={check}
                onShowDiff={() => onShowDiff(check)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CheckRow({ check, onShowDiff }) {
  return (
    <div className="check-item" onClick={!check.pass ? onShowDiff : undefined}>
      <div className={`check-status-icon ${check.pass ? 'pass' : 'fail'}`}>
        {check.pass ? '✓' : '✕'}
      </div>

      <div className="check-field">
        <strong>{check.field}</strong>
        <div className="check-expected" title={check.expected}>
          {check.expected || '—'}
        </div>
      </div>

      {!check.pass && (
        <button className="check-diff-btn" onClick={(e) => { e.stopPropagation(); onShowDiff() }}>
          View Diff
        </button>
      )}
    </div>
  )
}
