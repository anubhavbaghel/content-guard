export default function RunningView({ progress }) {
  const { steps = [], total = 0, done = 0 } = progress
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const currentStep = steps.find(s => s.status === 'running')?.text || steps[steps.length - 1]?.text || 'Initialising…'

  return (
    <div className="running-view">
      <div className="glass-card running-card">
        {/* Spinner */}
        <div className="running-spinner" />

        <div className="running-title">
          Running <span className="gradient-text">QA Check</span>
        </div>
        <div className="running-step">{currentStep}</div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        )}

        {/* Step list */}
        {steps.length > 0 && (
          <div className="running-steps-list">
            {[...steps].reverse().slice(0, 8).reverse().map((s, i) => (
              <div key={s.id || i} className="running-step-item">
                <div className={`step-dot ${
                  s.status === 'running' ? 'step-dot-running' :
                  s.status === 'error'   ? 'step-dot-error'   :
                  'step-dot-done'
                }`} />
                <span style={{
                  color: s.status === 'error'   ? 'var(--error)'   :
                         s.status === 'done'    ? 'var(--text-2)'  :
                         'var(--text-1)',
                  flex: 1,
                  fontSize: 13,
                }}>
                  {s.text}
                </span>
                {s.status === 'done'  && <CheckIcon />}
                {s.status === 'error' && <ErrorIcon />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
