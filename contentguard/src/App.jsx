import { useState, useCallback, useEffect } from 'react'
import InputPanel from './components/InputPanel'
import RunningView from './components/RunningView'
import Dashboard from './components/Dashboard'
import { fetchAndParseDoc } from './services/docFetcher'
import { matchAllPages } from './services/matcher'

const VIEWS = { INPUT: 'input', RUNNING: 'running', RESULTS: 'results' }

export default function App() {
  const [view, setView]       = useState(VIEWS.INPUT)
  const [docUrl, setDocUrl]   = useState('')
  const [siteUrl, setSiteUrl] = useState('')
  const [progress, setProgress] = useState({ steps: [], currentStep: '', total: 0, done: 0 })
  const [results, setResults]  = useState(null)
  const [error, setError]      = useState(null)

  // ── QA Orchestration ────────────────────────────────────
  const runQA = useCallback(async (docUrlIn, siteUrlIn) => {
    setView(VIEWS.RUNNING)
    setError(null)

    const steps = []
    const push = (text, status = 'running') => {
      steps.push({ id: Date.now(), text, status })
      setProgress(p => ({ ...p, steps: [...steps], currentStep: text }))
    }
    const done = () => {
      if (steps.length) steps[steps.length - 1].status = 'done'
      setProgress(p => ({ ...p, steps: [...steps], done: (p.done || 0) + 1 }))
    }
    const fail = (msg) => {
      if (steps.length) steps[steps.length - 1].status = 'error'
      setProgress(p => ({ ...p, steps: [...steps] }))
      setError(msg)
      setView(VIEWS.INPUT)
    }

    try {
      // Step 1: Fetch & parse Google Doc
      push('Fetching content document…')
      const docData = await fetchAndParseDoc(docUrlIn)
      done()

      if (!docData.pages.length) {
        return fail('Could not find any pages in the document. Check the doc format.')
      }

      // Step 2: Discover pages from root URL
      push(`Discovering pages on ${new URL(siteUrlIn).hostname}…`)
      const rootData = await window.electronAPI.discoverPages(siteUrlIn)
      done()

      // Collect unique internal pages
      const internalLinks = deduplicateLinks(rootData.internalLinks || [], siteUrlIn)
      setProgress(p => ({ ...p, total: internalLinks.length + 2 }))

      // Step 3: Crawl each page
      const webPages = [rootData]
      for (const link of internalLinks) {
        const label = link.text || link.href
        push(`Crawling: ${label}`)
        try {
          const pageData = await window.electronAPI.crawlPage(link.href, label)
          webPages.push(pageData)
        } catch (e) {
          console.warn('Crawl failed for', link.href, e.message)
          steps[steps.length - 1].status = 'error'
          setProgress(p => ({ ...p, steps: [...steps] }))
        }
        done()
      }

      // Step 4: Match content
      push('Matching content against document…')
      const matchResults = matchAllPages(docData, webPages, siteUrlIn)
      done()

      setResults({ docData, webPages, matchResults, siteUrl: siteUrlIn, docUrl: docUrlIn })
      setView(VIEWS.RESULTS)

    } catch (e) {
      console.error(e)
      fail(e.message || 'An unexpected error occurred.')
    }
  }, [])

  return (
    <div className="app">
      <TitleBar />

      {view === VIEWS.INPUT && (
        <InputPanel
          docUrl={docUrl}
          siteUrl={siteUrl}
          onDocUrlChange={setDocUrl}
          onSiteUrlChange={setSiteUrl}
          onRun={runQA}
          error={error}
          onClearError={() => setError(null)}
        />
      )}

      {view === VIEWS.RUNNING && (
        <RunningView progress={progress} />
      )}

      {view === VIEWS.RESULTS && results && (
        <Dashboard
          results={results}
          onNewCheck={() => { setView(VIEWS.INPUT); setResults(null) }}
        />
      )}
    </div>
  )
}

// ── Title Bar Component ──────────────────────────────────
function TitleBar() {
  const minimize = () => window.electronAPI?.minimizeWindow()
  const maximize = () => window.electronAPI?.maximizeWindow()
  const close    = () => window.electronAPI?.closeWindow()

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <div className="titlebar-logo">
          <ShieldSVG />
          <span>ContentGuard</span>
        </div>
      </div>
      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={minimize} title="Minimize">–</button>
        <button className="titlebar-btn" onClick={maximize} title="Maximize">□</button>
        <button className="titlebar-btn close" onClick={close} title="Close">✕</button>
      </div>
    </div>
  )
}

function ShieldSVG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="sg" x1="4" y1="2" x2="20" y2="22">
          <stop stopColor="#4f8ef7"/>
          <stop offset="1" stopColor="#8b5cf6"/>
        </linearGradient>
      </defs>
      <path d="M12 2L4 6v6c0 5.5 3.5 10.7 8 12 4.5-1.3 8-6.5 8-12V6L12 2z" fill="url(#sg)"/>
      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Helpers ──────────────────────────────────────────────
function deduplicateLinks(links, rootUrl) {
  const seen = new Set()
  let rootHostname
  try { rootHostname = new URL(rootUrl).hostname } catch { return [] }
  const rootNorm = rootUrl.replace(/\/$/, '')

  return links.filter(link => {
    try {
      const u = new URL(link.href)
      const norm = link.href.replace(/\/$/, '')
      if (u.hostname !== rootHostname) return false
      if (norm === rootNorm) return false
      if (seen.has(norm)) return false
      seen.add(norm)
      return true
    } catch { return false }
  })
}
